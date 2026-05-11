import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AmountInput } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { TokenSelector } from "@/components/features/shared/TokenSelector";
import { ProofProgress } from "@/components/features/shared/ProofProgress";
import { SwapConfirmModal } from "./SwapConfirmModal";
import { useSwap } from "@/hooks/useSwap";
import { usePoolState } from "@/hooks/usePoolState";
import { usePoolOperations } from "@/hooks/usePoolOperations";
import { useSdkStore } from "@/stores/sdkStore";
import { TESTNET_TOKENS, type Token } from "@/config/tokens";
import { parseTokenAmount, formatTokenAmount, transactionExplorerUrl } from "@/lib/format";
import { calculatePriceImpact, getPriceImpactVariant } from "@/lib/priceImpact";
import { FEE_TIERS, estimateSwapOutputSafe, tokenToBigInt } from "@zylith/sdk";
import type { Note, PoolKey } from "@zylith/sdk";
import { cn } from "@/lib/cn";
import { motion, AnimatePresence } from "motion/react";
import { ArrowDown, History, Shield, ShieldAlert, Zap, ExternalLink } from "lucide-react";

interface SwapTransaction {
  txHash: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  timestamp: number;
  isPrivate: boolean;
}

const STORAGE_KEY = "zylith_recent_swaps";

export function SwapCard() {
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const unspentNotes = useSdkStore((s) => s.unspentNotes);
  const balances = useSdkStore((s) => s.balances);

  const [tokenIn, setTokenIn] = useState<Token>(TESTNET_TOKENS[0]);
  const [tokenOut, setTokenOut] = useState<Token | null>(TESTNET_TOKENS[1] ?? null);
  const [amountIn, setAmountIn] = useState("");
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [selectingTokenType, setSelectingTokenType] = useState<"in" | "out">("in");
  const [showConfirm, setShowConfirm] = useState(false);
  const [usePublicSwap, setUsePublicSwap] = useState(false);
  const [recentSwaps, setRecentSwaps] = useState<SwapTransaction[]>([]);

  const swap = useSwap();
  const poolOps = usePoolOperations();

  // Load swaps from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setRecentSwaps(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load recent swaps:", e);
      }
    }
  }, []);

  // Save swaps to localStorage whenever they change
  useEffect(() => {
    if (recentSwaps.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentSwaps));
    }
  }, [recentSwaps]);

  // Find a suitable note to spend
  const selectedNote: Note | undefined = useMemo(() => {
    if (!amountIn || !tokenIn) return undefined;
    const parsed = parseTokenAmount(amountIn, tokenIn.decimals);
    return unspentNotes.find(
      (n) =>
        n.token.toLowerCase() === tokenIn.address.toLowerCase() &&
        BigInt(n.amount) >= parsed
    );
  }, [unspentNotes, amountIn, tokenIn]);

  const tokenInBalance = balances[tokenIn?.address ?? ""] ?? 0n;
  const parsedAmountIn = amountIn
    ? parseTokenAmount(amountIn, tokenIn?.decimals ?? 18)
    : 0n;

  // Get pool state for price impact calculation
  const poolKey: PoolKey | null = tokenIn && tokenOut ? {
    token0: tokenToBigInt(tokenIn.address) < tokenToBigInt(tokenOut.address) ? tokenIn.address : tokenOut.address,
    token1: tokenToBigInt(tokenIn.address) < tokenToBigInt(tokenOut.address) ? tokenOut.address : tokenIn.address,
    fee: FEE_TIERS.MEDIUM.fee,
    tickSpacing: FEE_TIERS.MEDIUM.tickSpacing,
  } : null;
  const { data: poolState } = usePoolState(poolKey);

  // Estimate output amount with slippage buffer
  const estimatedOut = useMemo(() => {
    if (!poolState || parsedAmountIn === 0n || !tokenIn || !tokenOut) return 0n;
    const zeroForOne = tokenToBigInt(tokenIn.address) < tokenToBigInt(tokenOut.address);
    return estimateSwapOutputSafe(poolState.sqrtPrice, parsedAmountIn, zeroForOne, FEE_TIERS.MEDIUM.fee);
  }, [poolState, parsedAmountIn, tokenIn, tokenOut]);

  // Calculate price impact
  const priceImpact = useMemo(() => {
    if (!poolState || parsedAmountIn === 0n) return 0;
    return calculatePriceImpact(parsedAmountIn, poolState.liquidity);
  }, [poolState, parsedAmountIn]);

  const canSwapPrivate =
    isInitialized &&
    tokenIn &&
    tokenOut &&
    parsedAmountIn > 0n &&
    selectedNote !== undefined &&
    !swap.isPending;

  const canSwapPublic =
    poolOps.isConnected &&
    tokenIn &&
    tokenOut &&
    parsedAmountIn > 0n &&
    !poolOps.isLoading;

  const handleFlip = () => {
    const temp = tokenIn;
    setTokenIn(tokenOut ?? TESTNET_TOKENS[0]);
    setTokenOut(temp);
    setAmountIn("");
  };

  const handleConfirmSwap = async () => {
    if (!tokenIn || !tokenOut) return;

    if (usePublicSwap) {
      // Public swap via wallet
      try {
        const txHash = await poolOps.executeSwap({
          tokenInAddress: tokenIn.address,
          tokenOutAddress: tokenOut.address,
          amountIn: parsedAmountIn,
          fee: FEE_TIERS.MEDIUM.fee,
          tickSpacing: FEE_TIERS.MEDIUM.tickSpacing,
        });

        // Add to recent swaps
        setRecentSwaps(prev => [{
          txHash: txHash || "unknown",
          tokenIn: tokenIn.symbol,
          tokenOut: tokenOut.symbol,
          amountIn: amountIn,
          timestamp: Date.now(),
          isPrivate: false,
        }, ...prev].slice(0, 5));

        setAmountIn("");
        setShowConfirm(false);
      } catch (err) {
        console.error("Public swap failed:", err);
      }
    } else {
      // Private (shielded) swap
      if (!selectedNote) return;

      const [t0, t1] =
        tokenToBigInt(tokenIn.address) < tokenToBigInt(tokenOut.address)
          ? [tokenIn.address, tokenOut.address]
          : [tokenOut.address, tokenIn.address];

      // Determine swap direction: zeroForOne = tokenIn is token0
      const zeroForOne = tokenToBigInt(tokenIn.address) < tokenToBigInt(tokenOut.address);

      // Estimate expected output using current pool state with slippage buffer.
      let expectedOut = 0n;
      if (poolState) {
        expectedOut = estimateSwapOutputSafe(
          poolState.sqrtPrice,
          parsedAmountIn,
          zeroForOne,
          FEE_TIERS.MEDIUM.fee,
        );
      }

      const MIN_SQRT_PRICE = 4295128740n;                              // TickMath.MIN_SQRT_RATIO + 1
      const MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970341n; // TickMath.MAX_SQRT_RATIO - 1
      const priceLimit = zeroForOne ? MIN_SQRT_PRICE : MAX_SQRT_PRICE;

      swap.mutate(
        {
          poolKey: {
            token0: t0,
            token1: t1,
            fee: FEE_TIERS.MEDIUM.fee,
            tickSpacing: FEE_TIERS.MEDIUM.tickSpacing,
          },
          inputNoteCommitment: selectedNote.commitment,
          tokenIn: tokenIn.address,
          tokenOut: tokenOut.address,
          amountIn: parsedAmountIn,
          amountOutMin: expectedOut * 9950n / 10000n, // 0.5% slippage tolerance
          expectedAmountOut: expectedOut,
          sqrtPriceLimit: priceLimit,
        },
        {
          onSuccess: (data) => {
            // Add to recent swaps
            setRecentSwaps(prev => [{
              txHash: data.txHash,
              tokenIn: tokenIn.symbol,
              tokenOut: tokenOut.symbol,
              amountIn: amountIn,
              timestamp: Date.now(),
              isPrivate: true,
            }, ...prev].slice(0, 5));

            setAmountIn("");
            setShowConfirm(false);
          }
        }
      );
    }
  };

  const BlurFadeText = ({ text, isPublic }: { text: string; isPublic: boolean }) => (
    <AnimatePresence mode="wait">
      <motion.span
        key={isPublic ? "public" : "private"}
        initial={{ opacity: 0, filter: "blur(12px)", y: -4 }}
        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        exit={{ opacity: 0, filter: "blur(12px)", y: 4 }}
        transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
        className="inline-block"
      >
        {text}
      </motion.span>
    </AnimatePresence>
  );

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto">
      <Card className="relative overflow-visible border-white/5 bg-card/40 backdrop-blur-3xl p-0 shadow-2xl">
        {/* Glow decoration */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-solana-purple/10 blur-[60px] rounded-full pointer-events-none" />

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <h2 className="text-2xl font-heading tracking-tight text-foreground uppercase pt-1">
              <BlurFadeText text={usePublicSwap ? "Public" : "Shielded"} isPublic={usePublicSwap} />
              <span className="ml-2">Swap</span>
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  usePublicSwap ? "bg-solana-purple" : "bg-primary animate-pulse shadow-[0_0_8px_rgba(20,241,149,0.5)]"
                )} />
                <span className="text-[10px] font-heading tracking-[0.2em] uppercase text-muted-foreground">
                  {usePublicSwap ? "Public" : "Private"}
                </span>
              </div>
            </div>
          </div>

          <div className="relative flex flex-col gap-2">
            <AmountInput
              label="You pay"
              placeholder="0.0"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              tokenAddress={tokenIn?.address}
              balance={formatTokenAmount(tokenInBalance, tokenIn?.decimals ?? 18)}
              onMax={() =>
                setAmountIn(formatTokenAmount(tokenInBalance, tokenIn?.decimals ?? 18))
              }
              onTokenClick={() => {
                setSelectingTokenType("in");
                setShowTokenSelector(true);
              }}
            />

            {/* Premium Flip button */}
            <div className="flex justify-center -my-6 relative z-20">
              <button
                onClick={handleFlip}
                className="group flex flex-shrink-0 items-center justify-center w-12 h-12 rounded-2xl border border-white/10 bg-secondary/80 backdrop-blur-2xl shadow-2xl transition-all duration-500 hover:scale-110 hover:border-primary/40 hover:bg-secondary active:scale-95"
              >
                <ArrowDown className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
              </button>
            </div>

            <AmountInput
              label="You receive (est.)"
              placeholder="0.0"
              readOnly
              value={estimatedOut > 0n ? formatTokenAmount(estimatedOut, tokenOut?.decimals ?? 18) : ""}
              tokenAddress={tokenOut?.address}
              onTokenClick={() => {
                setSelectingTokenType("out");
                setShowTokenSelector(true);
              }}
            />
          </div>

          {/* Price Impact Indicator */}
          <AnimatePresence>
            {parsedAmountIn > 0n && poolState && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md">
                  <span className="text-[10px] font-heading tracking-widest uppercase text-muted-foreground">Price Impact</span>
                  <Badge variant={getPriceImpactVariant(priceImpact)} className="px-3 py-1 rounded-lg">
                    {priceImpact.toFixed(2)}%
                  </Badge>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-6 pt-2">
            {/* Privacy toggle */}
            <div className="group relative flex items-center justify-between rounded-3xl border border-white/5 bg-white/5 p-5 transition-all duration-500 hover:bg-white/10">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-heading tracking-[0.2em] uppercase text-foreground">
                  <BlurFadeText text={usePublicSwap ? "Public Execution" : "Zero-Knowledge Engine"} isPublic={usePublicSwap} />
                </span>
                <span className="text-[10px] font-heading tracking-widest text-muted-foreground/60 uppercase">
                  <BlurFadeText text={usePublicSwap ? "Visible to observers" : "Cryptographically shielded"} isPublic={usePublicSwap} />
                </span>
              </div>
              <button
                onClick={() => setUsePublicSwap(!usePublicSwap)}
                className="px-6 py-2.5 rounded-xl text-[10px] font-heading tracking-widest uppercase transition-all bg-secondary/80 border border-white/10 hover:border-primary/30 hover:text-primary active:scale-90"
              >
                {usePublicSwap ? "Shield" : "Unshield"}
              </button>
            </div>

            {/* Error Messages */}
            <AnimatePresence>
              {!usePublicSwap && parsedAmountIn > 0n && !selectedNote && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-start gap-3"
                >
                  <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
                  <p className="text-xs text-destructive font-light leading-relaxed">
                    Insufficient shielded balance. Shield tokens first to execute a private swap.
                  </p>
                </motion.div>
              )}

              {poolOps.error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-start gap-3"
                >
                  <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
                  <p className="text-xs text-destructive font-light leading-relaxed">{poolOps.error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              size="lg"
              className="w-full h-20 rounded-[32px] text-lg font-heading tracking-widest uppercase bg-gradient-to-r from-solana-purple via-solana to-solana hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 shadow-[0_0_30px_rgba(153,69,255,0.3)] border-none"
              disabled={usePublicSwap ? !canSwapPublic : !canSwapPrivate}
              onClick={() => setShowConfirm(true)}
            >
              <BlurFadeText text={usePublicSwap ? "Execute Swap" : "Shielded Transaction"} isPublic={usePublicSwap} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Recent Activity */}
      <AnimatePresence>
        {recentSwaps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-heading tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-2">
                <History className="w-4 h-4" />
                Recent Activity
              </h3>
              <button 
                onClick={() => { setRecentSwaps([]); localStorage.removeItem(STORAGE_KEY); }}
                className="text-[10px] font-heading tracking-widest uppercase text-muted-foreground/40 hover:text-destructive transition-colors"
              >
                Clear
              </button>
            </div>
            
            <div className="grid gap-3">
              {recentSwaps.map((tx) => (
                <div
                  key={tx.txHash}
                  className="group flex items-center justify-between p-5 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-xl transition-all duration-300 hover:bg-white/10 hover:border-white/10"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center border",
                      tx.isPrivate ? "bg-primary/10 border-primary/20 text-primary" : "bg-solana-purple/10 border-solana-purple/20 text-solana-purple"
                    )}>
                      {tx.isPrivate ? <Shield className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-heading tracking-tight text-foreground uppercase">
                        {tx.amountIn} {tx.tokenIn} → {tx.tokenOut}
                      </p>
                      <p className="text-[10px] font-heading tracking-widest text-muted-foreground/40 uppercase mt-1">
                        {new Date(tx.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <a
                    href={transactionExplorerUrl(tx.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SwapConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmSwap}
        tokenIn={tokenIn}
        tokenOut={tokenOut}
        amountIn={amountIn}
        loading={usePublicSwap ? poolOps.isLoading : swap.isPending}
      />

      <TokenSelector
        open={showTokenSelector}
        onClose={() => setShowTokenSelector(false)}
        onSelect={(t) => {
          if (selectingTokenType === "in") {
            setTokenIn(t);
          } else {
            setTokenOut(t);
          }
          setShowTokenSelector(false);
        }}
        excludeAddress={selectingTokenType === "in" ? tokenOut?.address : tokenIn?.address}
      />

      <ProofProgress open={swap.isPending} label="Shielded Swap" />
    </div>
  );
}

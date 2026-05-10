import { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/ui/AmountInput";
import { ProofProgress } from "@/components/ui/ProofProgress";
import { useSdkStore } from "@/stores/sdkStore";
import { TESTNET_TOKENS } from "@/config/tokens";
import { motion, AnimatePresence } from "motion/react";
import { Droplets, History, ExternalLink, Settings2 } from "lucide-react";
import { transactionExplorerUrl } from "@/lib/solana";
import { parseTokenAmount } from "@/lib/format";
import { FEE_TIERS, tokenToBigInt } from "@zylith/sdk";
import type { PoolKey } from "@zylith/sdk";
import { useMint } from "@/hooks/useMint";

const STORAGE_KEY = "zylith_recent_liquidity";

export function AddLiquidityCard() {
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const unspentNotes = useSdkStore((s) => s.unspentNotes);
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [token0] = useState(TESTNET_TOKENS[0] ?? null);
  const [token1] = useState(TESTNET_TOKENS[1] ?? null);
  const [tickLower, _setTickLower] = useState("-69120");
  const [tickUpper, _setTickUpper] = useState("600");

  const mint = useMint();
  
  const [recentTxs, _setRecentTxs] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // Find suitable notes
  const note0 = useMemo(() => {
    if (!amount0 || !token0) return undefined;
    const parsed = parseTokenAmount(amount0, token0.decimals);
    return unspentNotes.find(
      n => n.token.toLowerCase() === token0.address.toLowerCase() && BigInt(n.amount) >= parsed
    );
  }, [unspentNotes, amount0, token0]);

  const note1 = useMemo(() => {
    if (!amount1 || !token1) return undefined;
    const parsed = parseTokenAmount(amount1, token1.decimals);
    return unspentNotes.find(
      n => n.token.toLowerCase() === token1.address.toLowerCase() && BigInt(n.amount) >= parsed
    );
  }, [unspentNotes, amount1, token1]);

  const parsedAmount0 = (amount0 && token0) ? parseTokenAmount(amount0, token0.decimals) : 0n;
  const parsedAmount1 = (amount1 && token1) ? parseTokenAmount(amount1, token1.decimals) : 0n;

  const canAddLiquidity =
    isInitialized &&
    parsedAmount0 > 0n &&
    parsedAmount1 > 0n &&
    note0 &&
    note1 &&
    tickLower &&
    tickUpper &&
    parseInt(tickLower) < parseInt(tickUpper) &&
    !mint.isPending;

  const handleAddLiquidity = () => {
    if (!canAddLiquidity || !note0 || !note1 || !token0 || !token1) return;

    const [t0, t1] =
      tokenToBigInt(token0.address) < tokenToBigInt(token1.address)
        ? [token0.address, token1.address]
        : [token1.address, token0.address];

    const poolKey: PoolKey = {
      token0: t0,
      token1: t1,
      fee: FEE_TIERS.MEDIUM.fee,
      tickSpacing: FEE_TIERS.MEDIUM.tickSpacing,
    };

    const liquidity = parsedAmount0 > parsedAmount1 ? parsedAmount1 : parsedAmount0;

    mint.mutate({
      poolKey,
      inputNote0Commitment: note0.commitment,
      inputNote1Commitment: note1.commitment,
      tickLower: parseInt(tickLower),
      tickUpper: parseInt(tickUpper),
      liquidity,
      amount0: parsedAmount0,
      amount1: parsedAmount1,
    });
  };

  if (!token0 || !token1) {
    return (
      <Card className="w-full max-w-xl mx-auto border-white/5 bg-card/40 backdrop-blur-3xl p-8 text-center">
        <p className="text-muted-foreground text-sm">Token pair not configured. Set <code>VITE_TOKEN_0_ADDRESS</code> and <code>VITE_TOKEN_1_ADDRESS</code> in your environment.</p>
      </Card>
    );
  }

  const isPending = mint.isPending;

  return (
    <div className="space-y-4 w-full max-w-xl mx-auto flex flex-col min-h-0">
      <Card className="shrink-0 relative overflow-visible border-white/5 bg-card/40 backdrop-blur-3xl p-0">
        <div className="p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-3">
              <Droplets className="w-4 h-4 text-primary" />
              <h2 className="text-xl font-heading tracking-tight text-foreground uppercase pt-1">Provide Liquidity</h2>
            </div>
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              <Settings2 className="w-3 h-3" />
            </div>
          </div>

          <div className="space-y-3">
            <AmountInput
              label={`Amount of ${token0.symbol}`}
              value={amount0}
              onChange={(e) => setAmount0(e.target.value)}
              tokenAddress={token0.address}
              readOnly={false}
            />
            <AmountInput
              label={`Amount of ${token1.symbol}`}
              value={amount1}
              onChange={(e) => setAmount1(e.target.value)}
              tokenAddress={token1.address}
              readOnly={false}
            />
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full h-16 rounded-2xl bg-gradient-to-r from-solana via-primary to-solana-purple border-none shadow-[0_0_30px_rgba(20,241,149,0.15)]"
            onClick={handleAddLiquidity}
            disabled={!canAddLiquidity}
            loading={isPending}
          >
            {isPending ? "PROVIDING LIQUIDITY" : "INITIALIZE POSITION"}
          </Button>
        </div>
      </Card>

      <AnimatePresence>
        {recentTxs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="flex-1 min-h-0 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-2 mb-3 shrink-0">
              <h3 className="text-[9px] font-heading tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-2">
                <History className="w-3 h-3" />
                Position History
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
              {recentTxs.map((tx: any) => (
                <div
                  key={tx.txHash}
                  className="flex items-center justify-between p-3 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-xl transition-all duration-300 hover:bg-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-heading tracking-tight text-foreground uppercase">
                        {tx.amount0} {tx?.symbol0 || ""} + {tx.amount1} {tx?.symbol1 || ""}
                      </p>
                      <p className="text-[8px] font-heading tracking-widest text-muted-foreground/40 uppercase">
                        {new Date(tx.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <a
                    href={transactionExplorerUrl(tx.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-white/5 text-muted-foreground hover:text-foreground transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProofProgress open={isPending} label="Initializing Position" />
    </div>
  );
}

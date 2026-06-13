import { useState, useMemo } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { ProofProgress } from "@/components/features/shared/ProofProgress";
import { PositionFeesCard } from "@/components/features/liquidity/PositionFeesCard";
import { PriceRangeChart } from "@/components/features/charts/PriceRangeChart";
import { useBurn } from "@/hooks/useBurn";
import { usePoolState } from "@/hooks/usePoolState";
import { useSdkStore } from "@/stores/sdkStore";
import { useToast } from "@/components/ui/Toast";
import { TESTNET_TOKENS, getTokenSymbol } from "@/config/tokens";
import { formatTokenAmount, transactionExplorerUrl } from "@/lib/format";
import { getPositionStatusText, getPositionStatusVariant } from "@/lib/positionStatus";
import { FEE_TIERS, getAmountsForBurn } from "@zylith/sdk";
import type { PositionNote, PoolKey } from "@zylith/sdk";
import { motion } from "motion/react";
import { RefreshCcw, Shield, ExternalLink, Trash2, Layers, MapPin, Activity } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      mass: 1
    }
  }
};

export function PositionsPage() {
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const positions = useSdkStore((s) => s.unspentPositions);
  const client = useSdkStore((s) => s.client);
  const refreshBalances = useSdkStore((s) => s.refreshBalances);
  const [burnTarget, setBurnTarget] = useState<PositionNote | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const burn = useBurn();
  const { toast } = useToast();

  const token0 = TESTNET_TOKENS[0];
  const token1 = TESTNET_TOKENS[1];
  const poolKey: PoolKey | null = token0 && token1 ? {
    token0: token0.address < token1.address ? token0.address : token1.address,
    token1: token0.address < token1.address ? token1.address : token0.address,
    fee: FEE_TIERS.MEDIUM.fee,
    tickSpacing: FEE_TIERS.MEDIUM.tickSpacing,
  } : null;
  const { data: poolState } = usePoolState(poolKey);

  const handleSync = async () => {
    if (!client) return;
    const aspClient = client.getAspClient();
    if (!aspClient) {
      toast("Sync requires the ASP to be configured.", "error");
      return;
    }
    setIsSyncing(true);
    try {
      const commitments = positions.map((p) => p.commitment);
      const syncData = await aspClient.syncCommitments(commitments);
      const noteManager = client.getNoteManager();
      noteManager.updateLeafIndexes(syncData);
      await client.saveNotes();
      refreshBalances();
      const updatedCount = syncData.filter((d: any) => d.leaf_index !== null).length;
      toast(`Synced ${updatedCount} positions from network.`, "success");
    } catch (err: any) {
      toast(`Sync failed: ${err.message}`, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const burnEstimates = useMemo(() => {
    if (!burnTarget || !poolState) return null;
    return getAmountsForBurn(
      poolState.sqrtPrice,
      burnTarget.tickLower,
      burnTarget.tickUpper,
      BigInt(burnTarget.liquidity),
    );
  }, [burnTarget, poolState]);

  const handleBurn = async () => {
    if (!burnTarget || !client) return;
    const token0 = TESTNET_TOKENS[0];
    const token1 = TESTNET_TOKENS[1];
    if (!token0 || !token1) return;

    const [t0, t1] =
      token0.address < token1.address
        ? [token0.address, token1.address]
        : [token1.address, token0.address];

    const poolKey: PoolKey = {
      token0: t0,
      token1: t1,
      fee: FEE_TIERS.MEDIUM.fee,
      tickSpacing: FEE_TIERS.MEDIUM.tickSpacing,
    };

    let amount0Out = 0n;
    let amount1Out = 0n;
    try {
      const currentPoolState = await client.getPoolState(poolKey);
      const amounts = getAmountsForBurn(
        currentPoolState.sqrtPrice,
        burnTarget.tickLower,
        burnTarget.tickUpper,
        BigInt(burnTarget.liquidity),
      );
      amount0Out = amounts.amount0;
      amount1Out = amounts.amount1;
    } catch (err) {
      console.warn("Burn estimation failed", err);
    }

    if (amount0Out === 0n && amount1Out === 0n) {
      toast("Estimated return is zero. Try again when in range.", "error");
      return;
    }

    burn.mutate(
      {
        poolKey,
        positionCommitment: burnTarget.commitment,
        amount0Out,
        token0: t0,
        amount1Out,
        token1: t1,
        liquidity: BigInt(burnTarget.liquidity),
      },
      { onSuccess: () => setBurnTarget(null) }
    );
  };

  const hasPositionsWithoutLeafIndex = positions.some((p) => p.leafIndex === undefined);

  return (
    <PageContainer size="wide" className="relative z-10 pt-16 pb-32">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-16"
      >
        <motion.div variants={itemVariants} className="max-w-4xl">
          <h1 className="text-6xl md:text-8xl font-heading tracking-tighter text-foreground uppercase mb-8">
            Positions
          </h1>
          <p className="text-xl text-muted-foreground font-light leading-relaxed">
            Manage your <span className="text-foreground font-medium">Yield Strategies</span>. High-fidelity position tracking 
            with cryptographic isolation. Your liquidity remains visible, but your ownership is anonymous.
          </p>
        </motion.div>

        {isInitialized && hasPositionsWithoutLeafIndex && (
          <motion.div variants={itemVariants} className="p-8 rounded-[32px] border border-accent/20 bg-accent/5 backdrop-blur-3xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex items-start gap-4">
                <RefreshCcw className="w-6 h-6 text-accent mt-1" />
                <div>
                  <p className="text-lg font-heading tracking-tight text-accent uppercase pt-1">Protocol Sync Required</p>
                  <p className="text-sm text-accent/60 font-light mt-1">
                    Detected unindexed commitments. Synchronize with the ASP to update position metadata.
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="md"
                className="w-full md:w-auto min-w-[200px]"
                onClick={handleSync}
                loading={isSyncing}
                disabled={isSyncing}
              >
                SYNC PROTOCOL
              </Button>
            </div>
          </motion.div>
        )}

        <div className="space-y-8">
          {!isInitialized ? (
            <motion.div variants={itemVariants}>
              <Card className="flex flex-col items-center justify-center p-24 bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[48px] space-y-6">
                <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-muted-foreground/20">
                  <Shield className="w-8 h-8" />
                </div>
                <p className="text-[10px] font-heading tracking-[0.3em] uppercase text-muted-foreground/40">
                  Vault Restricted Access
                </p>
              </Card>
            </motion.div>
          ) : positions.length === 0 ? (
            <motion.div variants={itemVariants}>
              <Card className="flex flex-col items-center justify-center p-24 bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[48px] space-y-6">
                <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-muted-foreground/20">
                  <Layers className="w-8 h-8" />
                </div>
                <p className="text-[10px] font-heading tracking-[0.3em] uppercase text-muted-foreground/40">
                  No Active Commitments
                </p>
              </Card>
            </motion.div>
          ) : (
            <div className="grid gap-12">
              {positions.map((pos) => (
                <motion.div variants={itemVariants} key={pos.commitment}>
                  <Card className="relative overflow-hidden border-white/5 bg-card/40 backdrop-blur-3xl p-0">
                    <div className="p-8 sm:p-10 space-y-10">
                      {/* Position Header */}
                      <div className="flex items-center justify-between pb-8 border-b border-white/5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                            <Layers className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-heading tracking-tight text-foreground uppercase pt-1">
                              Shielded position
                            </h3>
                            <p className="text-[10px] font-heading tracking-widest text-muted-foreground/40 uppercase mt-0.5 font-mono">
                              ID: {pos.commitment.slice(0, 16)}...
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {poolState && (
                            <Badge
                              variant={getPositionStatusVariant(pos, poolState.tick)}
                              className="px-4 py-1.5 rounded-lg text-[10px]"
                            >
                              {getPositionStatusText(pos, poolState.tick)}
                            </Badge>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-12 h-12 rounded-2xl"
                            onClick={() => setBurnTarget(pos)}
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>

                      {/* Position Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-8 rounded-[32px] bg-white/5 border border-white/5 space-y-4">
                          <div className="flex items-center gap-2 text-[10px] font-heading tracking-widest text-muted-foreground uppercase">
                            <MapPin className="w-4 h-4" /> Range (Ticks)
                          </div>
                          <p className="text-3xl font-heading text-foreground uppercase">
                            [{pos.tickLower}, {pos.tickUpper}]
                          </p>
                        </div>
                        <div className="p-8 rounded-[32px] bg-white/5 border border-white/5 space-y-4">
                          <div className="flex items-center gap-2 text-[10px] font-heading tracking-widest text-muted-foreground uppercase">
                            <Activity className="w-4 h-4" /> Liquidity
                          </div>
                          <p className="text-3xl font-heading text-foreground uppercase">
                            {pos.liquidity.toString().slice(0, 12)}
                          </p>
                        </div>
                        <div className="p-8 rounded-[32px] bg-white/5 border border-white/5 space-y-4">
                          <div className="flex items-center gap-2 text-[10px] font-heading tracking-widest text-muted-foreground uppercase">
                            <RefreshCcw className="w-4 h-4" /> Sync State
                          </div>
                          <p className="text-3xl font-heading text-foreground uppercase">
                            {pos.leafIndex !== undefined ? `#${pos.leafIndex}` : "—"}
                          </p>
                        </div>
                      </div>

                      {/* Depth & Fees */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <PositionFeesCard position={pos} />
                        {poolState && (
                          <div className="p-8 rounded-[32px] bg-secondary/20 border border-white/5 min-h-[240px]">
                            <PriceRangeChart position={pos} currentTick={poolState.tick} />
                          </div>
                        )}
                      </div>

                      {pos.txHash && (
                        <div className="pt-8 border-t border-white/5 flex justify-end">
                          <a
                            href={transactionExplorerUrl(pos.txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[10px] font-heading tracking-[0.3em] uppercase text-muted-foreground/40 hover:text-foreground transition-all"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Explorer Record
                          </a>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Burn confirmation modal */}
      <Modal
        open={burnTarget !== null}
        onClose={() => setBurnTarget(null)}
        title="Remove Position"
      >
        <div className="space-y-8">
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            Terminate this shielded position? Liquidity will be returned to your vault as <span className="text-foreground font-medium">new private notes</span>.
          </p>
          {burnTarget && (
            <div className="p-8 rounded-[32px] border border-destructive/20 bg-destructive/5 space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-destructive/10">
                <span className="text-[10px] font-heading tracking-widest text-destructive/60 uppercase">Strategy ID</span>
                <span className="text-xs font-mono text-destructive uppercase">{burnTarget.commitment.slice(0, 12)}...</span>
              </div>
              
              {burnEstimates && poolKey && (() => {
                const tok0 = TESTNET_TOKENS.find(t => t.address.toLowerCase() === poolKey.token0.toLowerCase());
                const tok1 = TESTNET_TOKENS.find(t => t.address.toLowerCase() === poolKey.token1.toLowerCase());
                const symbol0 = tok0?.symbol ?? getTokenSymbol(poolKey.token0);
                const symbol1 = tok1?.symbol ?? getTokenSymbol(poolKey.token1);
                const dec0 = tok0?.decimals ?? 9;
                const dec1 = tok1?.decimals ?? 9;

                return (
                  <div className="space-y-4">
                    <p className="text-[10px] font-heading tracking-widest text-destructive/60 uppercase">Estimated Recovery</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <TokenIcon address={poolKey.token0} size="sm" />
                          <span className="text-xs font-heading tracking-tight text-foreground uppercase pt-1">{symbol0}</span>
                        </div>
                        <span className="text-xl font-heading tracking-tight text-foreground uppercase pt-1">
                          {formatTokenAmount(burnEstimates.amount0, dec0, 4)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <TokenIcon address={poolKey.token1} size="sm" />
                          <span className="text-xs font-heading tracking-tight text-foreground uppercase pt-1">{symbol1}</span>
                        </div>
                        <span className="text-xl font-heading tracking-tight text-foreground uppercase pt-1">
                          {formatTokenAmount(burnEstimates.amount1, dec1, 4)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          <div className="flex gap-4">
            <Button variant="secondary" className="flex-1" onClick={() => setBurnTarget(null)}>
              CANCEL
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleBurn}
              loading={burn.isPending}
            >
              REMOVE LIQUIDITY
            </Button>
          </div>
        </div>
      </Modal>

      <ProofProgress open={burn.isPending} label="Burning Shielded Commitment" />
    </PageContainer>
  );
}

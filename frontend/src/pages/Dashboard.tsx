import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { TotalEarningsCard } from "@/components/features/liquidity/TotalEarningsCard";
import { useSdkStore } from "@/stores/sdkStore";
import { getTokenSymbol, TESTNET_TOKENS } from "@/config/tokens";
import { formatTokenAmount } from "@/lib/format";
import { motion } from "motion/react";
import { Shield, LayoutGrid, Activity, ArrowUpRight, Zap, Coins } from "lucide-react";
import { usePoolState } from "@/hooks/usePoolState";
import { getPositionStatusVariant, isPositionInRange } from "@/lib/positionStatus";
import { FEE_TIERS } from "@zylith/sdk";
import { Link } from "react-router";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 100, damping: 20 }
  },
};

export function Dashboard() {
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const balances = useSdkStore((s) => s.balances);
  const unspentPositions = useSdkStore((s) => s.unspentPositions);
  const unspentNotes = useSdkStore((s) => s.unspentNotes);

  const token0 = TESTNET_TOKENS[0];
  const token1 = TESTNET_TOKENS[1];
  const poolKey = token0 && token1 ? {
    token0: token0.address < token1.address ? token0.address : token1.address,
    token1: token0.address < token1.address ? token1.address : token0.address,
    fee: FEE_TIERS.MEDIUM.fee,
    tickSpacing: FEE_TIERS.MEDIUM.tickSpacing,
  } : null;
  const { data: poolState } = usePoolState(poolKey);

  const tokenEntries = Object.entries(balances).filter(([, amt]) => amt > 0n);

  return (
    <PageContainer size="wide" className="relative z-10 pt-6 pb-16 min-h-[calc(100vh-96px)] flex flex-col">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full flex flex-col gap-8"
      >
        {/* Compact Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between gap-6 shrink-0">
          <div className="flex items-center gap-6">
            <h1 className="text-3xl font-heading tracking-tight text-foreground uppercase pt-1">
              Dashboard
            </h1>
            <div className="h-8 w-px bg-white/10 hidden md:block" />
            <p className="text-[10px] text-muted-foreground font-heading tracking-[0.2em] uppercase hidden md:block">
              Vault Status: <span className="text-primary">Operational</span>
            </p>
          </div>
          
          <div className="flex items-center gap-4 p-3 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-xl">
            <Activity className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-[9px] text-foreground font-heading tracking-widest uppercase">Node_Connected</span>
          </div>
        </motion.div>

        {/* Bento Grid - Expanded Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Vault Status (Column 1-4) */}
          <motion.div variants={itemVariants} className="lg:col-span-4 space-y-8">
            {/* Shielded Assets Card */}
            <Card className="border-white/5 bg-card/20 backdrop-blur-3xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between mb-6 shrink-0 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-heading tracking-[0.1em] text-foreground uppercase">Shielded Assets</h2>
                </div>
                <Badge variant="success" className="px-2 rounded-md text-[8px] tracking-widest uppercase">{tokenEntries.length}</Badge>
              </div>

              <div className="space-y-3">
                {!isInitialized ? (
                  <div className="h-full flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl bg-white/5 opacity-40">
                    <Zap className="w-8 h-8 text-primary/20 mb-4" />
                    <p className="text-[9px] font-heading tracking-widest uppercase">Awaiting Initialization</p>
                  </div>
                ) : tokenEntries.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl bg-white/5">
                    <p className="text-[9px] font-heading tracking-widest uppercase text-muted-foreground/30">Zero Balance</p>
                  </div>
                ) : (
                  tokenEntries.map(([token, amount]) => {
                    const decimals = TESTNET_TOKENS.find(t => t.address.toLowerCase() === token.toLowerCase())?.decimals ?? 18;
                    const yieldAmount = unspentNotes
                      .filter(n => n.token.toLowerCase() === token.toLowerCase() && n.isYield)
                      .reduce((acc, curr) => acc + BigInt(curr.amount), 0n);

                    return (
                      <div key={token} className="group flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/20 hover:bg-white/10 transition-all duration-300">
                        <div className="flex items-center gap-4">
                          <TokenIcon address={token} size="sm" />
                          <div>
                            <p className="text-xs font-heading tracking-tight text-foreground uppercase">{getTokenSymbol(token)}</p>
                            {yieldAmount > 0n ? (
                              <p className="text-[8px] font-heading tracking-widest text-primary/80 uppercase">
                                Yields: {formatTokenAmount(yieldAmount, decimals, 4)}
                              </p>
                            ) : (
                              <p className="text-[8px] font-heading tracking-widest text-muted-foreground/40 uppercase">Encrypted Note</p>
                            )}
                          </div>
                        </div>
                        <p className="text-lg font-heading text-foreground uppercase">{formatTokenAmount(amount, decimals)}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Claimed Yield Notes Card */}
            <Card className="border-white/5 bg-card/20 backdrop-blur-3xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between mb-6 shrink-0 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <Coins className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-heading tracking-[0.1em] text-foreground uppercase">Claimed Yield Notes</h2>
                </div>
                <Badge variant="accent" className="px-2 rounded-md text-[8px] tracking-widest uppercase">
                  {unspentNotes.filter(n => n.isYield).length} Notes
                </Badge>
              </div>

              <div className="space-y-3">
                {!isInitialized ? (
                  <div className="h-full flex flex-col items-center justify-center py-6 border border-dashed border-white/5 rounded-2xl bg-white/5 opacity-40">
                    <p className="text-[9px] font-heading tracking-widest uppercase text-muted-foreground/40">Awaiting Initialization</p>
                  </div>
                ) : unspentNotes.filter(n => n.isYield).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 border border-dashed border-white/5 rounded-2xl bg-white/5 text-center">
                    <p className="text-[9px] font-heading tracking-widest uppercase text-muted-foreground/30">No Yield Notes Claimed</p>
                    <p className="text-[7px] font-heading tracking-wider text-muted-foreground/20 uppercase mt-1">Remove range positions to collect yields</p>
                  </div>
                ) : (
                  unspentNotes.filter(n => n.isYield).map((note, index) => {
                    const decimals = TESTNET_TOKENS.find(t => t.address.toLowerCase() === note.token.toLowerCase())?.decimals ?? 18;
                    return (
                      <div key={note.commitment || index} className="group flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/20 hover:bg-white/10 transition-all duration-300">
                        <div className="flex items-center gap-3">
                          <TokenIcon address={note.token} size="sm" />
                          <div>
                            <p className="text-xs font-heading tracking-tight text-foreground uppercase pt-0.5">{getTokenSymbol(note.token)}</p>
                            <p className="text-[7px] font-heading tracking-widest text-primary uppercase font-mono">
                              ID: {note.commitment.startsWith("pending") ? "PENDING" : `${note.commitment.slice(0, 10)}...`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-heading text-primary uppercase pt-0.5">+{formatTokenAmount(BigInt(note.amount), decimals, 4)}</p>
                          <p className="text-[6px] font-heading tracking-widest text-muted-foreground/30 uppercase">Yield Note</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </motion.div>

          {/* Activity & Commitments (Column 5-12) */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            {/* Commitments Widget */}
            <motion.div variants={itemVariants}>
              <Card className="border-white/5 bg-card/20 backdrop-blur-3xl p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between mb-6 shrink-0 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <LayoutGrid className="w-4 h-4 text-solana-purple" />
                    <h2 className="text-sm font-heading tracking-[0.1em] text-foreground uppercase">Active Commitments</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {poolState && (
                      <span className="text-[8px] font-heading tracking-widest text-muted-foreground/60 uppercase">
                        Pool Tick: {poolState.tick}
                      </span>
                    )}
                    <Badge variant="accent" className="px-2 rounded-md text-[8px] tracking-widest uppercase">{unspentPositions.length} POS</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {!isInitialized ? (
                    <div className="col-span-full h-full flex items-center justify-center border border-dashed border-white/5 rounded-2xl bg-white/5 opacity-40">
                      <p className="text-[9px] font-heading tracking-widest uppercase">Awaiting Link</p>
                    </div>
                  ) : unspentPositions.length === 0 ? (
                    <div className="col-span-full h-full flex items-center justify-center border border-dashed border-white/5 rounded-2xl bg-white/5">
                      <p className="text-[9px] font-heading tracking-widest uppercase text-muted-foreground/30">No Positions</p>
                    </div>
                  ) : (
                    unspentPositions.map((pos) => {
                      const currentTick = poolState?.tick;
                      const inRange = currentTick !== undefined && isPositionInRange(pos, currentTick);
                      
                      let percent = 50;
                      if (currentTick !== undefined && inRange && pos.tickUpper !== pos.tickLower) {
                        percent = ((currentTick - pos.tickLower) / (pos.tickUpper - pos.tickLower)) * 100;
                      }

                      return (
                        <Link 
                          key={pos.commitment} 
                          to="/app/positions"
                          className="group p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between min-h-[160px] bg-gradient-to-b from-solana-purple/5 to-accent/5 border-solana-purple/10 hover:border-solana-purple/30 hover:from-solana-purple/10 hover:to-accent/10 cursor-pointer block"
                        >
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                  {token0 && <TokenIcon address={token0.address} size="sm" />}
                                  {token1 && <TokenIcon address={token1.address} size="sm" />}
                                </div>
                                <span className="text-[9px] font-heading tracking-tight text-foreground uppercase pt-0.5 font-mono">
                                  {token0 ? getTokenSymbol(token0.address) : "SOL"}-{token1 ? getTokenSymbol(token1.address) : "USDC"}
                                </span>
                              </div>
                              {currentTick !== undefined && (
                                <Badge 
                                  variant={getPositionStatusVariant(pos, currentTick)} 
                                  className="px-2 py-0.5 rounded text-[7px] tracking-wider uppercase font-semibold"
                                >
                                  {inRange ? "IN RANGE" : "OUT RANGE"}
                                </Badge>
                              )}
                            </div>

                            <div className="flex justify-between items-start pt-1">
                              <div>
                                <p className="text-[6px] font-heading tracking-widest text-muted-foreground/40 uppercase">Range (Ticks)</p>
                                <p className="text-sm font-heading text-foreground mt-0.5 font-mono">{pos.tickLower} : {pos.tickUpper}</p>
                              </div>
                              <ArrowUpRight className="w-3.5 h-3.5 text-solana-purple/40 group-hover:text-solana-purple transition-all duration-300 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </div>
                          </div>

                          <div className="space-y-3">
                            {/* Price range indicator bar */}
                            {currentTick !== undefined && (
                              <div className="space-y-1">
                                <div className="relative h-1.5 w-full rounded-full bg-white/5 overflow-hidden border border-white/5">
                                  <div className="absolute inset-y-0 left-0 right-0 bg-solana-purple/25 rounded-full animate-pulse" />
                                  {inRange && (
                                    <div 
                                      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-signal-success border border-white shadow-[0_0_8px_rgba(20,223,127,0.8)]"
                                      style={{ left: `${percent}%`, transform: 'translate(-50%, -50%)' }}
                                    />
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="flex justify-between items-end pt-2 border-t border-white/5">
                              <p className="text-[6px] font-heading tracking-widest text-muted-foreground/40 uppercase">Liquidity</p>
                              <p className="text-sm font-heading text-solana-purple uppercase font-mono">
                                {pos.liquidity.toString().slice(0, 10)}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Earnings Widget */}
            <motion.div variants={itemVariants}>
              <TotalEarningsCard isCompact={false} />
            </motion.div>
          </div>
        </div>

        {/* System Bar */}
        <motion.div variants={itemVariants} className="shrink-0 flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-3xl">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[8px] font-heading tracking-[0.2em] text-muted-foreground uppercase">Network: Solana Mainnet-Beta</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-solana-purple shadow-[0_0_8px_rgba(153,69,255,0.6)]" />
              <span className="text-[8px] font-heading tracking-[0.2em] text-muted-foreground uppercase">Privacy: Level_04</span>
            </div>
          </div>
          <p className="text-[8px] font-heading tracking-[0.4em] text-muted-foreground/30 uppercase">
            &copy; 2026 Sunset Labs // Encrypted Protocol Layer
          </p>
        </motion.div>
      </motion.div>
    </PageContainer>
  );
}

import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { TotalEarningsCard } from "@/components/features/liquidity/TotalEarningsCard";
import { useSdkStore } from "@/stores/sdkStore";
import { getTokenSymbol, TESTNET_TOKENS } from "@/config/tokens";
import { formatTokenAmount } from "@/lib/format";
import { motion } from "motion/react";
import { Shield, LayoutGrid, Activity, ArrowUpRight, Zap } from "lucide-react";

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

  const tokenEntries = Object.entries(balances).filter(([, amt]) => amt > 0n);

  return (
    <PageContainer size="wide" className="relative z-10 pt-4 pb-8 h-[calc(100vh-96px)] flex flex-col overflow-hidden">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full flex flex-col gap-6 h-full"
      >
        {/* Compact Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between gap-6 shrink-0">
          <div className="flex items-center gap-6">
            <h1 className="text-3xl font-heading tracking-tight text-foreground uppercase pt-1">
              Terminal
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

        {/* Bento Grid - Designed to fit */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 overflow-hidden min-h-0">
          
          {/* Main Vault Status (Column 1-5) */}
          <motion.div variants={itemVariants} className="md:col-span-5 h-full min-h-0">
            <Card className="h-full border-white/5 bg-card/20 backdrop-blur-3xl p-6 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-6 shrink-0 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-heading tracking-[0.1em] text-foreground uppercase">Shielded Assets</h2>
                </div>
                <Badge variant="success" className="px-2 rounded-md text-[8px] tracking-widest uppercase">{tokenEntries.length}</Badge>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
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
                    return (
                      <div key={token} className="group flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/20 hover:bg-white/10 transition-all duration-300">
                        <div className="flex items-center gap-4">
                          <TokenIcon address={token} size="sm" />
                          <div>
                            <p className="text-xs font-heading tracking-tight text-foreground uppercase">{getTokenSymbol(token)}</p>
                            <p className="text-[8px] font-heading tracking-widest text-muted-foreground/40 uppercase">Encrypted Note</p>
                          </div>
                        </div>
                        <p className="text-lg font-heading text-foreground uppercase">{formatTokenAmount(amount, decimals)}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </motion.div>

          {/* Activity & Commitments (Column 6-12) */}
          <div className="md:col-span-7 grid grid-rows-2 gap-6 h-full min-h-0">
            {/* Commitments Widget */}
            <motion.div variants={itemVariants} className="h-full min-h-0">
              <Card className="h-full border-white/5 bg-card/20 backdrop-blur-3xl p-6 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-6 shrink-0 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <LayoutGrid className="w-4 h-4 text-solana-purple" />
                    <h2 className="text-sm font-heading tracking-[0.1em] text-foreground uppercase">Active Commitments</h2>
                  </div>
                  <Badge variant="accent" className="px-2 rounded-md text-[8px] tracking-widest uppercase">{unspentPositions.length} POS</Badge>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
                  {!isInitialized ? (
                    <div className="col-span-full h-full flex items-center justify-center border border-dashed border-white/5 rounded-2xl bg-white/5 opacity-40">
                      <p className="text-[9px] font-heading tracking-widest uppercase">Awaiting Link</p>
                    </div>
                  ) : unspentPositions.length === 0 ? (
                    <div className="col-span-full h-full flex items-center justify-center border border-dashed border-white/5 rounded-2xl bg-white/5">
                      <p className="text-[9px] font-heading tracking-widest uppercase text-muted-foreground/30">No Positions</p>
                    </div>
                  ) : (
                    unspentPositions.map((pos) => (
                      <div key={pos.commitment} className="group p-4 rounded-2xl bg-solana-purple/5 border border-solana-purple/10 hover:bg-solana-purple/10 transition-all duration-300">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-[7px] font-heading tracking-widest text-muted-foreground/40 uppercase">Range</p>
                            <p className="text-[10px] font-heading text-foreground">{pos.tickLower} : {pos.tickUpper}</p>
                          </div>
                          <ArrowUpRight className="w-3 h-3 text-solana-purple/40 group-hover:text-solana-purple transition-colors" />
                        </div>
                        <div className="flex justify-between items-end pt-2 border-t border-white/5">
                          <p className="text-[7px] font-heading tracking-widest text-muted-foreground/40 uppercase">Liq</p>
                          <p className="text-sm font-heading text-solana-purple uppercase">{pos.liquidity.toString().slice(0, 6)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Earnings Widget */}
            <motion.div variants={itemVariants} className="h-full min-h-0">
              <TotalEarningsCard isCompact />
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

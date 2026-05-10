import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LiquidityDepthChart } from "@/components/features/charts/LiquidityDepthChart";
import { usePoolState } from "@/hooks/usePoolState";
import { TOKEN_0, TOKEN_1 } from "@/config/tokens";
import { FEE_TIERS } from "@zylith/sdk";
import type { PoolKey } from "@zylith/sdk";
import { motion } from "motion/react";
import { BarChart3, Activity } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 100, damping: 20 }
  }
};

export function PoolBrowser() {
  const token0 = TOKEN_0;
  const token1 = TOKEN_1;

  if (!token0 || !token1) {
    return (
      <PageContainer size="wide">
        <div className="py-24 text-center">
          <p className="text-[10px] font-heading tracking-widest uppercase text-muted-foreground/40">Configuration Missing</p>
        </div>
      </PageContainer>
    );
  }

  const poolKey: PoolKey = {
    token0: token0.address,
    token1: token1.address,
    fee: FEE_TIERS.MEDIUM.fee,
    tickSpacing: FEE_TIERS.MEDIUM.tickSpacing,
  };

  const { data: poolState, isLoading: poolLoading } = usePoolState(poolKey);
  const isEmpty = poolState && poolState.liquidity === 0n;

  return (
    <PageContainer size="wide" className="relative z-10 pt-4 pb-16 h-full flex flex-col overflow-hidden">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 flex flex-col flex-1 min-h-0"
      >
        {/* Compact Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between shrink-0">
          <h1 className="text-3xl md:text-4xl font-heading tracking-tighter text-foreground uppercase">
            <span className="text-solana">{token0.symbol}</span>
            <span className="text-muted-foreground/20 mx-3">/</span>
            <span className="text-solana-purple">{token1.symbol}</span>
          </h1>
          <Badge variant="primary" className="px-3 rounded-md text-[8px] tracking-widest uppercase font-heading">Pool_Analytics</Badge>
        </motion.div>

        {/* Status Area */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
          
          {/* Main Chart Area (Col 1-8) */}
          <motion.div variants={itemVariants} className="md:col-span-8 h-full min-h-0 flex flex-col">
            <Card className="flex-1 border-white/5 bg-card/20 backdrop-blur-3xl p-6 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4 shrink-0 pb-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-heading tracking-[0.1em] text-foreground uppercase">Liquidity Depth</h2>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                   <span className="text-[8px] font-heading text-muted-foreground uppercase tracking-widest">Real-time</span>
                </div>
              </div>

              <div className="flex-1 min-h-0 relative">
                {poolLoading ? (
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <Activity className="w-8 h-8 text-primary/20 animate-pulse mb-4" />
                     <p className="text-[9px] font-heading tracking-widest uppercase text-muted-foreground/40">Syncing_Protocol_State</p>
                   </div>
                ) : poolState && !isEmpty ? (
                   <div className="h-full w-full p-2">
                     <LiquidityDepthChart poolState={poolState} />
                   </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl bg-white/5">
                    <p className="text-[9px] font-heading tracking-widest uppercase text-muted-foreground/30">No Active Depth Data</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Metrics & Sidebar (Col 9-12) */}
          <motion.div variants={itemVariants} className="md:col-span-4 h-full min-h-0 flex flex-col gap-6">
             <Card className="border-white/5 bg-card/20 backdrop-blur-3xl p-6 space-y-6">
                <div>
                   <p className="text-[9px] font-heading tracking-widest text-muted-foreground uppercase mb-2">Current Tick</p>
                   <p className="text-4xl font-heading text-primary truncate">
                     {poolLoading ? "..." : poolState?.tick ?? "0"}
                   </p>
                </div>
                <div className="pt-6 border-t border-white/5">
                   <p className="text-[9px] font-heading tracking-widest text-muted-foreground uppercase mb-2">Pool Liquidity</p>
                   <p className="text-4xl font-heading text-solana-purple truncate">
                     {poolLoading ? "..." : poolState?.liquidity.toString().slice(0, 8) ?? "0"}
                   </p>
                </div>
             </Card>

             <Card className="flex-1 border-white/5 bg-solana-purple/5 backdrop-blur-3xl p-6">
                <h3 className="text-[10px] font-heading tracking-widest text-foreground uppercase mb-4">Protocol Intelligence</h3>
                <div className="space-y-4">
                   {[
                     { l: "Swap Fee", v: "0.30%" },
                     { l: "Privacy", v: "zk-SNARK" },
                     { l: "Status", v: "Active" }
                   ].map(stat => (
                     <div key={stat.l} className="flex justify-between items-center py-2 border-b border-white/5">
                       <span className="text-[9px] font-heading text-muted-foreground/60 uppercase">{stat.l}</span>
                       <span className="text-[9px] font-heading text-foreground uppercase tracking-widest">{stat.v}</span>
                     </div>
                   ))}
                </div>
             </Card>
          </motion.div>
        </div>
      </motion.div>
    </PageContainer>
  );
}

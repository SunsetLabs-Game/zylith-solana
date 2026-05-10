import { useMemo } from "react";
import { motion } from "motion/react";
import { createLiquidityScale, formatChartNumber } from "@/lib/charts";
import type { PoolState } from "@zylith/sdk";

interface LiquidityDepthChartProps {
  poolState: PoolState;
  className?: string;
}

/**
 * Visualizes current pool liquidity as a horizontal bar.
 * Shows real-time snapshot of total liquidity in the pool.
 */
export function LiquidityDepthChart({
  poolState,
  className = "",
}: LiquidityDepthChartProps) {
  const chartWidth = 400;
  const padding = 0;

  const scale = useMemo(
    () =>
      createLiquidityScale(poolState.liquidity, chartWidth, padding),
    [poolState.liquidity]
  );

  const barWidth = scale(Number(poolState.liquidity));
  const displayValue = formatChartNumber(poolState.liquidity);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <p className="text-[10px] font-heading tracking-[0.2em] uppercase text-muted-foreground">
          Total Depth
        </p>
        <p className="text-xl font-heading tracking-tight text-foreground uppercase pt-1">
          {displayValue}
        </p>
      </div>

      <div className="relative h-20 w-full bg-white/5 rounded-2xl overflow-hidden border border-white/5">
        {/* Animated liquidity bar */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(barWidth / chartWidth) * 100}%` }}
          transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-solana-purple/40 to-primary/40 backdrop-blur-sm"
        />
        
        {/* Grid lines overlay */}
        <div className="absolute inset-0 flex justify-between pointer-events-none px-1">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-full w-px bg-white/[0.03]" />
          ))}
        </div>

        <div className="absolute inset-0 flex items-center px-6 pointer-events-none">
          <p className="text-[10px] font-heading tracking-[0.3em] uppercase text-foreground/60">
            LIQUIDITY_ACTIVE
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-[10px] font-heading tracking-widest text-muted-foreground/30 uppercase">
          On-chain Snapshot
        </p>
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
          <p className="text-[10px] font-heading tracking-widest text-primary uppercase">Live</p>
        </div>
      </div>
    </div>
  );
}

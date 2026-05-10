import { useMemo } from "react";
import { motion } from "motion/react";
import { createTickScale } from "@/lib/charts";
import type { PositionNote } from "@zylith/sdk";
import { cn } from "@/lib/cn";

interface PriceRangeChartProps {
  position: PositionNote;
  currentTick: number;
  className?: string;
}

/**
 * Visualizes a position's price range relative to the current pool tick.
 * Shows whether the position is in-range or out-of-range.
 */
export function PriceRangeChart({
  position,
  currentTick,
  className = "",
}: PriceRangeChartProps) {
  const chartWidth = 400;
  const padding = 60;

  const { tickLower, tickUpper } = position;

  const tickRange = Math.abs(tickUpper - tickLower) || 1000;
  const visualMin = tickLower - tickRange * 0.4;
  const visualMax = tickUpper + tickRange * 0.4;

  const scale = useMemo(
    () => createTickScale(visualMin, visualMax, chartWidth, padding),
    [visualMin, visualMax, chartWidth]
  );

  const rangeStart = scale(tickLower);
  const rangeEnd = scale(tickUpper);
  const rangeWidth = Math.max(rangeEnd - rangeStart, 2);
  const currentTickPos = scale(currentTick);

  const inRange = currentTick >= tickLower && currentTick <= tickUpper;

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-heading tracking-[0.2em] uppercase text-muted-foreground">
          Execution Range
        </p>
        <div className="flex items-center gap-2">
          <div className={cn("w-1.5 h-1.5 rounded-full", inRange ? "bg-primary animate-pulse shadow-[0_0_8px_rgba(20,241,149,0.5)]" : "bg-muted-foreground/30")} />
          <p className={cn("text-[10px] font-heading tracking-widest uppercase", inRange ? "text-primary" : "text-muted-foreground/40")}>
            {inRange ? "Active Yield" : "Inactive"}
          </p>
        </div>
      </div>

      <div className="relative h-24 w-full bg-white/5 rounded-2xl border border-white/5 overflow-visible px-4 py-8">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${chartWidth} 40`}
          preserveAspectRatio="none"
          className="overflow-visible"
        >
          {/* Track */}
          <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          
          {/* Position Range */}
          <motion.rect
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            x={rangeStart}
            y="10"
            width={rangeWidth}
            height="20"
            rx="4"
            fill={inRange ? "rgba(20, 241, 149, 0.15)" : "rgba(153, 69, 255, 0.1)"}
            stroke={inRange ? "rgba(20, 241, 149, 0.4)" : "rgba(153, 69, 255, 0.3)"}
            strokeWidth="1.5"
            className="origin-center"
          />

          {/* Current Tick Indicator */}
          <motion.g
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ x: currentTickPos }}
          >
            <line y1="0" y2="40" stroke={inRange ? "#14F195" : "#9945FF"} strokeWidth="2" />
            <polygon 
              points="-6,-10 6,-10 0,0" 
              fill={inRange ? "#14F195" : "#9945FF"} 
              transform="translate(0, 0)"
            />
          </motion.g>

          {/* Tick Labels */}
          <text x={rangeStart} y="45" fill="rgba(255,255,255,0.2)" fontSize="9" textAnchor="middle" className="font-heading uppercase tracking-tighter">{tickLower}</text>
          <text x={rangeEnd} y="45" fill="rgba(255,255,255,0.2)" fontSize="9" textAnchor="middle" className="font-heading uppercase tracking-tighter">{tickUpper}</text>
          <text x={currentTickPos} y="-15" fill={inRange ? "#14F195" : "#9945FF"} fontSize="10" fontWeight="bold" textAnchor="middle" className="font-heading uppercase tracking-tighter">{currentTick}</text>
        </svg>
      </div>

      <p className="text-[10px] font-heading tracking-widest text-muted-foreground/30 uppercase text-center italic leading-relaxed">
        {inRange 
          ? "Strategy is currently accruing swap fees." 
          : "Price is outside execution range. No fees are being collected."}
      </p>
    </div>
  );
}

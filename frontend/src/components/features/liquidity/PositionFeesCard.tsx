import { usePositionFees } from "@/hooks/usePositionFees";
import { formatTokenAmount } from "@/lib/format";
import { TOKEN_0, TOKEN_1 } from "@/config/tokens";
import type { PositionNote } from "@zylith/sdk";
import { Coins } from "lucide-react";

interface PositionFeesCardProps {
  position: PositionNote;
}

/**
 * Displays uncollected fees for a specific shielded position.
 * Shows real-time data from on-chain position state.
 */
export function PositionFeesCard({ position }: PositionFeesCardProps) {
  const { data: fees, isLoading, isError } = usePositionFees(position) as any;

  const token0 = TOKEN_0;
  const token1 = TOKEN_1;

  if (!token0 || !token1) {
    return null;
  }

  const [displayToken0, displayToken1] =
    token0.address < token1.address
      ? [token0, token1]
      : [token1, token0];

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md space-y-6">
      <div>
        <div className="flex items-center gap-2 text-[10px] font-heading tracking-[0.2em] uppercase text-muted-foreground mb-4">
          <Coins className="w-4 h-4 text-primary" />
          Uncollected Fees
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <div className="h-8 bg-white/5 rounded-xl animate-pulse" />
            <div className="h-8 bg-white/5 rounded-xl animate-pulse" />
          </div>
        ) : isError ? (
          <p className="text-xs text-destructive font-heading uppercase tracking-widest">Fee estimation failed</p>
        ) : fees ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-heading tracking-widest text-muted-foreground uppercase">{displayToken0.symbol}</span>
              <span className="text-xl font-heading tracking-tight text-foreground uppercase pt-1">
                {formatTokenAmount(fees.tokensOwed0, displayToken0.decimals, 4)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-heading tracking-widest text-muted-foreground uppercase">{displayToken1.symbol}</span>
              <span className="text-xl font-heading tracking-tight text-foreground uppercase pt-1">
                {formatTokenAmount(fees.tokensOwed1, displayToken1.decimals, 4)}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {fees && (
        <div className="pt-6 border-t border-white/5 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-heading tracking-widest text-muted-foreground uppercase">Strategy Value</span>
            <span className="text-[10px] font-heading tracking-widest text-primary uppercase">Active Yield</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
              <p className="text-[8px] font-heading tracking-wider text-muted-foreground/55 uppercase">Initial Deposit</p>
              <p className="text-xs font-heading text-foreground uppercase truncate">
                {formatTokenAmount(fees.initialAmount0 ?? 0n, displayToken0.decimals, 2)} {displayToken0.symbol}
              </p>
              <p className="text-xs font-heading text-foreground uppercase truncate">
                {formatTokenAmount(fees.initialAmount1 ?? 0n, displayToken1.decimals, 2)} {displayToken1.symbol}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
              <p className="text-[8px] font-heading tracking-wider text-muted-foreground/55 uppercase">Current Value</p>
              <p className="text-xs font-heading text-foreground uppercase truncate">
                {formatTokenAmount(fees.currentAmount0 ?? 0n, displayToken0.decimals, 2)} {displayToken0.symbol}
              </p>
              <p className="text-xs font-heading text-foreground uppercase truncate">
                {formatTokenAmount(fees.currentAmount1 ?? 0n, displayToken1.decimals, 2)} {displayToken1.symbol}
              </p>
            </div>
          </div>

          {(() => {
            const diff0 = BigInt(fees.currentAmount0 ?? 0n) + BigInt(fees.tokensOwed0 ?? 0n) - BigInt(fees.initialAmount0 ?? 0n);
            const diff1 = BigInt(fees.currentAmount1 ?? 0n) + BigInt(fees.tokensOwed1 ?? 0n) - BigInt(fees.initialAmount1 ?? 0n);
            const isProfit = diff0 >= 0n && diff1 >= 0n;
            
            return (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[9px] font-heading tracking-widest text-muted-foreground uppercase">Net Gain / Loss</span>
                <span className={`text-xs font-heading uppercase pt-0.5 ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                  {isProfit ? '+' : ''}
                  {formatTokenAmount(diff0, displayToken0.decimals, 2)} {displayToken0.symbol} / {isProfit ? '+' : ''}
                  {formatTokenAmount(diff1, displayToken1.decimals, 2)} {displayToken1.symbol}
                </span>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

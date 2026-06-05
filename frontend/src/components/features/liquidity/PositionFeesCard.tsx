import { usePositionFees } from "@/hooks/usePositionFees";
import { formatTokenAmount } from "@/lib/format";
import { TOKEN_0, TOKEN_1 } from "@/config/tokens";
import { tokenToBigInt2 } from "@zylith/sdk";
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
  const { data: fees, isLoading, isError } = usePositionFees(position);

  const token0 = TOKEN_0;
  const token1 = TOKEN_1;

  if (!token0 || !token1) {
    return null;
  }

  const [displayToken0, displayToken1] =
    tokenToBigInt2(token0.address) < tokenToBigInt2(token1.address)
      ? [token0, token1]
      : [token1, token0];

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-md">
      <div className="flex items-center gap-2 text-[10px] font-heading tracking-[0.2em] uppercase text-muted-foreground mb-4">
        <Coins className="w-4 h-4" />
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

          {fees.tokensOwed0 === 0n && fees.tokensOwed1 === 0n && (
            <p className="text-[10px] font-heading tracking-widest text-muted-foreground/40 uppercase mt-4 text-center">
              Accumulating...
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

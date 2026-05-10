import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAllPositionsFees } from "@/hooks/useAllPositionsFees";
import { useSdkStore } from "@/stores/sdkStore";
import { formatTokenAmount } from "@/lib/format";
import { TOKEN_0, TOKEN_1 } from "@/config/tokens";
import { tokenToBigInt } from "@zylith/sdk";
import { Coins, Lock, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface TotalEarningsCardProps {
  isCompact?: boolean;
}

export function TotalEarningsCard({ isCompact }: TotalEarningsCardProps) {
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const positions = useSdkStore((s) => s.unspentPositions);
  const { data: fees, isLoading } = useAllPositionsFees();

  const token0 = TOKEN_0;
  const token1 = TOKEN_1;

  if (!token0 || !token1) return null;

  const [displayToken0, displayToken1] =
    tokenToBigInt(token0.address) < tokenToBigInt(token1.address)
      ? [token0, token1]
      : [token1, token0];

  const hasEarnings = fees && (fees.totalTokensOwed0 > 0n || fees.totalTokensOwed1 > 0n);

  return (
    <Card className={cn(
      "border-white/5 bg-card/20 backdrop-blur-3xl p-6 flex flex-col overflow-hidden",
      isCompact ? "h-full" : "h-auto"
    )}>
      <div className="flex items-center justify-between mb-6 shrink-0 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Coins className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-heading tracking-[0.1em] text-foreground uppercase">Yield Engine</h2>
        </div>
        <Badge variant={hasEarnings ? "success" : "default"} className="px-2 rounded-md text-[8px] tracking-widest uppercase">
          {positions.length} ACT
        </Badge>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-4">
        {!isInitialized ? (
          <div className="flex flex-col items-center justify-center py-6 px-4 text-center border border-dashed border-white/5 rounded-2xl opacity-40">
            <Lock className="w-6 h-6 text-muted-foreground/30 mb-2" />
            <p className="text-[8px] font-heading tracking-widest uppercase text-muted-foreground/40">Vault Restricted</p>
          </div>
        ) : positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 px-4 text-center border border-dashed border-white/5 rounded-2xl">
            <p className="text-[8px] font-heading tracking-widest uppercase text-muted-foreground/40">No Yield Flowing</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : fees ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <p className="text-[7px] font-heading tracking-widest text-primary/60 uppercase mb-2">{displayToken0.symbol}</p>
                <p className="text-xl font-heading text-foreground uppercase truncate">
                  {formatTokenAmount(fees.totalTokensOwed0, displayToken0.decimals, 4)}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-solana-purple/5 border border-solana-purple/10">
                <p className="text-[7px] font-heading tracking-widest text-solana-purple/60 uppercase mb-2">{displayToken1.symbol}</p>
                <p className="text-xl font-heading text-foreground uppercase truncate">
                  {formatTokenAmount(fees.totalTokensOwed1, displayToken1.decimals, 4)}
                </p>
              </div>
            </div>
            
            <p className="text-[7px] font-heading tracking-[0.4em] text-muted-foreground/30 uppercase text-center">
              Real-time aggregated yield across {fees.positions.length} price zones
            </p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

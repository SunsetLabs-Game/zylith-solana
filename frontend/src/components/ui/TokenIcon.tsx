import { cn } from "@/lib/cn";
import { getToken } from "@/config/tokens";

interface TokenIconProps {
  address: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-14 w-14 text-sm",
} as const;

export function TokenIcon({ address, size = "md", className }: TokenIconProps) {
  const token = getToken(address);
  const symbol = token?.symbol ?? "?";
  const initials = symbol.slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-secondary/80 border border-white/10 font-heading tracking-tighter text-foreground shadow-xl",
        sizeMap[size],
        className
      )}
      title={token?.name ?? address}
    >
      <span className="pt-0.5">{initials}</span>
    </div>
  );
}

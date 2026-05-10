import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";
import { TokenIcon } from "./TokenIcon";
import { getTokenSymbol } from "@/config/tokens";

interface AmountInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  tokenAddress?: string;
  balance?: string;
  error?: string;
  label?: string;
  onMax?: () => void;
  onTokenClick?: () => void;
}

export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  ({ tokenAddress, balance, error, label, onMax, onTokenClick, className, ...props }, ref) => {
    return (
      <div className="space-y-3">
        {label && (
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-heading tracking-[0.2em] uppercase text-muted-foreground">{label}</span>
            {balance !== undefined && (
              <span className="text-[10px] font-heading tracking-widest text-muted-foreground/60 uppercase">
                Balance: <span className="text-foreground/80">{balance}</span>
              </span>
            )}
          </div>
        )}
        <div
          className={cn(
            "group flex items-center rounded-3xl border bg-white/5 backdrop-blur-3xl transition-all duration-500",
            "focus-within:bg-white/10 focus-within:border-primary/40 focus-within:shadow-[0_0_25px_rgba(20,241,149,0.1)]",
            error ? "border-destructive/50" : "border-white/10 hover:border-white/20",
            className
          )}
        >
          <input
            ref={ref}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            className="h-20 flex-1 bg-transparent px-6 text-3xl font-light text-foreground placeholder:text-muted-foreground/20 focus:outline-none min-w-0"
            {...props}
            onChange={(e) => {
              if (e.target.value === "" || /^\d*\.?\d*$/.test(e.target.value)) {
                props.onChange?.(e);
              }
            }}
          />
          <div className="flex shrink-0 items-center gap-4 pr-6">
            {onMax && (
              <button
                type="button"
                onClick={onMax}
                className="shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-heading tracking-widest text-primary hover:bg-primary/10 transition-all active:scale-90"
              >
                MAX
              </button>
            )}
            {tokenAddress && (
              <button
                type="button"
                onClick={onTokenClick}
                disabled={!onTokenClick}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-2xl bg-secondary/60 border border-white/5 shadow-2xl px-4 py-2.5 transition-all duration-300 backdrop-blur-md",
                  onTokenClick && "cursor-pointer hover:border-primary/40 hover:bg-secondary/80 active:scale-95",
                  !onTokenClick && "cursor-default opacity-90"
                )}
              >
                <div className="shrink-0">
                  <TokenIcon address={tokenAddress} size="sm" />
                </div>
                <span className="text-lg font-heading tracking-tight text-foreground whitespace-nowrap pt-0.5">
                  {getTokenSymbol(tokenAddress)}
                </span>
                {onTokenClick && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-muted-foreground ml-1 shrink-0">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
        {error && <p className="text-[10px] font-heading tracking-widest uppercase text-destructive ml-1">{error}</p>}
      </div>
    );
  }
);

AmountInput.displayName = "AmountInput";

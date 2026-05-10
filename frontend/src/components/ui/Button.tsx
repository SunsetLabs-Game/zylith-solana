import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-background font-heading uppercase tracking-widest hover:brightness-110 active:scale-[0.98] disabled:opacity-50 shadow-[0_0_15px_rgba(20,241,149,0.3)]",
  secondary:
    "border border-white/10 bg-white/5 text-foreground font-heading uppercase tracking-widest hover:border-primary/40 hover:bg-white/10 active:scale-[0.98] disabled:opacity-40 backdrop-blur-sm transition-all",
  ghost:
    "bg-transparent text-muted-foreground font-heading uppercase tracking-widest hover:bg-white/5 hover:text-foreground active:scale-[0.98] disabled:opacity-40",
  destructive:
    "border border-destructive/30 bg-transparent text-destructive font-heading uppercase tracking-widest hover:border-destructive/60 hover:bg-destructive/5 active:scale-[0.98] disabled:opacity-40",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-[10px] rounded-lg gap-1.5",
  md: "h-11 px-6 text-xs rounded-xl gap-2",
  lg: "h-14 px-8 text-sm rounded-2xl gap-3",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", loading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50",
          variantStyles[variant],
          sizeStyles[size],
          loading && "cursor-wait",
          className
        )}
        {...props}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        <span className="pt-0.5">{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";

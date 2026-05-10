import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  noPadding?: boolean;
  animated?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ elevated, noPadding, animated, className, children, ...props }, ref) => {

    // Static base wrapper to enforce corner radiuses regardless of animated state
    if (!animated) {
      return (
        <div
          ref={ref}
          className={cn(
            "rounded-3xl border border-white/5 bg-card/40 backdrop-blur-3xl shadow-2xl shadow-black/40",
            elevated && "bg-secondary/40 border-primary/10",
            !noPadding && "p-8",
            className
          )}
          {...props}
        >
          {children}
        </div>
      );
    }

    // Animated container
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex flex-col overflow-hidden rounded-3xl p-[1px] group transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10",
          className
        )}
        {...props}
      >
        {/* Spinning background gradient tail */}
        <span className="absolute inset-[-1000%] animate-[spin_6s_linear_infinite] opacity-0 transition-opacity duration-700 group-hover:opacity-100 bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,var(--color-primary)_100%)]" />
        
        {/* Border Glow fallback */}
        <span className={cn("absolute inset-0 rounded-3xl transition-opacity duration-300 pointer-events-none bg-white/5 group-hover:opacity-0")} />

        {/* Solid opaque inner body mask */}
        <div className={cn(
          "relative z-10 w-full h-full flex flex-col rounded-[23px] transition-all duration-500 bg-card/90 group-hover:bg-card/95",
          !noPadding && "p-8",
          elevated && "bg-secondary/80"
        )}>
          {children}
        </div>
      </div>
    );
  }
);

Card.displayName = "Card";

import { cn } from "@/lib/cn";

interface SkeletonProps {
  variant?: "text" | "card" | "circle" | "button";
  className?: string;
  width?: string | number;
  height?: string | number;
}

/**
 * Reusable loading skeleton component with different variants.
 * Provides smooth pulsing animation matching the Solana brand palette.
 */
export function Skeleton({
  variant = "text",
  className,
  width,
  height,
}: SkeletonProps) {
  const baseStyles =
    "animate-pulse bg-white/5";

  const variantStyles = {
    text: "h-4 rounded-lg",
    card: "h-32 rounded-3xl",
    circle: "rounded-full",
    button: "h-11 rounded-xl",
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={cn(baseStyles, variantStyles[variant], className)}
      style={style}
    />
  );
}

/**
 * Specialized skeleton for text content with multiple lines.
 */
export function TextSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={i === lines - 1 ? "w-3/4" : "w-full"}
        />
      ))}
    </div>
  );
}

/**
 * Specialized skeleton for card content.
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/5 bg-card/20 p-8 backdrop-blur-xl",
        className
      )}
    >
      <Skeleton variant="text" className="w-1/3 mb-6 h-6" />
      <div className="space-y-4">
        <Skeleton variant="text" className="w-full" />
        <Skeleton variant="text" className="w-5/6" />
        <Skeleton variant="text" className="w-4/6 opacity-60" />
      </div>
    </div>
  );
}

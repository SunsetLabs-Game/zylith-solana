import { cn } from "@/lib/cn";

interface ProgressBarProps {
  value?: number;
  indeterminate?: boolean;
  className?: string;
}

export function ProgressBar({ value = 0, indeterminate, className }: ProgressBarProps) {
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-white/5", className)}>
      <div
        className={cn(
          "h-full rounded-full bg-primary shadow-[0_0_8px_rgba(20,241,149,0.5)] transition-all duration-500 ease-out",
          indeterminate && "animate-progress-indeterminate w-1/3"
        )}
        style={indeterminate ? undefined : { width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

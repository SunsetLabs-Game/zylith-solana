import { cn } from "@/lib/cn";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
} as const;

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <svg
      className={cn("animate-spin text-primary", sizeMap[size], className)}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-10"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M22 12a10 10 0 01-10 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="opacity-80"
      />
    </svg>
  );
}

import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "primary" | "accent" | "error" | "success";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-secondary/40 text-muted-foreground border-white/5",
  primary: "bg-primary/10 text-primary border-primary/30",
  accent: "bg-accent/10 text-accent border-accent/30",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  success: "bg-primary/20 text-primary border-primary/40",
};

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

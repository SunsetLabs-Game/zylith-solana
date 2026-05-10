import { type InputHTMLAttributes, type ReactNode, forwardRef } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, suffix, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[10px] font-heading tracking-[0.2em] uppercase text-muted-foreground ml-1"
          >
            {label}
          </label>
        )}
        <div className="relative group">
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "h-14 w-full rounded-2xl border bg-white/5 px-5 text-base text-foreground font-light placeholder:text-muted-foreground/30 transition-all duration-300",
              "focus:outline-none focus:bg-white/10",
              error
                ? "border-destructive/50 focus:border-destructive"
                : "border-white/10 focus:border-primary/50 focus:shadow-[0_0_15px_rgba(20,241,149,0.1)]",
              suffix && "pr-20",
              className
            )}
            {...props}
          />
          {suffix && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-5 text-muted-foreground">
              {suffix}
            </div>
          )}
        </div>
        {error && (
          <p className="text-[10px] font-heading tracking-widest uppercase text-destructive ml-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

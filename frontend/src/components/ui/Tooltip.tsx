import { type ReactNode, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/cn";

interface TooltipProps {
  content: string;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), 200);
  };

  const hide = () => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <div
          className={cn(
            "absolute bottom-full left-1/2 z-[200] mb-3 -translate-x-1/2 rounded-xl border border-white/10 bg-card/80 px-4 py-2 text-[10px] font-heading tracking-widest uppercase text-foreground whitespace-nowrap shadow-2xl backdrop-blur-xl",
            "animate-in fade-in zoom-in-95 duration-200",
            className
          )}
        >
          <div className="relative z-10">{content}</div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-card/80" />
        </div>
      )}
    </div>
  );
}

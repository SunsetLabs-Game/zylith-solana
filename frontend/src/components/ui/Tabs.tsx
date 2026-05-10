import { cn } from "@/lib/cn";
import { motion } from "motion/react";

interface TabItem {
  value: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div className={cn("relative flex gap-2 p-1.5 bg-secondary/40 backdrop-blur-3xl rounded-[20px] border border-white/5", className)}>
      {items.map((item) => {
        const isActive = value === item.value;
        return (
          <button
            key={item.value}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative px-8 py-3.5 text-[10px] font-heading tracking-[0.2em] uppercase transition-all duration-300 z-10 rounded-2xl",
              isActive ? "text-background" : "text-muted-foreground hover:text-foreground"
            )}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {isActive && (
              <motion.span
                layoutId="active-tab-bg"
                className="absolute inset-0 z-[-1] bg-primary shadow-[0_0_15px_rgba(20,241,149,0.2)] rounded-2xl"
                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
              />
            )}
            <span className="pt-0.5">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

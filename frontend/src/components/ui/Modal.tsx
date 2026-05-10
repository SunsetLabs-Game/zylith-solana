import { type ReactNode, useEffect, useCallback } from "react";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-xl animate-in fade-in duration-300"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={cn(
          "relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-card/60 p-8 shadow-2xl shadow-black/60 backdrop-blur-2xl",
          "animate-in fade-in zoom-in-95 duration-300",
          className
        )}
      >
        {title && (
          <div className="mb-8 flex items-center justify-between border-b border-white/5 pb-6">
            <h2 className="text-xl font-heading tracking-tight text-foreground uppercase pt-1">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground transition-all hover:bg-white/5 hover:text-foreground active:scale-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="relative">
          {children}
        </div>
      </div>
    </div>
  );
}

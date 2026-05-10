import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { X, Info, CheckCircle2, AlertCircle } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string | ReactNode;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string | ReactNode, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const variantStyles: Record<ToastVariant, string> = {
  success: "border-primary/20 bg-primary/5",
  error: "border-destructive/20 bg-destructive/5",
  info: "border-white/10 bg-white/5",
};

const IconMap = {
  success: <CheckCircle2 className="w-5 h-5 text-primary" />,
  error: <AlertCircle className="w-5 h-5 text-destructive" />,
  info: <Info className="w-5 h-5 text-muted-foreground" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string | ReactNode, variant: ToastVariant = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-24 right-6 z-[100] flex flex-col gap-3 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-4 rounded-2xl border p-4 shadow-2xl backdrop-blur-2xl transition-all duration-300",
              "animate-in slide-in-from-right fade-in duration-300",
              variantStyles[t.variant]
            )}
          >
            <div className="mt-0.5 shrink-0">
              {IconMap[t.variant]}
            </div>
            <div className="flex-1 text-sm font-light text-foreground/90 leading-relaxed pt-0.5">
              {t.message}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-1 rounded-full text-muted-foreground transition-all hover:bg-white/5 hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

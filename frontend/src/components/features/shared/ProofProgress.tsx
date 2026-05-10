import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { Zap, Radio, CheckCircle2 } from "lucide-react";

interface ProofProgressProps {
  open: boolean;
  label?: string;
}

const steps = [
  { label: "Proving", duration: 15, Icon: Zap },
  { label: "Relaying", duration: 5, Icon: Radio },
  { label: "Finalizing", duration: 10, Icon: CheckCircle2 },
];

export function ProofProgress({ open, label = "Processing Shielded Intent" }: ProofProgressProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!open) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [open]);

  if (!open) return null;

  // Calculate current step
  const currentStep = elapsed < 15 ? 0 : elapsed < 20 ? 1 : 2;

  // Heuristic progress: proof ~15s, submit ~5s, confirm ~10s
  const progress = Math.min(95, elapsed < 15 ? (elapsed / 15) * 60 : 60 + ((elapsed - 15) / 15) * 30);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-background/90 backdrop-blur-3xl animate-in fade-in duration-500" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg rounded-[32px] border border-white/10 bg-card/40 p-10 text-center shadow-2xl shadow-black/80 backdrop-blur-2xl"
      >
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
            <Spinner size="lg" className="text-primary relative z-10" />
          </div>
        </div>

        <h3 className="text-2xl font-heading tracking-tight text-foreground uppercase mb-10 pt-1">{label}</h3>

        {/* Step Indicator */}
        <div className="mb-10 flex items-center justify-between gap-4">
          {steps.map((step, i) => {
            const Icon = step.Icon;
            return (
              <div key={i} className="flex flex-col items-center gap-4 flex-1">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.5 }}
                  animate={{
                    scale: i <= currentStep ? 1 : 0.8,
                    opacity: i <= currentStep ? 1 : 0.3,
                  }}
                  className={cn(
                    "relative flex items-center justify-center w-14 h-14 rounded-2xl border-2 transition-all duration-500",
                    i < currentStep
                      ? "bg-primary/20 border-primary text-primary"
                      : i === currentStep
                      ? "bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(20,241,149,0.3)]"
                      : "bg-white/5 border-white/5 text-muted-foreground"
                  )}
                >
                  <Icon className={cn("w-6 h-6", i === currentStep && "animate-pulse")} />
                </motion.div>
                <span
                  className={cn(
                    "text-[10px] font-heading tracking-[0.2em] uppercase text-center",
                    i <= currentStep ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="space-y-4">
          <ProgressBar value={progress} className="h-1.5" />
          <div className="flex items-center justify-between text-[10px] font-heading tracking-widest uppercase">
            <span className="text-primary">{elapsed}s ELAPSED</span>
            <span className="text-muted-foreground">EST ~{Math.max(0, 30 - elapsed)}s REMAINING</span>
          </div>
        </div>

        {elapsed > 30 && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 text-xs text-solana-green font-light italic"
          >
            Zero-knowledge proof generation is heavy. Please remain on this screen.
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}

import { motion } from "motion/react";
import { Modal } from "./Modal";
import { Shield, Cpu, Lock, Sparkles } from "lucide-react";

interface ProofProgressProps {
  open: boolean;
  label: string;
}

export function ProofProgress({ open, label }: ProofProgressProps) {
  return (
    <Modal open={open} onClose={() => {}}>
      <div className="p-8 space-y-10 text-center">
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-primary/20 blur-[30px] rounded-full animate-pulse" />
          <div className="relative w-full h-full rounded-[32px] bg-black border border-primary/40 flex items-center justify-center overflow-hidden">
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }}
              className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-solana-purple/20"
            />
            <Cpu className="w-10 h-10 text-primary relative z-10" />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-heading tracking-tight text-foreground uppercase pt-1">
            {label}
          </h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-heading leading-relaxed">
            Generating Zero-Knowledge Proofs.<br />
            Isolating transaction data...
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent"
            />
          </div>
          
          <div className="flex items-center justify-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <Lock className="w-3 h-3 text-primary/40" />
              <span className="text-[8px] font-heading tracking-widest text-muted-foreground/40 uppercase">Encrypted</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-3 h-3 text-primary/40" />
              <span className="text-[8px] font-heading tracking-widest text-muted-foreground/40 uppercase">Private</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-primary/40" />
              <span className="text-[8px] font-heading tracking-widest text-muted-foreground/40 uppercase">Verified</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

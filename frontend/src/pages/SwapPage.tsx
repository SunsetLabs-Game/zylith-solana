import { PageContainer } from "@/components/layout/PageContainer";
import { SwapCard } from "@/components/features/swap/SwapCard";
import { motion } from "motion/react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
};

export function SwapPage() {
  return (
    <PageContainer size="narrow" className="relative z-10 pt-8 pb-16 h-full flex flex-col overflow-hidden">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full relative flex flex-col items-center space-y-8 flex-1 min-h-0"
        >
          <motion.div variants={itemVariants} className="text-center w-full shrink-0">
            <h1 className="text-4xl md:text-5xl font-heading tracking-tighter text-foreground uppercase mb-4">
              Swap
            </h1>
            <p className="text-sm text-muted-foreground/60 font-light max-w-lg mx-auto leading-relaxed uppercase tracking-widest">
              Execute <span className="text-foreground font-medium">Anonymous Trades</span>. 
              Sub-second Zero-Knowledge proofs.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="w-full flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <SwapCard />
          </motion.div>
        </motion.div>
    </PageContainer>
  );
}

import { PageContainer } from "@/components/layout/PageContainer";
import { AddLiquidityCard } from "@/components/features/liquidity/AddLiquidityCard";
import { BalanceDisplay } from "@/components/features/shared/BalanceDisplay";
import { motion } from "motion/react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      mass: 1
    }
  }
};

export function LiquidityPage() {
  return (
    <PageContainer size="narrow" className="relative z-10 pt-16 pb-32">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-16 w-full"
      >
        <motion.div variants={itemVariants} className="text-center space-y-8">
          <h1 className="text-6xl md:text-8xl font-heading tracking-tighter text-foreground uppercase">
            Market Making
          </h1>
          <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
            Initialize <span className="text-foreground font-medium">Shielded Positions</span>. 
            Deploy liquidity into the pool to earn cryptographic yield without revealing your trade size.
          </p>
        </motion.div>

        <div className="space-y-12">
          <motion.div variants={itemVariants}>
            <AddLiquidityCard />
          </motion.div>
          <motion.div variants={itemVariants}>
            <BalanceDisplay />
          </motion.div>
        </div>
      </motion.div>
    </PageContainer>
  );
}

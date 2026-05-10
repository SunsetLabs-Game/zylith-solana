import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Tabs } from "@/components/ui/Tabs";
import { DepositCard } from "@/components/features/shield/DepositCard";
import { WithdrawCard } from "@/components/features/shield/WithdrawCard";
import { NoteHistory } from "@/components/features/shield/NoteHistory";
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
  hidden: { opacity: 0, y: 15, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
    }
  }
};

export function ShieldPage() {
  const [activeTab, setActiveTab] = useState("deposit");

  const tabs = [
    { value: "deposit", label: "Shield" },
    { value: "withdraw", label: "Unshield" },
    { value: "history", label: "Vault" },
  ];

  return (
    <PageContainer size="narrow" className="relative z-10 pt-8 pb-16 h-full flex flex-col overflow-hidden">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8 w-full flex flex-col flex-1 min-h-0"
      >
        <motion.div variants={itemVariants} className="text-center space-y-4 shrink-0">
          <h1 className="text-4xl md:text-5xl font-heading tracking-tighter text-foreground uppercase">
            <span className="text-solana-purple filter drop-shadow-[0_0_40px_rgba(153,69,255,0.3)]">Privacy</span>
          </h1>
          <p className="text-sm text-muted-foreground/60 font-light max-w-2xl mx-auto leading-relaxed uppercase tracking-widest">
            Secure your assets with <span className="text-foreground font-medium">Zero-Knowledge</span> commitments.
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="flex justify-center shrink-0">
          <Tabs items={tabs} value={activeTab} onChange={setActiveTab} />
        </motion.div>

        <motion.div variants={itemVariants} className="w-full flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {activeTab === "deposit" && <DepositCard />}
          {activeTab === "withdraw" && <WithdrawCard />}
          {activeTab === "history" && <NoteHistory />}
        </motion.div>
      </motion.div>
    </PageContainer>
  );
}

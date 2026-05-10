import { Link } from "react-router";
import { motion } from "motion/react";
import { AsciiWave } from "@/components/ui/ascii/ascii-wave";
import { AsciiSphere } from "@/components/ui/ascii/ascii-sphere";
import { AsciiTorus } from "@/components/ui/ascii/ascii-torus";
import { AsciiDna as AsciiDNA } from "@/components/ui/ascii/ascii-dna";
import { SnakeButton } from "@/components/ui/SnakeButton";
import { ArrowRight, Zap, Cpu, Globe } from "lucide-react";
import { cn } from "@/lib/cn";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export function LandingPage() {
  return (
    <div className="relative min-h-screen bg-solana-gradient overflow-hidden selection:bg-primary selection:text-background font-sans">
      {/* Dynamic Background Mesh */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <AsciiWave className="w-full h-full opacity-50" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Nav */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto flex w-full max-w-7xl items-center justify-between px-8 py-12"
        >
          <Link to="/" className="group">
            <span className="text-3xl font-heading tracking-tight text-foreground uppercase pt-1 group-hover:text-primary transition-colors">
              Zylith
            </span>
          </Link>
          <Link
            to="/app"
            className="h-12 px-8 rounded-2xl bg-white/5 border border-white/10 text-[11px] font-heading tracking-[0.2em] text-foreground hover:bg-primary hover:text-background hover:border-primary transition-all duration-500 flex items-center gap-3 uppercase"
          >
            Launch Terminal
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.nav>

        {/* Hero Section */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-7xl px-8 pt-20 pb-40 text-center relative flex-1 flex flex-col justify-center"
        >
          <motion.div 
            variants={itemVariants}
            className="inline-flex items-center gap-3 mb-10 px-6 py-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-xl text-[10px] uppercase tracking-[0.5em] text-primary font-heading font-bold mx-auto"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Solana Privacy Standard
          </motion.div>

          <motion.h1 
            variants={itemVariants} 
            className="text-7xl md:text-[11rem] font-heading tracking-tighter leading-[0.85] mb-12"
          >
            <span className="text-foreground">SHIELDED</span>
            <br />
            <span className="text-solana filter drop-shadow-[0_0_50px_rgba(20,241,149,0.4)]">LIQUIDITY</span>
          </motion.h1>

          <motion.p 
            variants={itemVariants} 
            className="mx-auto max-w-3xl text-2xl text-muted-foreground/90 leading-relaxed font-light"
          >
            The world's first <span className="text-foreground font-medium">Private CLMM</span>. High-performance liquidity provision for the Solana ecosystem with mathematically proven Zero-Knowledge security.
          </motion.p>

          <motion.div variants={itemVariants} className="mt-20 flex flex-wrap items-center justify-center gap-6">
            <SnakeButton to="/app" primary className="min-w-[300px] h-20 text-xl">
              Access Terminal
            </SnakeButton>

            <SnakeButton href="https://github.com/SunsetLabs-Game/solana-protocol" className="min-w-[300px] h-20 text-xl">
              View Source
            </SnakeButton>
          </motion.div>
        </motion.section>

        {/* Feature Grid */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mx-auto w-full max-w-7xl px-8 pb-48"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                title: "Dark Pool Swaps",
                desc: "Trade assets with absolute anonymity. Zylith isolates volume and participant identities using state-of-the-art ZK proofs.",
                icon: Zap,
                color: "primary",
                ascii: AsciiDNA
              },
              {
                title: "Private Yield",
                desc: "Yield farming with total position privacy. Maximize capital utilization in shielded pools without revealing strategies.",
                icon: Cpu,
                color: "solana-purple",
                ascii: AsciiTorus
              },
              {
                title: "Proof Isolation",
                desc: "Sub-second Zero-Knowledge generation. Your transaction data never leaves your environment, powered by localized proof nodes.",
                icon: Globe,
                color: "primary",
                ascii: AsciiSphere
              }
            ].map((feature, i) => (
              <div key={i} className="group relative p-12 rounded-[48px] border border-white/5 bg-white/[0.02] backdrop-blur-3xl hover:border-foreground/10 transition-all duration-700 overflow-hidden">
                <div className="absolute -top-10 -right-10 w-48 h-48 opacity-0 group-hover:opacity-40 transition-opacity duration-1000 pointer-events-none">
                  <feature.ascii className="w-full h-full" />
                </div>

                <div className={cn(
                  "w-20 h-20 rounded-[24px] flex items-center justify-center mb-10 border transition-all duration-700 shadow-inner",
                  feature.color === "primary" ? "bg-primary/5 border-primary/20 group-hover:bg-primary group-hover:text-background" : "bg-solana-purple/5 border-solana-purple/20 group-hover:bg-solana-purple group-hover:text-background"
                )}>
                  <feature.icon className="w-10 h-10" />
                </div>

                <h3 className="text-4xl font-heading text-foreground mb-6 uppercase tracking-tight">{feature.title}</h3>
                <p className="text-muted-foreground/70 leading-relaxed font-light text-xl">
                  {feature.desc}
                </p>

                <div className="mt-12 pt-10 border-t border-white/5 flex items-center justify-between opacity-30 group-hover:opacity-100 transition-opacity duration-700">
                  <span className="text-[10px] font-heading tracking-[0.4em] uppercase">Security: Active</span>
                  <div className={cn("w-2 h-2 rounded-full shadow-[0_0_10px]", feature.color === "primary" ? "bg-primary shadow-primary/50" : "bg-solana-purple shadow-solana-purple/50")} />
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="border-t border-white/5 py-24 bg-black/60 backdrop-blur-3xl">
          <div className="mx-auto max-w-7xl px-8 flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-heading tracking-[0.3em] text-muted-foreground/40 uppercase pt-1">
                Zylith
              </span>
            </div>

            <div className="flex flex-col items-center md:items-end gap-4">
              <p className="text-[11px] uppercase tracking-[0.6em] text-muted-foreground/30 font-heading">
                Cryptographically Isolated Yield &bull; 2026
              </p>
              <div className="flex gap-8">
                {['Github', 'X (Twitter)', 'Documentation'].map(link => (
                  <a key={link} href="#" className="text-[10px] font-heading tracking-widest uppercase text-muted-foreground/20 hover:text-primary transition-colors">{link}</a>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

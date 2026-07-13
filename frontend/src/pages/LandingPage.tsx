import { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { AsciiWave } from "@/components/ui/ascii/ascii-wave";
import { AsciiSphere } from "@/components/ui/ascii/ascii-sphere";
import { AsciiTorus } from "@/components/ui/ascii/ascii-torus";
import { AsciiDna as AsciiDNA } from "@/components/ui/ascii/ascii-dna";
import { SnakeButton } from "@/components/ui/SnakeButton";
import { ArrowRight, Shield, Eye, EyeOff, Lock, Zap, BarChart3, Users, ShieldCheck, Code, ChevronDown } from "lucide-react";
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

      <div className="relative z-10 flex flex-col">
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
            Launch App
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.nav>

        {/* ─── Hero Section ─── */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-7xl px-8 pt-16 pb-32 text-center relative flex-1 flex flex-col justify-center"
        >
          <motion.div 
            variants={itemVariants}
            className="inline-flex items-center gap-3 mb-10 px-6 py-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-xl text-[10px] uppercase tracking-[0.5em] text-primary font-heading font-bold mx-auto"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Live on Solana Devnet
          </motion.div>

          <motion.h1 
            variants={itemVariants} 
            className="text-6xl md:text-[10rem] font-heading tracking-tighter leading-[0.85] mb-12"
          >
            <span className="text-foreground">TRADE</span>
            <br />
            <span className="text-solana filter drop-shadow-[0_0_50px_rgba(20,241,149,0.4)]">PRIVATELY</span>
          </motion.h1>

          <motion.p 
            variants={itemVariants} 
            className="mx-auto max-w-2xl text-xl md:text-2xl text-muted-foreground leading-relaxed"
          >
            Swap tokens, provide liquidity, and earn yield on Solana — 
            without exposing your wallet, balances, or trading strategy to anyone.
          </motion.p>

          <motion.div variants={itemVariants} className="mt-16 flex flex-wrap items-center justify-center gap-6">
            <SnakeButton to="/app" primary className="min-w-[260px] h-16 text-lg">
              Start Trading
            </SnakeButton>

            <SnakeButton href="https://github.com/SunsetLabs-Game/zylith-solana" className="min-w-[260px] h-16 text-lg">
              View on GitHub
            </SnakeButton>
          </motion.div>
        </motion.section>

        {/* ─── The Problem Section ─── */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mx-auto w-full max-w-6xl px-8 pb-32"
        >
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.h2 variants={itemVariants} className="text-3xl md:text-5xl font-heading uppercase tracking-tight text-foreground mb-6">
              Your DeFi activity is public
            </motion.h2>
            <motion.p variants={itemVariants} className="text-lg text-muted-foreground leading-relaxed">
              Every swap, every LP position, every balance — visible to bots, competitors, and anyone watching the blockchain. This isn't a minor inconvenience. It's a structural disadvantage.
            </motion.p>
          </div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Without Zylith */}
            <div className="p-8 md:p-10 rounded-[32px] border border-red-500/20 bg-red-500/[0.03] backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-red-400" />
                </div>
                <span className="text-sm font-heading tracking-widest uppercase text-red-400">Without Privacy</span>
              </div>
              <ul className="space-y-4">
                {[
                  "Bots front-run your trades before they settle",
                  "Competitors can see your exact LP positions and copy them",
                  "Wallet balances are visible to anyone with a block explorer",
                  "Large trades move the market before you execute",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-muted-foreground/80 text-[15px] leading-relaxed">
                    <span className="text-red-400 mt-1 shrink-0">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* With Zylith */}
            <div className="p-8 md:p-10 rounded-[32px] border border-primary/20 bg-primary/[0.03] backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <EyeOff className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-heading tracking-widest uppercase text-primary">With Zylith</span>
              </div>
              <ul className="space-y-4">
                {[
                  "Swap amounts and directions are hidden from MEV bots",
                  "LP positions and tick ranges are fully shielded",
                  "Nobody can link your wallet to your trading activity",
                  "Zero-knowledge proofs verify everything — no trust required",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-muted-foreground/80 text-[15px] leading-relaxed">
                    <span className="text-primary mt-1 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.section>

        {/* ─── Feature Grid ─── */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mx-auto w-full max-w-7xl px-8 pb-32"
        >
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.h2 variants={itemVariants} className="text-3xl md:text-5xl font-heading uppercase tracking-tight text-foreground mb-6">
              What you can do
            </motion.h2>
            <motion.p variants={itemVariants} className="text-lg text-muted-foreground leading-relaxed">
              Everything you expect from a DEX — deposits, swaps, liquidity — but with built-in privacy on every operation.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Private Swaps",
                desc: "Trade tokens without revealing how much you're buying or selling. Amounts, direction, and identity stay hidden from everyone — including MEV bots.",
                icon: Zap,
                color: "primary",
                ascii: AsciiDNA
              },
              {
                title: "Shielded Liquidity",
                desc: "Provide concentrated liquidity and earn fees without exposing your positions. Your tick ranges, sizes, and strategies remain invisible on-chain.",
                icon: BarChart3,
                color: "solana-purple",
                ascii: AsciiTorus
              },
              {
                title: "Secure Deposits",
                desc: "Move assets into the privacy pool with a single transaction. Your balance becomes a private note that only you can spend — verified by math, not trust.",
                icon: ShieldCheck,
                color: "primary",
                ascii: AsciiSphere
              }
            ].map((feature, i) => (
              <motion.div variants={itemVariants} key={i} className="group relative p-10 rounded-[40px] border border-white/5 bg-white/[0.02] backdrop-blur-3xl hover:border-foreground/10 transition-all duration-700 overflow-hidden">
                <div className="absolute -top-10 -right-10 w-48 h-48 opacity-0 group-hover:opacity-40 transition-opacity duration-1000 pointer-events-none">
                  <feature.ascii className="w-full h-full" />
                </div>

                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center mb-8 border transition-all duration-700",
                  feature.color === "primary" ? "bg-primary/5 border-primary/20 group-hover:bg-primary group-hover:text-background" : "bg-solana-purple/5 border-solana-purple/20 group-hover:bg-solana-purple group-hover:text-background"
                )}>
                  <feature.icon className="w-7 h-7" />
                </div>

                <h3 className="text-2xl md:text-3xl font-heading text-foreground mb-4 uppercase tracking-tight">{feature.title}</h3>
                <p className="text-muted-foreground/80 leading-relaxed text-[15px]">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ─── How It Works (Simple) ─── */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mx-auto w-full max-w-7xl px-8 pb-32"
        >
          <div className="border-t border-white/5 pt-20">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <motion.h2 variants={itemVariants} className="text-3xl md:text-5xl font-heading uppercase tracking-tight text-foreground mb-6">
                How it works
              </motion.h2>
              <motion.p variants={itemVariants} className="text-lg text-muted-foreground leading-relaxed">
                Four steps from public wallet to private trading — all in under 5 seconds.
              </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  step: "01",
                  title: "Connect",
                  desc: "Link your Solana wallet (Phantom, Backpack, or any supported wallet)."
                },
                {
                  step: "02",
                  title: "Shield",
                  desc: "Deposit tokens into a privacy pool. Your balance becomes a private encrypted note."
                },
                {
                  step: "03",
                  title: "Trade",
                  desc: "Swap, provide liquidity, or earn yield. A zero-knowledge proof verifies every action — no one sees your data."
                },
                {
                  step: "04",
                  title: "Withdraw",
                  desc: "Unshield your tokens back to any wallet whenever you want. Full control, always."
                }
              ].map((item, i) => (
                <motion.div variants={itemVariants} key={i} className="p-8 rounded-3xl border border-white/5 bg-white/[0.01] backdrop-blur-xl relative">
                  <span className="text-xs font-heading font-bold text-primary tracking-widest uppercase block mb-5">{item.step}</span>
                  <h4 className="text-xl font-heading text-foreground mb-3 uppercase tracking-tight">{item.title}</h4>
                  <p className="text-muted-foreground/70 leading-relaxed text-sm">
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ─── Trust / Tech Section ─── */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mx-auto w-full max-w-7xl px-8 pb-32"
        >
          <div className="p-10 md:p-14 rounded-[48px] border border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent backdrop-blur-3xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <motion.h3 variants={itemVariants} className="text-2xl md:text-3xl font-heading text-foreground uppercase tracking-tight">
                Privacy powered by math, not promises
              </motion.h3>
              <motion.p variants={itemVariants} className="text-muted-foreground/80 leading-relaxed text-[15px]">
                Zylith uses zero-knowledge proofs (Groth16) to let you prove you own enough tokens to trade — without revealing how many you have, which tokens, or who you are.
              </motion.p>
              <motion.p variants={itemVariants} className="text-muted-foreground/80 leading-relaxed text-[15px]">
                Every proof is verified directly on the Solana blockchain. No intermediary can approve bad transactions. No backend has access to your secrets. The math guarantees it.
              </motion.p>
              <motion.div variants={itemVariants} className="flex flex-wrap gap-8 pt-4">
                <div>
                  <span className="text-2xl md:text-3xl font-heading font-bold text-foreground block">~2s</span>
                  <span className="text-[10px] font-heading tracking-widest text-muted-foreground uppercase">Proof time</span>
                </div>
                <div>
                  <span className="text-2xl md:text-3xl font-heading font-bold text-foreground block">100%</span>
                  <span className="text-[10px] font-heading tracking-widest text-muted-foreground uppercase">On-chain verified</span>
                </div>
                <div>
                  <span className="text-2xl md:text-3xl font-heading font-bold text-foreground block">0</span>
                  <span className="text-[10px] font-heading tracking-widest text-muted-foreground uppercase">Trusted third parties</span>
                </div>
              </motion.div>
            </div>
            <motion.div variants={itemVariants} className="border border-white/5 bg-black/40 rounded-3xl p-8 space-y-3 font-mono text-xs text-muted-foreground/80 overflow-x-auto">
              <p className="text-primary font-bold">// What happens during a private swap</p>
              <p className="text-muted-foreground/50">// 1. Your browser encrypts the trade details</p>
              <p>proof = generateZKProof(secret, amount, token)</p>
              <p className="text-muted-foreground/50">// 2. Proof sent to Solana — no private data included</p>
              <p>tx = submitProof(proof, nullifier, commitment)</p>
              <p className="text-muted-foreground/50">// 3. On-chain program verifies the math</p>
              <p>solana.verify(proof) <span className="text-primary">→ ✓ valid</span></p>
              <p className="text-muted-foreground/50">// 4. Swap executes, new private note created</p>
              <p>outputNote = <span className="text-primary">encrypted</span>(newBalance, newSecret)</p>
              <hr className="border-white/5 my-2" />
              <p className="text-muted-foreground/40 text-[10px]">Observer sees: proof ✓ — knows nothing about amounts, tokens, or identity</p>
            </motion.div>
          </div>
        </motion.section>

        {/* ─── Built With / Open Source ─── */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mx-auto w-full max-w-6xl px-8 pb-32"
        >
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.h2 variants={itemVariants} className="text-3xl md:text-5xl font-heading uppercase tracking-tight text-foreground mb-6">
              Built in the open
            </motion.h2>
            <motion.p variants={itemVariants} className="text-lg text-muted-foreground leading-relaxed">
              Zylith is fully open source. Every contract, circuit, and line of SDK code is publicly auditable.
            </motion.p>
          </div>

          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Solana Programs", detail: "Anchor / Rust", icon: Code },
              { label: "ZK Circuits", detail: "Circom / Groth16", icon: Lock },
              { label: "SDK", detail: "TypeScript / ESM", icon: Shield },
              { label: "Frontend", detail: "React / Vite", icon: Users },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] text-center backdrop-blur-xl">
                <item.icon className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm font-heading text-foreground uppercase tracking-wide">{item.label}</p>
                <p className="text-xs text-muted-foreground/50 mt-1">{item.detail}</p>
              </div>
            ))}
          </motion.div>
        </motion.section>

        {/* ─── FAQ Section ─── */}
        <FaqSection />

        {/* ─── Final CTA ─── */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mx-auto w-full max-w-4xl px-8 pb-32 text-center"
        >
          <motion.h2 variants={itemVariants} className="text-3xl md:text-5xl font-heading uppercase tracking-tight text-foreground mb-6">
            Ready to trade privately?
          </motion.h2>
          <motion.p variants={itemVariants} className="text-lg text-muted-foreground leading-relaxed mb-12 max-w-2xl mx-auto">
            Connect your wallet, shield your assets, and experience DeFi the way it should be — private by default.
          </motion.p>
          <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-6">
            <SnakeButton to="/app" primary className="min-w-[260px] h-16 text-lg">
              Launch App
            </SnakeButton>
          </motion.div>
        </motion.section>

        {/* ─── Footer ─── */}
        <footer className="border-t border-white/5 py-16 bg-black/60 backdrop-blur-3xl">
          <div className="mx-auto max-w-7xl px-8 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-heading tracking-[0.3em] text-muted-foreground/40 uppercase pt-1">
                Zylith
              </span>
            </div>

            <div className="flex flex-col items-center md:items-end gap-4">
              <p className="text-[11px] uppercase tracking-[0.4em] text-muted-foreground/30 font-heading">
                Private DeFi on Solana &bull; 2026
              </p>
              <div className="flex gap-8">
                <a href="https://github.com/SunsetLabs-Game/zylith-solana" target="_blank" rel="noopener noreferrer" className="text-[10px] font-heading tracking-widest uppercase text-muted-foreground/30 hover:text-primary transition-colors">GitHub</a>
                <a href="https://x.com/ZylithProtocol" target="_blank" rel="noopener noreferrer" className="text-[10px] font-heading tracking-widest uppercase text-muted-foreground/30 hover:text-primary transition-colors">X (Twitter)</a>
                <Link to="/app" className="text-[10px] font-heading tracking-widest uppercase text-muted-foreground/30 hover:text-primary transition-colors">App</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ─── FAQ Accordion ─── */

const FAQ_ITEMS = [
  {
    q: "What is a CLMM?",
    a: "CLMM stands for Concentrated Liquidity Market Maker. It's the technology behind modern decentralized exchanges like Uniswap v3. Instead of spreading your money evenly across all prices, you choose a specific price range — this makes your capital work harder and earn more fees. Zylith adds privacy on top of this, so nobody can see your positions or ranges.",
  },
  {
    q: "What are zero-knowledge proofs?",
    a: "A zero-knowledge proof is a way to prove something is true without revealing the details. For example, you can prove you have enough tokens to make a trade — without showing your actual balance, which tokens you hold, or who you are. Zylith uses a specific type called Groth16, which is fast enough to verify directly on Solana.",
  },
  {
    q: "What is a shielded pool?",
    a: "A shielded pool is like a private vault on the blockchain. When you deposit tokens, they become encrypted \"notes\" that only you can access. You can swap, provide liquidity, and withdraw — all without your activity being publicly visible. Think of it as the difference between a transparent piggy bank and a safe with a combination lock.",
  },
  {
    q: "Is my money safe?",
    a: "Yes. Your tokens are held by smart contracts on Solana — not by any company or team. Every transaction is verified by mathematical proofs directly on-chain. Nobody (including us) can move your funds. You can withdraw at any time with just your wallet.",
  },
  {
    q: "What tokens does Zylith support?",
    a: "Zylith is designed for the most liquid assets on Solana: Bitcoin wrappers (wBTC, cbBTC, tBTC) and stablecoins (USDC, USDT). These are the tokens that benefit most from trading privacy — high-value trades that attract bots and front-runners on public DEXes.",
  },
  {
    q: "How is this different from a mixer?",
    a: "Mixers just shuffle money around to hide its origin. Zylith is a full decentralized exchange with an AMM, liquidity pools, and yield — it just happens to be private. You're not hiding transactions, you're trading normally with privacy built into every operation.",
  },
  {
    q: "Do I need any special wallet?",
    a: "No. Zylith works with any Solana wallet — Phantom, Backpack, Solflare, and others. Just connect your wallet like you would on any other Solana app and start trading.",
  },
  {
    q: "What does \"on-chain verified\" mean?",
    a: "It means the Solana blockchain itself checks every proof. There's no backend server that decides if a transaction is valid. The smart contract reads the mathematical proof, verifies it's correct, and only then executes the trade. No humans in the loop, no trust required.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      variants={itemVariants}
      className="border-b border-white/5 last:border-b-0"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-6 text-left group cursor-pointer"
      >
        <span className="text-lg md:text-xl font-heading text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">
          {q}
        </span>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-muted-foreground/50 shrink-0 transition-transform duration-300",
            open && "rotate-180 text-primary"
          )}
        />
      </button>
      <motion.div
        initial={false}
        animate={{
          height: open ? "auto" : 0,
          opacity: open ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden"
      >
        <p className="text-muted-foreground/80 leading-relaxed text-[15px] pb-6 pr-12">
          {a}
        </p>
      </motion.div>
    </motion.div>
  );
}

function FaqSection() {
  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      className="mx-auto w-full max-w-4xl px-8 pb-32"
    >
      <div className="text-center mb-16">
        <motion.h2 variants={itemVariants} className="text-3xl md:text-5xl font-heading uppercase tracking-tight text-foreground mb-6">
          Frequently asked questions
        </motion.h2>
        <motion.p variants={itemVariants} className="text-lg text-muted-foreground leading-relaxed">
          New to private DeFi? Here's what you need to know.
        </motion.p>
      </div>

      <motion.div
        variants={itemVariants}
        className="rounded-[32px] border border-white/5 bg-white/[0.02] backdrop-blur-xl p-8 md:p-10"
      >
        {FAQ_ITEMS.map((item, i) => (
          <FaqItem key={i} q={item.q} a={item.a} />
        ))}
      </motion.div>
    </motion.section>
  );
}

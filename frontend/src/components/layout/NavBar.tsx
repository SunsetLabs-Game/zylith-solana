import { Link, useLocation } from "react-router";
import { motion } from "motion/react";
import { LayoutGrid, Repeat, ShieldCheck, Droplets, User, Settings } from "lucide-react";
import { ConnectButton } from "@/components/features/wallet/ConnectButton";

const navItems = [
  { name: "Terminal", path: "/app", icon: LayoutGrid },
  { name: "Swap", path: "/app/swap", icon: Repeat },
  { name: "Privacy", path: "/app/shield", icon: ShieldCheck },
  { name: "Pools", path: "/app/liquidity", icon: Droplets },
  { name: "Assets", path: "/app/positions", icon: User },
  { name: "System", path: "/app/settings", icon: Settings },
];

export function NavBar() {
  const location = useLocation();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-3xl h-24">
      <div className="mx-auto max-w-7xl px-8 h-full flex items-center justify-between">
        <div className="flex items-center gap-12">
          <Link to="/" className="flex items-center group">
            <span className="text-2xl font-heading tracking-tight text-foreground uppercase pt-1 group-hover:text-primary transition-colors">
              Zylith
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[10px] font-heading tracking-[0.2em] uppercase transition-all duration-300 ${
                    isActive ? "text-solana-purple bg-solana-purple/5" : "text-muted-foreground/60 hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="pt-0.5">{item.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 bg-solana-purple/10 border-b-2 border-solana-purple"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="connect-wallet-wrapper scale-90 origin-right">
             <ConnectButton />
          </div>
        </div>
      </div>
    </nav>
  );
}

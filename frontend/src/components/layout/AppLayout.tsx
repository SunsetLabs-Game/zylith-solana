import { Outlet } from "react-router";
import { NavBar } from "./NavBar";
import { SdkInitializer } from "./SdkInitializer";
import { useWalletSync } from "@/hooks/useWalletSync";

export function AppLayout() {
  useWalletSync();

  return (
    <div className="fixed inset-0 bg-solana-gradient overflow-hidden selection:bg-primary/30 selection:text-foreground flex flex-col">
      {/* Global Grid Pattern */}
      <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none" />
      
      {/* Solana Brand Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none animate-pulse-slow" />

      <NavBar />
      <SdkInitializer />
      
      <main className="relative flex-1 mt-24 min-h-0 flex flex-col overflow-y-auto custom-scrollbar isolate">
        <Outlet />
      </main>
    </div>
  );
}

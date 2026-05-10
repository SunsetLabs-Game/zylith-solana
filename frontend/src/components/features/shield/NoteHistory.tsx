import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { motion, AnimatePresence } from "motion/react";
import { History, ExternalLink, ShieldCheck, ShieldX } from "lucide-react";
import { cn } from "@/lib/cn";

interface HistoryItem {
  txHash: string;
  type: "deposit" | "withdraw";
  token: string;
  amount?: string;
  timestamp: number;
}

const HISTORY_STORAGE_KEY = "zylith_note_history";
const MAX_HISTORY_ITEMS = 10;

export function NoteHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const depositHistory = localStorage.getItem("zylith_recent_deposits");
    const withdrawHistory = localStorage.getItem("zylith_recent_withdrawals");

    const allHistory: HistoryItem[] = [];

    if (depositHistory) {
      try {
        const deposits = JSON.parse(depositHistory);
        deposits.forEach((d: any) => {
          allHistory.push({
            txHash: d.txHash,
            type: "deposit",
            token: d.token,
            amount: d.amount,
            timestamp: d.timestamp,
          });
        });
      } catch (e) {
        console.error("Failed to parse deposit history:", e);
      }
    }

    if (withdrawHistory) {
      try {
        const withdrawals = JSON.parse(withdrawHistory);
        withdrawals.forEach((w: any) => {
          allHistory.push({
            txHash: w.txHash,
            type: "withdraw",
            token: w.token,
            amount: w.amount,
            timestamp: w.timestamp,
          });
        });
      } catch (e) {
        console.error("Failed to parse withdraw history:", e);
      }
    }

    allHistory.sort((a, b) => b.timestamp - a.timestamp);
    setHistory(allHistory.slice(0, MAX_HISTORY_ITEMS));
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(allHistory.slice(0, MAX_HISTORY_ITEMS)));
  }, []);

  if (history.length === 0) {
    return (
      <Card className="p-10 text-center border-white/5 bg-card/40 backdrop-blur-3xl rounded-[32px]">
        <p className="text-[10px] font-heading tracking-widest uppercase text-muted-foreground/40">
          No records in local metadata
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 px-2">
        <History className="w-5 h-5 text-muted-foreground/40" />
        <h3 className="text-[10px] font-heading tracking-[0.3em] uppercase text-muted-foreground/60">Protocol History</h3>
      </div>

      <div className="grid gap-3">
        <AnimatePresence mode="popLayout">
          {history.map((item, index) => (
            <motion.div
              key={`${item.txHash}-${index}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className="group flex items-center justify-between p-5 rounded-3xl border border-white/5 bg-card/40 backdrop-blur-3xl hover:bg-white/5 transition-all duration-300"
            >
              <div className="flex items-center gap-5">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center border",
                  item.type === "deposit" 
                    ? "bg-primary/10 border-primary/20 text-primary" 
                    : "bg-solana-purple/10 border-solana-purple/20 text-solana-purple"
                )}>
                  {item.type === "deposit" ? <ShieldCheck className="w-6 h-6" /> : <ShieldX className="w-6 h-6" />}
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-sm font-heading tracking-tight text-foreground uppercase pt-1">
                      {item.type === "deposit" ? "Shield" : "Unshield"} {item.token}
                    </p>
                    <Badge variant={item.type === "deposit" ? "success" : "accent"} className="text-[8px] py-0 px-2 rounded-md h-4">
                      {item.type === "deposit" ? "INBOUND" : "OUTBOUND"}
                    </Badge>
                  </div>
                  <p className="text-[10px] font-heading tracking-widest text-muted-foreground/40 uppercase">
                    {new Date(item.timestamp).toLocaleDateString()} • {new Date(item.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="p-3 rounded-xl bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/ui/AmountInput";
import { TokenSelector } from "@/components/features/shared/TokenSelector";
import { ProofProgress } from "@/components/features/shared/ProofProgress";
import { useSdkStore } from "@/stores/sdkStore";
import { TESTNET_TOKENS } from "@/config/tokens";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight, History, ExternalLink } from "lucide-react";

const STORAGE_KEY = "sunset-recent-withdrawals";

export function WithdrawCard() {
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState(TESTNET_TOKENS[0]);
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [isPending] = useState(false);

  const [recentTxs] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const handleWithdraw = async () => {
    if (!amount || !isInitialized) return;
    console.info("Shielded withdrawal not yet implemented");
  };

  return (
    <div className="space-y-4 w-full max-w-xl mx-auto flex flex-col min-h-0">
      <Card className="shrink-0 relative overflow-visible border-white/5 bg-card/40 backdrop-blur-3xl p-0">
        <div className="p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h2 className="text-xl font-heading tracking-tight text-foreground uppercase pt-1">Unshield Assets</h2>
            <div className="px-2 py-1 rounded-md bg-solana-purple/10 border border-solana-purple/20 text-[7px] font-heading text-solana-purple uppercase tracking-[0.2em]">Withdraw</div>
          </div>

          <div className="space-y-5">
            <AmountInput
              label="Amount to Unshield"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              tokenAddress={selectedToken?.address}
              onTokenClick={() => setShowTokenSelector(true)}
            />

            <Button
              variant="primary"
              size="lg"
              className="w-full h-16 rounded-2xl bg-gradient-to-r from-solana-purple via-accent to-accent border-none shadow-[0_0_30px_rgba(153,69,255,0.1)]"
              onClick={handleWithdraw}
              disabled={!amount || !isInitialized || isPending}
              loading={isPending}
            >
              {isPending ? "PROVING" : `UNSHIELD ${selectedToken?.symbol ?? ""}`}
            </Button>
          </div>
        </div>
      </Card>

      <AnimatePresence>
        {recentTxs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="flex-1 min-h-0 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-2 mb-2 shrink-0">
              <h3 className="text-[9px] font-heading tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-2">
                <History className="w-3 h-3" />
                Unshield History
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
              {recentTxs.map((tx: any) => (
                <div
                  key={tx.txHash}
                  className="flex items-center justify-between p-3 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-xl transition-all duration-300 hover:bg-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-solana-purple/10 border border-solana-purple/20 text-solana-purple flex items-center justify-center">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-heading tracking-tight text-foreground uppercase">
                        {tx.amount} {tx.symbol}
                      </p>
                      <p className="text-[8px] font-heading tracking-widest text-muted-foreground/40 uppercase">
                        {new Date(tx.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`https://explorer.solana.com/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-white/5 text-muted-foreground hover:text-foreground transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <TokenSelector
        open={showTokenSelector}
        onClose={() => setShowTokenSelector(false)}
        onSelect={(t) => {
          setSelectedToken(t);
          setShowTokenSelector(false);
        }}
      />

      <ProofProgress open={isPending} label="Unshielding Assets" />
    </div>
  );
}

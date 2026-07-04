import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/ui/AmountInput";
import { TokenSelector } from "@/components/features/shared/TokenSelector";
import { ProofProgress } from "@/components/features/shared/ProofProgress";
import { useSdkStore } from "@/stores/sdkStore";
import { useWithdraw } from "@/hooks/useWithdraw";
import { TESTNET_TOKENS } from "@/config/tokens";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight, History, ExternalLink, ShieldAlert, AlertTriangle } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { transactionExplorerUrl, formatTokenAmount } from "@/lib/format";
import type { Note } from "@zylith/sdk";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "zylith_recent_withdrawals";

export function WithdrawCard() {
  const { connected: isConnected } = useWallet();
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const unspentNotes = useSdkStore((s) => s.unspentNotes);
  const cooldownSeconds = useSdkStore((s) => s.cooldownSeconds);
  const [selectedToken, setSelectedToken] = useState(TESTNET_TOKENS[0]);
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const withdraw = useWithdraw();

  // Filter notes for the selected token
  const tokenNotes = useMemo(() => {
    return unspentNotes.filter(
      (n) => n.token.toLowerCase() === selectedToken.address.toLowerCase()
    );
  }, [unspentNotes, selectedToken]);

  // Set amount automatically when a note is selected
  const amount = useMemo(() => {
    if (!selectedNote) return "";
    return formatTokenAmount(BigInt(selectedNote.amount), selectedToken.decimals);
  }, [selectedNote, selectedToken]);

  const [recentTxs, setRecentTxs] = useState<any[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // If selectedToken changes, clear selectedNote
  useEffect(() => {
    setSelectedNote(null);
  }, [selectedToken]);

  const handleWithdraw = async () => {
    if (!selectedNote || !isInitialized) return;
    try {
      const result = await withdraw.mutateAsync({
        noteCommitment: selectedNote.commitment,
      });

      const newTx = {
        txHash: result.txHash,
        amount,
        symbol: selectedToken.symbol,
        token: selectedToken.symbol, // for NoteHistory compatibility
        timestamp: Date.now(),
      };
      const updated = [newTx, ...recentTxs].slice(0, 5);
      setRecentTxs(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSelectedNote(null);
    } catch (e) {
      console.error("Withdrawal failed", e);
    }
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
              placeholder="Select a note below"
              value={amount}
              readOnly
              tokenAddress={selectedToken?.address}
              onTokenClick={() => setShowTokenSelector(true)}
            />

            {/* Note Selector */}
            {isInitialized && (
              <div className="space-y-2">
                <span className="text-[10px] font-heading tracking-widest text-muted-foreground/60 uppercase">
                  Available Shielded Notes ({tokenNotes.length})
                </span>
                {tokenNotes.length === 0 ? (
                  <div className="p-4 rounded-2xl border border-white/5 bg-white/5 text-center">
                    <p className="text-xs text-muted-foreground">
                      No shielded notes found for {selectedToken.symbol}.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                    {tokenNotes.map((note) => {
                      const isSelected = selectedNote?.commitment === note.commitment;
                      return (
                        <button
                          key={note.commitment}
                          onClick={() => setSelectedNote(isSelected ? null : note)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                            isSelected
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-white/5 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-mono">
                              Index: {note.leafIndex ?? "Pending"}
                            </span>
                            <span className="text-[9px] text-muted-foreground/60 truncate max-w-xs font-mono">
                              {note.commitment.slice(0, 16)}...
                            </span>
                          </div>
                          <span className="text-xs font-heading">
                            {formatTokenAmount(BigInt(note.amount), selectedToken.decimals)} {selectedToken.symbol}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {!isConnected && (
              <div className="p-3 rounded-xl bg-solana-purple/5 border border-solana-purple/20 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-solana-purple shrink-0" />
                <p className="text-[9px] text-solana-purple font-light leading-tight uppercase tracking-tight">
                  Connect wallet to begin.
                </p>
              </div>
            )}

            <AnimatePresence>
              {withdraw.error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-start gap-3"
                >
                  <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
                  <p className="text-xs text-destructive font-light leading-relaxed">{withdraw.error.message}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              variant="primary"
              size="lg"
              className="w-full h-16 rounded-2xl bg-gradient-to-r from-solana-purple via-accent to-accent border-none shadow-[0_0_30px_rgba(153,69,255,0.1)]"
              onClick={handleWithdraw}
              disabled={!selectedNote || !isInitialized || !isConnected || withdraw.isPending || cooldownSeconds > 0}
              loading={withdraw.isPending}
            >
              {withdraw.isPending 
                ? "PROVING" 
                : cooldownSeconds > 0 
                  ? `SYNCING WITH ASP (${cooldownSeconds}s)` 
                  : `UNSHIELD ${selectedToken?.symbol ?? ""}`}
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
              <button 
                onClick={() => { setRecentTxs([]); localStorage.removeItem(STORAGE_KEY); }}
                className="text-[9px] font-heading tracking-widest uppercase text-muted-foreground/40 hover:text-destructive transition-colors"
              >
                Clear
              </button>
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
                    href={transactionExplorerUrl(tx.txHash)}
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

      <ProofProgress open={withdraw.isPending} label="Unshielding Assets" />
    </div>
  );
}

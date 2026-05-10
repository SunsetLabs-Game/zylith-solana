import { TESTNET_TOKENS, type Token } from "@/config/tokens";
import { Modal } from "@/components/ui/Modal";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { Search } from "lucide-react";

interface TokenSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
  excludeAddress?: string;
}

export function TokenSelector({ open, onClose, onSelect, excludeAddress }: TokenSelectorProps) {
  const tokens = TESTNET_TOKENS.filter((t) => t.address !== excludeAddress);

  return (
    <Modal open={open} onClose={onClose} title="Select Asset">
      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
          <input 
            type="text" 
            placeholder="Search name or address" 
            className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white/5 border border-white/5 text-sm font-heading tracking-widest uppercase focus:outline-none focus:border-primary/40 transition-all"
          />
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-heading tracking-[0.2em] uppercase text-muted-foreground/40 ml-1 mb-3">Verified Tokens</p>
          {tokens.map((token) => (
            <button
              key={token.address}
              onClick={() => {
                onSelect(token);
                onClose();
              }}
              className="flex w-full items-center justify-between group rounded-2xl p-4 text-left transition-all duration-300 border border-transparent hover:border-white/10 hover:bg-white/5 active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <TokenIcon address={token.address} size="md" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-solana border-2 border-background" />
                </div>
                <div>
                  <p className="text-sm font-heading tracking-tight text-foreground uppercase pt-1">{token.symbol}</p>
                  <p className="text-[10px] font-heading tracking-widest text-muted-foreground/40 uppercase">{token.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono text-muted-foreground/20 group-hover:text-primary transition-colors">
                  {token.address.slice(0, 4)}...{token.address.slice(-4)}
                </p>
              </div>
            </button>
          ))}
          
          {tokens.length === 0 && (
            <div className="py-12 text-center border border-dashed border-white/10 rounded-3xl">
              <p className="text-[10px] font-heading tracking-widest uppercase text-muted-foreground/20">No matching assets</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

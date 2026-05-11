import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useSdkStore } from "@/stores/sdkStore";

interface UnlockModalProps {
  open: boolean;
  onSubmit: (password: string) => void;
  loading?: boolean;
  error?: string | null;
}

export function UnlockModal({ open, onSubmit, loading, error }: UnlockModalProps) {
  const [password, setPassword] = useState("");
  const resetVault = useSdkStore((state) => state.resetVault);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length > 0 && !loading) {
      onSubmit(password);
    }
  };

  return (
    <Modal open={open} onClose={() => {}} title="Unlock Vault">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-text-caption leading-relaxed">
          Enter your vault password to decrypt your shielded notes.
        </p>

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error ?? undefined}
          autoFocus
        />

        <div className="space-y-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={password.length === 0 || loading}
            loading={loading}
          >
            Unlock
          </Button>

          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  "This will permanently delete all local notes and settings. This action cannot be undone. Are you sure?"
                )
              ) {
                resetVault();
              }
            }}
            className="w-full text-xs text-red-500/70 hover:text-red-500 transition-colors py-1"
          >
            Forgotten password? Reset Vault
          </button>
        </div>
      </form>
    </Modal>
  );
}

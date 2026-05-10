import { useRef, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useSdkStore } from "@/stores/sdkStore";
import { useToast } from "@/components/ui/Toast";
import { motion } from "motion/react";
import { Download, Upload, Lock, AlertCircle } from "lucide-react";

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
  hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      mass: 1
    }
  }
};

export function SettingsPage() {
  const client = useSdkStore((s) => s.client);
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const lock = useSdkStore((s) => s.lock);
  const resetVault = useSdkStore((s) => s.resetVault);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleExport = async () => {
    if (!client) return;
    try {
      const noteManager = client.getNoteManager();
      const data = await noteManager.exportEncrypted();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zylith-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      localStorage.setItem("zylith_last_backup", Date.now().toString());
      toast("Backup exported successfully.", "success");
    } catch (err) {
      toast(`Export failed: ${(err as Error).message}`, "error");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      JSON.parse(text);
      localStorage.setItem("zylith_notes", text);
      toast("Backup imported. Please unlock your vault to verify.", "success");
      lock();
    } catch (err) {
      toast(`Import failed: ${(err as Error).message}`, "error");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <PageContainer size="narrow" className="relative z-10 pt-16 pb-32">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-16"
      >
        <motion.div variants={itemVariants} className="max-w-2xl">
          <h1 className="text-6xl md:text-8xl font-heading tracking-tighter text-foreground uppercase mb-8">
            Security
          </h1>
          <p className="text-xl text-muted-foreground font-light leading-relaxed">
            Manage your <span className="text-foreground font-medium">Vault Integrity</span>. Export backups, 
            session encryption, and protocol state control.
          </p>
        </motion.div>

        <div className="grid gap-10">
          {/* Export & Import Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div variants={itemVariants}>
              <Card className="h-full border-white/5 bg-card/40 backdrop-blur-3xl p-8 sm:p-10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/5">
                    <Download className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-heading tracking-tight text-foreground uppercase pt-1">Backup</h2>
                  </div>
                  <p className="text-xs text-muted-foreground font-light leading-relaxed mb-10">
                    Export your encrypted note vault. This file contains all your shielded assets and requires your original password to unlock.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleExport}
                  disabled={!isInitialized}
                  className="w-full"
                >
                  EXPORT VAULT
                </Button>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="h-full border-white/5 bg-card/40 backdrop-blur-3xl p-8 sm:p-10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/5">
                    <Upload className="w-5 h-5 text-solana-purple" />
                    <h2 className="text-xl font-heading tracking-tight text-foreground uppercase pt-1">Restore</h2>
                  </div>
                  <p className="text-xs text-muted-foreground font-light leading-relaxed mb-10">
                    Import an existing encrypted vault file. This will overwrite any existing local state with the backup's data.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  IMPORT FILE
                </Button>
              </Card>
            </motion.div>
          </div>

          {/* Session Security */}
          <motion.div variants={itemVariants}>
            <Card className="border-white/5 bg-card/40 backdrop-blur-3xl p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/5">
                <Lock className="w-5 h-5 text-solana-purple" />
                <h2 className="text-xl font-heading tracking-tight text-foreground uppercase pt-1">Session</h2>
              </div>
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <p className="text-xs text-muted-foreground font-light leading-relaxed max-w-md">
                  Encrypt and lock your session. You will be required to enter your password to regain access to your shielded notes.
                </p>
                <Button
                  variant="destructive"
                  size="md"
                  onClick={lock}
                  disabled={!isInitialized}
                  className="min-w-[200px]"
                >
                  LOCK SESSION
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Danger Zone */}
          <motion.div variants={itemVariants}>
            <Card className="border-destructive/20 bg-destructive/5 p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b border-destructive/10">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <h2 className="text-xl font-heading tracking-tight text-destructive uppercase pt-1">Danger Zone</h2>
              </div>
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <p className="text-xs text-destructive/60 font-light leading-relaxed max-w-md">
                  Irreversibly delete all encrypted data from this device. Ensure you have a backup if you wish to retain access to your funds.
                </p>
                <Button
                  variant="destructive"
                  size="md"
                  onClick={() => setShowResetConfirm(true)}
                  className="min-w-[200px]"
                >
                  PURGE STORAGE
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>

        <Modal
          open={showResetConfirm}
          onClose={() => setShowResetConfirm(false)}
          title="Confirm Purge"
        >
          <div className="space-y-8">
            <p className="text-sm text-muted-foreground font-light leading-relaxed">
              This will permanently erase your <span className="text-foreground font-medium">Local Vault</span>. This operation cannot be undone.
            </p>
            <div className="p-6 rounded-3xl bg-destructive/5 border border-destructive/10 space-y-4">
              <p className="text-[10px] font-heading tracking-widest text-destructive uppercase">Pending Deletions:</p>
              <ul className="space-y-3">
                {['Encrypted Note Commitments', 'Shielded Position Metadata', 'Vault Auth Parameters'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-xs text-destructive/60 font-light">
                    <div className="w-1 h-1 rounded-full bg-destructive" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-4">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowResetConfirm(false)}
              >
                CANCEL
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={resetVault}
              >
                CONFIRM PURGE
              </Button>
            </div>
          </div>
        </Modal>
      </motion.div>
    </PageContainer>
  );
}

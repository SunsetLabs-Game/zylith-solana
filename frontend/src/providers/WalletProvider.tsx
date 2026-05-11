import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
  useWallet,
  useConnection,
} from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import {
  WalletModalProvider,
  useWalletModal,
} from "@solana/wallet-adapter-react-ui";
import { Transaction, type TransactionInstruction } from "@solana/web3.js";

import "@solana/wallet-adapter-react-ui/styles.css";
import { env } from "@/config/env";

interface WalletContextValue {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  walletName: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  execute: (instructions: TransactionInstruction[]) => Promise<string>;
}

const ZylithWalletContext = createContext<WalletContextValue | null>(null);

export function useWalletSession() {
  const ctx = useContext(ZylithWalletContext);
  if (!ctx) {
    throw new Error("useWalletSession must be used within WalletProvider");
  }
  return ctx;
}

function WalletInternalProvider({ children }: { children: ReactNode }) {
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const { publicKey, wallet, connected, connecting, connect, disconnect } = useWallet();

  const value: WalletContextValue = {
    address: publicKey?.toBase58() ?? null,
    isConnected: connected,
    isConnecting: connecting,
    walletName: wallet?.adapter.name ?? null,
    connect: async () => {
      try {
        if (!wallet) {
          setVisible(true);
        } else {
          await connect();
        }
      } catch (e) {
        console.error("Wallet connection failed", e);
      }
    },
    disconnect: async () => {
      await disconnect();
    },
    execute: async (instructions: TransactionInstruction[]) => {
      if (!publicKey) throw new Error("Wallet not connected");
      
      const transaction = new Transaction().add(...instructions);
      transaction.feePayer = publicKey;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      console.log("Simulating transaction with instructions:", instructions.map(ix => ({
        programId: ix.programId.toBase58(),
        data: ix.data.toString("utf-8")
      })));

      try {
        const simulation = await connection.simulateTransaction(transaction);
        if (simulation.value.err) {
          console.error("Simulation failed:", simulation.value.err, simulation.value.logs);
          throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
        }
        console.log("Simulation successful:", simulation.value.logs);
      } catch (simError) {
        console.warn("Simulation check failed (non-fatal):", simError);
      }

      const signerAdapter = wallet?.adapter as { signTransaction?: (tx: Transaction) => Promise<Transaction> } | undefined;
      if (!signerAdapter?.signTransaction) {
        throw new Error("Wallet does not support manual signing");
      }

      console.log("Requesting manual signature...");
      const signed = await signerAdapter.signTransaction(transaction);
      console.log("Transaction signed, sending...");
      
      const signature = await connection.sendRawTransaction(signed.serialize());
      console.log("Transaction sent, signature:", signature);

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, "processed");
      return signature;
    },
  };

  return (
    <ZylithWalletContext.Provider value={value}>
      {children}
    </ZylithWalletContext.Provider>
  );
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const endpoint = env.rpcUrl;

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletInternalProvider>
            {children}
          </WalletInternalProvider>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

function readEnv(key: string, fallback = ""): string {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

export type SolanaCluster = "mainnet-beta" | "testnet" | "devnet" | "localhost";

const cluster = readEnv("VITE_SOLANA_CLUSTER", "devnet") as SolanaCluster;

const aspUrl = readEnv("VITE_ASP_URL");

export const env = {
  rpcUrl: readEnv("VITE_RPC_URL", "https://api.devnet.solana.com"),
  aspUrl,
  aspEnabled: aspUrl.length > 0,
  cluster,
  chainName: readEnv("VITE_CHAIN_NAME", "Solana Devnet"),
  explorerUrl: readEnv("VITE_EXPLORER_URL", "https://explorer.solana.com"),
  nativeCurrency: {
    name: readEnv("VITE_NATIVE_CURRENCY_NAME", "Solana"),
    symbol: readEnv("VITE_NATIVE_CURRENCY_SYMBOL", "SOL"),
    decimals: Number(readEnv("VITE_NATIVE_CURRENCY_DECIMALS", "9")),
  },
  relayerAddress: readEnv("VITE_RELAYER_ADDRESS"),
  programs: {
    pool: readEnv("VITE_POOL_PROGRAM_ID", "SunPooL111111111111111111111111111111111"),
    coordinator: readEnv("VITE_COORDINATOR_PROGRAM_ID", "SunCoor111111111111111111111111111111111"),
  },
  contracts: {
    // Legacy support for older code until refactored
    pool: readEnv("VITE_POOL_PROGRAM_ID", "SunPooL111111111111111111111111111111111"),
    coordinator: readEnv("VITE_COORDINATOR_PROGRAM_ID", "SunCoor111111111111111111111111111111111"),
  },
} as const;


import { PublicKey } from "@solana/web3.js";

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
}

function isValidPublicKey(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

function readToken(slot: number, defaults: Pick<Token, "symbol" | "name" | "decimals" | "address">): Token | null {
  const prefix = `VITE_TOKEN_${slot}`;
  const envAddress = import.meta.env[`${prefix}_ADDRESS`];
  const address = (typeof envAddress === "string" && isValidPublicKey(envAddress)) ? envAddress : defaults.address;

  if (!isValidPublicKey(address)) {
    return null;
  }

  const symbol =
    (import.meta.env[`${prefix}_SYMBOL`] as string | undefined)?.trim() ||
    defaults.symbol;
  const name =
    (import.meta.env[`${prefix}_NAME`] as string | undefined)?.trim() ||
    defaults.name;
  const decimalsValue = import.meta.env[`${prefix}_DECIMALS`];
  const decimals =
    typeof decimalsValue === "string" && decimalsValue.trim().length > 0
      ? Number(decimalsValue)
      : defaults.decimals;

  return {
    address,
    symbol,
    name,
    decimals,
  };
}

const configuredTokens = [
  readToken(0, { address: "So11111111111111111111111111111111111111112", symbol: "SOL", name: "Solana", decimals: 9 }),
  readToken(1, { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", symbol: "USDC", name: "USD Coin", decimals: 6 }),
].filter((token): token is Token => token !== null);

export const CONFIGURED_TOKENS = configuredTokens;
export const TESTNET_TOKENS = configuredTokens;

/** Canonical token pair from env — token0 is always CONFIGURED_TOKENS[0]. */
export const TOKEN_0: Token | undefined = configuredTokens[0];
export const TOKEN_1: Token | undefined = configuredTokens[1];

export function getConfiguredTokenPair(): [Token, Token] | null {
  if (CONFIGURED_TOKENS.length < 2) {
    return null;
  }

  return [CONFIGURED_TOKENS[0], CONFIGURED_TOKENS[1]];
}

export function getToken(address: string): Token | undefined {
  return CONFIGURED_TOKENS.find(
    (t) => t.address === address
  );
}

export function getTokenSymbol(address: string): string {
  return getToken(address)?.symbol ?? `${address.slice(0, 4)}...${address.slice(-4)}`;
}



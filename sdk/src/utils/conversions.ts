import { PublicKey } from "@solana/web3.js";

/** Convert hex string (0x...) to decimal string */
export function hexToDecimal(hex: string): string {
  const stripped = hex.replace(/^0x/i, "");
  return BigInt("0x" + stripped).toString(10);
}

/** Convert decimal string to hex string (0x...) */
export function decimalToHex(decimal: string): string {
  return "0x" + BigInt(decimal).toString(16);
}

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const ALPHABET_MAP: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) ALPHABET_MAP[ALPHABET[i]] = i;

function decodeBase58(str: string): Uint8Array {
  if (str.length === 0) return new Uint8Array(0);
  const bytes = [0];
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (!(c in ALPHABET_MAP)) throw new Error("Invalid base58 character");
    for (let j = 0; j < bytes.length; j++) bytes[j] *= 58;
    bytes[0] += ALPHABET_MAP[c];
    let carry = 0;
    for (let j = 0; j < bytes.length; j++) {
      bytes[j] += carry;
      carry = bytes[j] >> 8;
      bytes[j] &= 0xff;
    }
    while (carry) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; i < str.length && str[i] === "1"; i++) bytes.push(0);
  return new Uint8Array(bytes.reverse());
}

/** Convert a Solana base58 token address to a BigInt for Poseidon hashing */
export function tokenToBigInt2(token: string | bigint): bigint {
  if (typeof token === "bigint") return token;
  
  const tokenStr = typeof token === "string" ? token.trim() : String(token).trim();
  
  if (!tokenStr.startsWith("0x") && !/^\d+$/.test(tokenStr)) {
    // Attempt base58 decode
    const bytes = decodeBase58(tokenStr);
    let value = 0n;
    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8n) + BigInt(bytes[i]);
    }
    // Truncate to 252 bits: circomlib's LessThan asserts n <= 252
    return value & ((1n << 252n) - 1n);
  }
  return BigInt(tokenStr) & ((1n << 252n) - 1n);
}

/** Split a u256 into (low_128, high_128) halves for circuit serialization. */
export function u256Split(value: bigint): { low: bigint; high: bigint } {
  const mask128 = (1n << 128n) - 1n;
  return {
    low: value & mask128,
    high: value >> 128n,
  };
}

/** Combine (low_128, high_128) into a u256 */
export function u256Combine(low: bigint, high: bigint): bigint {
  return low + (high << 128n);
}

/**
 * Generate a cryptographically random secret (32 bytes as decimal string).
 * Used for note secrets and nullifiers.
 */
export function generateRandomSecret(): string {
  const bytes = new Uint8Array(31); // 31 bytes to stay within BN254 field
  crypto.getRandomValues(bytes);
  let value = 0n;
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8n) + BigInt(bytes[i]);
  }
  return value.toString(10);
}

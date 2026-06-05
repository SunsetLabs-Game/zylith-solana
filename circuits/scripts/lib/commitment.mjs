/**
 * Commitment computation matching circuits/common/commitment.circom.
 *
 * SunsetCommitment:
 *   innerHash = Poseidon(secret, nullifier)
 *   nullifierHash = Poseidon(nullifier)
 *   commitment = Poseidon(innerHash, amount_low, amount_high, token)
 *
 * SunsetPositionCommitment:
 *   nullifierHash = Poseidon(nullifier)
 *   commitment = Poseidon(secret, nullifier, tickLower, tickUpper, liquidity)
 */
import { hash, toStr } from "./poseidon.mjs";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const ALPHABET_MAP = {};
for (let i = 0; i < ALPHABET.length; i++) ALPHABET_MAP[ALPHABET[i]] = i;

function decodeBase58(str) {
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
    while (carry) { bytes.push(carry & 0xff); carry >>= 8; }
  }
  for (let i = 0; i < str.length && str[i] === "1"; i++) bytes.push(0);
  return new Uint8Array(bytes.reverse());
}

/** Convert a Solana base58 token address to a BigInt for Poseidon hashing.
 *  Truncates to 252 bits to fit within circomlib's LessThan(252) constraint. */
export function tokenToBigInt(token) {
  if (typeof token === "bigint") return token & ((1n << 252n) - 1n);
  const tokenStr = String(token).trim();
  if (!tokenStr.startsWith("0x") && !/^\d+$/.test(tokenStr)) {
    const bytes = decodeBase58(tokenStr);
    let value = 0n;
    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8n) + BigInt(bytes[i]);
    }
    return value & ((1n << 252n) - 1n);
  }
  return BigInt(tokenStr) & ((1n << 252n) - 1n);
}

/**
 * Compute a note commitment and nullifier hash.
 * All inputs should be decimal strings or BigInts.
 * Returns { commitment, nullifierHash, innerHash } as decimal strings.
 */
export function computeCommitment(
  secret,
  nullifier,
  amount_low,
  amount_high,
  token,
) {
  const innerHash = hash([secret, nullifier]);
  const nullifierHash = hash([nullifier]);
  const tokenVal = tokenToBigInt(token);
  const commitment = hash([innerHash, amount_low, amount_high, tokenVal]);

  return {
    commitment: toStr(commitment),
    nullifierHash: toStr(nullifierHash),
    innerHash: toStr(innerHash),
  };
}

/**
 * Compute a position commitment and nullifier hash.
 * Returns { commitment, nullifierHash } as decimal strings.
 */
export function computePositionCommitment(
  secret,
  nullifier,
  tickLower,
  tickUpper,
  liquidity,
) {
  const nullifierHash = hash([nullifier]);
  const commitment = hash([secret, nullifier, tickLower, tickUpper, liquidity]);

  return {
    commitment: toStr(commitment),
    nullifierHash: toStr(nullifierHash),
  };
}

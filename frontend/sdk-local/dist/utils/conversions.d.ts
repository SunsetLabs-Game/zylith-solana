/** Convert hex string (0x...) to decimal string */
export declare function hexToDecimal(hex: string): string;
/** Convert decimal string to hex string (0x...) */
export declare function decimalToHex(decimal: string): string;
/** Convert a Solana base58 token address to a BigInt for Poseidon hashing */
export declare function tokenToBigInt2(token: string | bigint): bigint;
/** Split a u256 into (low_128, high_128) halves for circuit serialization. */
export declare function u256Split(value: bigint): {
    low: bigint;
    high: bigint;
};
/** Combine (low_128, high_128) into a u256 */
export declare function u256Combine(low: bigint, high: bigint): bigint;
/**
 * Generate a cryptographically random secret (32 bytes as decimal string).
 * Used for note secrets and nullifiers.
 */
export declare function generateRandomSecret(): string;
//# sourceMappingURL=conversions.d.ts.map
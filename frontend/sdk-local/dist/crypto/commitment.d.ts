export interface NoteCommitmentResult {
    commitment: string;
    nullifierHash: string;
    innerHash: string;
}
export interface PositionCommitmentResult {
    commitment: string;
    nullifierHash: string;
}
/**
 * Compute a note commitment and nullifier hash.
 * All inputs should be decimal strings or BigInts.
 * Returns { commitment, nullifierHash, innerHash } as decimal strings.
 */
export declare function computeCommitment(secret: string | bigint, nullifier: string | bigint, amountLow: string | bigint, amountHigh: string | bigint, token: string | bigint): NoteCommitmentResult;
/**
 * Compute a position commitment and nullifier hash.
 * Returns { commitment, nullifierHash } as decimal strings.
 *
 * IMPORTANT: Uses UNSIGNED (offset) ticks for commitment calculation,
 * matching the circuit and ASP backend behavior.
 */
export declare function computePositionCommitment(secret: string | bigint, nullifier: string | bigint, tickLower: number, tickUpper: number, liquidity: string | bigint): PositionCommitmentResult;
//# sourceMappingURL=commitment.d.ts.map
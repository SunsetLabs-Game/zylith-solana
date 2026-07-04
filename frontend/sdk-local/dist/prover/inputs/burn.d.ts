import type { MerkleProof } from "../../crypto/merkle.js";
export interface BurnCircuitInputs {
    root: string;
    positionNullifierHash: string;
    newCommitment0: string;
    newCommitment1: string;
    tickLower: string;
    tickUpper: string;
    positionSecret: string;
    positionNullifier: string;
    liquidity: string;
    pathElements: string[];
    pathIndices: number[];
    newSecret0: string;
    newNullifier0: string;
    amount0_low: string;
    amount0_high: string;
    token0: string;
    newSecret1: string;
    newNullifier1: string;
    amount1_low: string;
    amount1_high: string;
    token1: string;
}
/** Build circuit inputs for a burn proof */
export declare function generateBurnInputs(params: {
    positionNote: {
        secret: string;
        nullifier: string;
        tickLower: number;
        tickUpper: number;
        liquidity: bigint;
        merkleProof: MerkleProof;
    };
    outputNote0: {
        secret: string;
        nullifier: string;
        amount: bigint;
        token: string;
    };
    outputNote1: {
        secret: string;
        nullifier: string;
        amount: bigint;
        token: string;
    };
}): BurnCircuitInputs;
//# sourceMappingURL=burn.d.ts.map
import type { MerkleProof } from "../../crypto/merkle.js";
export interface SwapCircuitInputs {
    root: string;
    nullifierHash: string;
    newCommitment: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOutMin: string;
    secret: string;
    nullifier: string;
    balance_low: string;
    balance_high: string;
    pathElements: string[];
    pathIndices: number[];
    newSecret: string;
    newNullifier: string;
    amountOut_low: string;
    amountOut_high: string;
    changeSecret: string;
    changeNullifier: string;
}
/** Build circuit inputs for a swap proof */
export declare function generateSwapInputs(params: {
    inputNote: {
        secret: string;
        nullifier: string;
        balance: bigint;
        token: string;
        merkleProof: MerkleProof;
    };
    outputNote: {
        secret: string;
        nullifier: string;
        amount: bigint;
        token: string;
    };
    changeNote: {
        secret: string;
        nullifier: string;
    };
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOutMin: string;
}): SwapCircuitInputs;
//# sourceMappingURL=swap.d.ts.map
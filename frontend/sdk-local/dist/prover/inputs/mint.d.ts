import type { MerkleProof } from "../../crypto/merkle.js";
export interface MintCircuitInputs {
    root: string;
    nullifierHash0: string;
    nullifierHash1: string;
    positionCommitment: string;
    tickLower: string;
    tickUpper: string;
    secret0: string;
    nullifier0: string;
    balance0_low: string;
    balance0_high: string;
    token0: string;
    pathElements0: string[];
    pathIndices0: number[];
    secret1: string;
    nullifier1: string;
    balance1_low: string;
    balance1_high: string;
    token1: string;
    pathElements1: string[];
    pathIndices1: number[];
    positionSecret: string;
    positionNullifier: string;
    liquidity: string;
    amount0_low: string;
    amount0_high: string;
    amount1_low: string;
    amount1_high: string;
    changeSecret0: string;
    changeNullifier0: string;
    changeSecret1: string;
    changeNullifier1: string;
}
/** Build circuit inputs for a mint proof */
export declare function generateMintInputs(params: {
    inputNote0: {
        secret: string;
        nullifier: string;
        balance: bigint;
        token: string;
        merkleProof: MerkleProof;
    };
    inputNote1: {
        secret: string;
        nullifier: string;
        balance: bigint;
        token: string;
        merkleProof: MerkleProof;
    };
    position: {
        secret: string;
        nullifier: string;
        tickLower: number;
        tickUpper: number;
        liquidity: bigint;
    };
    changeNote0: {
        secret: string;
        nullifier: string;
    };
    changeNote1: {
        secret: string;
        nullifier: string;
    };
    amount0: bigint;
    amount1: bigint;
}): MintCircuitInputs;
//# sourceMappingURL=mint.d.ts.map
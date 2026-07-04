/** Shielded mint (add liquidity) operation */
import type { AspClient } from "../asp/client.js";
import type { NoteManager } from "../storage/note-manager.js";
import type { PoolKey } from "../types/index.js";
export interface MintParams {
    poolKey: PoolKey;
    inputNote0Commitment: string;
    inputNote1Commitment: string;
    tickLower: number;
    tickUpper: number;
    liquidity: bigint;
    amount0: bigint;
    amount1: bigint;
    useAspProver?: boolean;
}
export interface MintResult {
    calldata: string[];
    finalRoot: string;
    positionCommitment: string;
    changeCommitment0: string;
    changeCommitment1: string;
    solanaProof?: Buffer;
}
export declare function mint(params: MintParams, asp: AspClient, noteManager: NoteManager): Promise<MintResult>;
//# sourceMappingURL=mint.d.ts.map
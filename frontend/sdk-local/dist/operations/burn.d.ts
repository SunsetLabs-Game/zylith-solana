/** Shielded burn (remove liquidity) operation */
import type { AspClient } from "../asp/client.js";
import type { NoteManager } from "../storage/note-manager.js";
import type { PoolKey } from "../types/index.js";
export interface BurnParams {
    poolKey: PoolKey;
    positionCommitment: string;
    amount0Out: bigint;
    token0: string;
    amount1Out: bigint;
    token1: string;
    liquidity: bigint;
    useAspProver?: boolean;
}
export interface BurnResult {
    calldata: string[];
    finalRoot: string;
    newCommitment0: string;
    newCommitment1: string;
    amount0: bigint;
    amount1: bigint;
    solanaProof?: Buffer;
}
export declare function burn(params: BurnParams, asp: AspClient, noteManager: NoteManager): Promise<BurnResult>;
//# sourceMappingURL=burn.d.ts.map
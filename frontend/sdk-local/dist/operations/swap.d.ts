/** Shielded swap operation */
import type { AspClient } from "../asp/client.js";
import type { NoteManager } from "../storage/note-manager.js";
import type { PoolKey } from "../types/index.js";
export interface SwapParams {
    poolKey: PoolKey;
    /** The commitment of the input note to spend */
    inputNoteCommitment: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: bigint;
    amountOutMin: bigint;
    expectedAmountOut: bigint;
    sqrtPriceLimit: bigint;
    useAspProver?: boolean;
}
export interface SwapResult {
    calldata: string[];
    finalRoot: string;
    newCommitment: string;
    changeCommitment: string;
    amountOut: bigint;
    amountChange: bigint;
    solanaProof?: Buffer;
}
export declare function swap(params: SwapParams, asp: AspClient, noteManager: NoteManager): Promise<SwapResult>;
//# sourceMappingURL=swap.d.ts.map
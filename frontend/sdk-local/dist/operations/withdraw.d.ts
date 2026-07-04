import type { AspClient } from "../asp/client.js";
import type { NoteManager } from "../storage/note-manager.js";
export interface WithdrawParams {
    /** The note to withdraw. Must have a leafIndex. */
    noteCommitment: string;
    /** The recipient address to receive the withdrawn tokens */
    recipient: string;
    /** If true, uses ASP for proving. If false, generates proof locally. Default false. */
    useAspProver?: boolean;
}
export interface WithdrawResult {
    calldata?: string[];
    solanaProof?: Buffer;
    nullifierHash: string;
}
export declare function withdraw(params: WithdrawParams, asp: AspClient, noteManager: NoteManager): Promise<WithdrawResult>;
//# sourceMappingURL=withdraw.d.ts.map
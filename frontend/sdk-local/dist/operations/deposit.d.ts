/** Deposit operation: shield tokens into the privacy pool */
import type { AspClient } from "../asp/client.js";
import type { NoteManager } from "../storage/note-manager.js";
export interface DepositParams {
    secret: string;
    nullifier: string;
    amount: bigint;
    token: string;
}
export interface DepositResult {
    calldata: string[];
    leafIndex: number;
    commitment: string;
    root: string;
}
export declare function deposit(params: DepositParams, asp: AspClient, noteManager: NoteManager): Promise<DepositResult>;
//# sourceMappingURL=deposit.d.ts.map
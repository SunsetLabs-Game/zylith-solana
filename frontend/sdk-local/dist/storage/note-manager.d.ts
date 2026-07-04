import type { Note, PositionNote } from "./types.js";
export declare class NoteManager {
    private password;
    private db;
    constructor(password: string);
    /** Create and store a new note. Computes commitment automatically unless provided. */
    addNote(params: {
        secret: string;
        nullifier: string;
        amount: bigint;
        token: string;
        leafIndex?: number;
        commitment?: string;
        txHash?: string;
        isYield?: boolean;
    }): Note;
    /** Create and store a new position note. */
    addPositionNote(params: {
        secret: string;
        nullifier: string;
        tickLower: number;
        tickUpper: number;
        liquidity: bigint;
        commitment?: string;
        leafIndex?: number;
        txHash?: string;
    }): PositionNote;
    /**
     * Update a note's commitment and amount after ASP confirms the actual values.
     * Used by swap to update placeholder notes saved before the ASP call.
     * Matched by nullifier (which is stable across the call).
     */
    updateNote(nullifier: string, commitment: string, amount: bigint): void;
    /** Update a note's leaf index after on-chain deposit */
    setLeafIndex(commitment: string, leafIndex: number): void;
    /** Update leaf indexes from ASP sync response */
    updateLeafIndexes(syncData: {
        commitment: string;
        leaf_index: number | null;
    }[]): void;
    /** Mark a note as spent by its nullifier hash */
    markSpent(nullifierHash: string): void;
    /** Store an explorer-visible transaction hash for a position note. */
    setPositionTxHash(commitment: string, txHash: string): void;
    /** Snapshot current in-memory state so callers can roll back optimistic changes. */
    snapshot(): string;
    /** Restore a prior snapshot created by snapshot(). */
    restore(snapshot: string): void;
    /** Get all unspent notes, optionally filtered by token */
    getUnspentNotes(token?: string): Note[];
    /** Get all unspent position notes */
    getUnspentPositions(): PositionNote[];
    /** Get total balance for a token (sum of unspent notes) */
    getBalance(token: string): bigint;
    /** Encrypt and save to localStorage (browser) */
    save(): Promise<void>;
    /** Load from localStorage, decrypt, and return a new NoteManager */
    static load(password: string): Promise<NoteManager>;
    /** Export the database as an encrypted string (for backup) */
    exportEncrypted(): Promise<string>;
    /** Import from an encrypted backup string */
    static importEncrypted(data: string, password: string): Promise<NoteManager>;
    /** Get all notes (for debugging) */
    getAllNotes(): Note[];
    /** Get all positions (for debugging) */
    getAllPositions(): PositionNote[];
}
//# sourceMappingURL=note-manager.d.ts.map
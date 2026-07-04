/**
 * Encrypted note management.
 * Stores notes (secrets, nullifiers, commitments) with AES-GCM encryption.
 * Supports localStorage (browser) and in-memory (Node.js) persistence.
 */
import { encrypt, decrypt } from "../crypto/encryption.js";
import { computeCommitment, computePositionCommitment } from "../crypto/commitment.js";
import { u256Split } from "../utils/conversions.js";
const STORAGE_KEY = "zylith_notes";
export class NoteManager {
    password;
    db;
    constructor(password) {
        this.password = password;
        this.db = { notes: [], positions: [], version: 1 };
    }
    /** Create and store a new note. Computes commitment automatically unless provided. */
    addNote(params) {
        const { low, high } = u256Split(params.amount);
        const computed = computeCommitment(params.secret, params.nullifier, low.toString(), high.toString(), params.token);
        const commitment = params.commitment ?? computed.commitment;
        const nullifierHash = computed.nullifierHash;
        const note = {
            secret: params.secret,
            nullifier: params.nullifier,
            amount: params.amount.toString(),
            token: params.token,
            leafIndex: params.leafIndex,
            commitment,
            nullifierHash,
            spent: false,
            isYield: params.isYield,
        };
        this.db.notes.push(note);
        return note;
    }
    /** Create and store a new position note. */
    addPositionNote(params) {
        // Use provided commitment if available (from ASP), otherwise compute it
        let commitment;
        let nullifierHash;
        if (params.commitment) {
            commitment = params.commitment;
            // Still need to compute nullifierHash
            const computed = computePositionCommitment(params.secret, params.nullifier, params.tickLower, params.tickUpper, params.liquidity.toString());
            nullifierHash = computed.nullifierHash;
        }
        else {
            const computed = computePositionCommitment(params.secret, params.nullifier, params.tickLower, params.tickUpper, params.liquidity.toString());
            commitment = computed.commitment;
            nullifierHash = computed.nullifierHash;
        }
        const position = {
            secret: params.secret,
            nullifier: params.nullifier,
            tickLower: params.tickLower,
            tickUpper: params.tickUpper,
            liquidity: params.liquidity.toString(),
            leafIndex: params.leafIndex,
            commitment,
            nullifierHash,
            spent: false,
            txHash: params.txHash,
        };
        this.db.positions.push(position);
        return position;
    }
    /**
     * Update a note's commitment and amount after ASP confirms the actual values.
     * Used by swap to update placeholder notes saved before the ASP call.
     * Matched by nullifier (which is stable across the call).
     */
    updateNote(nullifier, commitment, amount) {
        const note = this.db.notes.find((n) => n.nullifier === nullifier);
        if (note) {
            note.commitment = commitment;
            note.amount = amount.toString();
        }
    }
    /** Update a note's leaf index after on-chain deposit */
    setLeafIndex(commitment, leafIndex) {
        const note = this.db.notes.find((n) => n.commitment === commitment);
        if (note)
            note.leafIndex = leafIndex;
        const pos = this.db.positions.find((p) => p.commitment === commitment);
        if (pos)
            pos.leafIndex = leafIndex;
    }
    /** Update leaf indexes from ASP sync response */
    updateLeafIndexes(syncData) {
        for (const { commitment, leaf_index } of syncData) {
            if (leaf_index !== null) {
                this.setLeafIndex(commitment, leaf_index);
            }
        }
    }
    /** Mark a note as spent by its nullifier hash */
    markSpent(nullifierHash) {
        const note = this.db.notes.find((n) => n.nullifierHash === nullifierHash);
        if (note)
            note.spent = true;
        const pos = this.db.positions.find((p) => p.nullifierHash === nullifierHash);
        if (pos)
            pos.spent = true;
    }
    /** Store an explorer-visible transaction hash for a position note. */
    setPositionTxHash(commitment, txHash) {
        const pos = this.db.positions.find((p) => p.commitment === commitment);
        if (pos)
            pos.txHash = txHash;
    }
    /** Snapshot current in-memory state so callers can roll back optimistic changes. */
    snapshot() {
        return JSON.stringify(this.db);
    }
    /** Restore a prior snapshot created by snapshot(). */
    restore(snapshot) {
        this.db = JSON.parse(snapshot);
    }
    /** Get all unspent notes, optionally filtered by token */
    getUnspentNotes(token) {
        return this.db.notes.filter((n) => {
            try {
                BigInt(n.amount); // Try parsing to BigInt to detect corrupted notes
            }
            catch {
                return false;
            }
            return !n.spent && (!token || n.token === token);
        });
    }
    /** Get all unspent position notes */
    getUnspentPositions() {
        return this.db.positions.filter((p) => !p.spent);
    }
    /** Get total balance for a token (sum of unspent notes) */
    getBalance(token) {
        return this.getUnspentNotes(token).reduce((sum, n) => sum + BigInt(n.amount), 0n);
    }
    /** Encrypt and save to localStorage (browser) */
    async save() {
        const json = JSON.stringify(this.db);
        const encrypted = await encrypt(json, this.password);
        if (typeof globalThis.localStorage !== "undefined") {
            globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
        }
    }
    /** Load from localStorage, decrypt, and return a new NoteManager */
    static async load(password) {
        console.log("[NoteManager] Loading notes from local storage...");
        const manager = new NoteManager(password);
        if (typeof globalThis.localStorage !== "undefined") {
            const stored = globalThis.localStorage.getItem(STORAGE_KEY);
            if (stored) {
                console.log("[NoteManager] Found encrypted notes, decrypting...");
                try {
                    const encrypted = JSON.parse(stored);
                    const json = await decrypt(encrypted, password);
                    manager.db = JSON.parse(json);
                    console.log("[NoteManager] Decryption successful!");
                    // Retroactive yield note migration:
                    // If the user has spent positions, any unspent notes with fractional amounts (not multiples of 1.0 token)
                    // are flagged as isYield: true.
                    let migrated = false;
                    const spentPositions = manager.db.positions.filter((p) => p.spent);
                    if (spentPositions.length > 0) {
                        for (const note of manager.db.notes) {
                            if (!note.spent && !note.isYield) {
                                const amount = BigInt(note.amount);
                                const tokenLower = note.token.toLowerCase();
                                const isUSDC = tokenLower === "4azxbzlhuufq8pcadstcphuh86kjdbb5z2yegvzswhbz";
                                const isSOL = tokenLower === "5jut2tnkac1vmhrud36xylejwtmzgf1fs7bugxusbcvt";
                                let isYieldNote = false;
                                if (isUSDC) {
                                    // USDC has 6 decimals. Check if amount is not a multiple of 1 USDC (1,000,000)
                                    isYieldNote = amount % 1000000n !== 0n;
                                }
                                else if (isSOL) {
                                    // SOL has 9 decimals. Check if amount is not a multiple of 1 SOL (1,000_000_000)
                                    isYieldNote = amount % 1000000000n !== 0n;
                                }
                                else {
                                    // Fallback: check if not a multiple of 10^6 and 10^9
                                    isYieldNote = amount % 1000000n !== 0n && amount % 1000000000n !== 0n;
                                }
                                if (isYieldNote) {
                                    console.log(`[NoteManager] Retroactively marking note ${note.commitment.slice(0, 10)}... as isYield: true`);
                                    note.isYield = true;
                                    migrated = true;
                                }
                            }
                        }
                    }
                    if (migrated) {
                        console.log("[NoteManager] Migration completed. Saving updated notes...");
                        await manager.save();
                    }
                }
                catch (err) {
                    console.error("[NoteManager] Decryption failed:", err);
                    throw err;
                }
            }
            else {
                console.log("[NoteManager] No existing notes found, starting fresh.");
            }
        }
        return manager;
    }
    /** Export the database as an encrypted string (for backup) */
    async exportEncrypted() {
        const json = JSON.stringify(this.db);
        const encrypted = await encrypt(json, this.password);
        return JSON.stringify(encrypted);
    }
    /** Import from an encrypted backup string */
    static async importEncrypted(data, password) {
        const manager = new NoteManager(password);
        const encrypted = JSON.parse(data);
        const json = await decrypt(encrypted, password);
        manager.db = JSON.parse(json);
        return manager;
    }
    /** Get all notes (for debugging) */
    getAllNotes() {
        return [...this.db.notes];
    }
    /** Get all positions (for debugging) */
    getAllPositions() {
        return [...this.db.positions];
    }
}
//# sourceMappingURL=note-manager.js.map
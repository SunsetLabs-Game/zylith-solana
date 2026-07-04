/**
 * Main entry point for the Zylith SDK on Solana.
 *
 * Supports two proving modes:
 * - "asp": Server-side proving via ASP REST API (recommended)
 * - "client-side": Local proving with snarkjs (requires circuit artifacts)
 */
import { AspClient } from "./asp/client.js";
import { NoteManager } from "./storage/note-manager.js";
import { ClientProver } from "./prover/prover.js";
import { initPoseidon, isInitialized } from "./crypto/poseidon.js";
import { deposit } from "./operations/deposit.js";
import { withdraw } from "./operations/withdraw.js";
import { swap } from "./operations/swap.js";
import { mint } from "./operations/mint.js";
import { burn } from "./operations/burn.js";
import { SolanaRpcClient } from "./solana/rpc.js";
import { PoolReader } from "./solana/pool.js";
import { CoordinatorReader } from "./solana/coordinator.js";
import { assertProgramIds } from "./solana/contracts.js";
export class ZylithClient {
    config;
    provider;
    asp;
    prover;
    noteManager;
    poolReader;
    coordinatorReader;
    initialized = false;
    constructor(config) {
        const programs = assertProgramIds(config.programs);
        this.config = {
            ...config,
            programs,
        };
        if (config.mode === "asp" && !config.aspUrl) {
            throw new Error("aspUrl is required when mode is 'asp'");
        }
        this.provider = new SolanaRpcClient(config.rpcUrl);
        this.poolReader = new PoolReader(this.provider, programs.pool);
        this.coordinatorReader = new CoordinatorReader(this.provider, programs.coordinator);
        if (config.mode === "asp" && config.aspUrl) {
            this.asp = new AspClient(config.aspUrl);
        }
        else {
            this.prover = new ClientProver();
        }
        this.noteManager = new NoteManager(config.password);
    }
    /** Initialize Poseidon hash and load encrypted notes. Must call before operations. */
    async init() {
        if (this.initialized)
            return;
        if (!isInitialized())
            await initPoseidon();
        this.noteManager = await NoteManager.load(this.config.password);
        // Auto-sync leaf indexes for notes that are missing one.
        if (this.asp) {
            const isPending = (c) => c.startsWith("pending_");
            const missing = [
                ...this.noteManager.getAllNotes().filter((n) => !n.spent && n.leafIndex === undefined && !isPending(n.commitment)),
                ...this.noteManager.getAllPositions().filter((p) => !p.spent && p.leafIndex === undefined && !isPending(p.commitment)),
            ];
            if (missing.length > 0) {
                try {
                    const syncData = await this.asp.syncCommitments(missing.map((n) => n.commitment));
                    this.noteManager.updateLeafIndexes(syncData);
                    await this.noteManager.save();
                }
                catch {
                    // Non-fatal
                }
            }
        }
        this.initialized = true;
    }
    assertInit() {
        if (!this.initialized)
            throw new Error("Client not initialized. Call init() first.");
    }
    assertAsp() {
        if (!this.asp)
            throw new Error("ASP mode required for this operation");
        return this.asp;
    }
    // ========================================================================
    // Operations (require ASP mode)
    // ========================================================================
    async deposit(params) {
        this.assertInit();
        return deposit(params, this.assertAsp(), this.noteManager);
    }
    async withdraw(params) {
        this.assertInit();
        return withdraw({ ...params, useAspProver: true }, this.assertAsp(), this.noteManager);
    }
    async swap(params) {
        this.assertInit();
        return swap({ ...params, useAspProver: true }, this.assertAsp(), this.noteManager);
    }
    async mint(params) {
        this.assertInit();
        return mint({ ...params, useAspProver: true }, this.assertAsp(), this.noteManager);
    }
    async burn(params) {
        this.assertInit();
        return burn({ ...params, useAspProver: true }, this.assertAsp(), this.noteManager);
    }
    // ========================================================================
    // Queries (direct Solana reads)
    // ========================================================================
    async getPoolState(poolKey) {
        return this.poolReader.getPoolState(poolKey);
    }
    async getPosition(poolKey, owner, tickLower, tickUpper) {
        return this.poolReader.getPosition(poolKey, owner, tickLower, tickUpper);
    }
    async isNullifierSpent(nullifierHash) {
        return this.coordinatorReader.isNullifierSpent(nullifierHash);
    }
    async getMerkleRoot() {
        return this.coordinatorReader.getMerkleRoot();
    }
    async getNextLeafIndex() {
        return this.coordinatorReader.getNextLeafIndex();
    }
    async isPaused() {
        return this.coordinatorReader.isPaused();
    }
    // ========================================================================
    // Local State
    // ========================================================================
    /** Get total shielded balance for a token */
    getBalance(token) {
        this.assertInit();
        return this.noteManager.getBalance(token);
    }
    /** Get the note manager for advanced operations */
    getNoteManager() {
        this.assertInit();
        return this.noteManager;
    }
    /** Save encrypted notes to storage */
    async saveNotes() {
        this.assertInit();
        await this.noteManager.save();
    }
    // ========================================================================
    // Low-level access
    // ========================================================================
    getProvider() {
        return this.provider;
    }
    getPoolReader() {
        return this.poolReader;
    }
    getCoordinatorReader() {
        return this.coordinatorReader;
    }
    getAspClient() {
        return this.asp;
    }
    getProver() {
        return this.prover;
    }
}
//# sourceMappingURL=client.js.map
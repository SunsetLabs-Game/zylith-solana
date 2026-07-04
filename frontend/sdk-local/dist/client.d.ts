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
import { type DepositParams, type DepositResult } from "./operations/deposit.js";
import { type WithdrawParams, type WithdrawResult } from "./operations/withdraw.js";
import { type SwapParams, type SwapResult } from "./operations/swap.js";
import { type MintParams, type MintResult } from "./operations/mint.js";
import { type BurnParams, type BurnResult } from "./operations/burn.js";
import { SolanaRpcClient } from "./solana/rpc.js";
import { PoolReader } from "./solana/pool.js";
import { CoordinatorReader } from "./solana/coordinator.js";
import { type ZylithProgramIds } from "./solana/contracts.js";
import type { PoolKey, PoolState, Position, ProvingMode } from "./types/index.js";
export interface ZylithClientConfig {
    rpcUrl: string;
    programs: ZylithProgramIds;
    mode: ProvingMode;
    aspUrl?: string;
    password: string;
}
export declare class ZylithClient {
    private config;
    private provider;
    private asp?;
    private prover?;
    private noteManager;
    private poolReader;
    private coordinatorReader;
    private initialized;
    constructor(config: ZylithClientConfig);
    /** Initialize Poseidon hash and load encrypted notes. Must call before operations. */
    init(): Promise<void>;
    private assertInit;
    private assertAsp;
    deposit(params: DepositParams): Promise<DepositResult>;
    withdraw(params: WithdrawParams): Promise<WithdrawResult>;
    swap(params: SwapParams): Promise<SwapResult>;
    mint(params: MintParams): Promise<MintResult>;
    burn(params: BurnParams): Promise<BurnResult>;
    getPoolState(poolKey: PoolKey): Promise<PoolState>;
    getPosition(poolKey: PoolKey, owner: string, tickLower: number, tickUpper: number): Promise<Position>;
    isNullifierSpent(nullifierHash: string): Promise<boolean>;
    getMerkleRoot(): Promise<bigint>;
    getNextLeafIndex(): Promise<number>;
    isPaused(): Promise<boolean>;
    /** Get total shielded balance for a token */
    getBalance(token: string): bigint;
    /** Get the note manager for advanced operations */
    getNoteManager(): NoteManager;
    /** Save encrypted notes to storage */
    saveNotes(): Promise<void>;
    getProvider(): SolanaRpcClient;
    getPoolReader(): PoolReader;
    getCoordinatorReader(): CoordinatorReader;
    getAspClient(): AspClient | undefined;
    getProver(): ClientProver | undefined;
}
//# sourceMappingURL=client.d.ts.map
import { SolanaRpcClient } from "./rpc.js";
export declare class CoordinatorReader {
    private readonly rpc;
    private readonly coordinatorProgramId;
    constructor(rpc: SolanaRpcClient, coordinatorProgramId: string);
    isNullifierSpent(_nullifierHash: string): Promise<boolean>;
    isKnownRoot(_root: string): Promise<boolean>;
    getMerkleRoot(): Promise<bigint>;
    getNextLeafIndex(): Promise<number>;
    isPaused(): Promise<boolean>;
}
//# sourceMappingURL=coordinator.d.ts.map
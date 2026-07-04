import type { PoolKey, PoolState, Position } from "../types/index.js";
import { SolanaRpcClient } from "./rpc.js";
export declare class PoolReader {
    private readonly rpc;
    private readonly poolProgramId;
    constructor(rpc: SolanaRpcClient, poolProgramId: string);
    getPoolState(poolKey: PoolKey): Promise<PoolState>;
    getPosition(_poolKey: PoolKey, _owner: string, _tickLower: number, _tickUpper: number): Promise<Position>;
}
//# sourceMappingURL=pool.d.ts.map
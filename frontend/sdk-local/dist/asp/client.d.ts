/**
 * HTTP client for the ASP (Anonymous Service Provider) REST API.
 * Wraps all 9 endpoints with typed request/response handling.
 */
import type { DepositRequest, DepositResponse, WithdrawRequest, WithdrawResponse, SwapRequest, SwapResponse, MintRequest, MintResponse, BurnRequest, BurnResponse, TreeRootResponse, TreeProofResponse, NullifierResponse, StatusResponse } from "./types.js";
export declare class AspClient {
    private baseUrl;
    private timeout;
    constructor(baseUrl: string, timeout?: number);
    deposit(req: DepositRequest): Promise<DepositResponse>;
    withdraw(req: WithdrawRequest): Promise<WithdrawResponse>;
    swap(req: SwapRequest): Promise<SwapResponse>;
    mint(req: MintRequest): Promise<MintResponse>;
    burn(req: BurnRequest): Promise<BurnResponse>;
    getTreeRoot(): Promise<TreeRootResponse>;
    getTreePath(leafIndex: number): Promise<TreeProofResponse>;
    getNullifier(hash: string): Promise<NullifierResponse>;
    getStatus(): Promise<StatusResponse>;
    syncCommitments(commitments: string[]): Promise<{
        commitment: string;
        leaf_index: number | null;
    }[]>;
    private get;
    private post;
    private request;
}
//# sourceMappingURL=client.d.ts.map
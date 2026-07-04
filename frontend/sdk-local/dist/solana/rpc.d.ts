import { Connection } from "@solana/web3.js";
export declare class SolanaRpcClient {
    private readonly rpcUrl;
    private connection;
    constructor(rpcUrl: string);
    getConnection(): Connection;
    getAccountInfo(address: string): Promise<import("@solana/web3.js").AccountInfo<Buffer<ArrayBufferLike>> | null>;
    getBalance(address: string): Promise<number>;
    getLatestBlockhash(): Promise<Readonly<{
        blockhash: import("@solana/web3.js").Blockhash;
        lastValidBlockHeight: number;
    }>>;
    getSlot(): Promise<number>;
}
//# sourceMappingURL=rpc.d.ts.map
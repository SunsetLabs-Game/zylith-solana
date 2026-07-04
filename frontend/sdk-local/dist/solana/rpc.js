import { Connection, PublicKey } from "@solana/web3.js";
export class SolanaRpcClient {
    rpcUrl;
    connection;
    constructor(rpcUrl) {
        this.rpcUrl = rpcUrl;
        if (!rpcUrl) {
            throw new Error("rpcUrl is required");
        }
        this.connection = new Connection(rpcUrl, "confirmed");
    }
    getConnection() {
        return this.connection;
    }
    async getAccountInfo(address) {
        return await this.connection.getAccountInfo(new PublicKey(address));
    }
    async getBalance(address) {
        return await this.connection.getBalance(new PublicKey(address));
    }
    async getLatestBlockhash() {
        return await this.connection.getLatestBlockhash();
    }
    async getSlot() {
        return await this.connection.getSlot();
    }
}
//# sourceMappingURL=rpc.js.map
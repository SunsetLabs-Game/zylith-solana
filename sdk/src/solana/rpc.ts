import { Connection, PublicKey } from "@solana/web3.js";

export class SolanaRpcClient {
  private connection: Connection;

  constructor(private readonly rpcUrl: string) {
    if (!rpcUrl) {
      throw new Error("rpcUrl is required");
    }
    this.connection = new Connection(rpcUrl, "confirmed");
  }

  getConnection(): Connection {
    return this.connection;
  }

  async getAccountInfo(address: string) {
    return await this.connection.getAccountInfo(new PublicKey(address));
  }

  async getBalance(address: string) {
    return await this.connection.getBalance(new PublicKey(address));
  }

  async getLatestBlockhash() {
    return await this.connection.getLatestBlockhash();
  }

  async getSlot() {
    return await this.connection.getSlot();
  }
}


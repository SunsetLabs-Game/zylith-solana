import { PublicKey } from "@solana/web3.js";
function readU128LE(view, offset) {
    const low = view.getBigUint64(offset, true);
    const high = view.getBigUint64(offset + 8, true);
    return (high << 64n) | low;
}
function getTickAtSqrtPrice(sqrtPriceX96) {
    if (sqrtPriceX96 === 0n)
        return 0;
    const price = Number(sqrtPriceX96) / 79228162514264337593543950336; // 2^96
    const tick = Math.log(price) / Math.log(Math.sqrt(1.0001));
    return Math.round(tick);
}
export class PoolReader {
    rpc;
    poolProgramId;
    constructor(rpc, poolProgramId) {
        this.rpc = rpc;
        this.poolProgramId = poolProgramId;
    }
    async getPoolState(poolKey) {
        const connection = this.rpc.getConnection();
        // Derive pool PDA
        const token0Pubkey = new PublicKey(poolKey.token0);
        const token1Pubkey = new PublicKey(poolKey.token1);
        const [t0, t1] = token0Pubkey.toBuffer().compare(token1Pubkey.toBuffer()) < 0
            ? [token0Pubkey, token1Pubkey]
            : [token1Pubkey, token0Pubkey];
        const feeBuffer = Buffer.alloc(4);
        feeBuffer.writeUInt32LE(poolKey.fee, 0);
        const [poolPda] = PublicKey.findProgramAddressSync([
            Buffer.from("pool"),
            t0.toBuffer(),
            t1.toBuffer(),
            feeBuffer,
        ], new PublicKey(this.poolProgramId));
        try {
            const info = await connection.getAccountInfo(poolPda);
            if (!info) {
                throw new Error(`Pool account not found`);
            }
            const view = new DataView(info.data.buffer, info.data.byteOffset, info.data.byteLength);
            const sqrtPriceX96 = readU128LE(view, 120);
            const sqrtPrice = sqrtPriceX96 << 32n; // convert Q64.96 to Q128.128
            const tick = getTickAtSqrtPrice(sqrtPriceX96);
            const liquidity = readU128LE(view, 136);
            const reserve0 = view.getBigUint64(152, true);
            const reserve1 = view.getBigUint64(160, true);
            return {
                sqrtPrice,
                tick,
                liquidity,
                feeGrowthGlobal0: 0n,
                feeGrowthGlobal1: 0n,
                protocolFees0: 0n,
                protocolFees1: 0n,
                reserve0,
                reserve1,
            };
        }
        catch (err) {
            console.error("Failed to read pool state:", err);
            // Fallback to default Q128.128 initial price
            return {
                sqrtPrice: 79228162514264337593543950336n << 32n,
                tick: 0,
                liquidity: 0n,
                feeGrowthGlobal0: 0n,
                feeGrowthGlobal1: 0n,
                protocolFees0: 0n,
                protocolFees1: 0n,
                reserve0: 0n,
                reserve1: 0n,
            };
        }
    }
    async getPosition(_poolKey, _owner, _tickLower, _tickUpper) {
        return {
            liquidity: 0n,
            feeGrowthInside0Last: 0n,
            feeGrowthInside1Last: 0n,
            tokensOwed0: 0n,
            tokensOwed1: 0n,
        };
    }
}
//# sourceMappingURL=pool.js.map
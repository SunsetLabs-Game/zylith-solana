/**
 * CLMM math utilities.
 * Used to calculate token amounts from liquidity and price ranges.
 */
/**
 * Estimate swap output amount using constant-product approximation.
 * Uses sqrtPrice to compute the effective price and applies the fee.
 * This is an approximation — actual output may differ slightly due to tick crossings.
 *
 * WARNING: This returns a RAW estimate without slippage buffer.
 * For note commitments, use `estimateSwapOutputSafe()` which applies a conservative
 * slippage buffer to ensure the committed amount <= actual on-chain output.
 *
 * @param sqrtPrice   Current pool sqrt price (Q128.128)
 * @param amountIn    Exact input amount
 * @param zeroForOne  true = token0 in, token1 out
 * @param feePips     Fee in pips (e.g. 3000 = 0.3%)
 * @returns Estimated output amount
 */
export declare function estimateSwapOutput(sqrtPrice: bigint, amountIn: bigint, zeroForOne: boolean, feePips: number): bigint;
/**
 * Estimate swap output with a conservative slippage buffer applied.
 * The committed amount in the ZK note should be <= actual on-chain output.
 * If the estimate is too high, the note would have more value than was actually
 * received — making value unrecoverable. By applying a buffer, we ensure:
 * - committed amount <= actual output (excess stays in pool, minor loss)
 * - amountOutMin = committed amount → tx reverts if actual < committed (no loss)
 *
 * @param sqrtPrice    Current pool sqrt price (Q128.128)
 * @param amountIn     Exact input amount
 * @param zeroForOne   true = token0 in, token1 out
 * @param feePips      Fee in pips (e.g. 3000 = 0.3%)
 * @param slippageBps  Slippage buffer in basis points (default 100 = 1%)
 * @returns Estimated output amount reduced by slippage buffer
 */
export declare function estimateSwapOutputSafe(sqrtPrice: bigint, amountIn: bigint, zeroForOne: boolean, feePips: number, slippageBps?: number): bigint;
/**
 * Estimate swap output amount using constant-product formula (on-chain logic).
 *
 * @param reserveIn   Input token reserve
 * @param reserveOut  Output token reserve
 * @param amountIn    Exact input amount
 * @param feePips     Fee in pips (e.g. 3000 = 0.3%)
 * @returns Estimated output amount
 */
export declare function estimateSwapOutputConstantProduct(reserveIn: bigint, reserveOut: bigint, amountIn: bigint, feePips: number): bigint;
/**
 * Estimate swap output using constant-product formula with a conservative slippage buffer.
 *
 * @param reserveIn   Input token reserve
 * @param reserveOut  Output token reserve
 * @param amountIn    Exact input amount
 * @param feePips     Fee in pips (e.g. 3000 = 0.3%)
 * @param slippageBps Slippage buffer in basis points (default 100 = 1%)
 * @returns Estimated output amount reduced by slippage buffer
 */
export declare function estimateSwapOutputConstantProductSafe(reserveIn: bigint, reserveOut: bigint, amountIn: bigint, feePips: number, slippageBps?: number): bigint;
/**
 * Calculate the token amounts returned when burning liquidity from a position.
 *
 * @param sqrtPrice   Current pool sqrt price (Q128.128)
 * @param tickLower   Lower tick of the position (signed)
 * @param tickUpper   Upper tick of the position (signed)
 * @param liquidity   Liquidity to remove
 * @returns { amount0, amount1 } — amounts returned to the position owner
 */
export declare function getAmountsForBurn(sqrtPrice: bigint, tickLower: number, tickUpper: number, liquidity: bigint): {
    amount0: bigint;
    amount1: bigint;
};
//# sourceMappingURL=clmm.d.ts.map
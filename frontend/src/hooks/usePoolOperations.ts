import { useWalletSession } from "@/providers/WalletProvider";
import { env } from "@/config/env";
import { useState } from "react";
import {
  buildErc20ApprovalTx,
  buildPoolMintTx,
  buildPoolSwapTx,
  type SolanaTransactionRequest,
} from "@/config/solana";

const POOL_ADDRESS = env.contracts.pool;

interface SwapParams {
  tokenInAddress: string;
  tokenOutAddress: string;
  amountIn: bigint;
  fee?: number;
  tickSpacing?: number;
}

interface MintParams {
  token0Address: string;
  token1Address: string;
  liquidity: bigint;
  fee?: number;
  tickSpacing?: number;
  tickLower?: number;
  tickUpper?: number;
  amount?: bigint;
}

export function usePoolOperations() {
  const { execute, address, isConnected } = useWalletSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeSwap = async (params: SwapParams) => {
    if (!execute || !address || !isConnected) {
      throw new Error("Wallet not connected");
    }

    setIsLoading(true);
    setError(null);

    try {
      const zeroForOne = params.tokenInAddress < params.tokenOutAddress;
      
      const MIN_SQRT_PRICE = "4295128740";
      const MAX_SQRT_PRICE = "1461446703485210103287273052203988822378723970340";
      const validLimit = zeroForOne ? MIN_SQRT_PRICE : MAX_SQRT_PRICE;

      const calls: SolanaTransactionRequest[] = [
        buildErc20ApprovalTx(
          params.tokenInAddress,
          POOL_ADDRESS,
          params.amountIn,
          address!,
          "Approve swap",
        ),
        buildPoolSwapTx({
          poolAddress: POOL_ADDRESS,
          zeroForOne,
          amountIn: params.amountIn,
          sqrtPriceLimitX96: validLimit,
        }),
      ];

      const txHash = await execute(calls);
      setIsLoading(false);
      return txHash;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Swap failed";
      setError(message);
      setIsLoading(false);
      throw err;
    }
  };

  const executeMint = async (params: MintParams) => {
    if (!execute || !address || !isConnected) {
      throw new Error("Wallet not connected");
    }

    setIsLoading(true);
    setError(null);

    try {
      const [token0, token1] =
        params.token0Address < params.token1Address
          ? [params.token0Address, params.token1Address]
          : [params.token1Address, params.token0Address];

      const calls: SolanaTransactionRequest[] = [
        buildErc20ApprovalTx(token0, POOL_ADDRESS, params.liquidity, address!, "Approve token 0"),
        buildErc20ApprovalTx(token1, POOL_ADDRESS, params.liquidity, address!, "Approve token 1"),
        buildPoolMintTx({
          poolAddress: POOL_ADDRESS,
          liquidityDelta: params.liquidity,
        }),
      ];

      const txHash = await execute(calls);
      setIsLoading(false);
      return txHash;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Mint failed";
      setError(message);
      setIsLoading(false);
      throw err;
    }
  };

  return {
    executeSwap,
    executeMint,
    isLoading,
    error,
    isConnected,
    address,
  };
}

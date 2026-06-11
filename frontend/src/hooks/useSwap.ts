import { useMutation } from "@tanstack/react-query";
import { useSdkStore } from "@/stores/sdkStore";
import { useWalletSession } from "@/providers/WalletProvider";
import { useToast } from "@/components/ui/Toast";
import { queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import type { PoolKey } from "@zylith/sdk";
import {
  buildShieldedSwapTx,
} from "@/config/solana";
import { env } from "@/config/env";

interface SwapInput {
  poolKey: PoolKey;
  inputNoteCommitment: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  amountOutMin: bigint;
  expectedAmountOut: bigint;
  sqrtPriceLimit: bigint;
}

export function useSwap() {
  const client = useSdkStore((s) => s.client);
  const refreshBalances = useSdkStore((s) => s.refreshBalances);
  const { execute, address } = useWalletSession();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: SwapInput) => {
      if (!client) throw new Error("SDK not initialized");
      if (!env.contracts.pool) throw new Error("Pool address is not configured");
      if (!env.contracts.coordinator) throw new Error("Coordinator address is not configured");
      if (!address) throw new Error("Wallet not connected");

      const noteManager = client.getNoteManager();
      const snapshot = noteManager.snapshot();

      try {
        const result = await client.swap(input);
        const txHash = await execute([
          await buildShieldedSwapTx({
            poolAddress: env.contracts.pool,
            proofData: result.calldata.join(","),
            sqrtPriceLimitX96: input.sqrtPriceLimit.toString(),
            ownerAddress: address,
            coordinatorAddress: env.contracts.coordinator,
          }),
        ]);
        await client.saveNotes();
        return { ...result, txHash };
      } catch (error) {
        noteManager.restore(snapshot);
        await client.saveNotes();
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      refreshBalances();
      queryClient.invalidateQueries({
        queryKey: queryKeys.poolState(variables.poolKey),
      });
      toast(`Swap confirmed: ${data.txHash.slice(0, 10)}...`, "success");
    },
    onError: (err) => {
      toast(`Swap failed: ${err.message}`, "error");
    },
  });
}

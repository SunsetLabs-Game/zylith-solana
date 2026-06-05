import { useMutation } from "@tanstack/react-query";
import { useSdkStore } from "@/stores/sdkStore";
import { useWalletSession } from "@/providers/WalletProvider";
import { useToast } from "@/components/ui/Toast";
import { queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import type { PoolKey } from "@zylith/sdk";
import {
  buildShieldedMintTx,
} from "@/config/solana";
import { env } from "@/config/env";

interface MintInput {
  poolKey: PoolKey;
  inputNote0Commitment: string;
  inputNote1Commitment: string;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  amount0: bigint;
  amount1: bigint;
}

export function useMint() {
  const client = useSdkStore((s) => s.client);
  const refreshBalances = useSdkStore((s) => s.refreshBalances);
  const { execute, address } = useWalletSession();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: MintInput) => {
      if (!client) throw new Error("SDK not initialized");
      if (!env.contracts.pool) throw new Error("Pool address is not configured");
      if (!env.contracts.coordinator) throw new Error("Coordinator address is not configured");
      if (!address) throw new Error("Wallet not connected");

      const noteManager = client.getNoteManager();
      const snapshot = noteManager.snapshot();

      try {
        const result = await client.mint(input);
        const txHash = await execute([
          await buildShieldedMintTx({
            poolAddress: env.contracts.pool,
            coordinatorAddress: env.contracts.coordinator,
            ownerAddress: address,
            proofData: result.calldata.join(","),
            liquidityDelta: input.liquidity,
          }),
        ]);
        noteManager.setPositionTxHash(result.positionCommitment, txHash);
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
      toast(`Liquidity added: ${data.txHash.slice(0, 10)}...`, "success");
    },
    onError: (err) => {
      toast(`Add liquidity failed: ${err.message}`, "error");
    },
  });
}

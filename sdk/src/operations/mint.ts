/** Shielded mint (add liquidity) operation */
import type { AspClient } from "../asp/client.js";
import type { NoteManager } from "../storage/note-manager.js";
import type { PoolKey } from "../types/index.js";
import { u256Split, generateRandomSecret } from "../utils/conversions.js";
import { ClientProver } from "../prover/prover.js";
import { formatProofForSolana } from "../utils/proof.js";
import { generateMintInputs } from "../prover/inputs/mint.js";
import { computePositionCommitment } from "../crypto/commitment.js";
import { signedToOffsetTick } from "../types/constants.js";

export interface MintParams {
  poolKey: PoolKey;
  inputNote0Commitment: string;
  inputNote1Commitment: string;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  amount0: bigint;
  amount1: bigint;
  useAspProver?: boolean;
}

export interface MintResult {
  calldata: string[];
  finalRoot: string;
  positionCommitment: string;
  changeCommitment0: string;
  changeCommitment1: string;
  solanaProof?: Buffer;
}

export async function mint(
  params: MintParams,
  asp: AspClient,
  noteManager: NoteManager,
): Promise<MintResult> {
  const notes = noteManager.getAllNotes();
  const input0 = notes.find(
    (n) => n.commitment === params.inputNote0Commitment && !n.spent,
  );
  const input1 = notes.find(
    (n) => n.commitment === params.inputNote1Commitment && !n.spent,
  );
  if (!input0 || !input1) throw new Error("Input note(s) not found or spent");
  if (input0.leafIndex === undefined || input1.leafIndex === undefined)
    throw new Error("Input notes have no leaf index");

  const posSecret = generateRandomSecret();
  const posNullifier = generateRandomSecret();
  const change0Secret = generateRandomSecret();
  const change0Nullifier = generateRandomSecret();
  const change1Secret = generateRandomSecret();
  const change1Nullifier = generateRandomSecret();

  const { low: bal0Low, high: bal0High } = u256Split(BigInt(input0.amount));
  const { low: bal1Low, high: bal1High } = u256Split(BigInt(input1.amount));
  const { low: amt0Low, high: amt0High } = u256Split(params.amount0);
  const { low: amt1Low, high: amt1High } = u256Split(params.amount1);

  let response: any = {};
  let solanaProof: Buffer | undefined;

  if (params.useAspProver) {
    response = await asp.mint({
      pool_key: {
        token_0: params.poolKey.token0,
        token_1: params.poolKey.token1,
        fee: params.poolKey.fee,
        tick_spacing: params.poolKey.tickSpacing,
      },
      input_note_0: {
        secret: input0.secret,
        nullifier: input0.nullifier,
        balance_low: bal0Low.toString(),
        balance_high: bal0High.toString(),
        token: input0.token,
        leaf_index: input0.leafIndex,
      },
      input_note_1: {
        secret: input1.secret,
        nullifier: input1.nullifier,
        balance_low: bal1Low.toString(),
        balance_high: bal1High.toString(),
        token: input1.token,
        leaf_index: input1.leafIndex,
      },
      position: {
        secret: posSecret,
        nullifier: posNullifier,
        liquidity: params.liquidity.toString(),
        tick_lower: params.tickLower,
        tick_upper: params.tickUpper,
      },
      amounts: {
        amount0_low: amt0Low.toString(),
        amount0_high: amt0High.toString(),
        amount1_low: amt1Low.toString(),
        amount1_high: amt1High.toString(),
      },
      change_note_0: { secret: change0Secret, nullifier: change0Nullifier },
      change_note_1: { secret: change1Secret, nullifier: change1Nullifier },
      liquidity: Number(params.liquidity),
    });
  } else {
    // 1. Fetch the Merkle tree state from ASP
    const proofRes0 = await asp.getTreePath(input0.leafIndex);
    const proofRes1 = await asp.getTreePath(input1.leafIndex);
    
    // 2. Generate circuit inputs
    const circuitInputs = generateMintInputs({
      inputNote0: {
        secret: input0.secret,
        nullifier: input0.nullifier,
        balance: BigInt(input0.amount),
        token: input0.token,
        merkleProof: {
          root: proofRes0.root,
          pathElements: proofRes0.path_elements,
          pathIndices: proofRes0.path_indices,
        }
      },
      inputNote1: {
        secret: input1.secret,
        nullifier: input1.nullifier,
        balance: BigInt(input1.amount),
        token: input1.token,
        merkleProof: {
          root: proofRes1.root,
          pathElements: proofRes1.path_elements,
          pathIndices: proofRes1.path_indices,
        }
      },
      position: {
        secret: posSecret,
        nullifier: posNullifier,
        tickLower: params.tickLower,
        tickUpper: params.tickUpper,
        liquidity: params.liquidity,
      },
      changeNote0: { secret: change0Secret, nullifier: change0Nullifier },
      changeNote1: { secret: change1Secret, nullifier: change1Nullifier },
    });

    // 3. Generate proof locally
    const prover = new ClientProver();
    const { proof, publicSignals } = await prover.generateProof("mint", circuitInputs as unknown as Record<string, unknown>);
    
    // 4. Format proof for Solana
    solanaProof = formatProofForSolana(proof);

    // Mock response
    response = {
      position_commitment: circuitInputs.positionCommitment,
      calldata: [],
      final_root: proofRes0.root,
    };
    
    // snarkjs returns public signals in order.
    // For mint: [root, nullifierHash0, nullifierHash1, positionCommitment, tickLower, tickUpper, changeCommitment0, changeCommitment1]
    response.change_commitment_0 = publicSignals[6];
    response.change_commitment_1 = publicSignals[7];
  }

  // Update local state
  noteManager.markSpent(input0.nullifierHash);
  noteManager.markSpent(input1.nullifierHash);

  noteManager.addPositionNote({
    secret: posSecret,
    nullifier: posNullifier,
    tickLower: params.tickLower,
    tickUpper: params.tickUpper,
    liquidity: params.liquidity,
    commitment: response.position_commitment,
  });

  const change0Amount = BigInt(input0.amount) - params.amount0;
  if (change0Amount > 0n) {
    noteManager.addNote({
      secret: change0Secret,
      nullifier: change0Nullifier,
      amount: change0Amount,
      token: input0.token,
    });
  }
  const change1Amount = BigInt(input1.amount) - params.amount1;
  if (change1Amount > 0n) {
    noteManager.addNote({
      secret: change1Secret,
      nullifier: change1Nullifier,
      amount: change1Amount,
      token: input1.token,
    });
  }

  // Sync leaf indexes from ASP for change notes and position
  const commitmentsToSync = [
    response.change_commitment_0,
    response.change_commitment_1,
    response.position_commitment,
  ].filter((c) => c && c !== "0");

  if (commitmentsToSync.length > 0) {
    try {
      const syncResponse = await asp.syncCommitments(commitmentsToSync);
      noteManager.updateLeafIndexes(syncResponse);
    } catch (err) {
      console.warn("Failed to sync leaf indexes from ASP:", err);
    }
  }

  return {
    calldata: response.calldata,
    finalRoot: response.final_root,
    positionCommitment: response.position_commitment,
    changeCommitment0: response.change_commitment_0,
    changeCommitment1: response.change_commitment_1,
    solanaProof,
  };
}

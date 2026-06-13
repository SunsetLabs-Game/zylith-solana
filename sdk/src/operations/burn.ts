/** Shielded burn (remove liquidity) operation */
import type { AspClient } from "../asp/client.js";
import type { NoteManager } from "../storage/note-manager.js";
import type { PoolKey } from "../types/index.js";
import { u256Split, generateRandomSecret } from "../utils/conversions.js";
import { ClientProver } from "../prover/prover.js";
import { formatProofForSolana } from "../utils/proof.js";
import { generateBurnInputs } from "../prover/inputs/burn.js";

export interface BurnParams {
  poolKey: PoolKey;
  positionCommitment: string;
  amount0Out: bigint;
  token0: string;
  amount1Out: bigint;
  token1: string;
  liquidity: bigint;
  useAspProver?: boolean;
}

export interface BurnResult {
  calldata: string[];
  finalRoot: string;
  newCommitment0: string;
  newCommitment1: string;
  amount0: bigint;
  amount1: bigint;
  solanaProof?: Buffer;
}

export async function burn(
  params: BurnParams,
  asp: AspClient,
  noteManager: NoteManager,
): Promise<BurnResult> {
  const positions = noteManager.getAllPositions();
  const position = positions.find(
    (p) => p.commitment === params.positionCommitment && !p.spent,
  );
  if (!position) throw new Error("Position not found or already spent");
  if (position.leafIndex === undefined)
    throw new Error("Position has no leaf index");

  const out0Secret = generateRandomSecret();
  const out0Nullifier = generateRandomSecret();
  const out1Secret = generateRandomSecret();
  const out1Nullifier = generateRandomSecret();

  const { low: out0Low, high: out0High } = u256Split(params.amount0Out);
  const { low: out1Low, high: out1High } = u256Split(params.amount1Out);

  // Save placeholder notes BEFORE calling the ASP so secrets survive even if
  // the response processing fails. Same pattern as swap.ts.
  noteManager.addNote({
    secret: out0Secret,
    nullifier: out0Nullifier,
    amount: 0n,
    token: params.token0,
    commitment: "pending_burn0_" + out0Nullifier,
    isYield: true,
  });
  noteManager.addNote({
    secret: out1Secret,
    nullifier: out1Nullifier,
    amount: 0n,
    token: params.token1,
    commitment: "pending_burn1_" + out1Nullifier,
    isYield: true,
  });

  // Mark position spent optimistically
  noteManager.markSpent(position.nullifierHash);
  await noteManager.save();

  let response: any = {};
  let solanaProof: Buffer | undefined;

  if (params.useAspProver) {
    response = await asp.burn({
      pool_key: {
        token_0: params.poolKey.token0,
        token_1: params.poolKey.token1,
        fee: params.poolKey.fee,
        tick_spacing: params.poolKey.tickSpacing,
      },
      position_note: {
        secret: position.secret,
        nullifier: position.nullifier,
        liquidity: position.liquidity,
        tick_lower: position.tickLower,
        tick_upper: position.tickUpper,
        leaf_index: position.leafIndex,
      },
      output_note_0: {
        secret: out0Secret,
        nullifier: out0Nullifier,
        amount_low: out0Low.toString(),
        amount_high: out0High.toString(),
        token: params.token0,
      },
      output_note_1: {
        secret: out1Secret,
        nullifier: out1Nullifier,
        amount_low: out1Low.toString(),
        amount_high: out1High.toString(),
        token: params.token1,
      },
      liquidity: Number(params.liquidity),
    });
  } else {
    // 1. Fetch Merkle tree state
    const proofRes = await asp.getTreePath(position.leafIndex);

    // 2. Generate inputs
    const circuitInputs = generateBurnInputs({
      positionNote: {
        secret: position.secret,
        nullifier: position.nullifier,
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
        liquidity: BigInt(position.liquidity),
        merkleProof: {
          root: proofRes.root,
          pathElements: proofRes.path_elements,
          pathIndices: proofRes.path_indices,
        }
      },
      outputNote0: {
        secret: out0Secret,
        nullifier: out0Nullifier,
        amount: params.amount0Out,
        token: params.token0,
      },
      outputNote1: {
        secret: out1Secret,
        nullifier: out1Nullifier,
        amount: params.amount1Out,
        token: params.token1,
      },
    });

    // 3. Generate proof locally
    const prover = new ClientProver();
    const { proof, publicSignals } = await prover.generateProof("burn", circuitInputs as unknown as Record<string, unknown>);
    
    // 4. Format proof for Solana
    solanaProof = formatProofForSolana(proof);

    response = {
      new_commitment_0: circuitInputs.newCommitment0,
      new_commitment_1: circuitInputs.newCommitment1,
      amount_0: params.amount0Out.toString(),
      amount_1: params.amount1Out.toString(),
      calldata: [],
      final_root: proofRes.root,
    };
    
    // public signals: [root, nullifierHash, newCommitment0, newCommitment1, token0, token1, amount0Out, amount1Out]
  }

  // Update placeholder notes with real commitments and amounts from ASP response.
  // The ASP echoes back the amounts it used in the ZK proof — these are authoritative.
  const actual0 = BigInt(response.amount_0);
  if (actual0 > 0n) {
    noteManager.updateNote(out0Nullifier, response.new_commitment_0, actual0);
  }

  const actual1 = BigInt(response.amount_1);
  if (actual1 > 0n) {
    noteManager.updateNote(out1Nullifier, response.new_commitment_1, actual1);
  }

  // Sync leaf indexes from ASP for output notes
  const commitmentsToSync = [
    response.new_commitment_0,
    response.new_commitment_1,
  ].filter((c) => c && c !== "0");

  if (commitmentsToSync.length > 0) {
    try {
      const syncResponse = await asp.syncCommitments(commitmentsToSync);
      noteManager.updateLeafIndexes(syncResponse);
    } catch {
      // Non-fatal: leaf indexes will be resolved on next syncNotes()
    }
  }

  return {
    calldata: response.calldata,
    finalRoot: response.final_root,
    newCommitment0: response.new_commitment_0,
    newCommitment1: response.new_commitment_1,
    amount0: actual0,
    amount1: actual1,
    solanaProof,
  };
}

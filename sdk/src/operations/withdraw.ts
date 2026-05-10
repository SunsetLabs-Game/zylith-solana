import type { AspClient } from "../asp/client.js";
import type { NoteManager } from "../storage/note-manager.js";
import { u256Split } from "../utils/conversions.js";
import { ClientProver } from "../prover/prover.js";
import { formatProofForSolana } from "../utils/proof.js";
import { generateMembershipInputs } from "../prover/inputs/membership.js";

export interface WithdrawParams {
  /** The note to withdraw. Must have a leafIndex. */
  noteCommitment: string;
  /** The recipient address to receive the withdrawn tokens */
  recipient: string;
  /** If true, uses ASP for proving. If false, generates proof locally. Default false. */
  useAspProver?: boolean;
}

export interface WithdrawResult {
  calldata?: string[]; // Kept for backward compatibility
  solanaProof?: Buffer; // 256-byte Solana native proof
  nullifierHash: string;
}

export async function withdraw(
  params: WithdrawParams,
  asp: AspClient,
  noteManager: NoteManager,
): Promise<WithdrawResult> {
  const notes = noteManager.getAllNotes();
  const note = notes.find(
    (n) => n.commitment === params.noteCommitment && !n.spent,
  );
  if (!note) throw new Error("Note not found or already spent");
  if (note.leafIndex === undefined)
    throw new Error("Note has no leaf index (not deposited yet)");

  const { low, high } = u256Split(BigInt(note.amount));

  if (params.useAspProver) {
    const response = await asp.withdraw({
      secret: note.secret,
      nullifier: note.nullifier,
      amount_low: low.toString(),
      amount_high: high.toString(),
      token: note.token,
      recipient: params.recipient,
      leaf_index: note.leafIndex,
    });

    noteManager.markSpent(note.nullifierHash);

    return {
      calldata: response.calldata,
      nullifierHash: response.nullifier_hash,
    };
  } else {
    // 1. Fetch the Merkle tree state from ASP or Solana directly to build the proof
    // For now we ask the ASP for the sibling path
    const proofRes = await asp.getTreePath(note.leafIndex);
    
    // 2. Generate circuit inputs
    const circuitInputs = generateMembershipInputs(
      note.secret,
      note.nullifier,
      BigInt(note.amount),
      note.token,
      params.recipient,
      {
        root: proofRes.root,
        pathElements: proofRes.path_elements,
        pathIndices: proofRes.path_indices,
      }
    );

    // 3. Generate proof locally
    const prover = new ClientProver();
    // We must pass the inputs as a Record<string, unknown> which it is roughly compatible with.
    // However TypeScript needs type assertion
    const { proof } = await prover.generateProof("membership", circuitInputs as unknown as Record<string, unknown>);
    
    // 4. Format proof for Solana
    const solanaProof = formatProofForSolana(proof);

    noteManager.markSpent(note.nullifierHash);

    return {
      solanaProof,
      nullifierHash: note.nullifierHash,
    };
  }
}

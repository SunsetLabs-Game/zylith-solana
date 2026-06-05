/** Input generator for the burn circuit */
import { computeCommitment, computePositionCommitment } from "../../crypto/commitment.js";
import { u256Split, tokenToBigInt2 } from "../../utils/conversions.js";
import { signedToOffsetTick } from "../../types/constants.js";
import type { MerkleProof } from "../../crypto/merkle.js";

export interface BurnCircuitInputs {
  // Public (6)
  root: string;
  positionNullifierHash: string;
  newCommitment0: string;
  newCommitment1: string;
  tickLower: string;
  tickUpper: string;
  // Private - position
  positionSecret: string;
  positionNullifier: string;
  liquidity: string;
  pathElements: string[];
  pathIndices: number[];
  // Private - output notes
  newSecret0: string;
  newNullifier0: string;
  amount0_low: string;
  amount0_high: string;
  token0: string;
  newSecret1: string;
  newNullifier1: string;
  amount1_low: string;
  amount1_high: string;
  token1: string;
}

/** Build circuit inputs for a burn proof */
export function generateBurnInputs(params: {
  positionNote: {
    secret: string;
    nullifier: string;
    tickLower: number;
    tickUpper: number;
    liquidity: bigint;
    merkleProof: MerkleProof;
  };
  outputNote0: {
    secret: string;
    nullifier: string;
    amount: bigint;
    token: string;
  };
  outputNote1: {
    secret: string;
    nullifier: string;
    amount: bigint;
    token: string;
  };
}): BurnCircuitInputs {
  const { positionNote, outputNote0, outputNote1 } = params;

  const unsignedTickLower = signedToOffsetTick(positionNote.tickLower);
  const unsignedTickUpper = signedToOffsetTick(positionNote.tickUpper);

  // Compute position nullifier hash
  const { nullifierHash: positionNullifierHash } = computePositionCommitment(
    positionNote.secret,
    positionNote.nullifier,
    unsignedTickLower,
    unsignedTickUpper,
    positionNote.liquidity.toString(),
  );

  // Compute output commitments
  const { low: out0Low, high: out0High } = u256Split(outputNote0.amount);
  const { commitment: newCommitment0 } = computeCommitment(
    outputNote0.secret,
    outputNote0.nullifier,
    out0Low.toString(),
    out0High.toString(),
    outputNote0.token,
  );
  const { low: out1Low, high: out1High } = u256Split(outputNote1.amount);
  const { commitment: newCommitment1 } = computeCommitment(
    outputNote1.secret,
    outputNote1.nullifier,
    out1Low.toString(),
    out1High.toString(),
    outputNote1.token,
  );

  return {
    root: positionNote.merkleProof.root,
    positionNullifierHash,
    newCommitment0,
    newCommitment1,
    tickLower: unsignedTickLower.toString(),
    tickUpper: unsignedTickUpper.toString(),
    positionSecret: positionNote.secret,
    positionNullifier: positionNote.nullifier,
    liquidity: positionNote.liquidity.toString(),
    pathElements: positionNote.merkleProof.pathElements,
    pathIndices: positionNote.merkleProof.pathIndices,
    newSecret0: outputNote0.secret,
    newNullifier0: outputNote0.nullifier,
    amount0_low: out0Low.toString(),
    amount0_high: out0High.toString(),
    token0: tokenToBigInt2(outputNote0.token).toString(),
    newSecret1: outputNote1.secret,
    newNullifier1: outputNote1.nullifier,
    amount1_low: out1Low.toString(),
    amount1_high: out1High.toString(),
    token1: tokenToBigInt2(outputNote1.token).toString(),
  };
}

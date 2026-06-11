import { PublicKey, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { Program, BN } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import idl from "./zylith.json";
import {
  ZYLITH_PROGRAM_ID,
  getCommitmentPda,
} from "./pda";

import { env } from "./env";
import { Connection } from "@solana/web3.js";

export type SolanaTransactionRequest = TransactionInstruction;

// @ts-ignore - Ignore type errors for IDL since we are just using it to build instructions
const dummyProvider = { connection: new Connection(env.rpcUrl) };
const program = new Program(idl as any, dummyProvider as any);

export function buildErc20ApprovalTx(
  _tokenAddress: string,
  spenderAddress: string,
  amount: bigint,
  ownerAddress: string,
  _label: string,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey("Memo1UuS27vSdwMbsBv7mNoSqbiyfR3S66GE5Xq6E29"),
    keys: [{ pubkey: new PublicKey(ownerAddress), isSigner: true, isWritable: false }],
    data: Buffer.from(`Sunset Token Approval: ${amount} to ${spenderAddress}`, "utf-8"),
  });
}

export async function buildShieldedDepositTx(params: {
  poolAddress: string;
  tokenAddress: string;
  amount: bigint;
  commitment: string;
  ownerAddress: string;
  coordinatorAddress: string;
  leafIndex?: number;
}): Promise<TransactionInstruction> {
  const amountBn = new BN(params.amount.toString());
  
  // Pad the commitment hex to 64 characters (32 bytes)
  let hex = params.commitment.replace("0x", "");
  hex = hex.padStart(64, "0");
  const commitmentBytes = Array.from(Buffer.from(hex, "hex"));
  
  const userAta = getAssociatedTokenAddressSync(
    new PublicKey(params.tokenAddress),
    new PublicKey(params.ownerAddress)
  );
  
  const poolAta = getAssociatedTokenAddressSync(
    new PublicKey(params.tokenAddress),
    new PublicKey(params.poolAddress),
    true
  );

  const coordinatorPubkey = new PublicKey(params.coordinatorAddress);
  
  let leafIndex = params.leafIndex;
  if (leafIndex === undefined) {
    const coordinatorState = await (program.account as any).coordinatorState.fetch(coordinatorPubkey);
    leafIndex = coordinatorState.nextLeafIndex;
  }

  const commitmentAccount = getCommitmentPda(
    coordinatorPubkey, 
    leafIndex
  );

  return await program.methods.shieldedDeposit(amountBn, commitmentBytes)
    .accounts({
      pool: new PublicKey(params.poolAddress),
      coordinator: new PublicKey(params.coordinatorAddress),
      commitmentAccount,
      tokenMint: new PublicKey(params.tokenAddress),
      user: new PublicKey(params.ownerAddress),
      userToken: userAta,
      poolTokenCustody: poolAta,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

export function buildSubmitMerkleRootTx(params: {
  coordinatorAddress: string;
  root: string;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey("Memo1UuS27vSdwMbsBv7mNoSqbiyfR3S66GE5Xq6E29"),
    keys: [],
    data: Buffer.from(`Sunset Merkle Root: ${params.root}`, "utf-8"),
  });
}

export function buildShieldedWithdrawTx(_params: {
  poolAddress: string;
  proofData?: string;
  calldata?: string[];
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey("Memo1UuS27vSdwMbsBv7mNoSqbiyfR3S66GE5Xq6E29"),
    keys: [],
    data: Buffer.from("Sunset Shield Withdraw", "utf-8"),
  });
}

export function buildShieldedSwapTx(_params: {
  poolAddress: string;
  proofData: string;
  sqrtPriceLimitX96: string;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey("Memo1UuS27vSdwMbsBv7mNoSqbiyfR3S66GE5Xq6E29"),
    keys: [],
    data: Buffer.from("Sunset Shield Swap", "utf-8"),
  });
}

export async function buildShieldedMintTx(params: {
  poolAddress: string;
  proofData: string;
  liquidityDelta: bigint;
  ownerAddress: string;
  coordinatorAddress: string;
}): Promise<TransactionInstruction> {
  const calldata = params.proofData.split(",");

  const inputs = {
    changeCommitment0: Array.from(Buffer.from(calldata[8].replace("0x", "").padStart(64, "0"), "hex")),
    changeCommitment1: Array.from(Buffer.from(calldata[9].replace("0x", "").padStart(64, "0"), "hex")),
    root: Array.from(Buffer.from(calldata[10].replace("0x", "").padStart(64, "0"), "hex")),
    nullifierHash0: Array.from(Buffer.from(calldata[11].replace("0x", "").padStart(64, "0"), "hex")),
    nullifierHash1: Array.from(Buffer.from(calldata[12].replace("0x", "").padStart(64, "0"), "hex")),
    positionCommitment: Array.from(Buffer.from(calldata[13].replace("0x", "").padStart(64, "0"), "hex")),
    tickLower: parseInt(calldata[14], 16),
    tickUpper: parseInt(calldata[15], 16),
  };

  const P = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;
  const aX = BigInt(calldata[0]);
  const aY = BigInt(calldata[1]);
  const aYNeg = P - (aY % P);

  const proofBufs = [
    aX, aYNeg, // pi_a (negated)
    BigInt(calldata[2]), BigInt(calldata[3]), // pi_b[0]
    BigInt(calldata[4]), BigInt(calldata[5]), // pi_b[1]
    BigInt(calldata[6]), BigInt(calldata[7])  // pi_c
  ].map(n => Buffer.from(n.toString(16).padStart(64, "0"), "hex"));

  const proof = Buffer.concat(proofBufs);

  // Derive PDAs
  const nullifierRecord0 = PublicKey.findProgramAddressSync(
    [Buffer.from("nullifier"), Buffer.from(inputs.nullifierHash0)],
    program.programId
  )[0];

  const nullifierRecord1 = PublicKey.findProgramAddressSync(
    [Buffer.from("nullifier"), Buffer.from(inputs.nullifierHash1)],
    program.programId
  )[0];

  const rootRecord = PublicKey.findProgramAddressSync(
    [Buffer.from("root"), Buffer.from(inputs.root)],
    program.programId
  )[0];

  const coordinatorPubkey = new PublicKey(params.coordinatorAddress);
  const coordinatorState = await (program.account as any).coordinatorState.fetch(coordinatorPubkey);
  const nextLeafIndex = coordinatorState.nextLeafIndex;

  const positionCommitmentAcc = getCommitmentPda(coordinatorPubkey, nextLeafIndex);
  const changeCommitment0Acc = getCommitmentPda(coordinatorPubkey, nextLeafIndex + 1);
  const changeCommitment1Acc = getCommitmentPda(coordinatorPubkey, nextLeafIndex + 2);

  return await program.methods.shieldedMint(inputs, proof, new BN(params.liquidityDelta.toString()))
    .accounts({
      pool: new PublicKey(params.poolAddress),
      coordinator: coordinatorPubkey,
      nullifierRecord0,
      nullifierRecord1,
      rootRecord,
      positionCommitmentAcc,
      changeCommitment0Acc,
      changeCommitment1Acc,
      payer: new PublicKey(params.ownerAddress),
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

export function buildShieldedBurnTx(_params: {
  poolAddress: string;
  proofData: string;
  positionCommitment: string;
  liquidityDelta: bigint;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey("Memo1UuS27vSdwMbsBv7mNoSqbiyfR3S66GE5Xq6E29"),
    keys: [],
    data: Buffer.from("Sunset Shield Burn", "utf-8"),
  });
}

export function buildPoolMintTx(_params: {
  poolAddress: string;
  liquidityDelta: bigint;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey("Memo1UuS27vSdwMbsBv7mNoSqbiyfR3S66GE5Xq6E29"),
    keys: [],
    data: Buffer.from("Sunset Pool Mint", "utf-8"),
  });
}

export function buildPoolSwapTx(_params: {
  poolAddress: string;
  amountIn: bigint;
  zeroForOne: boolean;
  sqrtPriceLimitX96: string;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey("Memo1UuS27vSdwMbsBv7mNoSqbiyfR3S66GE5Xq6E29"),
    keys: [],
    data: Buffer.from("Sunset Pool Swap", "utf-8"),
  });
}

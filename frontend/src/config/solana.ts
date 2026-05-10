import { PublicKey, TransactionInstruction, SystemProgram } from "@solana/web3.js";

export type SolanaTransactionRequest = TransactionInstruction;

export function buildErc20ApprovalTx(
  _tokenAddress: string,
  spenderAddress: string,
  amount: bigint,
  ownerAddress: string,
  _label: string,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [{ pubkey: new PublicKey(ownerAddress), isSigner: true, isWritable: false }],
    data: Buffer.from(`Sunset Token Approval: ${amount} to ${spenderAddress}`, "utf-8"),
  });
}

const MEMO_PROGRAM_ID = new PublicKey("Memo1UuS27vSdwMbsBv7mNoSqbiyfR3S66GE5Xq6E29");

export function buildShieldedDepositTx(params: {
  poolAddress: string;
  tokenAddress: string;
  amount: bigint;
  commitment: string;
  ownerAddress: string;
}): TransactionInstruction {
  // TEST: Native transfer to self to verify connectivity
  return SystemProgram.transfer({
    fromPubkey: new PublicKey(params.ownerAddress),
    toPubkey: new PublicKey(params.ownerAddress),
    lamports: 10000, // 0.00001 SOL
  });
}

export function buildSubmitMerkleRootTx(params: {
  coordinatorAddress: string;
  root: string;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
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
    programId: MEMO_PROGRAM_ID,
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
    programId: MEMO_PROGRAM_ID,
    keys: [],
    data: Buffer.from("Sunset Shield Swap", "utf-8"),
  });
}

export function buildShieldedMintTx(_params: {
  poolAddress: string;
  proofData: string;
  liquidityDelta: bigint;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [],
    data: Buffer.from("Sunset Shield Mint", "utf-8"),
  });
}

export function buildShieldedBurnTx(_params: {
  poolAddress: string;
  proofData: string;
  positionCommitment: string;
  liquidityDelta: bigint;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [],
    data: Buffer.from("Sunset Shield Burn", "utf-8"),
  });
}

export function buildPoolMintTx(_params: {
  poolAddress: string;
  liquidityDelta: bigint;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
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
    programId: MEMO_PROGRAM_ID,
    keys: [],
    data: Buffer.from("Sunset Pool Swap", "utf-8"),
  });
}

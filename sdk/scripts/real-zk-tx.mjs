import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import fs from "fs";
import path from "path";
import * as snarkjs from "snarkjs";
import { fileURLToPath } from "url";

// Libs from circuits
import { initPoseidon, hash } from "../../circuits/scripts/lib/poseidon.mjs";
import { MerkleTree } from "../../circuits/scripts/lib/merkle.mjs";
import { computeCommitment } from "../../circuits/scripts/lib/commitment.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("🚀 Starting Real ZK Transaction Test on Testnet...");
  await initPoseidon();

  // 1. Setup Connection & Wallet
  const connection = new Connection("https://api.testnet.solana.com", "confirmed");
  const secretKey = JSON.parse(fs.readFileSync("../contracts/anchor/deploy-key.json", "utf8"));
  const payer = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  const wallet = new anchor.Wallet(payer);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const idl = JSON.parse(fs.readFileSync("../contracts/anchor/target/idl/sunset.json", "utf8"));
  const programId = new PublicKey("73ZjypnCmuuTrg5wLRTZxUpj6wv6y2qvwGR97pHnL4Zy");
  const program = new anchor.Program(idl, provider);

  console.log("Connect to Program:", programId.toBase58());
  console.log("Payer Address:", payer.publicKey.toBase58());

  // 2. Initialize Coordinator & Pool
  const coordinatorKeypair = Keypair.generate();
  console.log("Initializing Coordinator:", coordinatorKeypair.publicKey.toBase58());
  
  await program.methods
    .initializeCoordinator(payer.publicKey)
    .accounts({
      coordinator: coordinatorKeypair.publicKey,
      owner: payer.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([coordinatorKeypair])
    .rpc();

  // Setup tokens
  console.log("Creating Test Tokens...");
  const token0Mint = await createMint(connection, payer, payer.publicKey, null, 9);
  const token1Mint = await createMint(connection, payer, payer.publicKey, null, 9);
  
  let [t0, t1] = [token0Mint, token1Mint];
  if (t0.toBase58() > t1.toBase58()) [t0, t1] = [t1, t0];

  const fee = 3000;
  const [poolPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool"),
      t0.toBuffer(),
      t1.toBuffer(),
      new anchor.BN(fee).toArrayLike(Buffer, "le", 4),
    ],
    programId
  );

  console.log("Creating Pool:", poolPda.toBase58());
  await program.methods
    .createPool({
      fee,
      tickSpacing: 60,
      tickLower: -887220,
      tickUpper: 887220,
      sqrtPriceLowerX96: new anchor.BN("4295128739"),
      sqrtPriceUpperX96: new anchor.BN("79228162514264337593543950336"),
      initialSqrtPriceX96: new anchor.BN("79228162514264337593543950336"),
      protocolFeeBps: 1000,
      feeRecipient: payer.publicKey,
    })
    .accounts({
      pool: poolPda,
      token0Mint: t0,
      token1Mint: t1,
      coordinator: coordinatorKeypair.publicKey,
      owner: payer.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  // 3. Shielded Deposit (Public -> Private)
  console.log("Performing Shielded Deposit...");
  const secret = "123456789";
  const nullifier = "987654321";
  const amount = 1000000n; // 0.001 tokens
  const tokenMint = t0;

  const { commitment, nullifierHash } = computeCommitment(
    secret, 
    nullifier, 
    amount, 
    0n, 
    BigInt("0x" + Buffer.from(tokenMint.toBytes()).toString("hex")).toString()
  );
  console.log("Commitment:", commitment);

  const [commitmentAcc] = PublicKey.findProgramAddressSync(
    [Buffer.from("commitment"), coordinatorKeypair.publicKey.toBuffer(), new anchor.BN(0).toArrayLike(Buffer, "le", 4)],
    programId
  );

  const userToken = await getOrCreateAssociatedTokenAccount(connection, payer, tokenMint, payer.publicKey);
  await mintTo(connection, payer, tokenMint, userToken.address, payer, 10_000_000);

  const poolTokenCustody = await getOrCreateAssociatedTokenAccount(connection, payer, tokenMint, poolPda, true);

  await program.methods
    .shieldedDeposit(new anchor.BN(amount.toString()), Array.from(Buffer.from(BigInt(commitment).toString(16).padStart(64, "0"), "hex")))
    .accounts({
      pool: poolPda,
      coordinator: coordinatorKeypair.publicKey,
      commitmentAccount: commitmentAcc,
      tokenMint: tokenMint,
      user: payer.publicKey,
      userToken: userToken.address,
      poolTokenCustody: poolTokenCustody.address,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Deposit Successful.");

  // 4. Submit Root to Solana
  const root = commitment;
  console.log("Submitting Root:", root);
  const [rootRecordPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("root"), Buffer.from(BigInt(root).toString(16).padStart(64, "0"), "hex")],
    programId
  );

  await program.methods
    .submitRoot(Array.from(Buffer.from(BigInt(root).toString(16).padStart(64, "0"), "hex")))
    .accounts({
      coordinator: coordinatorKeypair.publicKey,
      rootRecord: rootRecordPda,
      submitter: payer.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  // 5. Generate Real ZK Proof for Withdrawal
  console.log("Generating ZK Proof for Withdrawal...");
  const tree = new MerkleTree();
  tree.insert(commitment);
  const proofData = tree.getProof(0);

  const circuitInputs = {
    secret,
    nullifier,
    amount_low: amount.toString(),
    amount_high: "0",
    token: BigInt("0x" + Buffer.from(tokenMint.toBytes()).toString("hex")).toString(),
    recipient: BigInt("0x" + Buffer.from(payer.publicKey.toBytes()).toString("hex")).toString(),
    nullifierHash: nullifierHash,
    root: proofData.root,
    pathElements: proofData.pathElements,
    pathIndices: proofData.pathIndices,
  };

  const wasmPath = path.join(__dirname, "../artifacts/membership/membership_js/membership.wasm");
  const zkeyPath = path.join(__dirname, "../artifacts/membership/membership_final.zkey");

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(circuitInputs, wasmPath, zkeyPath);
  console.log("ZK Proof Generated!");

  // 6. Submit ZK Proof to Solana
  console.log("Submitting ZK Proof to Solana...");
  
  const proofA = proof.pi_a.slice(0, 2).map(x => BigInt(x));
  const proofB = [
    [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
    [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])]
  ];
  const proofC = proof.pi_c.slice(0, 2).map(x => BigInt(x));

  const proofBuffer = Buffer.alloc(256);
  const writeBigInt = (buf, bi, offset) => {
    const hex = bi.toString(16).padStart(64, "0");
    buf.write(hex, offset, "hex");
  };

  writeBigInt(proofBuffer, proofA[0], 0);
  writeBigInt(proofBuffer, proofA[1], 32);
  writeBigInt(proofBuffer, proofB[0][0], 64);
  writeBigInt(proofBuffer, proofB[0][1], 96);
  writeBigInt(proofBuffer, proofB[1][0], 128);
  writeBigInt(proofBuffer, proofB[1][1], 160);
  writeBigInt(proofBuffer, proofC[0], 192);
  writeBigInt(proofBuffer, proofC[1], 224);

  const withdrawInputs = {
    root: Array.from(Buffer.from(BigInt(proofData.root).toString(16).padStart(64, "0"), "hex")),
    nullifierHash: Array.from(Buffer.from(BigInt(nullifierHash).toString(16).padStart(64, "0"), "hex")),
    amount: new anchor.BN(amount.toString()),
    token: tokenMint,
  };

  const [nullifierRecordPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("nullifier"), Buffer.from(withdrawInputs.nullifierHash)],
    programId
  );

  const recipientToken = await getOrCreateAssociatedTokenAccount(connection, payer, tokenMint, payer.publicKey);

  const tx = await program.methods
    .shieldedWithdraw(withdrawInputs, proofBuffer)
    .accounts({
      pool: poolPda,
      poolPda: poolPda,
      coordinator: coordinatorKeypair.publicKey,
      nullifierRecord: nullifierRecordPda,
      rootRecord: rootRecordPda,
      payer: payer.publicKey,
      poolTokenCustody: poolTokenCustody.address,
      recipientToken: recipientToken.address,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("✅ REAL ZK WITHDRAWAL SUCCESSFUL!");
  console.log("Transaction Signature:", tx);
  console.log("View on Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=testnet`);
}

main().catch(console.error);

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Zylith } from "../target/types/zylith";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import fs from "fs";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Zylith as Program<Zylith>;
  const owner = (provider.wallet as anchor.Wallet).payer;

  console.log("Owner pubkey:", owner.publicKey.toBase58());

  // 1. Initialize Coordinator
  const coordinatorKeypair = Keypair.generate();
  console.log("Initializing Coordinator...", coordinatorKeypair.publicKey.toBase58());
  
  await program.methods
    .initializeCoordinator(owner.publicKey)
    .accounts({
      coordinator: coordinatorKeypair.publicKey,
      owner: owner.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([coordinatorKeypair])
    .rpc();

  console.log("Coordinator initialized!");

  // 2. Create Mints
  console.log("Creating Mints...");
  let token0Mint = await createMint(provider.connection, owner, owner.publicKey, null, 9);
  let token1Mint = await createMint(provider.connection, owner, owner.publicKey, null, 9);

  if (token0Mint.toBase58() > token1Mint.toBase58()) {
    [token0Mint, token1Mint] = [token1Mint, token0Mint];
  }

  console.log("Token 0:", token0Mint.toBase58());
  console.log("Token 1:", token1Mint.toBase58());

  // 3. Create Pool
  const fee = 3000;
  const [poolPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool"),
      token0Mint.toBuffer(),
      token1Mint.toBuffer(),
      new anchor.BN(fee).toArrayLike(Buffer, "le", 4),
    ],
    program.programId
  );

  console.log("Initializing Pool...", poolPda.toBase58());

  const config = {
    fee,
    tickSpacing: 60,
    tickLower: -887220,
    tickUpper: 887220,
    sqrtPriceLowerX96: new anchor.BN("4295128739"),
    sqrtPriceUpperX96: new anchor.BN("79228162514264337593543950336"),
    initialSqrtPriceX96: new anchor.BN("79228162514264337593543950336"),
    protocolFeeBps: 1000,
    feeRecipient: owner.publicKey,
  };

  await program.methods
    .createPool(config)
    .accounts({
      pool: poolPda,
      token0Mint,
      token1Mint,
      coordinator: coordinatorKeypair.publicKey,
      owner: owner.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Pool initialized!");
  console.log("=== RESULTS ===");
  console.log("COORDINATOR_ACCOUNT=" + coordinatorKeypair.publicKey.toBase58());
  console.log("POOL_ACCOUNT=" + poolPda.toBase58());
  console.log("TOKEN_0=" + token0Mint.toBase58());
  console.log("TOKEN_1=" + token1Mint.toBase58());
}

main().catch(console.error);

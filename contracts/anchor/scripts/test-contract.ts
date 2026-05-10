/**
 * Zylith Protocol — Testnet Integration Test
 *
 * Flow:
 *   1. Initialize Coordinator
 *   2. Create two SPL test mints (WBTC-mock, USDT0-mock)
 *   3. Mint tokens to deployer ATA
 *   4. Create Pool (PDA)
 *   5. Create pool custody token accounts
 *   6. Shielded Deposit (token0)
 *
 * Run: bun run scripts/test-contract.ts
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import bs58 from "bs58";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── Config ──────────────────────────────────────────────────────────────────
const RPC_URL = "https://api.testnet.solana.com";
const PROGRAM_ID = new PublicKey("4veoW1BT88Zie54ebWE8eKjW3nqe2cStMCMfxv9xwzgs");

// Load deployer keypair from deploy-key.json
const keyPath = resolve(import.meta.dir, "../deploy-key.json");
const keyBytes = JSON.parse(readFileSync(keyPath, "utf8"));
const deployer = Keypair.fromSecretKey(new Uint8Array(keyBytes));

console.log("🔑 Deployer:", deployer.publicKey.toBase58());

// ── Anchor IDL (minimal inline) ──────────────────────────────────────────────
// We use raw instruction building since IDL is not generated yet
const connection = new Connection(RPC_URL, "confirmed");
const wallet = new anchor.Wallet(deployer);
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
anchor.setProvider(provider);

// ── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function logBalance() {
  const bal = await connection.getBalance(deployer.publicKey);
  console.log(`   Balance: ${(bal / 1e9).toFixed(4)} SOL`);
}

// ── Discriminators (sha256("global:<ix_name>")[0..8]) ────────────────────────
// Pre-computed anchor discriminators for our instructions
function discriminator(name: string): Buffer {
  const { createHash } = require("crypto");
  const preimage = `global:${name}`;
  return createHash("sha256").update(preimage).digest().slice(0, 8);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n══════════════════════════════════════");
  console.log("  Zylith Protocol — Testnet E2E Test");
  console.log("══════════════════════════════════════\n");
  await logBalance();

  // ── STEP 1: Initialize Coordinator ─────────────────────────────────────────
  console.log("\n▶  STEP 1: Initialize Coordinator");
  const coordinatorKp = Keypair.generate();
  console.log("   Coordinator address:", coordinatorKp.publicKey.toBase58());

  {
    const disc = discriminator("initialize_coordinator");
    // Serialize args: initial_root_submitter (Pubkey = 32 bytes)
    const data = Buffer.concat([disc, deployer.publicKey.toBuffer()]);

    const ix = new anchor.web3.TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: coordinatorKp.publicKey, isSigner: true, isWritable: true },
        { pubkey: deployer.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(
      connection,
      tx,
      [deployer, coordinatorKp],
      { commitment: "confirmed" }
    );
    console.log("   ✅ Coordinator initialized! Tx:", sig);
  }

  // ── STEP 2: Create two test SPL mints ──────────────────────────────────────
  console.log("\n▶  STEP 2: Create test mints (WBTC-mock, USDT0-mock)");

  const mint0 = await createMint(
    connection,
    deployer,
    deployer.publicKey,  // mint authority
    null,
    8,                   // decimals (like WBTC)
    undefined,
    { commitment: "confirmed" },
    TOKEN_PROGRAM_ID
  );
  console.log("   ✅ token0 (WBTC-mock):", mint0.toBase58());

  const mint1 = await createMint(
    connection,
    deployer,
    deployer.publicKey,
    null,
    6,                   // decimals (like USDT)
    undefined,
    { commitment: "confirmed" },
    TOKEN_PROGRAM_ID
  );
  console.log("   ✅ token1 (USDT0-mock):", mint1.toBase58());

  // Ensure mint0 < mint1 lexicographically (Solana convention for pool pairs)
  const [token0, token1] =
    mint0.toBuffer().compare(mint1.toBuffer()) < 0
      ? [mint0, mint1]
      : [mint1, mint0];

  console.log("   Ordered token0:", token0.toBase58());
  console.log("   Ordered token1:", token1.toBase58());

  // ── STEP 3: Mint tokens to deployer ────────────────────────────────────────
  console.log("\n▶  STEP 3: Mint tokens to deployer ATAs");

  const ata0 = await getOrCreateAssociatedTokenAccount(
    connection, deployer, token0, deployer.publicKey
  );
  const ata1 = await getOrCreateAssociatedTokenAccount(
    connection, deployer, token1, deployer.publicKey
  );

  await mintTo(connection, deployer, token0, ata0.address, deployer, 5_000_000_000); // 50 WBTC-mock
  await mintTo(connection, deployer, token1, ata1.address, deployer, 100_000_000_000); // 100k USDT0-mock
  console.log("   ✅ Minted 50 WBTC-mock and 100k USDT0-mock to deployer");

  // ── STEP 4: Create Pool ─────────────────────────────────────────────────────
  console.log("\n▶  STEP 4: Create Pool (PDA)");

  const FEE = 3000; // 0.30%
  const feeBuf = Buffer.alloc(4);
  feeBuf.writeUInt32LE(FEE);

  const [poolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), token0.toBuffer(), token1.toBuffer(), feeBuf],
    PROGRAM_ID
  );
  console.log("   Pool PDA:", poolPda.toBase58());

  {
    // sqrtPrice for 1 WBTC = ~60,000 USDT → sqrt(60000) * 2^48 ≈ 2.17e16
    // Using a simplified price ratio
    const sqrtPriceLower = BigInt("56022770974786143748341366784"); // price ~0.5x
    const sqrtPriceUpper = BigInt("112045541949572287496682733568"); // price ~2x
    const sqrtPriceInit  = BigInt("79228162514264337593543950336"); // price 1:1 scaled

    const disc = discriminator("create_pool");

    // PoolConfigParams serialization:
    // fee: u32, tick_spacing: u32, tick_lower: i32, tick_upper: i32,
    // sqrt_price_lower_x96: u128, sqrt_price_upper_x96: u128,
    // initial_sqrt_price_x96: u128, protocol_fee_bps: u16, fee_recipient: Pubkey
    const buf = Buffer.alloc(4 + 4 + 4 + 4 + 16 + 16 + 16 + 2 + 32);
    let offset = 0;
    buf.writeUInt32LE(FEE, offset); offset += 4;             // fee
    buf.writeUInt32LE(60, offset); offset += 4;              // tick_spacing
    buf.writeInt32LE(-887220, offset); offset += 4;          // tick_lower (full range)
    buf.writeInt32LE(887220, offset); offset += 4;           // tick_upper (full range)
    writeLEBigInt128(buf, sqrtPriceLower, offset); offset += 16;
    writeLEBigInt128(buf, sqrtPriceUpper, offset); offset += 16;
    writeLEBigInt128(buf, sqrtPriceInit, offset); offset += 16;
    buf.writeUInt16LE(100, offset); offset += 2;             // protocol_fee_bps (1%)
    deployer.publicKey.toBuffer().copy(buf, offset);         // fee_recipient

    const data = Buffer.concat([disc, buf]);

    const ix = new anchor.web3.TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: poolPda, isSigner: false, isWritable: true },
        { pubkey: token0, isSigner: false, isWritable: false },
        { pubkey: token1, isSigner: false, isWritable: false },
        { pubkey: coordinatorKp.publicKey, isSigner: false, isWritable: false },
        { pubkey: deployer.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [deployer], {
      commitment: "confirmed",
    });
    console.log("   ✅ Pool created! Tx:", sig);
  }

  // ── STEP 5: Create pool token custody accounts ─────────────────────────────
  console.log("\n▶  STEP 5: Create pool custody token accounts");

  const poolCustody0 = await getOrCreateAssociatedTokenAccount(
    connection, deployer, token0, poolPda, true  // allowOwnerOffCurve=true for PDA
  );
  const poolCustody1 = await getOrCreateAssociatedTokenAccount(
    connection, deployer, token1, poolPda, true
  );
  console.log("   ✅ Custody ATA token0:", poolCustody0.address.toBase58());
  console.log("   ✅ Custody ATA token1:", poolCustody1.address.toBase58());

  // ── STEP 6: Shielded Deposit ────────────────────────────────────────────────
  console.log("\n▶  STEP 6: Shielded Deposit (0.001 WBTC-mock)");

  const depositAmount = BigInt(100_000); // 0.001 WBTC-mock (8 decimals)

  // Dummy commitment for testing (in production this comes from the ZK circuit)
  const commitment = Buffer.alloc(32);
  commitment.writeUInt32LE(1337, 0); // deterministic test commitment

  const leafIndex = 0; // first deposit, coordinator.next_leaf_index = 0
  const leafBuf = Buffer.alloc(4);
  leafBuf.writeUInt32LE(leafIndex);

  const [commitmentPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("commitment"), leafBuf],
    PROGRAM_ID
  );
  console.log("   Commitment PDA:", commitmentPda.toBase58());

  {
    const disc = discriminator("shielded_deposit");

    // Args: amount: u64, commitment: [u8; 32]
    const buf = Buffer.alloc(8 + 32);
    writeLEBigInt64(buf, depositAmount, 0);
    commitment.copy(buf, 8);

    const data = Buffer.concat([disc, buf]);

    const ix = new anchor.web3.TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: poolPda, isSigner: false, isWritable: true },
        { pubkey: coordinatorKp.publicKey, isSigner: false, isWritable: true },
        { pubkey: commitmentPda, isSigner: false, isWritable: true },
        { pubkey: token0, isSigner: false, isWritable: false },
        { pubkey: deployer.publicKey, isSigner: true, isWritable: true },
        { pubkey: ata0.address, isSigner: false, isWritable: true },
        { pubkey: poolCustody0.address, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [deployer], {
      commitment: "confirmed",
    });
    console.log("   ✅ Shielded deposit successful! Tx:", sig);
    console.log(
      `   Deposited: ${Number(depositAmount) / 1e8} WBTC-mock into pool shield`
    );
  }

  // ── Final Summary ────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════");
  console.log("  ✅ ALL STEPS PASSED");
  console.log("══════════════════════════════════════");
  console.log("\n📋 Contract State:");
  console.log("   Program ID     :", PROGRAM_ID.toBase58());
  console.log("   Coordinator    :", coordinatorKp.publicKey.toBase58());
  console.log("   Pool PDA       :", poolPda.toBase58());
  console.log("   token0 (WBTC)  :", token0.toBase58());
  console.log("   token1 (USDT0) :", token1.toBase58());
  console.log("   Commitment PDA :", commitmentPda.toBase58());
  console.log("\nView on Explorer:");
  console.log(
    `   https://explorer.solana.com/address/${poolPda.toBase58()}?cluster=testnet`
  );
  await logBalance();
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function writeLEBigInt128(buf: Buffer, value: bigint, offset: number) {
  const lo = value & BigInt("0xFFFFFFFFFFFFFFFF");
  const hi = (value >> BigInt(64)) & BigInt("0xFFFFFFFFFFFFFFFF");
  buf.writeBigUInt64LE(lo, offset);
  buf.writeBigUInt64LE(hi, offset + 8);
}

function writeLEBigInt64(buf: Buffer, value: bigint, offset: number) {
  buf.writeBigUInt64LE(value, offset);
}

main().catch((err) => {
  console.error("\n❌ ERROR:", err.message ?? err);
  if (err.logs) {
    console.error("\nProgram logs:");
    err.logs.forEach((l: string) => console.error("  ", l));
  }
  process.exit(1);
});

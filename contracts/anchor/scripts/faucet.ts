import * as anchor from "@coral-xyz/anchor";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const owner = (provider.wallet as anchor.Wallet).payer;

  const userPubkey = new PublicKey("GHgkW4JbB15pmg9C6Gv3io2fSBQYiVLRwKafzuGBZyyS");
  const poolPda = new PublicKey("4L4exJv9boEpSVpMoQvUX6n7KMagvFyj5kF127rQPuCa");

  const token0 = new PublicKey("4AZXbzLhUUfQ8PCAdSTcPHuh86KJdBB5Z2YeGvZswhbz");
  const token1 = new PublicKey("5jUt2tNKAC1vMhRUD36xYLEjWTmZgF1fs7bUGxUSBcVt");

  console.log("Minting to:", userPubkey.toBase58());

  // 1,000,000 tokens (with 9 decimals)
  const amount = 1_000_000_000_000_000n;

  for (const tokenMint of [token0, token1]) {
    console.log(`Setting up ATA for user...`);
    const userAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      owner,
      tokenMint,
      userPubkey
    );

    console.log(`Setting up ATA for pool...`);
    const poolAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      owner,
      tokenMint,
      poolPda,
      true
    );

    console.log(`Minting to ${userAta.address.toBase58()}...`);
    await mintTo(
      provider.connection,
      owner,
      tokenMint,
      userAta.address,
      owner,
      amount
    );
  }

  console.log("Tokens minted and pool ATAs initialized successfully!");
}

main().catch(console.error);

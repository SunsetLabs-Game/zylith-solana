import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Zylith } from "../target/types/zylith";
import { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Zylith as Program<Zylith>;
  const owner = (provider.wallet as anchor.Wallet).payer;

  console.log("Owner pubkey:", owner.publicKey.toBase58());

  // Existing coordinator and tokens
  const coordinatorPubkey = new PublicKey("2KXDXvUn7qkZk3HddpJYt2TkdtqfAjpPDBTwyouopQmC");
  const token0Mint = new PublicKey("4AZXbzLhUUfQ8PCAdSTcPHuh86KJdBB5Z2YeGvZswhbz");
  const token1Mint = new PublicKey("5jUt2tNKAC1vMhRUD36xYLEjWTmZgF1fs7bUGxUSBcVt");

  // Define new fee and derive Pool PDA
  const fee = 3001; 
  const [poolPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool"),
      token0Mint.toBuffer(),
      token1Mint.toBuffer(),
      new anchor.BN(fee).toArrayLike(Buffer, "le", 4),
    ],
    program.programId
  );

  console.log("New Pool PDA:", poolPda.toBase58());

  // Define pool config with correct bounds
  // sqrtPriceLowerX96 = 4295128739 (~2^32)
  // sqrtPriceUpperX96 = 1329227995784915872903807060280344576 (~2^120)
  // initialSqrtPriceX96 = 79228162514264337593543950336 (~2^96)
  const config = {
    fee,
    tickSpacing: 60,
    tickLower: -887220,
    tickUpper: 887220,
    sqrtPriceLowerX96: new anchor.BN("4295128739"),
    sqrtPriceUpperX96: new anchor.BN("1329227995784915872903807060280344576"),
    initialSqrtPriceX96: new anchor.BN("79228162514264337593543950336"),
    protocolFeeBps: 1000,
    feeRecipient: owner.publicKey,
  };

  // console.log("Initializing Pool on-chain...");
  // await program.methods
  //   .createPool(config)
  //   .accounts({
  //     pool: poolPda,
  //     token0Mint,
  //     token1Mint,
  //     coordinator: coordinatorPubkey,
  //     owner: owner.publicKey,
  //     systemProgram: SystemProgram.programId,
  //   })
  //   .rpc();

  // console.log("Pool initialized successfully!");

  // Now let's mint some initial liquidity to this new pool to populate both reserve0 and reserve1!
  console.log("Setting up ATAs for the owner to mint liquidity...");
  const ownerAta0 = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    owner,
    token0Mint,
    owner.publicKey
  );
  const ownerAta1 = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    owner,
    token1Mint,
    owner.publicKey
  );

  console.log("Minting some initial tokens to owner ATAs...");
  // Mint 10,000 tokens (with 9 decimals)
  const amountToMint = 10_000_000_000_000n;
  await mintTo(provider.connection, owner, token0Mint, ownerAta0.address, owner, amountToMint);
  await mintTo(provider.connection, owner, token1Mint, ownerAta1.address, owner, amountToMint);

  console.log("Setting up ATAs for the pool...");
  const poolAta0 = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    owner,
    token0Mint,
    poolPda,
    true
  );
  const poolAta1 = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    owner,
    token1Mint,
    poolPda,
    true
  );

  const [positionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("position"), poolPda.toBuffer(), owner.publicKey.toBuffer()],
    program.programId
  );

  console.log("Minting public liquidity to the pool...");
  // Mint 1,000,000,000 liquidity delta
  await program.methods
    .mint(new anchor.BN("1000000000"))
    .accounts({
      pool: poolPda,
      position: positionPda,
      user: owner.publicKey,
      userToken0: ownerAta0.address,
      userToken1: ownerAta1.address,
      poolToken0: poolAta0.address,
      poolToken1: poolAta1.address,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Liquidity minted successfully!");
  console.log("=== NEW POOL INFO ===");
  console.log("POOL_ACCOUNT=" + poolPda.toBase58());
}

main().catch(console.error);

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Zylith } from "../target/types/zylith";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

describe("zylith", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Zylith as Program<Zylith>;
  const owner = (provider.wallet as anchor.Wallet).payer;

  let coordinatorKeypair = Keypair.generate();
  let token0Mint: PublicKey;
  let token1Mint: PublicKey;
  let poolPda: PublicKey;

  before(async () => {
    // Setup tokens
    token0Mint = await createMint(
      provider.connection,
      owner,
      owner.publicKey,
      null,
      9
    );
    token1Mint = await createMint(
      provider.connection,
      owner,
      owner.publicKey,
      null,
      9
    );

    // Sort tokens to match canonical ordering
    if (token0Mint.toBase58() > token1Mint.toBase58()) {
      [token0Mint, token1Mint] = [token1Mint, token0Mint];
    }
  });

  it("Initializes Coordinator", async () => {
    await program.methods
      .initializeCoordinator(owner.publicKey)
      .accounts({
        coordinator: coordinatorKeypair.publicKey,
        owner: owner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([coordinatorKeypair])
      .rpc();

    const state = await program.account.coordinatorState.fetch(
      coordinatorKeypair.publicKey
    );
    expect(state.owner.toBase58()).to.equal(owner.publicKey.toBase58());
    expect(state.nextLeafIndex).to.equal(0);
  });

  it("Creates a Pool", async () => {
    const fee = 3000;
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("pool"),
        token0Mint.toBuffer(),
        token1Mint.toBuffer(),
        new anchor.BN(fee).toArrayLike(Buffer, "le", 4),
      ],
      program.programId
    );
    poolPda = pda;

    const config = {
      fee,
      tickSpacing: 60,
      tickLower: -887220,
      tickUpper: 887220,
      sqrtPriceLowerX96: new anchor.BN("4295128739"),
      sqrtPriceUpperX96: new anchor.BN("79228162514264337593543950336"), // Same as initial for testing
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

    const state = await program.account.poolState.fetch(poolPda);
    expect(state.token0.toBase58()).to.equal(token0Mint.toBase58());
    expect(state.fee).to.equal(fee);
  });

  it("Mints Public Liquidity", async () => {
    const userToken0 = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      owner,
      token0Mint,
      owner.publicKey
    );
    const userToken1 = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      owner,
      token1Mint,
      owner.publicKey
    );

    await mintTo(
      provider.connection,
      owner,
      token0Mint,
      userToken0.address,
      owner,
      1_000_000_000
    );
    await mintTo(
      provider.connection,
      owner,
      token1Mint,
      userToken1.address,
      owner,
      1_000_000_000
    );

    const poolToken0 = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      owner,
      token0Mint,
      poolPda,
      true
    );
    const poolToken1 = await getOrCreateAssociatedTokenAccount(
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

    await program.methods
      .mint(new anchor.BN(1000000))
      .accounts({
        pool: poolPda,
        position: positionPda,
        user: owner.publicKey,
        userToken0: userToken0.address,
        userToken1: userToken1.address,
        poolToken0: poolToken0.address,
        poolToken1: poolToken1.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const pos = await program.account.positionState.fetch(positionPda);
    expect(pos.liquidity.toNumber()).to.be.greaterThan(0);
  });

  it("Rejects Shielded Mint with Fake ZK Proof", async () => {
    // Generate a fake proof buffer (256 bytes for Groth16)
    const fakeProof = Buffer.alloc(256, 1);

    // Mock inputs that match the structure of MintPublicInputs
    const inputs = {
      root: Array(32).fill(0),
      nullifierHash0: Array(32).fill(1),
      nullifierHash1: Array(32).fill(2),
      positionCommitment: Array(32).fill(3),
      tickLower: 0,
      tickUpper: 10,
      changeCommitment0: Array(32).fill(4),
      changeCommitment1: Array(32).fill(5),
    };

    const nullifierRecord0Pda = PublicKey.findProgramAddressSync(
      [Buffer.from("nullifier"), Buffer.from(inputs.nullifierHash0)],
      program.programId
    )[0];

    const nullifierRecord1Pda = PublicKey.findProgramAddressSync(
      [Buffer.from("nullifier"), Buffer.from(inputs.nullifierHash1)],
      program.programId
    )[0];

    const rootRecordPda = PublicKey.findProgramAddressSync(
      [Buffer.from("root"), Buffer.from(inputs.root)],
      program.programId
    )[0];

    const positionCommitmentPda = Keypair.generate().publicKey;

    // Initialize the root record so Anchor account validation passes
    await program.methods
      .submitRoot(inputs.root)
      .accounts({
        coordinator: coordinatorKeypair.publicKey,
        rootRecord: rootRecordPda,
        submitter: owner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    try {
      await program.methods
        .shieldedMint(inputs, fakeProof, new anchor.BN(100))
        .accounts({
          pool: poolPda,
          coordinator: coordinatorKeypair.publicKey,
          nullifierRecord0: nullifierRecord0Pda,
          nullifierRecord1: nullifierRecord1Pda,
          rootRecord: rootRecordPda,
          positionCommitmentAcc: positionCommitmentPda,
          changeCommitment0Acc: Keypair.generate().publicKey,
          changeCommitment1Acc: Keypair.generate().publicKey,
          payer: owner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      expect.fail("Transaction should have failed with InvalidProof");
    } catch (err: any) {
      expect(err.message).to.include("Invalid ZK Proof");
    }
  });

  it("Rejects Shielded Swap with Fake ZK Proof", async () => {
    const fakeProof = Buffer.alloc(256, 1);
    const inputs = {
      root: Array(32).fill(10), // Use a different root for variety
      nullifierHash: Array(32).fill(11),
      newCommitment: Array(32).fill(12),
      changeCommitment: Array(32).fill(13),
      tokenIn: token0Mint,
      tokenOut: token1Mint,
      amountIn: new anchor.BN(1000),
      amountOutMin: new anchor.BN(900),
    };

    const rootRecordPda = PublicKey.findProgramAddressSync(
      [Buffer.from("root"), Buffer.from(inputs.root)],
      program.programId
    )[0];

    await program.methods
      .submitRoot(inputs.root)
      .accounts({
        coordinator: coordinatorKeypair.publicKey,
        rootRecord: rootRecordPda,
        submitter: owner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const nullifierRecordPda = PublicKey.findProgramAddressSync(
      [Buffer.from("nullifier"), Buffer.from(inputs.nullifierHash)],
      program.programId
    )[0];

    try {
      await program.methods
        .shieldedSwap(inputs, fakeProof, new anchor.BN(0))
        .accounts({
          pool: poolPda,
          coordinator: coordinatorKeypair.publicKey,
          nullifierRecord: nullifierRecordPda,
          rootRecord: rootRecordPda,
          newCommitmentAcc: Keypair.generate().publicKey,
          changeCommitmentAcc: Keypair.generate().publicKey,
          payer: owner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have failed");
    } catch (err: any) {
      expect(err.message).to.include("Invalid ZK Proof");
    }
  });

  it("Rejects Shielded Burn with Fake ZK Proof", async () => {
    const fakeProof = Buffer.alloc(256, 1);
    const inputs = {
      newCommitment0: Array(32).fill(20),
      newCommitment1: Array(32).fill(21),
      root: Array(32).fill(22),
      positionNullifierHash: Array(32).fill(23),
      tickLower: 0,
      tickUpper: 10,
    };

    const rootRecordPda = PublicKey.findProgramAddressSync(
      [Buffer.from("root"), Buffer.from(inputs.root)],
      program.programId
    )[0];

    await program.methods
      .submitRoot(inputs.root)
      .accounts({
        coordinator: coordinatorKeypair.publicKey,
        rootRecord: rootRecordPda,
        submitter: owner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const nullifierRecordPda = PublicKey.findProgramAddressSync(
      [Buffer.from("nullifier"), Buffer.from(inputs.positionNullifierHash)],
      program.programId
    )[0];

    try {
      await program.methods
        .shieldedBurn(inputs, fakeProof, new anchor.BN(500))
        .accounts({
          pool: poolPda,
          coordinator: coordinatorKeypair.publicKey,
          positionNullifierRecord: nullifierRecordPda,
          rootRecord: rootRecordPda,
          newCommitment0Acc: Keypair.generate().publicKey,
          newCommitment1Acc: Keypair.generate().publicKey,
          payer: owner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have failed");
    } catch (err: any) {
      expect(err.message).to.include("Invalid ZK Proof");
    }
  });
});

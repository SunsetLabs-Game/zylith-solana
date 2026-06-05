import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

export const ZYLITH_PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID || "4CNqqTnGEMYqWkE4VCS7cRy3tAJcrPGGMvM9dyFmJwp9"
);

export function getPoolPda(token0: PublicKey, token1: PublicKey, fee: number): PublicKey {
  const [tokenA, tokenB] = token0.toBase58() < token1.toBase58() 
    ? [token0, token1] 
    : [token1, token0];
  
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool"),
      tokenA.toBuffer(),
      tokenB.toBuffer(),
      new BN(fee).toArrayLike(Buffer, "le", 4),
    ],
    ZYLITH_PROGRAM_ID
  )[0];
}

export function getCommitmentPda(coordinator: PublicKey, leafIndex: number): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("commitment"),
      coordinator.toBuffer(),
      new BN(leafIndex).toArrayLike(Buffer, "le", 4),
    ],
    ZYLITH_PROGRAM_ID
  )[0];
}

export function getRootRecordPda(rootHex: string): PublicKey {
  const rootBytes = Buffer.from(rootHex.replace("0x", ""), "hex");
  return PublicKey.findProgramAddressSync(
    [Buffer.from("root"), rootBytes],
    ZYLITH_PROGRAM_ID
  )[0];
}

export function getNullifierRecordPda(nullifierHashHex: string): PublicKey {
  const nullifierBytes = Buffer.from(nullifierHashHex.replace("0x", ""), "hex");
  return PublicKey.findProgramAddressSync(
    [Buffer.from("nullifier"), nullifierBytes],
    ZYLITH_PROGRAM_ID
  )[0];
}

export function getPositionPda(pool: PublicKey, user: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("position"), pool.toBuffer(), user.toBuffer()],
    ZYLITH_PROGRAM_ID
  )[0];
}

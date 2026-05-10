import { PublicKey } from "@solana/web3.js";

export interface ZylithProgramIds {
  pool: string;
  coordinator: string;
}

export function assertProgramIds(programs: ZylithProgramIds): ZylithProgramIds {
  try {
    new PublicKey(programs.pool);
  } catch {
    throw new Error("programs.pool must be a valid Solana PublicKey");
  }

  try {
    new PublicKey(programs.coordinator);
  } catch {
    throw new Error("programs.coordinator must be a valid Solana PublicKey");
  }

  return programs;
}

export type ZylithContractAddresses = ZylithProgramIds;
export const assertContractAddresses = assertProgramIds;


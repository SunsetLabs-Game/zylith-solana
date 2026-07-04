import { PublicKey } from "@solana/web3.js";
export function assertProgramIds(programs) {
    try {
        new PublicKey(programs.pool);
    }
    catch {
        throw new Error("programs.pool must be a valid Solana PublicKey");
    }
    try {
        new PublicKey(programs.coordinator);
    }
    catch {
        throw new Error("programs.coordinator must be a valid Solana PublicKey");
    }
    return programs;
}
export const assertContractAddresses = assertProgramIds;
//# sourceMappingURL=contracts.js.map
import type { MerkleProof } from "../../crypto/merkle.js";
export interface MembershipCircuitInputs {
    root: string;
    nullifierHash: string;
    recipient: string;
    secret: string;
    nullifier: string;
    amount_low: string;
    amount_high: string;
    token: string;
    pathElements: string[];
    pathIndices: number[];
}
/** Build circuit inputs for a membership proof (withdrawal) */
export declare function generateMembershipInputs(secret: string, nullifier: string, amount: bigint, token: string, recipient: string, merkleProof: MerkleProof): MembershipCircuitInputs;
//# sourceMappingURL=membership.d.ts.map
/** Input generator for the membership circuit */
import { computeCommitment } from "../../crypto/commitment.js";
import { u256Split, tokenToBigInt2 } from "../../utils/conversions.js";
/** Build circuit inputs for a membership proof (withdrawal) */
export function generateMembershipInputs(secret, nullifier, amount, token, recipient, merkleProof) {
    const { low, high } = u256Split(amount);
    const { nullifierHash } = computeCommitment(secret, nullifier, low.toString(), high.toString(), token);
    return {
        root: merkleProof.root,
        nullifierHash,
        recipient: tokenToBigInt2(recipient).toString(),
        secret,
        nullifier,
        amount_low: low.toString(),
        amount_high: high.toString(),
        token: tokenToBigInt2(token).toString(),
        pathElements: merkleProof.pathElements,
        pathIndices: merkleProof.pathIndices,
    };
}
//# sourceMappingURL=membership.js.map
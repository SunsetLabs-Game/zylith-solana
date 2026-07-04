import { computeCommitment } from "../crypto/commitment.js";
import { u256Split, decimalToHex } from "../utils/conversions.js";
export async function deposit(params, asp, noteManager) {
    const { low, high } = u256Split(params.amount);
    const { commitment } = computeCommitment(params.secret, params.nullifier, low.toString(), high.toString(), params.token);
    const response = await asp.deposit({
        commitment: decimalToHex(commitment),
    });
    const note = noteManager.addNote({
        secret: params.secret,
        nullifier: params.nullifier,
        amount: params.amount,
        token: params.token,
        leafIndex: response.leaf_index,
    });
    // Leaf index might already be set by addNote, but ensure from response
    noteManager.setLeafIndex(note.commitment, response.leaf_index);
    return {
        calldata: response.calldata,
        leafIndex: response.leaf_index,
        commitment,
        root: response.root,
    };
}
//# sourceMappingURL=deposit.js.map
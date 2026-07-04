/** Input generator for the swap circuit */
import { computeCommitment } from "../../crypto/commitment.js";
import { u256Split, tokenToBigInt2 } from "../../utils/conversions.js";
/** Build circuit inputs for a swap proof */
export function generateSwapInputs(params) {
    const { inputNote, outputNote, changeNote } = params;
    // Compute input nullifier hash
    const { low: balLow, high: balHigh } = u256Split(inputNote.balance);
    const { nullifierHash } = computeCommitment(inputNote.secret, inputNote.nullifier, balLow.toString(), balHigh.toString(), inputNote.token);
    // Compute output commitment
    const { low: outLow, high: outHigh } = u256Split(outputNote.amount);
    const { commitment: newCommitment } = computeCommitment(outputNote.secret, outputNote.nullifier, outLow.toString(), outHigh.toString(), outputNote.token);
    return {
        root: inputNote.merkleProof.root,
        nullifierHash,
        newCommitment,
        tokenIn: tokenToBigInt2(params.tokenIn).toString(),
        tokenOut: tokenToBigInt2(params.tokenOut).toString(),
        amountIn: params.amountIn,
        amountOutMin: params.amountOutMin,
        secret: inputNote.secret,
        nullifier: inputNote.nullifier,
        balance_low: balLow.toString(),
        balance_high: balHigh.toString(),
        pathElements: inputNote.merkleProof.pathElements,
        pathIndices: inputNote.merkleProof.pathIndices,
        newSecret: outputNote.secret,
        newNullifier: outputNote.nullifier,
        amountOut_low: outLow.toString(),
        amountOut_high: outHigh.toString(),
        changeSecret: changeNote.secret,
        changeNullifier: changeNote.nullifier,
    };
}
//# sourceMappingURL=swap.js.map
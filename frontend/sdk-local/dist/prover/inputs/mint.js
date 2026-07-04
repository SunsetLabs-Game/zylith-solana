/** Input generator for the mint circuit */
import { computeCommitment, computePositionCommitment } from "../../crypto/commitment.js";
import { u256Split, tokenToBigInt2 } from "../../utils/conversions.js";
import { signedToOffsetTick } from "../../types/constants.js";
/** Build circuit inputs for a mint proof */
export function generateMintInputs(params) {
    const { inputNote0, inputNote1, position, changeNote0, changeNote1 } = params;
    // Compute nullifier hashes
    const { low: bal0Low, high: bal0High } = u256Split(inputNote0.balance);
    const { nullifierHash: nullifierHash0 } = computeCommitment(inputNote0.secret, inputNote0.nullifier, bal0Low.toString(), bal0High.toString(), inputNote0.token);
    const { low: bal1Low, high: bal1High } = u256Split(inputNote1.balance);
    const { nullifierHash: nullifierHash1 } = computeCommitment(inputNote1.secret, inputNote1.nullifier, bal1Low.toString(), bal1High.toString(), inputNote1.token);
    // Compute position commitment with unsigned ticks
    const unsignedTickLower = signedToOffsetTick(position.tickLower);
    const unsignedTickUpper = signedToOffsetTick(position.tickUpper);
    const { commitment: positionCommitment } = computePositionCommitment(position.secret, position.nullifier, unsignedTickLower, unsignedTickUpper, position.liquidity.toString());
    const { low: amount0Low, high: amount0High } = u256Split(params.amount0);
    const { low: amount1Low, high: amount1High } = u256Split(params.amount1);
    return {
        root: inputNote0.merkleProof.root,
        nullifierHash0,
        nullifierHash1,
        positionCommitment,
        tickLower: unsignedTickLower.toString(),
        tickUpper: unsignedTickUpper.toString(),
        secret0: inputNote0.secret,
        nullifier0: inputNote0.nullifier,
        balance0_low: bal0Low.toString(),
        balance0_high: bal0High.toString(),
        token0: tokenToBigInt2(inputNote0.token).toString(),
        pathElements0: inputNote0.merkleProof.pathElements,
        pathIndices0: inputNote0.merkleProof.pathIndices,
        secret1: inputNote1.secret,
        nullifier1: inputNote1.nullifier,
        balance1_low: bal1Low.toString(),
        balance1_high: bal1High.toString(),
        token1: tokenToBigInt2(inputNote1.token).toString(),
        pathElements1: inputNote1.merkleProof.pathElements,
        pathIndices1: inputNote1.merkleProof.pathIndices,
        positionSecret: position.secret,
        positionNullifier: position.nullifier,
        liquidity: position.liquidity.toString(),
        amount0_low: amount0Low.toString(),
        amount0_high: amount0High.toString(),
        amount1_low: amount1Low.toString(),
        amount1_high: amount1High.toString(),
        changeSecret0: changeNote0.secret,
        changeNullifier0: changeNote0.nullifier,
        changeSecret1: changeNote1.secret,
        changeNullifier1: changeNote1.nullifier,
    };
}
//# sourceMappingURL=mint.js.map
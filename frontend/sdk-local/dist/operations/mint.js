import { u256Split, generateRandomSecret, tokenToBigInt2 } from "../utils/conversions.js";
import { ClientProver } from "../prover/prover.js";
import { formatProofForSolana } from "../utils/proof.js";
import { generateMintInputs } from "../prover/inputs/mint.js";
export async function mint(params, asp, noteManager) {
    const notes = noteManager.getAllNotes();
    const input0 = notes.find((n) => n.commitment === params.inputNote0Commitment && !n.spent);
    const input1 = notes.find((n) => n.commitment === params.inputNote1Commitment && !n.spent);
    if (!input0 || !input1)
        throw new Error("Input note(s) not found or spent");
    if (input0.leafIndex === undefined || input1.leafIndex === undefined)
        throw new Error("Input notes have no leaf index");
    const posSecret = generateRandomSecret();
    const posNullifier = generateRandomSecret();
    const change0Secret = generateRandomSecret();
    const change0Nullifier = generateRandomSecret();
    const change1Secret = generateRandomSecret();
    const change1Nullifier = generateRandomSecret();
    // Sort input notes and params numerically based on token BigInt representation
    // This satisfies the token0 < token1 constraint in PrivateMint.circom
    const note0IsToken0 = tokenToBigInt2(input0.token) < tokenToBigInt2(input1.token);
    const noteA = note0IsToken0 ? input0 : input1;
    const noteB = note0IsToken0 ? input1 : input0;
    const amtA = note0IsToken0 ? params.amount0 : params.amount1;
    const amtB = note0IsToken0 ? params.amount1 : params.amount0;
    const changeSecretA = note0IsToken0 ? change0Secret : change1Secret;
    const changeNullifierA = note0IsToken0 ? change0Nullifier : change1Nullifier;
    const changeSecretB = note0IsToken0 ? change1Secret : change0Secret;
    const changeNullifierB = note0IsToken0 ? change1Nullifier : change0Nullifier;
    const { low: balALow, high: balAHigh } = u256Split(BigInt(noteA.amount));
    const { low: balBLow, high: balBHigh } = u256Split(BigInt(noteB.amount));
    const { low: amtALow, high: amtAHigh } = u256Split(amtA);
    const { low: amtBLow, high: amtBHigh } = u256Split(amtB);
    let response = {};
    let solanaProof;
    if (params.useAspProver) {
        response = await asp.mint({
            pool_key: {
                token_0: params.poolKey.token0,
                token_1: params.poolKey.token1,
                fee: params.poolKey.fee,
                tick_spacing: params.poolKey.tickSpacing,
            },
            input_note_0: {
                secret: noteA.secret,
                nullifier: noteA.nullifier,
                balance_low: balALow.toString(),
                balance_high: balAHigh.toString(),
                token: noteA.token,
                leaf_index: noteA.leafIndex,
            },
            input_note_1: {
                secret: noteB.secret,
                nullifier: noteB.nullifier,
                balance_low: balBLow.toString(),
                balance_high: balBHigh.toString(),
                token: noteB.token,
                leaf_index: noteB.leafIndex,
            },
            position: {
                secret: posSecret,
                nullifier: posNullifier,
                liquidity: params.liquidity.toString(),
                tick_lower: params.tickLower,
                tick_upper: params.tickUpper,
            },
            amounts: {
                amount0_low: amtALow.toString(),
                amount0_high: amtAHigh.toString(),
                amount1_low: amtBLow.toString(),
                amount1_high: amtBHigh.toString(),
            },
            change_note_0: { secret: changeSecretA, nullifier: changeNullifierA },
            change_note_1: { secret: changeSecretB, nullifier: changeNullifierB },
            liquidity: Number(params.liquidity),
        });
    }
    else {
        // 1. Fetch the Merkle tree state from ASP
        const proofResA = await asp.getTreePath(noteA.leafIndex);
        const proofResB = await asp.getTreePath(noteB.leafIndex);
        // 2. Generate circuit inputs
        const circuitInputs = generateMintInputs({
            inputNote0: {
                secret: noteA.secret,
                nullifier: noteA.nullifier,
                balance: BigInt(noteA.amount),
                token: noteA.token,
                merkleProof: {
                    root: proofResA.root,
                    pathElements: proofResA.path_elements,
                    pathIndices: proofResA.path_indices,
                }
            },
            inputNote1: {
                secret: noteB.secret,
                nullifier: noteB.nullifier,
                balance: BigInt(noteB.amount),
                token: noteB.token,
                merkleProof: {
                    root: proofResB.root,
                    pathElements: proofResB.path_elements,
                    pathIndices: proofResB.path_indices,
                }
            },
            position: {
                secret: posSecret,
                nullifier: posNullifier,
                tickLower: params.tickLower,
                tickUpper: params.tickUpper,
                liquidity: params.liquidity,
            },
            amount0: amtA,
            amount1: amtB,
            changeNote0: { secret: changeSecretA, nullifier: changeNullifierA },
            changeNote1: { secret: changeSecretB, nullifier: changeNullifierB },
        });
        // 3. Generate proof locally
        const prover = new ClientProver();
        const { proof, publicSignals } = await prover.generateProof("mint", circuitInputs);
        // 4. Format proof for Solana
        solanaProof = formatProofForSolana(proof);
        // Mock response
        response = {
            position_commitment: circuitInputs.positionCommitment,
            calldata: [],
            final_root: proofResA.root,
        };
        // snarkjs returns public signals in order.
        // For mint: [root, nullifierHash0, nullifierHash1, positionCommitment, tickLower, tickUpper, changeCommitment0, changeCommitment1]
        response.change_commitment_0 = publicSignals[6];
        response.change_commitment_1 = publicSignals[7];
    }
    // Update local state
    noteManager.markSpent(input0.nullifierHash);
    noteManager.markSpent(input1.nullifierHash);
    noteManager.addPositionNote({
        secret: posSecret,
        nullifier: posNullifier,
        tickLower: params.tickLower,
        tickUpper: params.tickUpper,
        liquidity: params.liquidity,
        commitment: response.position_commitment,
    });
    const change0Amount = BigInt(noteA.amount) - amtA;
    if (change0Amount > 0n) {
        noteManager.addNote({
            secret: changeSecretA,
            nullifier: changeNullifierA,
            amount: change0Amount,
            token: noteA.token,
        });
    }
    const change1Amount = BigInt(noteB.amount) - amtB;
    if (change1Amount > 0n) {
        noteManager.addNote({
            secret: changeSecretB,
            nullifier: changeNullifierB,
            amount: change1Amount,
            token: noteB.token,
        });
    }
    // Sync leaf indexes from ASP for change notes and position
    const commitmentsToSync = [
        response.change_commitment_0,
        response.change_commitment_1,
        response.position_commitment,
    ].filter((c) => c && c !== "0");
    if (commitmentsToSync.length > 0) {
        try {
            const syncResponse = await asp.syncCommitments(commitmentsToSync);
            noteManager.updateLeafIndexes(syncResponse);
        }
        catch (err) {
            console.warn("Failed to sync leaf indexes from ASP:", err);
        }
    }
    return {
        calldata: response.calldata,
        finalRoot: response.final_root,
        positionCommitment: response.position_commitment,
        changeCommitment0: response.change_commitment_0,
        changeCommitment1: response.change_commitment_1,
        solanaProof,
    };
}
//# sourceMappingURL=mint.js.map
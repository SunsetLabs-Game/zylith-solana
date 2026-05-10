# Zylith ZK Circuits

This document describes the four zero-knowledge circuits that power Zylith's privacy stack. All circuits are written in **Circom 2.2** and use the **Groth16** proving system over the BN254 curve.

---

## Table of Contents

- [Overview](#overview)
- [Shared Primitives](#shared-primitives)
- [Membership Circuit](#membership-circuit)
- [Swap Circuit](#swap-circuit)
- [Mint Circuit (Liquidity)](#mint-circuit-liquidity)
- [Burn Circuit (Liquidity)](#burn-circuit-liquidity)
- [Building the Circuits](#building-the-circuits)
- [Trusted Setup](#trusted-setup)
- [On-Chain Verification](#on-chain-verification)

---

## Overview

| Circuit | File | Constraints | Used by |
|---------|------|-------------|---------|
| `membership` | `membership.circom` | ~3,561 | `shielded_withdraw` |
| `swap` | `swap.circom` | ~5,200 | `shielded_swap` |
| `mint` | `liquidity.circom` (mint mode) | ~8,723 | `shielded_mint` |
| `burn` | `liquidity.circom` (burn mode) | ~4,611 | `shielded_burn` |

Each circuit:
1. Receives **private inputs** from the user's local client (never sent to any server)
2. Receives **public inputs** that are also embedded in the Solana instruction
3. Produces a **Groth16 proof** that is verified on-chain

The Solana program embeds the verification key. It calls `verify_proof` from the `groth16-solana` crate with the proof and public inputs extracted from the instruction data.

---

## Shared Primitives

All circuits share the same set of building blocks, implemented in Circom:

### Poseidon Hash

A ZK-friendly hash function with significantly lower constraint cost than SHA-256. Used for:
- Computing commitments
- Computing nullifier hashes
- Internal Merkle tree nodes

```circom
component hasher = Poseidon(N);
hasher.inputs[0] <== a;
hasher.inputs[1] <== b;
signal output hash <== hasher.out;
```

### Note Commitment

A note is represented as:
```
commitment = Poseidon(secret, nullifier, amount_low, amount_high, token)
```

Where:
- `secret`: random field element known only to the note holder
- `nullifier`: random field element that reveals spending without revealing the note itself
- `amount_low`: `amount % 2^128` (amounts are split to fit BN254 field arithmetic)
- `amount_high`: `amount >> 128`
- `token`: the token mint address encoded as a field element

### Nullifier Hash

```
nullifierHash = Poseidon(secret, nullifier)
```

Publishing `nullifierHash` on-chain prevents double-spending while keeping `secret` and `nullifier` private.

### Merkle Tree Checker

Verifies that a given `commitment` is a leaf in a Merkle tree with a known `root`, using a 20-element sibling path.

```circom
component tree = MerkleTreeChecker(20);
tree.leaf <== commitment;
tree.root <== root;
for (var i = 0; i < 20; i++) {
    tree.pathElements[i] <== pathElements[i];
    tree.pathIndices[i] <== pathIndices[i];
}
```

---

## Membership Circuit

**File:** `circuits/membership.circom`  
**Constraints:** ~3,561  
**Used by:** `shielded_withdraw`

### Purpose

Proves that the prover owns a note that exists in the Merkle tree, without revealing which note it is, what the amount is, or who the prover is.

### Public Inputs

| Signal | Description |
|--------|-------------|
| `root` | Current Merkle root |
| `nullifierHash` | Poseidon(secret, nullifier), published on-chain to prevent reuse |
| `recipient` | Solana address receiving the withdrawn tokens |
| `amount_low` | Low 128 bits of the note amount |
| `amount_high` | High 128 bits of the note amount |
| `token` | Token mint as field element |

### Private Inputs

| Signal | Description |
|--------|-------------|
| `secret` | Note secret |
| `nullifier` | Note nullifier |
| `pathElements[20]` | Merkle sibling hashes |
| `pathIndices[20]` | Path directions (0=left, 1=right) |

### Constraints Enforced

1. `commitment = Poseidon(secret, nullifier, amount_low, amount_high, token)`
2. `MerkleTreeChecker(commitment, root, pathElements, pathIndices)` passes
3. `nullifierHash = Poseidon(secret, nullifier)`

Nothing else. The `recipient` and `amount` are public only so the Solana program can transfer the correct amount to the correct address after proof verification.

---

## Swap Circuit

**File:** `circuits/swap.circom`  
**Used by:** `shielded_swap`

### Purpose

Proves a valid private swap: the prover owns an input note for `tokenIn`, spends at most `amountIn` of it, and claims the output note is correctly committed.

### Public Inputs

| Signal | Description |
|--------|-------------|
| `root` | Current Merkle root |
| `nullifierHash` | Nullifier hash of the input note (published on-chain) |
| `newCommitment` | Commitment of the output note (tokenOut) |
| `tokenIn` | Input token |
| `tokenOut` | Output token |
| `amountIn` | Exact amount spent from the input note |
| `amountOutMin` | Minimum acceptable output (slippage protection) |
| `changeCommitment` | Commitment of the change note (remaining tokenIn) |

### Private Inputs

| Signal | Description |
|--------|-------------|
| `secret` | Input note secret |
| `nullifier` | Input note nullifier |
| `inputAmount_low` | Full input note amount (low 128 bits) |
| `inputAmount_high` | Full input note amount (high 128 bits) |
| `pathElements[20]` | Merkle proof siblings |
| `pathIndices[20]` | Merkle proof path |

### Constraints Enforced

1. Input note exists in the tree (Merkle inclusion)
2. `amountIn <= inputAmount` (cannot overspend)
3. `changeAmount = inputAmount - amountIn`
4. `changeCommitment = Poseidon(secret', nullifier', changeAmount_low, changeAmount_high, tokenIn)` (change note correctly formed)
5. `newCommitment` encodes `amountOut >= amountOutMin` (slippage enforced inside the circuit)

---

## Mint Circuit (Liquidity)

**File:** `circuits/liquidity.circom` (mint template)  
**Constraints:** ~8,723  
**Used by:** `shielded_mint`

### Purpose

Proves the prover owns two valid notes (one for each token in a pool pair), spends specified amounts from each to open an LP position, and returns the remainder as change notes.

### Public Inputs

| Signal | Description |
|--------|-------------|
| `root` | Current Merkle root |
| `nullifierHash0` | Nullifier hash of the token0 input note |
| `nullifierHash1` | Nullifier hash of the token1 input note |
| `positionCommitment` | Commitment of the LP position note |
| `tickLower` | Lower tick bound of the liquidity range |
| `tickUpper` | Upper tick bound of the liquidity range |
| `changeCommitment0` | Change note for token0 remainder |
| `changeCommitment1` | Change note for token1 remainder |

### Private Inputs

| Signal | Description |
|--------|-------------|
| `secret0`, `nullifier0` | token0 note secrets |
| `secret1`, `nullifier1` | token1 note secrets |
| `amount0_low/high` | Full token0 note amount |
| `amount1_low/high` | Full token1 note amount |
| `pathElements0[20]`, `pathIndices0[20]` | Merkle proof for token0 note |
| `pathElements1[20]`, `pathIndices1[20]` | Merkle proof for token1 note |

### Constraints Enforced

1. Both input notes exist in the same tree (same root)
2. Both amounts are non-negative and cover the requested deposit amounts
3. Position commitment encodes tick range and liquidity amount
4. Both change commitments are correctly formed

---

## Burn Circuit (Liquidity)

**File:** `circuits/liquidity.circom` (burn template)  
**Constraints:** ~4,611  
**Used by:** `shielded_burn`

### Purpose

Proves the prover owns an LP position note, redeems it, and receives two output notes, one for each token withdrawn.

### Public Inputs

| Signal | Description |
|--------|-------------|
| `root` | Current Merkle root |
| `positionNullifierHash` | Nullifier hash of the position note |
| `newCommitment0` | Output note for token0 |
| `newCommitment1` | Output note for token1 |
| `tickLower` | Lower tick (must match position) |
| `tickUpper` | Upper tick (must match position) |

### Private Inputs

| Signal | Description |
|--------|-------------|
| `positionSecret`, `positionNullifier` | Position note secrets |
| `pathElements[20]`, `pathIndices[20]` | Merkle proof for position note |

### Constraints Enforced

1. Position note exists in the tree
2. Tick range in the note matches the public `tickLower` / `tickUpper`
3. Output commitments are correctly formed

---

## Building the Circuits

### Prerequisites

- Circom 2.2: [installation guide](https://docs.circom.io/getting-started/installation/)
- snarkjs: installed via `bun install`
- Python 3.10 + Garaga (for optimized verifier generation)

### Compile

```bash
# All circuits
bun run circuits:build

# Individual
bun run circuits:build:membership
bun run circuits:build:swap
bun run circuits:build:mint
bun run circuits:build:burn
```

Each build outputs to `circuits/build/{circuit_name}/`:
```
build/membership/
├── membership.r1cs      # Rank-1 constraint system
├── membership.wasm      # WebAssembly witness generator
├── membership.zkey      # Proving key (after setup)
└── verification_key.json
```

### Generate Proofs (Testing)

```bash
bun run circuits:prove              # All circuits
bun run circuits:prove:no-garaga   # Skip Garaga optimization
bun run circuits:verify            # Verify generated proofs
```

---

## Trusted Setup

Groth16 requires a per-circuit trusted setup (Powers of Tau ceremony). Zylith uses:

1. **Phase 1**: the universal Hermez Powers of Tau ceremony (public, well-audited)
2. **Phase 2**: circuit-specific setup derived from Phase 1

The resulting `.zkey` files are the proving keys. The corresponding `verification_key.json` is embedded in the Solana program binary.

For production, the Phase 2 ceremony should be performed with multiple participants to ensure the toxic waste is destroyed. The verifying key is deterministic from the circuit and the Powers of Tau.

---

## On-Chain Verification

The Solana programs verify Groth16 proofs using the `groth16-solana` Rust crate. The verification key is compiled into the program binary.

Each instruction:
1. Deserializes the proof (`pi_a`, `pi_b`, `pi_c`) from instruction data
2. Extracts public inputs from the instruction accounts
3. Calls `groth16_solana::verify(&vk, &proof, &public_inputs)`
4. Aborts if verification fails

This means **proof verification is entirely on-chain, trustless, and deterministic**. A valid proof is a mathematical guarantee that all circuit constraints were satisfied.

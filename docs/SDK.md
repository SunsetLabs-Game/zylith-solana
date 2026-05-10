# @zylith/sdk: Developer Guide

The `@zylith/sdk` package is the TypeScript client library for the Zylith shielded CLMM. It handles all cryptographic operations, note management, proof wiring, and Solana transaction construction.

---

## Table of Contents

- [Installation](#installation)
- [Initialization](#initialization)
- [Proving Modes](#proving-modes)
- [Operations](#operations)
  - [Deposit](#deposit)
  - [Withdraw](#withdraw)
  - [Swap](#swap)
  - [Mint (Liquidity)](#mint-liquidity)
  - [Burn (Liquidity)](#burn-liquidity)
- [Note Management](#note-management)
- [Querying State](#querying-state)
- [Crypto Primitives](#crypto-primitives)
- [TypeScript Types](#typescript-types)

---

## Installation

```bash
npm install @zylith/sdk
# or
bun add @zylith/sdk
```

Requirements: Node.js 18+, ESM environment.

---

## Initialization

```typescript
import { ZylithClient } from "@zylith/sdk";

const client = new ZylithClient({
  rpcUrl: "https://api.testnet.solana.com",
  aspUrl: "https://asp.zylith.xyz",
  provingMode: "asp",                          // "asp" | "client-side"
  coordinatorAddress: "AifYaPemPJgQVhqxQs583YELWmbyVQwL9vF4cAjsyvnH",
  poolAddress: "<deployed pool address>",
});
```

### Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `rpcUrl` | `string` | Yes | Solana RPC endpoint |
| `aspUrl` | `string` | Yes (for ASP mode) | Anonymous Service Provider URL |
| `provingMode` | `"asp" \| "client-side"` | Yes | Where proof generation runs |
| `coordinatorAddress` | `string` | Yes | Coordinator program ID |
| `poolAddress` | `string` | Yes | Pool address to interact with |

---

## Proving Modes

### ASP Mode (recommended)

The SDK sends public inputs to the ASP, which generates the Groth16 proof server-side. Private inputs (secret, nullifier) never leave the client.

```typescript
const client = new ZylithClient({ provingMode: "asp", aspUrl: "...", ... });
```

- Proof generation: ~2–5 seconds on the ASP
- No WASM required in the browser
- Recommended for production

### Client-Side Mode

The SDK runs snarkjs locally using circuit WASM and proving keys from the `artifacts/` bundle. Suitable for environments without an ASP or for maximum trustlessness.

```typescript
const client = new ZylithClient({ provingMode: "client-side", ... });
```

- Proof generation: 10–60 seconds depending on the device
- Requires the WASM artifacts to be bundled with your app
- Maximum trustlessness, with no server involved in proof generation

---

## Operations

### Deposit

Deposits tokens into a private note. The token transfer happens on-chain; a commitment is recorded in the Merkle tree.

```typescript
import { NoteManager } from "@zylith/sdk";

const noteManager = new NoteManager({ password: "user-password" });

const result = await client.deposit({
  wallet,                    // Solana wallet adapter
  tokenMint: "...",          // SPL token mint address
  amount: BigInt("1000000"), // amount in token base units
  noteManager,               // persists the resulting note
});

console.log(result.leafIndex);    // position in the Merkle tree
console.log(result.commitment);   // the note commitment stored on-chain
```

The `NoteManager` stores the note locally, encrypted with the user's password. The note is required for all future operations.

---

### Withdraw

Redeems a note from the Merkle tree. Generates a membership proof and transfers tokens out.

```typescript
const result = await client.withdraw({
  wallet,
  note,                      // Note object from NoteManager
  recipient: wallet.publicKey, // where to send the tokens
  noteManager,
});

console.log(result.signature); // Solana transaction signature
```

The SDK:
1. Fetches the Merkle proof from the ASP
2. Generates (or requests) the Groth16 proof
3. Builds and submits the `shielded_withdraw` instruction
4. Marks the note as spent in `NoteManager`

---

### Swap

Executes a private swap within the CLMM. Consumes an input note and creates two output notes (swap result + change).

```typescript
const result = await client.swap({
  wallet,
  inputNote,                      // note for tokenIn
  tokenOut: "...",                // output token mint
  amountIn: BigInt("500000"),
  amountOutMin: BigInt("490000"), // slippage tolerance
  noteManager,
});

console.log(result.outputNote);   // the received token note
console.log(result.changeNote);   // the change note (if any)
```

---

### Mint (Liquidity)

Provides concentrated liquidity using two private notes. Returns a position commitment (the shielded LP NFT) and two change notes.

```typescript
const result = await client.mint({
  wallet,
  noteToken0,              // note for token0
  noteToken1,              // note for token1
  amount0: BigInt("..."),
  amount1: BigInt("..."),
  tickLower: -100,
  tickUpper: 100,
  noteManager,
});

console.log(result.positionNote);   // LP position commitment
console.log(result.changeNote0);
console.log(result.changeNote1);
```

---

### Burn (Liquidity)

Withdraws from an LP position. Consumes the position note and creates two output notes (one per token).

```typescript
const result = await client.burn({
  wallet,
  positionNote,
  noteManager,
});

console.log(result.noteToken0);
console.log(result.noteToken1);
```

---

## Note Management

`NoteManager` handles encrypted persistence of notes in the browser (via localStorage or a custom storage adapter).

```typescript
import { NoteManager } from "@zylith/sdk";

const noteManager = new NoteManager({ password: "user-password" });

// Get all unspent notes
const notes = noteManager.getNotes();

// Get notes for a specific token
const usdtNotes = noteManager.getNotes({ token: "USDT_MINT_ADDRESS" });

// Get total shielded balance for a token
const balance = noteManager.getBalance("USDT_MINT_ADDRESS");

// Get position notes (LP)
const positions = noteManager.getPositions();
```

### Note Schema

```typescript
type Note = {
  id: string;               // unique identifier
  secret: bigint;           // private random value
  nullifier: bigint;        // private random value
  amount: bigint;           // token amount in base units
  token: string;            // SPL token mint address
  leafIndex: number;        // index in the Merkle tree
  commitment: string;       // Poseidon hash of (secret, nullifier, amount, token)
  spent: boolean;           // true after the note is consumed
  createdAt: number;        // timestamp
};
```

Notes are encrypted with AES-GCM using a key derived from the user's password via PBKDF2. They are **never sent to the ASP or any server**.

---

## Querying State

```typescript
// Current Merkle root (from ASP, validated against on-chain)
const root = await client.getMerkleRoot();

// Merkle proof for a specific leaf
const proof = await client.getMerkleProof(leafIndex);

// Check if a nullifier has been spent
const spent = await client.isNullifierSpent(nullifierHash);

// Read pool state from Solana
const pool = await client.getPoolState();
console.log(pool.liquidity, pool.tickCurrent, pool.reserveToken0);
```

---

## Crypto Primitives

The SDK exports its cryptographic primitives for advanced use:

```typescript
import {
  poseidon,          // Poseidon hash (variable arity)
  computeCommitment, // Poseidon(secret, nullifier, amount_low, amount_high, token)
  computeNullifierHash, // Poseidon(secret, nullifier)
  MerkleTree,        // 20-level binary Merkle tree
  encrypt,           // AES-GCM encryption
  decrypt,           // AES-GCM decryption
} from "@zylith/sdk/crypto";
```

### Poseidon Hash

```typescript
import { poseidon } from "@zylith/sdk/crypto";

const hash = await poseidon([BigInt("123"), BigInt("456")]);
```

Poseidon is a ZK-friendly hash function that produces outputs compatible with Circom circuit constraints.

### Commitment

```typescript
import { computeCommitment } from "@zylith/sdk/crypto";

const commitment = await computeCommitment({
  secret: BigInt("..."),
  nullifier: BigInt("..."),
  amountLow: BigInt("..."),   // amount % 2^128
  amountHigh: BigInt("..."),  // amount >> 128
  token: BigInt("..."),       // token address as field element
});
```

### Merkle Tree

```typescript
import { MerkleTree } from "@zylith/sdk/crypto";

const tree = new MerkleTree(20); // 20-level tree
tree.insert(commitment);

const proof = tree.getProof(leafIndex);
// proof.pathElements: sibling hashes at each level
// proof.pathIndices: 0 (left) or 1 (right) at each level
```

---

## TypeScript Types

```typescript
// Core types exported from @zylith/sdk
export type {
  Note,
  PositionNote,
  MerkleProof,
  PoolState,
  DepositResult,
  WithdrawResult,
  SwapResult,
  MintResult,
  BurnResult,
  ZylithClientConfig,
  ProvingMode,
};
```

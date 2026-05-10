# Zylith: Architecture

This document describes the full architecture of the Zylith protocol: how the four layers interact, how data flows through a shielded operation, and why each design decision was made.

---

## Table of Contents

- [System Overview](#system-overview)
- [Layer 1: Smart Contracts](#layer-1-smart-contracts)
- [Layer 2: Zero-Knowledge Circuits](#layer-2-zero-knowledge-circuits)
- [Layer 3: Anonymous Service Provider (ASP)](#layer-3-anonymous-service-provider-asp)
- [Layer 4: SDK](#layer-4-sdk)
- [Frontend](#frontend)
- [End-to-End Flow: Shielded Swap](#end-to-end-flow-shielded-swap)
- [Security Model](#security-model)
- [State Synchronization](#state-synchronization)

---

## System Overview

Zylith achieves on-chain privacy by combining four components that operate at different trust levels:

```
User Browser
│
├── Frontend         ← UI, wallet connection, UX flows
├── @zylith/sdk      ← Client logic, note management, proof wiring
│
└── ASP (Rust)       ← Proof generation, Merkle tree, relayer
    │
    └── Solana Programs (Anchor)
        ├── Coordinator    ← Global Merkle root, leaf counter, pause flag
        ├── Pool           ← CLMM state, reserves, shielded balances
        └── Verifier logic ← On-chain Groth16 proof verification
```

**Trust model:**

| Component | Trust Level | Why |
|-----------|-------------|-----|
| Smart Contracts | Trustless | All logic verifiable on-chain; Groth16 proofs verified inline |
| ZK Circuits | Trustless | Math enforces constraints; verifying key is public |
| ASP | Semi-trusted | Generates proofs but never sees private inputs (the SDK handles those) |
| SDK | Client-trusted | Runs in the user's browser; user controls their own keys |
| Frontend | Client-trusted | Open source; user can verify locally |

---

## Layer 1: Smart Contracts

**Location:** `contracts/anchor/`  
**Language:** Rust (Anchor framework)  
**Program ID:** `AifYaPemPJgQVhqxQs583YELWmbyVQwL9vF4cAjsyvnH`

### Accounts

**`Coordinator`**: Global singleton.
- Tracks the current Merkle root
- Increments `next_leaf_index` on every deposit/commit
- Holds a `paused` flag for emergency stops
- Only a designated `root_submitter` can update the root

**`Pool`**: One per token pair.
- Stores token mint addresses (token0, token1)
- Tracks tick range (`tick_lower`, `tick_upper`), fee tier, reserves
- Maintains separate `shielded_balance_0` and `shielded_balance_1` for private liquidity
- Holds custody token accounts (SPL Token PDAs)

**`NullifierRecord`**: One per spent note.
- Created when a nullifier is published (withdraw, swap, burn)
- Presence = note already consumed
- The program checks for the account's existence before accepting a proof

**`CommitmentAccount`**: One per Merkle leaf.
- Stores the commitment hash
- Indexed by `leaf_index`

### Instructions

| Instruction | Proof Required | Effect |
|-------------|---------------|--------|
| `initialize_coordinator` | No | Deploy global state |
| `create_pool` | No | Deploy a new CLMM pool |
| `shielded_deposit` | No | Insert commitment leaf, transfer tokens in |
| `shielded_withdraw` | Membership (6 inputs) | Verify proof, publish nullifier, transfer tokens out |
| `shielded_swap` | Swap (8 inputs) | Verify proof, publish nullifier, insert 2 new commitments |
| `shielded_mint` | Mint (8 inputs) | Verify proof, publish 2 nullifiers, insert position commitment |
| `shielded_burn` | Burn | Verify proof, publish position nullifier, insert 2 commitments |

### On-chain Proof Verification

Groth16 proofs are verified using the `groth16-solana` crate. The verifying key is embedded in the program binary. Each instruction extracts the public inputs from the instruction accounts, calls `verify_proof`, and rejects the transaction if verification fails.

This means **no off-chain coordinator can approve invalid state transitions**.

---

## Layer 2: Zero-Knowledge Circuits

**Location:** `circuits/`  
**Language:** Circom 2.2  
**Proving system:** Groth16 (BN254)  
**Tree height:** 20 levels → max 1,048,576 notes

### Shared Primitives

All circuits share these building blocks:

- **Poseidon hash**: a ZK-friendly hash function used for commitments and nullifier hashes
- **MerkleTreeChecker**: verifies a leaf exists in the tree given a root and sibling path
- **Commitment = Poseidon(secret, nullifier, amount_low, amount_high, token)**
- **NullifierHash = Poseidon(secret, nullifier)**

### Circuit: `membership`

**Purpose:** Prove you own a note in the Merkle tree.  
**Used by:** `shielded_withdraw`  
**Constraints:** ~3,561

Public inputs:
```
root, nullifierHash, recipient, amount_low, amount_high, token
```

Private inputs:
```
secret, nullifier, pathElements[20], pathIndices[20]
```

The circuit verifies:
1. `commitment = Poseidon(secret, nullifier, amount_low, amount_high, token)`
2. The commitment is a leaf in the tree with the given `root`
3. `nullifierHash = Poseidon(secret, nullifier)`

### Circuit: `swap`

**Purpose:** Prove a valid private swap.  
**Used by:** `shielded_swap`

Public inputs:
```
root, nullifierHash, newCommitment, tokenIn, tokenOut,
amountIn, amountOutMin, changeCommitment
```

Private inputs:
```
secret, nullifier, inputAmount_low, inputAmount_high,
pathElements[20], pathIndices[20]
```

The circuit verifies:
1. Input note ownership (Merkle inclusion)
2. `amountIn <= inputAmount` (cannot spend more than the note holds)
3. Output commitment is correctly formed
4. Change commitment captures the remainder

### Circuit: `mint` (liquidity)

**Purpose:** Prove shielded liquidity provision with two input notes.  
**Used by:** `shielded_mint`  
**Constraints:** ~8,723

Public inputs:
```
root, nullifierHash0, nullifierHash1, positionCommitment,
tickLower, tickUpper, changeCommitment0, changeCommitment1
```

Both input notes are verified against the same Merkle root. The position commitment encodes the LP NFT. Change notes return unspent token remainders.

### Circuit: `burn` (liquidity)

**Purpose:** Prove LP position withdrawal.  
**Used by:** `shielded_burn`  
**Constraints:** ~4,611

Public inputs:
```
root, positionNullifierHash, newCommitment0, newCommitment1,
tickLower, tickUpper
```

The position note is consumed (nullifier published) and two output notes are created, one for each token.

---

## Layer 3: Anonymous Service Provider (ASP)

**Location:** `asp/`  
**Language:** Rust (Tokio async, Axum HTTP)  
**Database:** SQLite (sqlx with migrations)  
**Deployment:** Fly.io

### Responsibilities

The ASP sits between the SDK and the Solana chain. It:

1. Maintains a Merkle tree mirror in SQLite
2. Generates ZK proofs on behalf of users (delegating to a snarkjs Node.js worker)
3. Provides Merkle inclusion proofs to the SDK
4. Optionally relays transactions to Solana

### Why a separate backend?

Proof generation with snarkjs is CPU-intensive and can take several seconds. Running it in the browser is possible but degrades UX significantly. The ASP handles this work server-side, returning a compact proof object that the client submits on-chain.

The ASP **never sees the user's secret or nullifier**; those are provided directly to the circuit by the SDK, inside the snarkjs worker. The ASP only receives the circuit's public inputs.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/deposit` | Register a new commitment in the Merkle tree |
| `POST` | `/withdraw` | Generate membership proof |
| `POST` | `/swap` | Generate swap proof (consume input, emit two outputs) |
| `POST` | `/mint` | Generate liquidity provision proof |
| `POST` | `/burn` | Generate LP withdrawal proof |
| `GET` | `/tree/root` | Current Merkle root |
| `GET` | `/tree/proof/{leaf_index}` | Merkle sibling path for a leaf |
| `GET` | `/nullifier/{nullifier_hash}` | Check if a nullifier has been spent |
| `GET` | `/status` | Health check |
| `POST` | `/sync` | Trigger manual Solana event sync |

Full API specification: [ASP_API.md](ASP_API.md)

### Background Sync

A Tokio background task polls Solana at a configurable interval, reads `CommitmentAccount` events, and inserts new leaves into the local SQLite tree. This keeps the ASP's Merkle root in sync with on-chain state.

If the ASP restarts, it re-syncs from Solana before accepting requests.

### Deployment (Fly.io)

The production Dockerfile is a multi-stage build:
1. Rust builder → compiles the ASP binary
2. Python 3.10 image + Node.js 20 → runtime with Garaga and snarkjs
3. Persistent volume at `/data/zylith_asp.db` survives restarts

---

## Layer 4: SDK

**Location:** `sdk/`  
**Package:** `@zylith/sdk`  
**Language:** TypeScript (ESM)

### ZylithClient

The main entry point. Instantiated with a connection configuration:

```typescript
const client = new ZylithClient({
  rpcUrl: "https://api.testnet.solana.com",
  aspUrl: "https://asp.zylith.xyz",
  provingMode: "asp",         // or "client-side"
  coordinatorAddress: "AifYa...",
  poolAddress: "...",
});
```

In `"asp"` mode, the client sends public inputs to the ASP and receives a proof. In `"client-side"` mode, the client runs snarkjs locally with the circuit WASM and proving key from the `artifacts/` directory.

### Note Management

`NoteManager` stores notes encrypted in the browser using a password-derived key (PBKDF2). Notes are never sent to a server. The note schema:

```typescript
type Note = {
  secret: bigint;
  nullifier: bigint;
  amount: bigint;
  token: string;        // token mint address
  leafIndex: number;    // position in the Merkle tree
  spent: boolean;
};
```

### Crypto Primitives

- **Poseidon** (`crypto/poseidon.ts`): ZK-friendly hash, compatible with the Circom implementation
- **Pedersen commitment** (`crypto/commitment.ts`): computes leaf commitments
- **Merkle tree** (`crypto/merkle.ts`): local Merkle tree for proof generation verification
- **Encryption** (`crypto/encryption.ts`): AES-GCM for local note storage

---

## Frontend

**Location:** `frontend/`  
**Stack:** React 18, TypeScript, Vite, TailwindCSS, Zustand

### Stores

| Store | Manages |
|-------|---------|
| `walletStore` | Solana wallet connection, public key, signing |
| `sdkStore` | ZylithClient instance, note list, balances |
| `uiStore` | Modal state, toasts, loading indicators |

### Key Pages

- **Swap**: slippage input, price impact display, token selector, real-time CLMM quote
- **Shield**: deposit form with amount + token selection; withdrawal form with note selector
- **Liquidity**: tick range selector with D3 chart, estimated fee projections
- **Positions**: table of active LP positions with accrued fees
- **Pool Browser**: searchable pool list with TVL, volume, fee APR

### Design System

The frontend uses **Obsidian Core**, a bespoke design language built for financial infrastructure. Full specification: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

---

## End-to-End Flow: Shielded Swap

Here is the complete sequence for a user swapping token A → token B:

```
1. User opens Swap page and connects wallet

2. SDK reads the user's unspent notes from NoteManager
   → finds a note for token A with sufficient balance

3. User enters swap amount; frontend calls SDK to estimate output
   → SDK reads pool state from Solana (tick range, reserves, fee)
   → returns estimated amountOut and price impact

4. User confirms the swap

5. SDK prepares circuit inputs:
   - private: secret, nullifier, Merkle path (fetched from ASP)
   - public: root, nullifierHash, tokenIn, tokenOut, amountIn, amountOutMin

6. SDK sends public inputs to ASP (POST /swap)

7. ASP generates the Groth16 proof via snarkjs worker
   → returns { proof, publicSignals }

8. SDK builds the Solana transaction:
   - instruction: shielded_swap
   - accounts: Coordinator, Pool, NullifierRecord (new), 2x CommitmentAccount (new)
   - proof data embedded in instruction data

9. User signs and submits the transaction

10. Solana program:
    - verifies Groth16 proof on-chain
    - checks NullifierRecord does not already exist
    - creates NullifierRecord (prevents double-spend)
    - creates 2 CommitmentAccounts (output note + change note)
    - updates pool reserves

11. SDK receives confirmation
    - marks the input note as spent
    - stores the two new output notes (encrypted) in NoteManager
```

Total user-facing time: proof generation (~2–5s on ASP) + transaction confirmation (~400ms on Solana).

---

## Security Model

| Threat | Mitigation |
|--------|-----------|
| Double-spend | Nullifier hash stored on-chain; program rejects if `NullifierRecord` already exists |
| Invalid proof accepted | Groth16 verification done on-chain with embedded verifying key |
| Note theft | Notes encrypted client-side with password-derived key; never sent to ASP |
| ASP lying about Merkle state | User can verify Merkle root matches on-chain `Coordinator.root` |
| Front-running | Amounts hidden in proof; only nullifier and commitment hashes are public |
| Replay attacks | Each note has a unique nullifier; proofs are commitment-specific |

### What the ASP Can and Cannot Do

**Can:**
- See which operation type is being requested (swap, withdraw, etc.)
- See the public inputs (root, nullifier hash, token addresses, amounts *after* the swap)
- Refuse to generate a proof (causing a denial of service)

**Cannot:**
- Learn the user's secret or pre-image of the nullifier
- Link input and output notes across different users
- Approve an invalid proof (verification is on-chain)
- Steal funds (the user signs their own Solana transaction)

---

## State Synchronization

The ASP maintains a Merkle tree that must stay consistent with on-chain state. The synchronization strategy:

1. **On startup:** ASP reads all `CommitmentAccount` PDAs from Solana, rebuilds the tree
2. **Background polling:** every N seconds (configurable), the ASP polls for new commitment events
3. **On deposit (`POST /deposit`):** ASP inserts the new leaf immediately and returns the updated root
4. **Drift detection:** if the ASP root doesn't match the on-chain `Coordinator.root`, the sync task re-fetches and rebuilds

Users can also trigger a manual sync via `POST /sync` if they suspect the ASP is behind.

The on-chain `Coordinator` is the authoritative source of truth. The ASP's SQLite tree is a cache. The SDK validates the Merkle root returned by the ASP against the on-chain value before building any proof.

# Zylith Protocol

> **Shielded Concentrated Liquidity Market Maker for Bitcoin wrappers and stablecoins on Solana.**

Zylith brings financial privacy to DeFi without sacrificing performance. Built on Solana for high-throughput, low-latency execution, Zylith lets users deposit, swap, and provide liquidity — all without revealing amounts, identities, or positions on-chain.

---

## Table of Contents

- [What is Zylith?](#what-is-zylith)
- [Why This Matters](#why-this-matters)
- [Architecture](#architecture)
- [Project Milestones](#project-milestones)
- [Key Features](#key-features)
- [How the Privacy Stack Works](#how-the-privacy-stack-works)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Team](#team)
- [License](#license)

---

## What is Zylith?

Zylith is a **privacy-native Concentrated Liquidity Market Maker (CLMM)** that enables shielded trading and liquidity provisioning on Solana. Every user action — deposit, swap, mint, or burn — can be shielded behind a zero-knowledge proof that hides:

- **Who** initiated the transaction
- **How much** was moved
- **Where** the funds originated

Unlike mixers or obfuscation tools, Zylith integrates privacy at the protocol level. The CLMM logic, tick-range liquidity, and LP positions are all first-class, on-chain constructs — they simply operate over hidden state.

Zylith is designed for Bitcoin wrappers (wBTC, cbBTC, tBTC) and stablecoins (USDT0, USDC), making it a natural privacy layer for the most liquid assets on Solana.

---

## Why This Matters

Public blockchains expose every transaction. For institutional traders, DeFi power users, and anyone who values financial privacy, this is a fundamental problem — not a minor inconvenience.

Existing privacy solutions on Solana either:
- Sacrifice DeFi composability (mixers, tumblers)
- Rely on centralized trust (off-chain escrow)
- Offer no liquidity primitives at all

Zylith solves this by combining:

1. **Groth16 zero-knowledge proofs** verified on-chain — no trusted intermediary required
2. **Concentrated liquidity** (CLMM-style, like Uniswap v3) for capital efficiency
3. **An Anonymous Service Provider** (ASP) that handles proof generation without ever learning private inputs
4. **A published SDK** so any developer can build privacy-preserving DeFi applications on top

---

## Architecture

Zylith is organized into four independent, well-defined layers that compose into a full privacy stack:

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│         Shielded UI · Wallet · Pool Browser · Dashboard      │
└─────────────────────┬──────────────────────┬────────────────┘
                      │                      │
          ┌───────────▼──────────┐  ┌────────▼──────────────┐
          │      @zylith/sdk     │  │   ASP (Rust / Axum)   │
          │  TypeScript Client   │  │  Proof Orchestration  │
          │  Note Management     │  │  Merkle Tree Sync     │
          │  Crypto Primitives   │  │  REST API + Relayer   │
          └───────────┬──────────┘  └────────┬──────────────┘
                      │                      │
          ┌───────────▼──────────────────────▼──────────────┐
          │           Solana Programs (Anchor / Rust)         │
          │  Coordinator · Pool · Verifier · Nullifier Check  │
          └─────────────────────────────────────────────────┘
```

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS | User interface for all shielded operations |
| **SDK** | TypeScript (ESM), snarkjs, circomlibjs | Client logic, note management, proof wiring |
| **ASP** | Rust, Axum, Tokio, SQLite | Backend proving service, Merkle tree, relay |
| **Circuits** | Circom 2.2, Groth16 | Zero-knowledge proof definitions |
| **Contracts** | Rust, Anchor, Solana | On-chain state, verification, CLMM logic |

---

## Project Milestones

### Published SDK — `@zylith/sdk`

The Zylith TypeScript SDK is a fully standalone npm package that encapsulates all privacy primitives. Developers can integrate shielded operations into their own applications without rebuilding the cryptographic stack.

The SDK exposes:
- A `ZylithClient` supporting both **ASP proving** (recommended) and **client-side proving** (via snarkjs)
- Encrypted **note storage** with password-based key derivation
- **Poseidon hashing**, Pedersen commitments, and a 20-level Merkle tree
- Type-safe operations for deposit, withdraw, swap, mint, and burn

### ZK Circuit Suite — Circom 2.2 / Groth16

Four production-grade circuits power every shielded operation:

| Circuit | Constraints | Purpose |
|---------|-------------|---------|
| `membership` | ~3,561 | Withdrawal: prove note ownership without revealing the note |
| `swap` | — | Private swap: consume input note, produce output + change |
| `mint` (liquidity) | ~8,723 | Shielded LP: consume two notes, emit position commitment |
| `burn` (liquidity) | ~4,611 | Redeem LP position: emit two token output notes |

Each circuit enforces double-spend prevention via nullifier hashes. Proofs are verified on-chain using the `groth16-solana` Rust crate — no trusted party required.

The tree height is **20 levels**, supporting up to **1,048,576 simultaneous shielded notes**.

### Anonymous Service Provider (ASP)

The ASP is a production-ready Rust backend that handles the heaviest responsibilities in the privacy stack:

- **REST API** (Axum): endpoints for all five shielded operations plus tree queries
- **Merkle tree management**: SQLite-backed tree that syncs with on-chain commitment events
- **Proof generation**: delegates to a Node.js worker process (snarkjs) without learning private inputs
- **Optional relayer**: can submit transactions on-chain on behalf of users
- **Background sync**: polls Solana for new commitments and updates local state automatically

Deployed on **Fly.io** with a persistent volume for the SQLite database, tolerating restarts without data loss.

### Frontend — Obsidian Core Design System

The Zylith frontend is a full DeFi application built around a bespoke design language called **Obsidian Core**: warm metallic golds, lacquered blacks, and precise typographic rhythm — designed to project financial authority without decoration.

Pages and flows:
- **Landing** — protocol overview and entry point
- **Dashboard** — portfolio-level view of all shielded positions
- **Swap** — shielded token exchange with real-time price impact
- **Shield** — deposit and withdraw from the privacy pool
- **Liquidity** — open and close concentrated liquidity positions
- **Positions** — track active LP ranges and earned fees
- **Pool Browser** — discover and analyze available pools
- **Settings** — RPC configuration, proving mode, wallet preferences

State is managed with Zustand (wallet, SDK, UI). Charts are built with D3.

### On-Chain Groth16 Verification

Zylith verifies Groth16 proofs entirely on-chain inside Anchor programs. No off-chain bridge, no oracle, no trusted coordinator. The `groth16-solana` crate validates proof inputs inline with each instruction, making every shielded operation trustless.

---

## Key Features

- **Shielded deposit** — lock tokens into a private note commitment recorded on-chain
- **Shielded withdrawal** — redeem a note via membership proof; amount and ownership stay hidden
- **Shielded swap** — trade inside the CLMM without revealing input/output amounts
- **Shielded liquidity provision** — add liquidity to a tick range using two private notes
- **Shielded LP withdrawal** — exit an LP position and receive two output notes
- **Dual proving modes** — prove locally in the browser or delegate to the ASP
- **CLMM with tick ranges** — capital-efficient liquidity, Uniswap v3-style
- **Bitcoin-wrapper and stablecoin focus** — USDT0-first configuration
- **Encrypted note persistence** — notes stored locally, encrypted, never sent to a server
- **Nullifier double-spend protection** — each note can only be spent once

---

## How the Privacy Stack Works

Every shielded operation follows the same structural pattern:

```
1. User holds a private Note { secret, nullifier, amount, token }
2. A ZK circuit proves the note exists in the Merkle tree (without revealing it)
3. The nullifier hash is published on-chain (preventing reuse)
4. New commitment(s) are created for the output(s)
5. The Solana program verifies the Groth16 proof and updates state
```

### Note Lifecycle

```
Deposit                    Withdraw / Swap / Mint / Burn
───────                    ──────────────────────────────
Token → Commitment    →    Nullifier published (note consumed)
        stored in          New commitment(s) created (output notes)
        Merkle tree        Tokens transferred / new state recorded
```

### Merkle Tree

The protocol maintains a binary Merkle tree (height 20) across two sources:

- **On-chain**: commitment accounts indexed by leaf position
- **Off-chain (ASP)**: SQLite mirror synchronized via event polling

When a user needs a Merkle proof for their note, they request it from the ASP (`GET /tree/proof/{leaf_index}`). The ASP returns the sibling path, and the client feeds it into the circuit as a private input.

### Amount Encoding

Field arithmetic in Groth16 constrains values to the BN254 scalar field. Amounts are split into two 128-bit limbs (`amount_low`, `amount_high`) to represent full 256-bit token balances within circuit constraints.

---

## Tech Stack

| Component | Libraries / Tools |
|-----------|------------------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Zustand, D3, Solana Wallet Adapter |
| SDK | TypeScript (ESM), snarkjs, circomlibjs, `@solana/web3.js`, `@coral-xyz/anchor` |
| ASP | Rust 2021, Axum, Tokio, SQLite, `cargo-sqlx`, Node.js 20 (worker) |
| Circuits | Circom 2.2, snarkjs, Groth16, Garaga verifier tooling |
| Contracts | Rust, Anchor, `groth16-solana`, SPL Token |
| Build | Bun (monorepo), Cargo, TypeScript compiler |
| CI/CD | GitHub Actions (frontend, SDK, ASP, contracts) |
| Deployment | Fly.io (ASP), Vercel (frontend), Anchor deploy (contracts) |
| Package Manager | Bun v1+ |

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1+
- [Rust](https://rustup.rs) (stable)
- [Solana CLI](https://docs.solanalabs.com/cli/install) + [Anchor](https://www.anchor-lang.com/docs/installation)
- Node.js 20+ (required by ASP snarkjs worker)

### 1. Clone and install

```bash
git clone https://github.com/SunsetLabs-Game/zylith-solana.git
cd zylith-solana
bun install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_RPC_URL=https://api.testnet.solana.com
VITE_POOL_ADDRESS=<deployed pool address>
VITE_COORDINATOR_ADDRESS=AifYaPemPJgQVhqxQs583YELWmbyVQwL9vF4cAjsyvnH
VITE_ASP_URL=http://localhost:3001
ADMIN_PRIVATE_KEY=<relayer private key, base58>
```

Sync the environment to all sub-packages:

```bash
bun run env:sync
```

### 3. Start development servers

**Frontend only:**
```bash
bun run dev:frontend
# → http://localhost:5173
```

**ASP (Rust backend):**
```bash
bun run dev:asp
# → http://localhost:3001
```

**All services together:**
```bash
bun run dev:all
```

---

## Project Structure

```
solana-protocol/
├── frontend/              # React 18 application (Vite + TailwindCSS)
│   ├── src/
│   │   ├── pages/         # Landing, Dashboard, Swap, Shield, Liquidity, Positions…
│   │   ├── components/    # Reusable UI components (Obsidian Core)
│   │   ├── store/         # Zustand stores (wallet, SDK, UI)
│   │   └── lib/           # Utilities, RPC helpers, formatters
│   └── vite.config.ts
│
├── sdk/                   # @zylith/sdk — published npm package
│   ├── src/
│   │   ├── client.ts      # ZylithClient (ASP and client-side proving)
│   │   ├── crypto/        # Poseidon, commitments, Merkle tree, encryption
│   │   ├── operations/    # deposit, withdraw, swap, mint, burn
│   │   ├── storage/       # NoteManager (encrypted local persistence)
│   │   ├── solana/        # RPC client, pool reader, coordinator reader
│   │   └── asp/           # ASP REST client
│   └── package.json
│
├── asp/                   # Anonymous Service Provider (Rust / Axum)
│   ├── src/
│   │   ├── api/           # HTTP handlers for all shielded operations
│   │   ├── db/            # SQLite schema and Merkle tree queries
│   │   ├── sync/          # Background Solana event poller
│   │   ├── relayer/       # Optional transaction relay
│   │   └── config.rs      # Environment-driven configuration
│   ├── Cargo.toml
│   └── Dockerfile         # Multi-stage: Rust + Python 3.10 + Node.js 20
│
├── circuits/              # Circom 2.2 ZK circuits
│   ├── membership.circom  # Withdrawal proof (~3,561 constraints)
│   ├── swap.circom        # Private swap proof
│   ├── liquidity.circom   # Mint (~8,723) and burn (~4,611) proofs
│   └── build/             # Generated R1CS, WASM, proving keys
│
├── contracts/
│   └── anchor/            # Solana programs (Anchor framework)
│       ├── programs/zylith/
│       │   └── src/
│       │       ├── instructions/  # initialize, create_pool, deposit, withdraw, swap…
│       │       ├── state/         # Coordinator, Pool, NullifierRecord, CommitmentAccount
│       │       └── lib.rs
│       └── tests/
│
├── docs/                  # Extended documentation
│   └── DESIGN_SYSTEM.md   # Obsidian Core visual specification
│
├── scripts/               # Build and environment utilities
├── .github/               # CI/CD workflows
├── fly.toml               # ASP deployment config (Fly.io)
├── Dockerfile             # ASP production image
└── package.json           # Bun workspace root
```

---

## Development

### Build all layers

```bash
bun run build
```

This compiles the SDK, frontend, ASP binary, and Anchor contracts in sequence.

### Build individual layers

```bash
bun run build:sdk          # TypeScript → dist/
bun run build:frontend     # Vite production build
bun run build:asp          # Rust release binary
bun run build:contracts    # Anchor build + deploy metadata
```

### Compile ZK circuits

```bash
bun run circuits:build              # All four circuits
bun run circuits:build:membership   # Membership only
bun run circuits:build:swap         # Swap only
bun run circuits:build:mint         # Mint only
bun run circuits:build:burn         # Burn only
```

### Generate and verify proofs

```bash
bun run circuits:prove              # Generate proofs for all circuits
bun run circuits:verify             # Verify all generated proofs
```

---

## Testing

```bash
bun run test               # All tests (SDK + ASP + contracts)
bun run test:sdk           # SDK unit tests (Vitest)
bun run test:asp           # ASP Rust tests (cargo test)
bun run test:contracts     # Anchor integration tests
bun run typecheck          # Frontend TypeScript type check
bun run check              # Full suite: env sync + audit + typecheck + all tests
```

---

## Deployment

### Solana Programs

```bash
cd contracts/anchor
anchor build
anchor deploy
```

The coordinator program ID is `AifYaPemPJgQVhqxQs583YELWmbyVQwL9vF4cAjsyvnH`. After deploying, run `initialize_coordinator` to set up global state.

### ASP (Fly.io)

```bash
fly deploy
```

The ASP runs on 1 GB RAM with a persistent volume mounted at `/data/zylith_asp.db`. The image is a multi-stage Dockerfile: Rust for the binary, Python 3.10 for Garaga tooling, Node.js 20 for the snarkjs worker.

### Frontend (Vercel / Static)

```bash
bun run build:frontend
# Deploy frontend/dist/ to Vercel, Netlify, Cloudflare Pages, or any CDN
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | Deep dive into each layer, data flow, and design decisions |
| [SDK Guide](docs/SDK.md) | How to use `@zylith/sdk` in your own application |
| [ASP API Reference](docs/ASP_API.md) | REST endpoint specification for the Anonymous Service Provider |
| [Circuits](docs/CIRCUITS.md) | ZK circuit internals, public/private inputs, constraint counts |
| [Design System](docs/DESIGN_SYSTEM.md) | Obsidian Core visual specification |

---

## Team

Zylith is built by:

| Name | GitHub |
|------|--------|
| Sebastián Salazar | [@salazarsebas](https://github.com/salazarsebas) |
| Kevin Membreño | [@KevinMB0220](https://github.com/KevinMB0220) |
| Josue Araya | [@Josue19-08](https://github.com/Josue19-08) |

---

## License

MIT — see [LICENSE](LICENSE) for details.

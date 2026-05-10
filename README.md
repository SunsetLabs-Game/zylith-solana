# Zylith

Shielded CLMM for Bitcoin wrappers and stablecoins on Solana

## Project Overview

**Zylith** is a privacy-native concentrated liquidity market maker for Bitcoin wrappers and stablecoin routing on **Solana**.

## Why Solana

Zylith targets **Solana** for its high throughput and low latency, enabling high-performance private execution of complex ZK-shielded operations.

## Architecture

The codebase is organized into four layers:

1. `frontend/`
   User-facing Solana app for shielded deposits, swaps, withdrawals, and LP flows.
2. `sdk/`
   TypeScript client logic using `@solana/web3.js` and `@coral-xyz/anchor`.
3. `asp/`
   Backend service (Anonymous Service Provider) for proving orchestration and Merkle tree synchronization.
4. `contracts/anchor/`
   Solana programs for factory, pool logic, verifiers, and coordinator state.

The privacy stack uses commitments, nullifiers, Merkle proofs, and circuit artifacts under `circuits/`.

## Key Features

- Shielded deposits into private notes
- Shielded withdrawals
- Shielded swaps
- Shielded liquidity provisioning and range updates
- Bitcoin-wrapper and stablecoin market orientation
- USDT0-first token configuration
- Off-chain proving and relay pipeline via ASP

## Quick Start

### Workspace

```bash
bun install
bun run env:sync
```

### Frontend

```bash
bun run dev:frontend
```

### Backend (ASP)

```bash
bun run dev:asp
```

### Full checks

```bash
bun run check
```

## Environment

Copy `.env.example` to `.env.local` and set:

- `VITE_RPC_URL`: Your Solana RPC URL
- `VITE_POOL_ADDRESS`: The deployed pool address
- `VITE_COORDINATOR_ADDRESS`: The deployed coordinator program ID
- `ADMIN_PRIVATE_KEY`: Private key for the relayer/admin

## Deployment

### Solana Programs (Anchor)

```bash
cd contracts/anchor
anchor build
anchor deploy
```

### Frontend

The frontend is a Vite application. You can deploy it to Vercel or any static hosting.

```bash
bun run build:frontend
```

## Team

- **Zylith Protocol**
- Sebastián Salazar ([GitHub](https://github.com/salazarsebas))
- Kevin Membreño ([GitHub](https://github.com/KevinMB0220))
- Josue Araya ([GitHub](https://github.com/Josue19-08))

## License

MIT

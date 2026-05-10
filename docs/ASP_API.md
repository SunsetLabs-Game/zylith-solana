# ASP API Reference

The Anonymous Service Provider (ASP) exposes a REST API for proof generation, Merkle tree queries, and protocol state. All endpoints return JSON.

**Base URL:** configured via `VITE_ASP_URL` (default: `http://localhost:3001`)

---

## Table of Contents

- [Health](#health)
- [Deposit](#deposit)
- [Withdraw](#withdraw)
- [Swap](#swap)
- [Mint (Liquidity)](#mint-liquidity)
- [Burn (Liquidity)](#burn-liquidity)
- [Merkle Tree](#merkle-tree)
- [Nullifier](#nullifier)
- [Sync](#sync)
- [Error Format](#error-format)

---

## Health

### `GET /status`

Returns ASP operational status.

**Response:**
```json
{
  "status": "ok",
  "merkle_root": "0x1a2b...",
  "leaf_count": 42,
  "solana_rpc": "https://api.testnet.solana.com"
}
```

---

## Deposit

### `POST /deposit`

Registers a new commitment in the Merkle tree. Call this after a successful `shielded_deposit` transaction on Solana to ensure the ASP's local tree is updated immediately (instead of waiting for background sync).

**Request:**
```json
{
  "commitment": "0x1a2b3c...",
  "leaf_index": 42
}
```

| Field | Type | Description |
|-------|------|-------------|
| `commitment` | `string` (hex) | The Poseidon hash of the note |
| `leaf_index` | `number` | On-chain leaf index from the deposit transaction |

**Response:**
```json
{
  "root": "0xdeadbeef...",
  "leaf_index": 42
}
```

---

## Withdraw

### `POST /withdraw`

Generates a Groth16 membership proof for a withdrawal.

**Request:**
```json
{
  "root": "0x...",
  "nullifier_hash": "0x...",
  "recipient": "So11111111111111111111111111111111111111112",
  "amount_low": "1000000",
  "amount_high": "0",
  "token": "0x...",
  "secret": "0x...",
  "nullifier": "0x...",
  "path_elements": ["0x...", "0x...", "..."],
  "path_indices": [0, 1, 0, "..."]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `root` | `string` | Current Merkle root |
| `nullifier_hash` | `string` | Poseidon(secret, nullifier), published on-chain |
| `recipient` | `string` | Solana address to receive the tokens |
| `amount_low` | `string` | amount % 2^128 |
| `amount_high` | `string` | amount >> 128 |
| `token` | `string` | Token address as field element |
| `secret` | `string` | Note secret (private) |
| `nullifier` | `string` | Note nullifier (private) |
| `path_elements` | `string[]` | 20 Merkle sibling hashes |
| `path_indices` | `number[]` | 20 path directions (0=left, 1=right) |

**Response:**
```json
{
  "proof": {
    "pi_a": ["0x...", "0x...", "1"],
    "pi_b": [["0x...", "0x..."], ["0x...", "0x..."], ["1", "0"]],
    "pi_c": ["0x...", "0x...", "1"],
    "protocol": "groth16"
  },
  "public_signals": ["0x...", "0x...", "..."]
}
```

---

## Swap

### `POST /swap`

Generates a Groth16 proof for a shielded swap.

**Request:**
```json
{
  "root": "0x...",
  "nullifier_hash": "0x...",
  "token_in": "0x...",
  "token_out": "0x...",
  "amount_in": "500000",
  "amount_out_min": "490000",
  "new_commitment": "0x...",
  "change_commitment": "0x...",
  "secret": "0x...",
  "nullifier": "0x...",
  "input_amount_low": "1000000",
  "input_amount_high": "0",
  "path_elements": ["0x..."],
  "path_indices": [0]
}
```

**Response:**
```json
{
  "proof": { ... },
  "public_signals": ["0x...", "..."]
}
```

The returned proof contains 8 public signals corresponding to:
`root, nullifierHash, newCommitment, tokenIn, tokenOut, amountIn, amountOutMin, changeCommitment`

---

## Mint (Liquidity)

### `POST /mint`

Generates a Groth16 proof for shielded liquidity provision.

**Request:**
```json
{
  "root": "0x...",
  "nullifier_hash_0": "0x...",
  "nullifier_hash_1": "0x...",
  "position_commitment": "0x...",
  "tick_lower": -100,
  "tick_upper": 100,
  "change_commitment_0": "0x...",
  "change_commitment_1": "0x...",
  "secret_0": "0x...",
  "nullifier_0": "0x...",
  "secret_1": "0x...",
  "nullifier_1": "0x...",
  "amount_0_low": "1000000",
  "amount_0_high": "0",
  "amount_1_low": "1000000",
  "amount_1_high": "0",
  "path_elements_0": ["0x..."],
  "path_indices_0": [0],
  "path_elements_1": ["0x..."],
  "path_indices_1": [0]
}
```

**Response:**
```json
{
  "proof": { ... },
  "public_signals": ["0x...", "..."]
}
```

8 public signals: `root, nullifierHash0, nullifierHash1, positionCommitment, tickLower, tickUpper, changeCommitment0, changeCommitment1`

---

## Burn (Liquidity)

### `POST /burn`

Generates a Groth16 proof for LP position withdrawal.

**Request:**
```json
{
  "root": "0x...",
  "position_nullifier_hash": "0x...",
  "new_commitment_0": "0x...",
  "new_commitment_1": "0x...",
  "tick_lower": -100,
  "tick_upper": 100,
  "position_secret": "0x...",
  "position_nullifier": "0x...",
  "path_elements": ["0x..."],
  "path_indices": [0]
}
```

**Response:**
```json
{
  "proof": { ... },
  "public_signals": ["0x...", "..."]
}
```

---

## Merkle Tree

### `GET /tree/root`

Returns the current Merkle root as tracked by the ASP.

**Response:**
```json
{
  "root": "0x1a2b3c...",
  "leaf_count": 42
}
```

### `GET /tree/proof/{leaf_index}`

Returns the Merkle sibling path for a specific leaf.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `leaf_index` | `number` | The leaf position (returned during deposit) |

**Response:**
```json
{
  "leaf": "0x...",
  "leaf_index": 42,
  "path_elements": [
    "0x...",
    "0x...",
    "... (20 elements total)"
  ],
  "path_indices": [0, 1, 0, "... (20 values)"],
  "root": "0x..."
}
```

---

## Nullifier

### `GET /nullifier/{nullifier_hash}`

Checks whether a nullifier has been spent.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `nullifier_hash` | `string` (hex) | The nullifier hash to check |

**Response:**
```json
{
  "nullifier_hash": "0x...",
  "spent": true
}
```

---

## Sync

### `POST /sync`

Triggers a manual sync of the ASP's Merkle tree against on-chain commitment accounts. Normally the ASP auto-syncs in the background, but this endpoint allows forcing a sync immediately.

**Request:** empty body

**Response:**
```json
{
  "synced_leaves": 3,
  "new_root": "0x..."
}
```

---

## Error Format

All errors follow this structure:

```json
{
  "error": "brief error message",
  "detail": "more specific description (optional)"
}
```

| HTTP Status | Meaning |
|-------------|---------|
| `400` | Invalid request body or missing fields |
| `404` | Leaf index or nullifier not found |
| `409` | Nullifier already spent |
| `500` | Proof generation failed or internal error |
| `503` | ASP is not synced with Solana; retry after sync |

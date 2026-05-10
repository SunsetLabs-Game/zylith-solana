use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::relayer::PoolKeyParams;

// --- Deposit ---

#[derive(Debug, Deserialize, ToSchema)]
pub struct DepositRequest {
    /// Pedersen commitment hash (0x-prefixed hex, 32 bytes)
    pub commitment: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct DepositResponse {
    /// Always "prepared" — deposit is submitted directly by the user wallet
    pub status: String,
    /// Leaf index that will be assigned to this commitment
    pub leaf_index: u32,
    /// Prepared calldata for on-chain submission (empty for deposit; wallet builds the tx)
    pub calldata: Vec<String>,
    /// Predicted Merkle root after the deposit is confirmed
    pub root: String,
}

// --- Withdraw (membership proof) ---

#[derive(Debug, Deserialize, ToSchema)]
pub struct WithdrawRequest {
    /// Note secret (decimal string, Poseidon field element)
    pub secret: String,
    /// Note nullifier (decimal string, Poseidon field element)
    pub nullifier: String,
    /// Low 128 bits of the note amount (decimal string)
    pub amount_low: String,
    /// High 128 bits of the note amount (decimal string, usually "0")
    pub amount_high: String,
    /// Token mint address (base58)
    pub token: String,
    /// Recipient wallet address (base58)
    pub recipient: String,
    /// Leaf index of the commitment in the Merkle tree
    pub leaf_index: u32,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct WithdrawResponse {
    /// Always "prepared"
    pub status: String,
    /// Groth16 proof calldata for on-chain `shielded_withdraw` instruction
    pub calldata: Vec<String>,
    /// Nullifier hash that will be marked spent on-chain
    pub nullifier_hash: String,
}

// --- Swap ---

#[derive(Debug, Deserialize, ToSchema)]
pub struct SwapRequest {
    /// Pool identification
    pub pool_key: PoolKeyParams,
    /// The note being spent as swap input
    pub input_note: NoteInput,
    /// Swap amounts and direction
    pub swap_params: SwapParams,
    /// Secrets for the new output note (receives `amount_out`)
    pub output_note: NoteSecrets,
    /// Secrets for the change note (receives `input_balance - amount_in`)
    pub change_note: NoteSecrets,
    /// CLMM sqrt price limit as 0x-prefixed hex U256
    pub sqrt_price_limit: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct SwapParams {
    /// Input token mint (base58)
    pub token_in: String,
    /// Output token mint (base58)
    pub token_out: String,
    /// Exact amount to swap in (decimal string)
    pub amount_in: String,
    /// Minimum acceptable output amount — tx reverts if not met (decimal string)
    pub amount_out_min: String,
    /// Low 128 bits of the expected output amount committed in the ZK proof
    pub amount_out_low: String,
    /// High 128 bits of the expected output amount (usually "0")
    pub amount_out_high: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SwapResponse {
    /// Always "prepared"
    pub status: String,
    /// Groth16 proof calldata for on-chain `shielded_swap` instruction
    pub calldata: Vec<String>,
    /// Predicted Merkle root after both output commitments land on-chain
    pub final_root: String,
    /// Commitment hash for the output note (decimal string)
    pub new_commitment: String,
    /// Commitment hash for the change note (decimal string)
    pub change_commitment: String,
    /// Actual output amount echoed back (decimal string)
    pub amount_out: String,
    /// Actual change amount echoed back (decimal string)
    pub amount_change: String,
}

// --- Mint ---

#[derive(Debug, Deserialize, ToSchema)]
pub struct MintRequest {
    /// Pool identification
    pub pool_key: PoolKeyParams,
    /// Note for token0 input
    pub input_note_0: NoteInput,
    /// Note for token1 input
    pub input_note_1: NoteInput,
    /// New position to create
    pub position: PositionInput,
    /// Amounts being deposited into the position
    pub amounts: MintAmounts,
    /// Secrets for the token0 change note
    pub change_note_0: NoteSecrets,
    /// Secrets for the token1 change note
    pub change_note_1: NoteSecrets,
    /// Liquidity units to mint (u128 as integer)
    pub liquidity: u128,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct PositionInput {
    /// Position secret (decimal string)
    pub secret: String,
    /// Position nullifier (decimal string)
    pub nullifier: String,
    /// Liquidity amount (decimal string)
    pub liquidity: String,
    /// Lower tick bound (signed)
    pub tick_lower: i32,
    /// Upper tick bound (signed)
    pub tick_upper: i32,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct MintAmounts {
    /// Low 128 bits of token0 amount
    pub amount0_low: String,
    /// High 128 bits of token0 amount (usually "0")
    pub amount0_high: String,
    /// Low 128 bits of token1 amount
    pub amount1_low: String,
    /// High 128 bits of token1 amount (usually "0")
    pub amount1_high: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct MintResponse {
    /// Always "prepared"
    pub status: String,
    /// Groth16 proof calldata for on-chain `shielded_mint` instruction
    pub calldata: Vec<String>,
    /// Predicted Merkle root after the three new commitments land on-chain
    pub final_root: String,
    /// Commitment hash for the new position note
    pub position_commitment: String,
    /// Commitment hash for the token0 change note
    pub change_commitment_0: String,
    /// Commitment hash for the token1 change note
    pub change_commitment_1: String,
}

// --- Burn ---

#[derive(Debug, Deserialize, ToSchema)]
pub struct BurnRequest {
    /// Pool identification
    pub pool_key: PoolKeyParams,
    /// The position note being burned
    pub position_note: PositionNoteInput,
    /// Output note for token0 proceeds
    pub output_note_0: OutputNoteInput,
    /// Output note for token1 proceeds
    pub output_note_1: OutputNoteInput,
    /// Liquidity units to remove (u128 as integer)
    pub liquidity: u128,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct PositionNoteInput {
    /// Position secret (decimal string)
    pub secret: String,
    /// Position nullifier (decimal string)
    pub nullifier: String,
    /// Liquidity amount (decimal string)
    pub liquidity: String,
    /// Lower tick bound (signed)
    pub tick_lower: i32,
    /// Upper tick bound (signed)
    pub tick_upper: i32,
    /// Leaf index of the position commitment in the Merkle tree
    pub leaf_index: u32,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct OutputNoteInput {
    /// Note secret (decimal string)
    pub secret: String,
    /// Note nullifier (decimal string)
    pub nullifier: String,
    /// Low 128 bits of the output amount
    pub amount_low: String,
    /// High 128 bits of the output amount (usually "0")
    pub amount_high: String,
    /// Token mint address (base58)
    pub token: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct BurnResponse {
    /// Always "prepared"
    pub status: String,
    /// Groth16 proof calldata for on-chain `shielded_burn` instruction
    pub calldata: Vec<String>,
    /// Predicted Merkle root after the two output commitments land on-chain
    pub final_root: String,
    /// Commitment hash for the token0 output note
    pub new_commitment_0: String,
    /// Commitment hash for the token1 output note
    pub new_commitment_1: String,
    /// Actual token0 amount echoed back (decimal string)
    pub amount_0: String,
    /// Actual token1 amount echoed back (decimal string)
    pub amount_1: String,
}

// --- Shared note types ---

#[derive(Debug, Deserialize, ToSchema)]
pub struct NoteInput {
    /// Note secret (decimal string)
    pub secret: String,
    /// Note nullifier (decimal string)
    pub nullifier: String,
    /// Low 128 bits of the note balance
    pub balance_low: String,
    /// High 128 bits of the note balance (usually "0")
    pub balance_high: String,
    /// Token mint address (base58)
    pub token: String,
    /// Leaf index of this note's commitment in the Merkle tree
    pub leaf_index: u32,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct NoteSecrets {
    /// Note secret (decimal string)
    pub secret: String,
    /// Note nullifier (decimal string)
    pub nullifier: String,
}

// --- Sync ---

#[derive(Debug, Deserialize, ToSchema)]
pub struct SyncCommitmentsRequest {
    /// List of commitment hashes (decimal strings) to resolve
    pub commitments: Vec<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct CommitmentWithIndex {
    /// Commitment hash (decimal string)
    pub commitment: String,
    /// Leaf index if the commitment exists in the tree, null otherwise
    pub leaf_index: Option<u32>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SyncCommitmentsResponse {
    pub commitments: Vec<CommitmentWithIndex>,
}

// --- Tree ---

#[derive(Debug, Serialize, ToSchema)]
pub struct TreeRootResponse {
    /// Current Merkle root (0x-prefixed hex, 32 bytes)
    pub root: String,
    /// Total number of leaves inserted
    pub leaf_count: u32,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct TreeProofResponse {
    /// Zero-based leaf index
    pub leaf_index: u32,
    /// Commitment stored at this leaf (decimal string)
    pub commitment: String,
    /// Sibling hashes along the path from leaf to root (decimal strings)
    pub path_elements: Vec<String>,
    /// Direction bits for each level: 0 = left, 1 = right
    pub path_indices: Vec<u32>,
    /// Current Merkle root
    pub root: String,
}

// --- Nullifier ---

#[derive(Debug, Serialize, ToSchema)]
pub struct NullifierResponse {
    /// The queried nullifier hash
    pub nullifier_hash: String,
    /// Whether this nullifier has been spent on-chain
    pub spent: bool,
    /// Circuit type that spent the nullifier (e.g. "membership", "swap")
    pub circuit_type: Option<String>,
    /// On-chain transaction signature where the nullifier was spent
    pub tx_hash: Option<String>,
}

// --- Status ---

#[derive(Debug, Serialize, ToSchema)]
pub struct StatusResponse {
    /// True when both the database and ZK worker are healthy
    pub healthy: bool,
    /// Semver version of the ASP binary
    pub version: String,
    pub tree: TreeStatus,
    pub sync: SyncStatus,
    pub contracts: ContractAddresses,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct TreeStatus {
    /// Total committed leaves in the tree
    pub leaf_count: u32,
    /// Latest known Merkle root, null if tree is empty
    pub root: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SyncStatus {
    /// Last Solana slot number processed by the sync worker
    pub last_synced_block: Option<u64>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ContractAddresses {
    /// Coordinator program ID (base58)
    pub coordinator: String,
    /// Pool program ID (base58)
    pub pool: String,
}

// --- Error ---

/// Error response returned on 4xx/5xx status codes
#[derive(Debug, Serialize, ToSchema)]
pub struct ErrorBody {
    /// Human-readable error description
    pub error: String,
    /// HTTP status code
    pub status: u16,
}

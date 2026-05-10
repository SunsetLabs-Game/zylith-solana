use std::str::FromStr;
use std::sync::Arc;

use solana_sdk::hash::hashv;
use solana_client::rpc_client::RpcClient;
use solana_sdk::instruction::{AccountMeta, Instruction};
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::Keypair;
use solana_sdk::signer::Signer;
use solana_sdk::transaction::Transaction;

#[derive(Debug, Clone, serde::Deserialize, utoipa::ToSchema)]
pub struct PoolKeyParams {
    /// Mint address of the first token in the pool (base58)
    pub token_0: String,
    /// Mint address of the second token in the pool (base58)
    pub token_1: String,
    /// Tick spacing for the CLMM pool
    pub tick_spacing: u16,
}

use crate::config::Config;
use crate::error::AspError;

use super::Relayer;

pub struct SolanaRelayer {
    rpc_client: Arc<RpcClient>,
    keypair: Keypair,
    coordinator_address: Pubkey,
    coordinator_state: Option<Pubkey>,
}

impl SolanaRelayer {
    pub async fn new(config: &Config) -> Result<Self, AspError> {
        if !config.enable_relayer {
            return Err(AspError::Config(
                "Solana relayer is disabled; enable RELAYER_ENABLED to provide on-chain submission"
                    .into(),
            ));
        }

        let rpc_client = Arc::new(RpcClient::new(config.rpc_url.clone()));

        let private_key = config
            .admin_private_key
            .as_deref()
            .ok_or_else(|| AspError::Config("ADMIN_PRIVATE_KEY is required".into()))?;

        let keypair = Keypair::from_base58_string(private_key);

        let coordinator_address = Pubkey::from_str(&config.coordinator_address)
            .map_err(|e| AspError::Config(format!("Invalid coordinator_address: {e}")))?;

        let coordinator_state = config
            .coordinator_account
            .as_deref()
            .map(|s| {
                Pubkey::from_str(s)
                    .map_err(|e| AspError::Config(format!("Invalid COORDINATOR_ACCOUNT: {e}")))
            })
            .transpose()?;

        Ok(Self {
            rpc_client,
            keypair,
            coordinator_address,
            coordinator_state,
        })
    }

    async fn send_instruction(
        &self,
        program_id: Pubkey,
        data: Vec<u8>,
        accounts: Vec<AccountMeta>,
    ) -> Result<String, AspError> {
        let instruction = Instruction {
            program_id,
            accounts,
            data,
        };

        let recent_blockhash = self
            .rpc_client
            .get_latest_blockhash()
            .map_err(|e| AspError::RpcError(format!("Failed to get recent blockhash: {e}")))?;

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&self.keypair.pubkey()),
            &[&self.keypair],
            recent_blockhash,
        );

        let signature = self
            .rpc_client
            .send_and_confirm_transaction(&tx)
            .map_err(|e| AspError::TransactionFailed(format!("Transaction failed: {e}")))?;

        Ok(signature.to_string())
    }
}

/// Compute the 8-byte Anchor instruction discriminator: sha256("global:<name>")[..8]
fn anchor_discriminator(instruction_name: &str) -> [u8; 8] {
    let preimage = format!("global:{instruction_name}");
    let hash = hashv(&[preimage.as_bytes()]);
    hash.to_bytes()[..8].try_into().expect("sha256 output is 32 bytes")
}

/// Parse a 0x-prefixed hex string into a [u8; 32], left-padding with zeros.
fn parse_hex_root(root: &str) -> Result<[u8; 32], AspError> {
    let stripped = root
        .strip_prefix("0x")
        .or_else(|| root.strip_prefix("0X"))
        .unwrap_or(root);
    let bytes = hex::decode(stripped)
        .map_err(|e| AspError::InvalidInput(format!("Invalid root hex: {e}")))?;
    if bytes.len() > 32 {
        return Err(AspError::InvalidInput("Root exceeds 32 bytes".into()));
    }
    let mut padded = [0u8; 32];
    padded[32 - bytes.len()..].copy_from_slice(&bytes);
    Ok(padded)
}

#[async_trait::async_trait]
impl Relayer for SolanaRelayer {
    async fn deposit(&self, _commitment: &str) -> Result<String, AspError> {
        Err(AspError::NotImplemented(
            "deposit: use direct wallet submission via prepared calldata".into(),
        ))
    }

    async fn submit_merkle_root(&self, root: &str) -> Result<String, AspError> {
        let coordinator_state = self.coordinator_state.ok_or_else(|| {
            AspError::Config(
                "COORDINATOR_ACCOUNT env var is required for Merkle root submission".into(),
            )
        })?;

        let root_bytes = parse_hex_root(root)?;

        let (root_record, _) = Pubkey::find_program_address(
            &[b"root", &root_bytes],
            &self.coordinator_address,
        );

        let mut data = Vec::with_capacity(40);
        data.extend_from_slice(&anchor_discriminator("submit_root"));
        data.extend_from_slice(&root_bytes);

        let accounts = vec![
            AccountMeta::new(coordinator_state, false),
            AccountMeta::new(root_record, false),
            AccountMeta::new(self.keypair.pubkey(), true),
            AccountMeta::new_readonly(solana_sdk::system_program::ID, false),
        ];

        self.send_instruction(self.coordinator_address, data, accounts)
            .await
    }

    async fn verify_membership(&self, _calldata: &[String]) -> Result<String, AspError> {
        Err(AspError::NotImplemented(
            "verify_membership: use direct wallet submission via prepared calldata".into(),
        ))
    }

    async fn shielded_swap(
        &self,
        _pool_key: &super::PoolKeyParams,
        _calldata: &[String],
        _sqrt_price_limit: &str,
    ) -> Result<String, AspError> {
        Err(AspError::NotImplemented(
            "shielded_swap: use direct wallet submission via prepared calldata".into(),
        ))
    }

    async fn shielded_mint(
        &self,
        _pool_key: &super::PoolKeyParams,
        _calldata: &[String],
        _liquidity: u128,
    ) -> Result<String, AspError> {
        Err(AspError::NotImplemented(
            "shielded_mint: use direct wallet submission via prepared calldata".into(),
        ))
    }

    async fn shielded_burn(
        &self,
        _pool_key: &super::PoolKeyParams,
        _calldata: &[String],
        _position_commitment: &str,
        _liquidity: u128,
    ) -> Result<String, AspError> {
        Err(AspError::NotImplemented(
            "shielded_burn: use direct wallet submission via prepared calldata".into(),
        ))
    }
}

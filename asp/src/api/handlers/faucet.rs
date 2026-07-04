use std::sync::Arc;
use std::str::FromStr;

use axum::extract::State;
use axum::Json;
use solana_client::rpc_client::RpcClient;
use solana_sdk::instruction::{AccountMeta, Instruction};
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::Keypair;
use solana_sdk::signer::Signer;
use solana_sdk::transaction::Transaction;

use crate::error::AspError;
use crate::AppState;

#[derive(serde::Deserialize)]
pub struct FaucetRequest {
    pub wallet: String,
}

#[derive(serde::Serialize)]
pub struct FaucetResponse {
    pub status: String,
    pub message: String,
}

fn create_associated_token_account(
    payer: &Pubkey,
    wallet: &Pubkey,
    mint: &Pubkey,
) -> (Pubkey, Instruction) {
    let token_program_id = Pubkey::from_str("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").unwrap();
    let associated_program_id = Pubkey::from_str("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL").unwrap();
    let system_program_id = Pubkey::from_str("11111111111111111111111111111111").unwrap();

    let (ata_pubkey, _) = Pubkey::find_program_address(
        &[wallet.as_ref(), token_program_id.as_ref(), mint.as_ref()],
        &associated_program_id,
    );

    let instruction = Instruction {
        program_id: associated_program_id,
        accounts: vec![
            AccountMeta::new(*payer, true),
            AccountMeta::new(ata_pubkey, false),
            AccountMeta::new_readonly(*wallet, false),
            AccountMeta::new_readonly(*mint, false),
            AccountMeta::new_readonly(system_program_id, false),
            AccountMeta::new_readonly(token_program_id, false),
        ],
        data: vec![],
    };

    (ata_pubkey, instruction)
}

fn mint_to(
    mint: &Pubkey,
    destination: &Pubkey,
    authority: &Pubkey,
    amount: u64,
) -> Instruction {
    let token_program_id = Pubkey::from_str("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").unwrap();
    
    let mut data = Vec::with_capacity(9);
    data.push(7); // MintTo instruction index
    data.extend_from_slice(&amount.to_le_bytes());

    Instruction {
        program_id: token_program_id,
        accounts: vec![
            AccountMeta::new(*mint, false),
            AccountMeta::new(*destination, false),
            AccountMeta::new_readonly(*authority, true),
        ],
        data,
    }
}

pub async fn request_tokens(
    State(state): State<Arc<AppState>>,
    Json(req): Json<FaucetRequest>,
) -> Result<Json<FaucetResponse>, AspError> {
    let wallet_pubkey = Pubkey::from_str(&req.wallet)
        .map_err(|e| AspError::InvalidInput(format!("Invalid wallet address: {e}")))?;

    let private_key = state.config.admin_private_key.as_deref().ok_or_else(|| {
        AspError::InvalidInput("ADMIN_PRIVATE_KEY is not configured on this ASP".into())
    })?;
    let keypair = Keypair::from_base58_string(private_key);
    let rpc_client = RpcClient::new(state.config.rpc_url.clone());

    let token0_str = std::env::var("VITE_TOKEN_0_ADDRESS")
        .unwrap_or_else(|_| "4AZXbzLhUUfQ8PCAdSTcPHuh86KJdBB5Z2YeGvZswhbz".to_string());
    let token1_str = std::env::var("VITE_TOKEN_1_ADDRESS")
        .unwrap_or_else(|_| "5jUt2tNKAC1vMhRUD36xYLEjWTmZgF1fs7bUGxUSBcVt".to_string());

    let token0 = Pubkey::from_str(&token0_str).unwrap();
    let token1 = Pubkey::from_str(&token1_str).unwrap();

    // 1. Airdrop devnet SOL if user has less than 0.05 SOL
    if let Ok(balance) = rpc_client.get_balance(&wallet_pubkey) {
        if balance < 50_000_000 {
            tracing::info!("Airdropping devnet SOL to {}", req.wallet);
            let _ = rpc_client.request_airdrop(&wallet_pubkey, 1_000_000_000);
        }
    }

    let mut instructions = Vec::new();

    // 2. Prepare mint instructions for both tokens
    // 1,000 tokens (Token0 USDC decimals = 6, Token1 SOL decimals = 9)
    let amount0 = 1_000 * 1_000_000;
    let amount1 = 1_000 * 1_000_000_000;

    for (token_mint, amount) in [(&token0, amount0), (&token1, amount1)] {
        let (ata, ata_ix) = create_associated_token_account(&keypair.pubkey(), &wallet_pubkey, token_mint);
        
        // If ATA doesn't exist, create it
        if rpc_client.get_account(&ata).is_err() {
            instructions.push(ata_ix);
        }

        instructions.push(mint_to(token_mint, &ata, &keypair.pubkey(), amount));
    }

    if !instructions.is_empty() {
        let recent_blockhash = rpc_client
            .get_latest_blockhash()
            .map_err(|e| AspError::RpcError(format!("Failed to get blockhash: {e}")))?;

        let tx = Transaction::new_signed_with_payer(
            &instructions,
            Some(&keypair.pubkey()),
            &[&keypair],
            recent_blockhash,
        );

        let signature = rpc_client
            .send_and_confirm_transaction(&tx)
            .map_err(|e| AspError::TransactionFailed(format!("Faucet transaction failed: {e}")))?;

        tracing::info!("Faucet mint signature: {}", signature);
    }

    Ok(Json(FaucetResponse {
        status: "ok".to_string(),
        message: "Devnet tokens claimed successfully!".to_string(),
    }))
}

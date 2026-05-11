use std::sync::Arc;
use std::time::Duration;
use std::str::FromStr;

use solana_client::rpc_client::RpcClient;
use solana_sdk::pubkey::Pubkey;
use solana_sdk::commitment_config::CommitmentConfig;
use solana_transaction_status::{UiMessage, UiInstruction};
use tokio::time::sleep;

use crate::error::AspError;
use crate::AppState;

pub const LAST_SYNCED_SIG_KEY: &str = "solana:last_synced_signature";

pub async fn start_event_sync(state: Arc<AppState>, poll_interval_secs: u64) {
    tracing::info!(
        interval_secs = poll_interval_secs,
        coordinator = %state.config.coordinator_address,
        "Starting Solana event sync"
    );

    let rpc_client = RpcClient::new(state.config.rpc_url.clone());

    loop {
        if let Err(err) = sync_once(&state, &rpc_client).await {
            tracing::error!("Solana event sync iteration failed: {err}");
        }

        sleep(Duration::from_secs(poll_interval_secs)).await;
    }
}

async fn sync_once(state: &Arc<AppState>, rpc_client: &RpcClient) -> Result<(), AspError> {
    let coordinator_pubkey = Pubkey::from_str(&state.config.coordinator_address)
        .map_err(|e| AspError::Config(format!("Invalid coordinator address: {e}")))?;

    let last_sig = state.db.get_sync_state(LAST_SYNCED_SIG_KEY)?;

    // 1. Get signatures for the coordinator program
    let signatures = rpc_client
        .get_signatures_for_address(&coordinator_pubkey)
        .map_err(|e| AspError::RpcError(format!("Failed to get signatures: {e}")))?;

    if signatures.is_empty() {
        return Ok(());
    }

    // Process only signatures newer than last_sig
    let mut signatures_to_process = Vec::new();
    if let Some(ref last) = last_sig {
        for sig_info in signatures {
            if sig_info.signature == *last {
                break;
            }
            signatures_to_process.push(sig_info);
        }
    } else {
        signatures_to_process = signatures;
    }

    if signatures_to_process.is_empty() {
        return Ok(());
    }

    // Process from oldest to newest
    for sig_info in signatures_to_process.into_iter().rev() {
        let sig = solana_sdk::signature::Signature::from_str(&sig_info.signature).unwrap();
        
        // 2. Get transaction details
        let tx = rpc_client.get_transaction(&sig, solana_transaction_status::UiTransactionEncoding::Json)
            .map_err(|e| AspError::RpcError(format!("Failed to get transaction {sig}: {e}")))?;

        if let Some(meta) = tx.transaction.meta {
            if meta.err.is_none() {
                // 3. Look for ShieldedDeposit instructions
                process_transaction(state, &sig_info.signature, tx.transaction.transaction)?;
            }
        }

        // 4. Update last synced signature
        state.db.set_sync_state(LAST_SYNCED_SIG_KEY, &sig_info.signature)?;
    }

    Ok(())
}

fn process_transaction(state: &Arc<AppState>, tx_hash: &str, tx_data: solana_transaction_status::EncodedTransaction) -> Result<(), AspError> {
    use solana_sdk::hash::hashv;

    // Anchor discriminator for shielded_deposit
    let preimage = b"global:shielded_deposit";
    let disc = hashv(&[preimage]).to_bytes()[..8].to_vec();

    // In a real implementation, we would decode the Base64 transaction and look for the instruction.
    // For this demonstration, we'll parse the message if available.
    if let solana_transaction_status::EncodedTransaction::Json(ui_tx) = tx_data {
        if let UiMessage::Raw(raw) = ui_tx.message {
            for ix in raw.instructions {
                let data = bs58::decode(&ix.data).into_vec().unwrap_or_default();

                if data.len() >= 48 && data[0..8] == disc {
                        // Extract commitment (offset 16: 8 discriminator + 8 amount)
                        let commitment_bytes = &data[16..48];
                        let commitment_hex = format!("0x{}", hex::encode(commitment_bytes));
                        
                        // Convert to decimal for the ASP internal storage
                        let commitment_dec = crate::api::handlers::deposit::hex_to_decimal(&commitment_hex)?;

                        // Infer leaf index from DB count (assuming sequential sync)
                        let leaf_index = state.db.get_leaf_count()?;
                        
                        tracing::info!(
                            leaf_index = leaf_index,
                            commitment = %commitment_hex,
                            "Found shielded_deposit event in transaction"
                        );

                        state.db.insert_commitment(leaf_index, &commitment_dec, Some(tx_hash))?;
                    }
                }
        }
    }

    Ok(())
}

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
        let config = solana_client::rpc_config::RpcTransactionConfig {
            encoding: Some(solana_transaction_status::UiTransactionEncoding::Json),
            commitment: Some(CommitmentConfig::confirmed()),
            max_supported_transaction_version: Some(0),
        };
        let tx = rpc_client.get_transaction_with_config(&sig, config)
            .map_err(|e| AspError::RpcError(format!("Failed to get transaction {sig}: {e}")))?;

        if let Some(meta) = tx.transaction.meta {
            if meta.err.is_none() {
                // 3. Look for ShieldedDeposit instructions
                process_transaction(state, &sig_info.signature, tx.transaction.transaction).await?;
            }
        }

        // 4. Update last synced signature
        state.db.set_sync_state(LAST_SYNCED_SIG_KEY, &sig_info.signature)?;
    }

    Ok(())
}

async fn process_transaction(state: &Arc<AppState>, tx_hash: &str, tx_data: solana_transaction_status::EncodedTransaction) -> Result<(), AspError> {
    use solana_sdk::hash::hashv;

    let disc_deposit = hashv(&[b"global:shielded_deposit"]).to_bytes()[..8].to_vec();
    let disc_swap = hashv(&[b"global:shielded_swap"]).to_bytes()[..8].to_vec();
    let disc_mint = hashv(&[b"global:shielded_mint"]).to_bytes()[..8].to_vec();
    let disc_burn = hashv(&[b"global:shielded_burn"]).to_bytes()[..8].to_vec();

    if let solana_transaction_status::EncodedTransaction::Json(ui_tx) = tx_data {
        if let UiMessage::Raw(raw) = ui_tx.message {
            for ix in raw.instructions {
                let data = bs58::decode(&ix.data).into_vec().unwrap_or_default();

                if data.len() >= 8 {
                    let disc = &data[0..8];
                    let mut commitments_to_insert = Vec::new();

                    if disc == disc_deposit.as_slice() && data.len() >= 48 {
                        commitments_to_insert.push(&data[16..48]);
                    } else if disc == disc_swap.as_slice() && data.len() >= 136 {
                        commitments_to_insert.push(&data[72..104]);
                        commitments_to_insert.push(&data[104..136]);
                    } else if disc == disc_mint.as_slice() && data.len() >= 208 {
                        commitments_to_insert.push(&data[104..136]);
                        commitments_to_insert.push(&data[144..176]);
                        commitments_to_insert.push(&data[176..208]);
                    } else if disc == disc_burn.as_slice() && data.len() >= 72 {
                        commitments_to_insert.push(&data[8..40]);
                        commitments_to_insert.push(&data[40..72]);
                    }

                    for commitment_bytes in commitments_to_insert {
                        let commitment_hex = format!("0x{}", hex::encode(commitment_bytes));
                        let commitment_dec = crate::api::handlers::deposit::hex_to_decimal(&commitment_hex)?;

                        let leaf_index = state.db.get_leaf_count()?;
                        
                        tracing::info!(
                            leaf_index = leaf_index,
                            commitment = %commitment_hex,
                            "Found shielded event in transaction"
                        );

                        state.db.insert_commitment(leaf_index, &commitment_dec, Some(tx_hash))?;
                        
                        // Update the worker's in-memory tree!
                        let mut worker = state.worker.lock().await;
                        match worker.insert_leaf(&commitment_dec).await {
                            Ok(new_root) => {
                                let new_root_hex = crate::api::handlers::deposit::decimal_to_hex(&new_root);
                                drop(worker); // drop lock before await
                                
                                // Now submit it on-chain!
                                if let Some(relayer_mutex) = &state.relayer {
                                    let relayer = relayer_mutex.lock().await;
                                    match relayer.submit_merkle_root(&new_root_hex).await {
                                        Ok(sig) => tracing::info!("Merkle root {} submitted on chain: {}", new_root_hex, sig),
                                        Err(e) => tracing::error!("Failed to submit Merkle root on chain: {}", e),
                                    }
                                }
                            }
                            Err(e) => tracing::error!("Failed to update worker Merkle tree: {}", e),
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

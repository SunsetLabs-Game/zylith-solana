use std::sync::Arc;

use axum::extract::{Path, State};
use axum::Json;

use crate::api::types::NullifierResponse;
use crate::error::AspError;
use crate::AppState;

#[utoipa::path(
    get,
    path = "/nullifier/{hash}",
    tag = "Nullifiers",
    params(
        ("hash" = String, Path, description = "Nullifier hash to query (decimal string)"),
    ),
    responses(
        (status = 200, description = "Nullifier status — `spent: false` if not found", body = NullifierResponse),
        (status = 500, description = "Internal error", body = crate::api::types::ErrorBody),
    )
)]
pub async fn get_nullifier(
    State(state): State<Arc<AppState>>,
    Path(hash): Path<String>,
) -> Result<Json<NullifierResponse>, AspError> {
    let nullifier = state.db.get_nullifier(&hash)?;

    match nullifier {
        Some(row) => Ok(Json(NullifierResponse {
            nullifier_hash: row.nullifier_hash,
            spent: true,
            circuit_type: Some(row.circuit_type),
            tx_hash: row.tx_hash,
        })),
        None => Ok(Json(NullifierResponse {
            nullifier_hash: hash,
            spent: false,
            circuit_type: None,
            tx_hash: None,
        })),
    }
}

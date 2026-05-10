use std::sync::Arc;

use axum::extract::State;
use axum::Json;

use crate::api::types::{CommitmentWithIndex, SyncCommitmentsRequest, SyncCommitmentsResponse};
use crate::error::AspError;
use crate::AppState;

/// Given a list of commitment hashes, return their leaf indexes if they exist in the tree.
#[utoipa::path(
    post,
    path = "/sync-commitments",
    tag = "Sync",
    request_body = SyncCommitmentsRequest,
    responses(
        (status = 200, description = "Resolved commitment indexes", body = SyncCommitmentsResponse),
        (status = 400, description = "Invalid input", body = crate::api::types::ErrorBody),
        (status = 500, description = "Internal error", body = crate::api::types::ErrorBody),
    )
)]
pub async fn sync_commitments(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SyncCommitmentsRequest>,
) -> Result<Json<SyncCommitmentsResponse>, AspError> {
    let mut results = Vec::new();

    for commitment in req.commitments {
        let leaf_index = state.db.find_commitment_leaf_index(&commitment)?;
        results.push(CommitmentWithIndex {
            commitment,
            leaf_index,
        });
    }

    Ok(Json(SyncCommitmentsResponse {
        commitments: results,
    }))
}

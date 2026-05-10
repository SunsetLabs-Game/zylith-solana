use axum::response::Html;
use utoipa::OpenApi;

use crate::relayer::PoolKeyParams;
use super::types::{
    BurnRequest, BurnResponse, CommitmentWithIndex, ContractAddresses, DepositRequest,
    DepositResponse, ErrorBody, MintAmounts, MintRequest, MintResponse, NoteInput, NoteSecrets,
    NullifierResponse, OutputNoteInput, PositionInput, PositionNoteInput, StatusResponse,
    SwapParams, SwapRequest, SwapResponse, SyncCommitmentsRequest, SyncCommitmentsResponse,
    SyncStatus, TreeProofResponse, TreeRootResponse, TreeStatus, WithdrawRequest, WithdrawResponse,
};

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::api::handlers::deposit::deposit,
        crate::api::handlers::withdraw::withdraw,
        crate::api::handlers::swap::shielded_swap,
        crate::api::handlers::mint::shielded_mint,
        crate::api::handlers::burn::shielded_burn,
        crate::api::handlers::tree::get_root,
        crate::api::handlers::tree::get_path,
        crate::api::handlers::nullifier::get_nullifier,
        crate::api::handlers::sync::sync_commitments,
        crate::api::handlers::status::get_status,
    ),
    components(schemas(
        DepositRequest,
        DepositResponse,
        WithdrawRequest,
        WithdrawResponse,
        SwapRequest,
        SwapParams,
        SwapResponse,
        MintRequest,
        PositionInput,
        MintAmounts,
        MintResponse,
        BurnRequest,
        PositionNoteInput,
        OutputNoteInput,
        BurnResponse,
        NoteInput,
        NoteSecrets,
        SyncCommitmentsRequest,
        CommitmentWithIndex,
        SyncCommitmentsResponse,
        TreeRootResponse,
        TreeProofResponse,
        NullifierResponse,
        StatusResponse,
        TreeStatus,
        SyncStatus,
        ContractAddresses,
        PoolKeyParams,
        ErrorBody,
    )),
    tags(
        (name = "Shielded Operations", description = "Generate Groth16 ZK proofs and prepare calldata for on-chain wallet submission. The ASP never holds user private keys or submits transactions."),
        (name = "Merkle Tree", description = "Query the commitment Merkle tree (root, membership proofs)."),
        (name = "Nullifiers", description = "Check whether a nullifier hash has been spent on-chain."),
        (name = "Sync", description = "Resolve commitment hashes to their leaf indexes after on-chain confirmation."),
        (name = "System", description = "ASP health, version, and contract addresses."),
    ),
    info(
        title = "Sunset ASP API",
        version = "0.1.0",
        description = "Anonymous Service Provider for the Sunset shielded CLMM protocol on Solana. All proof-generating endpoints return calldata for direct wallet submission — the ASP never holds user private keys.",
    ),
)]
pub struct ApiDoc;

/// GET /api-doc/openapi.json
pub async fn openapi_json() -> axum::Json<utoipa::openapi::OpenApi> {
    axum::Json(<ApiDoc as utoipa::OpenApi>::openapi())
}

// r##"..."## avoids raw-string termination on the "#swagger-ui" substring.
const SWAGGER_HTML: &str = r##"<!DOCTYPE html>
<html>
  <head>
    <title>Sunset ASP API</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
    <style>body { margin: 0; }</style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => SwaggerUIBundle({
        url: "/api-doc/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: "BaseLayout"
      });
    </script>
  </body>
</html>"##;

/// GET /docs — Swagger UI via unpkg CDN
pub async fn swagger_ui() -> Html<&'static str> {
    Html(SWAGGER_HTML)
}

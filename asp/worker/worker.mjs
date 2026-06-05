/**
 * Sunset ASP Worker
 *
 * Long-lived Bun process that communicates with the Rust ASP server via NDJSON
 * over stdin/stdout. Handles Merkle tree operations, commitment computation,
 * and Groth16 proof generation using the existing circuits pipeline.
 *
 * Spawned by Rust with: bun run worker/worker.mjs
 */
import { createInterface } from "readline";
import { MerkleTree } from "../../circuits/scripts/lib/merkle.mjs";
import {
  computeCommitment,
  computePositionCommitment,
  tokenToBigInt,
} from "../../circuits/scripts/lib/commitment.mjs";
import {
  generateProof,
  exportProofArtifacts,
} from "../../circuits/scripts/lib/prover.mjs";
import {
  generateCalldata,
  isGaragaAvailable,
} from "../../circuits/scripts/lib/garaga.mjs";
import { initPoseidon } from "../../circuits/scripts/lib/poseidon.mjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GARAGA_DIR = path.resolve(__dirname, "../../garaga_verifiers");
const BUILD_DIR = path.resolve(__dirname, "../../circuits/build");

// In-memory Merkle tree (rebuilt from leaves on build_tree command)
let tree = new MerkleTree();

// Send JSON response to Rust via stdout
function respond(data) {
  process.stdout.write(JSON.stringify(data) + "\n");
}

// Handle a single command from Rust
async function handleCommand(msg) {
  const { id, command, params } = msg;

  try {
    switch (command) {
      case "build_tree": {
        tree = new MerkleTree();
        for (const leaf of params.leaves) {
          tree.insert(String(leaf));
        }
        const root = tree.getRoot();
        respond({ id, ok: true, data: { root } });
        break;
      }

      case "insert_leaf": {
        tree.insert(String(params.leaf));
        const root = tree.getRoot();
        respond({ id, ok: true, data: { root } });
        break;
      }

      case "get_root": {
        const root = tree.getRoot();
        respond({ id, ok: true, data: { root } });
        break;
      }

      case "get_proof": {
        const proof = tree.getProof(params.leafIndex);
        respond({
          id,
          ok: true,
          data: {
            pathElements: proof.pathElements,
            pathIndices: proof.pathIndices,
            root: proof.root,
          },
        });
        break;
      }

      case "compute_commitment": {
        const result = computeCommitment(
          params.secret,
          params.nullifier,
          params.amount_low,
          params.amount_high,
          params.token,
        );
        respond({
          id,
          ok: true,
          data: {
            commitment: result.commitment,
            nullifierHash: result.nullifierHash,
          },
        });
        break;
      }

      case "compute_position_commitment": {
        console.error("[WORKER] Computing position commitment with:");
        console.error("secret:", params.secret);
        console.error("nullifier:", params.nullifier);
        console.error("tickLower:", params.tickLower, typeof params.tickLower);
        console.error("tickUpper:", params.tickUpper, typeof params.tickUpper);
        console.error("liquidity:", params.liquidity, typeof params.liquidity);
        
        const result = computePositionCommitment(
          params.secret,
          params.nullifier,
          params.tickLower,
          params.tickUpper,
          params.liquidity,
        );
        
        console.error("[WORKER] Resulting commitment:", result.commitment);
        
        respond({
          id,
          ok: true,
          data: {
            commitment: result.commitment,
            nullifierHash: result.nullifierHash,
          },
        });
        break;
      }

      case "generate_proof": {
        const { circuit, inputs } = params;

        // Pre-process inputs: convert any base58 token fields to BigInt strings
        // so snarkjs/F.e() can parse them (it only accepts numeric strings or BigInts)
        const TOKEN_FIELDS = ["token0", "token1", "tokenIn", "tokenOut", "token"];
        const processedInputs = { ...inputs };
        for (const field of TOKEN_FIELDS) {
          if (processedInputs[field] && typeof processedInputs[field] === "string" 
              && !/^\d+$/.test(processedInputs[field]) 
              && !processedInputs[field].startsWith("0x")) {
            processedInputs[field] = tokenToBigInt(processedInputs[field]).toString();
          }
        }
        
        if (circuit === "mint") {
          console.error("[WORKER] Generating mint proof with inputs:");
          console.error("positionSecret:", processedInputs.positionSecret);
          console.error("positionNullifier:", processedInputs.positionNullifier);
          console.error("tickLower:", processedInputs.tickLower);
          console.error("tickUpper:", processedInputs.tickUpper);
          console.error("liquidity:", processedInputs.liquidity);
          console.error("positionCommitment:", processedInputs.positionCommitment);
        }

        // 1. Generate Groth16 proof via snarkjs
        const { proof, publicSignals, verified } = await generateProof(
          circuit,
          processedInputs,
        );

        if (!verified) {
          respond({
            id,
            ok: false,
            error: `Local verification failed for ${circuit}`,
          });
          return;
        }

        // 2. Export proof artifacts (needed by garaga)
        // Flatten proof arrays for EVM
        const flatProof = [
          proof.pi_a[0], proof.pi_a[1],
          proof.pi_b[0][1], proof.pi_b[0][0],
          proof.pi_b[1][1], proof.pi_b[1][0],
          proof.pi_c[0], proof.pi_c[1],
        ];
        
        // Evm requires hex strings
        const toHex32 = (n) => {
          let h = BigInt(n).toString(16);
          return "0x" + h.padStart(64, "0");
        };

        const calldata = [...flatProof, ...publicSignals].map(toHex32);

        respond({
          id,
          ok: true,
          data: {
            calldata,
            publicSignals,
          },
        });
        break;
      }

      case "ping": {
        respond({ id, ok: true, data: { pong: true } });
        break;
      }

      default:
        respond({ id, ok: false, error: `Unknown command: ${command}` });
    }
  } catch (err) {
    respond({ id, ok: false, error: err.message || String(err) });
  }
}

// Main: initialize Poseidon, then start reading NDJSON from stdin
(async () => {
  await initPoseidon();

  const rl = createInterface({ input: process.stdin });

  // Send ready signal AFTER Poseidon is initialized
  respond({ ready: true });

  rl.on("line", async (line) => {
    try {
      const msg = JSON.parse(line);
      await handleCommand(msg);
    } catch (err) {
      respond({
        id: "unknown",
        ok: false,
        error: `Parse error: ${err.message}`,
      });
    }
  });

  rl.on("close", () => {
    process.exit(0);
  });
})();

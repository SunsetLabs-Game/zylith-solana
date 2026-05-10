import type { ProofResult } from "../prover/prover.js";

// BN254 prime modulus
const P = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;

function padBytesBE(hex: string): Buffer {
  let cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (cleanHex.length % 2 !== 0) cleanHex = "0" + cleanHex;
  const buf = Buffer.from(cleanHex, "hex");
  const padded = Buffer.alloc(32);
  buf.copy(padded, 32 - buf.length);
  return padded;
}

export function formatProofForSolana(proof: any): Buffer {
  // Extract and parse components
  const aX = BigInt(proof.pi_a[0]);
  const aY = BigInt(proof.pi_a[1]);

  // groth16-solana requires proof_a to be negated! 
  // Negating a G1 point (x, y) over the BN254 curve is just (x, P - y)
  const aYNeg = P - (aY % P);

  const proof_a = Buffer.concat([
    padBytesBE(aX.toString(16)),
    padBytesBE(aYNeg.toString(16))
  ]);

  const proof_b = Buffer.concat([
    // snarkjs returns B in [ [x_img, x_real], [y_img, y_real] ]
    // Solana alt_bn128 syscalls expect [ x_img, x_real, y_img, y_real ]
    padBytesBE(BigInt(proof.pi_b[0][1]).toString(16)),
    padBytesBE(BigInt(proof.pi_b[0][0]).toString(16)),
    padBytesBE(BigInt(proof.pi_b[1][1]).toString(16)),
    padBytesBE(BigInt(proof.pi_b[1][0]).toString(16)),
  ]);

  const proof_c = Buffer.concat([
    padBytesBE(BigInt(proof.pi_c[0]).toString(16)),
    padBytesBE(BigInt(proof.pi_c[1]).toString(16)),
  ]);

  return Buffer.concat([proof_a, proof_b, proof_c]);
}

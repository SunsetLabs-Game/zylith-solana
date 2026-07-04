import type { CircuitName } from "./artifacts.js";
export interface ProofResult {
    proof: any;
    publicSignals: string[];
}
export declare class ClientProver {
    /** Generate a Groth16 proof and verify it locally */
    generateProof(circuit: CircuitName, inputs: Record<string, unknown>): Promise<ProofResult>;
}
//# sourceMappingURL=prover.d.ts.map
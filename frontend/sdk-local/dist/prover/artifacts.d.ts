export type CircuitName = "membership" | "swap" | "mint" | "burn";
export interface CircuitArtifacts {
    wasmPath: string;
    zkeyPath: string;
    vkeyPath: string;
}
/** Get paths to circuit build artifacts (WASM, zkey, verification key) */
export declare function getCircuitArtifacts(circuit: CircuitName): CircuitArtifacts;
//# sourceMappingURL=artifacts.d.ts.map
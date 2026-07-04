/** Initialize the Poseidon hash function. Must be called before any hashing. */
export declare function initPoseidon(): Promise<void>;
/** Hash an array of inputs using Poseidon. Returns a decimal string. */
export declare function hash(inputs: (string | bigint | number)[]): string;
/** Check if Poseidon has been initialized */
export declare function isInitialized(): boolean;
//# sourceMappingURL=poseidon.d.ts.map
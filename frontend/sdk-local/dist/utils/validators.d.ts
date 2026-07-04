/** Validate a signed tick is within range */
export declare function validateTick(tick: number): void;
/** Validate a tick range (lower < upper, both valid) */
export declare function validateTickRange(tickLower: number, tickUpper: number): void;
/** Validate token ordering (token0 < token1 as bigints) */
export declare function validateTokenOrder(token0: string, token1: string): void;
/** Validate a value fits in the BN254 scalar field */
export declare function validateFieldElement(value: bigint): void;
/** Validate a positive amount that fits in u256 */
export declare function validateAmount(amount: bigint): void;
//# sourceMappingURL=validators.d.ts.map
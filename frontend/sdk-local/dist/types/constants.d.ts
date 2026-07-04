/** Merkle tree height (2^20 = 1,048,576 max leaves) */
export declare const TREE_HEIGHT = 20;
/** Maximum number of leaves in the Merkle tree */
export declare const MAX_LEAVES: number;
/**
 * Tick offset for converting signed ticks to unsigned in Circom circuits.
 * Circom circuits use unsigned ticks: offset_tick = signed_tick + TICK_OFFSET
 */
export declare const TICK_OFFSET = 887272;
/** Maximum valid unsigned tick after offset (2 * TICK_OFFSET) */
export declare const MAX_TICK_OFFSET = 1774544;
/** Minimum signed tick value */
export declare const MIN_TICK: number;
/** Maximum signed tick value */
export declare const MAX_TICK = 887272;
/** Number of public inputs for each circuit (from Garaga N_PUBLIC_INPUTS) */
export declare const PUBLIC_INPUT_COUNTS: {
    readonly membership: 2;
    readonly swap: 8;
    readonly mint: 8;
    readonly burn: 6;
};
/** Standard fee tiers in basis points */
export declare const FEE_TIERS: {
    /** 0.05% fee, tick spacing 10 */
    readonly LOW: {
        readonly fee: 500;
        readonly tickSpacing: 10;
    };
    /** 0.30% fee, tick spacing 60 */
    readonly MEDIUM: {
        readonly fee: 3001;
        readonly tickSpacing: 60;
    };
    /** 1.00% fee, tick spacing 200 */
    readonly HIGH: {
        readonly fee: 10000;
        readonly tickSpacing: 200;
    };
};
/**
 * Tick struct matching Circom's Tick { sign: bool, mag: u32 }.
 * Used for wallet-safe serialization of signed tick values.
 */
export interface Tick {
    sign: boolean;
    mag: number;
}
/** Convert a signed tick number to a Tick struct for contract calls */
export declare function toTick(value: number): Tick;
/** Convert a Tick struct from contract results to a signed number */
export declare function fromTick(tick: {
    sign: boolean;
    mag: number | bigint;
}): number;
/** BN254 scalar field modulus (for validation) */
export declare const BN254_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
/** Convert signed tick to unsigned offset tick (for circuit inputs) */
export declare function signedToOffsetTick(signedTick: number): number;
/** Convert unsigned offset tick from circuit to signed tick */
export declare function offsetToSignedTick(offsetTick: number): number;
//# sourceMappingURL=constants.d.ts.map
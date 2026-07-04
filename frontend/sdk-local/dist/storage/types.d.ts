/** Data structures for encrypted note storage */
/** A shielded note representing a token balance */
export interface Note {
    secret: string;
    nullifier: string;
    amount: string;
    token: string;
    leafIndex?: number;
    commitment: string;
    nullifierHash: string;
    spent: boolean;
    isYield?: boolean;
}
/** A shielded position note representing an LP position */
export interface PositionNote {
    secret: string;
    nullifier: string;
    tickLower: number;
    tickUpper: number;
    liquidity: string;
    leafIndex?: number;
    commitment: string;
    nullifierHash: string;
    spent: boolean;
    txHash?: string;
}
/** Encrypted note database schema */
export interface NoteDatabase {
    notes: Note[];
    positions: PositionNote[];
    version: number;
}
//# sourceMappingURL=types.d.ts.map
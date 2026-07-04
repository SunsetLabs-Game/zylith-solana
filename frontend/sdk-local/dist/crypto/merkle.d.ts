export interface MerkleProof {
    pathElements: string[];
    pathIndices: number[];
    root: string;
}
export interface MerkleTreeState {
    height: number;
    leaves: string[];
}
export declare class MerkleTree {
    private height;
    private leaves;
    constructor(height?: number);
    /** Insert a leaf (as decimal string or BigInt). */
    insert(leaf: string | bigint): void;
    /** Get the number of leaves in the tree */
    get leafCount(): number;
    /** Compute the root of the tree. Returns decimal string. */
    getRoot(): string;
    /** Get a Merkle proof for the leaf at the given index. */
    getProof(leafIndex: number): MerkleProof;
    /** Export tree state for persistence */
    exportState(): MerkleTreeState;
    /** Import tree state from persistence */
    static fromState(state: MerkleTreeState): MerkleTree;
    private computeNode;
}
/**
 * Get a proof for a single leaf at index 0 in an otherwise empty tree.
 * All siblings are 0, root = leaf (LeanIMT behavior).
 */
export declare function getSingleLeafProof(leafValue: string | bigint): MerkleProof;
//# sourceMappingURL=merkle.d.ts.map
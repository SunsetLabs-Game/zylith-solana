/**
 * LeanIMT Merkle tree matching circuits/common/merkle.circom.
 *
 * Key LeanIMT behavior:
 * - If sibling == 0 (field zero), node propagates unchanged (no hash)
 * - If sibling != 0, hash(left, right) based on pathIndex
 *
 * This means:
 * - Single leaf at index 0: all siblings = 0, root = leaf itself
 * - Two leaves: root = Poseidon(leaf0, leaf1)
 *
 * All values stored and returned as decimal strings.
 */
import { hash } from "./poseidon.js";
import { TREE_HEIGHT } from "../types/constants.js";
const ZERO = "0";
export class MerkleTree {
    height;
    leaves;
    constructor(height = TREE_HEIGHT) {
        this.height = height;
        this.leaves = [];
    }
    /** Insert a leaf (as decimal string or BigInt). */
    insert(leaf) {
        if (this.leaves.length >= 2 ** this.height) {
            throw new Error("Tree is full");
        }
        this.leaves.push(String(leaf));
    }
    /** Get the number of leaves in the tree */
    get leafCount() {
        return this.leaves.length;
    }
    /** Compute the root of the tree. Returns decimal string. */
    getRoot() {
        if (this.leaves.length === 0)
            return ZERO;
        return this.computeNode(0, this.height);
    }
    /** Get a Merkle proof for the leaf at the given index. */
    getProof(leafIndex) {
        if (leafIndex < 0 || leafIndex >= this.leaves.length) {
            throw new Error(`Leaf index ${leafIndex} out of range`);
        }
        const pathElements = [];
        const pathIndices = [];
        for (let level = 0; level < this.height; level++) {
            const isRight = (leafIndex >> level) & 1;
            pathIndices.push(isRight);
            const siblingNodeIndex = (leafIndex >> level) ^ 1;
            const sibling = this.computeNode(siblingNodeIndex, level);
            pathElements.push(sibling);
        }
        return {
            pathElements,
            pathIndices,
            root: this.getRoot(),
        };
    }
    /** Export tree state for persistence */
    exportState() {
        return {
            height: this.height,
            leaves: [...this.leaves],
        };
    }
    /** Import tree state from persistence */
    static fromState(state) {
        const tree = new MerkleTree(state.height);
        tree.leaves = [...state.leaves];
        return tree;
    }
    computeNode(nodeIndex, level) {
        if (level === 0) {
            return nodeIndex < this.leaves.length ? this.leaves[nodeIndex] : ZERO;
        }
        const leftChild = this.computeNode(nodeIndex * 2, level - 1);
        const rightChild = this.computeNode(nodeIndex * 2 + 1, level - 1);
        // LeanIMT: if right child is 0, propagate left unchanged
        if (rightChild === ZERO)
            return leftChild;
        if (leftChild === ZERO)
            return rightChild;
        return hash([leftChild, rightChild]);
    }
}
/**
 * Get a proof for a single leaf at index 0 in an otherwise empty tree.
 * All siblings are 0, root = leaf (LeanIMT behavior).
 */
export function getSingleLeafProof(leafValue) {
    return {
        pathElements: Array(TREE_HEIGHT).fill("0"),
        pathIndices: Array(TREE_HEIGHT).fill(0),
        root: String(leafValue),
    };
}
//# sourceMappingURL=merkle.js.map
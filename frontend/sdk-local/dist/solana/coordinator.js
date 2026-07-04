// Note: In Solana, we usually fetch and parse account data.
// This is a placeholder for the actual data parsing logic which depends on the Anchor IDL.
export class CoordinatorReader {
    rpc;
    coordinatorProgramId;
    constructor(rpc, coordinatorProgramId) {
        this.rpc = rpc;
        this.coordinatorProgramId = coordinatorProgramId;
    }
    async isNullifierSpent(_nullifierHash) {
        // Placeholder: Check nullifier account or PDA
        return false;
    }
    async isKnownRoot(_root) {
        // Placeholder: Check root history account
        return true;
    }
    async getMerkleRoot() {
        // Placeholder: Fetch current root from coordinator state account
        return 0n;
    }
    async getNextLeafIndex() {
        // Placeholder: Fetch next leaf index from coordinator state account
        return 0;
    }
    async isPaused() {
        // Placeholder: Fetch pause state from coordinator state account
        return false;
    }
}
//# sourceMappingURL=coordinator.js.map
export class AspClient {
    baseUrl;
    timeout;
    constructor(baseUrl, timeout = 60000) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.timeout = timeout;
    }
    // ========================================================================
    // Deposit & Withdrawal
    // ========================================================================
    async deposit(req) {
        return this.post("/deposit", req);
    }
    async withdraw(req) {
        return this.post("/withdraw", req);
    }
    // ========================================================================
    // Shielded Operations
    // ========================================================================
    async swap(req) {
        return this.post("/swap", req);
    }
    async mint(req) {
        return this.post("/mint", req);
    }
    async burn(req) {
        return this.post("/burn", req);
    }
    // ========================================================================
    // Tree Queries
    // ========================================================================
    async getTreeRoot() {
        return this.get("/tree/root");
    }
    async getTreePath(leafIndex) {
        return this.get(`/tree/path/${leafIndex}`);
    }
    // ========================================================================
    // Nullifier Queries
    // ========================================================================
    async getNullifier(hash) {
        return this.get(`/nullifier/${hash}`);
    }
    // ========================================================================
    // Status
    // ========================================================================
    async getStatus() {
        return this.get("/status");
    }
    // ========================================================================
    // Sync
    // ========================================================================
    async syncCommitments(commitments) {
        const response = await this.post("/sync-commitments", { commitments });
        return response.commitments;
    }
    // ========================================================================
    // Internal
    // ========================================================================
    async get(path) {
        return this.request("GET", path);
    }
    async post(path, body) {
        return this.request("POST", path, body);
    }
    async request(method, path, body) {
        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const response = await fetch(url, {
                method,
                headers: body ? { "Content-Type": "application/json" } : undefined,
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });
            if (!response.ok) {
                const errorText = await response.text().catch(() => "Unknown error");
                throw new Error(`ASP ${method} ${path} failed (${response.status}): ${errorText}`);
            }
            return (await response.json());
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
}
//# sourceMappingURL=client.js.map
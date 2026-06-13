import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { initPoseidon } from "../../src/crypto/poseidon.js";
import { NoteManager } from "../../src/storage/note-manager.js";

describe("NoteManager", () => {
  beforeAll(async () => {
    await initPoseidon();
  });

  let manager: NoteManager;

  beforeEach(() => {
    manager = new NoteManager("test-password");
  });

  describe("addNote", () => {
    it("creates a note with commitment and nullifierHash", () => {
      const note = manager.addNote({
        secret: "111",
        nullifier: "222",
        amount: 1000n,
        token: "0x999",
      });

      expect(note.secret).toBe("111");
      expect(note.nullifier).toBe("222");
      expect(note.amount).toBe("1000");
      expect(note.token).toBe("0x999");
      expect(note.spent).toBe(false);
      expect(note.commitment).toBeTruthy();
      expect(note.nullifierHash).toBeTruthy();
    });

    it("stores with leafIndex when provided", () => {
      const note = manager.addNote({
        secret: "111",
        nullifier: "222",
        amount: 1000n,
        token: "0x999",
        leafIndex: 5,
      });
      expect(note.leafIndex).toBe(5);
    });

    it("multiple notes accumulate", () => {
      manager.addNote({ secret: "1", nullifier: "2", amount: 100n, token: "0xa" });
      manager.addNote({ secret: "3", nullifier: "4", amount: 200n, token: "0xa" });
      expect(manager.getAllNotes()).toHaveLength(2);
    });
  });

  describe("addPositionNote", () => {
    it("creates a position note with commitment", () => {
      const pos = manager.addPositionNote({
        secret: "111",
        nullifier: "222",
        tickLower: -100,
        tickUpper: 100,
        liquidity: 5000n,
      });

      expect(pos.tickLower).toBe(-100);
      expect(pos.tickUpper).toBe(100);
      expect(pos.liquidity).toBe("5000");
      expect(pos.spent).toBe(false);
      expect(pos.commitment).toBeTruthy();
      expect(pos.nullifierHash).toBeTruthy();
    });
  });

  describe("markSpent", () => {
    it("marks a note as spent by nullifierHash", () => {
      const note = manager.addNote({
        secret: "1",
        nullifier: "2",
        amount: 100n,
        token: "0xa",
      });
      expect(note.spent).toBe(false);

      manager.markSpent(note.nullifierHash);

      const all = manager.getAllNotes();
      expect(all[0].spent).toBe(true);
    });

    it("marks a position as spent", () => {
      const pos = manager.addPositionNote({
        secret: "1",
        nullifier: "2",
        tickLower: -60,
        tickUpper: 60,
        liquidity: 1000n,
      });

      manager.markSpent(pos.nullifierHash);
      expect(manager.getAllPositions()[0].spent).toBe(true);
    });
  });

  describe("setLeafIndex", () => {
    it("updates leaf index for a note", () => {
      const note = manager.addNote({
        secret: "1",
        nullifier: "2",
        amount: 100n,
        token: "0xa",
      });

      manager.setLeafIndex(note.commitment, 42);
      expect(manager.getAllNotes()[0].leafIndex).toBe(42);
    });

    it("updates leaf index for a position", () => {
      const pos = manager.addPositionNote({
        secret: "1",
        nullifier: "2",
        tickLower: -60,
        tickUpper: 60,
        liquidity: 1000n,
      });

      manager.setLeafIndex(pos.commitment, 7);
      expect(manager.getAllPositions()[0].leafIndex).toBe(7);
    });
  });

  describe("getUnspentNotes", () => {
    it("returns only unspent notes", () => {
      const n1 = manager.addNote({ secret: "1", nullifier: "2", amount: 100n, token: "0xa" });
      manager.addNote({ secret: "3", nullifier: "4", amount: 200n, token: "0xa" });
      manager.markSpent(n1.nullifierHash);

      const unspent = manager.getUnspentNotes();
      expect(unspent).toHaveLength(1);
      expect(unspent[0].amount).toBe("200");
    });

    it("filters by token", () => {
      manager.addNote({ secret: "1", nullifier: "2", amount: 100n, token: "0xa" });
      manager.addNote({ secret: "3", nullifier: "4", amount: 200n, token: "0xb" });

      expect(manager.getUnspentNotes("0xa")).toHaveLength(1);
      expect(manager.getUnspentNotes("0xb")).toHaveLength(1);
      expect(manager.getUnspentNotes("0xc")).toHaveLength(0);
    });
  });

  describe("getBalance", () => {
    it("sums unspent notes for a token", () => {
      manager.addNote({ secret: "1", nullifier: "2", amount: 100n, token: "0xa" });
      manager.addNote({ secret: "3", nullifier: "4", amount: 250n, token: "0xa" });
      manager.addNote({ secret: "5", nullifier: "6", amount: 500n, token: "0xb" });

      expect(manager.getBalance("0xa")).toBe(350n);
      expect(manager.getBalance("0xb")).toBe(500n);
    });

    it("excludes spent notes", () => {
      const n1 = manager.addNote({ secret: "1", nullifier: "2", amount: 100n, token: "0xa" });
      manager.addNote({ secret: "3", nullifier: "4", amount: 250n, token: "0xa" });
      manager.markSpent(n1.nullifierHash);

      expect(manager.getBalance("0xa")).toBe(250n);
    });

    it("returns 0 for unknown token", () => {
      expect(manager.getBalance("0xunknown")).toBe(0n);
    });
  });

  describe("getUnspentPositions", () => {
    it("returns only unspent positions", () => {
      const p1 = manager.addPositionNote({
        secret: "1", nullifier: "2", tickLower: -60, tickUpper: 60, liquidity: 1000n,
      });
      manager.addPositionNote({
        secret: "3", nullifier: "4", tickLower: -120, tickUpper: 120, liquidity: 2000n,
      });
      manager.markSpent(p1.nullifierHash);

      const unspent = manager.getUnspentPositions();
      expect(unspent).toHaveLength(1);
      expect(unspent[0].liquidity).toBe("2000");
    });
  });

  describe("exportEncrypted / importEncrypted", () => {
    it("round-trips notes through encryption", async () => {
      manager.addNote({ secret: "1", nullifier: "2", amount: 100n, token: "0xa" });
      manager.addNote({ secret: "3", nullifier: "4", amount: 200n, token: "0xb" });
      manager.addPositionNote({
        secret: "5", nullifier: "6", tickLower: -60, tickUpper: 60, liquidity: 500n,
      });

      const encrypted = await manager.exportEncrypted();
      const restored = await NoteManager.importEncrypted(encrypted, "test-password");

      expect(restored.getAllNotes()).toHaveLength(2);
      expect(restored.getAllPositions()).toHaveLength(1);
      expect(restored.getBalance("0xa")).toBe(100n);
      expect(restored.getBalance("0xb")).toBe(200n);
    });

    it("wrong password fails import", async () => {
      manager.addNote({ secret: "1", nullifier: "2", amount: 100n, token: "0xa" });
      const encrypted = await manager.exportEncrypted();
      await expect(
        NoteManager.importEncrypted(encrypted, "wrong-password"),
      ).rejects.toThrow();
    });
  });

  describe("retroactive yield migration", () => {
    it("retroactively marks fractional notes as isYield when there are spent positions", async () => {
      const mockStorage: Record<string, string> = {};
      const originalLocalStorage = globalThis.localStorage;
      globalThis.localStorage = {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, value: string) => { mockStorage[key] = value; },
        removeItem: (key: string) => { delete mockStorage[key]; },
        clear: () => {},
        length: 0,
        key: () => null,
      } as unknown as Storage;

      try {
        const mgr = new NoteManager("test-password");
        // Add a spent position note
        const pos = mgr.addPositionNote({
          secret: "111",
          nullifier: "222",
          tickLower: -100,
          tickUpper: 100,
          liquidity: 1000n,
        });
        mgr.markSpent(pos.nullifierHash);

        // Add a whole amount USDC note (150.000000 USDC)
        mgr.addNote({
          secret: "333",
          nullifier: "444",
          amount: 150_000_000n,
          token: "4AZXbzLhUUfQ8PCAdSTcPHuh86KJdBB5Z2YeGvZswhbz",
        });

        // Add a fractional USDC note (3.570203 USDC) - this represents yield!
        mgr.addNote({
          secret: "555",
          nullifier: "666",
          amount: 3_570_203n,
          token: "4AZXbzLhUUfQ8PCAdSTcPHuh86KJdBB5Z2YeGvZswhbz",
        });

        // Save notes to our mock localStorage
        await mgr.save();

        // Load the notes manager back
        const loadedMgr = await NoteManager.load("test-password");

        // Verify the unspent notes
        const unspent = loadedMgr.getUnspentNotes();
        expect(unspent).toHaveLength(2);

        const depNoteLoaded = unspent.find((n) => n.secret === "333")!;
        const yieldNoteLoaded = unspent.find((n) => n.secret === "555")!;

        // The whole amount note should NOT be marked as isYield
        expect(depNoteLoaded.isYield).toBeFalsy();

        // The fractional amount note should be retroactively marked as isYield
        expect(yieldNoteLoaded.isYield).toBe(true);
      } finally {
        globalThis.localStorage = originalLocalStorage;
      }
    });
  });
});

import { describe, it, expect, beforeAll, vi } from "vitest";
import { initPoseidon } from "../../src/crypto/poseidon.js";
import { NoteManager } from "../../src/storage/note-manager.js";
import { mint } from "../../src/operations/mint.js";
import type { AspClient } from "../../src/asp/client.js";

describe("mint operation", () => {
  beforeAll(async () => {
    await initPoseidon();
  });

  it("calls asp.mint, marks inputs spent, adds position note", async () => {
    const noteManager = new NoteManager("test");
    const input0 = noteManager.addNote({
      secret: "123",
      nullifier: "456",
      amount: 1000n,
      token: "1",
      leafIndex: 0,
    });
    const input1 = noteManager.addNote({
      secret: "789",
      nullifier: "012",
      amount: 1000n,
      token: "2",
      leafIndex: 1,
    });

    const mockAsp = {
      mint: vi.fn().mockResolvedValue({
        status: "ok",
        position_commitment: "0xpos",
        change_commitment_0: "0xch0",
        change_commitment_1: "0xch1",
        calldata: ["1", "2"],
        final_root: "0xroot",
      }),
      getTreePath: vi.fn().mockResolvedValue({
        root: "0xroot",
        path: Array(32).fill("0"),
        index: 0,
      }),
      syncCommitments: vi.fn().mockResolvedValue([]),
    } as unknown as AspClient;

    const result = await mint(
      {
        poolKey: { token0: "t0", token1: "t1", fee: 3000, tickSpacing: 60 },
        inputNote0Commitment: input0.commitment,
        inputNote1Commitment: input1.commitment,
        tickLower: -120,
        tickUpper: 120,
        liquidity: 500n,
        amount0: 400n,
        amount1: 400n,
        useAspProver: true,
      },
      mockAsp,
      noteManager,
    );

    expect(result.positionCommitment).toBe("0xpos");
    expect(noteManager.getAllPositions()).toHaveLength(1);
    expect(noteManager.getUnspentNotes()).toHaveLength(2); // The two change notes
  });
});

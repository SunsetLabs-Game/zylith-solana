import { describe, it, expect, beforeAll, vi } from "vitest";
import { initPoseidon } from "../../src/crypto/poseidon.js";
import { NoteManager } from "../../src/storage/note-manager.js";
import { burn } from "../../src/operations/burn.js";
import type { AspClient } from "../../src/asp/client.js";

describe("burn operation", () => {
  beforeAll(async () => {
    await initPoseidon();
  });

  it("calls asp.burn, marks position spent, adds output notes", async () => {
    const noteManager = new NoteManager("test");
    const pos = noteManager.addPositionNote({
      secret: "321",
      nullifier: "654",
      tickLower: -120,
      tickUpper: 120,
      liquidity: 1000n,
      commitment: "0xpos",
      leafIndex: 10,
    });

    const mockAsp = {
      burn: vi.fn().mockResolvedValue({
        status: "ok",
        new_commitment_0: "0xout0",
        new_commitment_1: "0xout1",
        amount_0: "450",
        amount_1: "450",
        calldata: ["3", "4"],
        final_root: "0xroot",
      }),
      getTreePath: vi.fn().mockResolvedValue({
        root: "0xroot",
        path: Array(32).fill("0"),
        index: 10,
      }),
      syncCommitments: vi.fn().mockResolvedValue([]),
    } as unknown as AspClient;

    const result = await burn(
      {
        poolKey: { token0: "1", token1: "2", fee: 3000, tickSpacing: 60 },
        positionCommitment: pos.commitment,
        token0: "1",
        token1: "2",
        amount0Out: 450n,
        amount1Out: 450n,
        liquidity: 1000n,
        useAspProver: true,
      },
      mockAsp,
      noteManager,
    );

    expect(result.amount0).toBe(450n);
    expect(noteManager.getAllPositions()[0].spent).toBe(true);
    expect(noteManager.getUnspentNotes()).toHaveLength(2); // Two output notes from burn
  });
});

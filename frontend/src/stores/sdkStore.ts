import { create } from "zustand";
import type { ZylithClient, Note, PositionNote } from "@zylith/sdk";
import { env } from "@/config/env";

const NOTES_STORAGE_KEY = "zylith_notes";

interface SdkState {
  client: ZylithClient | null;
  isInitialized: boolean;
  isInitializing: boolean;
  initError: string | null;
  hasExistingNotes: boolean;
  password: string | null;

  // Derived from NoteManager
  balances: Record<string, bigint>;
  unspentNotes: Note[];
  unspentPositions: PositionNote[];

  // Actions
  checkExistingNotes: () => void;
  autoInitialize: () => Promise<boolean>;
  initialize: (password: string) => Promise<void>;
  refreshBalances: () => void;
  syncNotes: () => Promise<void>;
  lock: () => void;
  resetVault: () => void;
}

export const useSdkStore = create<SdkState>((set, get) => ({
  client: null,
  isInitialized: false,
  isInitializing: false,
  initError: null,
  hasExistingNotes: false,
  password: null,
  balances: {},
  unspentNotes: [],
  unspentPositions: [],

  checkExistingNotes: () => {
    const exists = localStorage.getItem(NOTES_STORAGE_KEY) !== null;
    set({ hasExistingNotes: exists });
  },

  autoInitialize: async () => {
    const { password } = get();
    if (!password) return false;

    try {
      await get().initialize(password);
      return true;
    } catch {
      set({ password: null });
      return false;
    }
  },

  initialize: async (password: string) => {
    if (get().isInitializing) return;
    set({ isInitializing: true, initError: null });
    console.log("[SDK Store] Starting initialization...");
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("SDK Initialization timed out after 15 seconds")), 15000)
      );

      const initPromise = async () => {
        console.log("[SDK Store] Creating ZylithClient...");
        const { ZylithClient } = await import("@zylith/sdk");
        const client = new ZylithClient({
          rpcUrl: env.rpcUrl,
          programs: env.programs,
          mode: env.aspEnabled ? "asp" : "client-side",
          ...(env.aspEnabled ? { aspUrl: env.aspUrl } : {}),
          password,
        });

        console.log("[SDK Store] Calling client.init()...");
        await client.init();

        console.log("[SDK Store] Updating state...");
        return client;
      };

      const client = await Promise.race([initPromise(), timeoutPromise]);

      set({
        client,
        isInitialized: true,
        isInitializing: false,
        hasExistingNotes: true,
        password,
      });
      console.log("[SDK Store] Refreshing balances...");
      get().refreshBalances();
      console.log("[SDK Store] Initialization complete!");
    } catch (err) {
      console.error("[SDK Store] Initialization failed:", err);
      
      let message = "Initialization failed";
      if (err instanceof Error) {
        if (err.name === "OperationError") {
          message = "Incorrect password. Please try again.";
        } else {
          message = err.message;
        }
      }

      set({
        isInitializing: false,
        initError: message,
      });
    }
  },

  syncNotes: async () => {
    const { client } = get();
    if (!client) return;
    const aspClient = client.getAspClient();
    if (!aspClient) return;
    const noteManager = client.getNoteManager();

    try {
      // 1. Sync leaf indexes for notes missing them.
      // Skip "pending_" placeholder notes — they don't exist on-chain yet and
      // will be updated by swap.ts once the ASP responds.
      const isPending = (commitment: string) => commitment.startsWith("pending_");
      const missing = [
        ...noteManager.getAllNotes().filter((n: Note) => !n.spent && n.leafIndex === undefined && !isPending(n.commitment)),
        ...noteManager.getAllPositions().filter((p: PositionNote) => !p.spent && p.leafIndex === undefined && !isPending(p.commitment)),
      ];
      if (missing.length > 0) {
        const syncData = await aspClient.syncCommitments(missing.map((n) => n.commitment));
        noteManager.updateLeafIndexes(syncData);
      }

      // 1b. Clean up stale placeholder notes: if their nullifier hash appears spent
      // on-chain, it means the swap executed but the SDK crashed before updating
      // the commitment. Mark them spent so they don't block the UI.
      const pendingNotes = noteManager.getAllNotes().filter((n: Note) => !n.spent && isPending(n.commitment));
      for (const note of pendingNotes) {
        try {
          const result = await aspClient.getNullifier(note.nullifierHash);
          if (result.spent) {
            noteManager.markSpent(note.nullifierHash);
          }
        } catch {
          // Non-fatal
        }
      }

      // 2. Check if any unspent notes have nullifiers already spent on-chain.
      // Skip pending placeholder notes — they have no real nullifierHash yet.
      const unspentNotes = noteManager.getAllNotes().filter((n: Note) => !n.spent && !isPending(n.commitment));
      for (const note of unspentNotes) {
        try {
          const result = await aspClient.getNullifier(note.nullifierHash);
          if (result.spent) {
            noteManager.markSpent(note.nullifierHash);
          }
        } catch {
          // Non-fatal per note
        }
      }

      await client.saveNotes();
      get().refreshBalances();
    } catch {
      // Non-fatal
    }
  },

  refreshBalances: () => {
    const { client } = get();
    if (!client) return;

    const noteManager = client.getNoteManager();
    // Exclude placeholder notes from balance display — they are saved pre-swap
    // and will be updated with real amounts once the ASP responds.
    const notes = noteManager.getUnspentNotes().filter((n: Note) => {
      try {
        BigInt(n.amount);
        return !n.commitment.startsWith("pending_");
      } catch {
        return false;
      }
    });
    const positions = noteManager.getUnspentPositions();

    // Compute balances per token
    const balances: Record<string, bigint> = {};
    for (const note of notes) {
      const token = note.token;
      const amount = BigInt(note.amount);
      balances[token] = (balances[token] ?? 0n) + amount;
    }

    set({ balances, unspentNotes: notes, unspentPositions: positions });
  },

  lock: () => {
    set({
      client: null,
      isInitialized: false,
      isInitializing: false,
      initError: null,
      password: null,
      balances: {},
      unspentNotes: [],
      unspentPositions: [],
    });
  },

  resetVault: () => {
    localStorage.removeItem(NOTES_STORAGE_KEY);
    set({
      client: null,
      isInitialized: false,
      isInitializing: false,
      initError: null,
      hasExistingNotes: false,
      password: null,
      balances: {},
      unspentNotes: [],
      unspentPositions: [],
    });
    window.location.reload();
  },
}));

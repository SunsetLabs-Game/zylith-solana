// Node.js polyfills required by SDK dependencies (circomlibjs and snarkjs)
import { Buffer } from "buffer";
import process from "process";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Buffer = Buffer;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).process = process;
(process as any).browser = true;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).global = globalThis;

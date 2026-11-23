import type { Accumulation } from "./cpu.js";
import { type WasmSource } from "./load.js";
import type { NetManifest } from "./manifest.js";
export type Backend = "webgpu" | "wasm-simd";
export type Where = "gpu" | "worker" | "page";
export interface SessionOptions {
    /** Paths to try in order. Default: webgpu, then wasm-simd. */
    prefer?: Backend[];
    /** Run the CPU path in a worker. Default true; false runs it in the page. */
    worker?: boolean;
    /** CPU accumulation; f64 by default. */
    accum?: Accumulation;
    /** Wasm for the in page path; the inlined copy by default. */
    wasm?: WasmSource;
    /** Where licence and fallback lines go; console.info by default. */
    onNotice?: (line: string) => void;
}
export interface NetSession {
    readonly backend: Backend;
    readonly where: Where;
    /** Milliseconds of the last run, measured where it ran. */
    readonly lastMs: number;
    /** Runs one input. Codebook models return `frames` frames (all by default). */
    run(input: Float32Array, frames?: number): Promise<Float32Array>;
    dispose(): void;
}
/**
 * Creates a session. The weight buffer is copied once into the worker, so
 * the caller keeps its own. States the weight licence through `onNotice`.
 */
export declare function createSession(manifest: NetManifest, weights: ArrayBuffer, opts?: SessionOptions): Promise<NetSession>;

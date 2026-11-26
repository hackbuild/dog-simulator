import { type WasmSource } from "./load.js";
export type { WasmSource } from "./load.js";
export * from "./layout.js";
export * from "./weights.js";
export * from "./engine.js";
/** Loads the wasm for the page side helpers (golden trace). The predictor loads its own copy. */
export declare function load(source?: WasmSource): Promise<void>;
/** Loads the page side wasm synchronously from bytes or a compiled module. */
export declare function loadSync(source: ArrayBuffer | ArrayBufferView | WebAssembly.Module): void;
/** The seeded random network trace that the native and wasm builds must agree on. */
export declare function goldenTrace(seed: number): Float64Array;
/** Uniform numbers in [0, 1); the family contract. */
export type Rng = () => number;
/** The linear congruential generator of the specification's test vectors. */
export declare function lcg(seed: number): Rng;
export * from "./host.js";

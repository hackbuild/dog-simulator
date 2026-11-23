/* tslint:disable */
/* eslint-disable */

export class CodebookNet {
    free(): void;
    [Symbol.dispose](): void;
    macs(frames: number): number;
    /**
     * `dims`: input, latent, group, iterations, frames, output. Takes the
     * tensors it needs out of the store.
     */
    constructor(store: TensorStore, dims: Uint32Array, f64_sums: boolean);
    run(input: Float32Array, frames: number): Float32Array;
}

export class MlpNet {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * `acts` per layer: 0 none, 1 elu, 2 relu, 3 tanh.
     */
    constructor(store: TensorStore, prefix: string, dims: Uint32Array, acts: Uint8Array, stats: boolean, f64_sums: boolean);
    run(input: Float32Array): Float32Array;
}

export class TensorStore {
    free(): void;
    [Symbol.dispose](): void;
    addF16(name: string, halves: Uint16Array, shape: Uint32Array): void;
    addF32(name: string, data: Float32Array, shape: Uint32Array): void;
    bytes(): number;
    constructor();
}

export function f16ToF32(h: Uint16Array): Float32Array;

export function goldenTrace(seed: number): Float64Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_codebooknet_free: (a: number, b: number) => void;
    readonly __wbg_mlpnet_free: (a: number, b: number) => void;
    readonly __wbg_tensorstore_free: (a: number, b: number) => void;
    readonly codebooknet_macs: (a: number, b: number) => number;
    readonly codebooknet_new: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly codebooknet_run: (a: number, b: number, c: number, d: number) => [number, number];
    readonly f16ToF32: (a: number, b: number) => [number, number];
    readonly goldenTrace: (a: number) => [number, number];
    readonly mlpnet_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number, number];
    readonly mlpnet_run: (a: number, b: number, c: number) => [number, number];
    readonly tensorstore_addF16: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly tensorstore_addF32: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly tensorstore_bytes: (a: number) => number;
    readonly tensorstore_new: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;

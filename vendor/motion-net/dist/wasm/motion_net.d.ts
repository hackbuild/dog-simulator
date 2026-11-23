/* tslint:disable */
/* eslint-disable */

export function goldenTrace(seed: number): Float64Array;

export function weightLicence(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly goldenTrace: (a: number) => [number, number];
    readonly mn_alloc: (a: number) => number;
    readonly mn_create: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly mn_destroy: (a: number) => void;
    readonly mn_forward: (a: number) => number;
    readonly mn_free: (a: number, b: number) => void;
    readonly mn_input: (a: number) => number;
    readonly mn_missing: (a: number) => number;
    readonly mn_output: (a: number, b: number) => number;
    readonly mn_set: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly weightLicence: () => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
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

import { type WasmSource } from "./load.js";
import { type FetchOptions, type WeightSource } from "./fetch.js";
import { type CodebookFile } from "./manifest.js";
import { type SessionOptions } from "./session.js";
import { CodebookGait, type BindPose, type CodebookGaitOptions } from "./quadruped.js";
export type { WasmSource } from "./load.js";
export * from "./manifest.js";
export * from "./fetch.js";
export { createCpuModel, type Accumulation, type CpuModel } from "./cpu.js";
export { createHost, type HostReply, type HostRequest } from "./host.js";
export { createSession, type Backend, type NetSession, type SessionOptions, type Where } from "./session.js";
export { createGpuModel, requestDevice, MATVEC_WGSL, POINTWISE_WGSL, type GpuModel } from "./webgpu.js";
export * from "./quadruped.js";
export declare function load(source?: WasmSource): Promise<void>;
export declare function loadSync(source: ArrayBuffer | ArrayBufferView | WebAssembly.Module): void;
/** The native and wasm agreement trace of the small seeded nets. */
export declare function goldenTrace(seed: number): Float64Array;
export interface QuadrupedSource {
    /** The quadruped json (model, skeleton, control, guidances, bin), or a URL to it. */
    manifest: CodebookFile | string | URL;
    /** The quadruped weights: a URL, ArrayBuffer or File. CC BY-NC 4.0. */
    weights: WeightSource;
    /** The 27 bind matrices, or a URL to them. */
    bind: BindPose | string | URL;
    fetch?: FetchOptions;
    session?: SessionOptions;
    gait?: CodebookGaitOptions;
}
/**
 * Loads the quadruped codebook network from caller sources and returns its
 * gait host. Load @hackbuild/gait first; the host fills gait's motor state.
 */
export declare function loadQuadrupedGait(src: QuadrupedSource): Promise<CodebookGait>;

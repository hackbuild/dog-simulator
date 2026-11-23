import { type NetManifest } from "./manifest.js";
/** f64 sums reproduce a JavaScript double precision reference to about 1e-7; f32 sums run faster. */
export type Accumulation = "f64" | "f32";
export interface CpuModel {
    readonly inputDim: number;
    /** Values per frame. */
    readonly outputDim: number;
    /** Frames per run; 1 for an mlp. */
    readonly frames: number;
    /** Bytes of f32 weights held in wasm memory (computed). */
    readonly bytes: number;
    run(input: Float32Array, frames?: number): Float32Array;
    dispose(): void;
}
export declare function createCpuModel(manifest: NetManifest, weights: ArrayBuffer, accum?: Accumulation): CpuModel;

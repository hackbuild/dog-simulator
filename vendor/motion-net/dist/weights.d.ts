import { type StyleLabel } from "./layout.js";
export declare const WEIGHT_LICENCE = "motion-net weights: cc by-nc 4.0, paul starke and sebastian starke, meta, ai4animationpy. fetched at run time, never bundled, not for commercial use.";
/** One public copy of the weights, pinned to a commit. Configuration only. */
export declare const UPSTREAM: {
    readonly manifest: "https://raw.githubusercontent.com/sweriko/ai4anim-webgpu/b539455f849f284a1e814eb11ab649eb594319dc/public/quadruped.json";
    readonly bin: "https://raw.githubusercontent.com/sweriko/ai4anim-webgpu/b539455f849f284a1e814eb11ab649eb594319dc/public/quadruped.bin";
    /** SHA-256 of that binary, computed from a downloaded copy. */
    readonly binSha256: "9568debf4a41da54f62d19bd7a29fbaf7dcc34c32d4ee472ab8560caefbcb372";
    /** Bytes of that binary (vendor). */
    readonly binBytes: 17704644;
};
export type Source = URL | string | ArrayBuffer | ArrayBufferView | Blob;
export type Dtype = "f16" | "f32";
export interface TensorEntry {
    offset: number;
    count: number;
    shape: number[];
    dtype: Dtype;
}
export interface Manifest {
    model: {
        input_dim: number;
        output_dim: number;
        latent_dim: number;
        codebook_channels: number;
        codebook_dims: number;
        sequence_length: number;
        denoiser_iterations: number;
        [k: string]: unknown;
    };
    skeleton: {
        bone_names: string[];
        parent_names: (string | null)[];
        [k: string]: unknown;
    };
    guidances: string[];
    bin: Record<string, TensorEntry>;
    [k: string]: unknown;
}
export interface Dims {
    dIn: number;
    dOut: number;
    hidden: number;
    group: number;
    frames: number;
    passes: number;
}
export interface Weights {
    manifest: Manifest;
    bin: ArrayBuffer;
    dims: Dims;
    /** Tensors the network reads, in a fixed order. */
    tensors: {
        key: string;
        dtype: Dtype;
        offset: number;
        count: number;
    }[];
    /** Style poses, 81 values each, as stored. */
    styles: Record<StyleLabel, Float32Array>;
    inputMean: Float32Array;
    inputStd: Float32Array;
    sha256: string | null;
    licence: string;
}
export interface LoadOptions {
    manifest: Source | Manifest;
    bin: Source;
    /** Expected SHA-256 of the binary in hex; checked when given. */
    sha256?: string;
    /** Receives the licence line on the first load in this page; console.info otherwise. */
    onLicence?: (text: string) => void;
    /** Download progress for URL sources, bytes so far and total (0 when unknown). */
    onProgress?: (loaded: number, total: number) => void;
    fetch?: typeof fetch;
}
/** The tensors the network reads and the dtype the format fixes for each. */
export declare function requiredTensors(d: Dims): {
    key: string;
    dtype: Dtype;
    shape: number[];
}[];
/** Dimensions from the manifest `model` section, checked for consistency. */
export declare function dimsOf(m: Manifest): Dims;
/** Checks a manifest against a binary of `binBytes` bytes. Returns the problems, empty when fine. */
export declare function validate(m: Manifest, binBytes: number): string[];
export declare function sha256Hex(buf: ArrayBuffer): Promise<string>;
/** Fetches or reads both parts, checks them, and states the licence once per page. */
export declare function loadWeights(opts: LoadOptions): Promise<Weights>;

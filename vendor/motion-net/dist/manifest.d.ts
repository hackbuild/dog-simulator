export type DType = "f16" | "f32";
export interface TensorEntry {
    /** Byte offset in the weight file. */
    offset: number;
    /** Element count. */
    count: number;
    shape: number[];
    dtype: DType;
}
export type Activation = "none" | "elu" | "relu" | "tanh";
export declare const ACTIVATION_CODES: Record<Activation, number>;
export interface MlpModel {
    kind: "mlp";
    /** Layer tensors are `<prefix>0`, `<prefix>1`, and on. */
    prefix: string;
    /** Sizes from input to output, one more than the layers. */
    dims: number[];
    activations: Activation[];
    /** Normalize with `input_stats` and denormalize with `output_stats`. */
    stats: boolean;
}
export interface CodebookModel {
    kind: "codebook";
    input: number;
    latent: number;
    /** Values per codebook group, the softmax width. */
    group: number;
    iterations: number;
    /** Frames per decoded sequence. */
    frames: number;
    output: number;
}
export interface WeightLicence {
    /** Short name of the weights, shown on load. */
    name: string;
    /** SPDX style id, such as CC-BY-NC-4.0. */
    licence: string;
    /** Who made the weights and where they come from. */
    credit: string;
}
export interface NetManifest {
    model: MlpModel | CodebookModel;
    tensors: Record<string, TensorEntry>;
    licence: WeightLicence;
    /** SHA-256 of the weight file in hex, when known. */
    sha256?: string;
}
/** The published quadruped codebook weights: CC BY-NC 4.0, non commercial use only. */
export declare const QUADRUPED_LICENCE: WeightLicence;
/** The upstream quadruped file shape: model, skeleton, control, guidances, bin. */
export interface CodebookFile {
    model: {
        input_dim: number;
        output_dim: number;
        latent_dim: number;
        codebook_channels: number;
        codebook_dims: number;
        sequence_length: number;
        sequence_window: number;
        denoiser_iterations: number;
    };
    skeleton: {
        bone_names: string[];
        parent_names: (string | null)[];
        bone_count: number;
    };
    control: {
        sequence_length: number;
        sequence_window: number;
        prediction_fps: number;
        sequence_fps: number;
        min_timescale: number;
        max_timescale: number;
        synchronization_sensitivity: number;
        timescale_sensitivity: number;
        contact_power: number;
        contact_threshold: number;
        trajectory_correction: number;
        locomotion_modes: Record<string, number>;
        pid: {
            kp: number;
            ki: number;
            kd: number;
        };
        input_deadzone: number;
        action_trigger_speed_max: number;
    };
    guidances: string[];
    bin: Record<string, {
        offset: number;
        count: number;
        shape: number[];
        dtype?: string;
    }>;
}
/** Maps the upstream codebook file onto the neutral manifest. */
export declare function codebookManifest(file: CodebookFile, licence?: WeightLicence, sha256?: string): NetManifest;
/** Reads one tensor as f32 (halves widened in JavaScript). */
export declare function readTensor(manifest: NetManifest, weights: ArrayBuffer, name: string): Float32Array;
/** The raw halves of an f16 tensor. */
export declare function readHalves(manifest: NetManifest, weights: ArrayBuffer, name: string): Uint16Array;
export declare function halfToFloat(h: number): number;
/** Every tensor name the model needs, for a check before upload. */
export declare function requiredTensors(model: NetManifest["model"]): string[];

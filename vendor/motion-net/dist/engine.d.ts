import type { Dims, Dtype, Weights } from "./weights.js";
/** Where the network runs: a blob worker or the page. */
export type EngineMode = "worker" | "page";
/** One evaluation of the network: 16 frames of output, the code and the time it took. */
export interface RawPrediction {
    /** 16 rows of 412 denormalized values. */
    frames: Float32Array;
    /** Refined code, 1024 values. */
    code: Float32Array;
    /** Code estimate before refinement. */
    code0: Float32Array;
    /** Milliseconds the evaluation took where it ran (measured). */
    ms: number;
}
interface TensorSlot {
    key: string;
    dtype: Dtype;
    offset: number;
    count: number;
}
type EngineIn = {
    kind: "configure-network";
    wasm: ArrayBuffer;
    dims: Dims;
    blob: ArrayBuffer;
    tensors: TensorSlot[];
} | {
    kind: "infer";
    requestId: number;
    input: Float32Array;
} | {
    kind: "teardown";
};
type EngineOut = {
    kind: "network-configured";
    inputLength: number;
} | {
    kind: "network-configure-failed";
    message: string;
} | {
    kind: "inference-done";
    requestId: number;
    frames: Float32Array;
    code: Float32Array;
    code0: Float32Array;
    inferenceMs: number;
} | {
    kind: "inference-failed";
    requestId: number;
    message: string;
} | {
    kind: "network-crashed";
    message: string;
};
interface Port {
    onmessage: ((ev: {
        data: EngineIn;
    }) => void) | null;
    postMessage(msg: EngineOut, transfer?: Transferable[]): void;
}
/**
 * The engine loop. Self contained: the worker source is this function's
 * text, so it must not touch anything outside its own body.
 */
export declare function engineMain(port: Port): void;
/** Options of `Predictor.create`: worker choice, wasm source and worker start timeout. */
export interface PredictorOptions {
    /** "auto" tries a worker and falls back to the page; true insists on a worker; false runs in the page. */
    worker?: boolean | "auto";
    /** The wasm: a URL or bytes. Defaults to the base64 copy shipped in the package. */
    wasm?: URL | string | ArrayBuffer | ArrayBufferView;
    /** How long a worker may take to report ready before the page fallback takes over, ms. */
    workerTimeoutMs?: number;
}
/** Evaluates the network, in a worker or in the page. */
export declare class Predictor {
    readonly mode: EngineMode;
    private readonly waiting;
    private nextId;
    private channel;
    private dead;
    /** Why the worker was not used, when it was not. */
    fallbackReason: string | null;
    /** Raw input length the network takes; set by `create`. */
    inputLength: number;
    private constructor();
    /** Runs one evaluation on a raw input of 339 values. */
    predict(input: Float32Array): Promise<RawPrediction>;
    dispose(): void;
    /** @internal Rejects every pending run and every later one. */
    fail(message: string): void;
    /** @internal */
    receive(m: EngineOut): void;
    private rejectAll;
    private shutdown;
    static create(weights: Weights, opts?: PredictorOptions): Promise<Predictor>;
}
export {};

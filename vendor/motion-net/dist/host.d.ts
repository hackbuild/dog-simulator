import { type Accumulation } from "./cpu.js";
import type { NetManifest } from "./manifest.js";
export type HostRequest = {
    t: "load";
    manifest: NetManifest;
    weights: ArrayBuffer;
    accum: Accumulation;
} | {
    t: "run";
    id: number;
    input: Float32Array;
    frames: number;
} | {
    t: "dispose";
};
export type HostReply = {
    t: "ready";
    bytes: number;
} | {
    t: "error";
    id?: number;
    message: string;
} | {
    t: "out";
    id: number;
    out: Float32Array;
    ms: number;
};
export type Post = (m: HostReply, transfer?: Transferable[]) => void;
/** A handler for host requests; replies go to `post`. `ready` loads the wasm first. */
export declare function createHost(post: Post, ready: () => Promise<void>): (m: HostRequest) => Promise<void>;

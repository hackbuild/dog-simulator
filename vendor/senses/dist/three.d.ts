import * as THREE from "three";
import type { CameraArray } from "./index.js";
/** The camera layout the wasm takes, from a three PerspectiveCamera. */
export declare function cameraFromThree(cam: THREE.PerspectiveCamera, out?: CameraArray): CameraArray;
/** Options of {@link Eye}; every field has a default. */
export interface EyeOptions {
    /** vertical field of view in degrees (default 74) */
    fov?: number;
    /** ID buffer size (default 192 by 108) */
    width?: number;
    height?: number;
    /** depth buffer size (default 96 by 54) */
    depthWidth?: number;
    depthHeight?: number;
    /** depth range in metres (default 12) */
    far?: number;
    near?: number;
}
/** An object the eye counts pixels for, with its label. */
export interface Tracked {
    object: THREE.Object3D;
    label: string;
    /** pixels needed to count as seen (default 2; about 60 suits furniture) */
    minPixels?: number;
}
/** A tracked object the eye saw: pixels, centroid and distance. */
export interface Seen {
    label: string;
    pixels: number;
    /** centroid in the ID buffer, 0 to 1, v down */
    u: number;
    v: number;
    /** metres from the eye at the centroid, from the depth buffer */
    dist: number;
}
/** The result of one eye pass: what was seen and the depth buffer in metres. */
export interface EyePass {
    visible: Seen[];
    /** metres along the view ray, row 0 at the top */
    depth: Float32Array<ArrayBuffer>;
    depthWidth: number;
    depthHeight: number;
    camera: CameraArray;
}
/** Decodes the RG packed depth of a bottom up readback into metres, row 0 at the top. */
export declare function decodeDepth(px: Uint8Array, w: number, h: number, far: number, out?: Float32Array<ArrayBuffer>): Float32Array<ArrayBuffer>;
/** Counts ID pixels per tracked index in a bottom up readback; ids are `index + 1` in red plus 256 times green. */
export declare function countIds(px: Uint8Array, w: number, h: number, n: number): {
    count: Uint32Array;
    sx: Float64Array;
    sy: Float64Array;
};
/** An eye on an agent's head that renders an object ID buffer and a depth buffer and reads them back. */
export declare class Eye {
    private renderer;
    private scene;
    readonly camera: THREE.PerspectiveCamera;
    readonly opts: Required<EyeOptions>;
    private idTarget;
    private depthTarget;
    private idPx;
    private depthPx;
    private depth;
    private black;
    private idMats;
    private depthMat;
    private colorTarget;
    private colorTmp;
    private busy;
    constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, opts?: EyeOptions);
    /** Puts the eye at a point looking along yaw (0 is +Z) and pitch. */
    place(pos: THREE.Vector3, yaw: number, pitch: number): void;
    get pending(): boolean;
    private idMat;
    private renderBoth;
    private finish;
    /** Renders the ID and depth buffers and reads them back synchronously. */
    pass(tracked: Tracked[], hide?: THREE.Object3D[]): EyePass;
    /** The same pass with async readback; null while a previous pass is in flight. */
    passAsync(tracked: Tracked[], hide?: THREE.Object3D[]): Promise<EyePass | null>;
    /**
     * A colour frame for saliency (RGBA, row 0 at the top) of `w` by `h`.
     * Without `target` the eye keeps one render target and one readback
     * buffer for the size and reuses them; `dispose` frees them.
     */
    colorFrame(w: number, h: number, target?: THREE.WebGLRenderTarget, out?: Uint8Array<ArrayBuffer>): Uint8Array;
    dispose(): void;
}

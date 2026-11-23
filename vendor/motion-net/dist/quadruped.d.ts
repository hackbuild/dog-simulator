import { type Capabilities, type GaitCommand, type LocomotionBackend, type MotorState, type RootMotion } from "@hackbuild/gait";
import type { CodebookFile } from "./manifest.js";
import type { NetSession } from "./session.js";
export type Action = "sit" | "stand" | "lie" | null;
export interface Health {
    /** Sim seconds since the request time of the sequence in use. */
    staleSeconds: number;
    /** Milliseconds of the last inference, measured where it ran. */
    inferenceMs: number;
    /** Consecutive frames longer than 1/15 s. */
    slowFrames: number;
    ok: boolean;
    /** Why ok is false, in page words. */
    reason: string;
}
export interface CodebookGaitOptions {
    /** Requests per second; the file's prediction rate by default, halved for an in page session. */
    rate?: number;
    /** Frames to decode per request; "auto" decodes those used before the next one plus a margin. */
    decodeFrames?: number | "auto";
    /** Stale above this many sim seconds. Default 0.30 (inferred, to tune against a slide metric). */
    staleAfter?: number;
    /** Halflife of the root velocity past the end of a sequence, seconds. Default 0.15 (inferred). */
    coastHalflife?: number;
    /** Allow the turn in place mode. Default true. */
    turnInPlace?: boolean;
}
interface Seq {
    /** Sim time of the request. */
    t0: number;
    /** Sim time the result arrived. */
    arrival: number;
    /** Playback position, seconds into the sequence; starts at its age on arrival and advances at the timescale. */
    play: number;
    frames: number;
    /** Root per frame: x, z, yaw. */
    root: Float64Array;
    /** Root velocity per frame, world xz. */
    rootVel: Float64Array;
    /** Bone position, quaternion and velocity per frame in that frame's root frame. */
    pos: Float64Array;
    rot: Float64Array;
    vel: Float64Array;
    contact: Float64Array;
}
/** Bind pose: 27 column major 4x4 world matrices, root at the origin facing +Z. */
export type BindPose = readonly (readonly number[])[];
export interface CodebookGaitData {
    file: CodebookFile;
    bind: BindPose;
    /** Guidance poses by name, 27 by 3 each, from the weight file. */
    guidance: Record<string, Float32Array>;
}
/** The guidance poses out of a weight file, by the manifest's table. */
export declare function readGuidance(file: CodebookFile, weights: ArrayBuffer): Record<string, Float32Array>;
export declare class CodebookGait implements LocomotionBackend {
    private readonly session;
    private readonly data;
    readonly capabilities: Capabilities;
    readonly boneNames: readonly string[];
    readonly parents: readonly number[];
    /** Sim seconds since construction. */
    time: number;
    /** Root, network units (about meters for the quadruped file). */
    root: {
        x: number;
        z: number;
        yaw: number;
    };
    /** Guidance in use. */
    guidance: string;
    /** Playback speed relative to the network's frame rate. */
    timescale: number;
    /** Turn in place was active on the last update. */
    turningInPlace: boolean;
    private readonly n;
    private readonly S;
    private readonly win;
    private readonly c;
    private readonly lengths;
    private readonly bindLocal;
    private readonly bindRot;
    private readonly pos;
    private readonly rot;
    private readonly vel;
    readonly contacts: Float64Array<ArrayBuffer>;
    private rootVel;
    private cur;
    private prev;
    private pending;
    private generation;
    private lastRequest;
    private slowFrames;
    private sync;
    private pidI;
    private heading;
    private lastError;
    private readonly sim;
    private readonly ctl;
    private readonly est;
    private motor;
    private readonly rate;
    private readonly opts;
    constructor(session: NetSession, data: CodebookGaitData, opts?: CodebookGaitOptions);
    /**
     * Seeds the body at a root pose and forward speed (from the outgoing
     * backend), bind pose carried along at that speed, and requests the
     * first prediction at once.
     */
    enter(from: {
        x: number;
        z: number;
        yaw: number;
        speed: number;
    }): void;
    private placeBind;
    /**
     * Moves the root without a prediction: for a caller whose other backend
     * drives the body, or one that pushes the root out of an obstacle. The
     * pose, the sequences in play and the requested trajectories move with
     * it, so the next frame continues from the new root instead of playing
     * back to the old one.
     */
    follow(r: {
        x: number;
        z: number;
        yaw: number;
    }): void;
    health(): Health;
    motorState(): MotorState;
    /** The pose in network units: world positions, quaternions (x y z w), velocities, contacts. */
    pose(): {
        positions: Float64Array;
        rotations: Float64Array;
        velocities: Float64Array;
        contacts: Float64Array;
    };
    update(dt: number, cmd: GaitCommand): RootMotion;
    /** The command as a target velocity, heading and action. */
    private command;
    private seqSpeed;
    private control;
    /** The network input for the current state. */
    feed(): Float32Array;
    private framesToDecode;
    private request;
    /** Decodes network output into a sequence in world space. */
    build(out: Float32Array, root: {
        x: number;
        z: number;
        yaw: number;
    }, t0: number, frames: number): Seq;
    /** Frame pair and weight for a sequence at `age` seconds of playback. */
    private pair;
    private animate;
    /** Root continues with its last velocity, decaying; the pose rides along. */
    private coast;
    private restoreLengths;
    dispose(): void;
}
export interface FallbackOptions {
    /** Seconds the procedural gait keeps the body after a stale handover. Default 2 (inferred). */
    holdSeconds?: number;
    /** Called on every switch with the new source and the reason, so the caller inertializes bones and paw targets. */
    onSwitch?: (to: "neural" | "procedural", reason: string) => void;
}
/** The procedural backend shape the fallback drives: a root it can set. */
export interface RootedBackend extends LocomotionBackend {
    root: RootMotion;
}
/**
 * Neural gait with a procedural fallback. The network keeps predicting
 * while the procedural gait drives, so it is warm when it takes over
 * again; diagnostics read `motorState()`, which names the active source.
 */
export declare class NeuralFallback implements LocomotionBackend {
    readonly neural: CodebookGait;
    readonly cpg: RootedBackend;
    active: "neural" | "procedural";
    private hold;
    private readonly opts;
    constructor(neural: CodebookGait, cpg: RootedBackend, opts?: FallbackOptions);
    get capabilities(): Capabilities;
    update(dt: number, cmd: GaitCommand): RootMotion;
    motorState(): MotorState;
}
export {};

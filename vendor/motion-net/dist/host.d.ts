import { type StyleLabel } from "./layout.js";
import type { RawPrediction } from "./engine.js";
/** What drives a locomotion backend. */
export type MotorSource = "procedural" | "neural" | "motion-match" | "clip" | "other";
/** Stride phase, duty and paw contacts of the host, in the shape @hackbuild/gait uses. */
export interface MotorState {
    source: MotorSource;
    phase: number;
    duty: number;
    strideFrequency: number;
    contacts: boolean[];
}
/** What a locomotion backend can do. */
export interface Capabilities {
    turnInPlace: boolean;
    minStopDistance: number;
    headPitchBias: number;
}
/** Root position, facing and velocity on the ground after one update: meters, radians, m/s and rad/s. */
export interface RootMotion {
    x: number;
    z: number;
    yaw: number;
    speed: number;
    turnRate: number;
}
/** A locomotion command: forward speed, turn rate and an optional posture blend. */
export interface GaitCommand {
    /** Forward speed, m/s. */
    speed: number;
    /** Turn rate, rad/s, positive to the left. */
    turnRate: number;
    posture?: {
        sit?: number;
        down?: number;
        bow?: number;
        reach?: number;
    };
}
/** The locomotion backend contract shared with @hackbuild/gait, so the host stands in for the procedural gait. */
export interface LocomotionBackend {
    readonly capabilities: Capabilities;
    update(dt: number, cmd: GaitCommand): RootMotion;
    motorState(): MotorState;
}
/** A host command: a gait command plus an optional world velocity, facing and style. */
export interface HostCommand extends GaitCommand {
    /** World planar velocity, m/s; overrides `speed` and lets the dog move sideways. */
    velocity?: {
        x: number;
        z: number;
    };
    /** World facing to turn toward, radians; overrides `turnRate`. */
    facing?: number;
    /** A style label to hold, or "auto" (the default) to choose by speed. */
    style?: StyleLabel | "auto";
}
/** Anything that evaluates the network, usually a `Predictor`; a stand in for tests. */
export interface Predicts {
    predict(input: Float32Array): Promise<RawPrediction>;
}
/** Timing, smoothing, paw pinning and style thresholds of the host. */
export interface HostTuning {
    /** Seconds between prediction requests. */
    interval: number;
    /** Time of trajectory sample k is start + k step, seconds. */
    trajStart: number;
    trajStep: number;
    /** Time constant over which the root's own velocity gives way to the command along the trajectory, s. */
    trajBlend: number;
    /** Half life of the command smoothing, s. */
    commandHalflife: number;
    /** Half life of the seam offset when a new prediction lands, s. */
    seamHalflife: number;
    /** Contact on and off thresholds. */
    contactOn: number;
    contactOff: number;
    /** Largest distance a pinned paw may sit from the network's paw, m. */
    maxPin: number;
    /** Integral gain of the speed loop that leans the trajectory until the dog's speed meets the command, 1/s. */
    speedGain: number;
    /** Largest lean of the speed loop either way, m/s. */
    leanRange: number;
    /** Share of the network's planted paw drift the root takes over, 0 to 1. */
    plantFollow: number;
    /** Half life of the slow pull of the root toward its pinned paws, s; 0 turns it off. */
    plantHalflife: number;
    /** Half life of the low pass on the root's share of the paw drift, s. */
    followHalflife: number;
    /** Speeds (m/s) where auto style moves up from Idle, Walk, Trot. */
    walkAt: number;
    trotAt: number;
    canterAt: number;
}
/** The default host tuning; each value has its reason beside it in the source. */
export declare const DEFAULT_TUNING: HostTuning;
type V3 = [number, number, number];
/** The state of one paw: contact, pin and phase. */
export interface PawState {
    /** Raw contact value of the network, sampled now. */
    contact: number;
    stance: boolean;
    /** Pinned world position in the host frame while in stance. */
    pin: V3 | null;
    /** Phase since touchdown over the last stride period, 0 to 1. */
    phase: number;
}
/** Drives the quadruped network and fills the gait motor state. */
export declare class QuadrupedHost implements LocomotionBackend {
    private readonly predictor;
    private readonly styles;
    readonly capabilities: Capabilities;
    readonly tuning: HostTuning;
    /** Root in the host frame: position on the ground and yaw (positive left). */
    root: {
        x: number;
        z: number;
        yaw: number;
    };
    /** Root velocity in the host frame, m/s, and turn rate, rad/s. */
    rootVelocity: {
        x: number;
        z: number;
        turnRate: number;
    };
    /** World bone positions, host frame, x y z per bone. */
    readonly positions: Float32Array<ArrayBuffer>;
    /** World bone rotations, host frame, x y z w per bone. */
    readonly rotations: Float32Array<ArrayBuffer>;
    readonly paws: PawState[];
    style: StyleLabel;
    /** Request to arrival of the last prediction, wall clock ms (measured). */
    latencyMs: number;
    /** Request to first use of the last prediction, ms on the host clock: what playback skips (measured). */
    lagMs: number;
    /** Evaluation time of the last prediction where it ran, ms (measured). */
    evalMs: number;
    /** Seconds since the playing prediction was requested; past 0.5 the dog holds. */
    predictionAge: number;
    /** Horizontal travel of each stance paw this frame, m, after pinning and before. */
    footSlide: number[];
    rawFootSlide: number[];
    /** Distance from each pinned paw to where the network puts it, m; 0 when free. */
    pinGap: number[];
    /** Predictions received and requests sent. */
    received: number;
    requested: number;
    private t;
    private yaw;
    private px;
    private pz;
    private cmdV;
    private cmdW;
    /** Speed added to the trajectory by the speed loop, m/s. */
    private lean;
    /** Ground speed of the root, smoothed over 0.1 s, m/s. */
    private speedNow;
    /** Turn rate of the root, smoothed over 0.1 s, rad/s (network sign). */
    private turnNow;
    private turnLean;
    /** Pinned paw positions, network frame world. */
    private readonly pins;
    /** The network's paw ends last frame, network frame world x z. */
    private readonly follow;
    /** Last knee bend direction per leg, root frame. */
    private readonly bend;
    private readonly prevRaw;
    private active;
    private pending;
    private lastRequest;
    private readonly pose;
    private readonly fresh;
    private readonly seam;
    private seamOn;
    private readonly input;
    private readonly lastSite;
    private readonly lastRawSite;
    private readonly release;
    private readonly touch;
    private lastCmd;
    constructor(predictor: Predicts, styles: Record<StyleLabel, ArrayLike<number>>, tuning?: Partial<HostTuning>);
    /** Places the dog, host frame, and forgets any motion. */
    reset(x: number, z: number, yaw: number): void;
    update(dtIn: number, cmd: HostCommand): RootMotion;
    motorState(): MotorState;
    /** Smooths the command into a network frame world velocity and yaw rate, and picks the style. */
    private steer;
    private toLocal;
    private schedule;
    private land;
    /** Current pose and velocities, the trajectory and the style pose, in the current root frame. */
    private buildInput;
    /** World transforms, pins, phases and slide readouts from the current pose. */
    private output;
    /** Moves the paw end to `target` (root frame) and bends the knee to keep both limb lengths. */
    private pinLeg;
    /** The last command passed to update. */
    get command(): HostCommand;
}
export {};

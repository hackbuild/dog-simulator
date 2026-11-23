import { type WasmSource } from "./load.js";
export type { WasmSource } from "./load.js";
export declare function load(source?: WasmSource): Promise<void>;
export declare function loadSync(source: ArrayBuffer | ArrayBufferView | WebAssembly.Module): void;
/** Uniform numbers in [0, 1); the family contract. Used here only to seed the wasm streams. */
export type Rng = () => number;
export type GaitName = "walk" | "pace" | "trot" | "canter" | "gallop";
export declare const GAIT_NAMES: readonly GaitName[];
export interface FootfallTable {
    name: GaitName;
    /** Stance start phase per leg, LF RF LH RH. */
    offsets: [number, number, number, number];
    duty: number;
    clearance: number;
    freq0: number;
    freqV: number;
    freqW: number;
}
export declare function quadrupedTables(): FootfallTable[];
/** A leg's rest geometry in the body frame: x to the body's left, z forward. */
export interface LegSpec {
    x: number;
    z: number;
    /** Toe height above the ground at rest. */
    toe: number;
    front: boolean;
}
export interface GaitCommand {
    /** Forward speed, m/s. */
    speed: number;
    /** Turn rate, rad/s. */
    turnRate: number;
    /** Posture weights, 0 to 1. */
    posture?: {
        sit?: number;
        down?: number;
        bow?: number;
        reach?: number;
    };
}
export interface FootState {
    x: number;
    /** World height: ground plus the swing height. */
    y: number;
    z: number;
    stance: boolean;
    swing: number;
}
export interface GaitState {
    phase: number;
    weights: Record<GaitName, number>;
    feet: FootState[];
    standing: boolean;
    frequency: number;
    duty: number;
    froude: number;
    /** Legs that touched down this frame. */
    touchdowns: number[];
    /** Phase per leg, 0 at touchdown. */
    legPhases: number[];
}
export type Ground = (x: number, z: number) => number;
/** Which source drives the body: show it wherever motion is diagnosed. */
export type MotorSource = "procedural" | "neural" | "motion-match" | "clip" | "other";
/**
 * The one motor state every source fills. Diagnostics, ear bounce,
 * footprints and sounds read this, never a particular source, so they
 * follow whatever actually moves the body.
 */
export interface MotorState {
    source: MotorSource;
    /** Stride phase of the reference leg (LF), 0 at its touchdown. */
    phase: number;
    duty: number;
    strideFrequency: number;
    contacts: boolean[];
}
/**
 * Phase, duty and stride frequency from foot contacts alone, by touchdown
 * to touchdown timing of a reference leg; for sources without an
 * oscillator (a neural network, a clip, a motion matcher).
 */
export declare class PhaseEstimator {
    readonly source: MotorSource;
    private readonly core;
    constructor(legs: number, source: MotorSource, reference?: number);
    /** `contacts` per leg: booleans, or contact values above `threshold`. */
    update(dt: number, contacts: readonly (boolean | number)[], threshold?: number): MotorState;
    dispose(): void;
}
/** The motor state of a procedural gait frame. */
export declare function motorStateOf(s: GaitState): MotorState;
/** The leg oscillator for a quadruped (LF RF LH RH). */
export declare class QuadrupedGait {
    readonly legs: readonly LegSpec[];
    readonly legLength: number;
    private readonly opts;
    private readonly core;
    constructor(legs: readonly LegSpec[], legLength: number, opts: {
        ground?: Ground;
        rng: Rng;
        paceBias?: number;
    });
    reset(x: number, z: number, yaw: number): void;
    /** World nominal foot spots for a body pose. */
    nominal(x: number, z: number, yaw: number): [number, number][];
    /** Posture foot offsets in the body frame, from `BodyDynamics`. */
    setOffsets(offsets: readonly [number, number][]): void;
    update(dt: number, pose: {
        x: number;
        z: number;
        yaw: number;
    }, cmd: GaitCommand): GaitState;
    dispose(): void;
}
export interface BodyGeometry {
    frontZ: number;
    rearZ: number;
    halfWidth: number;
    /** Length scale against the 0.78 m dog the defaults were tuned on. */
    size: number;
}
export interface BodyPose {
    rootY: number;
    drop: number;
    dz: number;
    pitch: number;
    roll: number;
    bend: number;
    flex: number;
    breathe: number;
    posture: {
        sit: number;
        down: number;
        bow: number;
        reach: number;
    };
    legOffsets: [number, number][];
    tilt: number[];
}
/** Posture springs, terrain pitch and roll, gait bob, lean and load shift. */
export declare class BodyDynamics {
    private readonly core;
    constructor(geometry: BodyGeometry, rng: Rng);
    /** `ground` holds the ground height under each nominal foot spot. */
    update(dt: number, gait: GaitState, cmd: GaitCommand, ground: readonly number[], breath?: {
        rate: number;
        depth: number;
    }): BodyPose;
    dispose(): void;
}
export declare const WAG_MODES: readonly ["still", "slow wide", "fast small", "loose broad", "helicopter", "high stiff", "tucked", "tip flick"];
export interface WagInput {
    modeWeights: readonly number[];
    arousal: number;
    lift?: number;
    bias?: number;
    turnRate?: number;
    ampScale?: number;
    hzScale?: number;
}
/** Tail wag through a spring chain, with eight wag modes. */
export declare class TailWag {
    private readonly core;
    constructor(links: number, halflife: number, rng: Rng);
    update(dt: number, inp: WagInput): {
        mode: (typeof WAG_MODES)[number];
        lift: number;
        yaw: number[];
    };
    dispose(): void;
}
/** Two ear springs. Returns [left, right] in radians. */
export declare class Ears {
    private readonly core;
    constructor(halflife?: number);
    update(dt: number, perk: number, negative: number, headYawRate: number, flap?: number, bounce?: number): [number, number];
    dispose(): void;
}
export interface Obstacle {
    x: number;
    z: number;
    r: number;
}
export interface SteerParams {
    speed: number;
    stopDistance: number;
    clearance: number;
    influence: number;
    turnSlow: number;
    turnFast: number;
    /** Fence radius around the origin, 0 for none. */
    fence: number;
}
export declare const DEFAULT_STEER: SteerParams;
/** Potential field steering toward a goal; a pure function. */
export declare function steer(pose: {
    x: number;
    z: number;
    yaw: number;
    v: number;
}, goal: {
    x: number;
    z: number;
}, obstacles?: readonly Obstacle[], params?: Partial<SteerParams>): {
    speed: number;
    turnRate: number;
    arrived: boolean;
};
export interface Capabilities {
    turnInPlace: boolean;
    /** The closest this backend can stop to a goal, meters. */
    minStopDistance: number;
    /** Head pitch the backend's own motion carries, radians. */
    headPitchBias: number;
}
export interface RootMotion {
    x: number;
    z: number;
    yaw: number;
    speed: number;
    turnRate: number;
}
/**
 * A locomotion backend (procedural gait, neural network, motion matcher)
 * declares what it can do, so a caller asks it for its stop distance
 * instead of assuming one.
 */
export interface LocomotionBackend {
    readonly capabilities: Capabilities;
    update(dt: number, cmd: GaitCommand): RootMotion;
    /** The common motor state after the last update. */
    motorState(): MotorState;
}
/** The procedural gait as a backend: integrates the command into root motion and steps the legs. */
export declare class ProceduralBackend implements LocomotionBackend {
    readonly gait: QuadrupedGait;
    readonly capabilities: Capabilities;
    root: RootMotion;
    state: GaitState | null;
    constructor(gait: QuadrupedGait);
    update(dt: number, cmd: GaitCommand): RootMotion;
    motorState(): MotorState;
}
/** Two bone leg solve; same layout as `@hackbuild/ik` twoBone. */
export declare function solveLeg(a: [number, number, number], b: [number, number, number], c: [number, number, number], target: [number, number, number], pole: [number, number, number]): {
    upper: [number, number, number, number];
    lower: [number, number, number, number];
    reached: boolean;
};
export declare function goldenTrace(seed: number): Float64Array;

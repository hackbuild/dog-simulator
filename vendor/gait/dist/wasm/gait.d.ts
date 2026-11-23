/* tslint:disable */
/* eslint-disable */

/**
 * Body dynamics with the dog postures (sit, down, bow, reach).
 */
export class BodyDynamics {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * `geometry` is `[frontZ, rearZ, halfWidth, size]`.
     */
    constructor(geometry: Float64Array, seed: number);
    /**
     * Returns `[rootY, drop, dz, pitch, roll, bend, flex, breathe, posture x4,
     * legOffsets x8, tilt x4]`.
     */
    update(dt: number, weights: Float64Array, phase: number, standing: boolean, v: number, w: number, posture_goals: Float64Array, ground: Float64Array, breath_rate: number, breath_depth: number): Float64Array;
}

export class EarPair {
    free(): void;
    [Symbol.dispose](): void;
    constructor(halflife: number);
    update(dt: number, perk: number, negative: number, head_yaw_rate: number, flap: number, bounce: number): Float64Array;
}

/**
 * A gait with its own seeded stream. `legs` holds `x z toe front` per leg
 * (front 1 or 0), in LF RF LH RH order for a quadruped.
 */
export class Gait {
    free(): void;
    [Symbol.dispose](): void;
    duty(): number;
    /**
     * `x height z stance swing` per foot; height is above the ground.
     */
    feet(): Float64Array;
    frequency(): number;
    froude(): number;
    /**
     * Phase per leg, 0 at touchdown.
     */
    legPhases(): Float64Array;
    constructor(legs: Float64Array, leg_length: number, seed: number);
    /**
     * World nominal spots `x z` per leg for a body at `x z yaw`.
     */
    nominal(x: number, z: number, yaw: number): Float64Array;
    phase(): number;
    reset(x: number, z: number, yaw: number): void;
    /**
     * Per leg posture offsets, `x z` per leg in the body frame.
     */
    setOffsets(xz: Float64Array): void;
    setPaceBias(bias: number): void;
    standing(): boolean;
    /**
     * Advances one frame; returns a bit per leg that touched down.
     */
    update(dt: number, x: number, z: number, yaw: number, v: number, w: number, posed: number): number;
    weights(): Float64Array;
}

/**
 * Phase, duty and stride frequency from foot contacts, for motor sources
 * without an oscillator.
 */
export class PhaseEstimator {
    free(): void;
    [Symbol.dispose](): void;
    constructor(legs: number, reference: number);
    /**
     * `contacts` is 1 or 0 per leg. Returns `[phase, duty, strideFrequency]`.
     */
    update(dt: number, contacts: Uint8Array): Float64Array;
}

export class Wag {
    free(): void;
    [Symbol.dispose](): void;
    constructor(links: number, halflife: number, seed: number);
    /**
     * Returns `[mode, lift, yaw per link]`.
     */
    update(dt: number, mode_weights: Float64Array, arousal: number, lift: number, bias: number, turn_rate: number, amp_scale: number, hz_scale: number): Float64Array;
}

export function goldenTrace(seed: number): Float64Array;

/**
 * Quadruped footfall tables, 9 numbers each: four offsets, duty, clearance,
 * freq0, freqV, freqW.
 */
export function quadrupedTables(): Float64Array;

/**
 * Two bone leg solve; see `@hackbuild/ik` `twoBone` for the layout.
 */
export function solveLeg(abc: Float64Array, target: Float64Array, pole: Float64Array): Float64Array;

/**
 * `obstacles` holds `x z r` each; `params` is `[speed, stopDistance,
 * clearance, influence, turnSlow, turnFast, fence]` or empty for the
 * defaults. Returns `[v, w, arrived]`.
 */
export function steer(x: number, z: number, yaw: number, v: number, tx: number, tz: number, obstacles: Float64Array, params: Float64Array): Float64Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_bodydynamics_free: (a: number, b: number) => void;
    readonly __wbg_earpair_free: (a: number, b: number) => void;
    readonly __wbg_gait_free: (a: number, b: number) => void;
    readonly __wbg_phaseestimator_free: (a: number, b: number) => void;
    readonly __wbg_wag_free: (a: number, b: number) => void;
    readonly bodydynamics_new: (a: number, b: number, c: number) => number;
    readonly bodydynamics_update: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number) => [number, number];
    readonly earpair_new: (a: number) => number;
    readonly earpair_update: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly gait_duty: (a: number) => number;
    readonly gait_feet: (a: number) => [number, number];
    readonly gait_frequency: (a: number) => number;
    readonly gait_froude: (a: number) => number;
    readonly gait_legPhases: (a: number) => [number, number];
    readonly gait_new: (a: number, b: number, c: number, d: number) => number;
    readonly gait_nominal: (a: number, b: number, c: number, d: number) => [number, number];
    readonly gait_phase: (a: number) => number;
    readonly gait_reset: (a: number, b: number, c: number, d: number) => void;
    readonly gait_setOffsets: (a: number, b: number, c: number) => void;
    readonly gait_setPaceBias: (a: number, b: number) => void;
    readonly gait_standing: (a: number) => number;
    readonly gait_update: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
    readonly gait_weights: (a: number) => [number, number];
    readonly goldenTrace: (a: number) => [number, number];
    readonly phaseestimator_new: (a: number, b: number) => number;
    readonly phaseestimator_update: (a: number, b: number, c: number, d: number) => [number, number];
    readonly quadrupedTables: () => [number, number];
    readonly solveLeg: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly steer: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => [number, number];
    readonly wag_new: (a: number, b: number, c: number) => number;
    readonly wag_update: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;

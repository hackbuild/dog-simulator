/* tslint:disable */
/* eslint-disable */

export class Loom {
    free(): void;
    [Symbol.dispose](): void;
    forget(id: number): void;
    constructor(tau: number, min_angle: number, max_gap: number, refractory: number);
    /**
     * The tau of a startle, or NaN.
     */
    observe(id: number, size: number, dist: number, now: number): number;
}

export class OccupancyGrid {
    free(): void;
    [Symbol.dispose](): void;
    at(x: number, z: number): number;
    bump(x: number, z: number): void;
    canStand(x: number, z: number): boolean;
    cells(): Uint8Array;
    freeAround(x: number, z: number): void;
    /**
     * `x z dist size` per frontier, nearest first.
     */
    frontiers(x: number, z: number): Float64Array;
    integrate(camera: Float64Array, depth: Float32Array, width: number, height: number, far: number, ax: number, ay: number, az: number): void;
    /**
     * `[free square metres, occupied cells]`
     */
    known(): Float64Array;
    markDead(x: number, z: number): void;
    mark(x: number, z: number, obstacle: boolean): void;
    /**
     * `opts`: cells, cell size, radius, floor y, head y, max range, hits to mark, bucket.
     */
    constructor(opts: Float64Array, cx: number, cz: number);
    /**
     * `x z` per waypoint, or empty when no path exists.
     */
    path(ax: number, az: number, bx: number, bz: number): Float64Array;
    readonly revision: number;
}

export class OdourField {
    free(): void;
    [Symbol.dispose](): void;
    clearPuffs(): void;
    concentration(x: number, z: number): number;
    decayTrail(elapsed: number, halflife: number): void;
    deposit(x: number, z: number, amount: number, now: number): void;
    groundConcentration(x: number, z: number): number;
    /**
     * `opts`: size, cells, max puffs, puff life, bounds, puff rate, wind, meander, wind heading.
     */
    constructor(opts: Float64Array, seed: number);
    puffConcentration(x: number, z: number): number;
    puffs(): Float64Array;
    setPuffRate(rate: number): void;
    setWind(speed: number, meander: number): void;
    /**
     * `sources`: id, x, z, strength per source.
     */
    step(dt: number, sources: Float64Array): void;
    /**
     * `[dx, dz]` or empty; pass NaN for no previous direction.
     */
    trailDirection(x: number, z: number, prev_x: number, prev_z: number): Float64Array;
    trail(): Float32Array;
    wind(): Float64Array;
    readonly puffCount: number;
}

export class PerceptMemory {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * `opts`: half fov, range per size, motion gain, motion speed, night floor, forget after, drift.
     */
    constructor(opts: Float64Array, seed: number);
    /**
     * `[x, y, z, confidence]` or empty.
     */
    recall(id: number, now: number): Float64Array;
    /**
     * `eye`: x y z; `obj`: px py pz vx vy vz size occluded hidden fixed.
     * Returns `[visible, seen (NaN if none), salience, confidence, dist, speed]`.
     */
    sense(id: number, eye: Float64Array, yaw: number, obj: Float64Array, light: number, t: number): Float64Array;
}

export class Saliency {
    free(): void;
    [Symbol.dispose](): void;
    biasPoint(x: number, y: number, z: number, weight: number): void;
    biasUv(u: number, v: number, weight: number): void;
    inhibit(x: number, y: number, z: number, until: number): void;
    inhibited(): number;
    map(): Float32Array;
    /**
     * `opts`: width, height, gain, threshold, fixation median, ior seconds,
     * snap angle, ground y, then the four channel weights.
     */
    constructor(opts: Float64Array, seed: number);
    ready(now: number): boolean;
    /**
     * `[x, y, value, px, py, pz, object]` (object -1 for the ground), or empty.
     */
    shift(now: number, camera: Float64Array, objects: Float64Array, arousal: number): Float64Array;
    update(frame: Uint8Array, width: number, height: number, now: number, camera: Float64Array): Float32Array;
    /**
     * `[index, value]`, or empty when nothing beats the threshold.
     */
    winner(): Float64Array;
    readonly mapHeight: number;
    readonly mapWidth: number;
}

export class Sniffer {
    free(): void;
    [Symbol.dispose](): void;
    constructor(sniff_hz: number, bout_hz: number, seed: number);
    setRates(sniff_hz: number, bout_hz: number): void;
    /**
     * `[left, right, mean of both, running mean, last whiff time]`
     */
    state(): Float64Array;
    tick(field: OdourField, dt: number, now: number, active: boolean, nx: number, nz: number, sx: number, sz: number): boolean;
    whiff(now: number, window: number): boolean;
}

export class Tracker {
    free(): void;
    [Symbol.dispose](): void;
    constructor(seed: number);
    setWaypoint(x: number, z: number): void;
    /**
     * `[mode, has waypoint, wx, wz, speed, stop distance, done, changed]`;
     * mode 0 decide, 1 trail, 2 surge, 3 cast.
     */
    step(field: OdourField, sniffer: Sniffer, dt: number, now: number, x: number, z: number, heading: number, arrived: boolean): Float64Array;
}

export function angularSize(size: number, dist: number): number;

/**
 * A camera at a position looking along yaw and pitch, as 16 numbers.
 */
export function cameraLook(x: number, y: number, z: number, yaw: number, pitch: number, fov: number, aspect: number, near: number, far: number): Float64Array;

export function goldenTrace(seed: number): Float64Array;

export function timeToContact(prev: number, angle: number, dt: number): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_loom_free: (a: number, b: number) => void;
    readonly __wbg_occupancygrid_free: (a: number, b: number) => void;
    readonly __wbg_odourfield_free: (a: number, b: number) => void;
    readonly __wbg_perceptmemory_free: (a: number, b: number) => void;
    readonly __wbg_saliency_free: (a: number, b: number) => void;
    readonly __wbg_sniffer_free: (a: number, b: number) => void;
    readonly __wbg_tracker_free: (a: number, b: number) => void;
    readonly angularSize: (a: number, b: number) => number;
    readonly cameraLook: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number];
    readonly goldenTrace: (a: number) => [number, number];
    readonly loom_forget: (a: number, b: number) => void;
    readonly loom_new: (a: number, b: number, c: number, d: number) => number;
    readonly loom_observe: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly occupancygrid_at: (a: number, b: number, c: number) => number;
    readonly occupancygrid_bump: (a: number, b: number, c: number) => void;
    readonly occupancygrid_canStand: (a: number, b: number, c: number) => number;
    readonly occupancygrid_cells: (a: number) => [number, number];
    readonly occupancygrid_freeAround: (a: number, b: number, c: number) => void;
    readonly occupancygrid_frontiers: (a: number, b: number, c: number) => [number, number];
    readonly occupancygrid_integrate: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => [number, number];
    readonly occupancygrid_known: (a: number) => [number, number];
    readonly occupancygrid_mark: (a: number, b: number, c: number, d: number) => void;
    readonly occupancygrid_markDead: (a: number, b: number, c: number) => void;
    readonly occupancygrid_new: (a: number, b: number, c: number, d: number) => number;
    readonly occupancygrid_path: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly occupancygrid_revision: (a: number) => number;
    readonly odourfield_clearPuffs: (a: number) => void;
    readonly odourfield_concentration: (a: number, b: number, c: number) => number;
    readonly odourfield_decayTrail: (a: number, b: number, c: number) => void;
    readonly odourfield_deposit: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly odourfield_groundConcentration: (a: number, b: number, c: number) => number;
    readonly odourfield_new: (a: number, b: number, c: number) => number;
    readonly odourfield_puffConcentration: (a: number, b: number, c: number) => number;
    readonly odourfield_puffCount: (a: number) => number;
    readonly odourfield_puffs: (a: number) => [number, number];
    readonly odourfield_setPuffRate: (a: number, b: number) => void;
    readonly odourfield_setWind: (a: number, b: number, c: number) => void;
    readonly odourfield_step: (a: number, b: number, c: number, d: number) => void;
    readonly odourfield_trail: (a: number) => [number, number];
    readonly odourfield_trailDirection: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly odourfield_wind: (a: number) => [number, number];
    readonly perceptmemory_new: (a: number, b: number, c: number) => number;
    readonly perceptmemory_recall: (a: number, b: number, c: number) => [number, number];
    readonly perceptmemory_sense: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number, number, number];
    readonly saliency_biasPoint: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly saliency_biasUv: (a: number, b: number, c: number, d: number) => void;
    readonly saliency_inhibit: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly saliency_inhibited: (a: number) => number;
    readonly saliency_map: (a: number) => [number, number];
    readonly saliency_mapHeight: (a: number) => number;
    readonly saliency_mapWidth: (a: number) => number;
    readonly saliency_new: (a: number, b: number, c: number) => [number, number, number];
    readonly saliency_ready: (a: number, b: number) => number;
    readonly saliency_shift: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number, number];
    readonly saliency_update: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number, number, number];
    readonly saliency_winner: (a: number) => [number, number];
    readonly sniffer_new: (a: number, b: number, c: number) => number;
    readonly sniffer_setRates: (a: number, b: number, c: number) => void;
    readonly sniffer_state: (a: number) => [number, number];
    readonly sniffer_tick: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => number;
    readonly sniffer_whiff: (a: number, b: number, c: number) => number;
    readonly timeToContact: (a: number, b: number, c: number) => number;
    readonly tracker_new: (a: number) => number;
    readonly tracker_setWaypoint: (a: number, b: number, c: number) => void;
    readonly tracker_step: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
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

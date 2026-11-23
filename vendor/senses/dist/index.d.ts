import { type WasmSource } from "./load.js";
import { type Rng } from "./scalar.js";
import * as w from "./wasm/senses.js";
export * from "./scalar.js";
export type { WasmSource } from "./load.js";
/** Loads the wasm. With no argument the inlined copy is used (works from file://). */
export declare function load(source?: WasmSource): Promise<void>;
/** Loads the wasm synchronously from bytes or a compiled module. */
export declare function loadSync(source: ArrayBuffer | ArrayBufferView | WebAssembly.Module): void;
/** The golden scenario run in wasm, for the native and wasm agreement test. */
export declare function goldenTrace(seed: number): Float64Array;
export type Vec3 = {
    x: number;
    y: number;
    z: number;
};
/**
 * A camera as 16 numbers: position, right, up, back (the columns of
 * three's matrixWorld), vertical fov in degrees, aspect, near, far.
 * `cameraFromThree` in `/three` builds one from a PerspectiveCamera.
 */
export type CameraArray = Float64Array;
/** A camera at a point looking along yaw (0 is +Z) and pitch (up positive). */
export declare function cameraLook(pos: Vec3, yaw: number, pitch: number, fov: number, aspect: number, near?: number, far?: number): CameraArray;
export interface SaliencyOptions {
    rng: Rng;
    /** feature grid the frame is sampled to (default 80 by 40) */
    width?: number;
    height?: number;
    gain?: number;
    /** the winner must beat this to become a fixation (default 0.35) */
    threshold?: number;
    /** fixation dwell median in seconds (default 0.83, Barber 2016) */
    fixationMedian?: number;
    /** inhibition of return in seconds (default 0.7) */
    iorSeconds?: number;
    /** an object within this angle of the winner ray takes the fixation (default 0.25 rad) */
    snapAngle?: number;
    groundY?: number;
    /** channel weights (default 1, 0.7, 0.6, 1.7) */
    channels?: {
        intensity?: number;
        blueYellow?: number;
        edges?: number;
        motion?: number;
    };
}
export interface Fixation {
    /** cell in the saliency map */
    x: number;
    y: number;
    value: number;
    point: Vec3;
    /** index into the objects passed to shift, or -1 for the ground */
    object: number;
}
/** Itti Koch saliency with top down bias and world space inhibition of return. */
export declare class Saliency {
    readonly inner: w.Saliency;
    constructor(o: SaliencyOptions);
    get mapWidth(): number;
    get mapHeight(): number;
    /** RGBA frame, row 0 at the top. Returns the map (mapWidth by mapHeight). */
    update(frame: Uint8Array | Uint8ClampedArray, width: number, height: number, now: number, camera: CameraArray): Float32Array;
    map(): Float32Array;
    /** Top down bias for the next update: `weight * exp(-d^2 / 6)` around the point's projection. */
    biasPoint(p: Vec3, weight: number): void;
    biasUv(u: number, v: number, weight: number): void;
    inhibit(dir: Vec3, until: number): void;
    get inhibited(): number;
    ready(now: number): boolean;
    winner(): {
        index: number;
        value: number;
    } | null;
    shift(now: number, camera: CameraArray, objects: Vec3[], arousal: number): Fixation | null;
    free(): void;
}
export interface LoomOptions {
    /** startle under this tau in seconds (default 0.6) */
    tau?: number;
    minAngle?: number;
    maxGap?: number;
    refractory?: number;
}
/** Looming detector keyed by small integer ids; `observe` returns the tau of a startle or null. */
export declare class Looming {
    readonly inner: w.Loom;
    constructor(o?: LoomOptions);
    observe(id: number, size: number, dist: number, now: number): number | null;
    forget(id: number): void;
    /** Frees the wasm memory now, before the garbage collector would; the object is unusable after. */
    free(): void;
}
export interface OdourOptions {
    rng: Rng;
    /** side of the square world in metres, centred on the origin (default 34) */
    size?: number;
    /** trail cells per side (default 64) */
    cells?: number;
    maxPuffs?: number;
    puffLife?: number;
    bounds?: number;
    /** puffs per second per source at strength 1 (default 5) */
    puffRate?: number;
    wind?: number;
    meander?: number;
    windHeading?: number;
}
export interface OdourSource {
    /** a small integer per source */
    id: number;
    x: number;
    z: number;
    strength: number;
}
/** Puff plume in a meandering wind plus a ground trail grid. */
export declare class OdourField {
    readonly inner: w.OdourField;
    private buf;
    constructor(o: OdourOptions);
    setWind(speed: number, meander: number): void;
    setPuffRate(rate: number): void;
    step(dt: number, sources: OdourSource[]): void;
    clearPuffs(): void;
    concentration(x: number, z: number): number;
    puffConcentration(x: number, z: number): number;
    groundConcentration(x: number, z: number): number;
    deposit(x: number, z: number, amount: number, now: number): void;
    /** Fades the trail by `elapsed / halflife` halvings. */
    decayTrail(elapsed: number, halflife: number): void;
    trailDirection(x: number, z: number, prev?: {
        x: number;
        z: number;
    }): {
        x: number;
        z: number;
    } | null;
    /** x, z, age, mass per puff */
    puffs(): Float64Array;
    get puffCount(): number;
    wind(): {
        x: number;
        z: number;
    };
    trail(): Float32Array;
    free(): void;
}
/** Two nostril sniffing in bouts (Craven 2010; Thesen 1993: 6 Hz while tracking). */
export declare class Sniffer {
    readonly inner: w.Sniffer;
    constructor(o: {
        rng: Rng;
        sniffHz?: number;
        boutHz?: number;
    });
    /** Returns true when a sniff was taken. `side` is the offset to the left nostril. */
    tick(field: OdourField, dt: number, now: number, active: boolean, nose: {
        x: number;
        z: number;
    }, side: {
        x: number;
        z: number;
    }): boolean;
    whiff(now: number, window?: number): boolean;
    state(): {
        left: number;
        right: number;
        conc: number;
        mean: number;
        whiffT: number;
    };
    /** Frees the wasm memory now, before the garbage collector would; the object is unusable after. */
    free(): void;
}
export type TrackMode = "decide" | "trail" | "surge" | "cast";
export interface TrackStep {
    mode: TrackMode;
    waypoint: {
        x: number;
        z: number;
    } | null;
    speed: number;
    stopDist: number;
    done: boolean;
    changed: boolean;
}
/** Scent tracking: decide over a ground trail, follow it, surge upwind on whiffs, cast crosswind on a loss. */
export declare class Tracker {
    readonly inner: w.Tracker;
    constructor(o: {
        rng: Rng;
    });
    step(field: OdourField, sniffer: Sniffer, dt: number, now: number, pos: {
        x: number;
        z: number;
    }, heading: number, arrived: boolean): TrackStep;
    /** Replaces the waypoint, for a caller that keeps it out of obstacles. */
    setWaypoint(x: number, z: number): void;
    /** Frees the wasm memory now, before the garbage collector would; the object is unusable after. */
    free(): void;
}
export interface VisionOptions {
    rng: Rng;
    /** half the horizontal field of view in rad (default 2.09, a 240 degree field) */
    halfFov?: number;
    rangePerSize?: number;
    motionGain?: number;
    motionSpeed?: number;
    nightFloor?: number;
    forgetAfter?: number;
    drift?: number;
}
export interface Sighting {
    pos: Vec3;
    vel?: Vec3;
    size: number;
    occluded?: boolean;
    hidden?: boolean;
    fixed?: boolean;
}
export interface Percept {
    visible: boolean;
    seen: number | null;
    salience: number;
    confidence: number;
    dist: number;
    speed: number;
}
/** Geometric vision with percept memory that drifts with sqrt(age) (Fiset 2003). */
export declare class PerceptMemory {
    readonly inner: w.PerceptMemory;
    private eye;
    private obj;
    constructor(o: VisionOptions);
    sense(id: number, eye: Vec3, facingYaw: number, s: Sighting, light: number, t: number): Percept;
    recall(id: number, now: number): {
        pos: Vec3;
        confidence: number;
    } | null;
    /** Frees the wasm memory now, before the garbage collector would; the object is unusable after. */
    free(): void;
}
export declare const UNKNOWN = 0;
export declare const FREE = 1;
export declare const OCCUPIED = 2;
export interface GridOptions {
    /** cells per side (default 220) */
    cells?: number;
    /** cell size in metres (default 0.1) */
    cell?: number;
    /** obstacle inflation and free footprint in cells (default 2) */
    radius?: number;
    floorY?: number;
    headY?: number;
    maxRange?: number;
    hitsToMark?: number;
    bucket?: number;
    center?: {
        x: number;
        z: number;
    };
}
export interface Frontier {
    x: number;
    z: number;
    dist: number;
    size: number;
}
/** Occupancy grid from eye depth renders, with A* paths and frontiers. */
export declare class OccupancyGrid {
    readonly inner: w.OccupancyGrid;
    constructor(o?: GridOptions);
    /** Depth in metres along the view ray, row 0 at the top. */
    integrate(camera: CameraArray, depth: Float32Array, width: number, height: number, far: number, agent: Vec3): void;
    mark(x: number, z: number, obstacle: boolean): void;
    freeAround(x: number, z: number): void;
    bump(x: number, z: number): void;
    at(x: number, z: number): number;
    canStand(x: number, z: number): boolean;
    path(a: {
        x: number;
        z: number;
    }, b: {
        x: number;
        z: number;
    }): {
        x: number;
        z: number;
    }[] | null;
    frontiers(p: {
        x: number;
        z: number;
    }): Frontier[];
    markDead(x: number, z: number): void;
    known(): {
        free: number;
        occupied: number;
    };
    cells(): Uint8Array;
    get revision(): number;
    /** Frees the wasm memory now, before the garbage collector would; the object is unusable after. */
    free(): void;
}

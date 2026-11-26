/** Uniform numbers in [0, 1), injected so a seed replays the same shake. */
export type Rng = () => number;
/** A point or offset in metres, y up. */
export interface V3 {
    x: number;
    y: number;
    z: number;
}
/** The camera surface the rigs write: a three PerspectiveCamera fits, nothing is imported. */
export interface CameraLike {
    position: {
        set(x: number, y: number, z: number): unknown;
        x: number;
        y: number;
        z: number;
    };
    lookAt(x: number, y: number, z: number): void;
    fov: number;
    aspect: number;
}
/** Frame rate independent exponential damping toward `to` at `rate` per second. */
export declare const damp: (from: number, to: number, rate: number, dt: number) => number;
/**
 * Shake: seeded value noise on three axes, amplitude decaying at `decay`
 * per second. It draws from its Rng only while shaking (three numbers per
 * knot, `frequency` knots a second) and holds two knots. Give it an Rng
 * stream of its own: how many draws fall before a given sim time depends
 * on the frame steps, so sharing the sim's stream would tie the sim to the
 * frame rate.
 */
export declare class Shake {
    private rng;
    readonly frequency: number;
    readonly decay: number;
    private amp;
    private t;
    private a;
    private b;
    constructor(rng: Rng, frequency?: number, decay?: number);
    /** Adds trauma; amplitudes add and are capped at `max`. */
    kick(amplitude: number, max?: number): void;
    get amplitude(): number;
    private knot;
    /** The offset for this frame. */
    step(dt: number): V3;
}
/** Places a camera on an orbit around a target: yaw 0 behind +Z, pitch up from the ground. */
export declare function orbitPosition(target: V3, yaw: number, pitch: number, dist: number): V3;
/** Options of {@link Follow}; every field has a default. */
export interface FollowOptions {
    distance?: number;
    minDistance?: number;
    pitch?: number;
    /** height of the look target above the followed point */
    lookHeight?: number;
    /** damping rates per second for the target and the yaw */
    smoothing?: number;
    yawSmoothing?: number;
    /** metres kept in front of an occluder */
    backoff?: number;
    /**
     * The free distance from the look target toward the camera along a unit
     * direction, up to `max` (a raycast against the world); omit for no
     * occlusion handling.
     */
    clear?: (from: V3, dir: V3, max: number) => number;
}
/** Third person follow behind a moving target, pulled in when something blocks the view. */
export declare class Follow {
    readonly camera: CameraLike;
    readonly o: Required<Omit<FollowOptions, "clear">> & Pick<FollowOptions, "clear">;
    private target;
    private yaw;
    dist: number;
    constructor(camera: CameraLike, o?: FollowOptions);
    /** `heading` is the target's yaw (0 faces +Z). */
    update(p: V3, heading: number, dt: number, snap?: boolean): void;
}
/** Options of {@link Group}; every field has a default. */
export interface GroupOptions {
    center?: V3;
    pitch?: number;
    yaw?: number;
    /** padding around the group (m; crownfall 5.5) */
    pad?: number;
    minDistance?: number;
    maxDistance?: number;
    /** usable share of the screen height (crownfall 0.64, the rest is HUD) */
    band?: number;
    /** pull of the framing centre toward `center` */
    centerPull?: number;
}
/** Keeps every point in view: the crownfall shared camera. */
export declare class Group {
    readonly camera: CameraLike;
    readonly o: Required<GroupOptions>;
    target: V3;
    dist: number;
    constructor(camera: CameraLike, o?: GroupOptions);
    /** The distance and centre that frame the points (no damping). */
    solve(points: readonly V3[]): {
        target: V3;
        dist: number;
    };
    update(points: readonly V3[], dt: number, snap?: boolean, shake?: V3): void;
}
/** A free orbit camera driven by deltas (drag, wheel, keys); input binding stays with the app. */
export declare class Orbit {
    readonly camera: CameraLike;
    yaw: number;
    pitch: number;
    dist: number;
    readonly limits: {
        minPitch: number;
        maxPitch: number;
        minDist: number;
        maxDist: number;
    };
    target: V3;
    constructor(camera: CameraLike, yaw?: number, pitch?: number, dist?: number, target?: V3, limits?: {
        minPitch: number;
        maxPitch: number;
        minDist: number;
        maxDist: number;
    });
    rotate(dYaw: number, dPitch: number): void;
    zoom(factor: number): void;
    /** Moves the target in the ground plane, relative to the view. */
    pan(right: number, forward: number): void;
    apply(): void;
}
/** An object with a scale, such as a three Object3D head bone. */
export interface Scalable {
    scale: {
        x: number;
        y: number;
        z: number;
        set(x: number, y: number, z: number): unknown;
    };
}
/**
 * A first person eye on an agent's head. `render` hides the head (scaled
 * to 0.001, since visible false would hide the whole subtree)
 * for this render only, then restores it.
 */
export declare class FirstPerson {
    readonly camera: CameraLike;
    readonly head: Scalable | null;
    readonly forward: number;
    readonly up: number;
    constructor(camera: CameraLike, head?: Scalable | null, forward?: number, up?: number);
    /** Head position, yaw (0 faces +Z) and pitch (up positive). */
    place(head: V3, yaw: number, pitch: number): void;
    render(draw: () => void): void;
}
/** Viewports for 1 to 4 split views in pixels, top left origin; three wants bottom left, so `y` is flipped for it. */
export declare function splitViewports(n: number, width: number, height: number): {
    x: number;
    y: number;
    w: number;
    h: number;
    yGl: number;
}[];

export interface Stats {
    n: number;
    mean: number;
    p50: number;
    p95: number;
    max: number;
}
/** Percentile by nearest rank on a sorted copy. */
export declare function percentile(xs: readonly number[], p: number): number;
export declare function stats(xs: readonly number[]): Stats;
/** Frame time p50, p95 and max in ms from frame durations. */
export declare function frameStats(ms: readonly number[]): Stats;
export type Point = readonly number[];
/**
 * Jerk magnitudes (m/s^3) from positions sampled every `dt` seconds: the
 * third difference of position over dt^3. Points may be 2D or 3D.
 */
export declare function jerk(points: readonly Point[], dt: number): number[];
export interface SlideResult {
    /** seconds where the body heading and the direction of motion differ by more than the threshold */
    seconds: number;
    /** share of moving samples that slide */
    share: number;
    /** moving samples */
    moving: number;
}
/**
 * Sliding: the body faces one way and moves another. `yaw` 0 is +Z,
 * positions are (x, z). Samples below `minSpeed` m/s do not count.
 */
export declare function sliding(points: readonly Point[], yaw: readonly number[], dt: number, threshold?: number, minSpeed?: number): SlideResult;
/** State changes per second over a sampled label series. */
export declare function togglesPerSecond(states: readonly unknown[], dt: number): number;
/**
 * Seconds where an agent with a goal moved under `dist` m over the
 * previous `window` s (the hackle-plan stall detector, 0.2 m in 2 s).
 */
export declare function stallSeconds(points: readonly Point[], hasGoal: readonly boolean[], dt: number, window?: number, dist?: number): number;

/** Options of an `InferenceScheduler`. */
export interface ScheduleOptions {
    /** seconds between the starts of two calls (the dog simulator uses 25) */
    minInterval: number;
    /** only start while the caller says the agent is idle */
    idleOnly?: boolean;
    /** skip while the smoothed frame time is above this (ms) */
    frameBudgetMs?: number;
    /** smoothing of the frame time, 0 to 1 per frame (default 0.1) */
    smoothing?: number;
}
/** Why a call may not start now, or ready. */
export type ScheduleState = "busy" | "cooling down" | "waiting for idle" | "over frame budget" | "ready";
/** Starts a heavy model call only after a minimum interval, optionally only while idle and inside a frame budget, one at a time. */
export declare class InferenceScheduler {
    readonly opts: ScheduleOptions;
    private lastStart;
    private running;
    private frameMs;
    private frames;
    lastMs: number;
    calls: number;
    skipped: number;
    constructor(opts: ScheduleOptions);
    /** Feeds one frame time in ms. */
    frame(ms: number): void;
    get smoothedFrameMs(): number;
    get busy(): boolean;
    state(now: number, idle?: boolean): ScheduleState;
    /**
     * Runs `fn` when the state is ready; otherwise returns null without
     * calling it. `clock` measures the call in ms (inject performance.now).
     */
    run<T>(now: number, idle: boolean, fn: () => Promise<T>, clock?: () => number): Promise<T | null>;
}

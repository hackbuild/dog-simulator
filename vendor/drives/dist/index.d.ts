import { type WasmSource } from "./load.js";
import * as w from "./wasm/drives.js";
export * from "./clock.js";
export * from "./schedule.js";
export * from "./task.js";
export type { WasmSource } from "./load.js";
/** Uniform numbers in [0, 1). The family contract: injected, never Math.random. */
export type Rng = () => number;
/** Mulberry32, the same stream as the Rust `Mulberry32`. */
export declare function seededRng(seed: number): Rng;
export declare const seedFrom: (rng: Rng) => number;
export declare function load(source?: WasmSource): Promise<void>;
export declare function loadSync(source: ArrayBuffer | ArrayBufferView | WebAssembly.Module): void;
export declare function goldenTrace(seed: number): Float64Array;
/** Sleepiness from the body clock at an hour 0 to 24 (peaks of activity near 7 and 19). */
export declare function bodyClock(hour: number): number;
/** Drive reduction reward over named deficits (Keramati and Gutkin 2011). */
export declare class Drives<K extends string> {
    readonly inner: w.Drives;
    readonly keys: K[];
    constructor(weights: Record<K, number>, opts?: {
        n?: number;
        m?: number;
        gain?: number;
    });
    private vec;
    get values(): Record<K, number>;
    set(values: Partial<Record<K, number>>): void;
    /** The drive of a state, or of the current one. */
    distance(state?: Partial<Record<K, number>>): number;
    /** Reward of an act with this expected effect; reductions scaled by `scale`. */
    rewardOf(effect: Partial<Record<K, number>>, scale?: number): number;
    grow(dt: number, rates: Partial<Record<K, number>>): void;
    setShape(n: number, m: number, gain: number): void;
    /** Frees the wasm memory now, before the garbage collector would; the object is unusable after. */
    free(): void;
}
export type Reason = "hold" | "top" | "sampled" | "reactive" | "forced" | "argmax" | "fired";
export interface Option<B extends string = string> {
    id: B;
    utility: number;
    /** cannot wait for the dwell: switches after a short latency */
    reactive?: boolean;
}
export interface Decision<B extends string = string> {
    current: B;
    switched: boolean;
    pending: {
        id: B;
        at: number;
        latency: number;
    } | null;
    reason: Reason;
    /** the option the reason is about */
    id: B;
    utility: number;
    best: B;
    bestUtility: number;
    /** sampling probability of `id` when a sample was drawn, else NaN */
    probability: number;
    why: string;
    /** every option's utility at this update, for logging */
    utilities: Record<B, number>;
}
export interface ChooserOptions<B extends string> {
    rng: Rng;
    options: readonly B[];
    start?: B;
    /** softmax temperature (default 0.06) */
    temperature?: number;
    /** bonus on the current act while not done (default 0.12) */
    commitment?: number;
    dwellMu?: number;
    dwellTau?: number;
    reactMu?: number;
    reactTau?: number;
    reactMargin?: number;
    /** false gives argmax with hysteresis (the canned path) */
    sample?: boolean;
    /** false removes latencies and draws a fixed dwell (the canned path) */
    noise?: boolean;
}
/** Softmax with commitment and reactive latencies; every decision has a why. */
export declare class Chooser<B extends string> {
    readonly inner: w.Chooser;
    readonly options: readonly B[];
    private index;
    private u;
    private r;
    constructor(o: ChooserOptions<B>);
    get current(): B;
    /** The executor reports the current act finished. */
    markDone(): void;
    get done(): boolean;
    /** Switches now (a cue, a command); the done flag resets and a new dwell is drawn. */
    set(id: B, now: number): void;
    private need;
    /** One update. Options missing from `utilities` score 0. */
    update(now: number, utilities: Partial<Record<B, number>>, reactive?: Iterable<B>, forced?: B): Decision<B>;
    get dwellUntil(): number;
    setTemperature(t: number, commitment: number): void;
    /** Frees the wasm memory now, before the garbage collector would; the object is unusable after. */
    free(): void;
}
export type CueResponse<A extends string> = {
    kind: "ignored";
    latency: number;
} | {
    kind: "none";
    latency: number;
} | {
    kind: "act";
    action: A;
    offered: boolean;
    latency: number;
};
export interface LearnerOptions<A extends string> {
    rng: Rng;
    actions: readonly A[];
    alpha?: number;
    theta?: number;
    traceSeconds?: number;
    /** inhibition decay per minute (default 0.06) */
    inhibitionDecay?: number;
    offerRate?: number;
    /** base non compliance (default 0.25) */
    ignore?: number;
    cueMu?: number;
    cueTau?: number;
    noise?: boolean;
}
export interface LearnerState<A extends string> {
    ver: 1;
    cues: Record<string, {
        w: Record<A, number>;
        n: Record<A, number>;
        associability: number;
    }>;
    offer: Record<A, number>;
}
/** Cue learning with associability, eligibility traces and decaying inhibition. */
export declare class CueLearner<A extends string> {
    readonly inner: w.CueLearner;
    readonly actions: readonly A[];
    private index;
    constructor(o: LearnerOptions<A>);
    private need;
    respond(cue: string, now: number, o?: {
        distraction?: number;
        trainability?: number;
        watched?: boolean;
        offerable?: A[];
    }): CueResponse<A>;
    markDone(action: A, now: number): void;
    offerTrick(action: A, now: number): void;
    reward(r: number, now: number, trainability?: number): {
        cue: string | null;
        action: A;
        value: number;
        credit: number;
    } | null;
    decay(dt: number): void;
    value(cue: string, action: A): number;
    /** Sets a prior: excitation `w` for a cue and action. */
    prior(cue: string, action: A, wgt: number): void;
    setOffer(action: A, v: number): void;
    toJSON(): LearnerState<A>;
    load(s: LearnerState<A>): void;
    /** Frees the wasm memory now, before the garbage collector would; the object is unusable after. */
    free(): void;
}
export type SleepStage = "awake" | "onset" | "nrem" | "rem" | "wake";
/** Sleep pressure, body clock and the stage machine of one sleep. */
export declare class Sleep {
    readonly inner: w.Sleep;
    constructor(o: {
        rng: Rng;
        pressure?: number;
        up?: number;
        down?: number;
        nrem?: number;
        rem?: number;
        wake?: number;
        enough?: number;
    });
    get pressure(): number;
    set pressure(p: number);
    get stage(): SleepStage;
    pressureStep(gameHours: number, activity?: number): void;
    sleepiness(hour: number): number;
    fatigue(hour: number, running?: boolean): number;
    lieDown(negative?: boolean): void;
    wakeUp(): void;
    /** Returns true when the sleep ended on its own. */
    step(gameMinutes: number, hour: number, negative?: boolean): boolean;
    sample(): void;
    hypnogram(): SleepStage[];
    wakeThreshold(): number;
    /** Frees the wasm memory now, before the garbage collector would; the object is unusable after. */
    free(): void;
}
/** Memories ranked by recency, importance and relevance (Park et al. 2023). */
export declare class MemoryStream {
    readonly inner: w.MemoryStream;
    constructor(o?: {
        capacity?: number;
        decay?: number;
    });
    add(text: string, importance: number, hour: number): void;
    retrieve(hour: number, cues: string[], k: number): string[];
    get pendingImportance(): number;
    /** True once summed importance reaches the budget; resets the sum. */
    shouldReflect(budget: number): boolean;
    get length(): number;
    /** Frees the wasm memory now, before the garbage collector would; the object is unusable after. */
    free(): void;
}
/**
 * A goal set by a slow deliberation (a language model, a planner): adds a
 * bonus to one option's utility until it expires. Model agnostic.
 */
export declare class GoalBoost<B extends string> {
    readonly bonus: number;
    private goal;
    constructor(bonus?: number);
    set(id: B, now: number, seconds: number, why: string): void;
    current(now: number): {
        id: B;
        why: string;
    } | null;
    apply(now: number, u: Partial<Record<B, number>>): Partial<Record<B, number>>;
}

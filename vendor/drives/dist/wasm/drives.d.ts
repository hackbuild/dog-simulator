/* tslint:disable */
/* eslint-disable */

export class Chooser {
    free(): void;
    [Symbol.dispose](): void;
    markDone(): void;
    /**
     * `opts`: temperature, commitment, dwell mu, dwell tail, react mu, react tail, react margin, sample (0 or 1), noise (0 or 1).
     */
    constructor(names: string[], opts: Float64Array, seed: number, start: number);
    setTemperature(t: number, commitment: number): void;
    set(option: number, now: number): void;
    /**
     * `[current, switched, pending option or -1, pending at, reason,
     * option, utility, best, best utility, probability, latency]`;
     * reasons 0 hold, 1 top, 2 sampled, 3 reactive, 4 forced, 5 argmax, 6 fired.
     */
    update(now: number, utilities: Float64Array, reactive: Uint8Array, forced: number): Float64Array;
    readonly current: number;
    readonly dwellUntil: number;
    readonly isDone: boolean;
    readonly why: string;
}

export class CueLearner {
    free(): void;
    [Symbol.dispose](): void;
    associability(cue: number): number;
    cueIndex(cue: string): number;
    cues(): string[];
    decay(dt: number): void;
    ensure(cue: string): number;
    excitation(cue: number, action: number): number;
    inhibition(cue: number, action: number): number;
    markDone(action: number, now: number): void;
    /**
     * `opts`: alpha, theta, trace seconds, inhibition decay, offer rate, ignore, cue mu, cue tail, noise (0 or 1).
     */
    constructor(actions: number, opts: Float64Array, seed: number);
    offerTrick(action: number, now: number): void;
    offer(action: number): number;
    /**
     * `[kind, action, offered, latency]`; kind 0 ignored, 1 none, 2 act.
     */
    respond(cue: string, now: number, distraction: number, trainability: number, watched: boolean, offerable: Uint8Array): Float64Array;
    /**
     * `[cue or -1, action, value, credit]` or empty when nothing was eligible.
     */
    reward(r: number, now: number, trainability: number): Float64Array;
    setAssociability(cue: number, a: number): void;
    setOffer(action: number, v: number): void;
    setWeight(cue: number, action: number, w: number, n: number): void;
    value(cue: number, action: number): number;
}

export class Drives {
    free(): void;
    [Symbol.dispose](): void;
    distance(h: Float64Array): number;
    grow(dt: number, rates: Float64Array): void;
    constructor(weights: Float64Array, n: number, m: number, gain: number);
    rewardOf(effect: Float64Array, scale: number): number;
    setShape(n: number, m: number, gain: number): void;
    setValues(v: Float64Array): void;
    values(): Float64Array;
}

export class MemoryStream {
    free(): void;
    [Symbol.dispose](): void;
    add(text: string, importance: number, hour: number): void;
    /**
     * `importance, hour` per memory, newest first.
     */
    meta(): Float64Array;
    constructor(capacity: number, decay: number);
    /**
     * Indices into `texts()` of the best `k`, highest score first.
     */
    retrieve(hour: number, cues: string[], k: number): Uint32Array;
    shouldReflect(budget: number): boolean;
    texts(): string[];
    readonly length: number;
    readonly pendingImportance: number;
}

export class Sleep {
    free(): void;
    [Symbol.dispose](): void;
    fatigue(hour: number, running: boolean): number;
    hypnogram(): Uint8Array;
    lieDown(negative: boolean): void;
    /**
     * `opts`: up, down, nrem, rem, wake chance, enough.
     */
    constructor(opts: Float64Array, pressure: number, seed: number);
    pressureStep(game_hours: number, activity: number): void;
    sample(): void;
    sleepiness(hour: number): number;
    step(game_minutes: number, hour: number, negative: boolean): boolean;
    wakeThreshold(): number;
    wakeUp(): void;
    pressure: number;
    /**
     * 0 awake, 1 onset, 2 nrem, 3 rem, 4 wake
     */
    readonly stage: number;
}

export function bodyClock(h: number): number;

export function goldenTrace(seed: number): Float64Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_chooser_free: (a: number, b: number) => void;
    readonly __wbg_cuelearner_free: (a: number, b: number) => void;
    readonly __wbg_drives_free: (a: number, b: number) => void;
    readonly __wbg_memorystream_free: (a: number, b: number) => void;
    readonly __wbg_sleep_free: (a: number, b: number) => void;
    readonly bodyClock: (a: number) => number;
    readonly chooser_current: (a: number) => number;
    readonly chooser_dwellUntil: (a: number) => number;
    readonly chooser_isDone: (a: number) => number;
    readonly chooser_markDone: (a: number) => void;
    readonly chooser_new: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly chooser_set: (a: number, b: number, c: number) => void;
    readonly chooser_setTemperature: (a: number, b: number, c: number) => void;
    readonly chooser_update: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number, number];
    readonly chooser_why: (a: number) => [number, number];
    readonly cuelearner_associability: (a: number, b: number) => number;
    readonly cuelearner_cueIndex: (a: number, b: number, c: number) => number;
    readonly cuelearner_cues: (a: number) => [number, number];
    readonly cuelearner_decay: (a: number, b: number) => void;
    readonly cuelearner_ensure: (a: number, b: number, c: number) => number;
    readonly cuelearner_excitation: (a: number, b: number, c: number) => number;
    readonly cuelearner_inhibition: (a: number, b: number, c: number) => number;
    readonly cuelearner_markDone: (a: number, b: number, c: number) => void;
    readonly cuelearner_new: (a: number, b: number, c: number, d: number) => number;
    readonly cuelearner_offer: (a: number, b: number) => number;
    readonly cuelearner_offerTrick: (a: number, b: number, c: number) => void;
    readonly cuelearner_respond: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number];
    readonly cuelearner_reward: (a: number, b: number, c: number, d: number) => [number, number];
    readonly cuelearner_setAssociability: (a: number, b: number, c: number) => void;
    readonly cuelearner_setOffer: (a: number, b: number, c: number) => void;
    readonly cuelearner_setWeight: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly cuelearner_value: (a: number, b: number, c: number) => number;
    readonly drives_distance: (a: number, b: number, c: number) => number;
    readonly drives_grow: (a: number, b: number, c: number, d: number) => void;
    readonly drives_new: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly drives_rewardOf: (a: number, b: number, c: number, d: number) => number;
    readonly drives_setShape: (a: number, b: number, c: number, d: number) => void;
    readonly drives_setValues: (a: number, b: number, c: number) => void;
    readonly drives_values: (a: number) => [number, number];
    readonly goldenTrace: (a: number) => [number, number];
    readonly memorystream_add: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly memorystream_length: (a: number) => number;
    readonly memorystream_meta: (a: number) => [number, number];
    readonly memorystream_new: (a: number, b: number) => number;
    readonly memorystream_pendingImportance: (a: number) => number;
    readonly memorystream_retrieve: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly memorystream_shouldReflect: (a: number, b: number) => number;
    readonly memorystream_texts: (a: number) => [number, number];
    readonly sleep_fatigue: (a: number, b: number, c: number) => number;
    readonly sleep_hypnogram: (a: number) => [number, number];
    readonly sleep_lieDown: (a: number, b: number) => void;
    readonly sleep_new: (a: number, b: number, c: number, d: number) => number;
    readonly sleep_pressure: (a: number) => number;
    readonly sleep_pressureStep: (a: number, b: number, c: number) => void;
    readonly sleep_sample: (a: number) => void;
    readonly sleep_set_pressure: (a: number, b: number) => void;
    readonly sleep_sleepiness: (a: number, b: number) => number;
    readonly sleep_stage: (a: number) => number;
    readonly sleep_step: (a: number, b: number, c: number, d: number) => number;
    readonly sleep_wakeThreshold: (a: number) => number;
    readonly sleep_wakeUp: (a: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_alloc: () => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_drop_slice: (a: number, b: number) => void;
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

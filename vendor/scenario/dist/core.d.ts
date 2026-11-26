import type { Check } from "./report.js";
/**
 * Page code with `h` bound to the sim handle: a string (a statement body
 * for actions, an expression for `when` and probes) or a function of `h`.
 * In Node a function is sent to the page by its source, so it must not
 * close over anything.
 */
export type Code = string | ((h: any) => unknown);
/** Something a scenario does to the sim, at a sim time or once a page condition holds. */
export interface Action {
    /** sim seconds; or `when`, a page condition checked every `whenEvery` steps, fired once */
    at?: number;
    when?: Code;
    js: Code;
}
/** An expression read from the sim every `every` sim seconds and kept in the trace. */
export interface Probe {
    every: number;
    /** an expression returning JSON */
    js: Code;
}
/** A screenshot at a sim time, written to `path`, after optional code ran. */
export interface Shot {
    at: number;
    path: string;
    js?: Code;
}
/** What a run recorded: the sim rows, probes, fired conditions and the wall time. */
export interface Trace {
    rows: unknown[][];
    cols?: string[];
    hash?: string;
    probes: [number, unknown][];
    fired: [number, string][];
    wallSeconds: number;
}
/** What `trace()` on the sim returns. */
export interface SimTrace {
    rows: unknown[][];
    cols?: string[];
    hash?: string;
}
/** One scenario: a name, a seed, a length in sim seconds, actions, probes, shots and checks. */
export interface Scenario {
    name: string;
    seed: number;
    seconds: number;
    actions?: Action[];
    probes?: Probe[];
    shots?: Shot[];
    /** extra hash fields after `#test&seed=N`, such as `off=L.neural` */
    hash?: string;
    checks?: (t: Trace) => Check[];
}
/** One event per thing the runner did, in order, for a live view. */
export type ScenarioEvent = {
    type: "step";
    step: number;
    total: number;
    simSeconds: number;
} | {
    type: "action";
    step: number;
} | {
    type: "fired";
    step: number;
    when: string;
} | {
    type: "probe";
    step: number;
    value: unknown;
} | {
    type: "shot";
    step: number;
    path: string;
};
/** Options of a lockstep run: steps per second, chunk size, the page API, `when` checks and progress callbacks. */
export interface LockstepOptions {
    stepsPerSecond?: number;
    /** steps per call into the page (default 30) */
    chunk?: number;
    /** the page API expression (default `window.__sim`) */
    api?: string;
    /** what `h` is bound to in actions and probes (default the api) */
    handle?: string;
    /** steps between checks of `when` actions (default 15) */
    whenEvery?: number;
    onProgress?: (simSeconds: number, wallSeconds: number) => void;
    onEvent?: (e: ScenarioEvent) => void;
}
/** The side of a run that touches the sim. */
export interface Driver {
    /** runs an action body */
    act(code: Code): unknown;
    /** evaluates an expression or function and returns its value */
    read(code: Code): unknown;
    step(n: number): unknown;
    trace(): SimTrace | Promise<SimTrace>;
    /** renders and records a shot after its optional code ran */
    shot?(path: string): unknown;
}
/** The source text of page code, a string as it is or a function by its source. */
export declare const codeText: (c: Code) => string;
/** Steps a scenario through a driver; the scheduler both entries share. */
export declare function drive(d: Driver, sc: Scenario, o?: LockstepOptions): Promise<Trace>;
/** JSON with NaN and the infinities kept apart from null. */
export declare const exact: (v: unknown) => string;
/** The part of a trace two traces are compared on: rows and an optional hash. */
export type TraceLike = {
    rows: unknown[][];
    hash?: string | null;
};
/** First differing row between two traces, or null when identical. NaN, Infinity and null all differ. */
export declare function diffTraces(a: TraceLike, b: TraceLike): {
    row: number;
    a: unknown;
    b: unknown;
} | null;
/** One differing row of two traces, with the first differing column. */
export interface RowDifference {
    row: number;
    /** the first differing column, or -1 when a row is missing */
    col: number;
    a: unknown;
    b: unknown;
}
/** Every differing row up to `limit`, with the first differing column, for a diff view. */
export declare function diffRows(a: TraceLike, b: TraceLike, limit?: number): {
    compared: number;
    differing: number;
    rows: RowDifference[];
};
/** "trace differs at row 88: heading 0.41, expected 0.39", or "traces match". `b` is the expected trace. */
export declare function diffMessage(a: TraceLike & {
    cols?: string[] | null;
}, b: TraceLike): string;
/** FNV-1a 32 bit over the exact JSON of rows, probes and fired: the same in Node and every browser. */
export declare function traceHash(t: {
    rows: unknown[][];
    probes?: unknown[];
    fired?: unknown[];
}): string;

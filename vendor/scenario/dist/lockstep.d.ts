import type { Page } from "puppeteer-core";
import type { Check, Report } from "./report.js";
import type { Route } from "./routes.js";
export interface Action {
    /** sim seconds; or `when`, a page condition checked every `whenEvery` steps, fired once */
    at?: number;
    when?: string;
    js: string;
}
export interface Probe {
    every: number;
    /** an expression returning JSON */
    js: string;
}
export interface Shot {
    at: number;
    path: string;
    js?: string;
}
export interface Trace {
    rows: unknown[][];
    cols?: string[];
    hash?: string;
    probes: [number, unknown][];
    fired: [number, string][];
    wallSeconds: number;
}
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
}
/** Runs one scenario on an open page whose test API is ready. */
export declare function runLockstep(page: Page, sc: Scenario, o?: LockstepOptions): Promise<Trace>;
/** First differing row between two traces, or null when identical. NaN, Infinity and null all differ. */
export declare function diffTraces(a: {
    rows: unknown[][];
    hash?: string;
}, b: {
    rows: unknown[][];
    hash?: string;
}): {
    row: number;
    a: unknown;
    b: unknown;
} | null;
export interface SuiteOptions extends LockstepOptions {
    /** the built page */
    file: string;
    scenarios: Scenario[];
    mode: "record" | "compare" | "check";
    /** golden traces go to <goldenDir>/<name>.json */
    goldenDir?: string;
    routes?: Route[];
    offline?: boolean;
    width?: number;
    height?: number;
    /** parallel browsers (default 2) */
    jobs?: number;
    /** wait this long for the page API (default 240 s) */
    readyMs?: number;
    chrome?: string;
    date?: string;
}
/** Runs a scenario list, records or compares goldens, returns a report. */
export declare function runSuite(o: SuiteOptions): Promise<Report & {
    traces: Record<string, Trace>;
}>;

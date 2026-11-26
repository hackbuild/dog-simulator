import { type Driver, type LockstepOptions, type Scenario, type SimTrace, type Trace } from "./core.js";
import type { Check, Report, ScenarioResult } from "./report.js";
export * from "./core.js";
export * from "./metrics.js";
export * from "./profiler.js";
export * from "./report.js";
/** The sim contract: the same as `window.__sim` for the Node runner. */
export interface Sim {
    step(n: number): unknown;
    trace(): SimTrace | Promise<SimTrace>;
    render?(): unknown;
}
/** Options of a run in the page: the lockstep options, the handle actions see, yielding between chunks and a shot callback. */
export interface BrowserRunOptions extends Omit<LockstepOptions, "api" | "handle"> {
    /** what `h` is bound to in actions and probes (default the sim) */
    handle?: unknown;
    /** give the event loop a turn after each chunk so the page stays live (default true) */
    yield?: boolean;
    /** called after `render()` for each shot; capture the canvas here */
    onShot?: (path: string) => unknown;
}
/** A driver over a sim object in this page. */
export declare function simDriver(sim: Sim, o?: BrowserRunOptions): Driver;
/** Runs one scenario against a sim made with the scenario's seed. */
export declare function runScenario(sim: Sim, sc: Scenario, o?: BrowserRunOptions): Promise<Trace>;
/** A check in a scenario file: `js` is an expression of `t` (the trace) and `m` (the metrics) giving a number. */
export interface CheckSpec extends Omit<Check, "measured"> {
    js: string;
}
/** Measures a check spec against a trace; a throw or a non number reads as not run. */
export declare function measureCheck(spec: CheckSpec, t: Trace): Check;
/**
 * A scenario from JSON text or a parsed object: name, seed, seconds,
 * actions, probes, shots and check specs. Code fields are strings run with
 * `new Function`, so load only files you trust in this page.
 */
export declare function parseScenario(input: string | unknown): Scenario;
/** A trace or golden file from JSON text or an object: rows, and cols, hash, probes, fired when present. */
export declare function parseTrace(input: string | unknown): Trace;
/** Options of `runScenarios`: the scenarios, a sim maker per seed, goldens to compare and a result callback. */
export interface BrowserSuiteOptions extends BrowserRunOptions {
    scenarios: Scenario[];
    /** a fresh sim seeded for the scenario */
    makeSim: (seed: number, sc: Scenario) => Sim | Promise<Sim>;
    /** golden traces by scenario name; with them each result says identical, differs or missing */
    goldens?: Record<string, {
        rows: unknown[][];
        hash?: string | null;
    }>;
    /** the report's browser line (default the user agent) */
    browser?: string;
    date?: string;
    /** called as each scenario finishes */
    onResult?: (r: ScenarioResult, t: Trace | null) => void;
}
/** Runs scenarios one after another in this page and returns a report with the traces. */
export declare function runScenarios(o: BrowserSuiteOptions): Promise<Report & {
    traces: Record<string, Trace>;
}>;

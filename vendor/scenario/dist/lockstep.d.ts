import type { Page } from "puppeteer-core";
import { type Driver, type LockstepOptions, type Scenario, type Trace } from "./core.js";
import type { Report } from "./report.js";
import type { Route } from "./routes.js";
/** A driver over a puppeteer page whose test API is ready. */
export declare function pageDriver(page: Page, o?: LockstepOptions): Driver;
/** Runs one scenario on an open page whose test API is ready. */
export declare function runLockstep(page: Page, sc: Scenario, o?: LockstepOptions): Promise<Trace>;
/** Options of `runSuite`: the page file, the scenarios, the mode, goldens, routes, viewport and parallel browsers. */
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

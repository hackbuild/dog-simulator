import { type Browser, type Page } from "puppeteer-core";
import { type Route } from "./routes.js";
export declare const CHROME_MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
/** The first Chrome found, or null. `HB_CHROME` overrides. */
export declare function findChrome(): string | null;
export interface OpenOptions {
    /** a file path or URL */
    url: string;
    hash?: string;
    routes?: Route[];
    /** refuse every request that is not file:, data: or blob: (the self contained build check) */
    offline?: boolean;
    /** learned in earlier builds: 420 by 280 reaches about 20 fps under swiftshader */
    width?: number;
    height?: number;
    headless?: boolean;
    chrome?: string;
    args?: string[];
    /** "swiftshader" (default) for lockstep runs, "default" for real frame rate */
    gpu?: "swiftshader" | "default";
    timeoutMs?: number;
    /** runs before the page loads (install samplers, expose bindings) */
    beforeGoto?: (page: Page) => Promise<void>;
}
export interface PageLog {
    errors: string[];
    warnings: string[];
    blocked: string[];
    served: string[];
    version: string;
}
export interface Opened {
    browser: Browser;
    page: Page;
    log: PageLog;
    close(): Promise<void>;
}
export declare const DEFAULT_ARGS: string[];
/**
 * Software GL, the same on every machine; for lockstep runs. Under these
 * flags headless Chrome 150 on macOS 12 ran 0 to 1 animation frames per
 * second (measured 2026-11-22), so real frame rate runs use `gpu: "default"`.
 */
export declare const SWIFTSHADER_ARGS: string[];
export declare function open(o: OpenOptions): Promise<Opened>;
/** Polls a page condition until it is truthy or the time runs out (null). */
export declare function waitFor<T>(page: Page, expr: string, timeoutMs: number, everyMs?: number): Promise<T | null>;

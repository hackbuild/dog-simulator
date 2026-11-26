import type { Page } from "puppeteer-core";
import { type Stats } from "./metrics.js";
/** Installs the sampler on every new document of the page. Call before goto. */
export declare function installRafSampler(page: Page): Promise<void>;
/** What `readRaf` returns: frame intervals in ms, the per frame samples and their stats. */
export interface RafReading<T = unknown> {
    frames: number[];
    samples: T[];
    stats: Stats;
    error?: string;
}
/** Reads and clears what the sampler has recorded. */
export declare function readRaf<T = unknown>(page: Page): Promise<RafReading<T>>;

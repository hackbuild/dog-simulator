export interface Check {
    /** what was checked, lowercase: "foot slide", "stall" */
    what: string;
    /** the measured value, or null when the check did not run */
    measured: number | null;
    unit?: string;
    /** the legal range, either bound may be open */
    legal: {
        min?: number;
        max?: number;
    };
    /** what sets the bound: "set by the stall detector, 0.2 m in 2 s" */
    constraint: string;
    fix?: string;
    /** where the number comes from (RULES: measured, computed, inferred) */
    kind?: "measured" | "computed" | "inferred";
    /** a check that may not run without failing the report (it still prints as not run) */
    optional?: boolean;
}
export type Verdict = "pass" | "fail" | "not run";
export declare function verdict(c: Check): Verdict;
/** One line: "stall 4.75 s, legal at most 1 s, set by the passing rule. fix: ..." */
export declare function checkMessage(c: Check): string;
export interface ScenarioResult {
    name: string;
    seed: number;
    checks: Check[];
    golden?: "identical" | "differs" | "missing" | "recorded";
    firstDifference?: unknown;
    errors: string[];
    blocked: string[];
}
export interface Report {
    date: string;
    chrome: string;
    results: ScenarioResult[];
}
/** Text report: a line per scenario, then a check message per check. Fails first. */
export declare function formatReport(r: Report): string;
/**
 * True when nothing failed, every check that is not `optional` ran, no
 * page error, no blocked request, and every golden matched. A check that
 * did not run is never a pass.
 */
export declare function reportPasses(r: Report): boolean;

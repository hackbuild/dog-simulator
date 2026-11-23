export interface ProfileEntry {
    total: number;
    max: number;
    n: number;
}
export interface Profiler {
    /** starts timing the next system */
    begin(): void;
    /** charges the time since the last begin or mark to `label` */
    mark(label: string): void;
    /** average and worst ms per label, worst first */
    report(): {
        label: string;
        avg: number;
        max: number;
        n: number;
    }[];
    reset(): void;
    entries: Record<string, ProfileEntry>;
}
export declare function createProfiler(clock: () => number): Profiler;

/** What the view draws. Built from @hackbuild/drives with `drivesBarsState`, or by hand. */
export interface DrivesBarsState {
    /** what it is doing now */
    behavior: string;
    /** seconds in it */
    seconds?: number;
    /** why it is doing it, one line */
    why?: string;
    /** how it chooses, the utility head's right end: sampled or argmax */
    mode?: string;
    /** what each act is worth now; any scale, drawn against the largest (at least 1) */
    utilities: Record<string, number>;
    /** the act drawn pink; defaults to `behavior` */
    current?: string;
    /** need per drive, 0 to 1 */
    drives: Record<string, number>;
    /** drive rows drawn pink, such as prey and bond */
    pink?: readonly string[];
    /** a switch that is on its way */
    pending?: {
        id: string;
        inMs: number;
    } | null;
}
/** The parts of a @hackbuild/drives Chooser decision the view reads. */
export interface DecisionLike {
    current: string;
    reason: string;
    why: string;
    utilities: Record<string, number>;
    pending: {
        id: string;
        at: number;
        latency: number;
    } | null;
}
/** Drives values, or a @hackbuild/drives Drives object. */
export type DrivesLike = Record<string, number> | {
    readonly values: Record<string, number>;
};
/** Options of `drivesBarsState`: the clock, the seconds in the act and names of your own. */
export interface DrivesBarsFrom {
    /** sim seconds now, for the pending switch */
    now?: number;
    /** seconds in the current act */
    seconds?: number;
    /** false when the chooser runs argmax */
    sampled?: boolean;
    /** a longer name than the act id, as "fetch / chase" */
    behavior?: string;
    /** a why of your own in place of the decision's */
    why?: string;
    /** drive rows drawn pink */
    pink?: readonly string[];
}
/** Builds the view state from a Chooser decision and the drives. */
export declare function drivesBarsState(d: DecisionLike, drives: DrivesLike, o?: DrivesBarsFrom): DrivesBarsState;
/** Options of `drivesBars`. */
export interface DrivesBarsOptions {
    /** the note under the utility rows while no switch is pending */
    note?: string;
}
/** What `drivesBars` returns: the host, an update and a dispose. */
export interface DrivesBarsHandle {
    /** the host element */
    readonly root: HTMLElement;
    /** draws a new state; rows rebuild only when the keys change */
    update(state: DrivesBarsState): void;
    /** empties the host */
    dispose(): void;
}
/** The note under the utility rows while no switch is pending. */
export declare const DRIVES_NOTE = "each act scores by how much it would ease what it needs. it usually picks the best one and sticks with what it is doing.";
/** Renders the behavior, utility and drives panels into `host`. */
export declare function drivesBars(host: HTMLElement, o?: DrivesBarsOptions): DrivesBarsHandle;

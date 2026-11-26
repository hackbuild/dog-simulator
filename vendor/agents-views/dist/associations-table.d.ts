/** One cue row of the table. */
export interface AssociationsRow {
    /** the cue, as a word or `gesture:name` */
    cue: string;
    /** net strength per action, 0 to 1, in the order of `actions` */
    values: number[];
    /** how much it still pays attention to the cue, 0 to 1 */
    attention: number;
}
/** What the table draws. Built from a CueLearner with `associationsState`, or by hand. */
export interface AssociationsState {
    /** the act columns */
    actions: string[];
    /** newest last; the table shows the last 16 */
    cues: AssociationsRow[];
    /** the cell of the last reward, outlined */
    last?: {
        cue: string;
        action: string;
    } | null;
    /** one line on the last trial */
    trial?: string;
}
/** The @hackbuild/drives LearnerState shape (CueLearner.toJSON()). */
export interface LearnerStateLike {
    cues: Record<string, {
        w: Record<string, number>;
        n: Record<string, number>;
        associability: number;
    }>;
}
/** A @hackbuild/drives CueLearner, or anything with its actions and toJSON. */
export interface LearnerLike {
    readonly actions: readonly string[];
    toJSON(): LearnerStateLike;
}
/** Builds the table from a CueLearner: net strength is excitation minus inhibition. */
export declare function associationsState(learner: LearnerLike, o?: {
    last?: {
        cue: string;
        action: string;
    } | null;
    trial?: string;
}): AssociationsState;
/** Options of `associationsTable`. */
export interface AssociationsOptions {
    /** reset learning was pressed */
    onReset?: () => void;
    /** the explanation under the table; `ASSOCIATIONS_NOTE` by default */
    note?: string;
    /** rows shown, newest last (default 16) */
    limit?: number;
}
/** What `associationsTable` returns: the host, an update and a dispose. */
export interface AssociationsHandle {
    /** the host element */
    readonly root: HTMLElement;
    /** draws a new state */
    update(state: AssociationsState): void;
    /** empties the host */
    dispose(): void;
}
/** The explanation under the table: how net strength, attention and delayed credit work. */
export declare const ASSOCIATIONS_NOTE = "rows are cues, columns are acts. cells show net strength, excitation minus a separate inhibition that fades faster, so an extinguished cue partly comes back after a break. the attn column is each cue's associability: it rises after surprises and falls as the outcome becomes predictable. credit fades with delay, so a slow treat can reward whatever it is doing when it lands. if nothing is strong it offers tricks it was rewarded for before; teach a new word by praising whatever it does.";
/** Renders the associations panel into `host`. */
export declare function associationsTable(host: HTMLElement, o?: AssociationsOptions): AssociationsHandle;

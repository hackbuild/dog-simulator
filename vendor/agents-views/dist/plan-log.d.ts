/** One step as the log shows it. */
export interface StepLine {
    /** ms since epoch */
    t: number;
    line: string;
    ok: boolean;
}
/** A thought it had with no order: a mutter, or a reflection on what it attends to. */
export interface ThoughtLine {
    t: number;
    kind: string;
    line: string;
}
/** What PlanLog draws. Built with `planBook`, or by hand. */
export interface PlanLogState {
    /** the last plan in one line, "" for none */
    plan: string;
    /** who made it: rules, reused, model */
    via: string;
    goals: readonly string[];
    thoughts: readonly ThoughtLine[];
    steps: readonly StepLine[];
}
/** The parts of a @hackbuild/agent event the book reads. */
export type PlanEventLike = {
    type: "plan";
    via: string;
    plan: {
        think?: string;
        do: readonly {
            tool: string;
            args: readonly unknown[];
        }[];
    };
} | {
    type: "step";
    result: {
        ok: boolean;
        text: string;
        step: {
            tool: string;
            args: readonly unknown[];
        };
    };
} | {
    type: string;
};
/** The book behind PlanLog and StepLog: push agent events, thoughts and goals; read `state()`. */
export interface PlanBook {
    /** Takes a plan or a step event; true when the state changed. */
    push(e: PlanEventLike): boolean;
    think(kind: string, line: string): void;
    setGoals(lines: readonly string[]): void;
    state(): PlanLogState;
    clear(): void;
}
/** A plan book keeping at most `max` steps and thoughts (default 200). */
export declare function planBook(o?: {
    max?: number;
    now?: () => number;
}): PlanBook;
/** What `stepLog` and `planLog` return. */
export interface LogHandle<S> {
    update(state: S): void;
    dispose(): void;
}
/** The step log: one rack log row per tool call. */
export declare function stepLog(host: HTMLElement, o?: {
    empty?: string;
    label?: string;
}): LogHandle<readonly StepLine[]>;
/** The plan log: last plan with who made it, goals, thoughts, and the step log under them. */
export declare function planLog(host: HTMLElement, o?: {
    steps?: boolean;
    empty?: string;
}): LogHandle<PlanLogState>;

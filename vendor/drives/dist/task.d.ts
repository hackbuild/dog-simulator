/** A completion flag bound to the goal it was raised for. */
export declare class Completion<G = string> {
    private goal;
    private done;
    private started;
    /**
     * A new goal: the flag resets. The same goal again while it is in
     * progress changes nothing; the same goal after it was done starts it
     * anew (walking to the bench a second time). Returns true when a task
     * started.
     */
    begin(goal: G, now: number): boolean;
    /** Marks done only for the goal that is current; a late report for an old goal is dropped. */
    report(goal: G): boolean;
    isDone(goal: G): boolean;
    get current(): G | null;
    elapsed(now: number): number;
}
export interface SettleCheck {
    /** remaining error, for a turn the heading error in rad */
    error: number;
    /** current rate, for a turn the angular speed in rad/s */
    rate: number;
    /** seconds since the step began */
    elapsed: number;
    /** give up after this many seconds (default 3) */
    timeout?: number;
    /** defaults from earlier builds: 0.12 rad and 0.4 rad/s */
    maxError?: number;
    maxRate?: number;
}
/** Checks the real condition with a timeout, in place of a flag. */
export declare function settled(c: SettleCheck): {
    done: boolean;
    timedOut: boolean;
};
/**
 * Blocking layers (seated, crouched, holding). A task declares the layers
 * it needs; starting it releases every held layer it does not need, and
 * reports which, so the body can stand up or put things down first.
 */
export declare class LayerGate<L extends string> {
    private held;
    private task;
    private needs;
    hold(layer: L): void;
    release(layer: L): void;
    holding(layer: L): boolean;
    get layers(): L[];
    get currentTask(): string | null;
    /** Starts a task; returns the layers released, in the order they were held. */
    startTask(name: string, needs?: readonly L[]): L[];
    /** Layers the current task needs and does not hold yet. */
    missing(): L[];
}

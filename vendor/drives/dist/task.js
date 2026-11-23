// Task gating, from the HACKLE lessons: completion flags go stale when a
// step reads a flag left over from the previous goal (the human sat
// backwards because the turn step read motor.done from the walk), and a
// task started while a blocking layer was held froze the body (seated,
// crouched, holding). These helpers make both mistakes hard to write.
/** A completion flag bound to the goal it was raised for. */
export class Completion {
    goal = null;
    done = false;
    started = 0;
    /** A new goal: the flag resets. Returns true when the goal changed. */
    begin(goal, now) {
        if (this.goal === goal)
            return false;
        this.goal = goal;
        this.done = false;
        this.started = now;
        return true;
    }
    /** Marks done only for the goal that is current; a late report for an old goal is dropped. */
    report(goal) {
        if (this.goal !== goal)
            return false;
        this.done = true;
        return true;
    }
    isDone(goal) {
        return this.goal === goal && this.done;
    }
    get current() {
        return this.goal;
    }
    elapsed(now) {
        return now - this.started;
    }
}
/** Checks the real condition with a timeout, in place of a flag. */
export function settled(c) {
    const ok = Math.abs(c.error) < (c.maxError ?? 0.12) && Math.abs(c.rate) < (c.maxRate ?? 0.4);
    const timedOut = !ok && c.elapsed > (c.timeout ?? 3);
    return { done: ok || timedOut, timedOut };
}
/**
 * Blocking layers (seated, crouched, holding). A task declares the layers
 * it needs; starting it releases every held layer it does not need, and
 * reports which, so the body can stand up or put things down first.
 */
export class LayerGate {
    held = new Set();
    task = null;
    needs = new Set();
    hold(layer) {
        this.held.add(layer);
    }
    release(layer) {
        this.held.delete(layer);
    }
    holding(layer) {
        return this.held.has(layer);
    }
    get layers() {
        return [...this.held];
    }
    get currentTask() {
        return this.task;
    }
    /** Starts a task; returns the layers released, in the order they were held. */
    startTask(name, needs = []) {
        this.task = name;
        this.needs = new Set(needs);
        const released = [...this.held].filter((l) => !this.needs.has(l));
        for (const l of released)
            this.held.delete(l);
        return released;
    }
    /** Layers the current task needs and does not hold yet. */
    missing() {
        return [...this.needs].filter((l) => !this.held.has(l));
    }
}

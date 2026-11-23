// Scheduling heavy inference, from the HACKLE lessons: GPU contention is
// invisible to JS profiling, so a model call runs only after a minimum
// interval, optionally only while the agent is idle, and only while recent
// frames are inside a budget; one call at a time, with a busy state the UI
// can show.
export class InferenceScheduler {
    opts;
    lastStart = Number.NEGATIVE_INFINITY;
    running = false;
    frameMs = 0;
    frames = 0;
    lastMs = 0;
    calls = 0;
    skipped = 0;
    constructor(opts) {
        this.opts = opts;
    }
    /** Feeds one frame time in ms. */
    frame(ms) {
        const a = this.opts.smoothing ?? 0.1;
        this.frameMs = this.frames++ === 0 ? ms : this.frameMs + (ms - this.frameMs) * a;
    }
    get smoothedFrameMs() {
        return this.frameMs;
    }
    get busy() {
        return this.running;
    }
    state(now, idle = true) {
        if (this.running)
            return "busy";
        if (now - this.lastStart < this.opts.minInterval)
            return "cooling down";
        if (this.opts.idleOnly && !idle)
            return "waiting for idle";
        if (this.opts.frameBudgetMs !== undefined && this.frames > 0 && this.frameMs > this.opts.frameBudgetMs)
            return "over frame budget";
        return "ready";
    }
    /**
     * Runs `fn` when the state is ready; otherwise returns null without
     * calling it. `clock` measures the call in ms (inject performance.now).
     */
    async run(now, idle, fn, clock = () => 0) {
        if (this.state(now, idle) !== "ready") {
            this.skipped++;
            return null;
        }
        this.running = true;
        this.lastStart = now;
        const t0 = clock();
        try {
            return await fn();
        }
        finally {
            this.lastMs = clock() - t0;
            this.calls++;
            this.running = false;
        }
    }
}

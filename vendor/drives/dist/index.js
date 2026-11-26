// @hackbuild/drives: homeostatic drives, sampled behaviour choice with a
// why, cue learning, sleep and a memory stream. The cores run in wasm
// after load(); task gating and inference scheduling are plain TypeScript
// (./task.ts, ./schedule.ts). Every class that draws random numbers takes
// an injected Rng and seeds its wasm stream from it.
import { assertReady, loadWasm, loadWasmSync } from "./load.js";
import * as w from "./wasm/drives.js";
export * from "./clock.js";
export * from "./schedule.js";
export * from "./task.js";
/** Mulberry32, the same stream as the Rust `Mulberry32`. */
export function seededRng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a) >>> 0;
        t = ((t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t) >>> 0;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
/** A 32 bit seed for a wasm stream, drawn from an injected `Rng`. */
export const seedFrom = (rng) => Math.floor(rng() * 4294967296) >>> 0;
const PKG = "@hackbuild/drives";
const opt = (v) => (v === undefined ? Number.NaN : typeof v === "boolean" ? (v ? 1 : 0) : v);
/** Loads the wasm core once; call and await it before any class. Pass a URL, a Response, bytes or a compiled module, or nothing to decode the inlined copy. */
export async function load(source) {
    await loadWasm(source);
}
/** Loads the wasm core synchronously from bytes or a compiled module. */
export function loadSync(source) {
    loadWasmSync(source);
}
/** A fixed trace of 175 core values for one seed, used to check that two builds of the core agree bit for bit. */
export function goldenTrace(seed) {
    assertReady(PKG);
    return w.goldenTrace(seed);
}
/** Sleepiness from the body clock at an hour 0 to 24 (peaks of activity near 7 and 19). */
export function bodyClock(hour) {
    assertReady(PKG);
    return w.bodyClock(hour);
}
/** Drive reduction reward over named deficits (Keramati and Gutkin 2011). */
export class Drives {
    inner;
    keys;
    constructor(weights, opts = {}) {
        assertReady(PKG);
        this.keys = Object.keys(weights);
        this.inner = new w.Drives(Float64Array.from(this.keys.map((k) => weights[k])), opts.n ?? 3, opts.m ?? 4, opts.gain ?? 2.4);
    }
    vec(p, base) {
        return Float64Array.from(this.keys.map((k, i) => p[k] ?? (base ? base[i] : 0)));
    }
    get values() {
        const v = this.inner.values();
        return Object.fromEntries(this.keys.map((k, i) => [k, v[i]]));
    }
    set(values) {
        this.inner.setValues(this.vec(values, this.inner.values()));
    }
    /** The drive of a state, or of the current one. */
    distance(state) {
        return this.inner.distance(state ? this.vec(state, this.inner.values()) : this.inner.values());
    }
    /** Reward of an act with this expected effect; reductions scaled by `scale`. */
    rewardOf(effect, scale = 1) {
        return this.inner.rewardOf(this.vec(effect), scale);
    }
    grow(dt, rates) {
        this.inner.grow(dt, this.vec(rates));
    }
    setShape(n, m, gain) {
        this.inner.setShape(n, m, gain);
    }
    /** Frees the wasm memory now, before the garbage collector would; the object is unusable after. */
    free() {
        this.inner.free();
    }
}
const REASONS = ["hold", "top", "sampled", "reactive", "forced", "argmax", "fired"];
/** Softmax with commitment and reactive latencies; every decision has a why. */
export class Chooser {
    inner;
    options;
    index;
    u;
    r;
    constructor(o) {
        assertReady(PKG);
        this.options = o.options;
        this.index = new Map(o.options.map((b, i) => [b, i]));
        const start = o.start === undefined ? 0 : (this.index.get(o.start) ?? -1);
        if (start < 0)
            throw new Error(`${PKG}: start option ${String(o.start)} is not in the list`);
        this.inner = new w.Chooser([...o.options], Float64Array.from([o.temperature, o.commitment, o.dwellMu, o.dwellTau, o.reactMu, o.reactTau, o.reactMargin, o.sample, o.noise].map(opt)), seedFrom(o.rng), start);
        this.u = new Float64Array(o.options.length);
        this.r = new Uint8Array(o.options.length);
    }
    get current() {
        return this.options[this.inner.current];
    }
    /** The executor reports the current act finished. */
    markDone() {
        this.inner.markDone();
    }
    get done() {
        return this.inner.isDone;
    }
    /** Switches now (a cue, a command); the done flag resets and a new dwell is drawn. */
    set(id, now) {
        this.inner.set(this.need(id), now);
    }
    need(id) {
        const i = this.index.get(id);
        if (i === undefined)
            throw new Error(`${PKG}: no option named ${String(id)}`);
        return i;
    }
    /** One update. Options missing from `utilities` score 0. */
    update(now, utilities, reactive = [], forced) {
        this.u.fill(0);
        this.r.fill(0);
        for (const [k, v] of Object.entries(utilities)) {
            const i = this.index.get(k);
            if (i !== undefined)
                this.u[i] = Number.isFinite(v) ? Math.max(0, v) : 0;
        }
        for (const k of reactive)
            this.r[this.need(k)] = 1;
        const d = this.inner.update(now, this.u, this.r, forced === undefined ? -1 : this.need(forced));
        const g = (i) => d[i];
        const name = (i) => this.options[i];
        return {
            current: name(g(0)),
            switched: g(1) === 1,
            pending: g(2) >= 0 ? { id: name(g(2)), at: g(3), latency: g(10) } : null,
            reason: REASONS[g(4)],
            id: name(g(5)),
            utility: g(6),
            best: name(g(7)),
            bestUtility: g(8),
            probability: g(9),
            why: this.inner.why,
            utilities: Object.fromEntries(this.options.map((b, i) => [b, this.u[i]])),
        };
    }
    get dwellUntil() {
        return this.inner.dwellUntil;
    }
    setTemperature(t, commitment) {
        this.inner.setTemperature(t, commitment);
    }
    /** Frees the wasm memory now, before the garbage collector would; the object is unusable after. */
    free() {
        this.inner.free();
    }
}
/** Cue learning with associability, eligibility traces and decaying inhibition. */
export class CueLearner {
    inner;
    actions;
    index;
    constructor(o) {
        assertReady(PKG);
        this.actions = o.actions;
        this.index = new Map(o.actions.map((a, i) => [a, i]));
        this.inner = new w.CueLearner(o.actions.length, Float64Array.from([o.alpha, o.theta, o.traceSeconds, o.inhibitionDecay, o.offerRate, o.ignore, o.cueMu, o.cueTau, o.noise].map(opt)), seedFrom(o.rng));
    }
    need(a) {
        const i = this.index.get(a);
        if (i === undefined)
            throw new Error(`${PKG}: no action named ${String(a)}`);
        return i;
    }
    respond(cue, now, o = {}) {
        const off = new Uint8Array(this.actions.length);
        if (o.offerable)
            for (const a of o.offerable)
                off[this.need(a)] = 1;
        else
            off.fill(1);
        const r = this.inner.respond(cue, now, o.distraction ?? 0, o.trainability ?? 0, o.watched ?? true, off);
        const g = (i) => r[i];
        if (g(0) === 0)
            return { kind: "ignored", latency: g(3) };
        if (g(0) === 1)
            return { kind: "none", latency: g(3) };
        return { kind: "act", action: this.actions[g(1)], offered: g(2) === 1, latency: g(3) };
    }
    markDone(action, now) {
        this.inner.markDone(this.need(action), now);
    }
    offerTrick(action, now) {
        this.inner.offerTrick(this.need(action), now);
    }
    reward(r, now, trainability = 0) {
        const x = this.inner.reward(r, now, trainability);
        if (!x.length)
            return null;
        const cues = this.inner.cues();
        const c = x[0];
        return { cue: c >= 0 ? (cues[c] ?? null) : null, action: this.actions[x[1]], value: x[2], credit: x[3] };
    }
    decay(dt) {
        this.inner.decay(dt);
    }
    value(cue, action) {
        const c = this.inner.cueIndex(cue);
        return c < 0 ? 0 : this.inner.value(c, this.need(action));
    }
    /** Sets a prior: excitation `w` for a cue and action. */
    prior(cue, action, wgt) {
        const c = this.inner.ensure(cue);
        const a = this.need(action);
        this.inner.setWeight(c, a, wgt, this.inner.inhibition(c, a));
    }
    setOffer(action, v) {
        this.inner.setOffer(this.need(action), v);
    }
    toJSON() {
        const cues = {};
        this.inner.cues().forEach((name, c) => {
            const wv = {};
            const nv = {};
            this.actions.forEach((a, i) => {
                wv[a] = this.inner.excitation(c, i);
                nv[a] = this.inner.inhibition(c, i);
            });
            cues[name] = { w: wv, n: nv, associability: this.inner.associability(c) };
        });
        const offer = Object.fromEntries(this.actions.map((a, i) => [a, this.inner.offer(i)]));
        return { ver: 1, cues, offer };
    }
    load(s) {
        if (s.ver !== 1)
            throw new Error(`${PKG}: learner state version ${String(s.ver)} is not 1`);
        for (const [name, row] of Object.entries(s.cues)) {
            const c = this.inner.ensure(name);
            this.actions.forEach((a, i) => this.inner.setWeight(c, i, row.w[a] ?? 0, row.n[a] ?? 0));
            this.inner.setAssociability(c, row.associability);
        }
        this.actions.forEach((a, i) => this.inner.setOffer(i, s.offer[a] ?? 0.15));
    }
    /** Frees the wasm memory now, before the garbage collector would; the object is unusable after. */
    free() {
        this.inner.free();
    }
}
const STAGES = ["awake", "onset", "nrem", "rem", "wake"];
/** Sleep pressure, body clock and the stage machine of one sleep. */
export class Sleep {
    inner;
    constructor(o) {
        assertReady(PKG);
        this.inner = new w.Sleep(Float64Array.from([o.up, o.down, o.nrem, o.rem, o.wake, o.enough].map(opt)), o.pressure ?? 0.25, seedFrom(o.rng));
    }
    get pressure() {
        return this.inner.pressure;
    }
    set pressure(p) {
        this.inner.pressure = p;
    }
    get stage() {
        return STAGES[this.inner.stage];
    }
    pressureStep(gameHours, activity = 1) {
        this.inner.pressureStep(gameHours, activity);
    }
    sleepiness(hour) {
        return this.inner.sleepiness(hour);
    }
    fatigue(hour, running = false) {
        return this.inner.fatigue(hour, running);
    }
    lieDown(negative = false) {
        this.inner.lieDown(negative);
    }
    wakeUp() {
        this.inner.wakeUp();
    }
    /** Returns true when the sleep ended on its own. */
    step(gameMinutes, hour, negative = false) {
        return this.inner.step(gameMinutes, hour, negative);
    }
    sample() {
        this.inner.sample();
    }
    hypnogram() {
        return Array.from(this.inner.hypnogram(), (i) => STAGES[i]);
    }
    wakeThreshold() {
        return this.inner.wakeThreshold();
    }
    /** Frees the wasm memory now, before the garbage collector would; the object is unusable after. */
    free() {
        this.inner.free();
    }
}
/** Memories ranked by recency, importance and relevance (Park et al. 2023). */
export class MemoryStream {
    inner;
    constructor(o = {}) {
        assertReady(PKG);
        this.inner = new w.MemoryStream(o.capacity ?? 60, o.decay ?? Number.NaN);
    }
    add(text, importance, hour) {
        this.inner.add(text, importance, hour);
    }
    retrieve(hour, cues, k) {
        const t = this.inner.texts();
        return Array.from(this.inner.retrieve(hour, cues, k), (i) => t[i]);
    }
    get pendingImportance() {
        return this.inner.pendingImportance;
    }
    /** True once summed importance reaches the budget; resets the sum. */
    shouldReflect(budget) {
        return this.inner.shouldReflect(budget);
    }
    get length() {
        return this.inner.length;
    }
    /** Frees the wasm memory now, before the garbage collector would; the object is unusable after. */
    free() {
        this.inner.free();
    }
}
/**
 * A goal set by a slow deliberation (a language model, a planner): adds a
 * bonus to one option's utility until it expires. Model agnostic.
 */
export class GoalBoost {
    bonus;
    goal = null;
    constructor(bonus = 0.35) {
        this.bonus = bonus;
    }
    set(id, now, seconds, why) {
        this.goal = { id, until: now + seconds, why };
    }
    current(now) {
        if (this.goal && this.goal.until < now)
            this.goal = null;
        return this.goal;
    }
    apply(now, u) {
        const g = this.current(now);
        if (g && u[g.id] !== undefined)
            u[g.id] = u[g.id] + this.bonus;
        return u;
    }
}

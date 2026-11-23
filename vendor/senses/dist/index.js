// @hackbuild/senses: perception for simulated animals. The heavy parts run
// in wasm after load(); scalar helpers are plain TypeScript (./scalar.ts).
// Every class that draws random numbers takes an injected Rng and seeds its
// wasm stream from it, so a seeded run replays.
import { assertReady, loadWasm, loadWasmSync } from "./load.js";
import { seedFrom } from "./scalar.js";
import * as w from "./wasm/senses.js";
export * from "./scalar.js";
const PKG = "@hackbuild/senses";
/** Loads the wasm. With no argument the inlined copy is used (works from file://). */
export async function load(source) {
    await loadWasm(source);
}
/** Loads the wasm synchronously from bytes or a compiled module. */
export function loadSync(source) {
    loadWasmSync(source);
}
/** The golden scenario run in wasm, for the native and wasm agreement test. */
export function goldenTrace(seed) {
    assertReady(PKG);
    return w.goldenTrace(seed);
}
const opt = (v) => (v === undefined ? Number.NaN : v);
/** A camera at a point looking along yaw (0 is +Z) and pitch (up positive). */
export function cameraLook(pos, yaw, pitch, fov, aspect, near = 0.05, far = 100) {
    assertReady(PKG);
    return w.cameraLook(pos.x, pos.y, pos.z, yaw, pitch, fov, aspect, near, far);
}
/** Itti Koch saliency with top down bias and world space inhibition of return. */
export class Saliency {
    inner;
    constructor(o) {
        assertReady(PKG);
        const c = o.channels ?? {};
        this.inner = new w.Saliency(Float64Array.from([o.width, o.height, o.gain, o.threshold, o.fixationMedian, o.iorSeconds, o.snapAngle, o.groundY, c.intensity, c.blueYellow, c.edges, c.motion].map(opt)), seedFrom(o.rng));
    }
    get mapWidth() {
        return this.inner.mapWidth;
    }
    get mapHeight() {
        return this.inner.mapHeight;
    }
    /** RGBA frame, row 0 at the top. Returns the map (mapWidth by mapHeight). */
    update(frame, width, height, now, camera) {
        const f = frame instanceof Uint8Array ? frame : new Uint8Array(frame.buffer, frame.byteOffset, frame.byteLength);
        return this.inner.update(f, width, height, now, camera);
    }
    map() {
        return this.inner.map();
    }
    /** Top down bias for the next update: `weight * exp(-d^2 / 6)` around the point's projection. */
    biasPoint(p, weight) {
        this.inner.biasPoint(p.x, p.y, p.z, weight);
    }
    biasUv(u, v, weight) {
        this.inner.biasUv(u, v, weight);
    }
    inhibit(dir, until) {
        this.inner.inhibit(dir.x, dir.y, dir.z, until);
    }
    get inhibited() {
        return this.inner.inhibited();
    }
    ready(now) {
        return this.inner.ready(now);
    }
    winner() {
        const r = this.inner.winner();
        return r.length ? { index: r[0], value: r[1] } : null;
    }
    shift(now, camera, objects, arousal) {
        const p = new Float64Array(objects.length * 3);
        objects.forEach((o, i) => p.set([o.x, o.y, o.z], i * 3));
        const r = this.inner.shift(now, camera, p, arousal);
        if (!r.length)
            return null;
        const g = (i) => r[i];
        return { x: g(0), y: g(1), value: g(2), point: { x: g(3), y: g(4), z: g(5) }, object: g(6) };
    }
    free() {
        this.inner.free();
    }
}
/** Looming detector keyed by small integer ids; `observe` returns the tau of a startle or null. */
export class Looming {
    inner;
    constructor(o = {}) {
        assertReady(PKG);
        this.inner = new w.Loom(o.tau ?? 0.6, o.minAngle ?? 0.04, o.maxGap ?? 0.3, o.refractory ?? 2.5);
    }
    observe(id, size, dist, now) {
        const t = this.inner.observe(id, size, dist, now);
        return Number.isNaN(t) ? null : t;
    }
    forget(id) {
        this.inner.forget(id);
    }
    /** Frees the wasm memory now, before the garbage collector would; the object is unusable after. */
    free() {
        this.inner.free();
    }
}
/** Puff plume in a meandering wind plus a ground trail grid. */
export class OdourField {
    inner;
    buf = new Float64Array(0);
    constructor(o) {
        assertReady(PKG);
        this.inner = new w.OdourField(Float64Array.from([o.size, o.cells, o.maxPuffs, o.puffLife, o.bounds, o.puffRate, o.wind, o.meander, o.windHeading].map(opt)), seedFrom(o.rng));
    }
    setWind(speed, meander) {
        this.inner.setWind(speed, meander);
    }
    setPuffRate(rate) {
        this.inner.setPuffRate(rate);
    }
    step(dt, sources) {
        if (this.buf.length !== sources.length * 4)
            this.buf = new Float64Array(sources.length * 4);
        sources.forEach((s, i) => this.buf.set([s.id, s.x, s.z, s.strength], i * 4));
        this.inner.step(dt, this.buf);
    }
    clearPuffs() {
        this.inner.clearPuffs();
    }
    concentration(x, z) {
        return this.inner.concentration(x, z);
    }
    puffConcentration(x, z) {
        return this.inner.puffConcentration(x, z);
    }
    groundConcentration(x, z) {
        return this.inner.groundConcentration(x, z);
    }
    deposit(x, z, amount, now) {
        this.inner.deposit(x, z, amount, now);
    }
    /** Fades the trail by `elapsed / halflife` halvings. */
    decayTrail(elapsed, halflife) {
        this.inner.decayTrail(elapsed, halflife);
    }
    trailDirection(x, z, prev) {
        const r = this.inner.trailDirection(x, z, prev?.x ?? Number.NaN, prev?.z ?? Number.NaN);
        return r.length ? { x: r[0], z: r[1] } : null;
    }
    /** x, z, age, mass per puff */
    puffs() {
        return this.inner.puffs();
    }
    get puffCount() {
        return this.inner.puffCount;
    }
    wind() {
        const r = this.inner.wind();
        return { x: r[0], z: r[1] };
    }
    trail() {
        return this.inner.trail();
    }
    free() {
        this.inner.free();
    }
}
/** Two nostril sniffing in bouts (Craven 2010; Thesen 1993: 6 Hz while tracking). */
export class Sniffer {
    inner;
    constructor(o) {
        assertReady(PKG);
        this.inner = new w.Sniffer(o.sniffHz ?? 6, o.boutHz ?? 1, seedFrom(o.rng));
    }
    /** Returns true when a sniff was taken. `side` is the offset to the left nostril. */
    tick(field, dt, now, active, nose, side) {
        return this.inner.tick(field.inner, dt, now, active, nose.x, nose.z, side.x, side.z);
    }
    whiff(now, window = 0.9) {
        return this.inner.whiff(now, window);
    }
    state() {
        const s = this.inner.state();
        const g = (i) => s[i];
        return { left: g(0), right: g(1), conc: g(2), mean: g(3), whiffT: g(4) };
    }
    /** Frees the wasm memory now, before the garbage collector would; the object is unusable after. */
    free() {
        this.inner.free();
    }
}
const MODES = ["decide", "trail", "surge", "cast"];
/** Scent tracking: decide over a ground trail, follow it, surge upwind on whiffs, cast crosswind on a loss. */
export class Tracker {
    inner;
    constructor(o) {
        assertReady(PKG);
        this.inner = new w.Tracker(seedFrom(o.rng));
    }
    step(field, sniffer, dt, now, pos, heading, arrived) {
        const r = this.inner.step(field.inner, sniffer.inner, dt, now, pos.x, pos.z, heading, arrived);
        const g = (i) => r[i];
        return { mode: MODES[g(0)], waypoint: g(1) ? { x: g(2), z: g(3) } : null, speed: g(4), stopDist: g(5), done: g(6) === 1, changed: g(7) === 1 };
    }
    /** Replaces the waypoint, for a caller that keeps it out of obstacles. */
    setWaypoint(x, z) {
        this.inner.setWaypoint(x, z);
    }
    /** Frees the wasm memory now, before the garbage collector would; the object is unusable after. */
    free() {
        this.inner.free();
    }
}
/** Geometric vision with percept memory that drifts with sqrt(age) (Fiset 2003). */
export class PerceptMemory {
    inner;
    eye = new Float64Array(3);
    obj = new Float64Array(10);
    constructor(o) {
        assertReady(PKG);
        this.inner = new w.PerceptMemory(Float64Array.from([o.halfFov, o.rangePerSize, o.motionGain, o.motionSpeed, o.nightFloor, o.forgetAfter, o.drift].map(opt)), seedFrom(o.rng));
    }
    sense(id, eye, facingYaw, s, light, t) {
        this.eye.set([eye.x, eye.y, eye.z]);
        const v = s.vel ?? { x: 0, y: 0, z: 0 };
        this.obj.set([s.pos.x, s.pos.y, s.pos.z, v.x, v.y, v.z, s.size, s.occluded ? 1 : 0, s.hidden ? 1 : 0, s.fixed ? 1 : 0]);
        const r = this.inner.sense(id, this.eye, facingYaw, this.obj, light, t);
        const g = (i) => r[i];
        return { visible: g(0) === 1, seen: Number.isNaN(g(1)) ? null : g(1), salience: g(2), confidence: g(3), dist: g(4), speed: g(5) };
    }
    recall(id, now) {
        const r = this.inner.recall(id, now);
        if (!r.length)
            return null;
        const g = (i) => r[i];
        return { pos: { x: g(0), y: g(1), z: g(2) }, confidence: g(3) };
    }
    /** Frees the wasm memory now, before the garbage collector would; the object is unusable after. */
    free() {
        this.inner.free();
    }
}
export const UNKNOWN = 0;
export const FREE = 1;
export const OCCUPIED = 2;
/** Occupancy grid from eye depth renders, with A* paths and frontiers. */
export class OccupancyGrid {
    inner;
    constructor(o = {}) {
        assertReady(PKG);
        const c = o.center ?? { x: 0, z: 0 };
        this.inner = new w.OccupancyGrid(Float64Array.from([o.cells, o.cell, o.radius, o.floorY, o.headY, o.maxRange, o.hitsToMark, o.bucket].map(opt)), c.x, c.z);
    }
    /** Depth in metres along the view ray, row 0 at the top. */
    integrate(camera, depth, width, height, far, agent) {
        this.inner.integrate(camera, depth, width, height, far, agent.x, agent.y, agent.z);
    }
    mark(x, z, obstacle) {
        this.inner.mark(x, z, obstacle);
    }
    freeAround(x, z) {
        this.inner.freeAround(x, z);
    }
    bump(x, z) {
        this.inner.bump(x, z);
    }
    at(x, z) {
        return this.inner.at(x, z);
    }
    canStand(x, z) {
        return this.inner.canStand(x, z);
    }
    path(a, b) {
        const r = this.inner.path(a.x, a.z, b.x, b.z);
        if (!r.length)
            return null;
        const out = [];
        for (let i = 0; i < r.length; i += 2)
            out.push({ x: r[i], z: r[i + 1] });
        return out;
    }
    frontiers(p) {
        const r = this.inner.frontiers(p.x, p.z);
        const out = [];
        for (let i = 0; i < r.length; i += 4)
            out.push({ x: r[i], z: r[i + 1], dist: r[i + 2], size: r[i + 3] });
        return out;
    }
    markDead(x, z) {
        this.inner.markDead(x, z);
    }
    known() {
        const r = this.inner.known();
        return { free: r[0], occupied: r[1] };
    }
    cells() {
        return this.inner.cells();
    }
    get revision() {
        return this.inner.revision;
    }
    /** Frees the wasm memory now, before the garbage collector would; the object is unusable after. */
    free() {
        this.inner.free();
    }
}

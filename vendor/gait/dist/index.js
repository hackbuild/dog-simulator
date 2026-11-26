// @hackbuild/gait: procedural legged locomotion. The oscillator, body
// dynamics, tail and ears run in wasm; this file gives them typed shapes and
// adds the ground query, which stays on the caller's side.
import { assertReady, loadWasm, loadWasmSync } from "./load.js";
import * as wasm from "./wasm/gait.js";
const PKG = "@hackbuild/gait";
/** Loads the wasm. With no argument the inlined copy is used, which works from file://. */
export async function load(source) {
    await loadWasm(source);
}
/** Loads the wasm synchronously from bytes or a compiled module. */
export function loadSync(source) {
    loadWasmSync(source);
}
/** The gait names in the order the footfall tables use. */
export const GAIT_NAMES = ["walk", "pace", "trot", "canter", "gallop"];
/** The footfall tables of the five quadruped gaits, read from the wasm core. */
export function quadrupedTables() {
    assertReady(PKG);
    const f = wasm.quadrupedTables();
    return GAIT_NAMES.map((name, i) => {
        const o = i * 9;
        return { name, offsets: [f[o], f[o + 1], f[o + 2], f[o + 3]], duty: f[o + 4], clearance: f[o + 5], freq0: f[o + 6], freqV: f[o + 7], freqW: f[o + 8] };
    });
}
/**
 * Phase, duty and stride frequency from foot contacts alone, by touchdown
 * to touchdown timing of a reference leg; for sources without an
 * oscillator (a neural network, a clip, a motion matcher).
 */
export class PhaseEstimator {
    source;
    core;
    constructor(legs, source, reference = 0) {
        this.source = source;
        assertReady(PKG);
        this.core = new wasm.PhaseEstimator(legs, reference);
    }
    /** `contacts` per leg: booleans, or contact values above `threshold`. */
    update(dt, contacts, threshold = 0.55) {
        const c = contacts.map((x) => (typeof x === "number" ? x > threshold : x));
        const o = this.core.update(dt, Uint8Array.from(c, (x) => (x ? 1 : 0)));
        return { source: this.source, phase: o[0], duty: o[1], strideFrequency: o[2], contacts: c };
    }
    dispose() {
        this.core.free();
    }
}
/** The motor state of a procedural gait frame. */
export function motorStateOf(s) {
    return {
        source: "procedural",
        phase: s.feet[0] ? s.legPhases[0] : s.phase,
        duty: s.duty,
        strideFrequency: s.standing ? 0 : s.frequency,
        contacts: s.feet.map((f) => f.stance),
    };
}
const seedOf = (rng) => Math.floor(rng() * 4294967296) >>> 0;
/** The leg oscillator for a quadruped (LF RF LH RH). */
export class QuadrupedGait {
    legs;
    legLength;
    opts;
    core;
    constructor(legs, legLength, opts) {
        this.legs = legs;
        this.legLength = legLength;
        this.opts = opts;
        assertReady(PKG);
        this.core = new wasm.Gait(Float64Array.from(legs.flatMap((l) => [l.x, l.z, l.toe, l.front ? 1 : 0])), legLength, seedOf(opts.rng));
        if (opts.paceBias !== undefined)
            this.core.setPaceBias(opts.paceBias);
    }
    reset(x, z, yaw) {
        this.core.reset(x, z, yaw);
    }
    /** World nominal foot spots for a body pose. */
    nominal(x, z, yaw) {
        const n = this.core.nominal(x, z, yaw);
        return this.legs.map((_, i) => [n[i * 2], n[i * 2 + 1]]);
    }
    /** Posture foot offsets in the body frame, from `BodyDynamics`. */
    setOffsets(offsets) {
        this.core.setOffsets(Float64Array.from(offsets.flat()));
    }
    update(dt, pose, cmd) {
        const p = cmd.posture ?? {};
        const posed = (p.sit ?? 0) + (p.down ?? 0) + (p.bow ?? 0) + (p.reach ?? 0);
        const touch = this.core.update(dt, pose.x, pose.z, pose.yaw, cmd.speed, cmd.turnRate, posed);
        const f = this.core.feet();
        const w = this.core.weights();
        const ground = this.opts.ground ?? (() => 0);
        const feet = this.legs.map((_, i) => {
            const o = i * 5;
            return { x: f[o], y: ground(f[o], f[o + 2]) + f[o + 1], z: f[o + 2], stance: f[o + 3] === 1, swing: f[o + 4] };
        });
        const weights = Object.fromEntries(GAIT_NAMES.map((n, i) => [n, w[i] ?? 0]));
        return {
            phase: this.core.phase(),
            weights,
            feet,
            standing: this.core.standing(),
            frequency: this.core.frequency(),
            duty: this.core.duty(),
            froude: this.core.froude(),
            touchdowns: this.legs.map((_, i) => i).filter((i) => touch & (1 << i)),
            legPhases: Array.from(this.core.legPhases()),
        };
    }
    dispose() {
        this.core.free();
    }
}
/** Posture springs, terrain pitch and roll, gait bob, lean and load shift. */
export class BodyDynamics {
    core;
    constructor(geometry, rng) {
        assertReady(PKG);
        this.core = new wasm.BodyDynamics(Float64Array.of(geometry.frontZ, geometry.rearZ, geometry.halfWidth, geometry.size), seedOf(rng));
    }
    /** `ground` holds the ground height under each nominal foot spot. */
    update(dt, gait, cmd, ground, breath = { rate: 0.32, depth: 0.003 }) {
        const p = cmd.posture ?? {};
        const o = this.core.update(dt, Float64Array.from(GAIT_NAMES.map((n) => gait.weights[n])), gait.phase, gait.standing, cmd.speed, cmd.turnRate, Float64Array.of(p.sit ?? 0, p.down ?? 0, p.bow ?? 0, p.reach ?? 0), Float64Array.from(ground), breath.rate, breath.depth);
        return {
            rootY: o[0],
            drop: o[1],
            dz: o[2],
            pitch: o[3],
            roll: o[4],
            bend: o[5],
            flex: o[6],
            breathe: o[7],
            posture: { sit: o[8], down: o[9], bow: o[10], reach: o[11] },
            legOffsets: [0, 1, 2, 3].map((i) => [o[12 + i * 2], o[13 + i * 2]]),
            tilt: [o[20], o[21], o[22], o[23]],
        };
    }
    dispose() {
        this.core.free();
    }
}
/** The eight tail wag modes, in the order `WagInput.modeWeights` uses. */
export const WAG_MODES = ["still", "slow wide", "fast small", "loose broad", "helicopter", "high stiff", "tucked", "tip flick"];
/** Tail wag through a spring chain, with eight wag modes. */
export class TailWag {
    core;
    constructor(links, halflife, rng) {
        assertReady(PKG);
        this.core = new wasm.Wag(links, halflife, seedOf(rng));
    }
    update(dt, inp) {
        const o = this.core.update(dt, Float64Array.from(inp.modeWeights), inp.arousal, inp.lift ?? 0, inp.bias ?? 0, inp.turnRate ?? 0, inp.ampScale ?? 1, inp.hzScale ?? 1);
        return { mode: WAG_MODES[o[0]], lift: o[1], yaw: Array.from(o.subarray(2)) };
    }
    dispose() {
        this.core.free();
    }
}
/** Two ear springs. Returns [left, right] in radians. */
export class Ears {
    core;
    constructor(halflife = 0.07) {
        assertReady(PKG);
        this.core = new wasm.EarPair(halflife);
    }
    update(dt, perk, negative, headYawRate, flap = 0, bounce = 0) {
        const o = this.core.update(dt, perk, negative, headYawRate, flap, bounce);
        return [o[0], o[1]];
    }
    dispose() {
        this.core.free();
    }
}
/** Default steering settings, tuned on a 0.78 m dog. */
export const DEFAULT_STEER = { speed: 1.6, stopDistance: 0.3, clearance: 0.3, influence: 1.6, turnSlow: 3.2, turnFast: 1.6, fence: 0 };
/** Potential field steering toward a goal; a pure function. */
export function steer(pose, goal, obstacles = [], params = {}) {
    assertReady(PKG);
    const p = { ...DEFAULT_STEER, ...params };
    const o = wasm.steer(pose.x, pose.z, pose.yaw, pose.v, goal.x, goal.z, Float64Array.from(obstacles.flatMap((b) => [b.x, b.z, b.r])), Float64Array.of(p.speed, p.stopDistance, p.clearance, p.influence, p.turnSlow, p.turnFast, p.fence));
    return { speed: o[0], turnRate: o[1], arrived: o[2] === 1 };
}
/** The procedural gait as a backend: integrates the command into root motion and steps the legs. */
export class ProceduralBackend {
    gait;
    capabilities = { turnInPlace: true, minStopDistance: 0.05, headPitchBias: 0 };
    root = { x: 0, z: 0, yaw: 0, speed: 0, turnRate: 0 };
    state = null;
    constructor(gait) {
        this.gait = gait;
    }
    update(dt, cmd) {
        const r = this.root;
        r.speed = cmd.speed;
        r.turnRate = cmd.turnRate;
        r.yaw += cmd.turnRate * dt;
        r.x += Math.sin(r.yaw) * cmd.speed * dt;
        r.z += Math.cos(r.yaw) * cmd.speed * dt;
        this.state = this.gait.update(dt, r, cmd);
        return { ...r };
    }
    motorState() {
        return this.state ? motorStateOf(this.state) : { source: "procedural", phase: 0, duty: 0, strideFrequency: 0, contacts: this.gait.legs.map(() => true) };
    }
}
/** Two bone leg solve; same layout as `@hackbuild/ik` twoBone. */
export function solveLeg(a, b, c, target, pole) {
    assertReady(PKG);
    const o = wasm.solveLeg(Float64Array.from([...a, ...b, ...c]), Float64Array.from(target), Float64Array.from(pole));
    return { upper: [o[6], o[7], o[8], o[9]], lower: [o[10], o[11], o[12], o[13]], reached: o[14] === 1 };
}
/** The golden scenario run in wasm, for the native and wasm agreement test. */
export function goldenTrace(seed) {
    assertReady(PKG);
    return wasm.goldenTrace(seed);
}

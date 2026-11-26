// @hackbuild/scenario/browser: the same lockstep core, metrics and reports
// for a sim that runs in the page itself. No Node imports, no puppeteer.
// A scenario is loaded from JSON (`parseScenario`), stepped against the sim
// object (`runScenario`, events streamed through `onEvent`), judged
// (`runScenarios` returns a report for `formatReport` and `reportPasses`),
// and two traces are compared (`diffRows`, `diffMessage`).
import { diffTraces, drive } from "./core.js";
import * as metrics from "./metrics.js";
export * from "./core.js";
export * from "./metrics.js";
export * from "./profiler.js";
export * from "./report.js";
const compiled = new Map();
function compile(c, expr) {
    const key = `${expr ? "e" : "b"}${c}`;
    let f = compiled.get(key);
    if (!f) {
        f = new Function("h", expr ? `return (${c});` : c);
        compiled.set(key, f);
    }
    return f;
}
const turn = () => new Promise((r) => setTimeout(r, 0));
/** A driver over a sim object in this page. */
export function simDriver(sim, o = {}) {
    const h = o.handle ?? sim;
    const run = (c, expr) => (typeof c === "string" ? compile(c, expr)(h) : c(h));
    const yieldTurn = o.yield ?? typeof setTimeout === "function";
    return {
        act: (c) => run(c, false),
        read: (c) => run(c, true),
        async step(n) {
            await sim.step(n);
            if (yieldTurn)
                await turn();
        },
        trace: () => sim.trace(),
        async shot(path) {
            if (sim.render)
                await sim.render();
            if (o.onShot)
                await o.onShot(path);
        },
    };
}
/** Runs one scenario against a sim made with the scenario's seed. */
export function runScenario(sim, sc, o = {}) {
    const { handle: _h, ...rest } = o;
    return drive(simDriver(sim, o), sc, rest);
}
const fail = (msg) => {
    throw new Error(msg);
};
const isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const list = (v, what) => {
    if (v === undefined)
        return [];
    if (!Array.isArray(v) || !v.every(isObj))
        fail(`${what} must be a list of objects`);
    return v;
};
const str = (v, what) => (typeof v === "string" && v.length ? v : fail(`${what} must be text`));
const num = (v, what) => (typeof v === "number" && Number.isFinite(v) ? v : fail(`${what} must be a number`));
/** Measures a check spec against a trace; a throw or a non number reads as not run. */
export function measureCheck(spec, t) {
    const { js, ...rest } = spec;
    let measured = null;
    try {
        const v = new Function("t", "m", `return (${js});`)(t, metrics);
        if (typeof v === "number")
            measured = v;
    }
    catch {
        measured = null;
    }
    return { ...rest, measured };
}
/**
 * A scenario from JSON text or a parsed object: name, seed, seconds,
 * actions, probes, shots and check specs. Code fields are strings run with
 * `new Function`, so load only files you trust in this page.
 */
export function parseScenario(input) {
    let o = input;
    if (typeof input === "string") {
        try {
            o = JSON.parse(input);
        }
        catch (e) {
            fail(`scenario is not json: ${e.message}`);
        }
    }
    if (!isObj(o))
        return fail("scenario must be an object");
    const name = str(o.name, "scenario name");
    const seed = num(o.seed, `${name}: seed`);
    if (!Number.isInteger(seed))
        fail(`${name}: seed must be a whole number`);
    const seconds = num(o.seconds, `${name}: seconds`);
    if (seconds <= 0)
        fail(`${name}: seconds must be above 0`);
    const sc = { name, seed, seconds };
    const actions = list(o.actions, `${name}: actions`).map((a, i) => {
        const js = str(a.js, `${name}: action ${i} js`);
        if (a.when !== undefined)
            return { when: str(a.when, `${name}: action ${i} when`), js };
        return { at: num(a.at ?? 0, `${name}: action ${i} at`), js };
    });
    if (actions.length)
        sc.actions = actions;
    const probes = list(o.probes, `${name}: probes`).map((p, i) => ({ every: num(p.every, `${name}: probe ${i} every`), js: str(p.js, `${name}: probe ${i} js`) }));
    if (probes.length)
        sc.probes = probes;
    const shots = list(o.shots, `${name}: shots`).map((s, i) => ({ at: num(s.at, `${name}: shot ${i} at`), path: str(s.path, `${name}: shot ${i} path`), ...(s.js !== undefined ? { js: str(s.js, `${name}: shot ${i} js`) } : {}) }));
    if (shots.length)
        sc.shots = shots;
    if (o.hash !== undefined)
        sc.hash = str(o.hash, `${name}: hash`);
    const specs = list(o.checks, `${name}: checks`).map((c, i) => {
        const what = str(c.what, `${name}: check ${i} what`);
        if (!isObj(c.legal))
            fail(`${name}: check ${what} needs legal with min or max`);
        return { ...c, what, js: str(c.js, `${name}: check ${what} js`), constraint: str(c.constraint, `${name}: check ${what} constraint`) };
    });
    if (specs.length)
        sc.checks = (t) => specs.map((s) => measureCheck(s, t));
    return sc;
}
/** A trace or golden file from JSON text or an object: rows, and cols, hash, probes, fired when present. */
export function parseTrace(input) {
    let o = input;
    if (typeof input === "string") {
        try {
            o = JSON.parse(input);
        }
        catch (e) {
            fail(`trace is not json: ${e.message}`);
        }
    }
    if (!isObj(o) || !Array.isArray(o.rows) || !o.rows.every(Array.isArray))
        return fail("trace needs rows, a list of lists");
    const t = { rows: o.rows, probes: Array.isArray(o.probes) ? o.probes : [], fired: Array.isArray(o.fired) ? o.fired : [], wallSeconds: typeof o.wallSeconds === "number" ? o.wallSeconds : 0 };
    if (Array.isArray(o.cols))
        t.cols = o.cols;
    if (typeof o.hash === "string")
        t.hash = o.hash;
    return t;
}
/** Runs scenarios one after another in this page and returns a report with the traces. */
export async function runScenarios(o) {
    const results = [];
    const traces = {};
    for (const sc of o.scenarios) {
        const res = { name: sc.name, seed: sc.seed, checks: [], errors: [], blocked: [] };
        let tr = null;
        try {
            tr = await runScenario(await o.makeSim(sc.seed, sc), sc, o);
            traces[sc.name] = tr;
            res.checks = sc.checks ? sc.checks(tr) : [];
            if (o.goldens) {
                const g = o.goldens[sc.name];
                if (!g)
                    res.golden = "missing";
                else {
                    const d = diffTraces(g, tr);
                    res.golden = d ? "differs" : "identical";
                    if (d)
                        res.firstDifference = d;
                }
            }
        }
        catch (e) {
            res.errors.push(`runner: ${e.message}`);
        }
        results.push(res);
        o.onResult?.(res, tr);
    }
    const ua = typeof navigator === "object" && navigator ? navigator.userAgent : "unknown";
    return { date: o.date ?? new Date().toISOString().slice(0, 10), chrome: o.browser ?? ua, results, traces };
}

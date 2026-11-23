// Lockstep driver: the page opened with a test hash does not run its own
// loop; the runner advances whole fixed steps through the page's test API
// and reads the trace. Generalized from the dog-simulator runner.
//
// Page contract (`window.__sim` unless named otherwise):
//   step(n)   advance n fixed steps
//   trace()   { rows: unknown[][], cols?: string[], hash?: string }
//   render()  optional, draw the current state before a screenshot
// Actions and probes are page code run with `h` bound to the handle
// expression (default `window.__sim`).
import { mkdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { open, waitFor } from "./chrome.js";
const bound = (handle, body) => `(() => { const h = ${handle}; ${body} })()`;
/** Runs one scenario on an open page whose test API is ready. */
export async function runLockstep(page, sc, o = {}) {
    const sps = o.stepsPerSecond ?? 60;
    const api = o.api ?? "window.__sim";
    const handle = o.handle ?? api;
    const whenEvery = o.whenEvery ?? 15;
    const t0 = Date.now();
    const total = Math.round(sc.seconds * sps);
    const whens = (sc.actions ?? []).filter((a) => a.when);
    const events = [
        ...(sc.actions ?? []).filter((a) => !a.when).map((a) => ({ step: Math.round((a.at ?? 0) * sps), kind: "action", js: a.js })),
        ...(sc.shots ?? []).map((s) => ({ step: Math.round(s.at * sps), kind: "shot", ...(s.js ? { js: s.js } : {}), path: s.path })),
    ].sort((a, b) => a.step - b.step);
    const probes = (sc.probes ?? []).map((p) => ({ ...p, n: Math.max(1, Math.round(p.every * sps)) }));
    const out = { rows: [], probes: [], fired: [], wallSeconds: 0 };
    let done = 0;
    let lastLog = Date.now();
    while (done < total) {
        while (events.length && events[0].step <= done) {
            const e = events.shift();
            if (e.js)
                await page.evaluate(bound(handle, e.js));
            if (e.kind === "shot" && e.path) {
                await page.evaluate(`(() => { const a = ${api}; if (a.render) a.render(); })()`);
                mkdirSync(dirname(e.path), { recursive: true });
                await page.screenshot({ path: e.path });
            }
        }
        let n = Math.min(o.chunk ?? 30, total - done);
        if (events.length)
            n = Math.min(n, Math.max(1, events[0].step - done));
        for (const p of probes)
            n = Math.min(n, p.n - (done % p.n));
        if (whens.length)
            n = Math.min(n, whenEvery - (done % whenEvery));
        await page.evaluate(`${api}.step(${n})`);
        done += n;
        if (whens.length && done % whenEvery === 0) {
            for (let i = 0; i < whens.length; i++) {
                const w = whens[i];
                if (await page.evaluate(bound(handle, `return !!(${w.when});`))) {
                    await page.evaluate(bound(handle, w.js));
                    out.fired.push([done, w.when]);
                    whens.splice(i--, 1);
                }
            }
        }
        for (const p of probes)
            if (done % p.n === 0)
                out.probes.push([done, await page.evaluate(bound(handle, `return (${p.js});`))]);
        if (o.onProgress && Date.now() - lastLog > 15000) {
            lastLog = Date.now();
            o.onProgress(done / sps, (Date.now() - t0) / 1000);
        }
    }
    const tr = (await page.evaluate(`${api}.trace()`));
    out.rows = tr.rows;
    if (tr.cols)
        out.cols = tr.cols;
    if (tr.hash !== undefined)
        out.hash = tr.hash;
    out.wallSeconds = (Date.now() - t0) / 1000;
    return out;
}
/** First differing row between two traces, or null when identical. */
export function diffTraces(a, b) {
    const n = Math.max(a.rows.length, b.rows.length);
    for (let i = 0; i < n; i++) {
        const x = JSON.stringify(a.rows[i]);
        const y = JSON.stringify(b.rows[i]);
        if (x !== y)
            return { row: i, a: a.rows[i] ?? null, b: b.rows[i] ?? null };
    }
    if (a.hash !== b.hash)
        return { row: n, a: a.hash ?? null, b: b.hash ?? null };
    return null;
}
/** Runs a scenario list, records or compares goldens, returns a report. */
export async function runSuite(o) {
    const api = o.api ?? "window.__sim";
    const results = [];
    const traces = {};
    let chrome = "unknown";
    const queue = [...o.scenarios];
    const one = async (sc) => {
        const oo = { url: o.file, hash: `#test&seed=${sc.seed}${sc.hash ? `&${sc.hash}` : ""}`, routes: o.routes ?? [], offline: o.offline ?? false, width: o.width ?? 420, height: o.height ?? 280 };
        if (o.chrome)
            oo.chrome = o.chrome;
        const { page, log, close } = await open(oo);
        chrome = log.version;
        const res = { name: sc.name, seed: sc.seed, checks: [], errors: log.errors, blocked: log.blocked };
        try {
            const ok = await waitFor(page, `!!(${api})`, o.readyMs ?? 240000);
            if (!ok)
                throw new Error(`no ${api} after ${(o.readyMs ?? 240000) / 1000} s`);
            const tr = await runLockstep(page, sc, o);
            traces[sc.name] = tr;
            res.checks = sc.checks ? sc.checks(tr) : [];
            if (o.goldenDir && o.mode !== "check") {
                const gp = join(o.goldenDir, `${sc.name}.json`);
                if (o.mode === "record") {
                    mkdirSync(o.goldenDir, { recursive: true });
                    writeFileSync(gp, `${JSON.stringify({ name: sc.name, seed: sc.seed, seconds: sc.seconds, chrome: log.version, hash: tr.hash ?? null, cols: tr.cols ?? null, rows: tr.rows, probes: tr.probes, fired: tr.fired })}\n`);
                    res.golden = "recorded";
                }
                else if (!existsSync(gp))
                    res.golden = "missing";
                else {
                    const d = diffTraces(JSON.parse(readFileSync(gp, "utf8")), tr);
                    res.golden = d ? "differs" : "identical";
                    if (d)
                        res.firstDifference = d;
                }
            }
        }
        catch (e) {
            res.errors.push(`runner: ${e.message}`);
        }
        finally {
            await close();
        }
        results.push(res);
    };
    await Promise.all(Array.from({ length: Math.min(o.jobs ?? 2, queue.length) }, async () => {
        while (queue.length)
            await one(queue.shift());
    }));
    results.sort((a, b) => o.scenarios.findIndex((s) => s.name === a.name) - o.scenarios.findIndex((s) => s.name === b.name));
    return { date: o.date ?? new Date().toISOString().slice(0, 10), chrome, results, traces };
}

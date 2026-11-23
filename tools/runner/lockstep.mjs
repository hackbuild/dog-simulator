// Lockstep driver: opens a build with #test&seed=N, advances whole sim steps
// through window.__sim and collects the trace. Scenario steps (actions at sim
// times, screenshots) come from a scenario object; see scenarios/*.mjs.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { open, waitFor } from "./chrome.mjs";
import { INSTALL as METRICS } from "./metrics.mjs";

export const STEPS_PER_SECOND = 60;

/**
 * run({ file, seed, off, seconds, actions, shots, onProgress, chunk })
 * actions: [{ at: simSeconds | when: "page condition", js: "code run in the page with h = window.__hackle" }]
 * shots:   [{ at: simSeconds, path, js? }] screenshot after an optional camera setup
 * probes:  [{ every: simSeconds, js: "expression returning JSON" }] extra trace columns
 * metrics: false skips the motion metrics; frames: rAF sampler frame count after the trace (0 skips)
 */
export async function run(o) {
  const hash = `#test&seed=${o.seed}` + (o.on?.length ? `&on=${o.on.join(",")}` : "") + (o.off?.length ? `&off=${o.off.join(",")}` : "") + (o.nnacc ? `&nnacc=${o.nnacc}` : "");
  const { browser, page, log } = await open({ url: o.file, hash, offline: o.offline, width: o.width, height: o.height });
  const t0 = Date.now();
  const out = { file: o.file, seed: o.seed, off: o.off ?? [], chrome: log.version, probes: [] };
  try {
    const ok = await waitFor(page, () => !!window.__sim, null, 240000);
    if (!ok) throw new Error("no window.__sim after 240 s");
    out.backend = await page.evaluate(() => document.getElementById("chipGpu")?.textContent ?? "unknown");
    out.neural = await page.evaluate(() => !!window.__hackle.NG.ready);
    if (o.metrics !== false) await page.evaluate(METRICS);
    const total = Math.round(o.seconds * STEPS_PER_SECOND);
    const whens = (o.actions ?? []).filter((a) => a.when);
    const events = [
      ...(o.actions ?? []).filter((a) => !a.when).map((a) => ({ ...a, kind: "action" })),
      ...(o.shots ?? []).map((a) => ({ ...a, kind: "shot" })),
    ].map((e) => ({ ...e, step: Math.round(e.at * STEPS_PER_SECOND) })).sort((a, b) => a.step - b.step);
    const probeEvery = (o.probes ?? []).map((p) => ({ ...p, n: Math.round(p.every * STEPS_PER_SECOND) }));
    const chunk = o.chunk ?? 30;
    let done = 0, lastLog = Date.now();
    while (done < total) {
      while (events.length && events[0].step <= done) {
        const e = events.shift();
        if (e.kind === "action") await page.evaluate(`(() => { const h = window.__hackle; ${e.js} })()`);
        else {
          if (e.js) await page.evaluate(`(() => { const h = window.__hackle; ${e.js} })()`);
          await page.evaluate(() => window.__sim.render());
          mkdirSync(dirname(e.path), { recursive: true });
          await page.screenshot({ path: e.path });
        }
      }
      let n = Math.min(chunk, total - done);
      if (events.length) n = Math.min(n, Math.max(1, events[0].step - done));
      for (const p of probeEvery) n = Math.min(n, p.n - (done % p.n));
      if (whens.length) n = Math.min(n, 15 - (done % 15));
      await page.evaluate((k) => window.__sim.step(k), n);
      done += n;
      if (whens.length && done % 15 === 0) {
        for (let i = 0; i < whens.length; i++) {
          if (await page.evaluate(`(() => { const h = window.__hackle; return !!(${whens[i].when}); })()`)) {
            await page.evaluate(`(() => { const h = window.__hackle; ${whens[i].js} })()`);
            out.fired = [...(out.fired ?? []), [done, whens[i].when]];
            whens.splice(i--, 1);
          }
        }
      }
      for (const p of probeEvery) if (done % p.n === 0) out.probes.push([done, await page.evaluate(`(() => { const h = window.__hackle; return (${p.js}); })()`)]);
      if (o.onProgress && Date.now() - lastLog > 15000) { lastLog = Date.now(); o.onProgress(done / STEPS_PER_SECOND, (Date.now() - t0) / 1000); }
    }
    const tr = await page.evaluate(() => window.__sim.trace());
    Object.assign(out, tr);
    if (o.metrics !== false) {
      out.metrics = await page.evaluate(() => window.__metrics.summary());
      if ((o.frames ?? 90) > 0) out.metrics.frames = await page.evaluate((n) => window.__metrics.frames(n), o.frames ?? 90);
    }
  } finally {
    out.errors = log.errors;
    out.blocked = log.blocked;
    out.wallSeconds = Math.round((Date.now() - t0) / 1000);
    await browser.close();
  }
  return out;
}

export function save(path, obj) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(obj) + "\n");
}

/** First differing row between two traces, or null when identical. */
export function diff(a, b) {
  const n = Math.max(a.rows.length, b.rows.length);
  for (let i = 0; i < n; i++) {
    const x = JSON.stringify(a.rows[i]), y = JSON.stringify(b.rows[i]);
    if (x !== y) return { row: i, a: a.rows[i], b: b.rows[i] };
  }
  if (a.hash !== b.hash) return { row: n, hash: [a.hash, b.hash] };
  return null;
}

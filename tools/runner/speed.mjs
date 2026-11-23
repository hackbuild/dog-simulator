// Speed check: runs one build in real time mode (#seed=N, animation loop, wall clock frames) at
// two simSpeeds for the same sim time and reports where the traces part. Lockstep cannot show
// this class of difference: it waits for every eye readback and never runs the detector timer.
//   node tools/runner/speed.mjs [file] [--seed 7] [--seconds 60] [--speeds 1,4] [--on L.neural] [--off a,b] [--gpu default|swiftshader] [--out report.json]
// Rows are the lockstep columns every 0.25 sim s (no hash). Both runs use one seed, so any
// difference comes from how sim steps line up with frames and with async work: the eye readback
// kicked every 0.1 sim s and not awaited, the gait network answering in wall time.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { ROOT, open, waitFor } from "./chrome.mjs";
import { COLS } from "../../scenarios/list.mjs";

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const flagValues = new Set(argv.filter((a, i) => i > 0 && argv[i - 1].startsWith("--")));
const file = argv.find((a) => !a.startsWith("--") && !flagValues.has(a)) ?? join(ROOT, "dist/dog-simulator.html");
const seed = +opt("seed", 7);
const seconds = +opt("seconds", 60);
const speeds = opt("speeds", "1,4").split(",").map(Number);
const on = opt("on", ""), off = opt("off", "");
// headless SwiftShader ran 0 to 1 animation frames a second on the owner's Mac (vendor/scenario),
// so the real time check uses the machine's GPU unless --gpu swiftshader is given
const gpu = opt("gpu", "default");
const out = opt("out", join(ROOT, `scenarios/reports/speed-s${seed}.json`));
const t0 = Date.now();
const say = (s) => console.log(`[${Math.round((Date.now() - t0) / 1000)}s] ${s}`);

async function one(speed) {
  const hash = `#seed=${seed}&speed=${speed}` + (on ? `&on=${on}` : "") + (off ? `&off=${off}` : "");
  const { browser, page, log } = await open({ url: file, hash, gpu });
  const w0 = Date.now();
  try {
    if (!(await waitFor(page, () => !!window.__rt, null, 240000))) throw new Error("no window.__rt after 240 s; is this build older than the speed check?");
    for (let last = 0; ;) {
      const t = await page.evaluate(() => window.__rt.t());
      if (t >= seconds) break;
      if (Date.now() - last > 15000) { last = Date.now(); say(`speed ${speed}: sim ${t.toFixed(0)} s, wall ${((Date.now() - w0) / 1000).toFixed(0)} s`); }
      await new Promise((r) => setTimeout(r, 250));
    }
    const rows = await page.evaluate(() => window.__rt.rows(0));
    const fps = await page.evaluate(() => document.getElementById("chipFps")?.textContent ?? "");
    return { speed, rows, wallSeconds: Math.round((Date.now() - w0) / 1000), fps, errors: log.errors, blocked: log.blocked };
  } finally {
    await browser.close();
  }
}

const runs = [];
for (const s of speeds) runs.push(await one(s));
const [a, b] = runs;
const n = Math.min(a.rows.length, b.rows.length, Math.floor((seconds * 60) / 15));
const names = COLS.slice(0, -1); // no hash column in real time rows
let first = null;
let maxDog = 0, maxHum = 0;
for (let i = 0; i < n; i++) {
  const ra = a.rows[i], rb = b.rows[i];
  const cols = names.filter((_, k) => ra[k] !== rb[k]);
  if (cols.length && !first) first = { step: ra[0], simSeconds: ra[1], columns: cols, a: ra, b: rb };
  maxDog = Math.max(maxDog, Math.hypot(ra[2] - rb[2], ra[3] - rb[3]));
  maxHum = Math.max(maxHum, Math.hypot(ra[6] - rb[6], ra[7] - rb[7]));
}
const report = {
  gpu, file: file.startsWith(ROOT) ? file.slice(ROOT.length + 1) : file, seed, seconds, speeds, date: new Date().toISOString().slice(0, 10),
  rowsCompared: n, identical: !first, firstDifference: first,
  maxDogApartM: +maxDog.toFixed(4), maxHumanApartM: +maxHum.toFixed(4),
  runs: runs.map((r) => ({ speed: r.speed, rows: r.rows.length, wallSeconds: r.wallSeconds, fps: r.fps, errors: r.errors, blocked: r.blocked })),
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(report, null, 1) + "\n");
console.log(first
  ? `speed ${speeds[0]} against ${speeds[1]}: traces part at step ${first.step} (${first.simSeconds} sim s) in ${first.columns.join(", ")}; dog up to ${report.maxDogApartM} m apart, human up to ${report.maxHumanApartM} m over ${n} rows (measured)`
  : `speed ${speeds[0]} against ${speeds[1]}: ${n} rows identical over ${seconds} sim s (measured)`);
process.exit(runs.some((r) => r.errors.length || r.blocked.length) ? 1 : 0);

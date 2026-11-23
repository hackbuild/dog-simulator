// Two lockstep runs of one build with the same seed must give identical
// traces. Runs both in parallel, each in its own browser.
//   node tools/runner/determinism.mjs [file] --seconds 600 --seed 7 [--off L.neural] [--report path]
import { join } from "node:path";
import { ROOT } from "./chrome.mjs";
import { diff, run, save } from "./lockstep.mjs";

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const file = argv[0] && !argv[0].startsWith("--") ? argv[0] : join(ROOT, "dist/hackle-det.html");
const seconds = +opt("seconds", 600), seed = +opt("seed", 7), off = opt("off", "") ? opt("off").split(",") : [];
const t0 = Date.now();
const prog = (tag) => (s, w) => console.log(`[${Math.round((Date.now() - t0) / 1000)}s] run ${tag}: sim ${s.toFixed(0)} s, ${(s / w).toFixed(2)} sim s per wall s`);
const [a, b] = await Promise.all([run({ file, seed, off, seconds, onProgress: prog("a") }), run({ file, seed, off, seconds, onProgress: prog("b") })]);
const d = diff(a, b);
const report = {
  file, seed, off, seconds, chrome: a.chrome, backend: a.backend, neural: a.neural,
  rows: a.rows.length, hashA: a.hash, hashB: b.hash, identical: d === null, firstDifference: d,
  errors: [...a.errors, ...b.errors], blocked: [...a.blocked, ...b.blocked], wallSeconds: [a.wallSeconds, b.wallSeconds],
};
console.log(JSON.stringify(report, null, 2));
const rp = opt("report");
if (rp) save(rp, report);
const tp = opt("trace");
if (tp) save(tp, a);
process.exit(report.identical && !report.errors.length && !report.blocked.length ? 0 : 1);

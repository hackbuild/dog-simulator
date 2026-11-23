// Runs the scenario list in lockstep and records or compares golden traces.
//   node scenarios/run.mjs record  [--file F] [--variant cpg|neural] [--only a,b] [--jobs 3]
//   node scenarios/run.mjs compare [--file F] [--variant cpg|neural] [--only a,b] [--jobs 3]
//   --seeds a,b and --tag t: more seeds per scenario, a separate report name
//   --no-metrics skips the motion metrics (tools/runner/metrics.mjs); --size 420x280 sets the viewport
// variant cpg turns L.neural off (the golden set every build must hold);
// variant neural runs the app build with the motion-net gait host (--nnacc f32|f64 picks the sums);
// variant neural-legacy runs the legacy network host, legacy/det builds only.
// Goldens: scenarios/golden/<variant>/<name>.json. Screenshots go to
// scenarios/shots/<variant>/, outside git: they show the human model.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../tools/runner/chrome.mjs";
import { diff, run, save } from "../tools/runner/lockstep.mjs";
import { SCENARIOS, row } from "./list.mjs";

const argv = process.argv.slice(2);
const mode = argv[0];
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
if (mode !== "record" && mode !== "compare") { console.error("usage: run.mjs record|compare [--file F] [--variant cpg|neural] [--only a,b] [--jobs n]"); process.exit(2); }
const variant = opt("variant", "cpg");
// the app build holds golden/cpg; the network host is in legacy/det only
const file = opt("file", join(ROOT, variant === "neural-legacy" ? "dist/hackle-det.html" : "dist/dog-simulator.html"));
const nnacc = opt("nnacc", "");
const only = opt("only", "") ? opt("only").split(",") : null;
const jobs = +opt("jobs", 3);
const [width, height] = opt("size", "") ? opt("size").split("x").map(Number) : [];
// --seeds a,b runs each selected scenario once per seed, named <name>-s<seed>
const seeds = opt("seeds", "") ? opt("seeds").split(",").map(Number) : null;
const list = SCENARIOS.filter((s) => !only || only.includes(s.name)).flatMap((s) => (seeds ? seeds.map((seed) => ({ ...s, seed, name: seed === s.seed ? s.name : `${s.name}-s${seed}` })) : [s]));
const off = variant === "cpg" ? ["L.neural"] : [];
// the neural layer starts off in the app build; the neural variant turns it on
const on = variant === "neural" ? ["L.neural"] : [];
const t0 = Date.now();
const say = (s) => console.log(`[${Math.round((Date.now() - t0) / 1000)}s] ${s}`);

async function one(sc) {
  const shots = (sc.shots ?? []).map((s) => ({ ...s, path: join(ROOT, "scenarios/shots", variant, s.path.replace(/\.png$/, (sc.name.match(/-s\d+$/)?.[0] ?? "") + ".png")) }));
  say(`${sc.name}: start, ${sc.seconds} sim s`);
  const tr = await run({ file, seed: sc.seed, off, on, nnacc, seconds: sc.seconds, actions: sc.actions, probes: sc.probes, shots: mode === "record" ? shots : [], metrics: !argv.includes("--no-metrics"), width, height, onProgress: (s, w) => say(`${sc.name}: sim ${s.toFixed(0)} s, wall ${w.toFixed(0)} s`) });
  const R = tr.rows.map(row);
  const expect = sc.expect.map((e) => { let ok; try { ok = !!e.check(R, tr.rows, tr.probes); } catch (err) { ok = false; } return { label: e.label, pass: ok }; });
  const res = { name: sc.name, seed: sc.seed, issue: sc.issue ?? null, hash: tr.hash, rows: tr.rows.length, wallSeconds: tr.wallSeconds, errors: tr.errors, blocked: tr.blocked, expect, fired: tr.fired ?? [], metrics: tr.metrics ?? null };
  const gp = join(ROOT, "scenarios/golden", variant, `${sc.name}.json`);
  if (mode === "record") save(gp, { name: sc.name, seed: sc.seed, off, chrome: tr.chrome, backend: tr.backend, seconds: sc.seconds, hash: tr.hash, rows: tr.rows, probes: tr.probes, fired: tr.fired ?? [] });
  else {
    if (!existsSync(gp)) res.golden = "missing";
    else { const d = diff(JSON.parse(readFileSync(gp, "utf8")), tr); res.golden = d ? "differs" : "identical"; if (d) res.firstDifference = d; }
  }
  say(`${sc.name}: done, ${expect.filter((e) => e.pass).length}/${expect.length} expectations, hash ${tr.hash}${res.golden ? ", golden " + res.golden : ""}`);
  return res;
}

const results = [];
const queue = [...list];
await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => { while (queue.length) results.push(await one(queue.shift())); }));
results.sort((a, b) => list.findIndex((s) => s.name === a.name) - list.findIndex((s) => s.name === b.name));
const report = { mode, variant, file, date: new Date().toISOString().slice(0, 10), results };
save(join(ROOT, "scenarios/reports", `${mode}-${variant}${opt("tag", "") ? "-" + opt("tag") : ""}.json`), report);
for (const r of results) {
  console.log(`${r.name}${r.issue ? ` (issue ${r.issue})` : ""}: ${r.golden ?? "recorded"}, errors ${r.errors.length}, blocked ${r.blocked.length}`);
  for (const e of r.expect) console.log(`  ${e.pass ? "pass" : "FAIL"} ${e.label}`);
  const m = r.metrics;
  if (m) {
    const j = (k) => (m.jerk[k].n ? `${m.jerk[k].p50}/${m.jerk[k].p95}/${m.jerk[k].max}` : "-");
    const T = m.toggles, F = m.frames;
    console.log(`  jerk p50/p95/max m/s^3: dog head ${j("dogHead")}, hip ${j("dogHip")}, paw ${j("dogPaw")}, human head ${j("humHead")}, hip ${j("humHip")}`);
    console.log(`  sliding s: dog ${m.slide.dog.seconds} of ${m.slide.dog.movingSeconds}, human ${m.slide.hum.seconds} of ${m.slide.hum.movingSeconds}; toggles per s: source ${T.src.perSecond}, gait ${T.gait.perSecond} (flicker ${T.gait.flicker}), posture ${T.posture.perSecond} (flicker ${T.posture.flicker})`);
    if (F) console.log(`  frame ms p50/p95/max: ${F.frameMs.p50}/${F.frameMs.p95}/${F.frameMs.max} over ${F.frames} frames, step and render ${F.workMs.p50}/${F.workMs.p95}/${F.workMs.max} ms`);
  }
}
const bad = results.some((r) => r.errors.length || r.blocked.length || (mode === "compare" && r.golden !== "identical"));
process.exit(bad ? 1 : 0);

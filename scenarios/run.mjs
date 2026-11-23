// Runs the scenario list in lockstep and records or compares golden traces.
//   node scenarios/run.mjs record  [--file F] [--variant cpg|neural] [--only a,b] [--jobs 3]
//   node scenarios/run.mjs compare [--file F] [--variant cpg|neural] [--only a,b] [--jobs 3]
//   --seeds a,b and --tag t: more seeds per scenario, a separate report name
// variant cpg turns L.neural off (the golden set every build must hold);
// variant neural runs the legacy network host, legacy builds only.
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
const file = opt("file", join(ROOT, "dist/hackle-det.html"));
const only = opt("only", "") ? opt("only").split(",") : null;
const jobs = +opt("jobs", 3);
// --seeds a,b runs each selected scenario once per seed, named <name>-s<seed>
const seeds = opt("seeds", "") ? opt("seeds").split(",").map(Number) : null;
const list = SCENARIOS.filter((s) => !only || only.includes(s.name)).flatMap((s) => (seeds ? seeds.map((seed) => ({ ...s, seed, name: seed === s.seed ? s.name : `${s.name}-s${seed}` })) : [s]));
const off = variant === "cpg" ? ["L.neural"] : [];
const t0 = Date.now();
const say = (s) => console.log(`[${Math.round((Date.now() - t0) / 1000)}s] ${s}`);

async function one(sc) {
  const shots = (sc.shots ?? []).map((s) => ({ ...s, path: join(ROOT, "scenarios/shots", variant, s.path.replace(/\.png$/, (sc.name.match(/-s\d+$/)?.[0] ?? "") + ".png")) }));
  say(`${sc.name}: start, ${sc.seconds} sim s`);
  const tr = await run({ file, seed: sc.seed, off, seconds: sc.seconds, actions: sc.actions, probes: sc.probes, shots: mode === "record" ? shots : [], onProgress: (s, w) => say(`${sc.name}: sim ${s.toFixed(0)} s, wall ${w.toFixed(0)} s`) });
  const R = tr.rows.map(row);
  const expect = sc.expect.map((e) => { let ok; try { ok = !!e.check(R, tr.rows, tr.probes); } catch (err) { ok = false; } return { label: e.label, pass: ok }; });
  const res = { name: sc.name, seed: sc.seed, issue: sc.issue ?? null, hash: tr.hash, rows: tr.rows.length, wallSeconds: tr.wallSeconds, errors: tr.errors, blocked: tr.blocked, expect, fired: tr.fired ?? [] };
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
}
const bad = results.some((r) => r.errors.length || r.blocked.length || (mode === "compare" && r.golden !== "identical"));
process.exit(bad ? 1 : 0);

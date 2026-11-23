// Motion metrics table from one or more run reports (see tools/runner/metrics.mjs).
//   node scenarios/metrics.mjs scenarios/reports/compare-cpg.json [more reports]
// Columns: dog head, hip and paw jerk p95 (m/s^3), dog and human sliding seconds over moving
// seconds, toggles per second (gait, posture; source), frame ms p50/p95/max. All computed in
// lockstep; frame times are headless SwiftShader and only compare builds on one machine.
import { readFileSync } from "node:fs";

const files = process.argv.slice(2);
if (!files.length) { console.error("usage: metrics.mjs report.json [report.json ...]"); process.exit(2); }
const head = ["scenario", "seed", "pass", "jerk p95 head/hip/paw", "slide dog s", "slide human s", "toggles/s gait, posture, source", "frame ms p50/p95/max"];
const out = [head, head.map(() => "---")];
for (const f of files) {
  for (const r of JSON.parse(readFileSync(f, "utf8")).results) {
    const m = r.metrics;
    const pass = `${r.expect.filter((e) => e.pass).length}/${r.expect.length}`;
    if (!m) { out.push([r.name, r.seed, pass, "-", "-", "-", "-", "-"]); continue; }
    const J = m.jerk, T = m.toggles, F = m.frames;
    out.push([
      r.name, r.seed, pass,
      `${J.dogHead.p95 ?? "-"} / ${J.dogHip.p95 ?? "-"} / ${J.dogPaw.p95 ?? "-"}`,
      `${m.slide.dog.seconds} of ${m.slide.dog.movingSeconds}`,
      `${m.slide.hum.seconds} of ${m.slide.hum.movingSeconds}`,
      `${T.gait.perSecond}, ${T.posture.perSecond}; ${T.src.perSecond}`,
      F ? `${F.frameMs.p50} / ${F.frameMs.p95} / ${F.frameMs.max}` : "-",
    ]);
  }
}
console.log(out.map((r) => "| " + r.join(" | ") + " |").join("\n"));

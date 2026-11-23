// gait-probe: the neural gait on the app rig in lockstep, measured. The brain is replaced by a
// driver that sends the dog round a circle of radius 7 m at each speed in turn; per speed, over
// the last half of its window: the root speed against the speed the motor asked for, and the
// horizontal travel per step of each rig paw the network holds in stance (foot slide).
//   node tools/runner/gait-probe.mjs [file] [--speeds 0.6,1.2,2,3] [--seconds 16] [--seed 7] [--out report.json]
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, open, waitFor } from "./chrome.mjs";

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const file = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--"))) ?? join(ROOT, "dist/dog-simulator.html");
const speeds = opt("speeds", "0.6,1.2,2,3").split(",").map(Number);
const seconds = +opt("seconds", 16), seed = +opt("seed", 7);
const { browser, page } = await open({ url: file, hash: `#test&seed=${seed}&on=L.neural` });
try {
  if (!(await waitFor(page, () => !!window.__sim, null, 240000))) throw new Error("no window.__sim");
  if (!(await page.evaluate(() => window.__hackle.NG.ready))) throw new Error("the network did not load");
  const out = { file: file.startsWith(ROOT) ? file.slice(ROOT.length + 1) : file, seed, seconds, speeds: [] };
  for (const S of speeds) {
    await page.evaluate((S) => {
      const h = window.__hackle, d = h.dog, m = h.motor;
      const P = (window.__probe = { S, cmd: [], got: [], slide: [], host: [], push: 0, src: [], prev: null, n: 0 });
      h.brain.tick = function () {
        const a = Math.atan2(d.pos.x, d.pos.z) + 0.6;
        m.mode = "goto"; m.target.set(Math.sin(a) * 7, 0, Math.cos(a) * 7); m.speed = S; m.stopDist = 0.3; m.face = null;
        P.n++;
        const feet = d.legs.map((l) => [l.foot.x, l.foot.z, l.stance]);
        if (P.prev && h.NG.active) feet.forEach((f, i) => { if (f[2] && P.prev[i][2]) P.slide.push(Math.hypot(f[0] - P.prev[i][0], f[1] - P.prev[i][1])); });
        if (h.NG.active) h.NG.gait.footSlide.forEach((x, i) => { if (h.NG.gait.paws[i].stance) P.host.push(x * h.NR.s); });
        P.prev = feet;
        P.cmd.push(Math.max(d.v, 0)); P.got.push(h.NG.active ? h.NG.speed : NaN); P.src.push(h.NG.active ? 1 : 0);
      };
    }, S);
    await page.evaluate((n) => window.__sim.step(n), Math.round(seconds * 60));
    const r = await page.evaluate(() => {
      const P = window.__probe, half = Math.floor(P.cmd.length / 2);
      const cmd = P.cmd.slice(half), got = P.got.slice(half), src = P.src.slice(half);
      const avg = (a) => a.reduce((x, y) => x + y, 0) / Math.max(a.length, 1);
      const ok = got.map((g, i) => [cmd[i], g]).filter(([, g]) => Number.isFinite(g));
      const s = P.slide.slice(Math.floor(P.slide.length / 2)).sort((a, b) => a - b);
      const q = (p) => (s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0);
      const hs = P.host.slice(Math.floor(P.host.length / 2)).sort((a, b) => a - b);
      return { hostSlideP95mm: 1000 * (hs[Math.floor(0.95 * hs.length)] ?? 0), scale: window.__hackle.NR.s, asked: avg(ok.map((x) => x[0])), got: avg(ok.map((x) => x[1])), networkShare: avg(src), slideP50mm: 1000 * q(0.5), slideP95mm: 1000 * q(0.95), slideMaxmm: 1000 * (s[s.length - 1] ?? 0), stanceSamples: s.length, guidance: window.__hackle.NG.guidance, evalMs: window.__hackle.NG.ms };
    });
    out.speeds.push({ motorSpeed: S, ...r });
    console.log(`motor ${S} m/s: asked ${r.asked.toFixed(3)}, root ${r.got.toFixed(3)} m/s (${(100 * r.got / r.asked).toFixed(1)} percent), network share ${(100 * r.networkShare).toFixed(0)} percent, stance paw slide p50 ${r.slideP50mm.toFixed(1)} p95 ${r.slideP95mm.toFixed(1)} max ${r.slideMaxmm.toFixed(1)} mm per step (host ${r.hostSlideP95mm.toFixed(1)} p95, scale ${r.scale.toFixed(3)}), ${r.guidance}`);
  }
  if (opt("out", "")) writeFileSync(opt("out"), JSON.stringify(out, null, 2) + "\n");
} finally {
  await browser.close();
}

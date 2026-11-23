// Boot check on a built file, real time mode: zero console errors, no
// unrouted requests, and one fetch round trip within 90 sim s (throw, the dog
// picks the ball up, brings it back and drops it within 1.5 m of the human).
//   node tools/runner/boot.mjs [file] [--offline] [--shot out.png]
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { ROOT, open, waitFor } from "./chrome.mjs";

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith("--") && !a.endsWith(".png")) ?? join(ROOT, "dist/hackle-legacy.html");
const offline = argv.includes("--offline");
// without --shot, indexOf gives -1 and argv[0] (the build itself) was overwritten by the screenshot
const shot = argv.includes("--shot") ? argv[argv.indexOf("--shot") + 1] : null;
const t0 = Date.now();
const say = (s) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${s}`);

const { browser, page, log } = await open({ url: file, offline });
const report = { file, chrome: log.version, offline };
try {
  const booted = await waitFor(page, () => !!(window.__hackle && window.__hackle.dog.ready), null, 180000);
  report.booted = !!booted;
  say(`booted ${report.booted}`);
  report.backend = await page.evaluate(() => document.getElementById("chipGpu")?.textContent ?? "unknown");
  await new Promise((r) => setTimeout(r, 4000));
  report.human = await page.evaluate(() => !!window.__hackle?.HUM?.ready);
  // a fresh fetch: the human throws, then follow the ball through the brain
  const stages = { thrown: false, picked: false, dropped: false };
  await page.evaluate(() => { window.__hackle.throwBall(); });
  // real time mode runs slow headless (5 to 20 fps), so the bound is 90 sim s or 15 wall minutes
  const tEnd = Date.now() + 900000;
  let simT = 0;
  while (Date.now() < tEnd && !stages.dropped && simT < 90) {
    const s = await page.evaluate(() => {
      const h = window.__hackle, b = h.ball(), p = b.rb.translation();
      return { cur: h.brain.cur, sub: h.brain.sub, held: !!b.held, hum: !!b.humanHeld, d: Math.hypot(p.x - h.HUM.pos.x, p.z - h.HUM.pos.z), t: h.time(), task: h.HUM.task && h.HUM.task.name, ng: h.NG.active };
    });
    simT = s.t;
    if (!s.hum && !stages.thrown && s.d > 2) { stages.thrown = true; say(`thrown, ball ${s.d.toFixed(1)} m from the human`); }
    if (s.held && !stages.picked) { stages.picked = true; say("dog has the ball"); }
    if (stages.picked && !s.held && s.cur === "fetch" && (s.sub === "wait" || s.sub === "seek")) { stages.dropped = true; report.dropDistance = +s.d.toFixed(2); say(`dropped ${s.d.toFixed(2)} m from the human, sim ${s.t.toFixed(1)} s`); }
    await new Promise((r) => setTimeout(r, 400));
  }
  report.fetch = stages;
  report.fetchOk = stages.picked && stages.dropped && report.dropDistance < 1.5;
  report.simSeconds = await page.evaluate(() => window.__hackle?.time());
  report.neural = await page.evaluate(() => ({ ready: !!window.__hackle?.NG?.ready, active: !!window.__hackle?.NG?.active }));
  if (shot) { mkdirSync(dirname(shot), { recursive: true }); await page.screenshot({ path: shot }); }
} finally {
  report.errors = log.errors;
  report.blocked = log.blocked;
  report.served = log.served.length;
  report.wallSeconds = Math.round((Date.now() - t0) / 1000);
  await browser.close();
}
report.pass = report.booted && report.fetchOk && report.errors.length === 0 && report.blocked.length === 0;
console.log(JSON.stringify(report, null, 2));
if (argv.includes("--report")) writeFileSync(argv[argv.indexOf("--report") + 1], JSON.stringify(report, null, 2) + "\n");
process.exit(report.pass ? 0 : 1);

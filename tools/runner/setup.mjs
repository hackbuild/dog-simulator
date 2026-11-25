// Setup panel smoke on a built file, first visit: the panel opens over the yard as one dialog,
// "eyes and legs" ticks the neural gait and the detector, start runs them (the #stubloads hash
// stands a scripted progress in for each download: no weight request, no permission prompt),
// progress shows in the rows, the panel closes when they finish, and reopened from the bar the
// two rows read on.
//   node tools/runner/setup.mjs [file]
import { join } from "node:path";
import { ROOT, open, waitFor } from "./chrome.mjs";

const file = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? join(ROOT, "dist/dog-simulator-public.html");
const fails = [];
const check = (ok, what) => { console.log(`${ok ? "pass" : "FAIL"} ${what}`); if (!ok) fails.push(what); };
const { browser, page, log } = await open({ url: file, hash: "#stubloads" });
const row = (id) => `(() => { const i = document.querySelector('#setupList [data-cap="${id}"]'); return i ? { checked: i.checked, disabled: i.disabled, note: i.closest('li').querySelector('.srow-note').textContent, bar: !!i.closest('li').querySelector('.bar2') } : null; })()`;
try {
  const shown = await waitFor(page, () => { const s = document.getElementById("setup"); return s && !s.hidden && document.querySelector('[data-ux="setup"][role="dialog"]') ? true : null; }, null, 180000);
  check(!!shown, "the setup panel opens on a first visit, one dialog marked setup");
  const first = await page.evaluate(() => ({ start: document.getElementById("setupStart").textContent, modes: document.querySelectorAll("#setupModes [data-mode]").length, rows: document.querySelectorAll("#setupList [data-cap]").length, pink: [...document.querySelectorAll("#setup button")].filter((b) => b.classList.contains("hb-btn-go")).length }));
  check(first.start === "start, nothing to download" && first.modes === 3 && first.rows >= 10 && first.pink === 1, `three modes, ${first.rows} rows, one pink start: ${first.start}`);
  await page.evaluate(() => document.querySelector('#setupModes [data-mode="eyes"]').click());
  const picked = await page.evaluate(`({ gait: ${row("gait")}, yolo: ${row("yolo")}, start: document.getElementById("setupStart").textContent })`);
  check(picked.gait?.checked && picked.yolo?.checked && /30\.5 MB/.test(picked.start), `eyes and legs ticks the gait and the detector: ${picked.start}`);
  await page.evaluate(() => document.getElementById("setupStart").click());
  const loading = await waitFor(page, `(() => { const g = ${row("gait")}; return g && g.bar && /percent|downloading/.test(g.note) ? g : null; })()`, null, 5000, 100);
  check(!!loading, `progress shows in the rows${loading ? ": " + loading.note : ""}`);
  const closed = await waitFor(page, () => document.getElementById("setup").hidden || null, null, 20000);
  check(!!closed, "the panel closes when the loads finish");
  await page.evaluate(() => document.getElementById("bSetup").click());
  const after = await page.evaluate(`({ gait: ${row("gait")}, yolo: ${row("yolo")} })`);
  check(after.gait?.note === "on" && after.yolo?.note === "on" && after.gait.disabled, "reopened from the bar, the two rows read on");
  await page.keyboard.press("Escape");
  check(await page.evaluate(() => document.getElementById("setup").hidden), "escape closes it");
} finally {
  await browser.close();
}
check(log.errors.length === 0, `no console errors${log.errors.length ? ": " + log.errors.slice(0, 2).join(" | ") : ""}`);
check(log.blocked.length === 0, `no unrouted requests${log.blocked.length ? ": " + log.blocked.slice(0, 2).join(" ") : ""}`);
check(!log.served.some((u) => /\.(onnx|bin)(\?|$)|quadruped|huggingface/.test(String(u.url ?? u))), "no weight file served");
console.log(`setup smoke: ${fails.length ? fails.length + " failed" : "pass"}`);
process.exit(fails.length ? 1 : 0);

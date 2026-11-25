// Train tab smoke on a built file: the train tab is in the rack, its associations table is in
// the page and filled (a row per cue, a cell per act and the attention column) without opening
// anything, and a typed cue adds its own row with the dog's link strengths and a last trial line.
// No weights: the run fails on any request that has no local route, and on any model file served.
//   node tools/runner/train.mjs [file]
import { join } from "node:path";
import { ROOT, open, waitFor } from "./chrome.mjs";

const file = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? join(ROOT, "dist/dog-simulator-public.html");
const fails = [];
const check = (ok, what) => { console.log(`${ok ? "pass" : "FAIL"} ${what}`); if (!ok) fails.push(what); };
const { browser, page, log } = await open({ url: file });
try {
  check(!!(await waitFor(page, () => !!(window.__hackle && window.__hackle.dog.ready), null, 180000)), "the yard boots");
  const tab = await page.evaluate(() => { const t = document.getElementById("tab-train"); if (t) t.click(); return t ? { text: t.textContent.trim(), sel: t.getAttribute("aria-selected") } : null; });
  check(tab && tab.text === "train" && tab.sel === "true", "the train tab is in the rack and opens");
  const before = await page.evaluate(() => {
    const t = document.getElementById("heat"), pane = document.getElementById("pTrain");
    return { inPane: !!(t && pane.contains(t) && !t.closest("details")), shown: !!(t && t.getBoundingClientRect().height > 0), rows: t ? t.tBodies[0]?.rows.length ?? 0 : 0, cols: t ? t.tHead?.rows[0]?.cells.length ?? 0 : 0 };
  });
  check(before.inPane && before.shown, "the associations table is open in train, not in a fold");
  check(before.rows > 0 && before.cols >= 10, `the table is filled: ${before.rows} cues by ${before.cols - 1} columns`);
  // a new word, typed as a visitor would
  await page.evaluate(() => { const i = document.getElementById("cueIn"); i.value = "boop"; i.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
  const after = await waitFor(page, () => {
    const row = [...document.querySelectorAll("#heat tbody tr")].find((r) => r.cells[0].textContent.trim() === "boop");
    return row ? { cells: row.cells.length, nums: [...row.cells].slice(1).every((c) => /^\d+$/.test(c.textContent.trim())) } : null;
  }, null, 20000);
  check(!!after, "a typed cue adds its row to the table");
  check(!!after && after.cells === before.cols && after.nums, "the new row has a number in every act and in attn");
  const trial = await waitFor(page, () => /boop/.test(document.getElementById("lastTrial").textContent), null, 10000);
  check(!!trial, "the last trial line names the cue");
} finally {
  await browser.close();
}
check(log.errors.length === 0, `no console errors${log.errors.length ? ": " + log.errors.slice(0, 2).join(" | ") : ""}`);
check(log.blocked.length === 0, `no unrouted requests${log.blocked.length ? ": " + log.blocked.slice(0, 2).join(" ") : ""}`);
check(!log.served.some((u) => /\.(onnx|bin)(\?|$)|quadruped|huggingface/.test(String(u.url ?? u))), "no weight file served");
console.log(`train smoke: ${fails.length ? fails.length + " failed" : "pass"}`);
process.exit(fails.length ? 1 : 0);

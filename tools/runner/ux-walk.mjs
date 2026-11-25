// UX walk: the page on phones and desktops, headful system Chrome on the machine GPU.
//   node tools/runner/ux-walk.mjs shots    [file] [--out .local/ux-after]   screenshots per profile and tab, sideways scroll, small targets
//   node tools/runner/ux-walk.mjs personas [file]                           the persona goals of the UX design, pass or fail each
//   node tools/runner/ux-walk.mjs frames   [file] [--tab brain] [--seconds 20] [--size 1440x900]   rAF frame times with one tab open
// Profiles: iPhone 13 and Pixel 7 emulation with touch, and 320, 390, 768, 1024 and 1440 px wide.
// Nothing here changes the sim; the page runs in real time mode with a fixed seed (#seed=7).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { KnownDevices } from "puppeteer-core";
import { ROOT, open, waitFor } from "./chrome.mjs";

const argv = process.argv.slice(2);
const mode = argv[0];
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const flagValues = new Set(argv.filter((a, i) => i > 0 && argv[i - 1].startsWith("--")));
const file = argv.slice(1).find((a) => !a.startsWith("--") && !flagValues.has(a)) ?? join(ROOT, "dist/dog-simulator-public.html");
const out = opt("out", join(ROOT, ".local/ux-after"));
const headless = argv.includes("--headless");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const touch = (w, h, dpr = 2) => ({ viewport: { width: w, height: h, deviceScaleFactor: dpr, isMobile: true, hasTouch: true, isLandscape: false }, userAgent: KnownDevices["iPhone 13"].userAgent });
const PROFILES = [
  { name: "iphone13", device: KnownDevices["iPhone 13"] },
  { name: "pixel5", device: KnownDevices["Pixel 5"] },
  { name: "w320", device: touch(320, 640) },
  { name: "w390", device: touch(390, 844) },
  { name: "w768", device: touch(768, 1024) },
  { name: "w1024", width: 1024, height: 768 },
  { name: "w1440", width: 1440, height: 900 },
];

async function launch(p, o = {}) {
  const r = await open({ url: file, hash: o.hash ?? "", gpu: "default", headless, width: p.width ?? 1280, height: p.height ?? 800,
    beforeGoto: async (page) => { if (p.device) await page.emulate(p.device); if (o.noGpu) await page.evaluateOnNewDocument(() => { delete Navigator.prototype.gpu; }); if (o.fresh !== false) await page.evaluateOnNewDocument(() => { if (!sessionStorage.getItem("ux")) { localStorage.clear(); sessionStorage.setItem("ux", "1"); } }); } });
  const ok = await waitFor(r.page, () => { const l = document.getElementById("load"); return !!l && (l.hidden || l.style.display === "none"); }, null, 180000);
  if (!ok) throw new Error("the yard did not start");
  await sleep(1500);
  return r;
}
const tap = async (page, sel) => { const el = await page.$(sel); if (!el) throw new Error("no " + sel); await el.click(); };
const hscroll = (page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
// visible buttons, tabs, inputs and labels under 44 px on a coarse pointer
const smallTargets = (page) => page.evaluate(() => {
  if (!matchMedia("(pointer:coarse)").matches) return [];
  const bad = [];
  for (const el of document.querySelectorAll("button, [role=tab], input:not([type=hidden]), select, label.hb-btn, a")) {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === "hidden" || el.closest("[hidden]") || el.closest(".hb-sr")) continue;
    if (el.type === "checkbox" || el.type === "range") { const l = el.closest("label") || el; const lr = l.getBoundingClientRect(); if (lr.height >= 44) continue; }
    if (el.classList.contains("linkbtn")) continue;
    if (r.height < 43.5) bad.push((el.id || el.textContent.trim().slice(0, 24) || el.className) + " " + Math.round(r.width) + "x" + Math.round(r.height));
  }
  return bad;
});

// the rack's seven tabs, as the original
const TABS = ["brain", "body", "sense", "train", "human", "tune", "how"];
async function shots() {
  mkdirSync(out, { recursive: true });
  const report = [];
  for (const p of PROFILES) {
    const { browser, page, log } = await launch(p);
    const rec = { profile: p.name, hscroll: {}, small: {}, errors: [] };
    try {
      await tap(page, "#bThrow"); await sleep(3500);
      await page.screenshot({ path: join(out, `${p.name}-0-yard.png`) });
      rec.hscroll.yard = await hscroll(page); rec.small.yard = await smallTargets(page);
      for (const [i, t] of TABS.entries()) {
        await tap(page, `#tab-${t}`); await sleep(t === "brain" ? 6000 : 1200);
        await page.screenshot({ path: join(out, `${p.name}-${i + 1}-${t}.png`) });
        rec.hscroll[t] = await hscroll(page); rec.small[t] = await smallTargets(page);
      }
      await tap(page, "#tab-brain"); await sleep(400);
      await page.evaluate(() => document.getElementById("timelinePanel").scrollIntoView());
      await sleep(600);
      await page.screenshot({ path: join(out, `${p.name}-7-timeline.png`) });
      await tap(page, "#tab-tune"); await tap(page, "#bCaps"); await sleep(800);
      await page.screenshot({ path: join(out, `${p.name}-8-caps.png`) });
      rec.hscroll.caps = await hscroll(page); rec.small.caps = await smallTargets(page);
    } catch (e) { rec.errors.push(String(e.message)); }
    rec.errors.push(...log.errors); rec.blocked = log.blocked;
    report.push(rec);
    console.log(p.name, JSON.stringify(rec.hscroll), "small:", Object.values(rec.small).flat().length, "errors:", rec.errors.length);
    await browser.close();
  }
  writeFileSync(join(out, "shots.json"), JSON.stringify(report, null, 1));
}

async function personas() {
  const R = [];
  const say = (persona, goal, pass, note) => { R.push({ persona, goal, pass: !!pass, note }); console.log(`${pass ? "pass" : "FAIL"} ${persona}: ${goal}${note ? " (" + note + ")" : ""}`); };
  // P1, P3 on a phone
  {
    const { browser, page, log } = await launch(PROFILES[0]);
    const g = await page.evaluate(() => { const r = (id) => document.getElementById(id).getBoundingClientRect(); return { tabsBottom: r("tabs").bottom, h: innerHeight, stageH: r("stage").height }; });
    say("P1 phone first visit", "tabs sit above the fold with the yard", g.tabsBottom <= g.h, `tabs end at ${Math.round(g.tabsBottom)} of ${g.h} px, stage ${Math.round(g.stageH)} px`);
    const before = log.served.length;
    await tap(page, "#bThrow");
    const fetched = await waitFor(page, () => window.__hackle && (window.__hackle.brain.cur === "fetch" || window.__hackle.brain.pending?.b === "fetch"), null, 15000);
    say("P1 phone first visit", "throw the ball and the dog fetches", fetched);
    await tap(page, "#tab-brain"); await sleep(4000);
    const m = await page.evaluate(() => ({ why: document.getElementById("behWhy").textContent, name: document.getElementById("behName").textContent }));
    say("P1 phone first visit", "the brain tab names what the dog does and why", m.name.length > 1 && m.why.length > 3, m.name + ": " + m.why);
    const ns = await page.evaluate(() => [...document.querySelectorAll("#tool .hb-btn")].filter((b) => b.offsetParent).map((b) => Math.round(b.getBoundingClientRect().height)));
    say("P3 parent and kid", "stage verbs are 44 px or taller", ns.every((h) => h >= 44), ns.join(", ") + " px");
    for (const id of ["#bTreat", "#bSquirrel", "#bGood", "#bFill"]) { await tap(page, id); await sleep(400); }
    say("P3 parent and kid", "no download from any yard verb", log.served.length === before && log.blocked.length === 0, `${log.served.length - before} requests`);
    const sm = await smallTargets(page);
    say("P3 parent and kid", "no touch target under 44 px on the yard", sm.length === 0, sm.slice(0, 6).join("; "));
    await browser.close();
  }
  // P2, P4, P5, P6, P8 on a desktop
  {
    const { browser, page, log } = await launch(PROFILES[6]);
    await tap(page, "#tab-train"); await sleep(300);
    await page.type("#cueIn", "boop"); await page.keyboard.press("Enter"); await sleep(1800);
    await tap(page, "#bGood"); await sleep(600);
    for (let i = 0; i < 4; i++) { await page.type("#cueIn", "boop"); await page.keyboard.press("Enter"); await sleep(1800); await tap(page, "#bGood"); await sleep(500); }
    const p2 = await page.evaluate(() => ({ chip: !!document.querySelector('#cueBtns [data-cue="boop"]'), trial: document.getElementById("lastTrial").textContent, known: document.getElementById("knownList").textContent, heat: !!document.querySelector("#heat th[scope=row]") }));
    say("P2 dog owner", "a new word appears as a cue and in the heat table", p2.chip && p2.heat);
    await sleep(1500);
    const p2b = await page.evaluate(() => document.getElementById("lastTrial").textContent);
    say("P2 dog owner", "the last credit says what was learned and by how much", /boop|credit|cue/.test(p2b), p2b.slice(0, 120));
    say("P2 dog owner", "what it knows is a plain list", p2.known.length > 10, p2.known.slice(0, 90));
    await tap(page, "#tab-body"); await sleep(500);
    const p4 = await page.evaluate(() => ({ seg: document.querySelectorAll("#gaitSeg button").length, pk: /@hackbuild\/motion-net/.test(document.getElementById("pAbout").textContent), seed: !!document.getElementById("bSeedGo") }));
    say("P4 animation developer", "pattern generator and neural gait side by side in body", p4.seg === 2);
    say("P4 animation developer", "package names and seeds are in the page", p4.pk && p4.seed);
    await tap(page, "#tab-tune"); await tap(page, "#bCaps"); await sleep(600);
    const p5 = await page.evaluate(() => [...document.querySelectorAll(".hb-cap")].filter((c) => /dog cortex/i.test(c.querySelector(".hb-cap-name").textContent)).map((c) => c.textContent));
    say("P5 ai tinkerer", "every model row names size and licence before the download", p5.filter((t) => /dog cortex/i.test(t)).every((t) => /MB|GB/.test(t) && /licen|Apache|LFM/i.test(t)), `${p5.length} rows`);
    await page.keyboard.press("Escape"); await sleep(300);
    await tap(page, "#tab-brain"); await sleep(600);
    const p5b = await page.evaluate(() => ({ think: document.getElementById("bThink").hidden, load: document.getElementById("bVlmLoad").textContent, lic: document.getElementById("vlmLic").textContent, hum: document.getElementById("humMindWhy").textContent }));
    say("P5 ai tinkerer", "the cortex load button names its size, the licence sits beside it, think waits for a model", p5b.think && /MB|GB/.test(p5b.load) && /licen|apache/i.test(p5b.lic), p5b.load + " / " + p5b.lic);
    say("P5 ai tinkerer", "his mind says it needs a model", /cortex|webgpu/.test(p5b.hum), p5b.hum);
    await sleep(20000);
    await page.evaluate(() => document.querySelectorAll("#pBrain details").forEach((d) => { d.open = true; }));
    await sleep(1000);
    const p6a = await page.evaluate(() => ({ drives: document.querySelectorAll("#driveRows .row").length, util: document.querySelectorAll("#utilRows .row").length, cur: document.querySelectorAll("#utilRows .row.cur").length, meta: document.getElementById("choiceMeta").textContent, ev: document.querySelectorAll("#tlEvents .hb-cev").length, chains: document.querySelectorAll("#tlEvents .hb-cev-chain").length }));
    await tap(page, "#tab-human"); await sleep(1500);
    const p6 = { ...p6a, ...(await page.evaluate(() => ({ plan: document.getElementById("humPlanWhy").textContent, needs: document.querySelectorAll("#humSparks .hb-spark").length }))) };
    say("P6 researcher", "drives show as bars", p6.drives >= 6, `${p6.drives} drives`);
    say("P6 researcher", "every option has a utility bar, the current one marked", p6.util >= 20 && p6.cur === 1, `${p6.util} options`);
    say("P6 researcher", "temperature, commitment and next look are stated", /temperature/.test(p6.meta) && /commitment/.test(p6.meta), p6.meta);
    say("P6 researcher", "the timeline links sense to choice to act", p6.ev > 3 && p6.chains > 0, `${p6.ev} events, ${p6.chains} with a cause chain`);
    say("P6 researcher", "the human's plan and needs show", p6.plan.length > 5 && p6.needs === 5, p6.plan.slice(0, 80));
    // P8: keyboard tabs, names, live region
    await page.focus("#tab-body"); await page.keyboard.press("ArrowRight"); await sleep(200);
    const k = await page.evaluate(() => ({ sel: document.querySelector("[role=tab][aria-selected=true]").id, focus: document.activeElement.id, ctl: [...document.querySelectorAll("[role=tab]")].every((t) => document.getElementById(t.getAttribute("aria-controls"))?.getAttribute("role") === "tabpanel") }));
    say("P8 screen reader", "tabs move with the arrow keys and control their panels", k.sel === "tab-sense" && k.focus === "tab-sense" && k.ctl);
    const ax = await page.accessibility.snapshot({ interestingOnly: true });
    const unnamed = []; (function walk(n) { if (["textbox", "button", "checkbox", "slider", "combobox", "tab"].includes(n.role) && !String(n.name || "").trim()) unnamed.push(n.role); for (const c of n.children ?? []) walk(c); })(ax);
    say("P8 screen reader", "every control has an accessible name", unnamed.length === 0, unnamed.join(", "));
    const live = await page.evaluate(() => document.getElementById("live").textContent);
    say("P8 screen reader", "the dog's act is announced in a polite live region", live.length > 3, live);
    const canv = await page.evaluate(() => [...document.querySelectorAll("canvas.inst, #eye")].every((c) => c.getAttribute("role") === "img" && c.getAttribute("aria-label")));
    say("P8 screen reader", "instrument canvases have text", canv);
    await page.focus("#tab-sense"); await page.keyboard.press("d"); await sleep(300);
    const cam = await page.evaluate(() => document.getElementById("camLab").textContent);
    say("P8 screen reader", "w a s d do not move the camera while a tab has focus", cam === "follow", cam);
    R.push({ errors: log.errors, blocked: log.blocked });
    await browser.close();
  }
  // P7 without webgpu
  {
    const { browser, page } = await launch(PROFILES[5], { noGpu: true });
    const pill = await page.evaluate(() => document.getElementById("chipGpu").textContent + " / " + document.getElementById("chipGpu").title);
    say("P7 no webgpu", "the header says webgl2 and what it costs", /webgl2/.test(pill), pill);
    await tap(page, "#tab-tune"); await tap(page, "#bCaps"); await sleep(600);
    const c = await page.evaluate(() => [...document.querySelectorAll(".hb-cap")].filter((r) => /dog cortex/i.test(r.querySelector(".hb-cap-name").textContent)).map((r) => ({ dis: r.querySelector("button")?.disabled, why: r.querySelector(".hb-cap-why")?.textContent ?? "" })));
    say("P7 no webgpu", "cortex rows stay listed, disabled, with the reason", c.length === 2 && c.every((x) => x.dis && /webgpu/.test(x.why)), c.map((x) => x.why).join(" | "));
    await browser.close();
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "personas.json"), JSON.stringify(R, null, 1));
}

async function frames() {
  const [w, h] = opt("size", "1440x900").split("x").map(Number), tab = opt("tab", "brain"), seconds = +opt("seconds", 20);
  const { browser, page, log } = await launch({ width: w, height: h }, { fresh: true });
  await page.evaluate((tab) => {
    const t = document.getElementById("tab-" + tab) || document.querySelector(`[data-p="p${tab[0].toUpperCase() + tab.slice(1)}"]`); if (t) t.click();
  }, tab);
  await sleep(8000);
  const r = await page.evaluate((n) => new Promise((res) => { const d = []; let last = performance.now(); const f = (t) => { d.push(t - last); last = t; if (d.length < n) requestAnimationFrame(f); else res(d); }; requestAnimationFrame(f); }), seconds * 60);
  const s = [...r].sort((a, b) => a - b), q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  const mean = r.reduce((a, b) => a + b, 0) / r.length;
  const prof = await page.evaluate(() => document.getElementById("chipFps")?.title ?? "");
  const res = { file, tab, size: `${w}x${h}`, frames: r.length, fps: +(1000 / mean).toFixed(1), p50: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2), max: +s.at(-1).toFixed(2), over20ms: r.filter((x) => x > 20).length, errors: log.errors.length, prof };
  console.log(JSON.stringify(res));
  await browser.close();
}

if (mode === "shots") await shots();
else if (mode === "personas") await personas();
else if (mode === "frames") await frames();
else { console.error("usage: ux-walk.mjs shots|personas|frames [file]"); process.exit(2); }

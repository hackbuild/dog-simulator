import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import { createHash } from "node:crypto";
// src/routes.ts
const TYPES = {
	js: "text/javascript",
	mjs: "text/javascript",
	wasm: "application/wasm",
	json: "application/json",
	css: "text/css",
	html: "text/html",
	woff2: "font/woff2",
	woff: "font/woff",
	png: "image/png",
	jpg: "image/jpeg",
	glb: "model/gltf-binary",
	onnx: "application/octet-stream",
	bin: "application/octet-stream"
};
const contentTypeOf = (path) => TYPES[path.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
const verified = /* @__PURE__ */ new Map();
function sha256File(path) {
	let h = verified.get(path);
	if (!h) {
		h = createHash("sha256").update(readFileSync(path)).digest("hex");
		verified.set(path, h);
	}
	return h;
}
/** Resolves a hit to bytes, checking the pin. Throws on a missing file or a hash mismatch. */
function serve(hit) {
	if (hit.body !== void 0) return {
		body: hit.body,
		contentType: hit.contentType ?? "application/octet-stream"
	};
	if (!hit.file) throw new Error("route hit has neither file nor body");
	if (!existsSync(hit.file)) throw new Error(`pinned file missing: ${hit.file}`);
	if (hit.sha256 && sha256File(hit.file) !== hit.sha256.toLowerCase()) throw new Error(`pinned file does not match its sha256: ${hit.file}`);
	return {
		body: readFileSync(hit.file),
		contentType: hit.contentType ?? contentTypeOf(hit.file)
	};
}
/**
* npm CDN URLs (cdn.jsdelivr.net/npm, unpkg.com) served from a local
* node_modules, only when the installed version equals the requested one.
*/
function npmCdn(nodeModules) {
	return (u) => {
		let rest = null;
		if (u.hostname === "cdn.jsdelivr.net" && u.pathname.startsWith("/npm/")) rest = u.pathname.slice(5);
		else if (u.hostname === "unpkg.com") rest = u.pathname.slice(1);
		if (!rest) return null;
		const m = /^((?:@[^/]+\/)?[^@/]+)@([^/]+)\/(.*)$/.exec(decodeURIComponent(rest));
		if (!m) return null;
		const [, name, ver, path] = m;
		const pj = join(nodeModules, name, "package.json");
		if (!existsSync(pj) || JSON.parse(readFileSync(pj, "utf8")).version !== ver) return null;
		const f = join(nodeModules, name, path);
		return existsSync(f) ? { file: f } : null;
	};
}
/** Exact URLs pinned to local files with hashes, as in an assets lock. */
function pinned(entries, root = ".") {
	const byUrl = new Map(entries.map((e) => [e.url, e]));
	return (u) => {
		const e = byUrl.get(u.href) ?? byUrl.get(`${u.origin}${u.pathname}`);
		return e ? {
			file: join(root, e.file),
			sha256: e.sha256
		} : null;
	};
}
/** Google Fonts stylesheet requests answered with a fixed body (fonts then go through other routes). */
function fixedBody(match, body, contentType) {
	return (u) => match(u) ? {
		body,
		contentType
	} : null;
}
// src/chrome.ts
const CHROME_MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CANDIDATES = [
	CHROME_MAC,
	"/usr/bin/google-chrome",
	"/usr/bin/google-chrome-stable",
	"/usr/bin/chromium",
	"/usr/bin/chromium-browser"
];
/** The first Chrome found, or null. `HB_CHROME` overrides. */
function findChrome() {
	const env = process.env.HB_CHROME;
	if (env && existsSync(env)) return env;
	return CANDIDATES.find((p) => existsSync(p)) ?? null;
}
const DEFAULT_ARGS = [
	"--autoplay-policy=no-user-gesture-required",
	"--mute-audio",
	"--allow-file-access-from-files"
];
/**
* Software GL, the same on every machine; for lockstep runs. Under these
* flags headless Chrome 150 on macOS 12 ran 0 to 1 animation frames per
* second (measured 2026-11-22), so real frame rate runs use `gpu: "default"`.
*/
const SWIFTSHADER_ARGS = [
	"--use-angle=swiftshader",
	"--enable-unsafe-swiftshader",
	"--ignore-gpu-blocklist",
	"--enable-unsafe-webgpu"
];
async function open(o) {
	const chrome = o.chrome ?? findChrome();
	if (!chrome) throw new Error("no chrome found. set HB_CHROME to the browser binary.");
	const browser = await puppeteer.launch({
		executablePath: chrome,
		headless: o.headless ?? true,
		args: [
			...DEFAULT_ARGS,
			...(o.gpu ?? "swiftshader") === "swiftshader" ? SWIFTSHADER_ARGS : [],
			...o.args ?? []
		],
		defaultViewport: {
			width: o.width ?? 420,
			height: o.height ?? 280
		}
	});
	const page = await browser.newPage();
	const log = {
		errors: [],
		warnings: [],
		blocked: [],
		served: [],
		version: await browser.version()
	};
	page.on("pageerror", (e) => log.errors.push(`pageerror: ${String(e.message ?? e).slice(0, 400)}`));
	page.on("console", (m) => {
		const t = m.type();
		const text = m.text().slice(0, 400);
		if (t === "error") log.errors.push(`console: ${text}`);
		else if (t === "warn") log.warnings.push(text);
	});
	await page.setRequestInterception(true);
	page.on("request", (req) => {
		const url = req.url();
		if (url.startsWith("file:") || url.startsWith("data:") || url.startsWith("blob:")) return void req.continue();
		if (o.offline) {
			log.blocked.push(url);
			req.abort("internetdisconnected");
			return;
		}
		try {
			const u = new URL(url);
			for (const r of o.routes ?? []) {
				const hit = r(u);
				if (!hit) continue;
				const s = serve(hit);
				log.served.push(url);
				req.respond({
					status: 200,
					headers: {
						"access-control-allow-origin": "*",
						"cross-origin-resource-policy": "cross-origin"
					},
					contentType: s.contentType,
					body: typeof s.body === "string" ? s.body : Buffer.from(s.body)
				});
				return;
			}
		} catch (e) {
			log.errors.push(`route: ${e.message}`);
		}
		log.blocked.push(url);
		req.abort("blockedbyclient");
	});
	if (o.beforeGoto) await o.beforeGoto(page);
	const target = /^[a-z]+:/.test(o.url) ? o.url : pathToFileURL(resolve(o.url)).href;
	await page.goto(target + (o.hash ?? ""), {
		waitUntil: "load",
		timeout: o.timeoutMs ?? 12e4
	});
	return {
		browser,
		page,
		log,
		close: () => browser.close()
	};
}
/** Polls a page condition until it is truthy or the time runs out (null). */
async function waitFor(page, expr, timeoutMs, everyMs = 250) {
	const t0 = Date.now();
	for (;;) {
		const v = await page.evaluate(expr);
		if (v) return v;
		if (Date.now() - t0 > timeoutMs) return null;
		await new Promise((r) => setTimeout(r, everyMs));
	}
}
// src/lockstep.ts
const bound = (handle, body) => `(() => { const h = ${handle}; ${body} })()`;
/** Runs one scenario on an open page whose test API is ready. */
async function runLockstep(page, sc, o = {}) {
	const sps = o.stepsPerSecond ?? 60;
	const api = o.api ?? "window.__sim";
	const handle = o.handle ?? api;
	const whenEvery = o.whenEvery ?? 15;
	const t0 = Date.now();
	const total = Math.round(sc.seconds * sps);
	const whens = (sc.actions ?? []).filter((a) => a.when);
	const events = [...(sc.actions ?? []).filter((a) => !a.when).map((a) => ({
		step: Math.round((a.at ?? 0) * sps),
		kind: "action",
		js: a.js
	})), ...(sc.shots ?? []).map((s) => ({
		step: Math.round(s.at * sps),
		kind: "shot",
		...s.js ? { js: s.js } : {},
		path: s.path
	}))].sort((a, b) => a.step - b.step);
	const probes = (sc.probes ?? []).map((p) => ({
		...p,
		n: Math.max(1, Math.round(p.every * sps))
	}));
	const out = {
		rows: [],
		probes: [],
		fired: [],
		wallSeconds: 0
	};
	let done = 0;
	let lastLog = Date.now();
	while (done < total) {
		while (events.length && events[0].step <= done) {
			const e = events.shift();
			if (e.js) await page.evaluate(bound(handle, e.js));
			if (e.kind === "shot" && e.path) {
				await page.evaluate(`(() => { const a = ${api}; if (a.render) a.render(); })()`);
				mkdirSync(dirname(e.path), { recursive: true });
				await page.screenshot({ path: e.path });
			}
		}
		let n = Math.min(o.chunk ?? 30, total - done);
		if (events.length) n = Math.min(n, Math.max(1, events[0].step - done));
		for (const p of probes) n = Math.min(n, p.n - done % p.n);
		if (whens.length) n = Math.min(n, whenEvery - done % whenEvery);
		await page.evaluate(`${api}.step(${n})`);
		done += n;
		if (whens.length && done % whenEvery === 0) for (let i = 0; i < whens.length; i++) {
			const w = whens[i];
			if (await page.evaluate(bound(handle, `return !!(${w.when});`))) {
				await page.evaluate(bound(handle, w.js));
				out.fired.push([done, w.when]);
				whens.splice(i--, 1);
			}
		}
		for (const p of probes) if (done % p.n === 0) out.probes.push([done, await page.evaluate(bound(handle, `return (${p.js});`))]);
		if (o.onProgress && Date.now() - lastLog > 15e3) {
			lastLog = Date.now();
			o.onProgress(done / sps, (Date.now() - t0) / 1e3);
		}
	}
	const tr = await page.evaluate(`${api}.trace()`);
	out.rows = tr.rows;
	if (tr.cols) out.cols = tr.cols;
	if (tr.hash !== void 0) out.hash = tr.hash;
	out.wallSeconds = (Date.now() - t0) / 1e3;
	return out;
}
/** First differing row between two traces, or null when identical. */
function diffTraces(a, b) {
	const n = Math.max(a.rows.length, b.rows.length);
	for (let i = 0; i < n; i++) if (JSON.stringify(a.rows[i]) !== JSON.stringify(b.rows[i])) return {
		row: i,
		a: a.rows[i] ?? null,
		b: b.rows[i] ?? null
	};
	if (a.hash !== b.hash) return {
		row: n,
		a: a.hash ?? null,
		b: b.hash ?? null
	};
	return null;
}
/** Runs a scenario list, records or compares goldens, returns a report. */
async function runSuite(o) {
	const api = o.api ?? "window.__sim";
	const results = [];
	const traces = {};
	let chrome = "unknown";
	const queue = [...o.scenarios];
	const one = async (sc) => {
		const oo = {
			url: o.file,
			hash: `#test&seed=${sc.seed}${sc.hash ? `&${sc.hash}` : ""}`,
			routes: o.routes ?? [],
			offline: o.offline ?? false,
			width: o.width ?? 420,
			height: o.height ?? 280
		};
		if (o.chrome) oo.chrome = o.chrome;
		const { page, log, close } = await open(oo);
		chrome = log.version;
		const res = {
			name: sc.name,
			seed: sc.seed,
			checks: [],
			errors: log.errors,
			blocked: log.blocked
		};
		try {
			if (!await waitFor(page, `!!(${api})`, o.readyMs ?? 24e4)) throw new Error(`no ${api} after ${(o.readyMs ?? 24e4) / 1e3} s`);
			const tr = await runLockstep(page, sc, o);
			traces[sc.name] = tr;
			res.checks = sc.checks ? sc.checks(tr) : [];
			if (o.goldenDir && o.mode !== "check") {
				const gp = join(o.goldenDir, `${sc.name}.json`);
				if (o.mode === "record") {
					mkdirSync(o.goldenDir, { recursive: true });
					writeFileSync(gp, `${JSON.stringify({
						name: sc.name,
						seed: sc.seed,
						seconds: sc.seconds,
						chrome: log.version,
						hash: tr.hash ?? null,
						cols: tr.cols ?? null,
						rows: tr.rows,
						probes: tr.probes,
						fired: tr.fired
					})}\n`);
					res.golden = "recorded";
				} else if (!existsSync(gp)) res.golden = "missing";
				else {
					const d = diffTraces(JSON.parse(readFileSync(gp, "utf8")), tr);
					res.golden = d ? "differs" : "identical";
					if (d) res.firstDifference = d;
				}
			}
		} catch (e) {
			res.errors.push(`runner: ${e.message}`);
		} finally {
			await close();
		}
		results.push(res);
	};
	await Promise.all(Array.from({ length: Math.min(o.jobs ?? 2, queue.length) }, async () => {
		while (queue.length) await one(queue.shift());
	}));
	results.sort((a, b) => o.scenarios.findIndex((s) => s.name === a.name) - o.scenarios.findIndex((s) => s.name === b.name));
	return {
		date: o.date ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
		chrome,
		results,
		traces
	};
}
// src/metrics.ts
/** Percentile by nearest rank on a sorted copy. */
function percentile(xs, p) {
	if (!xs.length) return NaN;
	const s = [...xs].sort((a, b) => a - b);
	return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p / 100 * s.length) - 1))];
}
function stats(xs) {
	if (!xs.length) return {
		n: 0,
		mean: NaN,
		p50: NaN,
		p95: NaN,
		max: NaN
	};
	let sum = 0;
	let max = Number.NEGATIVE_INFINITY;
	for (const x of xs) {
		sum += x;
		if (x > max) max = x;
	}
	return {
		n: xs.length,
		mean: sum / xs.length,
		p50: percentile(xs, 50),
		p95: percentile(xs, 95),
		max
	};
}
/** Frame time p50, p95 and max in ms from frame durations. */
function frameStats(ms) {
	return stats(ms);
}
/**
* Jerk magnitudes (m/s^3) from positions sampled every `dt` seconds: the
* third difference of position over dt^3. Points may be 2D or 3D.
*/
function jerk(points, dt) {
	const out = [];
	for (let i = 3; i < points.length; i++) {
		const a = points[i];
		const b = points[i - 1];
		const c = points[i - 2];
		const d = points[i - 3];
		let s = 0;
		for (let k = 0; k < a.length; k++) {
			const j = (a[k] - 3 * b[k] + 3 * c[k] - d[k]) / (dt * dt * dt);
			s += j * j;
		}
		out.push(Math.sqrt(s));
	}
	return out;
}
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
/**
* Sliding: the body faces one way and moves another. `yaw` 0 is +Z,
* positions are (x, z). Samples below `minSpeed` m/s do not count.
*/
function sliding(points, yaw, dt, threshold = .6, minSpeed = .15) {
	let slide = 0;
	let moving = 0;
	for (let i = 1; i < points.length; i++) {
		const p = points[i];
		const q = points[i - 1];
		const dx = p[0] - q[0];
		const dz = p[1] - q[1];
		if (Math.hypot(dx, dz) / dt < minSpeed) continue;
		moving++;
		if (Math.abs(wrap(Math.atan2(dx, dz) - yaw[i])) > threshold) slide++;
	}
	return {
		seconds: slide * dt,
		share: moving ? slide / moving : 0,
		moving
	};
}
/** State changes per second over a sampled label series. */
function togglesPerSecond(states, dt) {
	if (states.length < 2) return 0;
	let n = 0;
	for (let i = 1; i < states.length; i++) if (states[i] !== states[i - 1]) n++;
	return n / ((states.length - 1) * dt);
}
/**
* Seconds where an agent with a goal moved under `dist` m over the
* previous `window` s (the hackle-plan stall detector, 0.2 m in 2 s).
*/
function stallSeconds(points, hasGoal, dt, window = 2, dist = .2) {
	const k = Math.max(1, Math.round(window / dt));
	let s = 0;
	for (let i = k; i < points.length; i++) {
		if (!hasGoal[i]) continue;
		const p = points[i];
		const q = points[i - k];
		if (Math.hypot(p[0] - q[0], p[1] - q[1]) < dist) s += dt;
	}
	return s;
}
// src/profiler.ts
function createProfiler(clock) {
	const entries = {};
	let t = clock();
	return {
		entries,
		begin() {
			t = clock();
		},
		mark(label) {
			const now = clock();
			const d = now - t;
			t = now;
			const e = entries[label] ?? (entries[label] = {
				total: 0,
				max: 0,
				n: 0
			});
			e.total += d;
			e.n++;
			if (d > e.max) e.max = d;
		},
		report() {
			return Object.entries(entries).map(([label, e]) => ({
				label,
				avg: e.n ? e.total / e.n : 0,
				max: e.max,
				n: e.n
			})).sort((a, b) => b.max - a.max);
		},
		reset() {
			for (const k of Object.keys(entries)) delete entries[k];
			t = clock();
		}
	};
}
// src/raf.ts
const SOURCE = `(() => {
  const s = { frames: [], samples: [], max: 20000, on: true };
  window.__raf = s;
  let last = 0;
  const tick = (t) => {
    if (last) { s.frames.push(t - last); if (s.frames.length > s.max) s.frames.shift(); }
    last = t;
    if (typeof window.__rafSample === "function") { try { s.samples.push(window.__rafSample(t)); if (s.samples.length > s.max) s.samples.shift(); } catch (e) { s.error = String(e); } }
    if (s.on) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();`;
/** Installs the sampler on every new document of the page. Call before goto. */
async function installRafSampler(page) {
	await page.evaluateOnNewDocument(SOURCE);
}
/** Reads and clears what the sampler has recorded. */
async function readRaf(page) {
	const r = await page.evaluate(`(() => { const s = window.__raf; if (!s) return null; const out = { frames: s.frames.slice(), samples: s.samples.slice(), error: s.error }; s.frames.length = 0; s.samples.length = 0; return out; })()`);
	if (!r) throw new Error("no raf sampler on the page. call installRafSampler before goto.");
	const out = {
		frames: r.frames,
		samples: r.samples,
		stats: frameStats(r.frames)
	};
	if (r.error) out.error = r.error;
	return out;
}
// src/report.ts
function verdict(c) {
	if (c.measured === null || !Number.isFinite(c.measured)) return "not run";
	if (c.legal.min !== void 0 && c.measured < c.legal.min) return "fail";
	if (c.legal.max !== void 0 && c.measured > c.legal.max) return "fail";
	return "pass";
}
/** Four significant figures, no trailing zeros. */
const num = (x) => String(Number(x.toPrecision(4)));
function legalText(c) {
	const u = c.unit ? ` ${c.unit}` : "";
	const { min, max } = c.legal;
	if (min !== void 0 && max !== void 0) return `${num(min)} to ${num(max)}${u}`;
	if (min !== void 0) return `at least ${num(min)}${u}`;
	if (max !== void 0) return `at most ${num(max)}${u}`;
	return "any";
}
/** One line: "stall 4.75 s, legal at most 1 s, set by the passing rule. fix: ..." */
function checkMessage(c) {
	const v = verdict(c);
	if (v === "not run") return `${c.what} not run, legal ${legalText(c)}, ${c.constraint}`;
	const u = c.unit ? ` ${c.unit}` : "";
	const base = `${c.what} ${num(c.measured)}${u} (${c.kind ?? "measured"}), legal ${legalText(c)}, ${c.constraint}`;
	return v === "fail" && c.fix ? `${base}. fix: ${c.fix}` : base;
}
/** Text report: a line per scenario, then a check message per check. Fails first. */
function formatReport(r) {
	const lines = [`scenario report ${r.date}, ${r.chrome}`];
	for (const s of r.results) {
		const vs = s.checks.map(verdict);
		const fails = vs.filter((v) => v === "fail").length;
		const notRun = vs.filter((v) => v === "not run").length;
		const head = `${s.name} (seed ${s.seed}): ` + [
			fails ? `${fails} failed` : "checks pass",
			notRun ? `${notRun} not run` : "",
			s.golden ? `golden ${s.golden}` : "",
			s.errors.length ? `${s.errors.length} page errors` : "",
			s.blocked.length ? `${s.blocked.length} blocked requests` : ""
		].filter(Boolean).join(", ");
		lines.push(head);
		const order = s.checks.map((c, i) => [c, vs[i]]).sort((a, b) => (a[1] === "fail" ? -1 : 0) - (b[1] === "fail" ? -1 : 0));
		for (const [c, v] of order) lines.push(`  ${v}: ${checkMessage(c)}`);
		for (const e of s.errors) lines.push(`  error: ${e}`);
		for (const b of s.blocked) lines.push(`  blocked: ${b}`);
	}
	return lines.join("\n");
}
/** True when nothing failed, no page error, no blocked request, and every golden matched. */
function reportPasses(r) {
	return r.results.every((s) => s.errors.length === 0 && s.blocked.length === 0 && (s.golden === void 0 || s.golden === "identical" || s.golden === "recorded") && s.checks.every((c) => verdict(c) !== "fail"));
}
export { CHROME_MAC, DEFAULT_ARGS, SWIFTSHADER_ARGS, checkMessage, contentTypeOf, createProfiler, diffTraces, findChrome, fixedBody, formatReport, frameStats, installRafSampler, jerk, npmCdn, open, percentile, pinned, readRaf, reportPasses, runLockstep, runSuite, serve, sha256File, sliding, stallSeconds, stats, togglesPerSecond, verdict, waitFor };

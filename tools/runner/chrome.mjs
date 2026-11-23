// Scenario runner core: the system Chrome through puppeteer-core, with every
// network request routed to a pinned local file. A request with no local
// route is aborted and recorded; the run fails on any such request.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const NM = join(ROOT, "node_modules");
const LOCK = JSON.parse(readFileSync(join(ROOT, "assets.lock.json"), "utf8"));

const TYPES = { js: "text/javascript", mjs: "text/javascript", wasm: "application/wasm", json: "application/json", css: "text/css", woff2: "font/woff2", woff: "font/woff", onnx: "application/octet-stream", bin: "application/octet-stream" };
const typeOf = (p) => TYPES[p.split(".").pop()] ?? "application/octet-stream";

// four families, one weight each as in the legacy stylesheet request
const FONTS = [
  ["IBM Plex Mono", "ibm-plex-mono", [400, 600]],
  ["Permanent Marker", "permanent-marker", [400]],
  ["Special Elite", "special-elite", [400]],
  ["VT323", "vt323", [400]],
];
export function fontCss(urlFor) {
  const out = [];
  for (const [family, pkg, weights] of FONTS) for (const w of weights) {
    const file = `${pkg}-latin-${w}-normal.woff2`;
    out.push(`@font-face{font-family:'${family}';font-style:normal;font-weight:${w};font-display:swap;src:url(${urlFor(pkg, file)}) format('woff2')}`);
  }
  return out.join("\n");
}
export const fontFile = (pkg, file) => join(NM, "@fontsource", pkg, "files", file);

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const verified = new Map();
function pinned(p) {
  // files under assets-local are checked against assets.lock.json once per run
  const rel = p.startsWith(ROOT) ? p.slice(ROOT.length + 1) : p;
  const entry = LOCK.assets[rel];
  if (!entry) return p;
  if (!verified.has(p)) verified.set(p, sha(p) === entry.sha256);
  if (!verified.get(p)) throw new Error(`${rel} does not match assets.lock.json`);
  return p;
}

/** Map a request URL to a local file path, or null when no route exists. */
export function route(url) {
  const u = new URL(url);
  if (u.hostname === "cdn.jsdelivr.net" && u.pathname.startsWith("/npm/")) {
    const rest = u.pathname.slice(5);
    const m = /^((?:@[^/]+\/)?[^@/]+)@([^/]+)\/(.*)$/.exec(rest);
    if (!m) return null;
    const [, name, ver, path] = m;
    const pj = join(NM, name, "package.json");
    if (!existsSync(pj) || JSON.parse(readFileSync(pj, "utf8")).version !== ver) return null;
    const f = join(NM, name, path);
    return existsSync(f) ? f : null;
  }
  if (u.hostname === "raw.githubusercontent.com") {
    if (u.pathname.startsWith("/sweriko/ai4anim-webgpu/b539455f849f284a1e814eb11ab649eb594319dc/public/")) {
      const b = basename(u.pathname);
      if (b === "quadruped.json") return join(ROOT, "legacy/pack/nn/quadruped.json");
      if (b === "quadruped.bin") return pinned(join(ROOT, "assets-local/quadruped.bin"));
    }
    if (u.pathname === "/Hyuto/yolov8-onnxruntime-web/fc4a52c466d15ad4519873a0cef22fbc935b93b6/public/model/yolov8n.onnx") return pinned(join(ROOT, "assets-local/yolov8n.onnx"));
    return null;
  }
  if (u.hostname === "fonts.gstatic.com" && u.pathname.startsWith("/local/")) {
    const [, , pkg, file] = u.pathname.split("/");
    const f = fontFile(pkg, file);
    return existsSync(f) ? f : null;
  }
  return null;
}

/**
 * Launch Chrome and open a page with routing on.
 * opts.url: file path or URL; opts.offline: abort every non file request
 * (the self contained build check).
 */
export async function open(opts) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: opts.headless ?? true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-unsafe-webgpu", "--autoplay-policy=no-user-gesture-required", "--mute-audio"],
    defaultViewport: { width: opts.width ?? 1360, height: opts.height ?? 860 },
  });
  const page = await browser.newPage();
  const log = { errors: [], warnings: [], blocked: [], served: [], version: await browser.version() };
  page.on("pageerror", (e) => log.errors.push(`pageerror: ${String(e.message ?? e).slice(0, 400)}`));
  page.on("console", (m) => {
    const t = m.type(), text = m.text().slice(0, 400);
    // onnxruntime-web prints its own warnings ("[W:onnxruntime") through console.error
    if (t === "error" && /\[W:onnxruntime/.test(text)) log.warnings.push(text);
    else if (t === "error") log.errors.push(`console: ${text}`);
    else if (t === "warn" || t === "warning") log.warnings.push(text);
  });
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = req.url();
    if (url.startsWith("file:") || url.startsWith("data:") || url.startsWith("blob:")) return req.continue();
    if (opts.offline) { log.blocked.push(url); return req.abort("internetdisconnected"); }
    const headers = { "access-control-allow-origin": "*", "cross-origin-resource-policy": "cross-origin" };
    try {
      const u = new URL(url);
      if (u.hostname === "fonts.googleapis.com" && u.pathname === "/css2") {
        log.served.push(url);
        return req.respond({ status: 200, headers, contentType: "text/css", body: fontCss((pkg, file) => `https://fonts.gstatic.com/local/${pkg}/${file}`) });
      }
      const f = route(url);
      if (f) { log.served.push(url); return req.respond({ status: 200, headers, contentType: typeOf(f), body: readFileSync(f) }); }
    } catch (e) { log.errors.push(`route: ${e.message}`); }
    log.blocked.push(url);
    return req.abort("blockedbyclient");
  });
  const target = /^[a-z]+:/.test(opts.url) ? opts.url : pathToFileURL(resolve(opts.url)).href;
  await page.goto(target + (opts.hash ?? ""), { waitUntil: "load", timeout: 120000 });
  return { browser, page, log };
}

export async function waitFor(page, fn, arg, timeoutMs, everyMs = 500) {
  const t0 = Date.now();
  for (;;) {
    const v = await page.evaluate(fn, arg);
    if (v) return v;
    if (Date.now() - t0 > timeoutMs) return null;
    await new Promise((r) => setTimeout(r, everyMs));
  }
}

// build-html: one self contained HTML file.
//
//   node tools/build-html.mjs legacy [--src DIR] [--assets DIR] [--out FILE]
//     the port of legacy/pack/build.py. With the pack's own inputs it writes
//     the pack's hackle.html byte for byte (tools/test/build-parity.test.mjs).
//   node tools/build-html.mjs legacy --mods legacy/det/src --out dist/hackle-det.html
//     the same build over the deterministic sources (seeded rng, fixed step, lockstep hook).
//   ... legacy --mods legacy/det/src --infer motion-net-f64|motion-net-f32 --out FILE
//     the legacy host with its network kernels replaced by @hackbuild/motion-net (MIT), for
//     the in place parity check; see inferShim below.
//   node tools/build-html.mjs app [--out FILE]
//     the TypeScript app (app/src) bundled with esbuild; see buildApp below.
//
// Owner likeness (the human model and the voice reference) is read from
// assets-local/ when present. When it is absent the legacy build embeds an
// empty human slot and the page falls back to its placeholder humanoid.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Python's float repr: shortest round trip digits, fixed notation for
// exponents -4 to 15, otherwise d.ddde+XX with at least two exponent digits.
export function pyFloat(n) {
  if (Number.isInteger(n) && Math.abs(n) < 1e16) return n.toFixed(1).replace(/^-0\.0$/, Object.is(n, -0) ? "-0.0" : "0.0");
  const [mant, expS] = n.toExponential().split("e");
  const exp = Number(expS);
  const neg = mant.startsWith("-");
  const digits = mant.replace("-", "").replace(".", "");
  let out;
  if (exp >= -4 && exp < 16) {
    if (exp < 0) out = "0." + "0".repeat(-exp - 1) + digits;
    else if (digits.length > exp + 1) out = digits.slice(0, exp + 1) + "." + digits.slice(exp + 1);
    else out = digits + "0".repeat(exp + 1 - digits.length) + ".0";
  } else {
    const m = digits.length > 1 ? digits[0] + "." + digits.slice(1) : digits;
    out = m + "e" + (exp < 0 ? "-" : "+") + String(Math.abs(exp)).padStart(2, "0");
  }
  return (neg ? "-" : "") + out;
}

// json.dumps(json.load(text), separators=(",", ":")) for the JSON the pack uses:
// numbers re-printed in Python style, strings re-escaped with ensure_ascii.
export function pyJsonCompact(text) {
  let i = 0;
  const out = [];
  const ws = () => { while (/\s/.test(text[i] ?? "")) i++; };
  const value = () => {
    ws();
    const c = text[i];
    if (c === "[" || c === "{") {
      const close = c === "[" ? "]" : "}";
      out.push(c); i++; ws();
      if (text[i] === close) { out.push(close); i++; return; }
      for (;;) {
        if (c === "{") { value(); ws(); i++; out.push(":"); }
        value(); ws();
        if (text[i] === ",") { out.push(","); i++; continue; }
        out.push(close); i++; return;
      }
    }
    if (c === '"') {
      let j = i + 1;
      while (text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      const s = JSON.parse(text.slice(i, j + 1));
      out.push(JSON.stringify(s).replace(/[\u007f-￿]/g, (ch) => "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0")));
      i = j + 1; return;
    }
    const m = /^-?\d+(\.\d+)?([eE][+-]?\d+)?|^true|^false|^null/.exec(text.slice(i, i + 64));
    if (!m) throw new Error(`pyJsonCompact: bad token at ${i}`);
    const tok = m[0];
    i += tok.length;
    if (/^-?\d+$/.test(tok)) out.push(String(BigInt(tok)));
    else if (/^[-\d]/.test(tok)) out.push(pyFloat(Number(tok)));
    else out.push(tok);
  };
  value();
  return out.join("");
}

// Python text mode reads translate \r\n and \r to \n.
const readText = (p) => readFileSync(p, "utf8").replace(/\r\n?/g, "\n");
const b64 = (p) => readFileSync(p).toString("base64");
const replaceOnce = (s, k, v) => {
  const parts = s.split(k);
  if (parts.length !== 2) throw new Error(`placeholder ${k} found ${parts.length - 1} times`);
  return parts[0] + v + parts[1];
};
const replaceAll = (s, k, v) => s.split(k).join(v);

// U+2012 to U+2015 and U+2212 are dashes by RULES.md; build.py checked two of them.
export const LEGACY_DASHES = [0x2013, 0x2014].map((c) => String.fromCharCode(c));

/** The build.py port. Paths default to legacy/pack plus assets-local. */
export function buildLegacy(opts = {}) {
  const src = resolve(opts.src ?? join(ROOT, "legacy/pack"));
  const assets = resolve(opts.assets ?? join(ROOT, "assets-local"));
  // mods: the folder holding hackle_src.html and the modules (legacy/det/src for the lockstep build)
  const mods = resolve(opts.mods ?? join(src, "src"));
  const S = (f) => join(f.startsWith("src/") ? mods : src, f.startsWith("src/") ? f.slice(4) : f);
  let s = readText(S("src/hackle_src.html"));
  const core = readText(S("src/avatar_core.js"));
  const ci = core.indexOf("const PREFIX"), cj = core.indexOf("const VRM_NAMES");
  const human = replaceAll(readText(S("src/human.js")), "/*@@CLASSIFY@@*/", core.slice(ci, cj));
  const infer = opts.inferShim ?? replaceAll(readText(S("src/nn_infer.js")), "if (typeof module !== 'undefined') module.exports = { nnInferHost };", "");
  const gait = replaceAll(readText(S("src/nn_gait.js")), "/*@@NNBIND@@*/[]", pyJsonCompact(readText(S("nn/bind.json"))));
  const parts = {
    "/*@@ORGANIC@@*/": readText(S("src/organic.js")), "/*@@BODY@@*/": readText(S("src/body.js")), "/*@@NNINFER@@*/": infer,
    "/*@@NNGAIT@@*/": gait, "/*@@SENSES@@*/": readText(S("src/senses.js")), "/*@@BRAIN@@*/": readText(S("src/brain.js")),
    "/*@@VOICE@@*/": readText(S("src/voice.js")), "/*@@HUMAN@@*/": human,
  };
  for (const [k, v] of Object.entries(parts)) s = replaceOnce(s, k, v);
  const A = (f) => join(assets, f);
  const voice = existsSync(A("voice.wav")) ? b64(A("voice.wav")) : "";
  const humanGlb = existsSync(A("moheeb.glb")) ? b64(A("moheeb.glb")) : "";
  if (!existsSync(A("dog.glb"))) throw new Error("assets-local/dog.glb is missing; see assets.lock.json");
  s = replaceAll(s, "@@VOICE_B64@@", voice);
  s = replaceAll(s, "@@ANIMS@@", readText(S("work/hanims_min.json")));
  s = replaceAll(s, "@@HUMAN_GLB@@", humanGlb);
  s = replaceAll(s, "@@DOG_GLB@@", b64(A("dog.glb")));
  const left = s.match(/\/\*@@[A-Z_]+@@\*\/|@@[A-Z_]+@@/g);
  if (left) throw new Error(`placeholders left: ${left.join(" ")}`);
  if (LEGACY_DASHES.some((c) => s.includes(c))) throw new Error("dash found");
  return { html: s, likeness: { human: humanGlb !== "", voice: voice !== "" } };
}

// nnInferHost with the legacy message protocol ({ t: 'load', meta, bin }, { t: 'run', id, x })
// answered by motion-net's CPU model. Lockstep only: the host source is rebuilt with new Function,
// so it reads motion-net from globalThis.__HMN, which the bundle sets.
export async function inferShim(accum) {
  const { build } = await import("esbuild");
  const r = await build({
    stdin: { contents: "export { load, createCpuModel, codebookManifest } from '@hackbuild/motion-net';", resolveDir: ROOT, loader: "js" },
    bundle: true, format: "iife", globalName: "__HMN_BUNDLE", platform: "browser", target: "es2023", minify: true, write: false, logLevel: "warning", logOverride: { "empty-import-meta": "silent" },
  });
  const js = r.outputFiles[0].text.split("</script").join("<\\/script");
  return `${js}\nglobalThis.__HMN = __HMN_BUNDLE;\n` +
    "function nnInferHost(post) {\n" +
    "  let model = null;\n" +
    "  return msg => {\n" +
    "    if (msg.t === 'load') globalThis.__HMN.load().then(() => { model = globalThis.__HMN.createCpuModel(globalThis.__HMN.codebookManifest(msg.meta), msg.bin, '" + accum + "'); post({ t: 'ready' }); }, e => post({ t: 'error', msg: String(e.message || e) }));\n" +
    "    else if (msg.t === 'run') { const t0 = performance.now(); const o = model.run(msg.x); post({ t: 'out', id: msg.id, out: o, ms: performance.now() - t0 }); }\n" +
    "  };\n" +
    "}\n";
}

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) o[argv[i].slice(2)] = argv[++i];
    else o._.push(argv[i]);
  }
  return o;
}

async function main(argv) {
  const o = args(argv);
  const mode = o._[0] ?? "app";
  let html, out;
  if (mode === "legacy") {
    const shim = o.infer ? await inferShim(o.infer.replace(/^motion-net-/, "")) : undefined;
    if (o.infer && !/^motion-net-f(32|64)$/.test(o.infer)) throw new Error(`unknown --infer ${o.infer}`);
    const r = buildLegacy({ src: o.src, mods: o.mods, assets: o.assets, inferShim: shim });
    html = r.html;
    out = resolve(o.out ?? join(ROOT, "dist/hackle-legacy.html"));
    if (!r.likeness.human) console.log("build-html: no assets-local/moheeb.glb, the human slot is empty and the page uses its placeholder");
  } else if (mode === "app") {
    const { buildApp } = await import("./build-app.mjs");
    const r = await buildApp(o);
    html = r.html;
    out = resolve(o.out ?? join(ROOT, "dist/dog-simulator.html"));
  } else throw new Error(`unknown mode ${mode}`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  const bytes = Buffer.byteLength(html);
  console.log(`build-html: ${out} ${bytes} bytes (measured) sha256 ${createHash("sha256").update(html).digest("hex").slice(0, 16)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((e) => { console.error(`build-html: ${e.message}`); process.exit(1); });
}

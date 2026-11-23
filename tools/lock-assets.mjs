// lock-assets: writes assets.lock.json, one entry per local binary asset and
// per file under legacy/, with sha256, size, source and licence.
//   node tools/lock-assets.mjs          rewrite the lock from the files present
//   node tools/lock-assets.mjs --check  exit 1 when a present file differs from its entry
// Binaries live in assets-local/ (gitignored); their entries are the record of
// what the build expects. A missing binary is reported, never invented.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACK = "HACKLE handoff pack, received 2026-11-22";

// source and licence per binary; the licence text is "unknown" where the pack does not say
export const BINARIES = {
  "dog.glb": { source: `${PACK}, app/assets/dog.glb; a Meshy model reduced with legacy/pack/tools/opt.mjs`, licence: "unknown (Meshy output terms not checked)", git: false },
  "moheeb.glb": { source: `${PACK}, work/moheeb.glb; the owner's likeness`, licence: "owner likeness, not for redistribution; rig origin unknown", git: false, likeness: true },
  "voice.wav": { source: `${PACK}, ferrule/voice.wav; the owner's voice reference`, licence: "owner likeness, not for redistribution", git: false, likeness: true },
  "quadruped.bin": { source: "sweriko/ai4anim-webgpu@b539455f849f284a1e814eb11ab649eb594319dc public/quadruped.bin (copy in the pack)", licence: "CC-BY-NC-4.0 (vendor, legacy/pack/nn/AI4ANIM_NOTICE.txt)", git: false },
  "yolov8n.onnx": { source: "Hyuto/yolov8-onnxruntime-web@fc4a52c466d15ad4519873a0cef22fbc935b93b6 public/model/yolov8n.onnx (copy in the pack)", licence: "AGPL-3.0 (vendor, Ultralytics YOLOv8)", git: false },
  "nms-yolov8.onnx": { source: `${PACK}, models/nms-yolov8.onnx; likely Hyuto/yolov8-onnxruntime-web (inferred)`, licence: "unknown", git: false },
  "AnimationLibrary_Godot_Standard.gltf": { source: `${PACK}, app/_ual; Quaternius Universal Animation Library`, licence: "CC0-1.0 (legacy/pack/ferrule/UAL_LICENSE.txt)", git: false },
  "AnimationLibrary_Godot_Standard.bin": { source: `${PACK}, app/_ual; Quaternius Universal Animation Library`, licence: "CC0-1.0 (legacy/pack/ferrule/UAL_LICENSE.txt)", git: false },
  "hackle.html": { source: `${PACK}, hackle.html; the pack's build output, kept for the parity check`, licence: "mixed; embeds the owner likeness, not for redistribution", git: false, likeness: true },
};

const NC = new Set(["src/nn_gait.js", "src/nn_infer.js", "nn/quadruped.json"]);
function legacyLicence(rel) {
  if (NC.has(rel)) return "CC-BY-NC-4.0 (derived from sweriko/ai4anim-webgpu and AI4AnimationPy, legacy/pack/nn/AI4ANIM_NOTICE.txt)";
  if (rel.startsWith("nn/AI4ANIM_")) return "licence text, CC-BY-NC-4.0";
  if (rel === "ferrule/UAL_LICENSE.txt") return "licence text, CC0-1.0";
  if (rel === "work/hanims_min.json") return "CC0-1.0 inputs (Universal Animation Library) baked onto the owner rig; bake code owner authored";
  if (rel === "nn/bind.json") return "unknown (rig binding for the CC-BY-NC network, inferred derived)";
  if (rel === "app/_ual/bake.html" || rel === "app/_ual/preview.html") return "owner authored (inferred), MIT with this repository";
  return "owner authored (inferred), MIT with this repository";
}

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name !== ".DS_Store") out.push(p);
  }
  return out.sort();
}

export function buildLock(prev = {}) {
  const assets = {};
  for (const [name, meta] of Object.entries(BINARIES)) {
    const p = join(ROOT, "assets-local", name);
    if (existsSync(p)) assets[`assets-local/${name}`] = { sha256: sha(p), bytes: statSync(p).size, ...meta };
    else if (prev.assets?.[`assets-local/${name}`]) assets[`assets-local/${name}`] = prev.assets[`assets-local/${name}`];
  }
  const legacy = {};
  for (const p of walk(join(ROOT, "legacy/pack"))) {
    const rel = relative(join(ROOT, "legacy/pack"), p);
    legacy[`legacy/pack/${rel}`] = { sha256: sha(p), bytes: statSync(p).size, source: `${PACK}, ${rel}`, licence: legacyLicence(rel), git: true };
  }
  return { version: 1, note: "sizes measured; sha256 of the files as received. assets-local/ is gitignored and never committed.", assets, legacy };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = join(ROOT, "assets.lock.json");
  const prev = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const next = buildLock(prev);
  if (process.argv.includes("--check")) {
    const bad = [];
    for (const group of ["assets", "legacy"]) {
      for (const [k, v] of Object.entries(prev[group] ?? {})) {
        if (!existsSync(join(ROOT, k))) { if (group === "legacy") bad.push(`${k}: missing`); else console.log(`lock-assets: ${k} not present here`); continue; }
        if (next[group][k]?.sha256 !== v.sha256) bad.push(`${k}: sha256 differs`);
      }
      for (const k of Object.keys(next[group])) if (!prev[group]?.[k]) bad.push(`${k}: no lock entry`);
    }
    for (const b of bad) console.log(`lock-assets: ${b}`);
    console.log(`lock-assets: ${bad.length} problems`);
    process.exit(bad.length ? 1 : 0);
  }
  writeFileSync(file, JSON.stringify(next, null, 2) + "\n");
  console.log(`lock-assets: ${Object.keys(next.assets).length} assets, ${Object.keys(next.legacy).length} legacy files`);
}

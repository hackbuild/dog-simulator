// build-app: the app as one self contained HTML file.
// esbuild bundles app/src/main.ts with three.js, the glTF loader, orbit controls and Rapier;
// the scope modules listed in app/src/scope.json are joined into one module scope (the legacy
// layout, kept so golden traces hold). Fonts are embedded from @fontsource. The dog model comes
// from assets-local/dog.glb; the human model and voice reference are embedded only when
// assets-local holds them, otherwise the page builds its placeholder human. buildApp({ public:
// true }) reads nothing from assets-local: it embeds the owner's dog, human and voice clip from
// app/assets/ (committed, the owner's own, shipped by the owner's decision of 2026-11-25), the
// page Pages publishes. buildApp({ stub: true }) reads no binary at all: the dog is the generated
// stub (tools/stub-dog.mjs) and the human the placeholder, the build the public scenario goldens
// run on.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { LEGACY_DASHES } from "./build-html.mjs";
import { stubDogGlb } from "./stub-dog.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "app/src");
const NM = join(ROOT, "node_modules");

// the hack.build design system (hackbuild-ui, vendored pinned by commit in tools/vendor, sha256 in
// tools/vendor/SHA256SUMS): its class layer and its fonts as data urls, so the page opens from
// file:// and offline
const HBUI = join(NM, "@virgilvox/hackbuild-ui/dist/styles");
const FONTS = [
  ["IBM Plex Mono", "ibm-plex-mono"],
  ["Permanent Marker", "permanent-marker"],
  ["Special Elite", "special-elite"],
  ["VT323", "vt323"],
  ["Libre Baskerville", "libre-baskerville"],
];
const fontCss = () => readFileSync(join(HBUI, "fonts-inline.css"), "utf8");
// hackbuild.css starts with @import "./tokens.css"; the tokens go inline in its place
export function hbuiCss() {
  const css = readFileSync(join(HBUI, "hackbuild.css"), "utf8");
  // the header comment names the Google Fonts url; this page inlines the fonts instead
  return sub(css, '@import "./tokens.css";', readFileSync(join(HBUI, "tokens.css"), "utf8")).replace(/^.*https:\/\/fonts\.googleapis\.com.*$/m, "");
}

export function scopeSource() {
  const order = JSON.parse(readFileSync(join(SRC, "scope.json"), "utf8"));
  const parts = order.map((f) => `// ---- app/src/${f}\n` + readFileSync(join(SRC, f), "utf8"));
  return [
    "import * as THREE from 'three/webgpu';",
    "import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';",
    "import { OrbitControls } from 'three/addons/controls/OrbitControls.js';",
    "import * as RAPIER_MODULE from '@dimforge/rapier3d-compat';",
    "import * as HMN from '@hackbuild/motion-net';",
    "import * as HGAIT from '@hackbuild/gait';",
    "import * as HTUNE from '@hackbuild/tunables';",
    "import * as HSENSE from '@hackbuild/senses';",
    "import * as HDRIVE from '@hackbuild/drives';",
    "import * as HCAM from '@hackbuild/cameras';",
    "import * as HWEIGHT from '@hackbuild/weights';",
    "import * as HBV from '@virgilvox/hackbuild-ui/vanilla';",
    // the suite link base; empty hides every suite link (set SUITE_URL at publish)
    `const SUITE_URL = ${JSON.stringify(process.env.SUITE_URL ?? "")};`,
    "{",
    ...parts,
    "}",
  ].join("\n");
}

const scopePlugin = {
  name: "hackle-scope",
  setup(b) {
    b.onResolve({ filter: /^virtual:hackle-scope$/ }, () => ({ path: "hackle-scope", namespace: "hackle" }));
    b.onLoad({ filter: /.*/, namespace: "hackle" }, () => ({ contents: scopeSource(), loader: "js", resolveDir: SRC }));
    // the addons import bare 'three'; point it at the WebGPU build as the legacy import map did
    b.onResolve({ filter: /^three$/ }, () => ({ path: join(NM, "three/build/three.webgpu.js") }));
  },
};

const sub = (s, k, v) => {
  const p = s.split(k);
  if (p.length !== 2) throw new Error(`placeholder ${k} found ${p.length - 1} times`);
  return p[0] + v + p[1];
};

// the notices the bundled third party code and fonts need, written as a comment at the top of the
// page: Rapier (Apache-2.0) and the fonts (Apache-2.0, OFL-1.1) carry their licence texts; three.js
// keeps its own @license header in the script
export function licenceComment() {
  const text = (p) => readFileSync(join(NM, p), "utf8").replace(/-->/g, "- ->").trim();
  const parts = [
    "dog-simulator, one self contained file. App code MIT (https://github.com/hackbuild/dog-simulator, LICENSE).",
    "Full list: LICENCES.md. The neural gait weights (CC-BY-NC-4.0) are fetched at run time and are not in this file.",
    "Bundled: three.js (MIT, see its header in the script), @hackbuild/gait, motion-net, tunables, senses, drives, cameras (MIT),",
    "@dimforge/rapier3d-compat (Apache-2.0), the hack.build design system @virgilvox/hackbuild-ui 0.9.2 (MIT, its class layer and vanilla entry), @hackbuild/weights 0.1.0 (MIT),",
    "fonts IBM Plex Mono, VT323 and Libre Baskerville (OFL-1.1), Permanent Marker and Special Elite (Apache-2.0),",
    "Quaternius Universal Animation Library clips (CC0-1.0).",
    "",
    "==== @dimforge/rapier3d-compat LICENSE", text("@dimforge/rapier3d-compat/LICENSE"),
    "==== @virgilvox/hackbuild-ui LICENSE", text("@virgilvox/hackbuild-ui/LICENSE"),
    ...FONTS.flatMap(([family, pkg]) => [`==== ${family} (hackbuild-ui fonts, from Fontsource 5.3.0) LICENSE`, text(`@virgilvox/hackbuild-ui/dist/styles/fonts/LICENSE-${pkg}.txt`)]),
  ];
  return `<!--\n${parts.join("\n")}\n-->\n`;
}

export async function buildApp(opts = {}) {
  const r = await build({
    entryPoints: [join(SRC, "main.ts")], bundle: true, format: "esm", platform: "browser", target: "es2023",
    minify: true, legalComments: "inline", write: false, metafile: true, plugins: [scopePlugin], logLevel: "warning",
  });
  const js = r.outputFiles[0].text.split("</script").join("<\\/script");
  const stub = !!opts.stub, pub = !stub && !!opts.public;
  // the owner build reads assets-local/; the public build reads the committed app/assets/
  const dir = pub ? join(ROOT, "app/assets") : resolve(opts.assets ?? join(ROOT, "assets-local"));
  const A = (f) => join(dir, pub && f === "moheeb.glb" ? "human.glb" : f);
  if (!stub && !existsSync(A("dog.glb"))) throw new Error(`${A("dog.glb")} is missing; see assets.lock.json, or build the stub file (node tools/build-html.mjs stub)`);
  const dogGlb = stub ? stubDogGlb() : readFileSync(A("dog.glb"));
  const human = !stub && existsSync(A("moheeb.glb")) ? readFileSync(A("moheeb.glb")).toString("base64") : "";
  const voice = !stub && existsSync(A("voice.wav")) ? readFileSync(A("voice.wav")).toString("base64") : "";
  let html = readFileSync(join(SRC, "view/page.html"), "utf8");
  html = sub(html, "<!DOCTYPE html>\n", "<!DOCTYPE html>\n" + licenceComment());
  html = sub(html, "/*@@FONTS@@*/", fontCss());
  html = sub(html, "/*@@HBUI@@*/", hbuiCss());
  html = sub(html, "/*@@APP@@*/", js);
  html = sub(html, "@@VOICE_B64@@", voice);
  html = sub(html, "@@ANIMS@@", readFileSync(join(ROOT, "legacy/pack/work/hanims_min.json"), "utf8"));
  html = sub(html, "@@HUMAN_GLB@@", human);
  html = sub(html, "@@DOG_GLB@@", dogGlb.toString("base64"));
  const ours = html.replace(js, "");
  if (LEGACY_DASHES.some((c) => ours.includes(c))) throw new Error("dash found outside the bundled libraries");
  if (/https:\/\/fonts\.(googleapis|gstatic)\.com/.test(html)) throw new Error("a remote font reference is left");
  if (!human) console.log("build-app: no human model, the page uses its placeholder human");
  console.log(`build-app: script ${js.length} bytes, dog model ${dogGlb.length} bytes${stub ? " (stub)" : ""}, human ${human ? (pub ? "app/assets" : "owner pack") : "placeholder"}, voice clip ${voice ? "embedded" : "none"}`);
  return { html, likeness: { human: !!human, voice: !!voice }, stubDog: stub, inputs: Object.keys(r.metafile.inputs) };
}

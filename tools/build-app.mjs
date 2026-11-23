// build-app: the app as one self contained HTML file.
// esbuild bundles app/src/main.ts with three.js, the glTF loader, orbit controls and Rapier;
// the scope modules listed in app/src/scope.json are joined into one module scope (the legacy
// layout, kept so golden traces hold). Fonts are embedded from @fontsource. The dog model comes
// from assets-local/dog.glb; the human model and voice reference are embedded only when
// assets-local holds them, otherwise the page builds its placeholder human.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { LEGACY_DASHES } from "./build-html.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "app/src");
const NM = join(ROOT, "node_modules");

const FONTS = [
  ["IBM Plex Mono", "ibm-plex-mono", [400, 600]],
  ["Permanent Marker", "permanent-marker", [400]],
  ["Special Elite", "special-elite", [400]],
  ["VT323", "vt323", [400]],
];
function fontCss() {
  const out = [];
  for (const [family, pkg, weights] of FONTS) for (const w of weights) {
    const f = join(NM, "@fontsource", pkg, "files", `${pkg}-latin-${w}-normal.woff2`);
    out.push(`@font-face{font-family:'${family}';font-style:normal;font-weight:${w};font-display:block;src:url(data:font/woff2;base64,${readFileSync(f).toString("base64")}) format('woff2')}`);
  }
  return out.join("\n");
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

export async function buildApp(opts = {}) {
  const r = await build({
    entryPoints: [join(SRC, "main.ts")], bundle: true, format: "esm", platform: "browser", target: "es2023",
    minify: true, legalComments: "inline", write: false, plugins: [scopePlugin], logLevel: "warning",
  });
  const js = r.outputFiles[0].text.split("</script").join("<\\/script");
  const A = (f) => join(resolve(opts.assets ?? join(ROOT, "assets-local")), f);
  if (!existsSync(A("dog.glb"))) throw new Error("assets-local/dog.glb is missing; see assets.lock.json");
  const human = existsSync(A("moheeb.glb")) ? readFileSync(A("moheeb.glb")).toString("base64") : "";
  const voice = existsSync(A("voice.wav")) ? readFileSync(A("voice.wav")).toString("base64") : "";
  let html = readFileSync(join(SRC, "view/page.html"), "utf8");
  html = sub(html, "/*@@FONTS@@*/", fontCss());
  html = sub(html, "/*@@APP@@*/", js);
  html = sub(html, "@@VOICE_B64@@", voice);
  html = sub(html, "@@ANIMS@@", readFileSync(join(ROOT, "legacy/pack/work/hanims_min.json"), "utf8"));
  html = sub(html, "@@HUMAN_GLB@@", human);
  html = sub(html, "@@DOG_GLB@@", readFileSync(A("dog.glb")).toString("base64"));
  const ours = html.replace(js, "");
  if (LEGACY_DASHES.some((c) => ours.includes(c))) throw new Error("dash found outside the bundled libraries");
  if (/https:\/\/fonts\.(googleapis|gstatic)\.com/.test(html)) throw new Error("a remote font reference is left");
  if (!human) console.log("build-app: no assets-local/moheeb.glb, the page uses its placeholder human");
  console.log(`build-app: script ${js.length} bytes, dog model ${readFileSync(A("dog.glb")).length} bytes, human ${human ? "owner pack" : "placeholder"}`);
  return { html, likeness: { human: !!human, voice: !!voice } };
}

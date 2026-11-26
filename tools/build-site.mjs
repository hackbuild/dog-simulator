// build-site: the folder Pages publishes, in dist/site/.
//   node tools/build-site.mjs
// index.html is the public build (the owner's dog, human and voice clip embedded, from
// app/assets/). Beside it, as plain files for the suite's yard and its character and room
// explorers: assets/dog.glb, human.glb and voice.wav (the owner's own, the three app/assets files),
// assets/anims.json (the person's clip pack, Quaternius Universal Animation Library clips, CC0-1.0)
// and assets/rapier.mjs (@dimforge/rapier3d-compat, Apache-2.0, its licence beside it). Pages sends
// access-control-allow-origin: * on every file, so a cors fetch from a cross origin isolated page
// loads them. coi-sw.js is the isolation worker the suite registers for this scope.
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildApp } from "./build-app.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = join(ROOT, "dist/site");
const RAPIER = join(ROOT, "node_modules/@dimforge/rapier3d-compat");
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "assets"), { recursive: true });
const { html } = await buildApp({ public: true });
writeFileSync(join(OUT, "index.html"), html);
for (const f of ["dog.glb", "human.glb", "voice.wav"]) copyFileSync(join(ROOT, "app/assets", f), join(OUT, "assets", f));
// the clip pack the page embeds, as compact JSON
writeFileSync(join(OUT, "assets/anims.json"), JSON.stringify(JSON.parse(readFileSync(join(ROOT, "legacy/pack/work/hanims_min.json"), "utf8"))));
copyFileSync(join(RAPIER, "dist/rapier.mjs"), join(OUT, "assets/rapier.mjs"));
copyFileSync(join(RAPIER, "LICENSE"), join(OUT, "assets/rapier.LICENSE.txt"));
copyFileSync(join(ROOT, "app/pages/coi-sw.js"), join(OUT, "coi-sw.js"));
console.log(`build-site: ${OUT}, index.html ${Buffer.byteLength(html)} bytes (measured)`);

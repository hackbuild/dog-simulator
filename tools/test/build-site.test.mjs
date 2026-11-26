// the Pages folder: the page, the isolation worker and exactly six plain files; of the owner's
// files only the three in app/assets (dog, human, voice clip), byte for byte
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const SITE = join(ROOT, "dist/site");

test("the site folder carries the page, the worker and six plain files", () => {
  execFileSync("node", [join(ROOT, "tools/build-site.mjs")], { cwd: ROOT, stdio: "pipe" });
  assert.deepEqual(readdirSync(SITE).sort(), ["assets", "coi-sw.js", "index.html"]);
  assert.deepEqual(readdirSync(join(SITE, "assets")).sort(), ["anims.json", "dog.glb", "human.glb", "rapier.LICENSE.txt", "rapier.mjs", "voice.wav"]);
  for (const f of ["dog.glb", "human.glb", "voice.wav"]) assert.ok(readFileSync(join(SITE, "assets", f)).equals(readFileSync(join(ROOT, "app/assets", f))), `${f} is app/assets/${f}`);
  const anims = JSON.parse(readFileSync(join(SITE, "assets/anims.json"), "utf8"));
  assert.ok(anims.roles && anims.clips && anims.fps, "the clip pack has roles, clips and fps");
  assert.match(readFileSync(join(SITE, "assets/rapier.LICENSE.txt"), "utf8"), /Apache License/);
});

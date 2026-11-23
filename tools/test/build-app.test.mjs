// the app build is one file that needs no network for the dog, the human, physics or fonts,
// and carries no code from the CC-BY-NC gait host. Needs assets-local/dog.glb; skipped elsewhere.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "../build-app.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const dog = join(ROOT, "assets-local", "dog.glb");

test("app build is self contained", { skip: existsSync(dog) ? false : "assets-local/dog.glb not present" }, async () => {
  const { html } = await buildApp();
  assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(html), "remote fonts");
  assert.ok(!html.includes("cdn.jsdelivr.net/npm/three@"), "three from a cdn");
  assert.ok(!html.includes("rapier3d-compat@"), "rapier from a cdn");
  assert.ok(!html.includes("<script type=\"importmap\"") && !html.includes("type = 'importmap'"), "import map");
  for (const s of ["nnInferHost", "NRoot", "NSeq", "sweriko/ai4anim-webgpu"]) assert.ok(!html.includes(s), `gait host code: ${s}`);
});

test("app build without the owner pack uses the placeholder human", { skip: existsSync(dog) ? false : "assets-local/dog.glb not present" }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "dogsim-"));
  try {
    const { copyFileSync } = await import("node:fs");
    copyFileSync(dog, join(dir, "dog.glb"));
    const { html, likeness } = await buildApp({ assets: dir });
    assert.deepEqual(likeness, { human: false, voice: false });
    assert.match(html, /<script type="application\/octet-stream" id="humanGLB">\s*<\/script>/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

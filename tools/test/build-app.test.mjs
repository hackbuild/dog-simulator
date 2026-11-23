// the app build is one file that needs no network for the dog, the human, physics or fonts,
// and carries no code from the CC-BY-NC gait host and no network data: the weights and their
// manifest are fetched at runtime from one pinned URL. With assets-local/dog.glb the owner build
// is checked; without it (CI, a public clone) the public build with the stub dog, so the licence
// isolation check runs everywhere.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "../build-app.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const dog = join(ROOT, "assets-local", "dog.glb");
const owner = existsSync(dog);

test(`app build is self contained (${owner ? "owner" : "public"} build)`, async () => {
  const { html, inputs } = await buildApp({ public: !owner });
  assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(html), "remote fonts");
  assert.ok(!html.includes("cdn.jsdelivr.net/npm/three@"), "three from a cdn");
  assert.ok(!html.includes("rapier3d-compat@"), "rapier from a cdn");
  assert.ok(!html.includes("<script type=\"importmap\"") && !html.includes("type = 'importmap'"), "import map");
  for (const s of ["nnInferHost", "NRoot", "NSeq", "setupActor"]) assert.ok(!html.includes(s), `gait host code: ${s}`);
  // the network manifest and bind stay out of the file; only the pinned weight URL is in it
  assert.ok(!html.includes("codebook_channels"), "network manifest bundled");
  assert.ok(!html.includes("0.471712"), "legacy bind matrices bundled");
  const urls = html.match(/sweriko\/ai4anim-webgpu\/[0-9a-f]+\//g) ?? [];
  assert.deepEqual([...new Set(urls)], ["sweriko/ai4anim-webgpu/b539455f849f284a1e814eb11ab649eb594319dc/"], "weights from the pinned commit only");
  // bundle inputs, by path: nothing from legacy/ (the clip JSON is read as data, not bundled
  // code) and no file named like the legacy network host or kernels, however it was renamed
  assert.ok(inputs.length > 10, "esbuild metafile lists the inputs");
  assert.deepEqual(inputs.filter((p) => p.startsWith("legacy/") || p.includes("/legacy/")), [], "bundle input under legacy/");
  assert.deepEqual(inputs.filter((p) => /(^|\/)nn_[^/]*$/.test(p)), [], "bundle input named like the legacy network code");
  assert.ok(inputs.every((p) => /^(app\/src\/|node_modules\/|vendor\/|hackle:)/.test(p)), `unexpected bundle input: ${inputs.filter((p) => !/^(app\/src\/|node_modules\/|vendor\/|hackle:)/.test(p)).join(", ")}`);
  // the page carries the notices of the bundled Apache-2.0 and OFL-1.1 code and fonts
  assert.match(html.slice(0, 200000), /Apache License\s+Version 2\.0/, "rapier licence text");
  assert.match(html.slice(0, 200000), /SIL OPEN FONT LICENSE/i, "font licence text");
});

test("app build without the owner pack uses the placeholder human and no voice clip", async () => {
  const dir = mkdtempSync(join(tmpdir(), "dogsim-"));
  try {
    const { html, likeness, stubDog } = owner
      ? await (async () => { const { copyFileSync } = await import("node:fs"); copyFileSync(dog, join(dir, "dog.glb")); return buildApp({ assets: dir }); })()
      : await buildApp({ public: true });
    assert.deepEqual(likeness, { human: false, voice: false });
    assert.equal(stubDog, !owner);
    assert.match(html, /<script type="application\/octet-stream" id="humanGLB">\s*<\/script>/);
    assert.match(html, /<script type="text\/plain" id="voiceB64">\s*<\/script>/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the public build reads nothing from assets-local", async () => {
  const { html, likeness, stubDog } = await buildApp({ public: true });
  assert.deepEqual(likeness, { human: false, voice: false });
  assert.ok(stubDog);
  assert.ok(!html.includes("UklGR"), "a RIFF (wav) payload");
  const glb = html.match(/id="dogGLB">\s*([A-Za-z0-9+/=]+)/)[1];
  assert.ok(Buffer.from(glb, "base64").length < 100000, "the dog is the stub");
});

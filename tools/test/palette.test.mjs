// the command palette reaches every verb by an id in the page: each id it presses, flips or goes
// to exists in page.html, each command key is unique, and the stage verbs are all listed
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dirname, "..", "..", "app", "src");
const pal = readFileSync(join(SRC, "view", "palette.js"), "utf8");
const page = readFileSync(join(SRC, "view", "page.html"), "utf8");
const ids = new Set([...page.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

test("every id the palette uses is in the page", () => {
  const used = [...pal.matchAll(/(?:palPress|palFlip|palOff|palState|\$)\('([A-Za-z0-9]+)'\)|palGo\('p[A-Za-z]+', '([A-Za-z0-9]+)'\)/g)].map((m) => m[1] ?? m[2]);
  assert.ok(used.length > 30, `found ${used.length} ids`);
  for (const id of used) assert.ok(ids.has(id), `missing #${id}`);
});

test("command keys are unique and cover the stage verbs", () => {
  const keys = [...pal.matchAll(/\{ k: '([a-z0-9]+)'/g)].map((m) => m[1]);
  assert.equal(new Set(keys).size, keys.length, "duplicate command key");
  const verbs = [...page.matchAll(/<button[^>]*id="(b[A-Z][A-Za-z]+)"/g)].map((m) => m[1]).filter((id) => id !== "bPalette" && id !== "bMore" && id !== "bResetKeep" && id !== "bCaps" && id !== "bSeedGo" && id !== "bPhotoYes" && id !== "bPhotoNo");
  for (const v of verbs) assert.ok(pal.includes(`'${v}'`), `${v} has no command`);
});

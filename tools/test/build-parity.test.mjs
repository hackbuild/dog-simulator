// the build.py port reproduces the pack's hackle.html byte for byte from the
// same inputs. Needs assets-local/ (owner machine); skipped elsewhere.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildLegacy, pyFloat, pyJsonCompact } from "../build-html.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const ref = join(ROOT, "assets-local", "hackle.html");
const sha = (b) => createHash("sha256").update(b).digest("hex");

test("python float repr", () => {
  const cases = [[0, "0.0"], [1, "1.0"], [-0.00666, "-0.00666"], [1e-5, "1e-05"], [0.0001, "0.0001"], [1.5e16, "1.5e+16"], [123.25, "123.25"], [1e22, "1e+22"]];
  for (const [n, s] of cases) assert.equal(pyFloat(n), s);
  assert.equal(pyJsonCompact('{"a": [1, 2.50, -3e-7], "b": "é"}'), '{"a":[1,2.5,-3e-07],"b":"\\u00e9"}');
});

test("legacy build matches the pack output", { skip: existsSync(ref) ? false : "assets-local/hackle.html not present" }, () => {
  const { html } = buildLegacy();
  assert.equal(sha(Buffer.from(html)), sha(readFileSync(ref)));
});

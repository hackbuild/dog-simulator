// vendor-libs: copies built packages from the sibling library repos into
// vendor/<name>/, pinned to a commit. The packages are not on npm; the app
// takes them as npm workspaces (package.json "workspaces": ["vendor/*"]),
// so imports resolve by package name and CI needs no sibling checkout.
//
//   node tools/vendor-libs.mjs              copy the packages listed in vendor/lock.json
//   node tools/vendor-libs.mjs --check      check vendor/ against the hashes in vendor/lock.json
//   node tools/vendor-libs.mjs --add hackbuild-agents tunables
//
// The package and its crate must be clean, HEAD pushed and the dist built at HEAD; the commit and
// the sha256 of every copied file go into vendor/lock.json.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const VENDOR = join(ROOT, "vendor");
const LOCK = join(VENDOR, "lock.json");
const SIBLINGS = resolve(ROOT, "..");

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const lock = existsSync(LOCK) ? JSON.parse(readFileSync(LOCK, "utf8")) : { version: 1, note: "", packages: {} };
lock.note = "built packages copied from the sibling repos at the commit given; written by tools/vendor-libs.mjs";

function hashes(dir) {
  const out = {};
  for (const f of walk(dir).sort()) out[relative(dir, f)] = sha(f);
  return out;
}

function copy(repo, name) {
  const src = join(SIBLINGS, repo);
  const git = (...a) => execFileSync("git", ["-C", src, ...a], { encoding: "utf8" }).trim();
  // only the package and its crate need to match the commit; other work in the repo is not copied
  if (git("status", "--porcelain", "--untracked-files=no", "--", `packages/${name}`, `crates/${name}`) || git("status", "--porcelain", "--", `packages/${name}/src`, `crates/${name}/src`)) throw new Error(`${repo} has uncommitted changes in ${name}`);
  if (git("rev-list", "--count", "@{u}..HEAD") !== "0") throw new Error(`${repo} has commits not pushed; push them first so the pin resolves`);
  const commit = git("rev-parse", "HEAD");
  const pkgDir = join(src, "packages", name);
  if (!existsSync(join(pkgDir, "dist"))) throw new Error(`${repo}/packages/${name}/dist is missing; build it there first`);
  const pj = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
  // the copy is built output: no scripts, no dev tooling
  delete pj.scripts;
  delete pj.devDependencies;
  pj.files = ["dist", "README.md", "LICENSE"];
  if (pj.exports) delete pj.exports["./iife"];
  const out = join(VENDOR, name);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(join(pkgDir, "dist"), join(out, "dist"), { recursive: true });
  // the IIFE copies are for script tag use, the app bundles the ESM build; build info is local state
  for (const f of walk(join(out, "dist"))) if (f.endsWith(".iife.js") || f.endsWith(".tsbuildinfo")) rmSync(f);
  cpSync(join(pkgDir, "README.md"), join(out, "README.md"));
  cpSync(join(src, "LICENSE"), join(out, "LICENSE"));
  writeFileSync(join(out, "package.json"), JSON.stringify(pj, null, 2) + "\n");
  lock.packages[name] = { repo: `hackbuild/${repo}`, path: `packages/${name}`, commit, version: pj.version, files: hashes(out) };
  console.log(`vendor-libs: ${pj.name} ${pj.version} from ${repo} at ${commit.slice(0, 12)}`);
}

const argv = process.argv.slice(2);
if (argv[0] === "--check") {
  let bad = 0;
  for (const [name, e] of Object.entries(lock.packages)) {
    const now = existsSync(join(VENDOR, name)) ? hashes(join(VENDOR, name)) : {};
    for (const [f, h] of Object.entries(e.files)) if (now[f] !== h) { console.error(`vendor-libs: vendor/${name}/${f} differs from vendor/lock.json`); bad++; }
    for (const f of Object.keys(now)) if (!(f in e.files)) { console.error(`vendor-libs: vendor/${name}/${f} is not in vendor/lock.json`); bad++; }
  }
  if (bad) process.exit(1);
  console.log(`vendor-libs: ${Object.keys(lock.packages).length} packages match vendor/lock.json`);
} else {
  if (argv[0] === "--add") copy(argv[1], argv[2]);
  else for (const [name, e] of Object.entries(lock.packages)) copy(e.repo.split("/")[1], name);
  writeFileSync(LOCK, JSON.stringify(lock, null, 2) + "\n");
}

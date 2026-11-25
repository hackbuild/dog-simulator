# Changelog

Versions follow semver per package. Nothing is published to npm yet.

## 0.1.0 (unreleased)

- app: the cortex reads and saves model files through the shared weight
  store (@hackbuild/weights, store name hackbuild-weights), so a model
  fetched by the suite or a package page on the same origin is not
  fetched again; the capability row says when files are stored.
- app: hackbuild-ui vanilla entry parts: memory panel with search, add,
  forget, export and erase; confirm in place on forget and erase; an
  events log in more; a yard menu on right click, long press or the menu
  key; a drive pad on touch while manual drive is on.
- app: links to the package pages in more; links into the suite appear
  when the build sets SUITE_URL (empty by default).
- ui: hackbuild-ui 0.5.0 repinned from commit fb95d7c to 5211c3a by
  hackbuild-ui `tools/pin-ui.mjs` (the class layer is unchanged, the
  readme in the tarball moved); `npm run ui:check`, run in CI before
  `npm ci`, checks the tarball, SHA256SUMS, package.json and the lockfile
  against `tools/vendor/hackbuild-ui.pin`.
- repository scaffold: rules, hooks, voice and commit linters, CI.
- legacy: the HACKLE pack under legacy/pack, build.py ported to
  tools/build-html.mjs with byte parity, licence audit in LICENCES.md.
- runner: puppeteer-core with the system Chrome and pinned local routing.
- legacy: deterministic copy with seeded rng, fixed step, sim event
  queue and a lockstep hook.
- scenarios: eleven lockstep scenarios with golden traces.
- app: TypeScript entry, esbuild bundle with three.js and Rapier, local
  fonts, placeholder human, scope modules carried over with traces held.
- app, legacy/det: the owner's five fixes to the handoff build (settings
  diffs, network gait phase, profiler, head yaw seam, scratch vector,
  cortex interval); goldens re-recorded.
- runner: motion metrics per scenario (jerk, sliding, state toggles,
  rAF frame sampler with the per system profiler).
- app: passing rule, dog yield, stall waypoint and two circle dog for
  the human (handoff issue 3); task change releases a held kneel; fetch
  ends while the human is away. golden/cpg now recorded on the app.
- app: the ball no longer stands the seated human up; the dog keeps up
  on a stroll. scenarios: phone-nudge sets the social drive it needs,
  stroll-follow holds the squirrel off, bench-sit checks he stays seated.
- app: ui copy lowercase (page, tune panel, toasts, status chips).
- runner: check:boot no longer overwrites the build with its screenshot
  when --shot is not given.
- app: the page on hackbuild-ui 0.5.0, mobile first; five tabs with the
  yard pinned on phones; welcome card; capability panel; disabled
  controls say why; minds tab for both agents with a cause timeline;
  read only instrumentation, goldens held.
- runner: tools/runner/ux-walk.mjs for screenshots, persona goals and
  frame times.

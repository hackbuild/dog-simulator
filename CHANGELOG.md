# Changelog

Versions follow semver per package. Nothing is published to npm yet.

## 0.1.0 (unreleased)

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

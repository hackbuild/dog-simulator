# legacy

`pack/` is the HACKLE handoff pack as received on 2026-11-22: source, the
network manifest and rig binding, the bake page and scripts, the baked
human clips and licence texts. Byte identical; `assets.lock.json` lists the
sha256 of every file. The large binaries (dog and human models, the voice
reference, network weights, detector models, the clip library) live in
`assets-local/`, outside git.

`pack/src/nn_gait.js`, `pack/src/nn_infer.js` and `pack/nn/quadruped.json`
are CC-BY-NC-4.0 (see `pack/nn/AI4ANIM_NOTICE.txt`). They stay here.

`node tools/build-html.mjs legacy` is the port of `pack/build.py`; with the
pack's inputs it writes the pack's hackle.html byte for byte
(`tools/test/build-parity.test.mjs`).

`pack/` is outside the voice lint and is never edited. The pack's Python is
not run; its scripts carry paths for another machine.

`det/src/` is the deterministic copy of `pack/src`, the step 3 baseline:

- one seeded stream `RNG` (mulberry32) in place of every `Math.random`
  in sim code; audio noise keeps `Math.random`;
- a fixed 1/60 s step with an accumulator (`simStep`), rendering split
  out to `view`; one Rapier step per sim step;
- `SIMQ`, a sim time event queue, in place of the two `setTimeout` sim
  events (the speak bark, the human cue delay);
- `#test&seed=N[&off=L.x,...]` opens in lockstep: no animation loop, no
  detector, the gait network loaded before step 0 and answered inside
  the same step, `window.__sim.step(n)` and `window.__sim.trace()`.

- the five fixes the owner later made to the handoff build: diff only
  settings, touchdown timed gait phase, per system profiler, head yaw
  seam hysteresis, owned scratch vector, cortex interval 25 s. The
  network host side of the phase fix (`legClock`) sits in `body.js`;
  `nn_gait.js` is unchanged.

`node tools/build-html.mjs legacy --mods legacy/det/src --out dist/hackle-det.html`
builds it. `det/src/nn_gait.js` and `det/src/nn_infer.js` keep the
CC-BY-NC-4.0 licence of the files they were copied from.

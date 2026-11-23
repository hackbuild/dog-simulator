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

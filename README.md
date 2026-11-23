# dog-simulator

A dog and its person living in a browser tab. The dog walks, sniffs, plays fetch, sleeps and learns cues; the person runs their day around it. One self contained HTML file.

Status: 2026-11-22, the HACKLE handoff build moved here and made
deterministic. `app/src` holds the app; `legacy/` holds the pack as
received and its deterministic copy; `scenarios/` holds golden traces.
Licence status, 2026-11-23: the app build is not MIT throughout yet. An
audit found that the vendored `@hackbuild/motion-net` was adapted from the
CC-BY-NC network host rather than written from the published architecture
description, so it is now labelled CC-BY-NC-4.0 and the app build includes
CC-BY-NC code through it. A clean-room MIT replacement is being written;
this repository switches to it when it lands.

## Build

    npm run build:app      # dist/dog-simulator.html
    npm run build:legacy   # dist/hackle-legacy.html, the pack build byte for byte
    npm run build:det      # dist/hackle-det.html, the deterministic legacy build

The builds read the dog model from `assets-local/` (outside git, listed in
`assets.lock.json`). The owner's human model and voice reference are used
when `assets-local/` holds them; otherwise the app builds a placeholder
human. Licences of every asset and dependency: LICENCES.md.

## Libraries from the sibling repos

The hackbuild libraries are not on npm. Their built packages are copied into
`vendor/<name>/` from a clone of the sibling repo at a pushed commit, and
`vendor/lock.json` records the repo, the commit and the sha256 of every
copied file. The root `package.json` lists `vendor/*` as workspaces, so
`import ... from '@hackbuild/motion-net'` resolves without a registry, and
esbuild bundles them into the single file with their wasm inlined as base64.

    # in ../hackbuild-motion: build at a pushed, clean commit
    npm run build -w @hackbuild/gait -w @hackbuild/motion-net
    # here
    node tools/vendor-libs.mjs                     # refresh every package in vendor/lock.json
    node tools/vendor-libs.mjs --add hackbuild-agents tunables
    node tools/vendor-libs.mjs --check             # CI runs this

## Neural gait

The dog can walk on the quadruped codebook network (AI4AnimationPy by Paul
Starke and Sebastian Starke, Meta; web export by sweriko). Weights and
manifest are CC-BY-NC-4.0, non commercial use only, and are fetched at
runtime from the pinned upstream commit; the page states the licence when
they load. The code that runs them: `@hackbuild/motion-net` (kernels and
the gait host, CC-BY-NC-4.0 until the clean-room replacement lands) and
`app/src/dog/neural.js` (MIT; bind pose computed from the network, retarget
onto this dog). The layer `L.neural` starts off and
loads the network when you turn it on, so the file opens offline.

## Checks in Chrome

    npm run check:boot -- dist/dog-simulator.html --offline
    npm run check:determinism
    npm run scenarios -- compare --file dist/dog-simulator.html

puppeteer-core drives the system Chrome; requests are served from pinned
local files and any other request fails the run.

## Develop

    source ~/.nvm/nvm.sh && nvm use
    npm ci
    npm test

`npm ci` sets `core.hooksPath` to `.githooks`. Rules for every change are
in RULES.md and CONTRIBUTING.md.

## What is verified, and what is not

### Verified, 2026-11-22, Chrome 150 headless on macOS 12

- `tools/build-html.mjs legacy` writes the pack's hackle.html byte for byte
  (9,315,603 bytes, measured).
- The legacy build boots with zero console errors and no unrouted request,
  and completes one fetch round trip in real time mode.
- Two lockstep runs of the deterministic legacy build with one seed give
  identical traces over 600 sim s, neural gait on.
- The app build contains no code from the CC-BY-NC gait host (test).

### Verified, 2026-11-23, same machine

- The app build reproduces its 29 CPG golden traces exactly (11
  scenarios, 9 more issue seeds, 9 sweep seeds) and opens with the network
  disabled. legacy/det matched the goldens up to commit bc2cf6c (the
  owner's five fixes); the later behaviour fixes are in the app only.
- 28 of 29 CPG traces meet their expectations; scent-trail fails, diagnosed
  in scenarios/README.md. Handoff issue 3: human stall at most 1.5 s
  across the sweep (4.75 s before).
- Motion metrics (jerk, sliding, state toggles, frame time) are reported
  per scenario; see scenarios/README.md.
- UI copy is lowercase; the page was looked at as a still.

### Verified, 2026-11-23, neural gait on motion-net

- legacy/det with motion-net's f64 kernels in place of its own replays
  the 12 legacy neural goldens identical (measured).
- The app build runs the network in lockstep (motion-net host, app
  retarget) and meets 12 of 12 neural issue expectations; it holds the 29
  cpg goldens with the network off.

- hackbuild-agents packages, one commit each, every one holding the 29
  cpg and 12 neural goldens: tunables (the tune registry), senses
  (looming and sound azimuth helpers), drives (model call scheduling),
  scenario (the runner's Chrome launch), cameras (the side view). Mover
  is not adopted; scenarios/README.md says why for each part left out.

### Not verified

- Motion quality: judged by metrics and stills only. Nobody has watched
  the fixes in a browser at real frame rate.
- simSpeed 4 against simSpeed 1 step for step: not run.
- The neural gait in the app build at real frame rate: nobody has watched
  it. In a headless real time boot (2026-11-23, loaded machine) it loaded
  and handed the body back to the pattern generator, since frames ran
  slower than 1/15 s (the host's health rule). The WebGPU and worker
  paths of motion-net have not run in this app.
- Size: dist/dog-simulator.html is 15,039,837 bytes with the owner pack
  after the motion-net gait and the agents packages (2026-11-23, 415,098
  bytes more than the 14,624,739 before them; motion-net carries its wasm
  twice, once for the page and once inside the worker source), and was
  14,620,125 bytes with the owner pack
  and 13,141,035 bytes without (measured), over the 9.3 MB budget. Rapier
  is 4.3 MB of the 5.87 MB script (measured 2026-11-23), the dog model 7.3 MB of base64.
- CI does not run the Chrome checks; they need `assets-local/`.

## Licence

| path | licence |
|---|---|
| code | MIT (LICENSE) |
| README, CHANGELOG, docs | CC-BY-4.0 (LICENSES/CC-BY-4.0.txt), code samples also MIT |

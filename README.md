# dog-simulator

A dog and its person living in a browser tab. The dog walks, sniffs, plays fetch, sleeps and learns cues; the person runs their day around it. One self contained HTML file.

Play it: https://hackbuild.github.io/dog-simulator/

The parts it is built from, as tools: the suite, <https://hackbuild.github.io/hackbuild-suite/>.

Status: 2026-11-22, the handoff build (in `legacy/`) moved here and made
deterministic. `app/src` holds the app; `legacy/` holds the pack as
received and its deterministic copy; `scenarios/` holds golden traces.
Licence status, 2026-11-23: the app build is MIT throughout again. The
vendored `@hackbuild/motion-net` is the clean-room MIT rewrite
(hackbuild-motion a509079 to babcc9f, written from a functional
specification and the published paper by builders who did not read the
CC-BY-NC code), and `app/src/dog/neural.js` was rewritten against it.
The network weights stay CC-BY-NC-4.0, are fetched at run time and are
not in any build.

## Build

    npm run build:app      # dist/dog-simulator.html
    npm run build:public   # dist/dog-simulator-public.html, nothing from assets-local
    npm run build:legacy   # dist/hackle-legacy.html, the pack build byte for byte
    npm run build:det      # dist/hackle-det.html, the deterministic legacy build

The builds read the dog model from `assets-local/` (outside git, listed in
`assets.lock.json`). The owner's human model and voice reference are used
when `assets-local/` holds them; otherwise the app builds a placeholder
human. `build:public` reads nothing from `assets-local/`: the dog is a box
dog written from code (`tools/stub-dog.mjs`), the human the placeholder,
and there is no voice clip. CI builds that file. Licences of every asset
and dependency: LICENCES.md.

The human in the app is the owner, Moheeb Zara. His name, handle and
speech habits are in the mind prompt and the UI copy of every build,
the public one included; this is his own app and he keeps it so. His
likeness files (human model, voice reference) are never committed.

## Libraries from the sibling repos

The hackbuild libraries are not on npm. Their built packages are copied into
`vendor/<name>/` from a clone of the sibling repo at a pushed commit, and
`vendor/lock.json` records the repo, the commit and the sha256 of every
copied file. The root `package.json` lists `vendor/*` as workspaces, so
`import ... from '@hackbuild/motion-net'` resolves without a registry, and
esbuild bundles them into the single file with their wasm inlined as base64.

    # in a clone of https://github.com/hackbuild/hackbuild-motion (or hackbuild-agents)
    # next to this one: build at a pushed, clean commit
    npm run build -w @hackbuild/gait -w @hackbuild/motion-net
    # here
    node tools/vendor-libs.mjs                     # refresh every package in vendor/lock.json
    node tools/vendor-libs.mjs --add hackbuild-agents tunables
    node tools/vendor-libs.mjs --check             # CI runs this

## Neural gait

The dog can walk on the quadruped codebook network (AI4AnimationPy by Paul
Starke and Sebastian Starke, Meta; web export by sweriko). Weights and
manifest are CC-BY-NC-4.0, non commercial use only, and are fetched at
runtime from the pinned upstream commit with a SHA-256 check; the page
states the licence when they load. The code that runs them is MIT:
`@hackbuild/motion-net` (the network on wasm SIMD128 in a worker, and its
`QuadrupedHost`, a `@hackbuild/gait` LocomotionBackend) and
`app/src/dog/neural.js` (rest pose computed from the Idle style pose in the
weights, paw targets and body height, pitch and roll onto this dog, the
switch rules). The layer `L.neural` starts off and loads the network when
you turn it on, so the file opens offline.

## Checks in Chrome

    npm run check:boot -- dist/dog-simulator.html --offline
    npm run check:determinism
    npm run scenarios -- compare --file dist/dog-simulator.html
    npm run scenarios -- compare --set public      # the set CI runs
    npm run check:speed -- dist/dog-simulator.html --seed 7 --seconds 60
    node tools/runner/gait-probe.mjs dist/dog-simulator.html   # neural gait speed and paw slide
    node tools/runner/ux-walk.mjs shots|personas|frames       # phones and desktops, see docs/browser-checks.md

puppeteer-core drives the system Chrome; requests are served from pinned
local files and any other request fails the run.

## Develop

    source ~/.nvm/nvm.sh && nvm use
    npm ci
    npm test

`npm ci` sets `core.hooksPath` to `.githooks`. Rules for every change are
in RULES.md and CONTRIBUTING.md.

## What is verified, and what is not

### Verified, 2026-11-23, page on the hack.build design system

- The page is rebuilt on hackbuild-ui 0.5.0 (vendored pinned by commit,
  class layer and fonts inlined), mobile first: the yard pinned at 46
  percent of the height on a phone with five tabs under it (play, minds,
  senses, body, more), a first run welcome card, one capability panel
  (turn things on) for every optional model and permission, and a
  minds tab for the dog and the human: goal, why and how it was chosen,
  drive and need sparklines over 120 s, choice bars with score, chance
  and commitment, senses with the saliency pull, memory and learned
  words, his plan, model calls, and one cause timeline.
- The minds tab reads read only taps (`EV` in sim/prelude.js,
  `brain.why`, `brain.lastChoice`, `HUM.lastPlan`, `vlm.log` and kin);
  none draws from RNG. 31 of 31 cpg, 12 of 12 neural and 13 of 13
  public goldens replay identical on the new build (measured).
- docs/browser-checks.md: widths, persona results and frame times.

### Verified, 2026-11-23, clean-room motion-net

- gait and motion-net vendored from hackbuild-motion babcc9f;
  `vendor:check` passes. The licence isolation test asserts every
  vendored package in the bundle is MIT, no bundle input comes from
  `legacy/` or is named like the legacy network code, and no manifest
  data is in the file.
- 31 of 31 cpg owner goldens replay identical (the network never loads
  with `L.neural` off); 29 of 31 meet their expectations, as before
  (scent-trail and phone-nudge-late, measured).
- The public build replays its 13 goldens identical, 10 of 13 passing
  as before (measured, this machine).
- Neural issue runs: 12 of 12 expectations with the new host and
  adapter (measured; 12 of 12 with the earlier host, 9 of 12 with the
  first cut of the new adapter, see scenarios/README.md).
  `golden/neural` re-recorded on the new build. The new goldens replay 12 of 12
  identical (measured).
- Gait on the app rig, lockstep: root speed 92 to 100 percent of what
  the motor asked between 0.39 and 2.48 m/s; stance paw slide p50 0 mm,
  p95 3.5 to 9.7 mm per step (measured, `tools/runner/gait-probe.mjs`).
- Real frame rate, headful Chrome, machine GPU, 60 s (`#seed=7&on=L.neural`):
  webgpu, 60 fps in every sample, the network in its worker at 6 to 11 ms
  a prediction and 6 to 11 ms wall clock latency, the network kept the
  body in 29 of 30 samples, no hold (measured). Nobody watched it.
- Size: dist/dog-simulator.html 15,090,554 to 14,778,215 bytes, the
  public file 6,386,942 to 6,074,603 bytes (measured, before and after
  this change).

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
  across the sweep (4.75 s before, both measured). Two of the passes need
  scenario setup, named in their expectation labels: stroll-follow holds
  the squirrel off and phone-nudge sets the social drive; the natural
  variants (stroll-squirrel, phone-nudge-late) are in the list.
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

### Verified, 2026-11-23, audit fix pass

- hackbuild-agents packages re-vendored at 510158c: 29 of 29 cpg and 12
  of 12 neural goldens identical before any app change (measured).
- After the app changes of the pass: 31 of 31 cpg (two natural variants
  added) and 12 of 12 neural goldens identical (measured).
- The public build (`build:public`) replays its 13 goldens identical on
  this machine and on CI (ubuntu-24.04, system Chrome, SwiftShader; run
  45259147367), goldens recorded on macOS arm64 (measured). CI also runs
  the licence isolation test.
- Neural gait at real frame rate, headful Chrome, machine GPU: webgpu
  session, 60 fps, 7 to 9 ms a prediction, the network kept the body in
  30 of 30 samples over 60 s (measured). On SwiftShader the wall clock
  rule handed the body back on slow frames with holds of 2, 4 and 8 s
  (measured). The motion was not watched by a person.
- simSpeed 4 against 1, real time, same seed (7), app build, machine
  GPU: the traces part at 6.25 sim s (the play drive, fourth decimal)
  and the dog ends up to 15.4 m from where it was at simSpeed 1 within
  60 sim s (measured, `scenarios/reports/speed-s7.json`). Real time mode
  is not simSpeed invariant; lockstep is.

### Not verified

- Motion quality: judged by metrics and stills only. Nobody has watched
  the fixes in a browser at real frame rate.
- The neural gait in the app build at real frame rate: nobody has watched
  it, with the earlier host or the clean-room one. The Sit and Lie styles,
  the paw tilt and the body pitch and roll mapping are judged by numbers
  only. The worker fallback to the page has not been seen to run here.
- Size: dist/dog-simulator.html is 14,778,215 bytes with the owner pack
  and dist/dog-simulator-public.html 6,074,603 bytes (measured
  2026-11-23, the owner file over the 9.3 MB budget). Rapier is 4.3 MB of the
  5.56 MB script (5.88 MB before the clean-room motion-net) and the dog
  model 7.3 MB of base64 (measured 2026-11-23); the licence comment adds about 46 KB (measured).
- CI runs the public scenario set only; the owner set and the neural
  goldens need `assets-local/` and run locally.

## Licence

| path | licence |
|---|---|
| code | MIT (LICENSE), `vendor/motion-net` included (clean room, 2026-11-23) |
| `legacy/` | as received: three files CC-BY-NC-4.0 (`nn_gait.js`, `nn_infer.js`, `quadruped.json`), licence texts as they say; see LICENCES.md |
| README, CHANGELOG, docs | CC-BY-4.0 (LICENSES/CC-BY-4.0.txt), code samples also MIT |

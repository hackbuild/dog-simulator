# scenarios

Lockstep scenarios on a built file. `list.mjs` holds the scenarios,
`run.mjs` records or compares golden traces.

    node tools/build-html.mjs app
    node scenarios/run.mjs record --variant cpg --file dist/dog-simulator.html
    node scenarios/run.mjs compare --variant cpg --file dist/dog-simulator.html

- `golden/cpg/`: every scenario with the neural gait layer off, recorded on
  the app build. Up to commit bc2cf6c they came from legacy/det and both
  builds matched them; from the avoidance fix on (handoff issue 3) the app
  changes behaviour and legacy/det stays as the handoff behaved, so only
  the app build is held to them.
- `golden/neural/`: the scenarios for handoff issues 1 and 3 with the
  neural gait on, app build: `@hackbuild/motion-net` (MIT, clean room)
  runs the network and its `QuadrupedHost`, `app/src/dog/neural.js` maps
  it onto the dog. Needs `assets-local/quadruped.bin` (CC-BY-NC-4.0),
  served by the runner in place of the pinned upstream URL. `--nnacc` is
  ignored since 2026-11-23: the engine has one fixed order of sums.
  The layer starts off in the app; the variant opens with `&on=L.neural`.
- `golden/neural-legacy/`: the same runs with the legacy network host
  (CC-BY-NC-4.0), legacy/det builds only (`--variant neural-legacy`).
- `reports/`: the results of each record and compare run, expectations
  included. A failing expectation on an issue scenario is the issue
  reproduced.
- `shots/` (outside git): screenshots for a person to look at. They show
  the human model, so they never leave the machine. The suite does not
  claim visual passes.

Two golden sets:

- owner set (`golden/cpg/`, `golden/neural/`): needs the owner asset pack
  in `assets-local/` (the dog model and the human model); with the
  placeholder human the human moves differently and these goldens do
  not apply. Local runs only.
- public set (`golden/public-cpg/`, `--set public`): the build made by
  `node tools/build-html.mjs stub`, which reads no binary asset (box dog
  from `tools/stub-dog.mjs`, placeholder human). CI builds it and
  compares this set on every push.

    node tools/build-html.mjs stub
    node scenarios/run.mjs compare --set public

Goldens are renderer specific. The dog's saliency reads the pixels of
its eye render, so a trace depends on the rasteriser as well as the
code: every golden here was recorded headless on SwiftShader WebGPU
(Chrome 150, macOS 12, arm64). A different Chrome, GPU path or
platform can move every trace with no code change; that is a reason to
re-record on that machine, after checking that nothing else moved.

Motion metrics (`tools/runner/metrics.mjs`) ride along
on every run unless `--no-metrics` is given; they go into the report
under `metrics` and print per scenario. `node scenarios/metrics.mjs
<report.json>` prints them as a table. All computed in lockstep at
1/60 s steps:

- jerk: third difference of world positions, m/s^3, for the dog head,
  hips and four paws and the human head and hips, while the agent moves;
  p50, p95 and max.
- sliding: seconds an agent moves over 0.15 m/s with its heading more
  than 0.6 rad from its motion direction, out of its moving seconds.
- toggles per second: body source (cpg or network), gait label and
  posture target; flicker counts a change undone within 0.5 s.
- frame time: an rAF sampler in one `page.evaluate` call after the trace,
  90 frames of one sim step and one render each, p50, p95 and max, plus
  `window.__prof` per system. Headless SwiftShader at 1360 by 860 unless
  `--size` says otherwise: these compare builds on one machine and say
  nothing about a real GPU. The step waits for the eye readback every
  0.1 sim s as lockstep does. Frame times in a report run with several
  jobs share the cores between Chromes; compare frame times only from
  runs made the same way.

The sampler wraps `window.__sim.step` and steps one at a time; traces
and hashes are unchanged with it on (20 of 20 runs measured).

Motion quality is judged from these metrics and from stills only; nobody
has looked at these runs in a browser at real frame rate.

Trace rows: one every 0.25 sim s, columns in `list.mjs` `COLS`, rounded to
4 decimals, plus an FNV hash over full precision state at every step.

## Trace changes

### 2026-11-23, clean-room motion-net

`vendor/gait` and `vendor/motion-net` re-vendored from hackbuild-motion
babcc9f. motion-net is the clean-room MIT rewrite (a509079, engine
babcc9f): a network engine in a worker and a `QuadrupedHost` that pins
stance paws and runs its own speed and turn loops. The earlier
`app/src/dog/neural.js` was deleted unread and written again against the
new API; lockstep awaits each prediction after the step that asked for
it, so a prediction lands on the same step on every run.

- cpg: 31 of 31 owner goldens identical on the final build, 29 of 31
  passing as before (measured).
- public set: 13 of 13 identical, 10 of 13 passing as before (measured).
- neural: every trace differs from the first prediction, so
  `golden/neural/` is re-recorded on the new build. Expectations, 12
  issue runs: 12 of 12 with the earlier host (as recorded), 9 of 12 with
  the first cut of the new adapter, 12 of 12 after the adapter fixes
  below (measured). The 3 failures were corridor-pass seeds 2, 3 and 21,
  human stall 2.75, 2.5 and 2 s (measured): on the call the dog ran up to
  2 m past him, since the network slows from 3 m/s over about a second
  and its Sit style does not brake, then crossed his path as he set off.
  The re-recorded goldens replay 12 of 12 identical (measured).
- Adapter rules while the network drives (`NG` in neural.js, read by
  body.js `steer`): heading loops at half gain (at full gain the heading
  swung about 1 rad either side of the goal, measured); a goto approach
  capped by a 1.2 m/s^2 stopping profile (stall on corridor-pass seeds 2,
  3, 21 fell to 1, 1.5 and 0.75 s, measured; longer linear ramps of 1.8 to
  3.5 m left 1.5 to 3.25 s); Sit and Lie styles held until the root is
  under 0.3 m/s; a root faster than asked is asked for less in proportion.
- Gait on the app rig, lockstep, a circle of radius 7 m
  (`tools/runner/gait-probe.mjs`, last 8 of 16 s per speed): the motor
  asked 0.39, 0.84, 1.91 and 2.48 m/s and the root ran 0.39, 0.78, 1.79
  and 2.29 m/s (92 to 100 percent); stance paw slide per step p50 0 mm at
  each speed, p95 9.7, 3.5, 9.6 and 7.9 mm, of which the host's own paws
  account for 9.7, 2.4, 9.0 and 7.7 mm (measured,
  `reports/gait-probe.json`). Before the paw offset was held in the world
  during stance the p50 was 2 to 3 mm (measured).
- `tools/build-html.mjs --infer` (legacy/det with the earlier kernels)
  is removed: it spoke the earlier motion-net API. `golden/neural-legacy`
  is unchanged.

### 2026-11-23, audit fix pass

- hackbuild-agents packages re-vendored at 510158c (was d369aa54):
  29 of 29 cpg and 12 of 12 neural owner goldens identical (measured).
- The audit called the dog's held passing side dead code. Removing it
  moved 8 of 46 cpg owner runs (measured), so it ran; it was restored.
- The app changes of this pass (pinned model loads, wall clock gait
  health, seeded real time) leave the owner
  goldens identical: 29 of 29 cpg and 12 of 12 neural replayed on the
  final build (measured).
- Setups named in the labels: stroll-follow holds the squirrel off,
  phone-nudge sets the social drive to 0.8. The drive rises 0.0032 per
  s apart from him at tempo 1 (0.32 per 100 s, computed from brain.js)
  and falls 0.01 per s within 1.8 m of him; the goldens show 0.2 to 0.3
  per 100 s (measured). An earlier note here said 0.1 per 100 s. Open
  issue: a dog that stays near him drains the drive the nudge needs.
- New natural variants, owner set, recorded on the final build:
  stroll-squirrel (no squirrel hold, seed 9) passes; the audit rerun of
  the same walk passed on seeds 9 and 3 and failed on 2 and 21 (shares
  0.833, 0.623, 0.805, 0.757 on seeds 9, 2, 3, 21, measured).
  phone-nudge-late (no drive setting, the call at 80 s, seed 11) fails:
  no nudge in the 45 s call. Both are open issues.
- Public set, 13 scenarios recorded on the public build and replayed
  13 of 13 identical on the same machine (measured); 10 of 13 meet
  their expectations: scent-trail, stroll-squirrel and phone-nudge-late
  fail, as on the owner build or worse (the box dog and placeholder
  human walk differently).
- Owner set replayed on the final build: 31 of 31 cpg (29 plus the two
  variants) and 12 of 12 neural goldens identical (measured).

### 2026-11-23, hackbuild-agents packages, one at a time

Each adoption is its own commit and held the 29 cpg and 12 neural
goldens identical (measured), 28 of 29 and 12 of 12 passing, unless the
entry says otherwise. The packages come from `vendor/` (hackbuild-agents
commit in `vendor/lock.json`).

- tunables: `TUNE.v`, `TV` and `ON` read and write a
  `@hackbuild/tunables` registry (master layer `L.organic`, saves as
  `{ ver: 2, d }` under the old storage key, a first format save keeps
  its personality through `migrate[0]`). The app keeps its own panel.
- senses: the looming check takes `angularSize` and `timeToContact`, the
  heard azimuth `localizeSound` (same Box Muller draw order, same front
  back mirror). The wasm parts (Saliency, OdourField, Sniffer, Tracker,
  PerceptMemory, OccupancyGrid) are not adopted: each would replace a
  JavaScript sense with a different algorithm or draw order, so the
  traces could not hold. The bundle grew 256 bytes (tree shaken).
- drives: the cortex and the human's model calls go through
  `InferenceScheduler` (one call at a time, a minimum interval; neither
  runs in lockstep). The first automatic cortex call no longer waits 60 s
  after load. `bodyClock` is not adopted: the wasm one differs from the
  app's by one ulp in 123 of 2,000,000 sampled hours (libm exp against
  V8, computed in Node), which would move the hash, since fatigue is part
  of the traced state. Drives, Chooser, CueLearner, Sleep and
  MemoryStream are not adopted: different algorithms and draw orders
  from the app brain.
- scenario: `tools/runner/chrome.mjs` opens Chrome through
  `@hackbuild/scenario`'s `open()` with the app's routes (the font sheet
  as a fixed body, the pinned local files, the npm CDN map). The app
  keeps its launch retry (three tries; a loaded machine took over 30 s to
  start Chrome) and moves onnxruntime warnings out of the error list. The
  lockstep loop, metrics and scenario list stay in the app: the
  package's runner reports in its own shape, and the app's metrics run
  in the page.
- mover: not adopted. `Steerer` is a different passing algorithm from
  `app/src/sim/passing.js` (a potential field with yields and its own
  stall rule against the app's side rule, dog circles and step aside),
  and the capsule `World` would replace Rapier. Either moves every trace
  where the human and the dog meet; the app keeps its own.
- cameras: the side view is a `Follow` camera placed 2.4 m off the dog's
  left and 0.3 m ahead, as before. Render only; lockstep never moves the
  main camera. Looked at as a still: on entering the side view the
  camera now snaps to its place where it used to glide (the first
  `Follow.update` snaps).

### 2026-11-23, one motor state, f64 sums kept

The gait ring, frequency, duty and source label read one
`@hackbuild/gait` MotorState: the network's from the host's phase
estimator, the pattern generator's from its oscillator. The app's own
touchdown clock (`legClock`) is gone. Trace neutral: 12 of 12 neural and
29 of 29 cpg goldens identical (measured). motion-net's `NeuralFallback`
is not used: it wants the procedural gait as a `LocomotionBackend` with a
root, which this app's pattern generator is not; the app keeps its own
switch, with the same rule (stale or slow predictions hand the body back
for 2 s).

f32 sums were tried and not taken. App build, `--nnacc f32` against the
f64 goldens: 12 of 12 traces differ, 11 of 12 expectations pass
(fetch-walkoff seed 21 circles past 4 pi with the ball), against 12 of
12 with f64. In the legacy host the f32 traces part from the f64 ones
between 0.25 and 3.5 sim s (measured), 11 of 12 pass in both. f64 stays
the default; f32 ran a full 16 frame decode in 20.0 ms against 56.5 ms in
Node (motion-net README, measured), the app decodes 9 frames.

### 2026-11-23, the neural gait moves to motion-net

Kernel parity in place: legacy/det built with its network kernels
replaced by motion-net's CPU model (`node tools/build-html.mjs legacy
--mods legacy/det/src --infer motion-net-f64`), host unchanged, replays
12 of 12 `golden/neural-legacy` traces identical (measured), 11 of 12
expectations as before (corridor-pass seed 3 stalls the human). Wall time
for fetch-walkoff 192 s against 517 s with the legacy kernels (measured,
loaded machine, same job count).

The app build now runs the network: motion-net's `CodebookGait` host and
an MIT retarget written for this app. The host carries four fixes over
the legacy host (speed controller integrates its error, a playhead per
sequence so a timescale change never jumps, the request stamped after the
pose update, the standing root hold only without predicted travel), plus
`follow()` now moves the sequences in play (hackbuild-motion 98e32a3:
before it, a root pushed out of the human read 20 to 27 m/s of speed and
snapped back each step). The bind pose is computed from the network
(Idle guidance fed back six times), not read from the legacy bind.json.
So every neural trace differs from `golden/neural-legacy` from the first
row; `golden/neural` is recorded fresh on the app build with f64 sums.
`golden/neural-legacy` also predates the app's avoidance, stroll and
bench fixes, so the two sets differ in behaviour as well as in the gait.

Expectations, 12 neural issue runs: legacy host 11 of 12, app 12 of 12.
corridor-pass seed 3 no longer stalls the human: 4 s of stall (computed
from the trace, walk tasks) to 0 s. Human stall elsewhere moved within
0 to 1.5 s (fetch-walkoff seed 21 2 to 1 s, corridor-pass seed 2 0 to
1.5 s, parked-in-path seed 4 0 to 0.75 s).

The 29 cpg goldens replay identical on the new app build (the network is
never loaded with `L.neural` off); 28 of 29 pass, as before.

### 2026-11-23, stroll follow, phone nudge, bench sit

Seed sweep 9 (or 11, 12), 2, 3, 21 for each, cpg, app build; goldens
for the sweep seeds are new.

- bench-sit: the sit task stood him up when the dog brought the ball
  within 2 m. He now stays seated, says so once, and the ball waits at
  his feet. New expectation: he stays on the bench for the whole run;
  the old golden failed it (up at 27.5 s), now 4 of 4. The old facing
  expectation passed by seed luck before and still passes, 4 of 4. Other
  traces where the dog brings the ball to the seated human diverge from
  that moment: fetch-roundtrip (16.5 s), crouch-greeting, scent-trail,
  fetch-walkoff seeds 2 and 4, parked-in-path seeds 2, 4, 21.
- stroll-follow: the dog hung 2 to 3 m back because sniff detours
  started up to 3 m behind him and it trotted only past 3 m. Detours now
  start within 1.6 m and a lag past 1.8 m is closed at 2.2 m/s. Measured
  share of the walk within 3 m with the squirrel held off: 0.56, 0.79,
  0.74, 0.88 without this change (seeds 9, 2, 3, 21) and 0.96, 0.85,
  0.93, 0.95 with it, 4 of 4 pass. The first squirrel spawns at 25 s in
  every run and the chase plus the way back costs 12 to 18 s of the 55 s
  walk; with it, on an earlier build of this change, the share was 0.62
  and 0.76 on seeds 2 and 21 and passed on 9 and 3. The scenario now
  holds the squirrel to 70 s, since it measures following. Remaining:
  the dog leaves any walk for a squirrel and does not answer a recall
  mid chase (tried, then dropped).
- phone-nudge: the nudge needs a social drive over 0.55; the drive
  starts at 0.40 and rises about 0.1 per 100 s, so no 45 s call could
  reach it. Behaviour unchanged; the scenario sets the drive to 0.8 and
  passes 4 of 4 (before the setting: 0 of 4).

Still failing, diagnosed, not in scope: scent-trail (the dog spends the
minute on chase, fetch and greet before any sniff search; the old pass
came at 57 of 60 s).

### 2026-11-23, avoidance stall (handoff issue 3), app build only

`app/src/sim/passing.js` and its hooks (a rule from earlier
builds): the human passes the dog on a side picked from where the
dog will be in 0.5 s and held at least 1 s; the dog is two circles
along its body for him; the dog steps aside when it stands in his path
(within 0.6 m of his line, his goal away from the dog), timed out at
2.5 s; a stall detector gives him a side waypoint after 2 s under
0.2 m with a goal and no turn; the dog holds its side of him for 1 s
too (the human is the 'you' entry of the obstacle list, scene.js, moved
by human.js every step). Two more causes turned up in the stalled runs:

- corridor-pass seed 21: the human stood 4 s because the kneel layer
  of the pet task before kept playing through its hold window after the
  task changed. A task change now sends a held kneel straight
  to its stand up (1.3 s), unless the new task kneels too.
- reunion-errand, after the change above: the dog kept fetching to a
  human who had left through the gate for 100 s and never waited at the
  door. Fetch now scores zero while he is away.

Human stall seconds (computed) on the issue 3 sweep, before and after:
parked-in-path seeds 3, 4, 21: 0, 0, 4.25 to 0, 0, 0.5; seed 2 (new) 0;
corridor-pass seeds 3, 4, 21: 1.5, 0, 4.75 to 1.5, 0, 1.5; seed 2 (new)
0.5. All 8 pass, against 6 of 8 before. fetch-walkoff seed 3 now meets
its delivery and turning bounds as well.

Trace changes: every scenario where the human walks near the dog
diverges from the first close pass (side rule and dog circles, measured
by turning each piece off in turn): corridor-pass, fetch-walkoff,
parked-in-path, reunion-errand (2.25 s), stroll-follow (3.25 s),
crouch-greeting (9.5 s), repeat-cue (14.25 s), scent-trail (32 s),
bench-sit (37 s). fetch-roundtrip and phone-nudge are identical.
Expectation outcomes elsewhere did not move.

### 2026-11-22, the owner's five fixes (lessons from earlier builds)

Ported to `app/src` and `legacy/det/src` together; both builds give the
same hash on all 20 cpg runs (measured). Goldens re-recorded on
legacy/det.

- settings saved as `{ ver: 2, d }` with the defaults left out, older
  saves keep only the personality: trace neutral (lockstep reads no
  saved settings).
- touchdown timed phase, duty and stride frequency for the network gait,
  and the frequency chip reading the active source: trace neutral (cpg
  runs never call it; the trace does not hold instrument values).
- per system profiler `pm(label)` into `window.__prof`, shown on hover
  of the fps chip: trace neutral (wall clock only).
- owned scratch vector in place of `nk.clone()` in `lookAt`: trace
  neutral (`nk` already was `tmpV[6]`).
- cortex minimum interval 12 to 25 s: trace neutral (no cortex in
  lockstep).
- atan2 seam hysteresis on the head yaw: changes every trace. For a
  target behind the dog the head keeps the side it turned to instead of
  whipping across, which moves the eye camera (what the dog sees and
  attends to), the mouth and the carried ball, so behaviour choices
  shift within the first second. A build with only this fix reverted
  gave identical traces to the old goldens on fetch-roundtrip,
  crouch-greeting and repeat-cue (measured).

Expectation outcomes that moved with the new traces (cpg): bench-sit
fail to pass (the dog stays idle and plays instead of fetching until
22 s, so the human is still seated facing out past 15 s; at 26 s the
ball still stands him up), scent-trail pass to fail (the old run
reached the decide phase at 57 of 60 s; the new run spends the minute
on chase, fetch and greet), fetch-walkoff seed 3 now also misses the 20 s
delivery bound. With the legacy network host (golden/neural), corridor-pass
seed 3 now stalls the human (1 of 12 neural runs; 0 of 12 before).

## Metrics, 2026-11-23, app build after all fixes

`reports/compare-cpg.json`, `-issues.json`, `-sweep.json` (29 goldens,
all identical, 28 pass; frame times again from parallel headless runs).
Computed, against the table below:

- Dog sliding falls where the human and dog used to meet: fetch-roundtrip
  3.8 to 0.4 of about 21 to 25 moving s, parked-in-path 2.8 to 1.1,
  fetch-walkoff seed 3 3.7 to 0.3. Highest left: scent-trail and
  bench-sit seed 3, 2.9 s each. Human sliding at most 2 s of 82 (stroll).
- Posture target toggles in parked-in-path 2.0 to 1.6 per s; up to 2.0
  per s in stroll-follow seed 21. Gait label toggles 0.1 to 1.2 per s.
- Frame time, fetch-roundtrip alone at 420 by 280 (`compare-cpg-frames-
  before.json`, `-after.json`): p50/p95/max 100/382/384 ms before, 100/
  267/367 ms after. Headless SwiftShader with the eye readback awaited;
  no claim about a GPU.

## Metrics, 2026-11-22, app build after the five fixes

`reports/compare-cpg.json` and `compare-cpg-issues.json`, computed in
lockstep (frame times from 8 headless Chromes on 8 cores, not usable
beyond a rough order).

- The dog slides: heading more than 0.6 rad off its motion for 3.8 of
  24.7 moving s in fetch-roundtrip, 2.8 of 17.9 s in parked-in-path, 3.7
  of 48.9 s in fetch-walkoff seed 3; under 0.5 s in most others. The
  human slides under 1 s everywhere.
- Posture targets toggle 0.2 to 2.0 times per s, with up to 22 changes
  undone within 0.5 s (parked-in-path): the busiest signal of the three.
  Gait labels 0.5 to 1.2 per s. The body source never switches (cpg).
- Jerk p95: dog head 600 to 2500 m/s^3, hips 370 to 1340, paws 5900 to
  13400. In fetch-roundtrip the human head is below the dog head at p50
  (94 against 191) and above it at p95 (3944 against 1619).

## Findings, 2026-11-22, legacy/det build

Measured in lockstep (sim seconds, not real frame rate). Motion quality
was not judged; screenshots were looked at as stills only.

- Issue 1 (fetch while the human walks off): not reproduced. The ball
  reached the human within 20 s in all 8 runs (seeds 2, 3, 4, 21; CPG and
  neural). One CPG run (seed 3) turned 5.2 pi near the human while holding
  the ball, over the 4 pi bound, and still delivered. Lockstep answers each
  gait prediction inside its step, so the stale prediction path the
  handoff saw at simSpeed 3 cannot occur here.
- Issue 3 (avoidance stall): stall expectations fail in 2 of 7 CPG runs:
  corridor-pass seed 21 (the human stands 4.75 s with a walk goal and the
  dog 0.7 m away) and parked-in-path seed 21 (4.25 s, in a later planner
  wander with the dog 3.4 m away). 0 of 8 neural runs. Cause not isolated.
- Other failing expectations: stroll-follow (dog within 3 m for under 80
  percent of the walk), phone-nudge (no nudge in 45 s), bench-sit (the dog
  brings the ball, which stands the human up by design).

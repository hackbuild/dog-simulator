# scenarios

Lockstep scenarios on a built file. `list.mjs` holds the scenarios,
`run.mjs` records or compares golden traces.

    node tools/build-html.mjs legacy --mods legacy/det/src --out dist/hackle-det.html
    node scenarios/run.mjs record --variant cpg
    node scenarios/run.mjs compare --variant cpg --file dist/dog-simulator.html

- `golden/cpg/`: every scenario with the neural gait layer off. Every build
  must reproduce these traces exactly; the app build is checked against them.
- `golden/neural/`: the scenarios for handoff issues 1 and 3 with the legacy
  network host on. Legacy builds only.
- `reports/`: the results of each record and compare run, expectations
  included. A failing expectation on an issue scenario is the issue
  reproduced.
- `shots/` (outside git): screenshots for a person to look at. They show
  the human model, so they never leave the machine. The suite does not
  claim visual passes.

Traces need the owner asset pack in `assets-local/` (the dog model and the
human model); with the placeholder human the human moves differently and
the goldens do not apply.

Trace rows: one every 0.25 sim s, columns in `list.mjs` `COLS`, rounded to
4 decimals, plus an FNV hash over full precision state at every step.

## Trace changes

### 2026-11-22, the owner's five fixes (hackle-plan lesson set)

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

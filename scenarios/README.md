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

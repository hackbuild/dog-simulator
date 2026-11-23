// Scenario list. Each scenario runs in lockstep from a seed.
// Actions are page code with h = window.__hackle; `when` actions fire once,
// at the first 0.25 s probe where the condition holds. Expectations read the
// trace rows (column names in COLS) and the probe values.
export const COLS = ["step", "t", "dogX", "dogZ", "dogYaw", "dogV", "humX", "humZ", "humYaw", "humV", "ballX", "ballY", "ballZ", "hunger", "fatigue", "play", "social", "hour", "tgtX", "tgtZ", "cur", "sub", "task", "held", "gait", "hash"];
export const row = (r) => Object.fromEntries(COLS.map((c, i) => [c, r[i]]));

const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const place = (who, x, z, yaw) =>
  who === "dog"
    ? `h.dog.pos.set(${x}, h.dog.pos.y, ${z}); h.dog.yaw = ${yaw};`
    : `h.HUM.pos.set(${x}, h.HUM.pos.y, ${z}); h.HUM.yaw = ${yaw};`;
// a side view framing the dog and the human
export const sideShot = `h.setCam(1); const D = h.dog.pos, H = h.HUM.pos; const mx = (D.x + H.x) / 2, mz = (D.z + H.z) / 2, s = Math.max(4, Math.hypot(D.x - H.x, D.z - H.z) * 1.2 + 2.5); h.controls.target.set(mx, 0.6, mz); h.camera.position.set(mx + s * 0.8, 2.4, mz + s * 0.6); h.controls.update();`;

/** seconds where an agent with a goal moved under 0.2 m over the previous 2 s */
export function stallSeconds(rows, who, hasGoal) {
  const R = rows.map(row);
  let s = 0;
  for (let i = 8; i < R.length; i++) {
    const a = R[i], b = R[i - 8];
    if (!hasGoal(a)) continue;
    const d = who === "dog" ? dist(a.dogX, a.dogZ, b.dogX, b.dogZ) : dist(a.humX, a.humZ, b.humX, b.humZ);
    if (d < 0.2) s += 0.25;
  }
  return s;
}

/** cumulative dog heading change in radians over rows where pred holds */
export function turning(rows, pred) {
  const R = rows.map(row);
  let s = 0;
  for (let i = 1; i < R.length; i++) {
    if (!pred(R[i])) continue;
    let d = R[i].dogYaw - R[i - 1].dogYaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    s += Math.abs(d);
  }
  return s;
}

export const SCENARIOS = [
  {
    name: "fetch-roundtrip", seed: 1, seconds: 45,
    actions: [{ at: 2, js: "h.throwBall();" }],
    shots: [{ at: 44, path: "fetch-roundtrip.png", js: sideShot }],
    expect: [
      { label: "the dog picks the ball up", check: (R) => R.some((r) => r.held === 1) },
      { label: "the ball comes back within 1.5 m of the human", check: (R) => { const i = R.findIndex((r) => r.held === 1); return i >= 0 && R.slice(i).some((r) => r.held === 0 && r.cur === "fetch" && dist(r.ballX, r.ballZ, r.humX, r.humZ) < 1.5); } },
    ],
  },
  {
    // handoff known issue 1: the human walks off while the dog brings the ball back
    name: "fetch-walkoff", seed: 2, seconds: 60, issue: 1,
    actions: [
      { at: 2, js: "h.throwBall();" },
      { when: "h.ball().held", js: "const H = h.HUM.pos; const to = h.V3(H.x > 0 ? H.x - 7 : H.x + 7, 0, H.z > 0 ? H.z - 4 : H.z + 4); h.startTask('wander', { to }, 'scenario: walk off');" },
    ],
    shots: [{ at: 30, path: "fetch-walkoff-30s.png", js: sideShot }, { at: 59, path: "fetch-walkoff.png", js: sideShot }],
    expect: [
      { label: "the dog picks the ball up", check: (R) => R.some((r) => r.held === 1) },
      { label: "the ball reaches the human within 20 s of the walk off", check: (R) => { const i = R.findIndex((r) => r.held === 1); if (i < 0) return false; const end = R[i].t + 20; return R.slice(i).some((r) => r.t <= end && r.held === 0 && dist(r.ballX, r.ballZ, r.humX, r.humZ) < 1.5); } },
      { label: "the dog does not circle while it holds the ball (turning under 4 pi near the human)", check: (R, rows) => turning(rows, (r) => r.held === 1 && dist(r.dogX, r.dogZ, r.humX, r.humZ) < 3 && r.dogV < 0.6) < 4 * Math.PI },
    ],
  },
  {
    // handoff known issue 3: the dog stands in the human's path
    name: "parked-in-path", seed: 3, seconds: 40, issue: 3,
    actions: [
      { at: 0, js: place("human", 0, -4, 0) + place("dog", 0, 0, Math.PI) },
      { at: 0.5, js: "h.startTask('wander', { to: h.V3(0, 0, 4) }, 'scenario: walk through the dog');" },
    ],
    shots: [{ at: 8, path: "parked-in-path-8s.png", js: sideShot }, { at: 20, path: "parked-in-path.png", js: sideShot }],
    expect: [
      { label: "the human reaches the far side (z > 3.2) within 15 s", check: (R) => R.some((r) => r.t < 15.5 && r.humZ > 3.2) },
      { label: "human stall under 2 s while walking", check: (R, rows) => stallSeconds(rows, "human", (r) => r.task === "wander") < 2 },
    ],
  },
  {
    // issue 3, head on: the human calls the dog, then walks through where it stands
    name: "corridor-pass", seed: 4, seconds: 45, issue: 3,
    actions: [
      { at: 0, js: place("human", -3, 0, Math.PI / 2) + place("dog", 3, 0, -Math.PI / 2) },
      { at: 0.5, js: "h.startTask('call', {}, 'scenario: call');" },
      { at: 6, js: "const H = h.HUM.pos, D = h.dog.pos; const dx = D.x - H.x, dz = D.z - H.z, l = Math.hypot(dx, dz) || 1; h.startTask('wander', { to: h.V3(H.x + dx / l * 6, 0, H.z + dz / l * 6) }, 'scenario: walk through');" },
    ],
    shots: [{ at: 9, path: "corridor-pass-9s.png", js: sideShot }, { at: 25, path: "corridor-pass.png", js: sideShot }],
    expect: [
      { label: "human stall under 2 s while walking", check: (R, rows) => stallSeconds(rows, "human", (r) => r.task === "wander" && r.t > 6) < 2 },
    ],
  },
  {
    name: "crouch-greeting", seed: 5, seconds: 30,
    actions: [{ at: 0, js: place("human", 0, -3, 0) + place("dog", 0, 1.5, Math.PI) }, { at: 0.5, js: "h.startTask('pet', { crouch: true }, 'scenario: crouch');" }],
    shots: [{ at: 12, path: "crouch-greeting.png", js: sideShot }],
    expect: [{ label: "the human ends up within 1.2 m of the dog", check: (R) => R.some((r) => dist(r.dogX, r.dogZ, r.humX, r.humZ) < 1.2) }],
  },
  {
    name: "reunion-errand", seed: 6, seconds: 150,
    actions: [{ at: 0.5, js: "h.startTask('errand', { hours: 2 }, 'scenario: errand');" }],
    probes: [{ every: 1, js: "[h.brain.reunionI || 0, h.HUM.away ? 1 : 0]" }],
    shots: [{ at: 60, path: "reunion-errand-waiting.png", js: "h.setCam(1); const D = h.dog.pos; h.controls.target.set(D.x, 0.4, D.z); h.camera.position.set(D.x + 3.5, 2, D.z + 3.5); h.controls.update();" }],
    expect: [
      { label: "the dog waits at the door while he is away", check: (R) => R.some((r) => r.cur === "waitdoor") },
      { label: "the dog greets him on return", check: (R) => R.some((r) => r.cur === "greet" && r.task === "errand") },
    ],
  },
  {
    name: "scent-trail", seed: 8, seconds: 60,
    actions: [{ at: 1, js: "h.spawnSquirrel && h.spawnSquirrel();" }],
    probes: [{ every: 0.5, js: "h.brain.sn ? h.brain.sn.mode : ''" }],
    expect: [{ label: "the sniff search reaches its decide phase", check: (R, rows, probes) => probes.some(([, m]) => m === "decide") }],
  },
  {
    // the first squirrel comes at 25 s in every run, mid walk, and a chase with the way back costs
    // 12 to 18 s of the 55 s walk (seeds 2, 3, 9, 21, measured); this scenario measures following, so
    // the squirrel is held off until the walk is over (scenarios/README.md, findings)
    name: "stroll-follow", seed: 9, seconds: 110,
    actions: [{ at: 0, js: "h.squirrel.next = 70;" }, { at: 0.5, js: "h.startTask('stroll', {}, 'scenario: stroll');" }],
    shots: [{ at: 40, path: "stroll-follow.png", js: sideShot }],
    expect: [{ label: "with the squirrel held off: the dog stays within 3 m for 80 percent of the walk", check: (R) => { const w = R.filter((r) => r.task === "stroll"); return w.length > 0 && w.filter((r) => dist(r.dogX, r.dogZ, r.humX, r.humZ) < 3).length / w.length >= 0.8; } }],
  },
  {
    // the same walk with the squirrel left alone: the dog chases it on every seed; the share holds
    // on seed 9 and fails on seeds 2 and 21 (audit rerun, measured) until the dog answers a recall
    // mid chase (scenarios/README.md, findings)
    name: "stroll-squirrel", seed: 9, seconds: 110,
    actions: [{ at: 0.5, js: "h.startTask('stroll', {}, 'scenario: stroll');" }],
    expect: [{ label: "with the squirrel free: the dog stays within 3 m for 80 percent of the walk", check: (R) => { const w = R.filter((r) => r.task === "stroll"); return w.length > 0 && w.filter((r) => dist(r.dogX, r.dogZ, r.humX, r.humZ) < 3).length / w.length >= 0.8; } }],
  },
  {
    name: "repeat-cue", seed: 10, seconds: 25,
    actions: [{ at: 0, js: place("human", 0, -1.5, 0) + place("dog", 0, 0.5, Math.PI) }, { at: 1, js: "h.brain.cue('sit');" }, { at: 5, js: "h.brain.cue('sit');" }, { at: 10, js: "h.brain.cue('down');" }],
    shots: [{ at: 8, path: "repeat-cue-sit.png", js: sideShot }, { at: 14, path: "repeat-cue-down.png", js: sideShot }],
    expect: [{ label: "the dog obeys or refuses each cue (obey or confused appears)", check: (R) => R.some((r) => r.cur === "obey" || r.cur === "confused") }],
  },
  {
    // the nudge needs a dog that wants company (social drive over 0.55, brain.js); the drive starts
    // at 0.40, rises 0.0032 per s apart from him at tempo 1 (0.32 per 100 s, computed) and falls
    // 0.01 per s within 1.8 m of him, so a dog kept beside him never gets there: the scenario sets it
    name: "phone-nudge", seed: 11, seconds: 50,
    actions: [{ at: 0, js: place("human", 0, -1.5, 0) + place("dog", 0, 1.5, Math.PI) + " h.brain.d.social = 0.8;" }, { at: 0.5, js: "h.startTask('phone', { dur: 45 }, 'scenario: phone');" }],
    shots: [{ at: 30, path: "phone-nudge.png", js: sideShot }],
    expect: [{ label: "with social drive set to 0.8: the dog nudges while he is on the phone", check: (R) => R.some((r) => r.cur === "nudge") }],
  },
  {
    // the natural case: no drive setting, the call starts after 80 s of the dog's own day
    name: "phone-nudge-late", seed: 11, seconds: 130,
    actions: [{ at: 80, js: "h.startTask('phone', { dur: 45 }, 'scenario: phone');" }],
    expect: [{ label: "with no setting, a call after 80 s: the dog nudges while he is on the phone", check: (R) => R.some((r) => r.cur === "nudge") }],
  },
  {
    name: "bench-sit", seed: 12, seconds: 40,
    actions: [{ at: 0.5, js: "h.startTask('sit', { dur: 60 }, 'scenario: bench');" }],
    shots: [{ at: 30, path: "bench-sit.png", js: "h.setCam(1); const H = h.HUM.pos; h.controls.target.set(H.x, 0.7, H.z); h.camera.position.set(H.x + 1.5, 1.6, H.z + 3.2); h.controls.update();" }],
    expect: [
      { label: "the human sits facing out (yaw within 0.3 rad of pi)", check: (R) => R.some((r) => r.task === "sit" && Math.abs(Math.atan2(Math.sin(Math.PI - r.humYaw), Math.cos(Math.PI - r.humYaw))) < 0.3 && r.humV < 0.05 && r.t > 15) },
      // a 60 s sit outlasts the run: nothing the dog does (bringing the ball) stands him up
      { label: "he stays on the bench for the whole run", check: (R) => R.filter((r) => r.t > 1).every((r) => r.task === "sit") },
    ],
  },
];

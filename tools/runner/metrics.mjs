// Motion metrics (HACKLE lesson 9), sampled in the page at every sim step.
// install() wraps window.__sim.step so each step is followed by one sample;
// the wrapper calls the original step one step at a time, so the trace and
// its hash are unchanged. frames() is the rAF sampler: one page.evaluate call
// that steps and renders once per animation frame for a set frame count and
// returns frame time percentiles and the per system profiler (window.__prof).
//
// Metrics, all computed (lockstep sim time, 1/60 s steps):
// - jerk: third difference of world positions over consecutive steps,
//   |p3 - 3 p2 + 3 p1 - p0| / dt^3 in m/s^3, for the dog head, hips and the
//   four paws and the human head and hips, only while the agent moves
//   (over 0.1 m/s across the last 0.1 s); a step of over 0.5 m (a scenario
//   teleport) resets the history
// - sliding: seconds where the agent moves over 0.15 m/s and the angle
//   between its heading and its motion direction over the last 0.1 s is
//   over 0.6 rad
// - toggles: changes per sim second of the body source (cpg or network),
//   the gait label and the posture target; flicker counts a change that
//   reverts within 0.5 s
// Frame times come from headless Chrome with SwiftShader and say nothing
// about a real GPU; they compare builds on one machine.

/** page code: installs window.__metrics; run after window.__sim exists */
export const INSTALL = `(() => {
  if (window.__metrics) return;
  const h = window.__hackle, sim = window.__sim, dt = sim.dt, dog = h.dog, HUM = h.HUM, NG = h.NG;
  const pts = {}, jerk = { dogHead: [], dogHip: [], dogPaw: [], humHead: [], humHip: [] };
  const hist = { dog: [], hum: [] };
  const slide = { dog: 0, hum: 0, dogMove: 0, humMove: 0 };
  const tog = { src: [], gait: [], posture: [] }, lastLab = {};
  let steps = 0;
  const wp = (o) => { const v = h.V3(); o.getWorldPosition(v); return v; };
  function push(key, group, p, moving) {
    const a = pts[key] || (pts[key] = []);
    if (a.length && a[a.length - 1].distanceTo(p) > 0.5) a.length = 0;
    a.push(p); if (a.length > 4) a.shift();
    if (!moving) { a.length = 0; return; }
    if (a.length === 4) {
      const [p0, p1, p2, p3] = a;
      const x = p3.x - 3 * p2.x + 3 * p1.x - p0.x, y = p3.y - 3 * p2.y + 3 * p1.y - p0.y, z = p3.z - 3 * p2.z + 3 * p1.z - p0.z;
      jerk[group].push(Math.hypot(x, y, z) / (dt * dt * dt));
    }
  }
  function agent(name, pos, yaw) {
    const hs = hist[name]; hs.push([pos.x, pos.z]); if (hs.length > 7) hs.shift();
    if (hs.length < 7) return { moving: false };
    const dx = hs[6][0] - hs[0][0], dz = hs[6][1] - hs[0][1], sp = Math.hypot(dx, dz) / (6 * dt);
    if (Math.hypot(hs[6][0] - hs[5][0], hs[6][1] - hs[5][1]) > 0.5) { hs.length = 0; return { moving: false }; }
    if (sp > 0.15) {
      slide[name + 'Move'] += dt;
      const c = (Math.sin(yaw) * dx + Math.cos(yaw) * dz) / Math.hypot(dx, dz);
      if (Math.acos(Math.max(-1, Math.min(1, c))) > 0.6) slide[name] += dt;
    }
    return { moving: sp > 0.1 };
  }
  function label(key, v, t) { if (lastLab[key] !== undefined && lastLab[key] !== v) tog[key].push([t, lastLab[key], v]); lastLab[key] = v; }
  function sample() {
    steps++;
    const t = h.time();
    if (!dog.ready) return;
    const d = agent('dog', dog.pos, dog.yaw);
    push('dHead', 'dogHead', wp(dog.bones['head']), d.moving);
    if (dog.bones['hips']) push('dHip', 'dogHip', wp(dog.bones['hips']), d.moving);
    dog.legs.forEach((l, i) => push('dPaw' + i, 'dogPaw', wp(l.end), d.moving));
    if (HUM.pos && !HUM.away) {
      const u = agent('hum', HUM.pos, HUM.yaw || 0);
      if (HUM.map && HUM.map.head) push('hHead', 'humHead', wp(HUM.map.head), u.moving);
      if (HUM.map && HUM.map.hips) push('hHip', 'humHip', wp(HUM.map.hips), u.moving);
    }
    label('src', NG.active ? 'network' : 'cpg', t);
    const gw = dog.gaitW || [];
    label('gait', NG.active ? 'nn ' + NG.guidance : dog.standing ? 'stand' : 'g' + gw.indexOf(Math.max(...gw)), t);
    let pk = 'stand', pv = 0.5; for (const k in dog.postureT) if (dog.postureT[k] > pv) { pv = dog.postureT[k]; pk = k; }
    label('posture', pk, t);
  }
  const orig = sim.step;
  sim.step = async (n) => { let r; for (let i = 0; i < n; i++) { r = await orig(1); sample(); } return r; };
  const pc = (a, q) => { if (!a.length) return null; const s = Float64Array.from(a).sort(); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
  const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
  window.__metrics = {
    summary() {
      const secs = steps * dt, out = { simSeconds: r1(secs), jerk: {}, slide: {}, toggles: {} };
      for (const k in jerk) out.jerk[k] = { n: jerk[k].length, p50: r1(pc(jerk[k], 0.5)), p95: r1(pc(jerk[k], 0.95)), max: r1(pc(jerk[k], 1)) };
      for (const a of ['dog', 'hum']) out.slide[a] = { seconds: r1(slide[a]), movingSeconds: r1(slide[a + 'Move']), fraction: slide[a + 'Move'] ? Math.round(slide[a] / slide[a + 'Move'] * 1000) / 1000 : 0 };
      for (const k in tog) {
        const L = tog[k]; let flick = 0;
        for (let i = 1; i < L.length; i++) if (L[i][0] - L[i - 1][0] < 0.5 && L[i][2] === L[i - 1][1]) flick++;
        out.toggles[k] = { count: L.length, perSecond: Math.round(L.length / Math.max(secs, 1e-9) * 1000) / 1000, flicker: flick };
      }
      return out;
    },
    // rAF sampler: one call; after 3 warm up frames (shader compiles), one sim step and one render per
    // animation frame until n frames or ms of wall time. The step waits for the eye readback every
    // 0.1 sim s, as lockstep does; the live loop does not wait for it.
    frames(n = 90, ms = 20000) {
      const P = window.__prof || {};
      return new Promise((res) => {
        const dts = [], work = []; let last = 0, warm = 3, t0 = 0;
        const tick = async (ts) => {
          if (warm > 0) { warm--; if (!warm) { for (const k in P) delete P[k]; t0 = performance.now(); } }
          else { if (last) dts.push(ts - last); }
          last = ts;
          const w0 = performance.now(); await orig(1); sim.render(); if (!warm && t0) work.push(performance.now() - w0);
          if (warm || (dts.length < n && performance.now() - t0 < ms)) requestAnimationFrame(tick);
          else {
            const prof = {}; for (const k in P) prof[k] = { avgMs: Math.round(P[k].tot / Math.max(P[k].n, 1) * 100) / 100, maxMs: Math.round(P[k].max * 100) / 100, n: P[k].n };
            res({ frames: dts.length, frameMs: { p50: r1(pc(dts, 0.5)), p95: r1(pc(dts, 0.95)), max: r1(pc(dts, 1)) }, workMs: { p50: r1(pc(work, 0.5)), p95: r1(pc(work, 0.95)), max: r1(pc(work, 1)) }, viewport: [innerWidth, innerHeight], prof });
          }
        };
        requestAnimationFrame(tick);
      });
    },
  };
})()`;

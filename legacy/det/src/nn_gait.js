// ---------- neural gait: AI4AnimationPy quadruped codebook matching network, ported from sweriko/ai4anim-webgpu ----------
// Model and mocap: Paul Starke and Sebastian Starke (Meta, AI4AnimationPy), CC BY-NC 4.0. Web port: sweriko, CC BY-NC 4.0.
// The network predicts 16 future frames (0.5 s) of a 27 bone dog from its current pose, a target root trajectory and a guidance
// pose (Idle, Walk, Pace, Trot, Canter, Sit, Stand, Lie). Weights (17.7 MB fp16) load on demand from GitHub at a pinned commit;
// inference runs on the CPU in a worker. The output is retargeted onto the Meshy rig by world space rotation deltas from the two
// bind poses, with paw targets scaled by leg length ratio and locked to the ground by the predicted contacts.
const NNURL = 'https://raw.githubusercontent.com/sweriko/ai4anim-webgpu/b539455f849f284a1e814eb11ab649eb594319dc/public/';
const NNBIND = /*@@NNBIND@@*/[];
const NM = {
  create() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  mul(o, a, b) { const r = new Float32Array(16); for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) r[c * 4 + rr] = a[rr] * b[c * 4] + a[4 + rr] * b[c * 4 + 1] + a[8 + rr] * b[c * 4 + 2] + a[12 + rr] * b[c * 4 + 3]; o.set(r); return o; },
  inv(o, m) { const r = new Float32Array(16); r[0] = m[0]; r[1] = m[4]; r[2] = m[8]; r[4] = m[1]; r[5] = m[5]; r[6] = m[9]; r[8] = m[2]; r[9] = m[6]; r[10] = m[10];
    const tx = m[12], ty = m[13], tz = m[14]; r[12] = -(r[0] * tx + r[4] * ty + r[8] * tz); r[13] = -(r[1] * tx + r[5] * ty + r[9] * tz); r[14] = -(r[2] * tx + r[6] * ty + r[10] * tz); r[15] = 1; o.set(r); return o; },
  pos: m => [m[12], m[13], m[14]], ax: (m, k) => [m[k * 4], m[k * 4 + 1], m[k * 4 + 2]],
  setPos(m, p) { m[12] = p[0]; m[13] = p[1]; m[14] = p[2]; },
  tp: (m, v) => [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]],
  td: (m, v) => [m[0] * v[0] + m[4] * v[1] + m[8] * v[2], m[1] * v[0] + m[5] * v[1] + m[9] * v[2], m[2] * v[0] + m[6] * v[1] + m[10] * v[2]],
  itd: (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[4] * v[0] + m[5] * v[1] + m[6] * v[2], m[8] * v[0] + m[9] * v[1] + m[10] * v[2]],
  fromTR(o, t, r) { o[0] = r[0]; o[1] = r[1]; o[2] = r[2]; o[3] = 0; o[4] = r[3]; o[5] = r[4]; o[6] = r[5]; o[7] = 0; o[8] = r[6]; o[9] = r[7]; o[10] = r[8]; o[11] = 0; o[12] = t[0]; o[13] = t[1]; o[14] = t[2]; o[15] = 1; return o; },
  renorm(m) { const y = nv([m[4], m[5], m[6]]); let z = nv([m[8], m[9], m[10]]); const x = nv(cr(y, z)); z = nv(cr(x, y)); m[0] = x[0]; m[1] = x[1]; m[2] = x[2]; m[4] = y[0]; m[5] = y[1]; m[6] = y[2]; m[8] = z[0]; m[9] = z[1]; m[10] = z[2]; },
  lerp(o, a, b, t) { for (let i = 0; i < 16; i++) o[i] = a[i] + (b[i] - a[i]) * t; NM.renorm(o); return o; },
  look(z, y) { const nz = nv(z), ny = nv(y), x = cr(ny, nz); return [x[0], x[1], x[2], ny[0], ny[1], ny[2], nz[0], nz[1], nz[2]]; },
  planar(z) { const nz = nv([z[0], 0, z[2]]); if (nz[0] * nz[0] + nz[2] * nz[2] < 1e-8) return [1, 0, 0, 0, 1, 0, 0, 0, 1]; const x = nv(cr([0, 1, 0], nz)); return [x[0], x[1], x[2], 0, 1, 0, nz[0], nz[1], nz[2]]; },
  quat(m) { const q = new THREE.Quaternion(); const e = new THREE.Matrix4().set(m[0], m[4], m[8], 0, m[1], m[5], m[9], 0, m[2], m[6], m[10], 0, 0, 0, 0, 1); return q.setFromRotationMatrix(e); }
};
const nv = v => { const l = Math.hypot(v[0], v[1], v[2]); return l > 1e-12 ? [v[0] / l, v[1] / l, v[2] / l] : [0, 0, 0]; };
const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vlerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const vslerp = (a, b, t) => { const na = nv(a), nb = nv(b); const d = clamp(na[0] * nb[0] + na[1] * nb[1] + na[2] * nb[2], -1, 1); if (d > 0.9995) return nv(vlerp(na, nb, t)); const th = Math.acos(d) * t; const p = nv([nb[0] - na[0] * d, nb[1] - na[1] * d, nb[2] - na[2] * d]); return [na[0] * Math.cos(th) + p[0] * Math.sin(th), na[1] * Math.cos(th) + p[1] * Math.sin(th), na[2] * Math.cos(th) + p[2] * Math.sin(th)]; };
const lerpDt = (a, b, dt, r) => vlerp(a, b, 1 - Math.exp(-dt * r));
const qsl = (a, b, t) => { const o = [0, 0, 0, 1]; let bx = b[0], by = b[1], bz = b[2], bw = b[3]; let d = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw; if (d < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; d = -d; }
  if (d > 0.9995) { const r = [a[0] + (bx - a[0]) * t, a[1] + (by - a[1]) * t, a[2] + (bz - a[2]) * t, a[3] + (bw - a[3]) * t]; const l = Math.hypot(...r); return r.map(x => x / l); }
  const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s; return [a[0] * wa + bx * wb, a[1] * wa + by * wb, a[2] * wa + bz * wb, a[3] * wa + bw * wb]; };
function m3q(r) { const m00 = r[0], m10 = r[1], m20 = r[2], m01 = r[3], m11 = r[4], m21 = r[5], m02 = r[6], m12 = r[7], m22 = r[8], tr = m00 + m11 + m22;
  if (tr > 0) { const s = 0.5 / Math.sqrt(tr + 1); return [(m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s, 0.25 / s]; }
  if (m00 > m11 && m00 > m22) { const s = 2 * Math.sqrt(1 + m00 - m11 - m22); return [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]; }
  if (m11 > m22) { const s = 2 * Math.sqrt(1 + m11 - m00 - m22); return [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s]; }
  const s = 2 * Math.sqrt(1 + m22 - m00 - m11); return [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s]; }
function qrot(q) { const [x, y, z, w] = q; return [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y)]; }

class NRoot { // RootModule.Series
  constructor(n, win) { this.n = n; this.dt = win / (n - 1); this.T = Array.from({ length: n }, NM.create); this.V = Array.from({ length: n }, () => [0, 0, 0]); this.ts = Array.from({ length: n }, (_, i) => i * this.dt); }
  dir(i) { return NM.ax(this.T[i], 2); }
  setDir(i, v) { const r = NM.planar(v); const m = this.T[i]; m[0] = r[0]; m[1] = r[1]; m[2] = r[2]; m[4] = r[3]; m[5] = r[4]; m[6] = r[5]; m[8] = r[6]; m[9] = r[7]; m[10] = r[8]; }
  control(pos, dir, vel, dt, ms = 10, ts = 10) {
    let d = nv(dir); if (d[0] === 0 && d[2] === 0) d = vel[0] || vel[2] ? nv(vel) : this.dir(0);
    const nvl = lerpDt(this.V[0], vel, dt, ms); this.V[0] = nvl;
    NM.setPos(this.T[0], [pos[0] + nvl[0] * dt, pos[1] + nvl[1] * dt, pos[2] + nvl[2] * dt]); this.setDir(0, vslerp(this.dir(0), d, 1 - Math.exp(-dt * ts)));
    for (let i = 1; i < this.n; i++) {
      const r = i / (this.n - 1), bv = lerpDt(this.V[i - 1], vel, this.dt, r * ms); this.V[i] = bv;
      const p = NM.pos(this.T[i - 1]); NM.setPos(this.T[i], [p[0] + bv[0] * this.dt, p[1] + bv[1] * this.dt, p[2] + bv[2] * this.dt]);
      this.setDir(i, vslerp(this.dir(0), d, r));
    }
  }
  length() { let l = 0; for (let i = 1; i < this.n; i++) { const a = NM.pos(this.T[i - 1]), b = NM.pos(this.T[i]); l += Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); } return l; }
}
class NSeq {
  pair(t) { const n = this.ts.length, f = this.ts[0], l = this.ts[n - 1]; let r = clamp((t - f) / (l - f) * (n - 1), 0, n - 1); const a = Math.floor(r), b = Math.min(a + 1, n - 1); const w = a === b ? 0 : clamp((t - this.ts[a]) / (this.ts[b] - this.ts[a]), 0, 1); return [a, b, w]; }
  root(t, o) { const [a, b, w] = this.pair(t); return NM.lerp(o, this.RT[a], this.RT[b], w); }
  lock() { let s = 0, n = 0; for (const c of this.C) for (let i = 0; i < 4; i++) { s += c[i]; n++; } return n && s / n > 0.75 ? 1 : 0; }
  length() { let l = 0; for (let i = 1; i < this.RT.length; i++) { const a = NM.pos(this.RT[i - 1]), b = NM.pos(this.RT[i]); l += Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); } return l; }
}
const NG = {
  state: 'off', meta: null, worker: null, ready: false, active: false, pending: false, lastReq: -1, time: 0, ms: 0, fps: 0, nPred: 0, guidance: 'Idle',
  bones: 27, seq: 16, win: 0.5, guid: {}, s: 1, pct: 0, inPage: false,
  async load(onStat) {
    if (this.state === 'loading' || this.ready) return; this.state = 'loading';
    try {
      onStat && onStat('fetching the dog mocap network');
      this.meta = await (await fetch(NNURL + 'quadruped.json')).json();
      const r = await fetch(NNURL + 'quadruped.bin'); const total = +r.headers.get('content-length') || 17704644;
      const rd = r.body.getReader(), parts = []; let got = 0;
      for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; this.pct = got / total; onStat && onStat('neural gait ' + Math.round(this.pct * 100) + '%'); }
      const bin = new Uint8Array(got); let o = 0; for (const p of parts) { bin.set(p, o); o += p.length; }
      const M = this.meta; this.bones = M.skeleton.bone_count; this.seq = M.control.sequence_length; this.win = M.control.sequence_window;
      for (const g of M.guidances) { const e = M.bin['guidance.' + g]; this.guid[g] = new Float32Array(bin.buffer.slice(e.offset, e.offset + e.count * 4)); }
      await this.spawn(bin.buffer);
      this.setupActor(); this.ready = true; this.state = 'ready'; onStat && onStat('neural gait ready');
    } catch (e) { console.warn('neural gait', e); this.state = 'failed'; onStat && onStat('neural gait failed: ' + String(e.message || e).slice(0, 60)); }
  },
  spawn(bin) {
    return new Promise((res, rej) => {
      const src = '(' + nnInferHost.toString() + ')';
      const onmsg = m => { if (m.t === 'ready') res(); else if (m.t === 'error') rej(new Error(m.msg)); else if (m.t === 'out') this.onOut(m); };
      if (TEST) { // lockstep: the request answers inside the same sim step
        this.sync = true; const h = (new Function('return ' + src))()(m => onmsg(m));
        this.worker = { postMessage: m => h(m) }; this.worker.postMessage({ t: 'load', meta: this.meta, bin }); return;
      }
      try {
        const w = new Worker(URL.createObjectURL(new Blob(['const h = ' + src + '(m => postMessage(m)); onmessage = e => h(e.data);'], { type: 'text/javascript' })));
        w.onmessage = e => onmsg(e.data); w.onerror = e => { rej(e); };
        w.postMessage({ t: 'load', meta: this.meta, bin }, [bin]); this.worker = w;
      } catch (e) { // in page fallback: slower, so it predicts less often
        this.inPage = true; const h = (new Function('return ' + src))()(m => setTimeout(() => onmsg(m), 0));
        this.worker = { postMessage: m => setTimeout(() => h(m), 0) }; this.worker.postMessage({ t: 'load', meta: this.meta, bin });
      }
    });
  },
  setupActor() {
    const n = this.bones, B = NNBIND.map(a => Float32Array.from(a)), names = this.meta.skeleton.bone_names, pn = this.meta.skeleton.parent_names;
    const A = this.A = { T: B.map(m => m.slice()), V: B.map(() => [0, 0, 0]), raw: B.map(m => NM.pos(m)), root: NM.create(), bind: B, par: pn.map(p => p ? names.indexOf(p) : -1) };
    A.len = A.par.map((p, i) => { if (p < 0) return 0; const a = NM.pos(B[i]), b = NM.pos(B[p]); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); });
    A.zero = B.map((m, i) => { const p = A.par[i]; if (p < 0) return NM.create(); return NM.mul(NM.create(), NM.inv(NM.create(), B[p]), m); });
    A.kids = A.par.map((_, i) => A.par.map((p, j) => p === i ? j : -1).filter(j => j >= 0));
    A.idx = Object.fromEntries(names.map((nm, i) => [nm, i]));
    A.bindQ = B.map(m => NM.quat(m)); A.bindInvQ = A.bindQ.map(q => q.clone().invert());
    this.sim = new NRoot(this.seq, this.win); this.ctl = new NRoot(this.seq, this.win);
    this.pid = { i: 0, prev: null }; this.cur = null; this.prev = null; this.timescale = 1; this.sync = 0; this.want = { v: [0, 0, 0], f: [0, 0, 1], act: null }; this.last = [0, 0, 1];
    this.cont = [1, 1, 1, 1];
  },
  reset(pos, f) { // pos in network units, f facing
    const A = this.A; const ff = nv([f[0], 0, f[2]]), rt = [ff[2], 0, -ff[0]];
    NM.fromTR(A.root, pos, [rt[0], rt[1], rt[2], 0, 1, 0, ff[0], ff[1], ff[2]]);
    for (const R of [this.sim, this.ctl]) for (let i = 0; i < this.seq; i++) { R.T[i].set(A.root); R.V[i] = [0, 0, 0]; }
    // bind pose carried to the new root
    for (let i = 0; i < this.bones; i++) { NM.mul(A.T[i], A.root, A.bind[i]); A.V[i] = [0, 0, 0]; A.raw[i] = NM.pos(A.T[i]); }
    this.cur = this.prev = null; this.timescale = 1; this.sync = 0; this.pid = { i: 0, prev: null }; this.last = ff;
  },
  setGoal(vel, facing, act) { this.want.v = [vel[0], 0, vel[2]]; const l = Math.hypot(facing[0], facing[2]); if (l > 1e-5) this.want.f = [facing[0] / l, 0, facing[2] / l]; this.want.act = act || null; },
  control(dt) {
    const C = this.meta.control, A = this.A;
    const curSpeed = this.cur ? this.cur.length() / this.win : 0, curF = NM.ax(A.root, 2);
    const mv = Math.hypot(this.want.v[0], this.want.v[2]), req = mv > C.input_deadzone ? mv : 0;
    const act = curSpeed < C.action_trigger_speed_max ? this.want.act : null, target = act ? 0 : req;
    // PID on speed
    const err = target - curSpeed; this.pid.i += err * dt; const corr = C.pid.kp * err + C.pid.ki * this.pid.i; this.pid.prev = curSpeed;
    const speed = Math.max(curSpeed + corr, 0);
    const rest = Math.hypot(curF[0], curF[2]) > 1e-5 ? nv([curF[0], 0, curF[2]]) : this.last;
    let vel, dir;
    if (act) { vel = [0, 0, 0]; dir = rest; } else if (mv > C.input_deadzone) { const md = [this.want.v[0] / mv, 0, this.want.v[2] / mv]; vel = [md[0] * speed, 0, md[2] * speed]; dir = md; this.last = md; } else { vel = [0, 0, 0]; dir = rest; }
    const m = C.locomotion_modes;
    const g = act === 'sit' ? 'Sit' : act === 'stand' ? 'Stand' : act === 'lie' ? 'Lie' : speed < 0.1 ? 'Idle' : speed < m.pace ? 'Walk' : speed < m.trot ? 'Pace' : speed < m.canter ? 'Trot' : 'Canter';
    this.guidance = g; this.speed = speed;
    const p0 = NM.pos(this.sim.T[0]), pr = NM.pos(A.root);
    this.sim.control(vlerp(p0, pr, this.sync), dir, vel, dt);
    if (this.cur) {
      const tc = C.trajectory_correction;
      for (let i = 0; i < this.seq; i++) NM.lerp(this.ctl.T[i], this.sim.T[i], this.cur.RT[i], tc);
      for (let i = 0; i < this.seq; i++) { const t = NM.pos(this.ctl.T[i]), ca = NM.pos(A.root), tm = Math.max(this.ctl.ts[i] - this.ctl.ts[0], 1e-3); this.ctl.V[i] = vlerp([(t[0] - ca[0]) / tm, 0, (t[2] - ca[2]) / tm], this.cur.RV[i], tc); }
    } else for (let i = 0; i < this.seq; i++) { this.ctl.T[i].set(this.sim.T[i]); this.ctl.V[i] = this.sim.V[i].slice(); }
  },
  feed() {
    const A = this.A, n = this.bones, IN = this.meta.model.input_dim, x = new Float32Array(IN); let p = 0;
    const iR = NM.inv(NM.create(), A.root), L = NM.create();
    const pos = [], vel = [];
    for (let i = 0; i < n; i++) { NM.mul(L, iR, A.T[i]); pos.push(NM.pos(L)); vel.push(NM.itd(A.root, A.V[i])); }
    for (const v of pos) { x[p++] = v[0]; x[p++] = v[1]; x[p++] = v[2]; }
    for (const v of vel) { x[p++] = v[0]; x[p++] = v[1]; x[p++] = v[2]; }
    const rp = [], ra = [], rv = [];
    for (let s = 0; s < this.seq; s++) { NM.mul(L, iR, this.ctl.T[s]); rp.push([L[12], L[14]]); ra.push([L[8], L[10]]); const lv = NM.itd(A.root, this.ctl.V[s]); rv.push([lv[0], lv[2]]); }
    for (const a of [rp, ra, rv]) for (const v of a) { x[p++] = v[0]; x[p++] = v[1]; }
    const g = this.guid[this.guidance] || this.guid.Idle; for (let i = 0; i < n * 3; i++) x[p++] = g[i];
    return x;
  },
  predict() {
    if (this.pending || !this.ready) return;
    this.pending = true; this.lastReq = this.time; this.reqRoot = this.A.root.slice(); this.reqT = this.time;
    const x = this.feed(); this.worker.postMessage({ t: 'run', id: ++this.nPred, x }, [x.buffer]);
  },
  onOut(m) {
    this.pending = false; this.ms = this.ms ? this.ms * 0.8 + m.ms * 0.2 : m.ms;
    if (!this.active) return;
    const s = this.build(m.out, this.reqRoot); s.t0 = this.reqT; this.prev = this.cur || s; this.cur = s;
  },
  build(out, root) {
    const S = this.seq, n = this.bones, O = this.meta.model.output_dim, C = this.meta.control, seq = new NSeq();
    seq.ts = Array.from({ length: S }, (_, i) => i / (S - 1) * this.win); seq.RT = []; seq.RV = []; seq.P = []; seq.Q = []; seq.V = []; seq.C = [];
    let cx = 0, cy = 0, cz = 0;
    const cs = (x, th, pw) => { x = clamp(x, 0, 1); let t = clamp((x - th) / (1 - th), 0, 1); return Math.pow(3 * t * t - 2 * t * t * t, pw); };
    for (let f = 0; f < S; f++) {
      let p = f * O; const dx = out[p++], dyaw = out[p++], dz = out[p++];
      if (f > 0) { cx += dx; cy += dyaw; cz += dz; }
      const rad = cy * Math.PI / 180, c = Math.cos(rad), sn = Math.sin(rad), D = NM.create(); D[0] = c; D[2] = -sn; D[8] = sn; D[10] = c; D[12] = cx; D[14] = cz;
      const R = NM.mul(NM.create(), root, D); seq.RT.push(R); seq.RV.push(NM.td(R, [dx * 30, 0, dz * 30]));
      const P = [], Z = [], Y = [], V = [];
      for (let i = 0; i < n; i++) P.push(NM.tp(R, [out[p++], out[p++], out[p++]]));
      for (let i = 0; i < n; i++) Z.push(NM.td(R, [out[p++], out[p++], out[p++]]));
      for (let i = 0; i < n; i++) Y.push(NM.td(R, [out[p++], out[p++], out[p++]]));
      for (let i = 0; i < n; i++) V.push(NM.td(R, [out[p++], out[p++], out[p++]]));
      const Cn = []; for (let i = 0; i < 4; i++) Cn.push(cs(out[p++], C.contact_threshold, C.contact_power));
      seq.P.push(P); seq.Q.push(Z.map((z, i) => m3q(NM.look(z, Y[i])))); seq.V.push(V); seq.C.push(Cn);
    }
    return seq;
  },
  animate(dt) {
    if (!this.cur || !this.prev) return false;
    const C = this.meta.control, A = this.A, n = this.bones;
    const sp = NM.pos(this.sim.T[0]), rp = NM.pos(A.root);
    const reqS = (Math.hypot(rp[0] - sp[0], rp[2] - sp[2]) + this.sim.length()) / this.win, predS = this.cur.length() / this.win;
    let ts = 1, sy = 0; if (reqS > 0.1 && predS > 0.1) { ts = reqS / predS; sy = 1; }
    this.timescale = clamp(this.timescale + (ts - this.timescale) * (1 - Math.exp(-dt * C.timescale_sensitivity)), C.min_timescale, C.max_timescale);
    this.sync += (sy - this.sync) * (1 - Math.exp(-dt * C.synchronization_sensitivity));
    const sdt = dt * this.timescale, pT = (this.time - this.prev.t0) * this.timescale, cT = (this.time - this.cur.t0) * this.timescale;
    const bl = clamp((this.time - this.cur.t0) * C.prediction_fps, 0, 1);
    const ra = this.prev.root(pT, NM.create()), rb = this.cur.root(cT, NM.create()), rr = NM.lerp(NM.create(), ra, rb, bl);
    const lock = this.cur.lock(); NM.lerp(A.root, rr, A.root, lock);
    const [a0, a1, aw] = this.prev.pair(pT), [b0, b1, bw] = this.cur.pair(cT);
    for (let k = 0; k < 4; k++) { const ca = lerp(this.prev.C[a0][k], this.prev.C[a1][k], aw), cb = lerp(this.cur.C[b0][k], this.cur.C[b1][k], bw); this.cont[k] = lerp(ca, cb, bl); }
    for (let i = 0; i < n; i++) {
      const pa = vlerp(this.prev.P[a0][i], this.prev.P[a1][i], aw), pb = vlerp(this.cur.P[b0][i], this.cur.P[b1][i], bw), pos = vlerp(pa, pb, bl);
      const qa = qsl(this.prev.Q[a0][i], this.prev.Q[a1][i], aw), qb = qsl(this.cur.Q[b0][i], this.cur.Q[b1][i], bw), q = qsl(qa, qb, bl);
      const va = vlerp(this.prev.V[a0][i], this.prev.V[a1][i], aw), vb = vlerp(this.cur.V[b0][i], this.cur.V[b1][i], bw), v = vlerp(va, vb, bl);
      const cur = A.T[i], pj = [cur[12] + v[0] * sdt, cur[13] + v[1] * sdt, cur[14] + v[2] * sdt];
      const fp = [pj[0] + (pos[0] - pj[0]) * 0.5, pj[1] + (pos[1] - pj[1]) * 0.5, pj[2] + (pos[2] - pj[2]) * 0.5];
      A.raw[i] = fp; NM.fromTR(cur, fp, qrot(q)); A.V[i] = v;
    }
    // restore bone lengths and alignments, as the upstream runtime does
    for (let i = 0; i < n; i++) { const p = A.par[i]; if (p < 0) continue; const pp = NM.pos(A.T[p]), me = NM.pos(A.T[i]); const d = [me[0] - pp[0], me[1] - pp[1], me[2] - pp[2]], l = Math.hypot(d[0], d[1], d[2]); if (l < 1e-6) continue; const k = A.len[i] / l; NM.setPos(A.T[i], [pp[0] + d[0] * k, pp[1] + d[1] * k, pp[2] + d[2] * k]); }
    for (let i = 0; i < n; i++) {
      if (A.kids[i].length !== 1) continue; const c = A.kids[i][0];
      const pp = NM.pos(A.T[i]), cc = NM.pos(A.T[c]), cb = NM.tp(A.T[i], NM.pos(A.zero[c]));
      const u = nv([cb[0] - pp[0], cb[1] - pp[1], cb[2] - pp[2]]), w = nv([cc[0] - pp[0], cc[1] - pp[1], cc[2] - pp[2]]);
      if (!u[0] && !u[1] && !u[2] || !w[0] && !w[1] && !w[2]) continue;
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...u), new THREE.Vector3(...w)), r = qrot([q.x, q.y, q.z, q.w]), m = A.T[i];
      const c0 = [m[0], m[1], m[2]], c1 = [m[4], m[5], m[6]], c2 = [m[8], m[9], m[10]], ap = v => [r[0] * v[0] + r[3] * v[1] + r[6] * v[2], r[1] * v[0] + r[4] * v[1] + r[7] * v[2], r[2] * v[0] + r[5] * v[1] + r[8] * v[2]];
      const n0 = ap(c0), n1 = ap(c1), n2 = ap(c2); m[0] = n0[0]; m[1] = n0[1]; m[2] = n0[2]; m[4] = n1[0]; m[5] = n1[1]; m[6] = n1[2]; m[8] = n2[0]; m[9] = n2[1]; m[10] = n2[2];
    }
    return true;
  },
  tick(dt) {
    if (!this.ready || !this.active) return false;
    this.time += dt; this.control(dt);
    const hz = this.inPage ? 5 : this.meta.control.prediction_fps;
    if (!this.pending && this.time - this.lastReq >= 1 / hz) this.predict();
    const ok = this.animate(dt); if (this.cur) this.fps = 1 / Math.max(this.ms / 1000, 1 / hz);
    return ok;
  }
};
// retarget: rig maps built once per dog
const NR = { ok: false };
function nnRig() {
  if (!dog.ready || !NG.ready) return false;
  const A = NG.A, I = A.idx, n = I;
  // which network side matches which Meshy side, by bind x sign
  const nL = NNBIND[I.LeftArm][12], mL = dog.legs[0].nom.x;
  const swap = Math.sign(nL) !== Math.sign(mL);
  const side = (l, r) => swap ? r : l;
  NR.map = [ // [Meshy bone, network bone, optional second network bone for a halfway blend]
    ['hips', 'Hips'], ['spine2', 'Spine'], ['spine_03', 'Spine', 'Spine1'], ['chest', 'Spine1'], ['neck1', 'Neck'], ['head', 'Head'],
    ['clavicle.L', side('LeftShoulder', 'RightShoulder')], ['clavicle.R', side('RightShoulder', 'LeftShoulder')],
    ['tail1', 'Tail'], ['tail3', 'Tail1'], ['tail_03', 'Tail1']
  ].filter(m => dog.bones[m[0]]).map(m => ({ bone: dog.bones[m[0]], a: I[m[1]], b: m[2] != null ? I[m[2]] : -1 }));
  // rest world rotations of mapped Meshy bones in dog root local space (dog.root was identity at setup: recompute now)
  const saveP = dog.root.position.clone(), saveR = dog.root.rotation.clone();
  dog.root.position.set(0, 0, 0); dog.root.rotation.set(0, 0, 0); resetPose(); dog.root.updateMatrixWorld(true);
  NR.map.forEach(m => { m.rest = m.bone.getWorldQuaternion(new THREE.Quaternion()); });
  const hipsW = dog.bones['hips'].getWorldPosition(V3()); NR.hipsRest = hipsW;
  // legs: Meshy leg i (LF RF LH RH) to network chains [root joint, site]
  const chains = { LF: side(['LeftArm', 'LeftForeArm', 'LeftHand', 'LeftHandSite'], ['RightArm', 'RightForeArm', 'RightHand', 'RightHandSite']), RF: side(['RightArm', 'RightForeArm', 'RightHand', 'RightHandSite'], ['LeftArm', 'LeftForeArm', 'LeftHand', 'LeftHandSite']),
    LH: side(['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftFootSite'], ['RightUpLeg', 'RightLeg', 'RightFoot', 'RightFootSite']), RH: side(['RightUpLeg', 'RightLeg', 'RightFoot', 'RightFootSite'], ['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftFootSite']) };
  const cidx = { LF: side(0, 1), RF: side(1, 0), LH: side(2, 3), RH: side(3, 2) };
  const P = i => NM.pos(NNBIND[i]), d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  NR.legs = dog.legs.map(l => {
    const c = chains[l.id].map(k => I[k]); const nl = d3(P(c[0]), P(c[1])) + d3(P(c[1]), P(c[2])) + d3(P(c[2]), P(c[3]));
    const top = l.up.getWorldPosition(V3()), toe = dog.bones[l.toe[l.toe.length - 1]].getWorldPosition(V3()); const ml = l.l1 + l.l2 + l.pawL.length() * dog.S;
    return { c, k: ml / nl, ci: cidx[l.id], lock: null, off: { x: ORG.S(), z: ORG.S() }, topRest: top, mlen: ml, toeRest: toe };
  });
  NR.s = NR.hipsRest.y / P(I.Hips)[1]; // body scale from hip height
  dog.root.position.copy(saveP); dog.root.rotation.copy(saveR); dog.root.updateMatrixWorld(true);
  NR.ok = true; return true;
}
const _nq = new THREE.Quaternion(), _nq2 = new THREE.Quaternion(), _nv = V3();
// write the network pose onto the Meshy rig; returns ground and contact info for the leg pass
function nnApply(dt, terr) {
  const A = NG.A, iR = NM.inv(NM.create(), A.root), L = NM.create();
  const rootQ = dog.root.quaternion.clone().multiply(terr), s = NR.s;
  const rq = i => NM.quat(NM.mul(L, iR, A.T[i])); // network bone rotation in its root frame
  // body translation: hips delta from bind, scaled
  const hp = NM.tp(iR, NM.pos(A.T[A.idx.Hips])), hb = NM.pos(NNBIND[A.idx.Hips]);
  const d = V3((hp[0] - hb[0]) * s, (hp[1] - hb[1]) * s, (hp[2] - hb[2]) * s);
  dog.bones['root'].position.add(d.clone().applyQuaternion(terr).applyQuaternion(QC).divideScalar(dog.S));
  dog.root.updateMatrixWorld(true);
  for (const m of NR.map) {
    let q = rq(m.a).multiply(A.bindInvQ[m.a]);
    if (m.b >= 0) { const q2 = rq(m.b).multiply(A.bindInvQ[m.b]); q.slerp(q2, 0.5); }
    _nq.copy(rootQ).multiply(q).multiply(m.rest); setBoneWorldQuat(m.bone, _nq);
  }
  // paw targets in world: Meshy leg top plus the network leg vector scaled by leg length ratio
  NR.legs.forEach((g, i) => {
    const l = dog.legs[i];
    const top = NM.tp(iR, A.raw[g.c[0]]), toe = NM.tp(iR, A.raw[g.c[3]]);
    const v = V3((toe[0] - top[0]) * g.k, (toe[1] - top[1]) * g.k, (toe[2] - top[2]) * g.k);
    const mt = l.up.getWorldPosition(V3()); const wv = v.applyQuaternion(rootQ);
    const tgt = mt.add(wv); const gy = H(tgt.x, tgt.z);
    // the network stands on a flat floor at y 0: carry its toe height over our terrain
    tgt.y = gy + Math.max(l.toeH, toe[1] * s + l.toeH * 0.5);
    const c = NG.cont[g.ci]; l.contact = c;
    if (ON('L.neural') && c > 0.55) { if (!g.lock) { g.lock = tgt.clone(); g.lock.y = gy + l.toeH; addPrint(g.lock, dog.yaw); } tgt.copy(g.lock); }
    else if (g.lock) { g.relOff = g.lock.clone().sub(tgt); g.relT = 0; g.lock = null; }
    if (g.relOff) { g.relT += dt; const k = Math.exp(-g.relT / 0.06); tgt.addScaledVector(g.relOff, k); if (k < 0.02) g.relOff = null; }
    l.foot.copy(tgt); l.stance = c > 0.55;
  });
}
// tilt for a paw from the network: rotation of the distal bone relative to bind, in the dog root frame
function nnPawTilt(i, out) {
  const A = NG.A, g = NR.legs[i], iR = NM.inv(NM.create(), A.root);
  const q = NM.quat(NM.mul(NM.create(), iR, A.T[g.c[2]])).multiply(A.bindInvQ[g.c[2]]);
  return out.copy(q);
}

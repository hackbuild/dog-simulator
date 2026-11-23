// neural gait: the quadruped codebook network run by @hackbuild/motion-net (MIT, vendor/), with
// its gait host CodebookGait, and a retarget onto this dog written for this app. The weights
// (CC-BY-NC-4.0, AI4AnimationPy by Paul Starke and Sebastian Starke, Meta; web export by
// sweriko) are fetched at runtime from the pinned upstream commit, checked against their sha256
// and never bundled; the licence line shows when they load.
//
// The bind pose the host needs (27 bone matrices, root at the origin facing +Z) is computed here
// from the network itself: the Idle guidance pose fed back through the network until it stands.
//
// Lockstep (#test): the network runs in the page and answers inside the same step, the request
// rate is the file's 10 Hz and the decoded frame count is fixed, so traces do not depend on wall
// time. &nnacc=f32 or f64 picks the accumulation; f64 sums are bit equal to a double precision port.
const NNURL = 'https://raw.githubusercontent.com/sweriko/ai4anim-webgpu/b539455f849f284a1e814eb11ab649eb594319dc/public/';
const NNSHA = '9568debf4a41da54f62d19bd7a29fbaf7dcc34c32d4ee472ab8560caefbcb372';
// the manifest (CC-BY-NC-4.0, same commit) is checked too
const NNJSON_SHA = '5953a50cd7b0ab4d37447e701bec2c58658cae1e990014591b661f077ed1019d';
const NNACC = (TEST && TEST.nnacc) || 'f64';

// real time health, measured in wall clock time (lockstep keeps the host's sim time rule): frame
// time from the animation loop, the age of the prediction in play from the start of the run that
// made it, and whether the session still has a run in flight. A run dropped by enter() keeps the
// backend busy, so the body is not handed to the network again until it lands.
const NGW = { slow: 0, frameMs: 0, landed: 0, busy: false };
function ngFrame(wallDt) { NGW.frameMs = wallDt * 1000; NGW.slow = wallDt > 1 / 15 ? NGW.slow + 1 : 0; }
function trackedSession(s) {
  return {
    get backend() { return s.backend; }, get where() { return s.where; }, get lastMs() { return s.lastMs; },
    run(input, frames) {
      const t0 = performance.now(); NGW.busy = true;
      const p = s.run(input, frames);
      p.then(() => { NGW.busy = false; NGW.landed = t0; }, () => { NGW.busy = false; });
      return p;
    },
    dispose() { s.dispose(); }
  };
}

// a session whose answer arrives before run() returns, for lockstep
function syncSession(model) {
  return {
    backend: 'wasm-simd', where: 'page', lastMs: 0,
    run(input, frames) { const t0 = performance.now(); const out = model.run(input, frames); this.lastMs = performance.now() - t0; return { then(ok) { ok(out); } }; },
    dispose() { model.dispose(); }
  };
}

// the standing pose: Idle guidance positions as the first input, then the network's own output
// fed back; positions plus forward (z) and up (y) axes become column major matrices
async function standingBind(session, file, guid) {
  const n = file.skeleton.bone_count, S = file.control.sequence_length, O = file.model.output_dim;
  const pos = Float32Array.from(guid.Idle.subarray(0, n * 3)), vel = new Float32Array(n * 3);
  let last = null;
  for (let it = 0; it < 6; it++) {
    const x = new Float32Array(file.model.input_dim); let p = 0;
    x.set(pos, p); p += n * 3; x.set(vel, p); p += n * 3;
    p += S * 2; // trajectory positions: all at the root
    for (let s = 0; s < S; s++) { x[p++] = 0; x[p++] = 1; } // facing +Z
    p += S * 2; // trajectory velocities: zero
    x.set(guid.Idle.subarray(0, n * 3), p);
    const out = await session.run(x, 2);
    last = out.subarray(0, O);
    pos.set(last.subarray(3, 3 + n * 3)); vel.set(last.subarray(3 + n * 9, 3 + n * 12));
  }
  const P = 3, Z = P + n * 3, Y = Z + n * 3, bind = [];
  for (let i = 0; i < n; i++) {
    const z = V3(last[Z + i * 3], last[Z + i * 3 + 1], last[Z + i * 3 + 2]).normalize();
    const x = V3(last[Y + i * 3], last[Y + i * 3 + 1], last[Y + i * 3 + 2]).cross(z).normalize();
    const y = z.clone().cross(x);
    bind.push([x.x, x.y, x.z, 0, y.x, y.y, y.z, 0, z.x, z.y, z.z, 0, last[P + i * 3], last[P + i * 3 + 1], last[P + i * 3 + 2], 1]);
  }
  return bind;
}

const NG = {
  state: 'off', ready: false, active: false, guidance: 'Idle', ms: 0, speed: 0, cont: [1, 1, 1, 1], time: 0,
  gait: null, file: null, bind: null, names: [], head: 0, since: 0, holdUntil: 0, reason: '', fails: 0,
  async load(onStat) {
    if (this.state === 'loading' || this.ready) return; this.state = 'loading';
    const say = s => { onStat && onStat(s); };
    try {
      say('fetching the gait network');
      await Promise.all([HGAIT.load(), HMN.load()]);
      const jr = await fetch(NNURL + 'quadruped.json');
      if (!jr.ok) throw new Error('quadruped.json http ' + jr.status);
      const jb = await jr.arrayBuffer();
      const jh = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', jb)), b => b.toString(16).padStart(2, '0')).join('');
      if (jh !== NNJSON_SHA) throw new Error('quadruped.json does not match its pinned sha256');
      const file = JSON.parse(new TextDecoder().decode(jb));
      const weights = await HMN.readWeights(NNURL + 'quadruped.bin', { sha256: NNSHA, onProgress: f => say('gait network ' + Math.round(f * 100) + '%') });
      const manifest = HMN.codebookManifest(file, HMN.QUADRUPED_LICENCE, NNSHA);
      let session;
      if (TEST) { HMN.stateLicence(HMN.QUADRUPED_LICENCE, l => console.info(l)); session = syncSession(HMN.createCpuModel(manifest, weights, NNACC)); }
      else session = trackedSession(await HMN.createSession(manifest, weights, { accum: NNACC, onNotice: l => { console.info(l); toast(l.toLowerCase()); } }));
      const guid = HMN.readGuidance(file, weights);
      this.file = file; this.names = file.skeleton.bone_names;
      this.bind = await standingBind(session, file, guid);
      this.gait = new HMN.CodebookGait(session, { file, bind: this.bind, guidance: guid }, TEST ? { rate: file.control.prediction_fps, decodeFrames: 9 } : {});
      this.ready = true; this.state = 'ready'; say('neural gait ready. weights cc by-nc 4.0, non commercial use only.');
    } catch (e) {
      console.warn('neural gait', e); this.state = 'failed';
      const m = String(e.message || e);
      say(e instanceof TypeError || /fetch|http|network/i.test(m) ? 'gait weights not reachable. the dog keeps the procedural gait.' : 'neural gait failed: ' + m.slice(0, 60).toLowerCase() + '. the dog keeps the procedural gait.');
    }
  },
  // network units are about meters; NR.s scales them to this dog
  enter(speed) {
    this.gait.enter({ x: dog.pos.x / NR.s, z: dog.pos.z / NR.s, yaw: dog.yaw, speed: speed / NR.s });
    this.head = dog.yaw; this.since = 0;
  },
  // facing goal to a turn rate for the host, which integrates its own heading from it
  update(dt, speed, face, posture) {
    const turn = clamp(wrapA(face - this.head) * 8, -4, 4);
    this.head = wrapA(this.head + turn * dt);
    const r = this.gait.update(dt, { speed, turnRate: turn, posture });
    this.since += dt; this.time = this.gait.time; this.guidance = this.gait.guidance; this.speed = r.speed; this.ms = this.gait.health().inferenceMs;
    const c = this.gait.contacts; this.cont = NR.legs ? NR.legs.map(g => c[g.c]) : [1, 1, 1, 1];
    return r;
  },
  follow(x, z, yaw) { this.gait.follow({ x: x / NR.s, z: z / NR.s, yaw }); this.head = yaw; },
  // stale or slow predictions hand the body back to the pattern generator for 2 s (inferred).
  // In real time the rule also reads wall clock frame time and prediction age (NGW), and each
  // hand back in a row doubles the hold, up to 32 s; 5 s kept by the network resets it.
  healthy() {
    if (this.since < 0.3) return true;
    const h = this.gait.health(); let ok = h.ok, reason = h.reason;
    if (!TEST && ok) {
      const age = NGW.landed ? (performance.now() - NGW.landed) / 1000 : Infinity;
      if (NGW.slow >= 3) { ok = false; reason = 'frames slower than 1/15 s (' + Math.round(NGW.frameMs) + ' ms, measured)'; }
      else if (age > 0.3) { ok = false; reason = 'prediction ' + age.toFixed(2) + ' s old (wall clock)'; }
    }
    this.reason = reason;
    if (!ok) {
      if (TEST) this.holdUntil = now + 2;
      else { this.fails++; this.holdUntil = now + Math.min(2 * 2 ** (this.fails - 1), 32); }
    } else if (!TEST && this.since > 5) this.fails = 0;
    return ok;
  },
  // the status line: who drives the body and why, real time only
  status() {
    if (!this.ready) return null;
    if (this.active) return 'network drives the body (' + this.guidance.toLowerCase() + ', ' + Math.round(this.ms) + ' ms a prediction)';
    if (!ON('L.neural')) return 'loaded, off. turn it on under tune, layers.';
    if (now < this.holdUntil) return 'procedural gait for ' + Math.ceil(this.holdUntil - now) + ' s: ' + this.reason;
    if (NGW.busy) return 'procedural gait: waiting for the last prediction to land';
    return 'procedural gait (bow, paw lift or shake)';
  },
  reset() {}
};

// rig mapping: each dog leg takes the network chain on the same side and end of the body, by
// position in the bind (the network's left limbs lie at -x in its frame)
const NR = { ok: false, s: 1, legs: null, body: null, pitch: 0, roll: 0, drop: 0 };
const _nq = new THREE.Quaternion(), _nq2 = new THREE.Quaternion(), _nyaw = new THREE.Quaternion(), _nv = V3();
function nnLocal(p, i, out) {
  const r = NG.gait.root, c = Math.cos(r.yaw), s = Math.sin(r.yaw), x = p[i * 3] - r.x, z = p[i * 3 + 2] - r.z;
  return out.set(x * c - z * s, p[i * 3 + 1], x * s + z * c);
}
function nnRig() {
  const B = NG.bind, ix = n => NG.names.indexOf(n), bp = i => V3(B[i][12], B[i][13], B[i][14]);
  const chains = [['LeftHandSite', 'LeftHand', 0], ['RightHandSite', 'RightHand', 1], ['LeftFootSite', 'LeftFoot', 2], ['RightFootSite', 'RightFoot', 3]].map(([s, b, c]) => ({ site: ix(s), bone: ix(b), c, front: c < 2, x: bp(ix(s)).x }));
  NR.body = nnFrame(bp);
  NR.s = dog.legLen / NR.body.y;
  NR.legs = dog.legs.map(l => {
    const ch = chains.find(k => k.front === l.front && Math.sign(k.x) === Math.sign(l.nom.x));
    const m = B[ch.bone];
    return { ...ch, bind: bp(ch.site), bindQ: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().set(m[0], m[4], m[8], 0, m[1], m[5], m[9], 0, m[2], m[6], m[10], 0, 0, 0, 0, 1)), lock: null, off: V3(), tilt: 0 };
  });
  NR.ok = true;
}
// body pitch, roll and height from the hip and shoulder joints; pitch is nose down positive, as
// the procedural body uses it, roll is positive when the +x side is higher
function nnFrame(P) {
  const ix = n => NG.names.indexOf(n);
  const a = P(ix('LeftUpLeg')), b = P(ix('RightUpLeg')), c = P(ix('LeftArm')), d = P(ix('RightArm'));
  const hm = a.clone().add(b).multiplyScalar(0.5), sm = c.clone().add(d).multiplyScalar(0.5);
  const pitch = -Math.atan2(sm.y - hm.y, sm.z - hm.z);
  const side = (u, v) => (u.x > v.x ? Math.atan2(u.y - v.y, u.x - v.x) : Math.atan2(v.y - u.y, v.x - u.x));
  return { pitch, roll: (side(a, b) + side(c, d)) / 2, y: (hm.y + sm.y) / 2 };
}
// the network pose this frame onto the dog: body pitch, roll and drop for poseDog, a foot target
// and a stance flag per leg; planted feet stay where they landed
function nnApply(dt) {
  const pose = NG.gait.pose(), p = pose.positions, c = pose.contacts;
  const f = nnFrame(i => nnLocal(p, i, V3()));
  NR.pitch = f.pitch - NR.body.pitch; NR.roll = f.roll - NR.body.roll; NR.drop = (NR.body.y - f.y) * NR.s;
  const cy = Math.cos(dog.yaw), sy = Math.sin(dog.yaw), k = Math.exp(-dt / 0.15);
  dog.legs.forEach((l, i) => {
    const g = NR.legs[i], q = nnLocal(p, g.site, _nv);
    const P = dog.postureOff ? dog.postureOff[l.id] : { x: 0, z: 0 };
    const lx = l.nom.x + P.x + (q.x - g.bind.x) * NR.s, lz = l.nom.z + P.z + (q.z - g.bind.z) * NR.s;
    let x = dog.pos.x + cy * lx + sy * lz, z = dog.pos.z - sy * lx + cy * lz;
    const stance = c[g.c] > 0.55;
    if (stance) { if (!g.lock || Math.hypot(g.lock.x - x, g.lock.z - z) > 0.12) { if (!g.lock) addPrint(V3(x, 0, z), dog.yaw); g.lock = { x, z }; } x = g.lock.x; z = g.lock.z; }
    else g.lock = null;
    g.off.multiplyScalar(k);
    const lift = Math.max(q.y - g.bind.y, 0) * NR.s;
    l.foot.set(x + g.off.x, H(x, z) + l.toeH + lift, z + g.off.z);
    l.stance = stance;
    // paw pitch: the network paw's rotation since the bind about the body's lateral axis
    _nyaw.setFromAxisAngle(V3(0, 1, 0), -NG.gait.root.yaw);
    const R = pose.rotations; _nq.set(R[g.bone * 4], R[g.bone * 4 + 1], R[g.bone * 4 + 2], R[g.bone * 4 + 3]).premultiply(_nyaw);
    _nq2.copy(g.bindQ).invert(); _nq.multiply(_nq2);
    g.tilt += (clamp(2 * Math.atan2(_nq.x, _nq.w), -1.4, 1.4) - g.tilt) * (1 - k);
  });
}
// at the switch to the network the feet start where the procedural gait left them
function nnSeedFeet() {
  const prev = dog.legs.map(l => l.foot.clone());
  NR.legs.forEach(g => { g.lock = null; g.off.set(0, 0, 0); g.tilt = 0; });
  nnApply(0);
  dog.legs.forEach((l, i) => { NR.legs[i].off.copy(prev[i]).sub(l.foot).setY(0); });
}
function nnPawTilt(i, out) { return out.setFromEuler(dqE.set(NR.legs[i].tilt, 0, 0, 'YXZ')); }

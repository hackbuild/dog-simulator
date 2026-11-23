/* ---------- bone name classification (pure, testable) ---------- */
const PREFIX = new Set(['mixamorig', 'bip', 'cc', 'base', 'j', 'bi', 'c', 'def', 'org', 'armature', 'root', 'rig', 'skeleton', 'bone', 'jnt', 'joint', 'sk']);
function classifyBone(raw) {
  if (!raw) return null;
  let n = String(raw).replace(/^.*[|:]/, '');
  const toks = n.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').split(/[^A-Za-z]+/).filter(Boolean).map(s => s.toLowerCase());
  let side = '';
  const rest = [];
  for (const t of toks) {
    if (t === 'left' || t === 'l') side = 'L';
    else if (t === 'right' || t === 'r') side = 'R';
    else if (PREFIX.has(t) && rest.length === 0) continue;
    else rest.push(t);
  }
  const part = rest.join('');
  const key = {
    hips: 'hips', pelvis: 'hips', hip: side ? 'upperLeg' : 'hips', spine: 'spine', chest: 'chest', upperchest: 'upperChest',
    neck: 'neck', head: 'head', jaw: 'jaw',
    shoulder: 'shoulder', clavicle: 'shoulder', collar: 'shoulder',
    arm: 'upperArm', upperarm: 'upperArm', uparm: 'upperArm', forearm: 'lowerArm', lowerarm: 'lowerArm', lowarm: 'lowerArm',
    hand: 'hand', thigh: 'upperLeg', upleg: 'upperLeg', upperleg: 'upperLeg', leg: 'lowerLeg', calf: 'lowerLeg', shin: 'lowerLeg', lowerleg: 'lowerLeg', lowleg: 'lowerLeg',
    foot: 'foot', eye: 'eye',
  }[part];
  if (!key) return null;
  const sided = ['shoulder', 'upperArm', 'lowerArm', 'hand', 'upperLeg', 'lowerLeg', 'foot', 'eye'];
  if (sided.includes(key)) return side ? key + side : null;
  return key;
}

const VRM_NAMES = {
  hips: 'hips', spine: 'spine', chest: 'chest', upperChest: 'upperChest', neck: 'neck', head: 'head', jaw: 'jaw',
  shoulderL: 'leftShoulder', shoulderR: 'rightShoulder', upperArmL: 'leftUpperArm', upperArmR: 'rightUpperArm',
  lowerArmL: 'leftLowerArm', lowerArmR: 'rightLowerArm', handL: 'leftHand', handR: 'rightHand',
};
const LEGS = ['upperLegL', 'upperLegR'];
const ORDER = ['hips', 'spine', 'chest', 'upperChest', 'neck', 'head', 'shoulderL', 'shoulderR', 'upperArmL', 'upperArmR', 'lowerArmL', 'lowerArmR', 'handL', 'handR', 'jaw'];

function depthOf(o) { let d = 0; while (o.parent) { d++; o = o.parent; } return d; }
function mapRig(root, vrm = null) {
  const map = {};
  if (vrm) {
    for (const [role, name] of Object.entries(VRM_NAMES)) {
      const b = vrm.humanoid.getNormalizedBoneNode(name); if (b) map[role] = b;
    }
    return map;
  }
  const spines = [];
  root.traverse(o => {
    const k = classifyBone(o.name); if (!k) return;
    if (k === 'spine') { spines.push(o); return; }
    if (!map[k] || (o.isBone && !map[k].isBone) || (o.isBone === map[k].isBone && depthOf(o) < depthOf(map[k]))) map[k] = o;
  });
  spines.sort((a, b) => depthOf(a) - depthOf(b));
  if (spines[0]) map.spine = spines[0];
  if (!map.chest && spines[1]) map.chest = spines[1];
  if (!map.upperChest && spines[2]) map.upperChest = spines[2];
  return map;
}
function parentRole(role, map) {
  const pick = (...r) => r.find(x => map[x]);
  switch (role) {
    case 'spine': return pick('hips');
    case 'chest': return pick('spine', 'hips');
    case 'upperChest': return pick('chest', 'spine', 'hips');
    case 'neck': return pick('upperChest', 'chest', 'spine', 'hips');
    case 'head': return pick('neck', 'upperChest', 'chest', 'spine', 'hips');
    case 'shoulderL': case 'shoulderR': return pick('upperChest', 'chest', 'spine', 'hips');
    case 'upperArmL': return pick('shoulderL', 'upperChest', 'chest', 'spine', 'hips');
    case 'upperArmR': return pick('shoulderR', 'upperChest', 'chest', 'spine', 'hips');
    case 'lowerArmL': return pick('upperArmL');
    case 'lowerArmR': return pick('upperArmR');
    case 'handL': return pick('lowerArmL', 'upperArmL');
    case 'handR': return pick('lowerArmR', 'upperArmR');
    case 'jaw': return pick('head');
    default: return null;
  }
}

/* ---------- avatar ---------- */
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4(), _s = new THREE.Vector3(), _e = new THREE.Euler();
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (cur, target, dt, rate) => cur + (target - cur) * (1 - Math.exp(-dt * rate));

/* ---------- baked animation clips (Quaternius Universal Animation Library, CC0) ---------- */
const ROT_ROLES = ['hips', 'spine', 'chest', 'upperChest', 'neck', 'head'];
const AIM_ROLES = ['shoulderL', 'shoulderR', 'upperArmL', 'upperArmR', 'lowerArmL', 'lowerArmR'];
const AIM_CHILD = { shoulderL: 'upperArmL', shoulderR: 'upperArmR', upperArmL: 'lowerArmL', upperArmR: 'lowerArmR', lowerArmL: 'handL', lowerArmR: 'handR' };
class AnimPack {
  constructor(pack) {
    this.fps = pack.fps; this.clips = {};
    for (const [name, c] of Object.entries(pack.clips)) {
      const bin = atob(c.data), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const i16 = new Int16Array(u8.buffer);
      const f = new Float32Array(i16.length); for (let i = 0; i < f.length; i++) f[i] = i16[i] / 32767;
      this.clips[name] = { name, dur: c.dur, n: c.n, loop: c.loop, f, stride: ROT_ROLES.length * 4 + AIM_ROLES.length * 3 };
    }
  }
  has(n) { return !!this.clips[n]; }
  // writes into pose {rot:[Quaternion x6], aim:[Vector3 x6]}
  sample(name, t, pose) {
    const c = this.clips[name]; const n = c.n;
    let x = c.loop ? ((t % c.dur) + c.dur) % c.dur * (n / c.dur) : Math.min(n - 1, Math.max(0, t * this.fps));
    let i0 = Math.floor(x), u = x - i0, i1 = c.loop ? (i0 + 1) % n : Math.min(n - 1, i0 + 1); i0 = Math.min(i0, n - 1);
    const a = i0 * c.stride, b = i1 * c.stride, f = c.f;
    for (let r = 0; r < ROT_ROLES.length; r++) {
      const o = r * 4; _q.set(f[a + o], f[a + o + 1], f[a + o + 2], f[a + o + 3]); _q2.set(f[b + o], f[b + o + 1], f[b + o + 2], f[b + o + 3]);
      pose.rot[r].copy(_q).slerp(_q2, u);
    }
    const ao = ROT_ROLES.length * 4;
    for (let r = 0; r < AIM_ROLES.length; r++) {
      const o = ao + r * 3;
      pose.aim[r].set(f[a + o] + (f[b + o] - f[a + o]) * u, f[a + o + 1] + (f[b + o + 1] - f[a + o + 1]) * u, f[a + o + 2] + (f[b + o + 2] - f[a + o + 2]) * u);
    }
    return pose;
  }
}
const mkPose = () => ({ rot: ROT_ROLES.map(() => new THREE.Quaternion()), aim: AIM_ROLES.map(() => new THREE.Vector3(0, -1, 0)) });
const IDLES = [['Idle_Loop', 5], ['Idle_LookAround_Loop', 2], ['Idle_FoldArms_Loop', 2], ['Idle_Rail_Loop', 1]];

class Avatar {
  // frame: Group that is the animation space (forward = +Z, up = +Y). obj lives inside frame.
  constructor(obj, { vrm = null, mouth = null } = {}) {
    this.frame = new THREE.Group(); this.frame.name = 'ferrule-frame';
    this.obj = obj; this.vrm = vrm; this.frame.add(obj);
    this.flipped = false; this.baseYaw = obj.rotation.y;
    this.placeholderMouth = mouth;
    this.normalize();
    this.map = mapRig(obj, vrm);
    this.roles = ORDER.filter(r => this.map[r]);
    this.legRoles = LEGS.filter(r => this.map[r]);
    this.allRoles = this.roles.concat(this.legRoles);
    this.hasRig = !!(this.map.head || this.map.hips);
    this.loweredArms = this.lowerArms();
    this.base = {}; for (const r of this.allRoles) this.base[r] = this.map[r].quaternion.clone();
    this.autoFace();
    this.recomputeRest();
    this.findFace();
    this.cum = {}; this.w = {}; this.anim = null; this.cl = null;
    this.state = { level: 0, lv: 0, speaking: false, thinking: false, gesture: null, nextGesture: 1, nextBlink: 2 + Math.random() * 3, blinkT: -1, viseme: 0, visT: 0, nod: 0 };
  }

  setAnim(pack) {
    this.anim = pack;
    this.cl = { a: { name: 'Idle_Loop', t: Math.random() * 2 }, b: null, bw: 0, once: null, pose: mkPose(), pa: mkPose(), pb: mkPose(), want: null, nextIdle: 'Idle_Loop' };
  }
  playOnce(name) { if (this.anim && this.anim.has(name) && this.cl) this.cl.once = name; }
  clipTick(dt) {
    const cl = this.cl, P = this.anim, st = this.state; if (!cl) return null;
    const pickIdle = () => { let tot = IDLES.reduce((s, x) => s + (P.has(x[0]) ? x[1] : 0), 0), r = Math.random() * tot; for (const [n, w] of IDLES) { if (!P.has(n)) continue; if ((r -= w) <= 0) return n; } return 'Idle_Loop'; };
    let want;
    if (cl.once) want = cl.once; else if (st.speaking && P.has('Idle_Talking_Loop')) want = 'Idle_Talking_Loop'; else if (st.thinking && P.has('Idle_LookAround_Loop')) want = 'Idle_LookAround_Loop'; else want = cl.nextIdle;
    const cur = cl.b ? cl.b.name : cl.a.name;
    const curDef = P.clips[cur];
    const isOnce = !curDef.loop;
    if (want !== cur && !(isOnce && cl.a.t < curDef.dur - 0.05 && !cl.once)) { cl.b = { name: want, t: 0 }; cl.bw = 0; if (cl.once === want) cl.once = null; }
    if (cl.freeze != null) { cl.b = null; cl.a.name = cl.freeze.name; cl.a.t = cl.freeze.t; P.sample(cl.a.name, cl.a.t, cl.pa); for (let i = 0; i < cl.pose.rot.length; i++) cl.pose.rot[i].copy(cl.pa.rot[i]); for (let i = 0; i < cl.pose.aim.length; i++) cl.pose.aim[i].copy(cl.pa.aim[i]); return cl.pose; }
    cl.a.t += dt; if (cl.b) { cl.b.t += dt; cl.bw += dt / 0.45; if (cl.bw >= 1) { cl.a = cl.b; cl.b = null; } }
    const A = P.clips[cl.a.name];
    if (!cl.b) {
      if (!A.loop && cl.a.t >= A.dur) { cl.nextIdle = pickIdle(); }
      else if (A.loop && cl.a.t >= A.dur && !st.speaking && !st.thinking && /^Idle_/.test(cl.a.name)) { cl.a.t -= A.dur; cl.nextIdle = pickIdle(); }
    }
    P.sample(cl.a.name, cl.a.t, cl.pa);
    const pose = cl.pose;
    if (cl.b) {
      P.sample(cl.b.name, cl.b.t, cl.pb); const k = cl.bw * cl.bw * (3 - 2 * cl.bw);
      for (let i = 0; i < pose.rot.length; i++) pose.rot[i].copy(cl.pa.rot[i]).slerp(cl.pb.rot[i], k);
      for (let i = 0; i < pose.aim.length; i++) pose.aim[i].copy(cl.pa.aim[i]).lerp(cl.pb.aim[i], k).normalize();
    } else { for (let i = 0; i < pose.rot.length; i++) pose.rot[i].copy(cl.pa.rot[i]); for (let i = 0; i < pose.aim.length; i++) pose.aim[i].copy(cl.pa.aim[i]); }
    return pose;
  }

  normalize() {
    const o = this.obj;
    o.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(o, true);
    const h = box.max.y - box.min.y;
    if (h > 1e-6 && isFinite(h)) {
      const s = 1.75 / h; o.scale.multiplyScalar(s); o.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(o, true);
    }
    const c = box.getCenter(new THREE.Vector3());
    o.position.x -= c.x; o.position.z -= c.z; o.position.y -= box.min.y;
    o.updateMatrixWorld(true);
  }

  lowerArms() {
    let did = false;
    for (const s of ['L', 'R']) {
      const up = this.map['upperArm' + s], lo = this.map['lowerArm' + s] || this.map['hand' + s];
      if (!up || !lo) continue;
      this.frame.updateMatrixWorld(true);
      up.getWorldPosition(_v); lo.getWorldPosition(_v2);
      const dir = _v2.sub(_v).normalize();
      if (dir.y < -0.75) continue; // already hanging
      const out = new THREE.Vector3(dir.x, 0, dir.z); if (out.lengthSq() < 1e-6) out.set(s === 'L' ? 1 : -1, 0, 0); out.normalize();
      const target = out.multiplyScalar(0.2).add(new THREE.Vector3(0, -0.98, 0.04)).normalize();
      const delta = _q.setFromUnitVectors(dir, target);
      up.getWorldQuaternion(_q2);
      const newWorld = delta.clone().multiply(_q2);
      const pq = up.parent ? up.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion();
      up.quaternion.copy(pq.invert().multiply(newWorld));
      up.updateMatrixWorld(true);
      did = true;
    }
    return did;
  }

  autoFace() {
    const L = this.map.upperArmL || this.map.handL, R = this.map.upperArmR || this.map.handR;
    if (!L || !R) return;
    this.frame.updateMatrixWorld(true);
    L.getWorldPosition(_v); R.getWorldPosition(_v2);
    this.frame.worldToLocal(_v); this.frame.worldToLocal(_v2);
    if (_v.x < _v2.x) this.setFlipped(true, false);
  }
  setFlipped(f, recompute = true) {
    this.flipped = f; this.obj.rotation.y = this.baseYaw + (f ? Math.PI : 0);
    if (recompute) {
      for (const r of this.allRoles) this.map[r].quaternion.copy(this.base[r]);
      this.recomputeRest();
    }
  }
  recomputeRest() {
    this.frame.updateMatrixWorld(true);
    const fInv = this.frame.getWorldQuaternion(new THREE.Quaternion()).invert();
    this.rest = {};
    for (const r of this.allRoles) this.rest[r] = this.map[r].getWorldQuaternion(new THREE.Quaternion()).premultiply(fInv);
  }

  findFace() {
    this.blinkTargets = []; this.mouthTargets = []; this.vrmExpr = null;
    if (this.vrm && this.vrm.expressionManager) {
      const em = this.vrm.expressionManager; this.vrmExpr = em;
      this.hasVisemes = !!(em.getExpression('aa'));
    }
    this.obj.traverse(m => {
      if (!m.isMesh || !m.morphTargetDictionary) return;
      const d = m.morphTargetDictionary;
      for (const k of Object.keys(d)) {
        if (/^(eyeblink(left|right)?|blink(_?[lr])?|eyes?_?closed?|eye_?blink)/i.test(k) || /blink/i.test(k)) this.blinkTargets.push([m, d[k]]);
        else if (/^(jawopen|mouthopen|viseme_aa|v_aa|vrc\.v_aa|mouth_?a|aa|a|mouth_open|open_mouth)$/i.test(k) || /jaw.?open|mouth.?open/i.test(k)) this.mouthTargets.push([m, d[k]]);
      }
    });
    this.hasMouth = !!(this.vrmExpr && this.hasVisemes) || this.mouthTargets.length > 0 || !!this.map.jaw || !!this.placeholderMouth;
    this.hasBlink = !!(this.vrmExpr && this.vrmExpr.getExpression('blink')) || this.blinkTargets.length > 0;
  }

  // delta euler (root axes) -> accumulates down the chain
  deltas(dt, t) {
    const st = this.state, d = {};
    const E = (r, x = 0, y = 0, z = 0) => { const e = d[r] || (d[r] = [0, 0, 0]); e[0] += x; e[1] += y; e[2] += z; };
    const lv = st.lv;
    const br = Math.sin(t * 1.55) * 0.5 + 0.5;
    E('upperChest', -0.012 * br); E('chest', -0.008 * br);
    E('shoulderL', 0, 0, 0.01 * br); E('shoulderR', 0, 0, -0.01 * br);
    const sway = Math.sin(t * 0.45) * 0.012;
    E('hips', 0, Math.sin(t * 0.31) * 0.035, sway); E('spine', 0, -Math.sin(t * 0.31) * 0.02, -sway * 0.8);
    let hx = 0.035 * Math.sin(t * 0.53 + 2), hy = 0.10 * Math.sin(t * 0.37) + 0.05 * Math.sin(t * 0.91 + 1), hz = 0.04 * Math.sin(t * 0.21);
    if (st.thinking) { hx += -0.11; hy += 0.26; hz += 0.08; }
    if (st.speaking) {
      st.nod = smooth(st.nod, lv, dt, 9);
      hx += 0.04 + 0.12 * st.nod + 0.025 * Math.sin(t * 6.7) * lv;
      hy += 0.07 * Math.sin(t * 2.1) * (0.4 + lv);
      hz += 0.05 * Math.sin(t * 1.3 + 1);
    }
    const hk = this.anim ? 0.55 : 1;
    E('neck', hx * 0.4 * hk, hy * 0.4 * hk, hz * 0.4 * hk); E('head', hx * 0.6 * hk, hy * 0.6 * hk, hz * 0.6 * hk);
    if (this.anim) return d;
    // arms: rest sway plus gestures
    E('upperArmL', 0, 0, 0.02 * Math.sin(t * 0.8)); E('upperArmR', 0, 0, -0.02 * Math.sin(t * 0.8 + 1));
    E('lowerArmL', -0.04 - 0.02 * Math.sin(t * 0.7)); E('lowerArmR', -0.04 - 0.02 * Math.sin(t * 0.7 + 1.3));
    if (st.speaking) {
      if (!st.gesture && t > st.nextGesture) {
        const side = Math.random() < 0.5 ? 'L' : 'R';
        st.gesture = { side, t0: t, dur: 0.9 + Math.random() * 0.9, a: 0.55 + Math.random() * 0.45, twist: Math.random() };
      }
    }
    const g = st.gesture;
    if (g) {
      const ph = (t - g.t0) / g.dur;
      if (ph >= 1) { st.gesture = null; st.nextGesture = t + 0.5 + Math.random() * 1.8; }
      else {
        const e = Math.sin(Math.PI * ph) ** 1.4 * clamp(0.35 + lv * 2.2, 0.35, 1);
        const sgn = g.side === 'L' ? 1 : -1, S = g.side;
        E('upperArm' + S, -(0.35 + 0.3 * g.a) * e, 0, sgn * (0.3 + 0.3 * g.a) * e);
        E('lowerArm' + S, -(0.65 + 0.55 * g.a) * e, sgn * -0.2 * e, 0);
        E('hand' + S, 0.15 * Math.sin(t * 9) * e, 0, sgn * 0.25 * Math.sin(t * 7) * e);
        E('shoulder' + S, 0, 0, sgn * 0.05 * e);
        E('spine', 0, -sgn * 0.05 * e, 0);
      }
    } else if (!st.speaking) { st.nextGesture = Math.max(st.nextGesture, t + 0.2); }
    return d;
  }

  update(dt, t, flags = {}) {
    const st = this.state;
    st.speaking = !!flags.speaking; st.thinking = !!flags.thinking;
    st.level = flags.level || 0;
    st.lv = smooth(st.lv, st.speaking ? st.level : 0, dt, st.level > st.lv ? 28 : 10);
    if (this.hasRig) {
      const d = this.deltas(dt, t);
      const pose = this.anim ? this.clipTick(dt) : null;
      this.frame.updateMatrixWorld(true);
      const fq = this.frame.getWorldQuaternion(new THREE.Quaternion()), fInv = fq.clone().invert();
      const dw = {};
      if (pose) ROT_ROLES.forEach((r, i) => { dw[r] = pose.rot[i].clone(); if (r === 'hips') dw[r].slerp(new THREE.Quaternion(), 0.4); });
      for (const r of this.roles) {
        const bone = this.map[r], e = d[r] || [0, 0, 0];
        const pr = parentRole(r, this.map);
        const D = new THREE.Quaternion().setFromEuler(_e.set(e[0], e[1], e[2], 'YXZ'));
        if (pose && dw[r]) {
          const loc = pr && dw[pr] ? dw[r].clone().multiply(dw[pr].clone().invert()) : dw[r].clone();
          D.multiply(loc);
        }
        const cum = pr && this.cum[pr] ? D.clone().premultiply(this.cum[pr]) : D;
        this.cum[r] = cum;
        const target = cum.clone().multiply(this.rest[r]);
        const par = bone.parent;
        if (par) {
          par.matrixWorld.decompose(_v, _q, _s);
          const parentRel = _q.clone().premultiply(fInv);
          bone.quaternion.copy(parentRel.invert().multiply(target));
        } else bone.quaternion.copy(target);
        bone.updateMatrixWorld(true);
        const ai = AIM_ROLES.indexOf(r), ch = this.map[AIM_CHILD[r]];
        if (pose && ai >= 0 && ch) {
          bone.getWorldPosition(_v); ch.getWorldPosition(_v2);
          const cur = _v2.sub(_v).normalize();
          const want = pose.aim[ai].clone().applyQuaternion(fq);
          if (cur.lengthSq() > 0.5 && want.lengthSq() > 0.5) {
            const dq = new THREE.Quaternion().setFromUnitVectors(cur, want);
            const bw = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(dq);
            const tf = bw.clone().premultiply(fInv);
            this.cum[r] = tf.clone().multiply(this.rest[r].clone().invert());
            if (par) { par.getWorldQuaternion(_q); bone.quaternion.copy(_q.invert().multiply(bw)); } else bone.quaternion.copy(bw);
            bone.updateMatrixWorld(true);
          }
        }
      }
      // keep thighs planted: cancel whatever the pelvis did so the legs stay at rest in world space
      if (pose) for (const r of this.legRoles) {
        const bone = this.map[r], par = bone.parent; if (!par) continue;
        const target = this.rest[r].clone().premultiply(fq);
        par.updateMatrixWorld(true); par.getWorldQuaternion(_q);
        bone.quaternion.copy(_q.invert().multiply(target)); bone.updateMatrixWorld(true);
      }
    }
    this.face(dt, t);
    if (this.vrm) this.vrm.update(dt);
  }

  face(dt, t) {
    const st = this.state;
    // blink
    let blink = 0;
    if (st.blinkT < 0 && t > st.nextBlink) st.blinkT = 0;
    if (st.blinkT >= 0) {
      st.blinkT += dt; const p = st.blinkT / 0.15;
      blink = p < 1 ? Math.sin(p * Math.PI) : 0;
      if (p >= 1) { st.blinkT = -1; st.nextBlink = t + 1.8 + Math.random() * 4.5; }
    }
    if (this.vrmExpr) {
      this.vrmExpr.setValue('blink', blink);
    }
    for (const [m, i] of this.blinkTargets) m.morphTargetInfluences[i] = blink;
    // mouth
    const open = clamp(st.lv * 1.7);
    if (this.vrmExpr && this.hasVisemes) {
      st.visT += dt;
      if (st.visT > 0.11) { st.visT = 0; st.viseme = (st.viseme + 1 + (Math.random() * 2 | 0)) % 5; }
      const names = ['aa', 'ih', 'ou', 'ee', 'oh'];
      names.forEach((n, i) => this.vrmExpr.setValue(n, i === st.viseme ? open * 0.85 : 0));
    }
    for (const [m, i] of this.mouthTargets) m.morphTargetInfluences[i] = open;
    if (this.map.jaw && this.rest.jaw) { /* jaw rides on the head chain via deltas; small extra open */ this.map.jaw.rotation.x += 0; }
    if (this.placeholderMouth) { this.placeholderMouth.scale.y = 0.25 + open * 2.4; this.placeholderMouth.scale.x = 1 - open * 0.25; }
  }
}


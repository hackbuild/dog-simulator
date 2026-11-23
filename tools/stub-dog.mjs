// stub-dog: a small rigged dog written from code, for builds made without assets-local/
// (CI, a public clone). It carries every bone the app's rig setup needs (app/src/dog/setup.js
// NEED and LEGDEF), placed by hand for a dog about 0.8 m tall (computed), +Z forward, Y up,
// meters, with one box per bone segment skinned rigidly to the segment's first bone. It looks
// like a box dog; the gait, the senses and the brain run on it as on the full model, but traces
// made on it differ from traces made on assets-local/dog.glb. MIT, like the rest of the code.
//
//   import { stubDogGlb } from "./stub-dog.mjs";   // a Buffer holding a .glb

// name, parent, world position at rest
const BONES = [
  ["root", null, [0, 0, 0]],
  ["hips", "root", [0, 0.5, -0.2]],
  ["spine2", "hips", [0, 0.52, 0]],
  ["spine_03", "spine2", [0, 0.53, 0.15]],
  ["chest", "spine_03", [0, 0.52, 0.25]],
  ["neck1", "chest", [0, 0.62, 0.33]],
  ["head", "neck1", [0, 0.72, 0.4]],
  ["tail1", "hips", [0, 0.52, -0.3]],
  ["tail3", "tail1", [0, 0.56, -0.42]],
  ["tail_03", "tail3", [0, 0.6, -0.52]],
];
for (const [s, x] of [["L", 1], ["R", -1]]) {
  BONES.push(
    [`ear.${s}_01`, "head", [0.05 * x, 0.8, 0.38]],
    [`ear.${s}`, `ear.${s}_01`, [0.07 * x, 0.86, 0.37]],
    [`clavicle.${s}`, "chest", [0.08 * x, 0.48, 0.25]],
    [`frontUpr.${s}`, `clavicle.${s}`, [0.09 * x, 0.4, 0.26]],
    [`frontLeg.${s}_03`, `frontUpr.${s}`, [0.09 * x, 0.24, 0.24]],
    [`frontHorselink.${s}`, `frontLeg.${s}_03`, [0.09 * x, 0.08, 0.26]],
    [`frontToe.${s}`, `frontHorselink.${s}`, [0.09 * x, 0.02, 0.3]],
    [`rearUpr.${s}`, "hips", [0.09 * x, 0.46, -0.2]],
    [`rearLwr.${s}`, `rearUpr.${s}`, [0.09 * x, 0.28, -0.16]],
    [`rearHorselink.${s}`, `rearLwr.${s}`, [0.09 * x, 0.12, -0.24]],
    [`rearFoot.${s}`, `rearHorselink.${s}`, [0.09 * x, 0.04, -0.22]],
    [`rearToe.${s}`, `rearFoot.${s}`, [0.09 * x, 0.02, -0.18]],
  );
}

// boxes: [bone that moves it, from, to, half width]; the head box reaches forward to the nose
function boxes() {
  const at = Object.fromEntries(BONES.map(([n, , p]) => [n, p]));
  const out = [["spine2", at.hips, at.chest, 0.1], ["head", at.head, [0, 0.7, 0.56], 0.06]];
  for (const [n, parent] of BONES) {
    if (!parent || ["root", "hips", "spine2", "spine_03", "chest", "head"].includes(parent)) continue;
    out.push([parent, at[parent], at[n], parent.startsWith("ear") || parent.startsWith("tail") ? 0.02 : 0.03]);
  }
  out.push(["neck1", at.chest, at.head, 0.05], ["tail1", at.tail1, at.tail3, 0.025]);
  return out;
}

// an oriented box between a and b: 8 corners, 12 triangles, flat normals (24 vertices)
function box(a, b, h) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d) || 1;
  const f = d.map((v) => v / len);
  const up = Math.abs(f[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  const r = norm(cross(up, f)), u = cross(f, r);
  const c = (s, t, e) => [0, 1, 2].map((k) => (e ? b[k] : a[k]) + (r[k] * s + u[k] * t) * h);
  const C = [c(-1, -1, 0), c(1, -1, 0), c(1, 1, 0), c(-1, 1, 0), c(-1, -1, 1), c(1, -1, 1), c(1, 1, 1), c(-1, 1, 1)];
  const faces = [[0, 3, 2, 1, f.map((x) => -x)], [4, 5, 6, 7, f], [0, 1, 5, 4, u.map((x) => -x)], [3, 7, 6, 2, u], [0, 4, 7, 3, r.map((x) => -x)], [1, 2, 6, 5, r]];
  const pos = [], nrm = [], idx = [];
  for (const [p, q, s, t, n] of faces) {
    const base = pos.length / 3;
    for (const i of [p, q, s, t]) { pos.push(...C[i]); nrm.push(...n); }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return { pos, nrm, idx };
}

export function stubDogGlb() {
  const index = Object.fromEntries(BONES.map(([n], i) => [n, i]));
  const pos = [], nrm = [], joints = [], weights = [], idx = [];
  for (const [bone, a, b, h] of boxes()) {
    const m = box(a, b, h), base = pos.length / 3;
    pos.push(...m.pos); nrm.push(...m.nrm); idx.push(...m.idx.map((i) => i + base));
    for (let i = 0; i < m.pos.length / 3; i++) { joints.push(index[bone], 0, 0, 0); weights.push(1, 0, 0, 0); }
  }
  const ibm = BONES.flatMap(([, , p]) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -p[0], -p[1], -p[2], 1]);
  const views = [];
  const chunks = [];
  let off = 0;
  const add = (arr, Type) => {
    const buf = Buffer.from(new Type(arr).buffer);
    const pad = (4 - (buf.length % 4)) % 4;
    chunks.push(buf, Buffer.alloc(pad));
    views.push({ buffer: 0, byteOffset: off, byteLength: buf.length });
    off += buf.length + pad;
    return views.length - 1;
  };
  const min = [0, 1, 2].map((k) => Math.min(...pos.filter((_, i) => i % 3 === k)));
  const max = [0, 1, 2].map((k) => Math.max(...pos.filter((_, i) => i % 3 === k)));
  const n = pos.length / 3;
  const accessors = [
    { bufferView: add(pos, Float32Array), componentType: 5126, count: n, type: "VEC3", min, max },
    { bufferView: add(nrm, Float32Array), componentType: 5126, count: n, type: "VEC3" },
    { bufferView: add(joints, Uint16Array), componentType: 5123, count: n, type: "VEC4" },
    { bufferView: add(weights, Float32Array), componentType: 5126, count: n, type: "VEC4" },
    { bufferView: add(idx, Uint16Array), componentType: 5123, count: idx.length, type: "SCALAR" },
    { bufferView: add(ibm, Float32Array), componentType: 5126, count: BONES.length, type: "MAT4" },
  ];
  const nodes = BONES.map(([name, parent, p]) => {
    const q = parent ? BONES[index[parent]][2] : [0, 0, 0];
    const kids = BONES.map(([c, cp], i) => (cp === name ? i : -1)).filter((i) => i >= 0);
    return { name, translation: [p[0] - q[0], p[1] - q[1], p[2] - q[2]], ...(kids.length ? { children: kids } : {}) };
  });
  nodes.push({ name: "stub_dog", mesh: 0, skin: 0 }, { name: "armature", children: [0] });
  const json = {
    asset: { version: "2.0", generator: "dog-simulator tools/stub-dog.mjs" },
    scene: 0,
    scenes: [{ nodes: [nodes.length - 1, nodes.length - 2] }],
    nodes,
    skins: [{ joints: BONES.map((_, i) => i), inverseBindMatrices: 5, skeleton: 0 }],
    meshes: [{ name: "stub_dog", primitives: [{ attributes: { POSITION: 0, NORMAL: 1, JOINTS_0: 2, WEIGHTS_0: 3 }, indices: 4, material: 0 }] }],
    materials: [{ name: "coat", pbrMetallicRoughness: { baseColorFactor: [0.55, 0.38, 0.22, 1], metallicFactor: 0, roughnessFactor: 0.8 } }],
    accessors,
    bufferViews: views,
    buffers: [{ byteLength: off }],
  };
  let js = Buffer.from(JSON.stringify(json));
  js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
  const bin = Buffer.concat(chunks);
  const head = Buffer.alloc(12);
  head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
  const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
  return Buffer.concat([head, ch(js.length, 0x4e4f534a), js, ch(bin.length, 0x004e4942), bin]);
}

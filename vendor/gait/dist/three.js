// three.js adapter: measure a quadruped rig by bone names and drive it from
// the gait, body, tail and ear state each frame.
import { Quaternion, Vector3 } from "three";
import { solveLeg } from "./index.js";
/**
 * Measures leg spots, toe heights, leg length and track width from the rest
 * pose. `root` must sit at the origin with identity rotation and face +Z
 * when this runs. Names can come from `@hackbuild/rig` `limbChains`.
 */
export function measureQuadruped(root, names) {
    const get = (n) => {
        const o = root.getObjectByName(n);
        if (!o)
            throw new Error(`gait: no bone named ${n}`);
        return o;
    };
    root.updateMatrixWorld(true);
    const rest = new Map();
    root.traverse((o) => {
        if (o !== root)
            rest.set(o, { p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() });
    });
    const local = (o) => root.worldToLocal(o.getWorldPosition(new Vector3()));
    const rootInv = root.getWorldQuaternion(new Quaternion()).invert();
    const order = ["LF", "RF", "LH", "RH"];
    const legs = [];
    const specs = [];
    for (const id of order) {
        const n = names.legs[id];
        const up = get(n.up);
        const mid = get(n.mid);
        const end = get(n.end);
        const tip = get(n.toes[n.toes.length - 1] ?? n.end);
        const a = local(up);
        const b = local(mid);
        const c = local(end);
        const t = local(tip);
        const ac = c.clone().sub(a).normalize();
        const pole = b.clone().sub(a);
        pole.sub(ac.clone().multiplyScalar(pole.dot(ac)));
        if (pole.lengthSq() < 1e-12)
            pole.set(0, 0, id.endsWith("F") ? -1 : 1);
        legs.push({ up, mid, end, paw: t.clone().sub(c), pole: pole.normalize(), endRest: end.getWorldQuaternion(new Quaternion()).premultiply(rootInv) });
        specs.push({ x: t.x, z: t.z, toe: Math.max(t.y, 0.005), front: id.endsWith("F") });
    }
    const hipY = (i) => local(legs[i].up).y;
    const legLength = (hipY(0) + hipY(2)) / 2;
    const geometry = {
        frontZ: (specs[0].z + specs[1].z) / 2,
        rearZ: (specs[2].z + specs[3].z) / 2,
        halfWidth: Math.abs(specs[0].x - specs[1].x) / 2,
        size: legLength / 0.42,
    };
    return {
        root,
        hips: get(names.hips),
        legs,
        spine: (names.spine ?? []).map(get),
        tail: (names.tail ?? []).map(get),
        ears: (names.ears ?? []).map(get),
        specs,
        legLength,
        geometry,
        rest,
    };
}
function rotateWorld(o, q) {
    o.updateWorldMatrix(true, false);
    const world = o.getWorldQuaternion(new Quaternion()).premultiply(q);
    const parent = o.parent ? o.parent.getWorldQuaternion(new Quaternion()) : new Quaternion();
    o.quaternion.copy(parent.invert().multiply(world));
    o.updateMatrixWorld(true);
}
function setWorld(o, q) {
    const parent = o.parent ? o.parent.getWorldQuaternion(new Quaternion()) : new Quaternion();
    o.quaternion.copy(parent.invert().multiply(q));
    o.updateMatrixWorld(true);
}
/** Writes one frame of gait and body state onto the rig. Returns the legs whose target was out of reach. */
export function driveQuadruped(rig, pose, gait, body, extras = {}) {
    for (const [o, r] of rig.rest) {
        o.position.copy(r.p);
        o.quaternion.copy(r.q);
        o.scale.copy(r.s);
    }
    const { root } = rig;
    const UP = new Vector3(0, 1, 0);
    root.position.set(pose.x, body.rootY, pose.z);
    root.quaternion.setFromAxisAngle(UP, pose.yaw);
    root.updateMatrixWorld(true);
    const yawQ = root.quaternion.clone();
    const left = new Vector3(1, 0, 0).applyQuaternion(yawQ);
    const fwd = new Vector3(0, 0, 1).applyQuaternion(yawQ);
    const scale = root.getWorldScale(new Vector3()).y || 1;
    // body: drop and shift along the body, then pitch about the left axis and roll about forward
    const hips = rig.hips;
    const shift = new Vector3(0, -body.drop, body.dz).applyQuaternion(yawQ);
    const parentInv = hips.parent ? hips.parent.getWorldQuaternion(new Quaternion()).invert() : new Quaternion();
    hips.position.add(shift.applyQuaternion(parentInv).divideScalar(scale));
    hips.updateMatrixWorld(true);
    rotateWorld(hips, new Quaternion().setFromAxisAngle(fwd, body.roll).multiply(new Quaternion().setFromAxisAngle(left, body.pitch)));
    const n = rig.spine.length;
    rig.spine.forEach((b) => rotateWorld(b, new Quaternion().setFromAxisAngle(UP, body.bend / Math.max(n, 1)).multiply(new Quaternion().setFromAxisAngle(left, body.flex / Math.max(n, 1)))));
    if (extras.tail) {
        rig.tail.forEach((b, i) => {
            const q = new Quaternion().setFromAxisAngle(UP, extras.tail.yaw[i] ?? 0);
            if (i === 0)
                q.multiply(new Quaternion().setFromAxisAngle(left, -extras.tail.lift));
            rotateWorld(b, q);
        });
    }
    if (extras.ears)
        rig.ears.forEach((b, i) => rotateWorld(b, new Quaternion().setFromAxisAngle(fwd, i === 0 ? extras.ears[0] : -extras.ears[1])));
    const missed = [];
    if (extras.ik === false)
        return missed;
    rig.legs.forEach((l, i) => {
        const foot = gait.feet[i];
        if (!foot)
            return;
        const tilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), body.tilt[i] ?? 0);
        const endWorld = yawQ.clone().multiply(tilt).multiply(l.endRest);
        const paw = l.paw.clone().applyQuaternion(tilt).applyQuaternion(yawQ).multiplyScalar(scale);
        const target = new Vector3(foot.x, foot.y, foot.z).sub(paw);
        const p = (o) => o.getWorldPosition(new Vector3()).toArray();
        const s = solveLeg(p(l.up), p(l.mid), p(l.end), target.toArray(), l.pole.clone().applyQuaternion(yawQ).toArray());
        rotateWorld(l.up, new Quaternion().fromArray(s.upper));
        rotateWorld(l.mid, new Quaternion().fromArray(s.lower));
        setWorld(l.end, endWorld);
        if (!s.reached)
            missed.push(i);
    });
    return missed;
}

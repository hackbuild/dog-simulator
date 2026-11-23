const headWorld = (local, out = V3()) => dog.bones['head'].localToWorld(out.copy(local));
function headForward(out = V3()) { const m = dog.bones['head'].matrixWorld; return out.copy(dog.fwdM).transformDirection(m); }
function lookAt(p, roll = 0) {
  if (!dog.ready) return;
  const nk = dog.bones['neck1'].getWorldPosition(tmpV[6]);
  const local = dog.root.worldToLocal(tmpV[7].copy(p)); const nl = dog.root.worldToLocal(nk.clone());
  const d = local.sub(nl);
  dog.head.tYaw = clamp(Math.atan2(d.x, d.z), -1.45, 1.45);
  dog.head.tPitch = clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.9, 1.25);
  dog.head.tRoll = roll;
}
function lookForward(pitch = 0) { dog.head.tYaw = 0; dog.head.tPitch = pitch; dog.head.tRoll = 0; }


// neural gait: not in this build. The legacy network host is CC-BY-NC-4.0 and stays in
// legacy/; an MIT host comes later. These stand ins keep the CPG path unchanged:
// nnWanted() is false while NG.ready is false, so nothing below is called.
const NM = {};
const NR = { ok: false, legs: [] };
const NG = {
  state: 'absent', ready: false, active: false, guidance: 'Idle', ms: 0, speed: 0, cont: [1, 1, 1, 1], A: null,
  async load(onStat) { onStat && onStat('not in this build'); },
  reset() {}, setGoal() {}, tick() { return false; }
};
function nnRig() {}
function nnApply() {}
function nnPawTilt() {}

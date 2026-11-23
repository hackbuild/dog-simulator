// ---------- input ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let downAt = null;
renderer.domElement.addEventListener('pointerdown', e => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; audio(); });
renderer.domElement.addEventListener('pointerup', e => {
  if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6 || performance.now() - downAt.t > 450) return;
  const r = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ndc, camera);
  // dog hit: ray vs body segment
  if (dog.ready) {
    const a = dog.root.localToWorld(V3(0, 0.33, -0.25)), b = dog.root.localToWorld(V3(0, 0.38, 0.35));
    const dd = ray.ray.distanceSqToSegment(a, b);
    if (dd < 0.2 * 0.2) { pet(); return; }
  }
  const hit = ray.intersectObject(ground)[0]; if (!hit) return;
  if (e.shiftKey) { throwBall(hit.point.clone()); return; }
  marker.position.copy(hit.point).add(V3(0, 0.015, 0)); marker.material.opacity = 1;
  if (HUM.ready && ON('L.social')) { startTask('point', { p: hit.point.clone(), user: true }, 'you asked him to point there'); return; }
  emitSound(V3(YOU.x, 1.4, YOU.z), 0.25, 'point');
  if (brain.cur !== 'sleep' && brain.cur !== 'obey') { brain.pointT = now; }
});
function pet() { brain.d.social = clamp(brain.d.social - 0.12, 0, 1); brain.v = clamp(brain.v + 0.12, -1, 1); brain.a = clamp(brain.a - 0.05, 0, 1); brain.say(pick(['mmm', 'yes there', 'happy', 'more pets']), 1.6); dog.head.tRoll = 0.25; if (brain.trial && !brain.trial.rewarded) brain.reward(0.4, 'pet'); }
addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; manualKeys[e.key.toLowerCase()] = true; if (e.key === 'Shift') manualKeys.shift = true; if ($('manual').checked && /^(arrow|w|a|s|d)/i.test(e.key)) e.preventDefault(); });
addEventListener('keyup', e => { manualKeys[e.key.toLowerCase()] = false; if (e.key === 'Shift') manualKeys.shift = false; });
$('bThrow').onclick = () => { audio(); throwBall(); };
$('bTreat').onclick = () => { audio(); tossTreat(); };
$('bCall').onclick = () => { audio(); startTask('call', { user: true }, 'you asked'); };
$('bPet').onclick = () => { audio(); startTask('pet', { user: true }, 'you asked'); };
$('bTrainNow').onclick = () => { audio(); const p = pick(NEW_WORDS.concat([['sit', 'sit'], ['spin', 'spin'], ['paw', 'paw']])); startTask('train', { word: p[0], trick: p[1], reps: 5, user: true }, 'you asked: teach "' + p[0] + '" as ' + p[1]); };
$('bVoiceLoad').onclick = () => { audio(); $('bVoiceLoad').disabled = true; Voice.init(t => { $('voiceSt').textContent = t; }).then(() => { $('voiceSt').textContent = 'pocket tts ready, his cloned voice'; }).catch(e => { $('voiceSt').textContent = 'pocket tts failed: ' + String(e.message || e).slice(0, 60) + '. Using the browser voice.'; $('bVoiceLoad').disabled = false; }); };
$('humVoiceOn').onchange = e => { Voice.on = e.target.checked; };
$('bGood').onclick = () => { audio(); if (HUM.ready) { humSay(pick(H_LINES.praise), 2, true); HUM.mood.pleasedT = 1; } brain.reward(0.8, 'good dog'); };
$('bNo').onclick = () => { audio(); if (HUM.ready) { humSay(pick(H_LINES.no), 2); HUM.shakeT = 1.1; HUM.mood.frusT = Math.min(1, (HUM.mood.frusT || 0) + 0.4); } brain.reward(-0.8, 'no'); };
$('bFill').onclick = () => { foodAmt = 1; toast('bowl filled'); emitSound(V3(BOWL.x, 0.2, BOWL.z), 0.45, 'kibble'); scentSrc.push({ x: BOWL.x, z: BOWL.z, s: 1.2, t: now }); };
$('bSquirrel').onclick = () => { if (squirrel.state === 'gone') spawnSquirrel(); };
let camMode = 0; const CAMS = ['Follow', 'Free', 'Dog eye', 'Side', 'His eyes'];
function setCamMode(m) { camMode = m; $('camLab').textContent = CAMS[camMode]; controls.maxDistance = m === 1 ? 45 : 26; }
$('bCam').onclick = () => setCamMode((camMode + 1) % CAMS.length);
// free camera: right drag pans, two fingers pan, WASD or arrows fly, Q and E lower and raise, F goes back to following the dog
renderer.domElement.addEventListener('pointerdown', e => { if ((e.button === 2 || e.button === 1) && camMode !== 1 && camMode !== 2 && camMode !== 4) setCamMode(1); });
renderer.domElement.addEventListener('touchstart', e => { if (e.touches.length > 1 && camMode !== 1) setCamMode(1); }, { passive: true });
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
const FLY = { w: [0, 1], arrowup: [0, 1], s: [0, -1], arrowdown: [0, -1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || $('manual').checked) return;
  const k = e.key.toLowerCase();
  if (k === 'f') { setCamMode(0); return; }
  if (FLY[k] || k === 'q' || k === 'e') { e.preventDefault(); if (camMode !== 1) { if (camMode === 2 || camMode === 4) { camera.position.copy(camMode === 2 ? eyeCam.position : povCam.position); controls.target.copy(camera.position).add(tmpV[5].set(0, 0, -2).applyQuaternion((camMode === 2 ? eyeCam : povCam).quaternion)); } setCamMode(1); } }
});
function flyCam(dt) {
  if ($('manual').checked || document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  let fx = 0, fz = 0, up = 0; for (const k in FLY) if (manualKeys[k]) { fx += FLY[k][0]; fz += FLY[k][1]; }
  if (manualKeys.q) up -= 1; if (manualKeys.e) up += 1;
  if (!fx && !fz && !up) return;
  const fwd = tmpV[6].copy(controls.target).sub(camera.position); fwd.y = 0; if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1); fwd.normalize();
  const right = tmpV[7].set(-fwd.z, 0, fwd.x), sp = (manualKeys.shift ? 12 : 5) * dt, n = Math.hypot(fx, fz) || 1;
  const mv = tmpV[8].copy(fwd).multiplyScalar(fz / n * sp).addScaledVector(right, fx / n * sp); mv.y = up * sp * 0.6;
  const nt = tmpV[9].copy(controls.target).add(mv), r = Math.hypot(nt.x, nt.z); if (r > 18) { mv.x -= nt.x / r * (r - 18); mv.z -= nt.z / r * (r - 18); }
  if (controls.target.y + mv.y < 0.05) mv.y = 0.05 - controls.target.y; if (controls.target.y + mv.y > 8) mv.y = 8 - controls.target.y;
  controls.target.add(mv); camera.position.add(mv); if (camera.position.y < H(camera.position.x, camera.position.z) + 0.2) camera.position.y = H(camera.position.x, camera.position.z) + 0.2;
}
$('eyeWhoDog').onclick = () => setEyeWho('dog'); $('eyeWhoHis').onclick = () => setEyeWho('his');
$('tempo').oninput = e => $('tempoV').textContent = e.target.value + 'x';
$('dogColor').onchange = drawEyeDisplay;
$('netOn').onchange = e => { if (e.target.checked) loadNet(); else { boxCtx.clearRect(0, 0, EW, EH); } };
$('bReset').onclick = () => { brain.seed(); store.set('W', brain.W); renderCueButtons(); renderHeat(); toast('learning reset'); };
$('cueIn').addEventListener('keydown', e => { if (e.key === 'Enter') { handleSpeech(e.target.value); e.target.value = ''; } });
$('dogName').addEventListener('change', e => { store.set('name', e.target.value); seedPersonality(e.target.value || 'Pixel'); toast('a new name is a new dog: temperament redrawn'); });
$('dogName').value = store.get('name', 'Pixel');
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-selected', x === b)); document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.id === b.dataset.p)); });
function renderCueButtons() {
  const cues = Object.keys(brain.W).filter(c => !c.startsWith('gesture:')).slice(0, 14);
  $('cueBtns').innerHTML = cues.map(c => `<button class="btn" data-cue="${c.replace(/"/g, '')}">${c}</button>`).join('') + '<button class="btn" data-cue="__free">free</button>';
  $('cueBtns').querySelectorAll('button').forEach(b => b.onclick = () => { audio(); if (b.dataset.cue === '__free') brain.release(); else if (HUM.ready) humCue(b.dataset.cue); else { $('heard').textContent = '"' + b.dataset.cue + '"'; brain.cue(b.dataset.cue); } });
}
function renderHeat(hiCue, hiAct) {
  const cues = Object.keys(brain.W).slice(-16);
  const cell = w => { const t = clamp(w, 0, 1); const c = `rgba(254,3,134,${(0.06 + t * 0.9).toFixed(2)})`; return `background:${c};color:${t > 0.55 ? '#fff' : '#1a1a1a'}`; };
  const L = ON('L.learn');
  $('heat').innerHTML = '<tr><th></th>' + ACTIONS.map(a => `<th>${a.slice(0, 4)}</th>`).join('') + (L ? '<th>attn</th>' : '') + '</tr>' + cues.map(c => `<tr><th class="r">${c.replace('gesture:', 'g:')}</th>` + ACTIONS.map(a => { const v = brain.V(c, a); return `<td style="${cell(v)}${c === hiCue && a === hiAct ? ';outline:2px solid #1a1a1a' : ''}">${Math.round(clamp(v, 0, 1) * 99)}</td>`; }).join('') + (L ? `<td style="${cell(brain.al[c] ?? 0.6)}">${Math.round((brain.al[c] ?? 0.6) * 99)}</td>` : '') + '</tr>').join('');
}


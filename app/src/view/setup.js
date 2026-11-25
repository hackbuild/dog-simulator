// ---------- setup panel: the first screen of a first visit, and the setup button after ----------
// One card over the live yard: the dog's name, three ways to start, and every optional row of the
// capability registry (caps.js, CAPS and CAP_META) with its size, licence and what stops it here.
// Start runs the same run() each row runs from the rack and the drawer, then shows each download in
// its row and closes when they finish. View only: nothing here runs inside a sim step.
// #stubloads in the hash stands each run in with a scripted progress (shots and the setup smoke:
// no request, no permission prompt).
const SETUP = { started: null, timer: 0, ret: null, fake: {}, ticks: new Set(), stub: new URLSearchParams(location.hash.slice(1)).has('stubloads') };
const SETUP_GROUPS = ['see', 'move', 'think', 'voice', 'your input'];
const SETUP_MODES = { play: [], eyes: ['gait', 'yolo'], think: ['gait', 'yolo', 'cortex', 'voice'] };
const setupCaps = () => CAPS.filter(c => CAP_META[c.id]);
const setupCortex = () => 'cortex-' + $('setupCortex').value;
const mb = b => b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : b >= 1e8 ? Math.round(b / 1e6) + ' MB' : (Math.round(b / 1e5) / 10) + ' MB';
const setupSize = c => { const m = CAP_META[c.id]; return m.bytes === undefined ? '' : m.bytes === null ? 'size unknown' : (m.about ? 'about ' : '') + mb(m.bytes); };
function setupState(c) { const f = SETUP.fake[c.id]; return f ? f.state : c.state(); }
function setupProg(c) {
  const f = SETUP.fake[c.id]; if (f) return f.state === 'loading' ? f.pct : null;
  const p = c.progress ? c.progress() : null; if (!p) return null;
  return p.pct != null ? p.pct : p.total ? Math.round(p.loaded / p.total * 100) : null;
}
// the ids a mode turns on; the cortex follows the select. canRun drops what cannot run here.
const setupCan = id => { const c = CAPS.find(x => x.id === id); return !!c && setupState(c) !== 'unavailable'; };
const modeIds = (m, canRun) => SETUP_MODES[m].map(id => id === 'cortex' ? setupCortex() : id).filter(id => !canRun || setupCan(id));
function modeBytes(m) {
  let b = 0, unknown = false;
  for (const id of modeIds(m)) { const v = CAP_META[id].bytes; if (v == null) unknown = v === null || unknown; else b += v; }
  return { b, unknown };
}
function modeWords(m) {
  const { b, unknown } = modeBytes(m), missing = modeIds(m).filter(id => !setupCan(id));
  const words = !b && !unknown ? 'nothing to download' : 'about ' + mb(b) + (unknown ? ' plus his voice' : '');
  return missing.length ? words + '. here: no ' + missing.map(id => id.startsWith('cortex-') ? 'cortex' : id === 'yolo' ? 'detector' : id).join(', no ') + ', see below' : words;
}
function setupRenderModes() {
  for (const b of document.querySelectorAll('#setupModes [data-mode]')) {
    const m = b.dataset.mode, ids = modeIds(m, true).filter(id => setupState(CAPS.find(x => x.id === id)) !== 'on'), on = ids.length === SETUP.ticks.size && ids.every(id => SETUP.ticks.has(id));
    b.setAttribute('aria-checked', String(on)); b.querySelector('em').textContent = modeWords(m);
  }
  $('setupCortexRow').hidden = !SETUP.ticks.has('cortex-lfm') && !SETUP.ticks.has('cortex-gemma');
}
function setupTotal() {
  let b = 0, about = false, unknown = false;
  for (const id of SETUP.ticks) { const m = CAP_META[id]; if (m.bytes === null) unknown = true; else if (m.bytes) { b += m.bytes; about = about || !!m.about; } }
  return !b && !unknown ? 'nothing to download' : (b ? (about ? 'about ' : '') + mb(b) : '') + (unknown ? (b ? ' plus his voice' : 'his voice, size unknown') : '');
}
function setupRow(c) {
  const st = setupState(c), m = CAP_META[c.id], L = c.licence, off = st === 'unavailable', fixed = !!c.fixed;
  const started = SETUP.started && SETUP.started.ids.includes(c.id), pct = setupProg(c);
  const on = st === 'on' || st === 'loading', checked = SETUP.ticks.has(c.id) || on;
  const mark = L && L[3] ? `<span class="srow-mark">${/NC/.test(L[1]) ? 'non commercial' : 'copyleft'}</span>` : '';
  const note = off ? c.why() : started ? (st === 'loading' ? (pct == null ? 'downloading' : pct + ' percent') : st === 'on' ? 'on' : st === 'failed' ? (c.why() || 'failed') : 'waiting')
    : st === 'on' ? 'on' : st === 'loading' ? 'loading' : m.perm ? 'asks for ' + m.perm + ' on start' : typeof c.what === 'function' ? c.what() : c.what;
  const bar = started || st === 'loading' ? `<div class="bar2${st === 'on' ? ' ok' : st === 'failed' ? ' err' : ''}" aria-hidden="true"><i style="width:${st === 'on' ? 100 : pct || 0}%"></i></div>` : '';
  const needs = c.needs().map(([t]) => t).join(', ');
  const fold = L || needs ? `<details class="srow-more"><summary>${L ? 'licence' : 'details'}</summary><p>${L ? esc(L[0]) + ' ' + esc(L[1]) + ', ' + esc(L[2]) + ' ' : ''}${needs ? 'needs: ' + esc(needs) + '.' : ''}</p></details>` : '';
  return `<li class="srow is-${st}${off ? ' is-off' : ''}"><label class="srow-main">${fixed ? '<span class="srow-fixed" aria-hidden="true"></span>' : `<input type="checkbox" data-cap="${c.id}"${checked ? ' checked' : ''}${off || on || SETUP.started ? ' disabled' : ''}>`}<span class="srow-name">${esc(c.name)}</span><span class="srow-size">${esc(setupSize(c))}</span></label>${mark}${bar}<p class="srow-note">${esc(note || '')}</p>${fold}</li>`;
}
function setupRender() {
  const open = new Set([...document.querySelectorAll('#setupList details[open]')].map(d => d.closest('li').querySelector('[data-cap]')?.dataset.cap));
  $('setupList').innerHTML = SETUP_GROUPS.map(g => {
    const rows = setupCaps().filter(c => CAP_META[c.id].group === g);
    return rows.length ? `<li class="sgroup"><h3>${g}</h3><ul>${rows.map(setupRow).join('')}</ul></li>` : '';
  }).join('');
  for (const id of open) { const i = $('setupList').querySelector(`[data-cap="${id}"]`); if (i) { const d = i.closest('li').querySelector('details'); if (d) d.open = true; } }
  setupRenderModes();
  $('setupStart').textContent = SETUP.started ? 'start now, load in the background' : 'start, ' + setupTotal();
  $('setupLook').hidden = !!SETUP.started;
}
function setupPick(mode) {
  if (SETUP.started) return;
  SETUP.ticks = new Set(modeIds(mode, true).filter(id => setupState(CAPS.find(x => x.id === id)) !== 'on'));
  setupRender();
}
$('setupModes').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b) setupPick(b.dataset.mode); });
$('setupList').addEventListener('change', e => {
  const i = e.target.closest('[data-cap]'); if (!i) return; const id = i.dataset.cap;
  if (i.checked) { SETUP.ticks.add(id); if (id.startsWith('cortex-')) { SETUP.ticks.delete(id === 'cortex-lfm' ? 'cortex-gemma' : 'cortex-lfm'); $('setupCortex').value = id.slice(7); } }
  else SETUP.ticks.delete(id);
  setupRender();
});
$('setupCortex').onchange = () => {
  const want = setupCortex(), other = want === 'cortex-lfm' ? 'cortex-gemma' : 'cortex-lfm';
  if (SETUP.ticks.has(other)) { SETUP.ticks.delete(other); SETUP.ticks.add(want); }
  setupRender();
};
$('setupNameIn').addEventListener('input', e => { $('setupName').textContent = (e.target.value.trim() || 'the dog').toLowerCase(); });
// the scripted stand in for a download: a few seconds of progress, then on
function setupFake(id) {
  const f = SETUP.fake[id] = { state: 'loading', pct: 0 }, step = 9 + (id.length % 5) * 3;
  const t = setInterval(() => { f.pct = Math.min(100, f.pct + step); if (f.pct >= 100) { f.state = 'on'; clearInterval(t); } }, 200);
}
function setupDone(c) {
  const st = setupState(c);
  if (st === 'loading') return false;
  return st !== 'off' || performance.now() - SETUP.started.t > 1500;
}
function setupStart() {
  if (SETUP.started) { setupClose(); return; }
  audio(); setupName();
  const all = setupCaps(), ids = [...SETUP.ticks].filter(id => { const c = all.find(x => x.id === id); const st = c && setupState(c); return st && st !== 'on' && st !== 'loading' && st !== 'unavailable'; });
  if (!ids.length) { setupClose(); return; }
  SETUP.started = { t: performance.now(), ids };
  const cortex = ids.some(id => id.startsWith('cortex-'));
  for (const id of ids) {
    const c = all.find(x => x.id === id);
    if (SETUP.stub) { setupFake(id); continue; }
    if (c.dependsOn === 'cortex' && cortex) { capsWant[id] = true; continue; }
    c.run(c.state());
  }
  logEvent('note', 'setup started: ' + ids.join(', '));
  setupRender(); capsRefresh();
  clearInterval(SETUP.timer);
  SETUP.timer = setInterval(() => {
    if ($('setup').hidden) { clearInterval(SETUP.timer); return; }
    setupRender();
    if (SETUP.started.ids.every(id => setupDone(all.find(x => x.id === id)))) { clearInterval(SETUP.timer); setTimeout(setupClose, 700); }
  }, 250);
}
// the name typed here is the dog's name: a new name draws a new temperament, as in train
function setupName() {
  const v = $('setupNameIn').value.trim();
  if (v && v !== $('dogName').value) { $('dogName').value = v; $('dogName').dispatchEvent(new Event('change')); }
}
function setupOpen() {
  SETUP.ret = document.activeElement; if ($('setup').hidden) SETUP.started = null;
  SETUP.ticks = new Set();
  $('setupNameIn').value = $('dogName').value; $('setupName').textContent = ($('dogName').value.trim() || 'the dog').toLowerCase();
  $('setupCortex').value = vlm.kind === 'gemma' ? 'gemma' : 'lfm';
  $('setup').hidden = false; setupRender(); $('setupStart').focus();
}
function setupClose() {
  if ($('setup').hidden) return;
  if (!SETUP.started) setupName();
  $('setup').hidden = true; store.set('setup', 1); clearInterval(SETUP.timer);
  if (SETUP.ret && SETUP.ret.focus && SETUP.ret !== document.body) SETUP.ret.focus(); else stage.focus();
}
$('setupStart').onclick = setupStart;
$('setupLook').onclick = () => { SETUP.ticks.clear(); setupClose(); };
$('setupClose').onclick = () => setupClose();
$('bSetup').onclick = () => setupOpen();
$('setup').addEventListener('click', e => { if (e.target === $('setup')) setupClose(); });
$('setup').addEventListener('keydown', e => {
  if (e.key === 'Escape') { e.preventDefault(); setupClose(); return; }
  if (e.key !== 'Tab') return;
  const f = [...$('setup').querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),summary,[tabindex="0"]')].filter(x => x.offsetParent !== null);
  if (!f.length) return;
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); } else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
});

// ---------- page shell: tabs, the welcome card, one time notes, play tiles, seeds ----------
// View only. Tabs follow the aria tabs pattern: arrow keys, Home and End move between them.
const TABS = [...document.querySelectorAll('#tabs [role=tab]')];
function showTab(id, focus) {
  for (const t of TABS) { const on = t.dataset.p === id; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); }
  document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.id === id));
  $('app').classList.toggle('is-minds', id === 'pMinds');
  $('panes').scrollTop = 0;
  if (id === 'pMinds') { onceDone('minds'); mindsT = 0; if (dog.ready) { drawInstruments(); } }
  store.set('tab', id);
}
TABS.forEach((t, i) => {
  t.onclick = () => showTab(t.dataset.p);
  t.addEventListener('keydown', e => {
    const k = e.key, n = TABS.length; let j = null;
    if (k === 'ArrowRight' || k === 'ArrowDown') j = (i + 1) % n; else if (k === 'ArrowLeft' || k === 'ArrowUp') j = (i - 1 + n) % n; else if (k === 'Home') j = 0; else if (k === 'End') j = n - 1;
    if (j != null) { e.preventDefault(); showTab(TABS[j].dataset.p, true); }
  });
});
document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) showTab(g.dataset.go, true); });
// play tiles press the stage verbs, so both share one handler
document.querySelectorAll('#playTiles [data-verb]').forEach(b => b.onclick = () => $(b.dataset.verb).click());
$('bMore').onclick = () => showTab('pPlay', true);
$('tempo').addEventListener('input', () => { $('tempoV').textContent = $('tempo').value + 'x'; });
$('presetChips').innerHTML = Object.entries(PRESETS).map(([k, p]) => `<button class="hb-chip" type="button" data-preset2="${k}">${esc(p.label.toLowerCase())}</button>`).join('') + '<button class="hb-chip" type="button" id="bSeed2">from the name</button>';
$('presetChips').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'bSeed2') { seedPersonality(dogName()); $('presetNow').textContent = 'from the name'; toast('temperament drawn from the name ' + dogName()); }
  else { applyPreset(b.dataset.preset2); $('presetNow').textContent = PRESETS[b.dataset.preset2].label.toLowerCase(); toast('temperament: ' + PRESETS[b.dataset.preset2].label); }
});
function nameUI() { const n = dogName(); $('dogNameHd').textContent = n; $('welName').textContent = n; }
// ---------- one time notes on the stage ----------
const ONCE = { throw: 'see why it ran: minds.', cue: '' };
function onceDone(k) { if (k === 'minds') { $('onceNote').hidden = true; store.set('once.minds', 1); } }
function onceShow(k, text) {
  if (TEST || store.get('once.' + k, 0) || store.get('once.minds', 0)) return;
  store.set('once.' + k, 1); $('onceText').textContent = text; $('onceNote').hidden = false;
  clearTimeout(onceShow.t); onceShow.t = setTimeout(() => { $('onceNote').hidden = true; }, 9000);
}
$('onceGo').onclick = () => { $('onceNote').hidden = true; showTab('pMinds', true); };
$('bThrow').addEventListener('click', () => onceShow('throw', 'see why it ran: minds.'));
document.addEventListener('click', e => { const b = e.target.closest('#cueBtns [data-cue]'); if (b && b.dataset.cue !== '__free') onceShow('cue', dogName() + ' is learning "' + b.dataset.cue + '". see what it knows: minds.'); });
$('cueIn').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.value.trim()) onceShow('cue', dogName() + ' is learning "' + e.target.value.trim().toLowerCase() + '". see what it knows: minds.'); }, true);
// ---------- welcome card: first visit only, kept as dismissed in this browser ----------
let welReturn = null;
function welcomeOpen() {
  welReturn = document.activeElement; nameUI(); $('welNameIn').value = $('dogName').value;
  const touch = matchMedia('(pointer:coarse)').matches;
  $('welFoot').textContent = touch ? 'tap the dog to pet it. tap the ground to point. two fingers move the camera.' : 'click the dog to pet it. click the ground to point, shift and click to throw there. drag to orbit; with the yard focused, w a s d move the camera.';
  $('welcome').hidden = false; $('welcome').querySelector('.hb-welcome').focus();
}
function welcomeClose(start) {
  const v = $('welNameIn').value.trim();
  if (v && v !== $('dogName').value) { $('dogName').value = v; $('dogName').dispatchEvent(new Event('change')); }
  $('welcome').hidden = true; store.set('welcomed', 1);
  if (start === 'minds') showTab('pMinds', true);
  else if (start === 'caps') capsOpen();
  else if (start === 'play') { showTab('pPlay'); $('bThrow').focus(); }
  else if (welReturn && welReturn.focus) welReturn.focus();
}
$('welClose').onclick = () => welcomeClose();
$('welcome').querySelectorAll('[data-start]').forEach(b => b.onclick = () => welcomeClose(b.dataset.start));
$('welcome').addEventListener('keydown', e => {
  if (e.key === 'Escape') { welcomeClose(); return; }
  if (e.key !== 'Tab') return;
  const f = [...$('welcome').querySelectorAll('button,input')]; if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); } else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
});
$('welNameIn').addEventListener('input', e => { $('welName').textContent = (e.target.value.trim() || 'the dog').toLowerCase(); });
$('bWelcome').onclick = welcomeOpen;
// ---------- seeds ----------
{
  const h = new URLSearchParams(location.hash.slice(1));
  if (SEEDED) { $('seedIn').value = SEEDED.seed; $('speedIn').value = String(SEEDED.speed); $('seedNow').textContent = 'this page runs seed ' + SEEDED.seed + ' at ' + SEEDED.speed + 'x.'; }
  else $('seedNow').textContent = 'this page runs a random seed.';
  $('seedNn').checked = (h.get('on') || '').includes('L.neural');
  $('bSeedGo').onclick = () => { const s = Math.max(1, Math.round(+$('seedIn').value || 1)); location.hash = 'seed=' + s + '&speed=' + $('speedIn').value + ($('seedNn').checked ? '&on=L.neural' : ''); location.reload(); };
}
// ---------- start: after the yard is up, outside lockstep ----------
function uiStart() {
  window.__capsLive = true; capsRefresh(); nameUI(); gaitUI(); knownUI();
  $('touchHint').textContent = matchMedia('(pointer:coarse)').matches ? 'tap the dog to pet it. tap the ground to point there. two fingers move the camera.' : 'click the dog to pet it. click the ground to point, shift and click to throw there. drag to orbit.';
  const tab = store.get('tab', 'pPlay'); if ($(tab) && tab !== 'pPlay') showTab(tab);
  if (!SEEDED && !store.get('welcomed', 0)) welcomeOpen();
  setTimeout(() => { $('hint').hidden = true; }, 12000);
}

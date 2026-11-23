// ---------- speech ----------
const ACTIONS = ['sit', 'down', 'come', 'stay', 'spin', 'speak', 'paw', 'fetch', 'bed'];
const SYN = { 'lie': 'down', 'lay': 'down', 'here': 'come', 'come here': 'come', 'roll': 'spin', 'turn': 'spin', 'bark': 'speak', 'shake': 'paw', 'go to bed': 'bed', 'bedtime': 'bed', 'get it': 'fetch', 'ball': 'fetch' };
function handleSpeech(text) {
  const s = text.toLowerCase().replace(/[^a-z ]/g, ' ').trim(); if (!s) return;
  $('heard').textContent = '"' + s + '"';
  const name = $('dogName').value.trim().toLowerCase();
  if (name && s.includes(name)) brain.named();
  if (/\b(good|yes|nice|well done|good boy|good girl)\b/.test(s)) { brain.reward(0.7, 'praise'); return; }
  if (/\b(no|bad|stop it|ah ah)\b/.test(s)) { brain.reward(-0.7, 'no'); return; }
  if (/\b(free|okay|ok|release|break)\b/.test(s)) { brain.release(); return; }
  if (/\btreat\b/.test(s)) { brain.stimulus('food', 0.8); brain.say('TREAT?', 2); return; }
  if (/\bwalk\b/.test(s)) { brain.stimulus('play', 1); brain.say('W A L K', 2); return; }
  for (const k of Object.keys(SYN)) if (s.includes(k)) { brain.cue(SYN[k]); return; }
  const words = s.split(/\s+/).filter(w => w && w !== name);
  const known = words.find(w => ACTIONS.includes(w) || brain.W[w]);
  brain.cue(known || words[words.length - 1]);
}
let rec = null, micOn = false;
$('bMic').addEventListener('click', () => {
  audio();
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast('no speech here; use the cue buttons or type a cue'); return; }
  if (micOn && rec) { rec.stop(); return; }
  try {
    rec = new SR(); rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
    rec.onresult = e => { for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) handleSpeech(r[0].transcript); else $('heard').textContent = '... ' + r[0].transcript; } };
    rec.onend = () => { micOn = false; $('bMic').classList.remove('on'); $('micLab').textContent = 'talk'; };
    rec.onerror = e => { toast('speech: ' + e.error); };
    rec.start(); micOn = true; $('bMic').classList.add('on'); $('micLab').textContent = 'listening';
  } catch (e) { toast('speech blocked here; type a cue instead'); }
});


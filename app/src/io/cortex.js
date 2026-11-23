// ---------- cortex: local vision language model on WebGPU, in a worker ----------
const VLM = { gemma: { id: 'onnx-community/gemma-4-E2B-it-ONNX', name: 'gemma 4 e2b' }, lfm: { id: 'onnx-community/LFM2-VL-450M-ONNX', name: 'lfm2-vl 450m' } };
const vlm = { worker: null, state: 'off', kind: store.get('vlm', 'gemma'), nid: 0, wait: new Map(), ms: 0 };
$('vlmPick').value = vlm.kind;
$('vlmPick').onchange = e => { vlm.kind = e.target.value; store.set('vlm', vlm.kind); if (vlm.worker) { vlm.worker.terminate(); vlm.worker = null; vlm.state = 'off'; setVlm('off'); } };
function setVlm(st) { $('cortexSt').textContent = st; const ready = vlm.state === 'ready'; $('bThink').disabled = !ready; $('askIn').disabled = !ready; $('bVlmLoad').disabled = vlm.state === 'loading' || ready; }
setVlm(navigator.gpu ? 'off' : 'needs WebGPU');
function vlmLoad() {
  if (!navigator.gpu) { toast('the cortex model needs a WebGPU browser'); return; }
  if (vlm.worker) return;
  const BODY = document.getElementById('vlmWorker').textContent;
  const onmsg = e => {
    const m = e.data;
    if (m.t === 'progress') { vlm.alive = true; const p = m.total ? m.loaded / m.total : 0; $('vlmBar').style.width = (p * 100).toFixed(1) + '%'; $('vlmPct').textContent = Math.round(p * 100) + '%'; $('cortexSt').textContent = (m.loaded / 1e6).toFixed(0) + ' / ' + (m.total / 1e6).toFixed(0) + ' MB' + (vlm.inPage ? ' (in page)' : ''); }
    else if (m.t === 'ready') { vlm.state = 'ready'; $('vlmBar').style.width = '100%'; $('vlmPct').textContent = '100%'; setVlm('ready ' + VLM[vlm.kind].name); toast('cortex online: ' + VLM[vlm.kind].name); }
    else if (m.t === 'answer' || m.t === 'error') { if (m.t === 'error' && m.id == null) { vlm.state = 'off'; setVlm('failed: ' + m.msg.slice(0, 60)); if (vlm.worker) vlm.worker.terminate(); vlm.worker = null; return; } const w = vlm.wait.get(m.id); vlm.wait.delete(m.id); if (w) (m.t === 'answer' ? w.res(m) : w.rej(new Error(m.msg))); }
  };
  const inPage = () => { // fallback when module workers from blob URLs are refused
    vlm.inPage = true;
    const h = new Function('post', BODY)(m => onmsg({ data: m }));
    vlm.worker = { postMessage: m => { setTimeout(() => h(m), 0); }, terminate() {} };
    vlm.worker.postMessage({ t: 'load', id: VLM[vlm.kind].id, kind: vlm.kind });
  };
  vlm.state = 'loading'; vlm.alive = false; setVlm('loading ' + VLM[vlm.kind].name);
  try {
    const src = 'const h = (new Function("post", ' + JSON.stringify(BODY) + '))(m => postMessage(m)); onmessage = e => h(e.data);';
    const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })), { type: 'module' });
    w.onmessage = onmsg;
    w.onerror = e => { if (!vlm.alive && vlm.state === 'loading') { console.warn('worker failed, running in page', e); w.terminate(); inPage(); } };
    vlm.worker = w;
    w.postMessage({ t: 'load', id: VLM[vlm.kind].id, kind: vlm.kind });
  } catch (e) { inPage(); }
}
$('bVlmLoad').onclick = vlmLoad;
let vlmChain = Promise.resolve();
function vlmAsk(canvas, prompt, max = 80) {
  const job = vlmChain.then(() => vlmAsk1(canvas, prompt, max)); vlmChain = job.catch(() => {}); return job;
}
function vlmAsk1(canvas, prompt, max) {
  return new Promise((res, rej) => {
    if (vlm.state !== 'ready') return rej(new Error('not ready'));
    const id = ++vlm.nid; vlm.wait.set(id, { res, rej });
    const img = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    vlm.worker.postMessage({ t: 'ask', id, prompt, max, rgba: img.data.buffer, w: img.width, h: img.height }, [img.data.buffer]);
  });
}
const pct = v => Math.round(v * 100) + '%';
let thinking = false;
// automatic cortex calls go through @hackbuild/drives InferenceScheduler: one at a time, at least
// Br.cortexMin s apart while something important happened, otherwise 60 s apart
const cortexOpts = { minInterval: 60 }, cortexSched = new HDRIVE.InferenceScheduler(cortexOpts);
async function think() {
  if (vlm.state !== 'ready' || thinking) return; thinking = true; $('cortexSt').textContent = 'thinking';
  const d = brain.d, vis = Object.values(percepts).filter(p => p.vis).map(p => p.id.replace(/\d+$/, ''));
  // memory stream retrieval: recency (0.995 per game hour) plus importance plus relevance to what is in view (Park et al. 2023)
  const hNow = CLOCK.day * 24 + CLOCK.h, mems = brain.mem.map(m => ({ m, s: Math.pow(0.995, hNow - m.h) + m.imp / 6 + (vis.some(v => m.txt.includes(v)) ? 0.5 : 0) })).sort((a, b) => b.s - a.s).slice(0, 4).map(x => x.m.txt);
  const prompt = `You are the mind of a dog in a backyard. The picture is what your eyes see right now. How you feel: hunger ${pct(d.hunger)}, tiredness ${pct(d.fatigue)}, wanting to play ${pct(d.play)}, wanting company ${pct(d.social)}, curiosity ${pct(d.curiosity)}, urge to chase ${pct(d.prey)}. ${ball.held ? 'You have the ball in your mouth.' : ''} Your nose and ears also notice: ${vis.join(', ') || 'nothing much'}. It is ${Math.floor(CLOCK.h)} o'clock. Things you remember: ${mems.join('; ') || 'nothing yet'}.
Reply in exactly three lines and nothing else:
SAW: what you see, under 10 words
THOUGHT: your inner thought as a dog, first person, under 12 words
GOAL: one word from explore, sniff, eat, fetch, chase, greet, beg, playbow, zoomies, rest, sleep, idle`;
  try {
    const r = await vlmAsk(rawEye, prompt, 72); vlm.ms = r.ms;
    const txt = r.text.trim();
    const saw = (txt.match(/SAW:\s*(.+)/i) || [])[1] || '';
    const thought = ((txt.match(/THOUGHT:\s*(.+)/i) || [])[1] || txt.split('\n')[0] || '...').replace(/^["']|["']$/g, '');
    const gl = ((txt.match(/GOAL:\s*(.+)/i) || [])[1] || txt).toLowerCase();
    const goal = BEH.find(b => new RegExp('\\b' + b + '\\b').test(gl)) || 'idle';
    brain.cortexGoal = { b: goal, until: now + 20 };
    brain.say(thought.slice(0, 80), 5);
    $('cortexOut').textContent = (saw ? 'saw ' + saw.trim() + '. ' : '') + '"' + thought.trim() + '" goal: ' + goal;
    $('cortexSt').textContent = 'ready, ' + (r.ms / 1000).toFixed(1) + ' s, ' + r.tokens + ' tok';
  } catch (e) { $('cortexSt').textContent = 'error'; console.warn('cortex', e); }
  thinking = false;
}
$('bThink').onclick = think;
$('askIn').addEventListener('keydown', async e => {
  if (e.key !== 'Enter' || !e.target.value.trim() || thinking) return;
  const q = e.target.value.trim().slice(0, 200); e.target.value = ''; thinking = true; $('cortexSt').textContent = 'thinking';
  brain.named();
  try {
    const r = await vlmAsk(rawEye, `You are a dog. The picture is what you see right now with your own eyes. Your human asks: "${q}". Answer in one or two short sentences, in a dog's voice.`, 64);
    const a = r.text.trim().split('\n').filter(Boolean).slice(0, 2).join(' ');
    $('cortexOut').textContent = 'you: ' + q + '\ndog: ' + a; brain.say(a.slice(0, 90), 6);
    $('cortexSt').textContent = 'ready, ' + (r.ms / 1000).toFixed(1) + ' s';
  } catch (err) { $('cortexSt').textContent = 'error'; }
  thinking = false;
});


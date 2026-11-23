// ---------- instruments ----------
function rows(el, items) {
  if (!el._built) { el.innerHTML = items.map(([k]) => `<div class="row" data-k="${k}"><span class="lab">${k}</span><div class="bar"><i></i></div><span class="v">0</span></div>`).join(''); el._built = true; }
  items.forEach(([k, v, cur, pink], i) => { const r = el.children[i]; r.classList.toggle('cur', !!cur); r.querySelector('i').style.width = (clamp(v, 0, 1) * 100).toFixed(1) + '%'; r.querySelector('.bar').classList.toggle('p', !!pink || !!cur); r.querySelector('.v').textContent = v.toFixed(2); });
}
const cpgCtx = $('cpg').getContext('2d'), footCtx = $('foot').getContext('2d'), affCtx = $('affect').getContext('2d');
function drawInstruments() {
  // CPG rings
  const c = cpgCtx, W = 340, Hh = 150; c.clearRect(0, 0, W, Hh);
  const cx = 75, cy = 75, R = 56; c.strokeStyle = '#1a1a1a'; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
  c.fillStyle = '#efe9db'; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R - 6, -Math.PI / 2, -Math.PI / 2 + dog.duty * Math.PI * 2); c.closePath(); c.fill();
  c.font = '15px VT323, monospace';
  dog.legs.forEach((l, i) => { const a = -Math.PI / 2 + l.ph * Math.PI * 2; c.fillStyle = l.stance ? '#1a1a1a' : '#FE0386'; c.beginPath(); c.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 7, 0, 7); c.fill(); c.fillStyle = '#1a1a1a'; c.fillText(l.id, cx + Math.cos(a) * (R + 13) - 7, cy + Math.sin(a) * (R + 13) + 4); });
  // gait mix bars
  GAITS.forEach((g, i) => { const y = 20 + i * 27; c.fillStyle = '#1a1a1a'; c.fillText(g.name, 166, y); c.strokeRect(226, y - 11, 104, 12); c.fillStyle = i >= 3 ? '#FE0386' : '#1a1a1a'; c.fillRect(226, y - 11, 104 * (dog.gaitW[i] || 0), 12); });
  // footfalls
  const f = footCtx; f.clearRect(0, 0, 340, 96); const n = footLog.length, bw = 340 / 120;
  for (let li = 0; li < 4; li++) { for (let k = 0; k < n; k++) if (footLog[k][li]) { f.fillStyle = li < 2 ? '#1a1a1a' : '#444'; f.fillRect(k * bw, 6 + li * 22, bw + 0.5, 16); } f.fillStyle = '#9a9184'; f.fillRect(0, 22 + li * 22, 340, 1); }
  // affect
  const a = affCtx; a.clearRect(0, 0, 340, 120); a.strokeStyle = '#e8e0d0'; a.beginPath(); a.moveTo(170, 0); a.lineTo(170, 120); a.moveTo(0, 60); a.lineTo(340, 60); a.stroke();
  a.fillStyle = '#9a9184'; a.font = '15px VT323, monospace'; a.fillText('sad', 6, 114); a.fillText('happy', 296, 114); a.fillText('calm', 150, 114); a.fillText('alert', 150, 14);
  const px = 170 + brain.v * 160, py = 110 - brain.a * 100; a.fillStyle = '#FE0386'; a.beginPath(); a.arc(px, py, 8, 0, 7); a.fill(); a.strokeStyle = '#1a1a1a'; a.stroke();
  // text bits
  $('gaitName').textContent = NG.active ? 'neural ' + NG.guidance.toLowerCase() : dog.standing ? 'stand' : GAITS[dog.gaitW.indexOf(Math.max(...dog.gaitW))].name;
  $('kFr').textContent = (dog.v * dog.v / (9.81 * (dog.legLen || 0.45))).toFixed(2); $('kSrc').textContent = NG.active ? 'neural mocap' : 'pattern generator';
  $('kGuide').textContent = NG.active ? NG.guidance : '-'; $('kNnMs').textContent = NG.ms ? NG.ms.toFixed(0) + ' ms, ' + (1000 / Math.max(NG.ms, 100)).toFixed(0) + ' Hz' : '-';
  $('kCont').textContent = NG.active ? NG.cont.map(x => x > 0.55 ? 'X' : '.').join(' ') : '-';
  // sleep, clock, bond
  const hh = Math.floor(CLOCK.h), mm = Math.floor((CLOCK.h - hh) * 60), ck = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  $('chipClock').textContent = ON('L.day') ? ck : 'day off'; $('kClock').textContent = ck + ' day ' + (CLOCK.day + 1);
  $('kSp').textContent = (brain.Sp || 0).toFixed(2); $('kCirc').textContent = (brain.circ ?? 0).toFixed(2); $('kBond').textContent = brain.bond.toFixed(2) + (brain.mutual ? ' mutual gaze' : '');
  $('kWag').textContent = dog.org && ON('L.secondary') ? WAG[dog.org.wag.mode].n : '-'; $('slpStage').textContent = brain.cur === 'sleep' ? brain.stage : 'awake';
  { const hc = $('hyp').getContext('2d'), W = 340, Hh = 64, st = { onset: 1, wake: 0.5, nrem: 3, rem: 2, goto: 0, awake: 0 }; hc.clearRect(0, 0, W, Hh); hc.fillStyle = '#9a9184'; hc.font = '13px VT323, monospace'; ['wake', 'rem', 'nrem'].forEach((n, i) => hc.fillText(n, 2, 14 + i * 20)); hc.strokeStyle = '#1a1a1a'; hc.lineWidth = 2; hc.beginPath(); brain.hyp.forEach((x, i) => { const v = st[x] || 0, y = x === 'rem' ? 30 : x === 'nrem' ? 50 : 10; const px = 38 + i * (W - 40) / 160; i ? hc.lineTo(px, y) : hc.moveTo(px, y); }); hc.stroke(); }
  $('utilMode').textContent = ON('L.sample') ? 'sampled' : 'argmax'; $('pendNote').textContent = brain.pending ? 'next: ' + brain.pending.b + ' in ' + Math.max(0, (brain.pending.at - now) * 1000).toFixed(0) + ' ms' : (ON('L.drives') ? 'drive reduction reward, ' : '') + (ON('L.sample') ? 'softmax choice with commitment' : 'highest score wins');
  $('kFocus').textContent = ON('L.salience') ? attention.label || '-' : 'off';
  $('kWind').textContent = ON('L.plume') ? TV('W.wind').toFixed(1) + ' m/s at ' + Math.round(((wind.a * 180 / Math.PI) % 360 + 360) % 360) + ' deg' : 'off'; $('kPuffs').textContent = puffs.length; $('kLR').textContent = sniff.cL.toFixed(3) + ' / ' + sniff.cR.toFixed(3);
  $('sniffSt').textContent = sniff.inBout > 0 ? 'sniffing ' + TV('Se.sniffHz').toFixed(1) + ' Hz' : brain.sn ? brain.sn.mode : '-';
  $('kSpeed').textContent = dog.v.toFixed(2) + ' m/s'; $('kFreq').textContent = dog.standing ? '-' : dog.freq.toFixed(2) + ' Hz'; $('kDuty').textContent = dog.duty.toFixed(2); $('kTurn').textContent = dog.w.toFixed(2) + ' rad/s';
  const P = dog.posture; const pm = Object.entries(P).sort((x, y) => y[1] - x[1])[0]; $('kPost').textContent = pm[1] > 0.3 ? pm[0] : 'stand';
  rows($('utilRows'), BEH.map(b => [b, Math.min(brain.util[b] || 0, 1), b === brain.cur]));
  rows($('driveRows'), Object.entries(brain.d).map(([k, v]) => [k, v, false, k === 'prey']).concat([['bond', brain.bond, false, true]]));
  $('behName').textContent = brain.cur + (brain.sub && brain.cur === 'fetch' ? ' / ' + brain.sub : brain.cmd && brain.cur === 'obey' ? ' / ' + brain.cmd.action : '');
  $('behT').textContent = brain.t.toFixed(1) + 's';
  $('perList').innerHTML = Object.values(percepts).filter(p => p.seen > -1e8).sort((x, y) => y.sal - x.sal).slice(0, 8).map(p => `<div><span class="${p.vis ? 'vis' : ''}">${p.id}${p.net > 0.2 ? ' +net' : ''}</span><span>${p.vis ? 'seen' : 'remembered ' + Math.round(now - p.seen) + 's'}</span><span>${(p.dist || 0).toFixed(1)}m</span></div>`).join('') || '<div><span>nothing yet</span><span></span><span></span></div>';
  if (dog.ready) { const n = headWorld(dog.noseL, tmpV[0]); const s = scentAt(n.x, n.z); $('scentBar').style.width = clamp(s * 100, 0, 100) + '%'; $('scentV').textContent = s.toFixed(2); }
  $('hearBar').style.width = clamp(hearLevel * 100, 0, 100) + '%'; $('hearV').textContent = hearLevel.toFixed(2);
}


// HACKLE neural gait: CPU inference for the AI4AnimationPy quadruped codebook matching network.
// Runs inside a worker. Pipeline (matches ai4anim-webgpu Inference.ts):
//   x = (in - mean) / std
//   p = softmax4(L3(elu(L2(elu(L1(x))))))                         estimator
//   repeat 3: p = softmax4(L3(elu(L2(elu(L1([p, x]))))))           denoiser
//   y_s = L3f(elu(L2f(elu(L1f([p, x], t_s)), t_s)), t_s)           decoder, FiLM on time, 16 steps
//   out = y * ostd + omean
// FiLM layer: W((sw t + sb) * z + (hw t + hb)) + b. For layer 1 the input z is shared by all 16 steps,
// so it splits into W(sb z + hb) + t W(sw z + hw): 2 matvecs instead of 16.
function nnInferHost(post) {
  let M = null, Wt = {}, B = {}, F = {}, st = {}, T = null, buf = {};
  const f16 = new Float32Array(65536);
  for (let h = 0; h < 65536; h++) {
    const s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 0x1f, m = h & 0x3ff;
    f16[h] = e === 0 ? s * m * Math.pow(2, -24) : e === 31 ? (m ? NaN : s * Infinity) : s * (1 + m / 1024) * Math.pow(2, e - 15);
  }
  function get(meta, bin, key) {
    const e = meta.bin[key];
    if ((e.dtype || 'f32') === 'f32') return new Float32Array(bin, e.offset, e.count).slice();
    const h = new Uint16Array(bin, e.offset, e.count), o = new Float32Array(e.count);
    for (let i = 0; i < e.count; i++) o[i] = f16[h[i]];
    return o;
  }
  function load(meta, bin) {
    M = meta.model;
    for (const k of Object.keys(meta.bin)) {
      if (k.endsWith('.weight') && meta.bin[k].dtype === 'f16') Wt[k] = get(meta, bin, k);
      else if (k.endsWith('.bias') && !k.includes('film')) B[k] = get(meta, bin, k);
      else if (k.includes('film')) F[k] = get(meta, bin, k);
      else st[k] = get(meta, bin, k);
    }
    const tm = st['time_stats.mean'][0], ts = st['time_stats.std'][0];
    T = Float32Array.from(st['timing'], v => (v - tm) / ts);
    const H = M.latent_dim, IN = M.input_dim, S = M.sequence_length, O = M.output_dim;
    buf = { x: new Float32Array(IN), h1: new Float32Array(H), h2: new Float32Array(H), p: new Float32Array(H), cat: new Float32Array(H + IN),
      u: new Float32Array(H + IN), v: new Float32Array(H + IN), a: new Float32Array(H), c: new Float32Array(H),
      y1: new Float32Array(S * H), z: new Float32Array(S * H), y2: new Float32Array(S * H), out: new Float32Array(S * O) };
  }
  function linear(x, W, b, rows, cols, y, act) {
    for (let o = 0; o < rows; o++) {
      let a0 = b ? b[o] : 0, a1 = 0, a2 = 0, a3 = 0; const r = o * cols, n4 = cols & ~3;
      let i = 0;
      for (; i < n4; i += 4) { a0 += W[r + i] * x[i]; a1 += W[r + i + 1] * x[i + 1]; a2 += W[r + i + 2] * x[i + 2]; a3 += W[r + i + 3] * x[i + 3]; }
      for (; i < cols; i++) a0 += W[r + i] * x[i];
      const acc = a0 + a1 + a2 + a3;
      y[o] = act ? (acc > 0 ? acc : Math.exp(acc) - 1) : acc;
    }
  }
  // y[s*rows+o] = b[o] + W[o] . z[s*cols ..]  for all s, row loaded once per o
  function linearSeq(z, W, b, rows, cols, S, y, act, yStride) {
    for (let o = 0; o < rows; o++) {
      const r = o * cols, bo = b[o];
      for (let s = 0; s < S; s++) {
        let a0 = bo, a1 = 0, a2 = 0, a3 = 0; const zb = s * cols;
        for (let i = 0; i < cols; i += 4) { a0 += W[r + i] * z[zb + i]; a1 += W[r + i + 1] * z[zb + i + 1]; a2 += W[r + i + 2] * z[zb + i + 2]; a3 += W[r + i + 3] * z[zb + i + 3]; }
        const acc = a0 + a1 + a2 + a3;
        y[s * yStride + o] = act ? (acc > 0 ? acc : Math.exp(acc) - 1) : acc;
      }
    }
  }
  function softmax4(p, n, g) {
    for (let k = 0; k < n; k += g) {
      let m = p[k]; for (let i = 1; i < g; i++) if (p[k + i] > m) m = p[k + i];
      let s = 0; for (let i = 0; i < g; i++) { const e = Math.exp(p[k + i] - m); p[k + i] = e; s += e; }
      for (let i = 0; i < g; i++) p[k + i] /= s;
    }
  }
  function run(input) {
    const H = M.latent_dim, IN = M.input_dim, S = M.sequence_length, O = M.output_dim, G = M.codebook_dims, C = H + IN;
    const { x, h1, h2, p, cat, u, v, a, c, y1, z, y2, out } = buf;
    const mu = st['input_stats.mean'], sd = st['input_stats.std'];
    for (let i = 0; i < IN; i++) x[i] = (input[i] - mu[i]) / sd[i];
    linear(x, Wt['estimator.l1.weight'], B['estimator.l1.bias'], H, IN, h1, true);
    linear(h1, Wt['estimator.l2.weight'], B['estimator.l2.bias'], H, H, h2, true);
    linear(h2, Wt['estimator.l3.weight'], B['estimator.l3.bias'], H, H, p, false); softmax4(p, H, G);
    for (let it = 0; it < M.denoiser_iterations; it++) {
      cat.set(p, 0); cat.set(x, H);
      linear(cat, Wt['denoiser.l1.weight'], B['denoiser.l1.bias'], H, C, h1, true);
      linear(h1, Wt['denoiser.l2.weight'], B['denoiser.l2.bias'], H, H, h2, true);
      linear(h2, Wt['denoiser.l3.weight'], B['denoiser.l3.bias'], H, H, p, false); softmax4(p, H, G);
    }
    cat.set(p, 0); cat.set(x, H);
    // decoder layer 1, split by linearity in t
    { const sw = F['decoder.l1.film.scale.weight'], sb = F['decoder.l1.film.scale.bias'], hw = F['decoder.l1.film.shift.weight'], hb = F['decoder.l1.film.shift.bias'];
      for (let i = 0; i < C; i++) { u[i] = sb[i] * cat[i] + hb[i]; v[i] = sw[i] * cat[i] + hw[i]; }
      linear(u, Wt['decoder.l1.linear.weight'], B['decoder.l1.linear.bias'], H, C, a, false);
      linear(v, Wt['decoder.l1.linear.weight'], null, H, C, c, false);
      for (let s = 0; s < S; s++) { const t = T[s]; for (let o = 0; o < H; o++) { const e = a[o] + t * c[o]; y1[s * H + o] = e > 0 ? e : Math.exp(e) - 1; } } }
    // layer 2
    { const sw = F['decoder.l2.film.scale.weight'], sb = F['decoder.l2.film.scale.bias'], hw = F['decoder.l2.film.shift.weight'], hb = F['decoder.l2.film.shift.bias'];
      for (let s = 0; s < S; s++) { const t = T[s], q = s * H; for (let i = 0; i < H; i++) z[q + i] = (sw[i] * t + sb[i]) * y1[q + i] + hw[i] * t + hb[i]; }
      linearSeq(z, Wt['decoder.l2.linear.weight'], B['decoder.l2.linear.bias'], H, H, S, y2, true, H); }
    // layer 3
    { const sw = F['decoder.l3.film.scale.weight'], sb = F['decoder.l3.film.scale.bias'], hw = F['decoder.l3.film.shift.weight'], hb = F['decoder.l3.film.shift.bias'];
      for (let s = 0; s < S; s++) { const t = T[s], q = s * H; for (let i = 0; i < H; i++) z[q + i] = (sw[i] * t + sb[i]) * y2[q + i] + hw[i] * t + hb[i]; }
      linearSeq(z, Wt['decoder.l3.linear.weight'], B['decoder.l3.linear.bias'], O, H, S, out, false, O); }
    const om = st['output_stats.mean'], os = st['output_stats.std'];
    for (let s = 0; s < S; s++) for (let k = 0; k < O; k++) out[s * O + k] = out[s * O + k] * os[k] + om[k];
    return out;
  }
  return msg => {
    if (msg.t === 'load') { try { load(msg.meta, msg.bin); post({ t: 'ready' }); } catch (e) { post({ t: 'error', msg: String(e.message || e) }); } }
    else if (msg.t === 'run') { const t0 = performance.now(); const o = run(msg.x); post({ t: 'out', id: msg.id, out: o.slice(), ms: performance.now() - t0 }); }
  };
}
if (typeof module !== 'undefined') module.exports = { nnInferHost };

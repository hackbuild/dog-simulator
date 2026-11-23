import { type NetManifest } from "./manifest.js";
type Gpu = any;
export declare const MATVEC_WGSL = "\nstruct P { rows: u32, cols: u32, act: u32, has_bias: u32, x_stride: u32, y_stride: u32, half: u32, pad: u32 }\n@group(0) @binding(0) var<uniform> p: P;\n@group(0) @binding(1) var<storage, read> w: array<u32>;\n@group(0) @binding(2) var<storage, read> x: array<f32>;\n@group(0) @binding(3) var<storage, read> b: array<f32>;\n@group(0) @binding(4) var<storage, read_write> y: array<f32>;\nvar<workgroup> part: array<f32, 64>;\n\nfn weight(k: u32) -> f32 {\n  if (p.half == 1u) {\n    let v = unpack2x16float(w[k >> 1u]);\n    return select(v.x, v.y, (k & 1u) == 1u);\n  }\n  return bitcast<f32>(w[k]);\n}\n\nfn act(v: f32) -> f32 {\n  switch p.act {\n    case 1u: { return select(exp(v) - 1.0, v, v > 0.0); }\n    case 2u: { return max(v, 0.0); }\n    case 3u: { return tanh(v); }\n    default: { return v; }\n  }\n}\n\n@compute @workgroup_size(64)\nfn main(@builtin(workgroup_id) g: vec3<u32>, @builtin(local_invocation_index) l: u32) {\n  let row = g.x;\n  let s = g.y;\n  var acc = 0.0;\n  var i = l;\n  loop {\n    if (i >= p.cols) { break; }\n    acc = acc + weight(row * p.cols + i) * x[s * p.x_stride + i];\n    i = i + 64u;\n  }\n  part[l] = acc;\n  workgroupBarrier();\n  var span = 32u;\n  loop {\n    if (span == 0u) { break; }\n    if (l < span) { part[l] = part[l] + part[l + span]; }\n    workgroupBarrier();\n    span = span >> 1u;\n  }\n  if (l == 0u) {\n    var v = part[0];\n    if (p.has_bias == 1u) { v = v + b[row]; }\n    y[s * p.y_stride + row] = act(v);\n  }\n}";
/**
 * Pointwise steps of the models, one entry point each:
 * norm: y = (x - a) / b; denorm: y = y * b[k % n] + a[k % n];
 * softmax: per group of n; concat: y = [code, x];
 * split: u = sb z + hb into y, v = sw z + hw into y2 (first FiLM layer);
 * combine: y[f n + o] = elu(a[o] + t[f] c[o]);
 * film: y[f n + i] = (sw t + sb) x[f n + i] + hw t + hb.
 */
export declare const POINTWISE_WGSL = "\nstruct Q { n: u32, count: u32, h: u32, pad: u32 }\n@group(0) @binding(0) var<uniform> q: Q;\n@group(0) @binding(1) var<storage, read> x: array<f32>;\n@group(0) @binding(2) var<storage, read> a: array<f32>;\n@group(0) @binding(3) var<storage, read> b: array<f32>;\n@group(0) @binding(4) var<storage, read> c: array<f32>;\n@group(0) @binding(5) var<storage, read> d: array<f32>;\n@group(0) @binding(6) var<storage, read> t: array<f32>;\n@group(0) @binding(7) var<storage, read_write> y: array<f32>;\n@group(0) @binding(8) var<storage, read_write> y2: array<f32>;\n\n@compute @workgroup_size(64)\nfn norm(@builtin(global_invocation_id) id: vec3<u32>) {\n  let i = id.x;\n  if (i >= q.count) { return; }\n  y[i] = (x[i] - a[i]) / b[i];\n}\n\n@compute @workgroup_size(64)\nfn denorm(@builtin(global_invocation_id) id: vec3<u32>) {\n  let k = id.x;\n  if (k >= q.count) { return; }\n  let i = k % q.n;\n  y[k] = x[k] * b[i] + a[i];\n}\n\n@compute @workgroup_size(64)\nfn softmax(@builtin(global_invocation_id) id: vec3<u32>) {\n  let g = id.x;\n  if (g * q.n >= q.count) { return; }\n  let o = g * q.n;\n  var m = x[o];\n  for (var i = 1u; i < q.n; i = i + 1u) { m = max(m, x[o + i]); }\n  var s = 0.0;\n  for (var i = 0u; i < q.n; i = i + 1u) { s = s + exp(x[o + i] - m); }\n  for (var i = 0u; i < q.n; i = i + 1u) { y[o + i] = exp(x[o + i] - m) / s; }\n}\n\n@compute @workgroup_size(64)\nfn concat(@builtin(global_invocation_id) id: vec3<u32>) {\n  let i = id.x;\n  if (i >= q.count) { return; }\n  y[i] = select(a[i - q.h], x[i], i < q.h);\n}\n\n@compute @workgroup_size(64)\nfn split(@builtin(global_invocation_id) id: vec3<u32>) {\n  let i = id.x;\n  if (i >= q.count) { return; }\n  y[i] = b[i] * x[i] + d[i];\n  y2[i] = a[i] * x[i] + c[i];\n}\n\n@compute @workgroup_size(64)\nfn combine(@builtin(global_invocation_id) id: vec3<u32>) {\n  let k = id.x;\n  if (k >= q.count) { return; }\n  let f = k / q.n;\n  let o = k % q.n;\n  let e = x[o] + t[f] * a[o];\n  y[k] = select(exp(e) - 1.0, e, e > 0.0);\n}\n\n@compute @workgroup_size(64)\nfn film(@builtin(global_invocation_id) id: vec3<u32>) {\n  let k = id.x;\n  if (k >= q.count) { return; }\n  let f = k / q.n;\n  let i = k % q.n;\n  let tt = t[f];\n  y[k] = (a[i] * tt + b[i]) * x[k] + c[i] * tt + d[i];\n}";
export interface GpuModel {
    readonly adapterInfo: string;
    run(input: Float32Array, frames?: number): Promise<Float32Array>;
    dispose(): void;
}
/** A WebGPU device when the browser has an adapter; null otherwise. */
export declare function requestDevice(): Promise<{
    device: Gpu;
    info: string;
} | null>;
/** Builds the GPU model; throws when a tensor is missing or a buffer exceeds the device limits. */
export declare function createGpuModel(manifest: NetManifest, weights: ArrayBuffer, dev?: {
    device: Gpu;
    info: string;
}): Promise<GpuModel>;
export {};

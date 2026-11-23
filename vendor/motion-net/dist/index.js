// @hackbuild/motion-net: a runtime for small motion networks (dense
// stacks and codebook matching) on WebGPU or wasm SIMD, in a worker with
// an in page fallback, and a quadruped gait host over the published
// codebook network. Weights never ship here: the caller gives a URL,
// ArrayBuffer or File, and the licence of the weights is stated on load.
import { loadWasm, loadWasmSync } from "./load.js";
import * as wasm from "./wasm/motion_net.js";
import { readWeights } from "./fetch.js";
import { codebookManifest, QUADRUPED_LICENCE } from "./manifest.js";
import { createSession } from "./session.js";
import { CodebookGait, readGuidance } from "./quadruped.js";
export * from "./manifest.js";
export * from "./fetch.js";
export { createCpuModel } from "./cpu.js";
export { createHost } from "./host.js";
export { createSession } from "./session.js";
export { createGpuModel, requestDevice, MATVEC_WGSL, POINTWISE_WGSL } from "./webgpu.js";
export * from "./quadruped.js";
export async function load(source) {
    await loadWasm(source);
}
export function loadSync(source) {
    loadWasmSync(source);
}
/** The native and wasm agreement trace of the small seeded nets. */
export function goldenTrace(seed) {
    return wasm.goldenTrace(seed);
}
const json = async (src) => (typeof src === "string" || src instanceof URL ? (await (await fetch(src)).json()) : src);
/**
 * Loads the quadruped codebook network from caller sources and returns its
 * gait host. Load @hackbuild/gait first; the host fills gait's motor state.
 */
export async function loadQuadrupedGait(src) {
    await loadWasm();
    const [file, bind, weights] = await Promise.all([json(src.manifest), json(src.bind), readWeights(src.weights, src.fetch)]);
    const manifest = codebookManifest(file, QUADRUPED_LICENCE, src.fetch?.sha256);
    const guidance = readGuidance(file, weights);
    const session = await createSession(manifest, weights, src.session);
    return new CodebookGait(session, { file, bind, guidance }, src.gait);
}

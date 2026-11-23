// @hackbuild/motion-net: a runtime for the categorical codebook matching
// quadruped network and a gait host that drives a dog from it. The network
// runs in Rust on wasm SIMD128 inside a worker, or in the page when a
// worker is refused. Weights are CC BY-NC 4.0 and are fetched at run time.
import { assertReady, loadWasm, loadWasmSync } from "./load.js";
import * as wasm from "./wasm/motion_net.js";
export * from "./layout.js";
export * from "./weights.js";
export * from "./engine.js";
const PKG = "@hackbuild/motion-net";
/** Loads the wasm for the page side helpers (golden trace). The predictor loads its own copy. */
export async function load(source) {
    await loadWasm(source);
}
export function loadSync(source) {
    loadWasmSync(source);
}
/** The seeded random network trace that the native and wasm builds must agree on. */
export function goldenTrace(seed) {
    assertReady(PKG);
    return wasm.goldenTrace(seed);
}
/** The linear congruential generator of the specification's test vectors. */
export function lcg(seed) {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967296;
    };
}
export * from "./host.js";

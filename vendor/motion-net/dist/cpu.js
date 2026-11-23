// The CPU path: the Rust kernels in wasm with SIMD128. Halves are widened
// to f32 once inside wasm memory.
import { assertReady } from "./load.js";
import { ACTIVATION_CODES, requiredTensors } from "./manifest.js";
import * as wasm from "./wasm/motion_net.js";
export function createCpuModel(manifest, weights, accum = "f64") {
    assertReady("@hackbuild/motion-net");
    const store = new wasm.TensorStore();
    try {
        for (const name of requiredTensors(manifest.model)) {
            const e = manifest.tensors[name];
            if (!e)
                throw new Error(`motion-net: the manifest has no tensor ${name}`);
            const size = e.count * (e.dtype === "f16" ? 2 : 4);
            if (e.offset + size > weights.byteLength)
                throw new Error(`motion-net: tensor ${name} runs past the end of the weight file`);
            const shape = Uint32Array.from(e.shape);
            if (e.dtype === "f16")
                store.addF16(name, new Uint16Array(weights, e.offset, e.count), shape);
            else
                store.addF32(name, new Float32Array(weights.slice(e.offset, e.offset + size)), shape);
        }
        const bytes = store.bytes();
        const f64 = accum === "f64";
        const m = manifest.model;
        if (m.kind === "codebook") {
            const net = new wasm.CodebookNet(store, Uint32Array.of(m.input, m.latent, m.group, m.iterations, m.frames, m.output), f64);
            return {
                inputDim: m.input,
                outputDim: m.output,
                frames: m.frames,
                bytes,
                run: (input, frames = m.frames) => net.run(input, frames),
                dispose: () => net.free(),
            };
        }
        const net = new wasm.MlpNet(store, m.prefix, Uint32Array.from(m.dims), Uint8Array.from(m.activations, (a) => ACTIVATION_CODES[a]), m.stats, f64);
        return {
            inputDim: m.dims[0],
            outputDim: m.dims[m.dims.length - 1],
            frames: 1,
            bytes,
            run: (input) => net.run(input),
            dispose: () => net.free(),
        };
    }
    finally {
        store.free();
    }
}

// The neutral manifest: a model description plus a table of tensors inside
// one weight file. A reader for the layout of the published quadruped
// codebook files maps them onto it.
export const ACTIVATION_CODES = { none: 0, elu: 1, relu: 2, tanh: 3 };
/** The published quadruped codebook weights: CC BY-NC 4.0, non commercial use only. */
export const QUADRUPED_LICENCE = {
    name: "quadruped codebook network",
    licence: "CC-BY-NC-4.0",
    credit: "AI4AnimationPy by Paul Starke and Sebastian Starke (Meta); the web export of the weights by sweriko. Non commercial use only.",
};
/** Maps the upstream codebook file onto the neutral manifest. */
export function codebookManifest(file, licence = QUADRUPED_LICENCE, sha256) {
    const m = file.model;
    const tensors = {};
    for (const [k, e] of Object.entries(file.bin))
        tensors[k] = { offset: e.offset, count: e.count, shape: e.shape, dtype: e.dtype === "f16" ? "f16" : "f32" };
    const out = {
        model: {
            kind: "codebook",
            input: m.input_dim,
            latent: m.latent_dim,
            group: m.codebook_dims,
            iterations: m.denoiser_iterations,
            frames: m.sequence_length,
            output: m.output_dim,
        },
        tensors,
        licence,
    };
    if (sha256)
        out.sha256 = sha256;
    return out;
}
/** Reads one tensor as f32 (halves widened in JavaScript). */
export function readTensor(manifest, weights, name) {
    const e = manifest.tensors[name];
    if (!e)
        throw new Error(`motion-net: no tensor ${name} in the manifest`);
    if (e.offset + e.count * (e.dtype === "f16" ? 2 : 4) > weights.byteLength)
        throw new Error(`motion-net: tensor ${name} runs past the end of the weight file`);
    if (e.dtype === "f32")
        return new Float32Array(weights.slice(e.offset, e.offset + e.count * 4));
    const h = new Uint16Array(weights.slice(e.offset, e.offset + e.count * 2));
    const out = new Float32Array(e.count);
    for (let i = 0; i < h.length; i++)
        out[i] = halfToFloat(h[i]);
    return out;
}
/** The raw halves of an f16 tensor. */
export function readHalves(manifest, weights, name) {
    const e = manifest.tensors[name];
    if (!e || e.dtype !== "f16")
        throw new Error(`motion-net: ${name} is not an f16 tensor`);
    return new Uint16Array(weights.slice(e.offset, e.offset + e.count * 2));
}
export function halfToFloat(h) {
    const s = h & 0x8000 ? -1 : 1;
    const e = (h >> 10) & 0x1f;
    const m = h & 0x3ff;
    if (e === 0)
        return s * m * 2 ** -24;
    if (e === 31)
        return m ? NaN : s * Infinity;
    return s * (1 + m / 1024) * 2 ** (e - 15);
}
/** Every tensor name the model needs, for a check before upload. */
export function requiredTensors(model) {
    if (model.kind === "mlp") {
        const names = [];
        for (let i = 0; i < model.activations.length; i++)
            names.push(`${model.prefix}${i}.weight`, `${model.prefix}${i}.bias`);
        if (model.stats)
            names.push("input_stats.mean", "input_stats.std", "output_stats.mean", "output_stats.std");
        return names;
    }
    const names = [];
    for (const net of ["estimator", "denoiser"])
        for (const l of [1, 2, 3])
            names.push(`${net}.l${l}.weight`, `${net}.l${l}.bias`);
    for (const l of [1, 2, 3]) {
        names.push(`decoder.l${l}.linear.weight`, `decoder.l${l}.linear.bias`);
        for (const k of ["scale", "shift"])
            names.push(`decoder.l${l}.film.${k}.weight`, `decoder.l${l}.film.${k}.bias`);
    }
    names.push("input_stats.mean", "input_stats.std", "output_stats.mean", "output_stats.std", "time_stats.mean", "time_stats.std", "timing");
    return names;
}

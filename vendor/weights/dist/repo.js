/**
 * Multi file models: ONNX graphs with external data files, transformers.js
 * repos (config, tokenizer, one or more .onnx files), GGUF split files.
 * Each file is an ordinary store entry, so resume and SHA-256 apply per file.
 */
/** Hugging Face resolve URL base for a repo and revision. Pin a commit hash for reproducible loads. */
export function hfResolve(repo, revision = "main", host = "https://huggingface.co") {
    return `${host}/${repo}/resolve/${encodeURIComponent(revision)}/`;
}
/** Fetch every file of a repo in order. Returns path to Blob; skipped optional files are absent. */
export async function getRepo(store, repo, opts = {}) {
    const out = new Map();
    const prefix = repo.keyPrefix ?? repo.base;
    let done = 0;
    const totals = repo.files.map(() => null);
    for (let i = 0; i < repo.files.length; i++) {
        const f = repo.files[i];
        const ref = { url: repo.base + f.path, key: prefix + f.path, licence: repo.licence, ...(f.sha256 ? { sha256: f.sha256 } : {}) };
        const o = {};
        if (opts.signal)
            o.signal = opts.signal;
        if (opts.resume !== undefined)
            o.resume = opts.resume;
        o.onProgress = (p) => {
            totals[i] = p.total;
            const known = totals.every((t) => t !== null) ? totals.reduce((a, t) => a + (t ?? 0), 0) : null;
            opts.onProgress?.({ file: f.path, fileProgress: p, loaded: done + p.loaded, total: known, index: i, count: repo.files.length });
        };
        try {
            const b = await store.get(ref, o);
            out.set(f.path, b);
            done += b.size;
            totals[i] = b.size;
        }
        catch (e) {
            if (f.optional && e instanceof Error && /http 404/.test(e.message))
                continue;
            throw e;
        }
    }
    return out;
}
/**
 * onnxruntime-web `externalData` entries for a graph whose weights sit in
 * side files (model.onnx plus model.onnx_data). Pass the result as
 * `sessionOptions.externalData`.
 */
export async function ortExternalData(files, graphPath) {
    const dir = graphPath.includes("/") ? graphPath.slice(0, graphPath.lastIndexOf("/") + 1) : "";
    const out = [];
    for (const [p, b] of files) {
        if (p === graphPath || !p.startsWith(dir))
            continue;
        if (!/\.onnx_data$|\.onnx\.data$|_data$/.test(p))
            continue;
        out.push({ path: p.slice(dir.length), data: new Uint8Array(await b.arrayBuffer()) });
    }
    return out;
}
const REMOTE = /^https?:\/\//;
/**
 * A cache object for transformers.js (`env.useCustomCache = true;
 * env.customCache = transformersCache(store, ...)`). URLs that
 * `licenceFor` names are downloaded through the store on `match`, so they
 * get parts, resume and the licence line; other URLs pass through to
 * transformers.js's own fetch and are stored on `put`. Keys that are not
 * http(s) URLs (the local model path) miss without a fetch.
 */
export function transformersCache(store, opts) {
    const urlOf = (r) => {
        const u = typeof r === "string" ? r : r.url;
        return REMOTE.test(u) && opts.keyFor ? opts.keyFor(u) : u;
    };
    return {
        async match(req) {
            const url = urlOf(req);
            // transformers.js asks for its local path first (/models/<repo>/...): never fetch that from the page origin
            if (!REMOTE.test(url))
                return undefined;
            const licence = opts.licenceFor(url);
            if (licence !== null) {
                const o = opts.onProgress ? { onProgress: opts.onProgress } : {};
                try {
                    const sha256 = opts.sha256For?.(url);
                    return new Response(await store.get({ url, licence, ...(sha256 ? { sha256 } : {}) }, o));
                }
                catch (e) {
                    if (e instanceof Error && /http 404/.test(e.message))
                        return undefined;
                    throw e;
                }
            }
            if (!(await store.has(url)))
                return undefined;
            const m = await store.meta(url);
            return new Response(await store.get({ url, licence: m?.licence ?? "unknown" }));
        },
        async put(req, res) {
            const url = urlOf(req);
            if (!REMOTE.test(url))
                return;
            if (await store.has(url))
                return;
            await store.put({ key: url, url, licence: opts.licenceFor(url) ?? "unknown, not stated by the caller" }, await res.blob());
        },
    };
}

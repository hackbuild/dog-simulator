/**
 * Storage backends. Each stores a weight file as numbered parts plus one
 * meta record, so every backend resumes the same way and a multi GB file
 * never has to sit in one buffer. Parts are Blobs, which lets the browser
 * keep them on disk.
 */
export function memoryBackend() {
    const metas = new Map();
    const parts = new Map();
    return {
        name: "memory",
        async getMeta(key) {
            const m = metas.get(key);
            return m ? structuredClone(m) : null;
        },
        async putMeta(meta) {
            metas.set(meta.key, structuredClone(meta));
        },
        async getPart(key, n) {
            return parts.get(`${key}:${n}`) ?? null;
        },
        async putPart(key, n, part) {
            parts.set(`${key}:${n}`, part);
        },
        async remove(key) {
            metas.delete(key);
            for (const k of [...parts.keys()])
                if (k.startsWith(`${key}:`) && /^\d+$/.test(k.slice(key.length + 1)))
                    parts.delete(k);
        },
        async keys() {
            return [...metas.keys()];
        },
    };
}
function req(r) {
    return new Promise((resolve, reject) => {
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
    });
}
/**
 * IndexedDB parts, the layout earlier builds used: one `kv` store with
 * `<key>:meta` and `<key>:<n>` records. Works on file://.
 */
export function idbBackend(opts = {}) {
    const factory = opts.indexedDB ?? globalThis.indexedDB;
    const name = opts.db ?? "hackbuild-weights";
    let dbp = null;
    const open = () => (dbp ??= new Promise((resolve, reject) => {
        const r = factory.open(name, 1);
        r.onupgradeneeded = () => {
            if (!r.result.objectStoreNames.contains("kv"))
                r.result.createObjectStore("kv");
        };
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
    }));
    const tx = async (mode) => (await open()).transaction("kv", mode).objectStore("kv");
    const get = async (k) => (await req((await tx("readonly")).get(k))) ?? null;
    const put = async (k, v) => {
        await req((await tx("readwrite")).put(v, k));
    };
    return {
        name: "idb",
        getMeta: (key) => get(`${key}:meta`),
        putMeta: (meta) => put(`${meta.key}:meta`, meta),
        getPart: (key, n) => get(`${key}:${n}`),
        putPart: (key, n, part) => put(`${key}:${n}`, part),
        async remove(key) {
            const meta = await get(`${key}:meta`);
            const store = await tx("readwrite");
            const count = Math.max(meta?.parts.length ?? 0, 0);
            store.delete(`${key}:meta`);
            for (let n = 0; n < count + 1; n++)
                store.delete(`${key}:${n}`);
            await new Promise((resolve, reject) => {
                store.transaction.oncomplete = () => resolve();
                store.transaction.onerror = () => reject(store.transaction.error);
            });
        },
        async keys() {
            const all = (await req((await tx("readonly")).getAllKeys()));
            return all.map(String).filter((k) => k.endsWith(":meta")).map((k) => k.slice(0, -5));
        },
    };
}
/** Cache Storage parts at synthetic URLs. Not available on file://. */
export function cacheBackend(opts = {}) {
    const storage = opts.caches ?? globalThis.caches;
    const name = opts.cache ?? "hackbuild-weights";
    const origin = opts.origin ?? "https://weights.invalid/";
    const url = (key, n) => `${origin}${encodeURIComponent(key)}/${n}`;
    const open = () => storage.open(name);
    return {
        name: "cache",
        async getMeta(key) {
            const r = await (await open()).match(url(key, "meta"));
            return r ? (await r.json()) : null;
        },
        async putMeta(meta) {
            await (await open()).put(url(meta.key, "meta"), new Response(JSON.stringify(meta), { headers: { "content-type": "application/json" } }));
        },
        async getPart(key, n) {
            const r = await (await open()).match(url(key, n));
            return r ? await r.blob() : null;
        },
        async putPart(key, n, part) {
            await (await open()).put(url(key, n), new Response(part));
        },
        async remove(key) {
            const c = await open();
            const meta = await this.getMeta(key);
            await c.delete(url(key, "meta"));
            for (let n = 0; n <= (meta?.parts.length ?? 0); n++)
                await c.delete(url(key, n));
        },
        async keys() {
            const c = await open();
            const reqs = await c.keys();
            return reqs
                .map((r) => (typeof r === "string" ? r : r.url))
                .filter((u) => u.startsWith(origin) && u.endsWith("/meta"))
                .map((u) => decodeURIComponent(u.slice(origin.length, -5)));
        },
    };
}
/** Origin private file system: one directory per key, files `meta.json` and `<n>.part`. */
export function opfsBackend(opts = {}) {
    const rootFn = opts.root ?? (async () => (await navigator.storage.getDirectory()));
    const top = opts.dir ?? "hackbuild-weights";
    const safe = (key) => encodeURIComponent(key).replace(/\./g, "%2E");
    const base = async () => (await rootFn()).getDirectoryHandle(top, { create: true });
    const dirOf = async (key, create) => {
        try {
            return await (await base()).getDirectoryHandle(safe(key), { create });
        }
        catch {
            return null;
        }
    };
    const readFile = async (key, file) => {
        const d = await dirOf(key, false);
        if (!d)
            return null;
        try {
            return await (await d.getFileHandle(file)).getFile();
        }
        catch {
            return null;
        }
    };
    const writeFile = async (key, file, data) => {
        const d = (await dirOf(key, true));
        const w = await (await d.getFileHandle(file, { create: true })).createWritable();
        await w.write(data);
        await w.close();
    };
    return {
        name: "opfs",
        async getMeta(key) {
            const f = await readFile(key, "meta.json");
            return f ? JSON.parse(await f.text()) : null;
        },
        putMeta: (meta) => writeFile(meta.key, "meta.json", JSON.stringify(meta)),
        getPart: (key, n) => readFile(key, `${n}.part`),
        putPart: (key, n, part) => writeFile(key, `${n}.part`, part),
        async remove(key) {
            try {
                await (await base()).removeEntry(safe(key), { recursive: true });
            }
            catch {
                /* already gone */
            }
        },
        async keys() {
            const b = await base();
            const out = [];
            if (b.keys)
                for await (const k of b.keys())
                    out.push(decodeURIComponent(k));
            return out;
        },
    };
}

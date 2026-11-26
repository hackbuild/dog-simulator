// packages/weights/src/backends.ts
/** A backend that keeps parts in memory for this tab only. */
function memoryBackend() {
	const metas = /* @__PURE__ */ new Map();
	const parts = /* @__PURE__ */ new Map();
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
			for (const k of [...parts.keys()]) if (k.startsWith(`${key}:`) && /^\d+$/.test(k.slice(key.length + 1))) parts.delete(k);
		},
		async keys() {
			return [...metas.keys()];
		}
	};
}
function req(r) {
	return new Promise((resolve, reject) => {
		r.onsuccess = () => resolve(r.result);
		r.onerror = () => reject(r.error);
	});
}
/**
* IndexedDB parts: one `kv` store with
* `<key>:meta` and `<key>:<n>` records. Works on file://.
*/
function idbBackend(opts = {}) {
	const factory = opts.indexedDB ?? globalThis.indexedDB;
	const name = opts.db ?? "hackbuild-weights";
	let dbp = null;
	const open = () => dbp ??= new Promise((resolve, reject) => {
		const r = factory.open(name, 1);
		r.onupgradeneeded = () => {
			if (!r.result.objectStoreNames.contains("kv")) r.result.createObjectStore("kv");
		};
		r.onsuccess = () => resolve(r.result);
		r.onerror = () => reject(r.error);
	});
	const tx = async (mode) => (await open()).transaction("kv", mode).objectStore("kv");
	const get = async (k) => await req((await tx("readonly")).get(k)) ?? null;
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
			for (let n = 0; n < count + 1; n++) store.delete(`${key}:${n}`);
			await new Promise((resolve, reject) => {
				store.transaction.oncomplete = () => resolve();
				store.transaction.onerror = () => reject(store.transaction.error);
			});
		},
		async keys() {
			return (await req((await tx("readonly")).getAllKeys())).map(String).filter((k) => k.endsWith(":meta")).map((k) => k.slice(0, -5));
		}
	};
}
/** Cache Storage parts at synthetic URLs. Not available on file://. */
function cacheBackend(opts = {}) {
	const storage = opts.caches ?? globalThis.caches;
	const name = opts.cache ?? "hackbuild-weights";
	const origin = opts.origin ?? "https://weights.invalid/";
	const url = (key, n) => `${origin}${encodeURIComponent(key)}/${n}`;
	const open = () => storage.open(name);
	return {
		name: "cache",
		async getMeta(key) {
			const r = await (await open()).match(url(key, "meta"));
			return r ? await r.json() : null;
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
			for (let n = 0; n <= (meta?.parts.length ?? 0); n++) await c.delete(url(key, n));
		},
		async keys() {
			return (await (await open()).keys()).map((r) => typeof r === "string" ? r : r.url).filter((u) => u.startsWith(origin) && u.endsWith("/meta")).map((u) => decodeURIComponent(u.slice(origin.length, -5)));
		}
	};
}
/** Origin private file system: one directory per key, files `meta.json` and `<n>.part`. */
function opfsBackend(opts = {}) {
	const rootFn = opts.root ?? (async () => await navigator.storage.getDirectory());
	const top = opts.dir ?? "hackbuild-weights";
	const safe = (key) => encodeURIComponent(key).replace(/\./g, "%2E");
	const base = async () => (await rootFn()).getDirectoryHandle(top, { create: true });
	const dirOf = async (key, create) => {
		try {
			return await (await base()).getDirectoryHandle(safe(key), { create });
		} catch {
			return null;
		}
	};
	const readFile = async (key, file) => {
		const d = await dirOf(key, false);
		if (!d) return null;
		try {
			return await (await d.getFileHandle(file)).getFile();
		} catch {
			return null;
		}
	};
	const writeFile = async (key, file, data) => {
		const w = await (await (await dirOf(key, true)).getFileHandle(file, { create: true })).createWritable();
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
			} catch {}
		},
		async keys() {
			const b = await base();
			const out = [];
			if (b.keys) for await (const k of b.keys()) out.push(decodeURIComponent(k));
			return out;
		}
	};
}
// packages/weights/src/sha256.ts
/**
* Incremental SHA-256 (FIPS 180-4). Web Crypto digests only whole buffers,
* and a weight file can be several GB, so the store hashes each chunk as it
* arrives and never holds the file in one buffer.
*/
const K = new Uint32Array([
	1116352408,
	1899447441,
	3049323471,
	3921009573,
	961987163,
	1508970993,
	2453635748,
	2870763221,
	3624381080,
	310598401,
	607225278,
	1426881987,
	1925078388,
	2162078206,
	2614888103,
	3248222580,
	3835390401,
	4022224774,
	264347078,
	604807628,
	770255983,
	1249150122,
	1555081692,
	1996064986,
	2554220882,
	2821834349,
	2952996808,
	3210313671,
	3336571891,
	3584528711,
	113926993,
	338241895,
	666307205,
	773529912,
	1294757372,
	1396182291,
	1695183700,
	1986661051,
	2177026350,
	2456956037,
	2730485921,
	2820302411,
	3259730800,
	3345764771,
	3516065817,
	3600352804,
	4094571909,
	275423344,
	430227734,
	506948616,
	659060556,
	883997877,
	958139571,
	1322822218,
	1537002063,
	1747873779,
	1955562222,
	2024104815,
	2227730452,
	2361852424,
	2428436474,
	2756734187,
	3204031479,
	3329325298
]);
/**
* Incremental SHA-256: call `update` with each chunk as it arrives, then `digestHex` once, so a
* file of several GB is never held in one buffer.
*/
var Sha256 = class {
	h = new Uint32Array([
		1779033703,
		3144134277,
		1013904242,
		2773480762,
		1359893119,
		2600822924,
		528734635,
		1541459225
	]);
	w = /* @__PURE__ */ new Uint32Array(64);
	buf = /* @__PURE__ */ new Uint8Array(64);
	bufLen = 0;
	total = 0;
	finished = false;
	update(data) {
		if (this.finished) throw new Error("sha256: update after digest");
		let i = 0;
		this.total += data.length;
		if (this.bufLen) {
			const take = Math.min(64 - this.bufLen, data.length);
			this.buf.set(data.subarray(0, take), this.bufLen);
			this.bufLen += take;
			i = take;
			if (this.bufLen === 64) {
				this.block(this.buf, 0);
				this.bufLen = 0;
			}
		}
		for (; i + 64 <= data.length; i += 64) this.block(data, i);
		if (i < data.length) {
			this.buf.set(data.subarray(i), 0);
			this.bufLen = data.length - i;
		}
		return this;
	}
	digestHex() {
		if (this.finished) throw new Error("sha256: digest called twice");
		const bits = this.total * 8;
		const pad = new Uint8Array((this.bufLen < 56 ? 56 : 120) - this.bufLen + 8);
		pad[0] = 128;
		const hi = Math.floor(bits / 2 ** 32);
		const lo = bits >>> 0;
		const n = pad.length;
		pad[n - 8] = hi >>> 24;
		pad[n - 7] = hi >>> 16;
		pad[n - 6] = hi >>> 8;
		pad[n - 5] = hi;
		pad[n - 4] = lo >>> 24;
		pad[n - 3] = lo >>> 16;
		pad[n - 2] = lo >>> 8;
		pad[n - 1] = lo;
		const total = this.total;
		this.update(pad);
		this.total = total;
		this.finished = true;
		let out = "";
		for (const v of this.h) out += v.toString(16).padStart(8, "0");
		return out;
	}
	block(d, o) {
		const w = this.w;
		for (let t = 0; t < 16; t++) w[t] = d[o + 4 * t] << 24 | d[o + 4 * t + 1] << 16 | d[o + 4 * t + 2] << 8 | d[o + 4 * t + 3];
		for (let t = 16; t < 64; t++) {
			const a = w[t - 15];
			const b = w[t - 2];
			const s0 = (a >>> 7 | a << 25) ^ (a >>> 18 | a << 14) ^ a >>> 3;
			const s1 = (b >>> 17 | b << 15) ^ (b >>> 19 | b << 13) ^ b >>> 10;
			w[t] = w[t - 16] + s0 + w[t - 7] + s1 | 0;
		}
		const h = this.h;
		let a = h[0], b = h[1], c = h[2], e = h[4], f = h[5], g = h[6], hh = h[7], dd = h[3];
		for (let t = 0; t < 64; t++) {
			const S1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
			const ch = e & f ^ ~e & g;
			const t1 = hh + S1 + ch + K[t] + w[t] | 0;
			const t2 = ((a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10)) + (a & b ^ a & c ^ b & c) | 0;
			hh = g;
			g = f;
			f = e;
			e = dd + t1 | 0;
			dd = c;
			c = b;
			b = a;
			a = t1 + t2 | 0;
		}
		h[0] = h[0] + a | 0;
		h[1] = h[1] + b | 0;
		h[2] = h[2] + c | 0;
		h[3] = h[3] + dd | 0;
		h[4] = h[4] + e | 0;
		h[5] = h[5] + f | 0;
		h[6] = h[6] + g | 0;
		h[7] = h[7] + hh | 0;
	}
};
/** Lowercase hex SHA-256 of a byte array. */
function sha256Hex(data) {
	return new Sha256().update(data).digestHex();
}
// packages/weights/src/store.ts
/**
* One weight store over OPFS, Cache Storage, IndexedDB parts and memory.
*
* A download is written as parts of `partBytes` (default 128 MB) with a
* meta record updated after each part. An
* interrupted download keeps what it has; the next `get` asks the server
* for the rest with a Range request guarded by If-Range, and starts over
* when the server answers 200 instead of 206 or when the 206 carries a
* different ETag or Last-Modified than the stored parts. The SHA-256 is computed as
* the bytes stream in, and checked when the reference carries one.
*/
/** The error the store throws, with a `code` of "http", "sha256", "quota", "abort" or "range". */
var WeightError = class extends Error {
	code;
	constructor(code, message) {
		super(message);
		this.name = "WeightError";
		this.code = code;
	}
};
function pickBackends(opts) {
	const spec = opts.backends ?? "auto";
	const onFile = (opts.protocol ?? globalThis.location?.protocol) === "file:";
	const g = globalThis;
	return (spec === "auto" ? [
		!onFile && typeof g.navigator?.storage?.getDirectory === "function" ? "opfs" : null,
		g.indexedDB ? "idb" : null,
		!onFile && g.caches ? "cache" : null,
		"memory"
	].filter(Boolean) : spec).map((n) => typeof n !== "string" ? n : n === "opfs" ? opfsBackend() : n === "idb" ? idbBackend() : n === "cache" ? cacheBackend() : memoryBackend());
}
function parseContentRange(h) {
	const m = h && /bytes\s+(\d+)-\d+\/(\d+|\*)/i.exec(h);
	if (!m) return null;
	return {
		start: Number(m[1]),
		total: m[2] === "*" ? null : Number(m[2])
	};
}
const bareTag = (t) => t ? t.replace(/^W\//, "").replace(/^"|"$/g, "") : null;
/**
* True when a 206 comes from the file the stored parts came from: its ETag,
* or else its Last-Modified, equals the stored one. With neither validator
* on both sides the splice is allowed only when a known SHA-256 will check
* the result.
*/
function sameFile(meta, res, hashKnown) {
	const tag = bareTag(res.headers.get("etag"));
	if (meta.etag && tag) return bareTag(meta.etag) === tag;
	const lm = res.headers.get("last-modified");
	if (meta.lastModified && lm) return meta.lastModified === lm;
	return hashKnown;
}
async function assemble(b, meta) {
	const parts = [];
	for (let n = 0; n < meta.parts.length; n++) {
		const p = await b.getPart(meta.key, n);
		if (!p || p.size !== meta.parts[n]) return null;
		parts.push(p);
	}
	return new Blob(parts);
}
/**
* Open a store. The first backend whose meta read works is used; a backend
* that throws on open (OPFS on file://, a blocked IndexedDB) is skipped.
*/
async function openWeightStore(opts = {}) {
	const partBytes = opts.partBytes ?? 134217728;
	const doFetch = opts.fetch ?? globalThis.fetch.bind(globalThis);
	const notice = opts.onNotice;
	const now = opts.now ?? (() => Date.now());
	let backend = null;
	for (const b of pickBackends(opts)) try {
		await b.getMeta("__probe__");
		backend = b;
		break;
	} catch {}
	if (!backend) backend = memoryBackend();
	const be = backend;
	const noticed = /* @__PURE__ */ new Set();
	const inflight = /* @__PURE__ */ new Map();
	const rowFns = /* @__PURE__ */ new Set();
	const rows = () => [...inflight.values()].filter((f) => !f.ac.signal.aborted).map((f) => ({
		...f.row,
		waiters: f.waiters
	}));
	const tell = () => {
		if (!rowFns.size) return;
		const r = rows();
		for (const fn of rowFns) fn(r);
	};
	const g = globalThis;
	const locks = opts.locks === false ? null : opts.locks ?? g.navigator?.locks ?? null;
	/** Run one download under the origin wide lock for its key, when Web Locks exist. */
	const locked = (key, signal, fn) => {
		if (!locks) return fn();
		return locks.request(`hackbuild-weights:${key}`, { signal }, fn).catch((e) => {
			if (signal.aborted && !(e instanceof WeightError)) throw new WeightError("abort", `download of ${key} aborted while another page held it`);
			throw e;
		});
	};
	const onceMap = /* @__PURE__ */ new Map();
	const tellLicence = (key, licence) => {
		const model = modelOf(key);
		if (noticed.has(model)) return;
		noticed.add(model);
		const first = firstInSession(model);
		const line = `weights ${model}: licence ${licence}. the weights are not part of this library.`;
		if (notice) notice(line);
		else if (first) console.info(line);
	};
	const estimate = async () => {
		const fn = opts.estimate ?? (() => globalThis.navigator?.storage?.estimate?.() ?? Promise.resolve({}));
		let e = {};
		try {
			e = await fn() ?? {};
		} catch {}
		const used = typeof e.usage === "number" ? e.usage : null;
		const quota = typeof e.quota === "number" ? e.quota : null;
		return {
			used,
			quota,
			fits: (bytes) => quota === null || quota - (used ?? 0) >= 1.2 * bytes
		};
	};
	async function download(ref, key, o) {
		let meta = await be.getMeta(key);
		if (meta?.complete) {
			const blob = await assemble(be, meta);
			if (blob && (!ref.sha256 || meta.sha256 === ref.sha256.toLowerCase())) return blob;
			await be.remove(key);
			meta = null;
		}
		const resume = o.resume !== false;
		if (meta && (!resume || meta.url !== ref.url)) {
			await be.remove(key);
			meta = null;
		}
		const hash = new Sha256();
		let offset = 0;
		if (meta && meta.parts.length) for (let n = 0; n < meta.parts.length; n++) {
			const p = await be.getPart(key, n);
			if (!p || p.size !== meta.parts[n]) {
				meta.parts = meta.parts.slice(0, n);
				break;
			}
			hash.update(new Uint8Array(await p.arrayBuffer()));
			offset += p.size;
			o.onProgress?.({
				key,
				loaded: offset,
				total: meta.total,
				fraction: meta.total ? offset / meta.total : null,
				resuming: true
			});
		}
		if (!meta) meta = {
			key,
			url: ref.url,
			licence: ref.licence,
			total: null,
			parts: [],
			complete: false,
			etag: null,
			lastModified: null,
			sha256: null,
			updated: now()
		};
		const headers = {};
		if (offset > 0) {
			headers["range"] = `bytes=${offset}-`;
			const validator = meta.etag ?? meta.lastModified;
			if (validator) headers["if-range"] = validator;
		}
		const init = { headers };
		if (o.signal) init.signal = o.signal;
		let res;
		try {
			res = await doFetch(ref.url, init);
		} catch (e) {
			if (o.signal?.aborted) throw new WeightError("abort", `download of ${key} aborted`);
			throw new WeightError("http", `fetch ${ref.url} failed: ${e instanceof Error ? e.message : String(e)}`);
		}
		if (offset > 0 && res.status === 416 && meta.total !== null && offset >= meta.total) {} else if (offset > 0 && res.status === 416 && meta.total === null) meta.total = offset;
		else if (offset > 0 && res.status === 206 && !sameFile(meta, res, !!ref.sha256)) {
			await res.body?.cancel().catch(() => void 0);
			await be.remove(key);
			return download(ref, key, {
				...o,
				resume: false
			});
		} else if (offset > 0 && res.status === 206) {
			const cr = parseContentRange(res.headers.get("content-range"));
			if (!cr || cr.start !== offset) throw new WeightError("range", `server resumed ${key} at ${cr?.start ?? "unknown"}, expected ${offset}`);
			if (cr.total !== null) meta.total = cr.total;
		} else if (res.ok) {
			if (offset > 0) {
				await res.body?.cancel().catch(() => void 0);
				await be.remove(key);
				return download(ref, key, {
					...o,
					resume: false
				});
			}
			const len = res.headers.get("content-length");
			meta.total = len !== null && /^\d+$/.test(len) && !res.headers.get("content-encoding") ? Number(len) : null;
		} else throw new WeightError("http", `http ${res.status} for ${ref.url}`);
		meta.etag = res.headers.get("etag") ?? meta.etag;
		meta.lastModified = res.headers.get("last-modified") ?? meta.lastModified;
		meta.updated = now();
		await be.putMeta(meta);
		if (meta.total !== null && offset === 0) {
			const est = await estimate();
			if (!est.fits(meta.total)) throw new WeightError("quota", `not enough storage for ${key}: needs ${meta.total} bytes plus a 20 percent margin, ${(est.quota ?? 0) - (est.used ?? 0)} free`);
		}
		let cur = [];
		let curBytes = 0;
		let loaded = offset;
		const flush = async () => {
			if (!curBytes) return;
			const n = meta.parts.length;
			await be.putPart(key, n, new Blob(cur));
			meta.parts.push(curBytes);
			meta.updated = now();
			await be.putMeta(meta);
			cur = [];
			curBytes = 0;
		};
		if (res.status !== 416 && res.body) {
			const reader = res.body.getReader();
			try {
				for (;;) {
					const { done, value } = await reader.read();
					if (done) break;
					if (o.signal?.aborted) throw new Error("aborted");
					hash.update(value);
					loaded += value.byteLength;
					let rest = value;
					while (rest.byteLength) {
						const take = Math.min(rest.byteLength, partBytes - curBytes);
						cur.push(rest.subarray(0, take));
						curBytes += take;
						rest = rest.subarray(take);
						if (curBytes >= partBytes) await flush();
					}
					o.onProgress?.({
						key,
						loaded,
						total: meta.total,
						fraction: meta.total ? Math.min(1, loaded / meta.total) : null,
						resuming: false
					});
				}
			} catch (e) {
				await flush().catch(() => void 0);
				if (o.signal?.aborted) throw new WeightError("abort", `download of ${key} aborted at ${loaded} bytes; parts kept for resume`);
				throw new WeightError("http", `download of ${key} broke at ${loaded} bytes, parts kept for resume: ${e instanceof Error ? e.message : String(e)}`);
			}
		}
		await flush();
		if (meta.total !== null && loaded !== meta.total) throw new WeightError("http", `download of ${key} ended at ${loaded} of ${meta.total} bytes; parts kept for resume`);
		const digest = hash.digestHex();
		if (ref.sha256 && digest !== ref.sha256.toLowerCase()) {
			await be.remove(key);
			throw new WeightError("sha256", `sha256 of ${key} is ${digest}, expected ${ref.sha256.toLowerCase()}; the parts were removed`);
		}
		meta.total = loaded;
		meta.sha256 = digest;
		meta.complete = true;
		meta.updated = now();
		await be.putMeta(meta);
		const blob = await assemble(be, meta);
		if (!blob) throw new WeightError("http", `parts of ${key} went missing after the download`);
		return blob;
	}
	const store = {
		backend: be,
		get(ref, o = {}) {
			const key = ref.key ?? ref.url;
			tellLicence(key, ref.licence);
			let f = inflight.get(key);
			if (!f || f.ac.signal.aborted) {
				const before = f ? f.p.then(() => void 0, () => void 0) : Promise.resolve();
				const ac = new AbortController();
				const progress = /* @__PURE__ */ new Set();
				const row = {
					key,
					url: ref.url,
					loaded: 0,
					total: null,
					fraction: null,
					waiters: 0
				};
				const dl = {
					signal: ac.signal,
					onProgress: (x) => {
						row.loaded = x.loaded;
						row.total = x.total;
						row.fraction = x.fraction;
						progress.forEach((cb) => cb(x));
						tell();
					}
				};
				if (o.resume !== void 0) dl.resume = o.resume;
				const flight = {
					p: null,
					ac,
					waiters: 0,
					progress,
					row
				};
				flight.p = before.then(() => locked(key, ac.signal, () => download(ref, key, dl))).finally(() => {
					if (inflight.get(key) === flight) inflight.delete(key);
					tell();
				});
				f = flight;
				inflight.set(key, f);
			}
			const fl = f;
			fl.waiters++;
			if (o.onProgress) fl.progress.add(o.onProgress);
			tell();
			return new Promise((resolve, reject) => {
				let settled = false;
				const leave = () => {
					settled = true;
					o.signal?.removeEventListener("abort", onAbort);
					if (o.onProgress) fl.progress.delete(o.onProgress);
					fl.waiters--;
				};
				const onAbort = () => {
					if (settled) return;
					leave();
					if (fl.waiters <= 0) fl.ac.abort();
					reject(new WeightError("abort", `download of ${key} aborted; parts kept for resume`));
				};
				if (o.signal?.aborted) return onAbort();
				o.signal?.addEventListener("abort", onAbort, { once: true });
				fl.p.then((b) => {
					if (settled) return;
					leave();
					resolve(b);
				}, (e) => {
					if (settled) return;
					leave();
					reject(e);
				});
			});
		},
		once(ref, o = {}) {
			const key = ref.key ?? ref.url;
			let p = onceMap.get(key);
			if (!p) {
				p = store.get(ref, o).then(async (b) => new Uint8Array(await b.arrayBuffer()));
				p.catch(() => onceMap.delete(key));
				onceMap.set(key, p);
			}
			return p;
		},
		release(key) {
			onceMap.delete(key);
		},
		async put(ref, data) {
			const key = ref.key;
			tellLicence(key, ref.licence);
			const blob = data instanceof Blob ? data : new Blob([data]);
			const hash = new Sha256();
			await be.remove(key);
			const meta = {
				key,
				url: ref.url ?? null,
				licence: ref.licence,
				total: blob.size,
				parts: [],
				complete: false,
				etag: null,
				lastModified: null,
				sha256: null,
				updated: now()
			};
			for (let off = 0, n = 0; off < blob.size || blob.size === 0 && n === 0; off += partBytes, n++) {
				const part = blob.slice(off, off + partBytes);
				hash.update(new Uint8Array(await part.arrayBuffer()));
				if (part.size) {
					await be.putPart(key, n, part);
					meta.parts.push(part.size);
				}
				if (blob.size === 0) break;
			}
			const digest = hash.digestHex();
			if (ref.sha256 && digest !== ref.sha256.toLowerCase()) {
				await be.remove(key);
				throw new WeightError("sha256", `sha256 of ${key} is ${digest}, expected ${ref.sha256.toLowerCase()}`);
			}
			meta.sha256 = digest;
			meta.complete = true;
			await be.putMeta(meta);
			return await assemble(be, meta);
		},
		async has(key) {
			return (await be.getMeta(key))?.complete === true;
		},
		meta: (key) => be.getMeta(key),
		async evict(key) {
			onceMap.delete(key);
			await be.remove(key);
		},
		keys: () => be.keys(),
		estimate,
		downloads: rows,
		onDownloads(fn) {
			rowFns.add(fn);
			return () => rowFns.delete(fn);
		},
		cancel(key) {
			const f = inflight.get(key);
			if (!f || f.ac.signal.aborted) return false;
			f.ac.abort();
			tell();
			return true;
		},
		async persist() {
			const fn = opts.persist ?? g.navigator?.storage?.persist?.bind(g.navigator.storage);
			if (!fn) return false;
			try {
				return await fn() === true;
			} catch {
				return false;
			}
		},
		async persisted() {
			const fn = opts.persisted ?? g.navigator?.storage?.persisted?.bind(g.navigator.storage);
			if (!fn) return null;
			try {
				return await fn() === true;
			} catch {
				return null;
			}
		}
	};
	return store;
}
const HF_REPO = /^https:\/\/huggingface\.co\/([^/]+\/[^/]+)\/resolve\//;
/** The model a weight key belongs to: its Hugging Face repo, the folder of any other URL, or a non URL key as is. */
function modelOf(key) {
	const m = HF_REPO.exec(key);
	if (m) return m[1];
	if (!/^https?:\/\//.test(key)) return key;
	const cut = key.split("?")[0].lastIndexOf("/");
	return cut > 0 ? key.slice(0, cut) : key;
}
const SEEN = Symbol.for("hackbuild.licence.seen");
/** True the first time a model is named in this page session; shared by every hackbuild package through a global symbol. */
function firstInSession(model) {
	const g = globalThis;
	const seen = g[SEEN] ??= /* @__PURE__ */ new Set();
	if (seen.has(model)) return false;
	seen.add(model);
	return true;
}
// packages/weights/src/repo.ts
/** Hugging Face resolve URL base for a repo and revision. Pin a commit hash for reproducible loads. */
function hfResolve(repo, revision = "main", host = "https://huggingface.co") {
	return `${host}/${repo}/resolve/${encodeURIComponent(revision)}/`;
}
/** Fetch every file of a repo in order. Returns path to Blob; skipped optional files are absent. */
async function getRepo(store, repo, opts = {}) {
	const out = /* @__PURE__ */ new Map();
	const prefix = repo.keyPrefix ?? repo.base;
	let done = 0;
	const totals = repo.files.map(() => null);
	for (let i = 0; i < repo.files.length; i++) {
		const f = repo.files[i];
		const ref = {
			url: repo.base + f.path,
			key: prefix + f.path,
			licence: repo.licence,
			...f.sha256 ? { sha256: f.sha256 } : {}
		};
		const o = {};
		if (opts.signal) o.signal = opts.signal;
		if (opts.resume !== void 0) o.resume = opts.resume;
		o.onProgress = (p) => {
			totals[i] = p.total;
			const known = totals.every((t) => t !== null) ? totals.reduce((a, t) => a + (t ?? 0), 0) : null;
			opts.onProgress?.({
				file: f.path,
				fileProgress: p,
				loaded: done + p.loaded,
				total: known,
				index: i,
				count: repo.files.length
			});
		};
		try {
			const b = await store.get(ref, o);
			out.set(f.path, b);
			done += b.size;
			totals[i] = b.size;
		} catch (e) {
			if (f.optional && e instanceof Error && /http 404/.test(e.message)) continue;
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
async function ortExternalData(files, graphPath) {
	const dir = graphPath.includes("/") ? graphPath.slice(0, graphPath.lastIndexOf("/") + 1) : "";
	const out = [];
	for (const [p, b] of files) {
		if (p === graphPath || !p.startsWith(dir)) continue;
		if (!/\.onnx_data$|\.onnx\.data$|_data$/.test(p)) continue;
		out.push({
			path: p.slice(dir.length),
			data: new Uint8Array(await b.arrayBuffer())
		});
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
function transformersCache(store, opts) {
	const urlOf = (r) => {
		const u = typeof r === "string" ? r : r.url;
		return REMOTE.test(u) && opts.keyFor ? opts.keyFor(u) : u;
	};
	return {
		async match(req) {
			const url = urlOf(req);
			if (!REMOTE.test(url)) return void 0;
			const licence = opts.licenceFor(url);
			if (licence !== null) {
				const o = opts.onProgress ? { onProgress: opts.onProgress } : {};
				try {
					const sha256 = opts.sha256For?.(url);
					return new Response(await store.get({
						url,
						licence,
						...sha256 ? { sha256 } : {}
					}, o));
				} catch (e) {
					if (e instanceof Error && /http 404/.test(e.message)) return void 0;
					throw e;
				}
			}
			if (!await store.has(url)) return void 0;
			const m = await store.meta(url);
			return new Response(await store.get({
				url,
				licence: m?.licence ?? "unknown"
			}));
		},
		async put(req, res) {
			const url = urlOf(req);
			if (!REMOTE.test(url)) return;
			if (await store.has(url)) return;
			await store.put({
				key: url,
				url,
				licence: opts.licenceFor(url) ?? "unknown, not stated by the caller"
			}, await res.blob());
		}
	};
}
export { Sha256, WeightError, cacheBackend, getRepo, hfResolve, idbBackend, memoryBackend, openWeightStore, opfsBackend, ortExternalData, sha256Hex, transformersCache };

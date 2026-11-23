import { createHost } from "./host.js";
import { loadWasm } from "./load.js";
import { stateLicence } from "./fetch.js";
import { createGpuModel } from "./webgpu.js";
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
function pageChannel(wasm) {
    const ch = {
        onReply: () => { },
        send: (m) => {
            setTimeout(() => void host(m), 0);
        },
        close: () => { },
    };
    const host = createHost((r) => setTimeout(() => ch.onReply(r), 0), () => loadWasm(wasm));
    return ch;
}
async function workerChannel() {
    if (typeof Worker === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined" || !URL.createObjectURL)
        return null;
    let source;
    try {
        source = (await import("./generated/worker-source.js")).workerSource;
    }
    catch {
        return null;
    }
    const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    try {
        const w = new Worker(url);
        const ch = {
            onReply: () => { },
            send: (m, t) => w.postMessage(m, t ?? []),
            close: () => {
                w.terminate();
                URL.revokeObjectURL(url);
            },
        };
        w.onmessage = (e) => ch.onReply(e.data);
        w.onerror = (e) => ch.onReply({ t: "error", message: e.message || "worker error" });
        return ch;
    }
    catch {
        URL.revokeObjectURL(url);
        return null;
    }
}
class CpuSession {
    ch;
    where;
    frames;
    backend = "wasm-simd";
    lastMs = 0;
    next = 1;
    waiting = new Map();
    constructor(ch, where, frames) {
        this.ch = ch;
        this.where = where;
        this.frames = frames;
        ch.onReply = (m) => this.reply(m);
    }
    reply(m) {
        if (m.t === "out") {
            const w = this.waiting.get(m.id);
            this.waiting.delete(m.id);
            this.lastMs = m.ms;
            w?.ok(m.out);
        }
        else if (m.t === "error" && m.id !== undefined) {
            const w = this.waiting.get(m.id);
            this.waiting.delete(m.id);
            w?.fail(new Error(m.message));
        }
    }
    run(input, frames = this.frames) {
        const id = this.next++;
        const copy = input.slice();
        return new Promise((ok, fail) => {
            this.waiting.set(id, { ok, fail, t0: now() });
            this.ch.send({ t: "run", id, input: copy, frames }, [copy.buffer]);
        });
    }
    dispose() {
        this.ch.send({ t: "dispose" });
        this.ch.close();
        for (const w of this.waiting.values())
            w.fail(new Error("motion-net: session disposed"));
        this.waiting.clear();
    }
}
class GpuSession {
    model;
    backend = "webgpu";
    where = "gpu";
    lastMs = 0;
    constructor(model) {
        this.model = model;
    }
    async run(input, frames) {
        const t0 = now();
        const out = await this.model.run(input, frames);
        this.lastMs = now() - t0;
        return out;
    }
    dispose() {
        this.model.dispose();
    }
}
function loadOn(ch, manifest, weights, accum, transfer) {
    return new Promise((ok, fail) => {
        ch.onReply = (m) => {
            if (m.t === "ready")
                ok(m.bytes);
            else if (m.t === "error")
                fail(new Error(m.message));
        };
        ch.send({ t: "load", manifest, weights, accum }, transfer ? [weights] : []);
    });
}
/**
 * Creates a session. The weight buffer is copied once into the worker, so
 * the caller keeps its own. States the weight licence through `onNotice`.
 */
export async function createSession(manifest, weights, opts = {}) {
    const notice = opts.onNotice ?? ((s) => console.info(s));
    stateLicence(manifest.licence, notice);
    const prefer = opts.prefer ?? ["webgpu", "wasm-simd"];
    const frames = manifest.model.kind === "codebook" ? manifest.model.frames : 1;
    for (const b of prefer) {
        if (b === "webgpu") {
            try {
                return new GpuSession(await createGpuModel(manifest, weights));
            }
            catch (e) {
                notice(e instanceof Error && e.message.startsWith("no webgpu") ? e.message : `webgpu failed: ${e instanceof Error ? e.message : String(e)}. the network runs on cpu.`);
            }
            continue;
        }
        const accum = opts.accum ?? "f64";
        if (opts.worker !== false) {
            const ch = await workerChannel();
            if (ch) {
                try {
                    await loadOn(ch, manifest, weights.slice(0), accum, true);
                    return new CpuSession(ch, "worker", frames);
                }
                catch (e) {
                    ch.close();
                    notice(`the network worker failed: ${e instanceof Error ? e.message : String(e)}. it runs in the page at a lower rate.`);
                }
            }
            else
                notice("blob workers are refused here. the network runs in the page at a lower rate.");
        }
        const ch = pageChannel(opts.wasm);
        await loadOn(ch, manifest, weights, accum, false);
        return new CpuSession(ch, "page", frames);
    }
    throw new Error("motion-net: no backend in prefer");
}

// Yard: the dog simulator's stage and rack as one view. A dog and his person in a 3D yard, the
// care verbs on the stage, the dog eye inset, the seven tabs of the rack (brain with the drives
// bars, body, sense, train with the associations table, human, tune, how), the cortex model
// select, the setup panel and the command palette. The host passes what the yard loads: the
// physics module, the dog and person models, the person's clips and voice, and a model hub.
// Needs three.js (the WebGPU build) and the @hackbuild packages the yard runs on; see README.
import { runYard, YARD_BAR_HTML, YARD_CSS, YARD_HTML } from "./yard/scope.js";
const STYLE_ID = "hb-yard-style";
async function bytes(a) {
    const v = typeof a === "function" ? await a() : a;
    if (v instanceof ArrayBuffer)
        return v;
    if (v instanceof Uint8Array)
        return v.slice().buffer;
    if (v instanceof Blob)
        return v.arrayBuffer();
    const r = await fetch(String(v));
    if (!r.ok)
        throw new Error(`${String(v).slice(0, 80)} http ${r.status}`);
    return r.arrayBuffer();
}
function base64(buf) {
    const u = new Uint8Array(buf);
    let s = "";
    for (let i = 0; i < u.length; i += 0x8000)
        s += String.fromCharCode(...u.subarray(i, i + 0x8000));
    return btoa(s);
}
const isAsset = (a) => typeof a === "string" || typeof a === "function" || a instanceof URL || a instanceof ArrayBuffer || a instanceof Uint8Array || a instanceof Blob;
/**
 * Mounts the yard in `host`. The yard keeps one instance per page: its parts find each other by
 * id. Its stylesheet goes into the document head once. Load hackbuild-ui's `hackbuild.css` on the
 * page for the look.
 */
export async function mountYard(host, o) {
    if (typeof o.physics !== "function")
        throw new Error("@hackbuild/agents-views: mountYard needs physics, a function returning the rapier3d-compat module");
    if (!o.dog)
        throw new Error("@hackbuild/agents-views: mountYard needs the dog model");
    const doc = host.ownerDocument;
    const win = doc.defaultView ?? window;
    if (doc.querySelector(".hb-yard"))
        throw new Error("@hackbuild/agents-views: a yard is mounted on this page already");
    if (!doc.getElementById(STYLE_ID)) {
        const st = doc.createElement("style");
        st.id = STYLE_ID;
        st.textContent = YARD_CSS;
        doc.head.append(st);
    }
    const root = doc.createElement("div");
    root.className = "hb-yard";
    root.innerHTML = YARD_HTML;
    const barTpl = doc.createElement("div");
    barTpl.innerHTML = YARD_BAR_HTML;
    const barParts = [...barTpl.children];
    if (o.bar) {
        o.bar.classList.add("hb-yard-bar");
        o.bar.append(...barParts);
    }
    else {
        // no bar: setup and commands float in the stage corner, apart from the verbs; no chips
        const corner = doc.createElement("div");
        corner.id = "corner";
        corner.setAttribute("aria-label", "setup and commands");
        corner.setAttribute("role", "group");
        for (const p of barParts)
            if (p.tagName === "BUTTON")
                corner.append(p);
        root.querySelector("#stage")?.prepend(corner);
    }
    host.replaceChildren(root);
    const cleanups = [];
    const timers = new Set();
    const observers = [];
    const streams = [];
    const disposers = [];
    const lookIn = [root, barTpl, ...(o.bar ? [o.bar] : [])];
    const cache = new Map();
    const byId = (id) => {
        const c = cache.get(id);
        if (c?.isConnected || (c && barTpl.contains(c)))
            return c;
        for (const r of lookIn) {
            const e = r.querySelector(`#${CSS.escape(id)}`);
            if (e) {
                cache.set(id, e);
                return e;
            }
        }
        return doc.getElementById(id);
    };
    class TrackedObserver extends win.ResizeObserver {
        constructor(cb) {
            super(cb);
            observers.push(this);
        }
    }
    const usesHash = o.params == null && !o.reseed;
    let readyOk = () => { };
    let readyErr = () => { };
    const ready = new Promise((res, rej) => { readyOk = res; readyErr = rej; });
    const [rapier, voice] = await Promise.all([o.physics(), o.voice ? bytes(o.voice).then(base64).catch(() => "") : Promise.resolve("")]);
    const env = {
        rapier,
        suiteUrl: o.suiteUrl ?? "",
        params: o.params ?? (usesHash ? win.location.hash.slice(1) : ""),
        canReseed: !!o.reseed || usesHash,
        setup: o.setup ?? true,
        hub: o.hub ?? "",
        voice,
        byId,
        qsa: (sel) => lookIn.flatMap((r) => [...r.querySelectorAll(sel)]),
        docOn(type, fn, opts) {
            doc.addEventListener(type, fn, opts);
            cleanups.push(() => doc.removeEventListener(type, fn, opts));
        },
        on(type, fn, opts) {
            win.addEventListener(type, fn, opts);
            cleanups.push(() => win.removeEventListener(type, fn, opts));
        },
        setTimeout(fn, ms) {
            const id = win.setTimeout(() => { timers.delete(id); fn(); }, ms);
            timers.add(id);
            return id;
        },
        setInterval(fn, ms) {
            const id = win.setInterval(fn, ms);
            timers.add(id);
            return id;
        },
        ResizeObserver: TrackedObserver,
        stream(s) {
            streams.push(s);
            return s;
        },
        dog: () => bytes(o.dog),
        human: () => (o.human ? bytes(o.human) : Promise.resolve(null)),
        anims: async () => (isAsset(o.anims) ? JSON.parse(new TextDecoder().decode(await bytes(o.anims))) : o.anims),
        reseed: o.reseed ?? ((q) => { win.location.hash = q; win.location.reload(); }),
        dispose: (fn) => { disposers.push(fn); },
        ready: (h) => readyOk(h),
        fail: (e) => readyErr(e),
    };
    runYard(env);
    ready.catch(() => { });
    let gone = false;
    return {
        root,
        ready,
        dispose() {
            if (gone)
                return;
            gone = true;
            for (const f of disposers) {
                try {
                    f();
                }
                catch { /* keep tearing down */ }
            }
            for (const f of cleanups)
                f();
            for (const t of timers) {
                win.clearTimeout(t);
                win.clearInterval(t);
            }
            for (const ob of observers)
                ob.disconnect();
            for (const s of streams)
                for (const t of s.getTracks())
                    t.stop();
            for (const p of barParts)
                p.remove();
            o.bar?.classList.remove("hb-yard-bar");
            root.remove();
            if (!doc.querySelector(".hb-yard"))
                doc.getElementById(STYLE_ID)?.remove();
        },
    };
}

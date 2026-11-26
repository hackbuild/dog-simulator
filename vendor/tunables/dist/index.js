// @hackbuild/tunables: a parameter registry with layer switches for A/B work.
// Every number that shapes behaviour is defined once with its range, step and
// where the value comes from; layers gate whole features behind one master
// switch, so each feature keeps a fallback path that can be compared live.
const HASH_KEY = "tune";
const num = (v) => {
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : Number.NaN;
    return Number.isFinite(n) ? n : null;
};
/** Shortest decimal text that reads back to the same number. */
const fmt = (v) => String(v);
/** Makes an empty registry; define parameters and layers on it, then `restore` and `fromUrlHash`. */
export function createRegistry(opts = {}) {
    const defs = new Map();
    const values = new Map();
    const groupOrder = [];
    const groupKeys = new Map();
    const layerKeys = [];
    const presets = new Map();
    const listeners = new Set();
    const version = opts.version ?? 1;
    const renames = opts.renames ?? {};
    const storageKey = opts.storageKey ?? "tunables";
    const rename = (k) => {
        let key = k;
        for (let i = 0; i < 8 && renames[key] !== undefined && !defs.has(key); i++)
            key = renames[key];
        return key;
    };
    const need = (key) => {
        const d = defs.get(key);
        if (!d)
            throw new Error(`tunables: no parameter named ${key}`);
        return d;
    };
    const clamp = (d, v) => Math.min(d.max, Math.max(d.min, v));
    const persist = () => {
        if (!opts.storage)
            return;
        try {
            opts.storage.setItem(storageKey, JSON.stringify(reg.toJSON()));
        }
        catch {
            // storage full or refused: values stay live in memory
        }
    };
    const write = (key, v, save) => {
        const d = need(key);
        // NaN and the infinities are ignored: they would save as null and
        // write "NaN" into the URL hash
        if (!Number.isFinite(v))
            return;
        const nv = clamp(d, v);
        if (values.get(key) === nv)
            return;
        values.set(key, nv);
        for (const fn of listeners)
            fn(key, nv);
        if (save)
            persist();
    };
    const loadValues = (vals) => {
        const skipped = [];
        for (const [k, raw] of Object.entries(vals)) {
            const key = rename(k);
            const v = num(raw);
            if (!defs.has(key) || v === null) {
                skipped.push(k);
                continue;
            }
            write(key, v, false);
        }
        persist();
        return skipped;
    };
    const reg = {
        define(def) {
            if (defs.has(def.key))
                throw new Error(`tunables: ${def.key} is defined twice`);
            if (!(def.min <= def.def && def.def <= def.max))
                throw new Error(`tunables: ${def.key} default ${def.def} is outside ${def.min} to ${def.max}`);
            if (!(def.step > 0))
                throw new Error(`tunables: ${def.key} step must be above 0`);
            defs.set(def.key, { ...def });
            values.set(def.key, def.def);
            if (!groupKeys.has(def.group)) {
                groupKeys.set(def.group, []);
                groupOrder.push(def.group);
            }
            groupKeys.get(def.group)?.push(def.key);
        },
        defineLayer(key, label, o = {}) {
            const d = { key, group: o.group ?? "layers", label, def: o.def ?? 1, min: 0, max: 1, step: 1 };
            if (o.note !== undefined)
                d.note = o.note;
            reg.define(d);
            layerKeys.push(key);
        },
        has: (key) => defs.has(key),
        def: (key) => ({ ...need(key) }),
        get(key) {
            const v = values.get(key);
            if (v === undefined)
                throw new Error(`tunables: no parameter named ${key}`);
            return v;
        },
        set: (key, value) => write(key, value, true),
        layer(key) {
            if (opts.master && key !== opts.master && defs.has(opts.master) && reg.get(opts.master) <= 0)
                return false;
            return reg.get(key) > 0;
        },
        reset(key) {
            if (key !== undefined)
                write(key, need(key).def, true);
            else {
                for (const d of defs.values())
                    write(d.key, d.def, false);
                persist();
            }
        },
        keys: () => [...defs.keys()],
        groups: () => groupOrder.map((group) => ({ group, keys: [...(groupKeys.get(group) ?? [])] })),
        layers: () => [...layerKeys],
        snapshot: () => Object.fromEntries(values),
        load: (vals) => loadValues(vals),
        toJSON() {
            const d = {};
            for (const def of defs.values()) {
                const v = values.get(def.key);
                if (v !== def.def)
                    d[def.key] = v;
            }
            return { ver: version, d };
        },
        fromJSON(saved) {
            if (!saved || typeof saved !== "object")
                throw new Error("tunables: saved settings must be an object");
            const s = saved;
            const versioned = typeof s.ver === "number" && !!s.d && typeof s.d === "object";
            const ver = versioned ? s.ver : 0;
            const vals = versioned ? s.d : s;
            if (ver === version)
                return loadValues(vals);
            const m = opts.migrate?.[ver];
            if (!m) {
                // no explicit migration: nothing from that save is safe to keep
                persist();
                return Object.keys(vals);
            }
            const kept = m({ ...vals });
            const dropped = Object.keys(vals).filter((k) => !(k in kept));
            return [...dropped, ...loadValues(kept)];
        },
        toUrlHash() {
            const parts = [];
            for (const d of defs.values()) {
                const v = values.get(d.key);
                if (v !== d.def)
                    parts.push(`${encodeURIComponent(d.key)}:${fmt(v)}`);
            }
            return parts.length ? `${HASH_KEY}=${version}|${parts.join("|")}` : "";
        },
        fromUrlHash(hash) {
            const h = hash.replace(/^#/, "");
            const dec = (p) => {
                try {
                    return decodeURIComponent(p);
                }
                catch {
                    return p;
                }
            };
            const field = h.split("&").map(dec).find((p) => p.startsWith(`${HASH_KEY}=`));
            if (!field)
                return [];
            const [, ...pairs] = field.slice(HASH_KEY.length + 1).split("|");
            const vals = {};
            const bad = [];
            for (const p of pairs) {
                const i = p.lastIndexOf(":");
                const v = i > 0 ? num(p.slice(i + 1)) : null;
                if (v === null)
                    bad.push(p);
                else
                    vals[p.slice(0, i)] = v;
            }
            return [...bad, ...loadValues(vals)];
        },
        definePreset(name, preset) {
            for (const k of Object.keys(preset.values))
                need(k);
            presets.set(name, { label: preset.label, values: { ...preset.values } });
        },
        presets: () => [...presets.entries()].map(([name, p]) => ({ name, label: p.label })),
        applyPreset(name) {
            const p = presets.get(name);
            if (!p)
                throw new Error(`tunables: no preset named ${name}`);
            loadValues(p.values);
        },
        abPair(layer) {
            need(layer);
            const base = reg.snapshot();
            return { on: { ...base, [layer]: 1 }, off: { ...base, [layer]: 0 } };
        },
        restore() {
            if (!opts.storage)
                return [];
            let text = null;
            try {
                text = opts.storage.getItem(storageKey);
            }
            catch {
                return [];
            }
            if (!text)
                return [];
            try {
                return reg.fromJSON(JSON.parse(text));
            }
            catch {
                return [];
            }
        },
        onChange(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },
    };
    return reg;
}
/** Decimal places a value of this step shows: 0 for whole steps, else enough for the step. */
export function decimalsFor(step) {
    if (step >= 1)
        return 0;
    return Math.min(6, Math.max(2, Math.ceil(-Math.log10(step) - 1e-9)));
}
/** A value as text with the decimal places its step calls for. */
export function formatValue(def, v) {
    return v.toFixed(decimalsFor(def.step));
}

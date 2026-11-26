// DrivesBars: what the creature is doing and why, what each act is worth to
// it now, and how much it needs each thing. Ported from hackle's brain tab:
// the behavior block (the name in Permanent Marker, the why under it), the
// utility rows with the current choice in pink, and the drive rows.
import { clamp01, el, f2, panel, stack } from "./dom.js";
/** Builds the view state from a Chooser decision and the drives. */
export function drivesBarsState(d, drives, o = {}) {
    const values = "values" in drives && typeof drives.values === "object" ? drives.values : drives;
    const s = {
        behavior: o.behavior ?? d.current,
        current: d.current,
        why: o.why ?? d.why,
        mode: o.sampled === false ? "argmax" : "sampled",
        utilities: { ...d.utilities },
        drives: { ...values },
        pending: d.pending && o.now !== undefined ? { id: d.pending.id, inMs: Math.max(0, (d.pending.at - o.now) * 1000) } : null,
    };
    if (o.seconds !== undefined)
        s.seconds = o.seconds;
    if (o.pink)
        s.pink = o.pink;
    return s;
}
/** The note under the utility rows while no switch is pending. */
export const DRIVES_NOTE = "each act scores by how much it would ease what it needs. it usually picks the best one and sticks with what it is doing.";
/** One gauge row per key, rebuilt only when the keys change. */
function rows(doc, r, label, items) {
    const keys = items.map((i) => i.k).join("\n");
    if (keys !== r.keys) {
        r.keys = keys;
        r.host.replaceChildren(...items.map((i) => {
            const row = el(doc, "div", "hb-gauge");
            row.setAttribute("role", "listitem");
            const meter = el(doc, "div", "hb-meter");
            meter.setAttribute("role", "meter");
            meter.setAttribute("aria-label", `${label} ${i.k}`);
            meter.setAttribute("aria-valuemin", "0");
            meter.append(el(doc, "i"));
            const lab = el(doc, "span", "hb-gauge-label", i.k);
            lab.title = i.k;
            row.append(lab, meter, el(doc, "span", "hb-gauge-value"));
            return row;
        }));
    }
    items.forEach((i, n) => {
        const row = r.host.children[n];
        row.classList.toggle("is-cur", i.cur);
        const meter = row.children[1];
        meter.setAttribute("aria-valuemax", String(i.max));
        meter.setAttribute("aria-valuenow", f2(i.v));
        meter.firstChild.style.width = `${(clamp01(i.v / i.max) * 100).toFixed(1)}%`;
        row.children[2].textContent = f2(i.v);
    });
}
/** Renders the behavior, utility and drives panels into `host`. */
export function drivesBars(host, o = {}) {
    const doc = host.ownerDocument;
    const col = stack(host);
    const beh = panel(doc, "behavior", "0.0 s");
    const name = el(doc, "p", "hb-marker", "idle");
    name.setAttribute("aria-live", "polite");
    const why = el(doc, "p", "hb-note");
    beh.root.append(name, why);
    const util = panel(doc, "utility", "sampled");
    const utilRows = el(doc, "div", "hb-gauges");
    utilRows.setAttribute("role", "list");
    utilRows.setAttribute("aria-label", "what each act is worth now");
    const note = el(doc, "p", "hb-note", o.note ?? DRIVES_NOTE);
    util.root.append(utilRows, note);
    const drv = panel(doc, "drives", "need 0 to 1");
    const driveRows = el(doc, "div", "hb-gauges");
    driveRows.setAttribute("role", "list");
    driveRows.setAttribute("aria-label", "drives");
    drv.root.append(driveRows);
    col.append(beh.root, util.root, drv.root);
    host.replaceChildren(col);
    const ur = { host: utilRows, keys: "" };
    const dr = { host: driveRows, keys: "" };
    return {
        root: host,
        update(s) {
            name.textContent = s.behavior;
            beh.aux.textContent = `${(s.seconds ?? 0).toFixed(1)} s`;
            why.textContent = s.why ?? "";
            why.hidden = !s.why;
            util.aux.textContent = s.mode ?? "sampled";
            const cur = s.current ?? s.behavior;
            const u = Object.entries(s.utilities).map(([k, v]) => ({ k, v: Number.isFinite(v) ? Math.max(0, v) : 0 }));
            const max = Math.max(1, ...u.map((x) => x.v));
            rows(doc, ur, "utility", u.map((x) => ({ ...x, max, cur: x.k === cur })));
            note.textContent = s.pending ? `next: ${s.pending.id} in ${Math.round(s.pending.inMs)} ms` : (o.note ?? DRIVES_NOTE);
            const pink = new Set(s.pink ?? []);
            rows(doc, dr, "drive", Object.entries(s.drives).map(([k, v]) => ({ k, v: clamp01(v), max: 1, cur: pink.has(k) })));
        },
        dispose() {
            host.replaceChildren();
        },
    };
}

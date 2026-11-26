// MapInset: the map a body builds from its own depth, drawn as an inset on
// the stage. Ported from the room original: a grid of cells (unknown, free,
// blocked) over the floor, the trail walked in pink and the body as a pink
// dot. Colours come from the hackbuild-ui tokens on the canvas, so the map
// follows the theme. The card is an EyeInset with one who.
import { eyeInset } from "./eye-inset.js";
const token = (c, name, or) => {
    const v = typeof getComputedStyle === "function" ? getComputedStyle(c).getPropertyValue(name).trim() : "";
    return v || or;
};
/** Draws one frame of the map; returns the mode line, as "212 cells seen". */
export function drawMap(canvas, m) {
    const g = canvas.getContext("2d");
    if (!g)
        return "";
    const W = canvas.width;
    const H = canvas.height;
    const s = Math.min(W, H) / (m.half * 2);
    const ox = (W - s * m.half * 2) / 2;
    const oy = (H - s * m.half * 2) / 2;
    const pink = token(canvas, "--hb-pink", "#fe0386");
    g.fillStyle = token(canvas, "--hb-paper-sunk", "#efe9db");
    g.fillRect(0, 0, W, H);
    const cw = (m.half * 2 * s) / m.cols;
    const ch = (m.half * 2 * s) / m.rows;
    const free = token(canvas, "--hb-paper-raised", "#fffdf7");
    const wall = token(canvas, "--hb-ink", "#1a1a1a");
    let seen = 0;
    for (let k = 0; k < m.cells.length; k++) {
        const v = m.cells[k];
        if (!v)
            continue;
        seen++;
        g.fillStyle = v === 2 ? wall : free;
        g.fillRect(ox + (k % m.cols) * cw, oy + Math.floor(k / m.cols) * ch, Math.ceil(cw), Math.ceil(ch));
    }
    const px = (x) => ox + (x + m.half) * s;
    const pz = (z) => oy + (z + m.half) * s;
    g.strokeStyle = pink;
    g.lineWidth = 1.5;
    g.beginPath();
    m.trail.forEach((p, i) => (i ? g.lineTo(px(p.x), pz(p.z)) : g.moveTo(px(p.x), pz(p.z))));
    g.stroke();
    g.fillStyle = pink;
    g.beginPath();
    g.arc(px(m.at.x), pz(m.at.z), 4, 0, Math.PI * 2);
    g.fill();
    return `${seen} cells seen`;
}
/** Makes `host` the map card; call `frame()` to draw. */
export function mapInset(host, o) {
    const size = o.size ?? 160;
    return eyeInset(host, {
        who: [{ id: "map", label: o.label ?? "map", title: "the map he built" }],
        draw: (c) => drawMap(c, o.map()),
        title: o.label ?? "map",
        width: size,
        height: size,
    });
}

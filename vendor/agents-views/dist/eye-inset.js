// EyeInset: the eye card on the stage. Ported from hackle's eye card: a
// canvas of what one of them sees, a who switch (the dog's eye, his eyes)
// and a mode line (dichromat, human colour). The card is a hackbuild-ui
// inset marked data-ux="inset", so a layout and the screen gate find it.
import { el } from "./dom.js";
/** Makes `host` the eye card: head with the mode line, the who switch, the canvas. */
export function eyeInset(host, o) {
    if (!o.who.length)
        throw new Error("@hackbuild/agents-views: eyeInset needs at least one who");
    const doc = host.ownerDocument;
    host.classList.add("hb-inset");
    host.dataset.ux = "inset";
    host.setAttribute("role", "figure");
    const w = o.width ?? 320;
    const h = o.height ?? 160;
    let sel = o.who.find((x) => x.id === o.selected) ?? o.who[0];
    // the head as hackbuild-ui's HbInset with who: title, the who switch (.hb-inset-who), the mode line
    const hd = el(doc, "div", "hb-inset-hd");
    const title = el(doc, "span", "hb-inset-title", o.title ?? "eye");
    const aux = el(doc, "span", "hb-hd-aux");
    const whoGroup = el(doc, "span", "hb-inset-who");
    whoGroup.setAttribute("role", "group");
    whoGroup.setAttribute("aria-label", "whose eyes");
    const buttons = o.who.map((x) => {
        const b = el(doc, "button", "", x.label);
        b.type = "button";
        if (x.title)
            b.title = x.title;
        b.addEventListener("click", () => pick(x.id, true));
        return b;
    });
    whoGroup.append(...buttons);
    hd.append(title, ...(o.who.length > 1 ? [whoGroup] : []), aux);
    const media = el(doc, "div", "hb-inset-media");
    media.style.setProperty("--hb-inset-ratio", `${w} / ${h}`);
    const canvas = o.canvas ?? el(doc, "canvas");
    if (!o.canvas) {
        canvas.width = w;
        canvas.height = h;
    }
    canvas.setAttribute("role", "img");
    media.append(canvas);
    host.replaceChildren(hd, media);
    function pick(id, user) {
        const next = o.who.find((x) => x.id === id);
        if (!next)
            return;
        sel = next;
        canvas.setAttribute("aria-label", sel.title ?? sel.label);
        buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(o.who[i] === sel)));
        if (user)
            o.onWho?.(sel.id);
    }
    pick(sel.id, false);
    const handle = {
        root: host,
        canvas,
        get who() {
            return sel;
        },
        select: (id) => pick(id, false),
        frame() {
            const who = sel;
            const run = () => {
                const m = o.draw(canvas, who);
                if (typeof m === "string")
                    aux.textContent = m;
            };
            if (who.eye)
                who.eye.render(run);
            else
                run();
        },
        mode(text) {
            aux.textContent = text;
        },
        dispose() {
            host.replaceChildren();
            host.classList.remove("hb-inset");
            delete host.dataset.ux;
        },
    };
    return handle;
}

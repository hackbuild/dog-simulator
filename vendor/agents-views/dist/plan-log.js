// PlanLog and StepLog: what an agent decided and what each step did.
// Ported from the room originals' mind tab: the last plan with who made it
// (rules, a reused plan or the model), the goals kept until done, the
// thoughts it had on its own (mutters, reflections), and a step log, one
// row per tool call with ok or warn at the right edge. The rows are
// hackbuild-ui's rack log (.hb-racklog).
import { el, panel, stack } from "./dom.js";
const VIA = { reflex: "rules", cache: "reused", model: "model", planner: "planner" };
const call = (s) => `${s.tool}(${s.args.map(String).join(", ")})`;
/** A plan book keeping at most `max` steps and thoughts (default 200). */
export function planBook(o = {}) {
    const max = o.max ?? 200;
    const now = o.now ?? (() => Date.now());
    let s = { plan: "", via: "", goals: [], thoughts: [], steps: [] };
    return {
        push(e) {
            if (e.type === "plan" && "plan" in e) {
                const p = e.plan;
                s = { ...s, via: VIA[e.via] ?? e.via, plan: `${p.think ? `${p.think}. ` : ""}${p.do.map(call).join(", ") || "no steps"}` };
                return true;
            }
            if (e.type === "step" && "result" in e) {
                const r = e.result;
                s = { ...s, steps: [...s.steps.slice(1 - max), { t: now(), line: `${call(r.step)}: ${r.text}`, ok: r.ok }] };
                return true;
            }
            return false;
        },
        think(kind, line) {
            s = { ...s, thoughts: [...s.thoughts.slice(1 - max), { t: now(), kind, line }] };
        },
        setGoals(lines) {
            s = { ...s, goals: [...lines] };
        },
        state: () => s,
        clear() {
            s = { plan: "", via: "", goals: [], thoughts: [], steps: [] };
        },
    };
}
const clock = (t) => new Date(t).toTimeString().slice(0, 8);
/** Fills an `ol.hb-racklog` with step rows, newest at the foot. */
function rows(list, steps) {
    const doc = list.ownerDocument;
    const follow = list.scrollHeight - list.scrollTop - list.clientHeight < 8;
    list.classList.toggle("is-empty", !steps.length);
    list.replaceChildren(...steps.map((x) => {
        const li = el(doc, "li", `hb-racklog-row is-${x.ok ? "ok" : "warn"}`);
        li.append(el(doc, "time", "hb-racklog-t", clock(x.t)), el(doc, "span", "hb-racklog-line", x.line), el(doc, "span", "hb-racklog-level", x.ok ? "ok" : "warn"));
        return li;
    }));
    if (follow)
        list.scrollTop = list.scrollHeight;
}
function logList(doc, label, empty) {
    const list = el(doc, "ol", "hb-racklog is-empty");
    list.setAttribute("role", "log");
    list.setAttribute("aria-live", "polite");
    list.setAttribute("aria-label", label);
    list.dataset.empty = empty;
    list.tabIndex = 0;
    return list;
}
/** The step log: one rack log row per tool call. */
export function stepLog(host, o = {}) {
    const list = logList(host.ownerDocument, o.label ?? "steps", o.empty ?? "no steps yet.");
    host.replaceChildren(list);
    return { update: (steps) => rows(list, steps), dispose: () => host.replaceChildren() };
}
/** The plan log: last plan with who made it, goals, thoughts, and the step log under them. */
export function planLog(host, o = {}) {
    const doc = host.ownerDocument;
    const col = stack(host);
    const plan = panel(doc, "last plan");
    const planText = el(doc, "p", "hb-note", o.empty ?? "none yet. give an order.");
    const goals = el(doc, "ul", "hb-list");
    plan.root.append(planText, goals);
    const thoughts = panel(doc, "thoughts");
    const thoughtList = el(doc, "ul", "hb-list");
    thoughts.root.append(thoughtList);
    const steps = panel(doc, "steps");
    const list = logList(doc, "steps", "no steps yet.");
    steps.root.append(list);
    col.append(plan.root, thoughts.root, ...(o.steps === false ? [] : [steps.root]));
    host.replaceChildren(col);
    return {
        update(s) {
            plan.aux.textContent = s.via;
            planText.textContent = s.plan || (o.empty ?? "none yet. give an order.");
            goals.hidden = !s.goals.length;
            goals.replaceChildren(...s.goals.map((g) => el(doc, "li", "", `goal ${g}`)));
            thoughts.root.hidden = !s.thoughts.length;
            thoughts.aux.textContent = s.thoughts.length ? String(s.thoughts.length) : "";
            thoughtList.replaceChildren(...s.thoughts
                .slice(-8)
                .reverse()
                .map((x) => {
                const li = el(doc, "li");
                li.append(el(doc, "b", "", x.kind), doc.createTextNode(` ${x.line}`));
                return li;
            }));
            rows(list, s.steps);
        },
        dispose: () => host.replaceChildren(),
    };
}

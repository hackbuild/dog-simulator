// The custom elements, for a plain HTML page as the originals are. Classes
// are made inside defineViews, so importing this module touches no DOM.
import { associationsTable } from "./associations-table.js";
import { drivesBars } from "./drives-bars.js";
import { eyeInset } from "./eye-inset.js";
/** The tag names `defineViews` registers. */
export const ELEMENT_NAMES = { drivesBars: "hb-drives-bars", associationsTable: "hb-associations-table", eyeInset: "hb-eye-inset" };
/** Defines the three elements once; safe to call again. */
export function defineViews(registry = customElements) {
    if (!registry.get(ELEMENT_NAMES.drivesBars)) {
        registry.define(ELEMENT_NAMES.drivesBars, class extends HTMLElement {
            #view = null;
            #state = null;
            get state() {
                return this.#state;
            }
            set state(s) {
                this.#state = s;
                if (s)
                    this.#view?.update(s);
            }
            connectedCallback() {
                const note = this.getAttribute("note");
                this.#view ??= drivesBars(this, note ? { note } : {});
                if (this.#state)
                    this.#view.update(this.#state);
            }
        });
    }
    if (!registry.get(ELEMENT_NAMES.associationsTable)) {
        registry.define(ELEMENT_NAMES.associationsTable, class extends HTMLElement {
            #view = null;
            #state = null;
            get state() {
                return this.#state;
            }
            set state(s) {
                this.#state = s;
                if (s)
                    this.#view?.update(s);
            }
            connectedCallback() {
                this.#view ??= associationsTable(this, { onReset: () => this.dispatchEvent(new CustomEvent("reset", { bubbles: true })) });
                if (this.#state)
                    this.#view.update(this.#state);
            }
        });
    }
    if (!registry.get(ELEMENT_NAMES.eyeInset)) {
        registry.define(ELEMENT_NAMES.eyeInset, class extends HTMLElement {
            #view = null;
            #options = null;
            get options() {
                return this.#options;
            }
            set options(o) {
                this.#options = o;
                this.#mount();
            }
            get view() {
                return this.#view;
            }
            connectedCallback() {
                this.#mount();
            }
            #mount() {
                if (!this.#options || !this.isConnected)
                    return;
                this.#view?.dispose();
                const o = this.#options;
                this.#view = eyeInset(this, {
                    ...o,
                    onWho: (id) => {
                        o.onWho?.(id);
                        this.dispatchEvent(new CustomEvent("who", { detail: id, bubbles: true }));
                    },
                });
            }
            frame() {
                this.#view?.frame();
            }
            mode(text) {
                this.#view?.mode(text);
            }
        });
    }
}

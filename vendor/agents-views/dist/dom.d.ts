export declare function el<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K];
/** An instrument panel: an ink head with a quieter value at its right. */
export declare function panel(doc: Document, title: string, aux?: string): {
    root: HTMLElement;
    aux: HTMLElement;
};
export declare const clamp01: (v: number) => number;
export declare const f2: (v: number) => string;
/** The panels of a view, stacked as hackle's blocks (.hb-rack-stack). The column is a
 * child, so the host keeps its own display and a hidden rack pane stays hidden. */
export declare function stack(host: HTMLElement): HTMLElement;

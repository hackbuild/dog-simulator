import { type AssociationsState } from "./associations-table.js";
import { type DrivesBarsState } from "./drives-bars.js";
import { type EyeInsetHandle, type EyeInsetOptions } from "./eye-inset.js";
/** The tag names `defineViews` registers. */
export declare const ELEMENT_NAMES: {
    readonly drivesBars: "hb-drives-bars";
    readonly associationsTable: "hb-associations-table";
    readonly eyeInset: "hb-eye-inset";
};
/** `<hb-drives-bars>`: set `.state` to a DrivesBarsState. */
export interface DrivesBarsElement extends HTMLElement {
    state: DrivesBarsState | null;
}
/** `<hb-associations-table>`: set `.state`; fires `reset` when reset learning is pressed. */
export interface AssociationsTableElement extends HTMLElement {
    state: AssociationsState | null;
}
/** `<hb-eye-inset>`: set `.options` (who and draw), then call `frame()` each frame; fires `who` with the id in `detail`. */
export interface EyeInsetElement extends HTMLElement {
    options: EyeInsetOptions | null;
    readonly view: EyeInsetHandle | null;
    frame(): void;
    mode(text: string): void;
}
/** Defines the three elements once; safe to call again. */
export declare function defineViews(registry?: CustomElementRegistry): void;

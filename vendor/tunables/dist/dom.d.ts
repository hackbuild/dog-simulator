import { type Registry } from "./index.js";
/** Group labels, open groups, class prefix, hash sync and export and import hooks of a panel. */
export interface PanelOptions {
    /** display names per group; groups without one show their key */
    groupLabels?: Record<string, string>;
    /** groups shown open; the layers group is open by default */
    open?: string[];
    /** a class prefix for styling, default "tn" */
    prefix?: string;
    /** writes the URL hash after each change (default false) */
    syncHash?: boolean;
    /** the document to build in, for tests or iframes */
    document?: Document;
    /** receives the export text; without it the panel downloads `fileName` */
    onExport?: (json: string) => void;
    fileName?: string;
    /** called after an import with the skipped keys, or the read error */
    onImport?: (skipped: string[], error: Error | null) => void;
    /** the location to sync, default `globalThis.location` */
    location?: {
        hash: string;
    };
    /**
     * history used to write the hash without a new entry per slider step,
     * default `globalThis.history` when `location` is the page's own; without
     * one the hash is assigned
     */
    history?: {
        readonly state: unknown;
        replaceState(data: unknown, unused: string, url?: string): void;
    };
}
/** A built panel: its root element, `refresh` to read the registry again and `dispose` to remove it. */
export interface Panel {
    root: HTMLElement;
    refresh(): void;
    dispose(): void;
}
/** Builds a tune panel for a registry inside `host` with DOM calls only and keeps both in step. */
export declare function bindPanel(host: HTMLElement, reg: Registry, opts?: PanelOptions): Panel;

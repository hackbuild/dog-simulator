import { type Registry } from "./index.js";
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
}
export interface Panel {
    root: HTMLElement;
    refresh(): void;
    dispose(): void;
}
export declare function bindPanel(host: HTMLElement, reg: Registry, opts?: PanelOptions): Panel;

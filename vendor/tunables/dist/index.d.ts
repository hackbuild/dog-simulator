/** Where a default value comes from (RULES.md: every number says which). */
export type Source = "measured" | "computed" | "vendor" | "inferred" | "unknown";
/** One tunable number: key, group, label, default, range, step, unit and where the default comes from. */
export interface ParamDef {
    key: string;
    group: string;
    label: string;
    def: number;
    min: number;
    max: number;
    step: number;
    /** unit shown beside the value: "s", "Hz", "m/s", "x" for a multiplier */
    unit?: string;
    note?: string;
    source?: Source;
    /** a citation for the default, shown beside the source */
    cite?: string;
}
/** A named set of values that `applyPreset` writes in one go. */
export interface Preset {
    label: string;
    values: Record<string, number>;
}
/** Minimal storage surface; `localStorage` fits, so does a Map wrapper in tests. */
export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
/** Master layer, storage, schema version, migrations and key renames of a registry. */
export interface RegistryOptions {
    /** the master layer: when it is 0 every `layer()` answers false */
    master?: string;
    storage?: StorageLike;
    storageKey?: string;
    /** schema version written with saved values (`{ ver, d }`) */
    version?: number;
    /**
     * Explicit migrations by the saved version. A save of another version with
     * no migration keeps nothing: its values go back to the current defaults.
     * Version 0 is a bare values object with no `ver` (the first export format).
     */
    migrate?: Record<number, (values: Record<string, number>) => Record<string, number>>;
    /**
     * Old key to new key, applied when loading saves, URL hashes and JSON.
     * Never change what an existing key means; give the new meaning a new key
     * and rename or drop the old one.
     */
    renames?: Record<string, string>;
}
/** Called with the key and the new value after any change. */
export type ChangeListener = (key: string, value: number) => void;
/** Saved form: the schema version and only the values that differ from their defaults. */
export interface Saved {
    ver: number;
    d: Record<string, number>;
}
/** The parameters, layers and presets of one app, with clamped set, saves, URL hash sharing and change events. */
export interface Registry {
    define(def: ParamDef): void;
    /** a layer switch: 1 on, 0 off, in group `layers` unless another is named */
    defineLayer(key: string, label: string, opts?: {
        group?: string;
        def?: 0 | 1;
        note?: string;
    }): void;
    has(key: string): boolean;
    def(key: string): ParamDef;
    get(key: string): number;
    /** clamps into the defined range; unknown keys throw; NaN and the infinities are ignored */
    set(key: string, value: number): void;
    /** master switch and layer switch both on */
    layer(key: string): boolean;
    reset(key?: string): void;
    keys(): string[];
    groups(): {
        group: string;
        keys: string[];
    }[];
    layers(): string[];
    snapshot(): Record<string, number>;
    /** current version values; unknown keys are skipped and returned */
    load(values: Record<string, number>): string[];
    /** only values that differ from their defaults, so new defaults reach old sessions */
    toJSON(): Saved;
    /** `{ ver, d }`; another version goes through `migrate` or keeps nothing */
    fromJSON(saved: unknown): string[];
    /** only the values that differ from their defaults */
    toUrlHash(): string;
    fromUrlHash(hash: string): string[];
    definePreset(name: string, preset: Preset): void;
    presets(): {
        name: string;
        label: string;
    }[];
    applyPreset(name: string): void;
    /** two snapshots of the current values, one with the layer on and one with it off */
    abPair(layer: string): {
        on: Record<string, number>;
        off: Record<string, number>;
    };
    /** reads the saved values from storage, if any */
    restore(): string[];
    onChange(fn: ChangeListener): () => void;
}
/** Makes an empty registry; define parameters and layers on it, then `restore` and `fromUrlHash`. */
export declare function createRegistry(opts?: RegistryOptions): Registry;
/** Decimal places a value of this step shows: 0 for whole steps, else enough for the step. */
export declare function decimalsFor(step: number): number;
/** A value as text with the decimal places its step calls for. */
export declare function formatValue(def: ParamDef, v: number): string;

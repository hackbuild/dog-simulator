/**
 * One weight store over OPFS, Cache Storage, IndexedDB parts and memory.
 *
 * A download is written as parts of `partBytes` (default 128 MB, the size
 * earlier builds use) with a meta record updated after each part. An
 * interrupted download keeps what it has; the next `get` asks the server
 * for the rest with a Range request guarded by If-Range, and starts over
 * when the server answers 200 instead of 206 or when the 206 carries a
 * different ETag or Last-Modified than the stored parts. The SHA-256 is computed as
 * the bytes stream in, and checked when the reference carries one.
 */
import { type Backend, type BackendName, type Meta } from "./backends.js";
export interface WeightRef {
    url: string;
    /** Cache key. Default: the URL. Use `gguf:<repo>/<file>` style keys to match older caches. */
    key?: string;
    /** Lowercase hex SHA-256 of the whole file, when known. */
    sha256?: string;
    /** Weight licence, stated on first load. Required: every model reference names one. */
    licence: string;
}
export interface Progress {
    key: string;
    loaded: number;
    /** null when the server sent no length; show an indeterminate bar counting MB. */
    total: number | null;
    fraction: number | null;
    /** true while existing parts are read back for a resume. */
    resuming: boolean;
}
export interface GetOptions {
    onProgress?: (p: Progress) => void;
    signal?: AbortSignal;
    /** Continue an interrupted download. Default true. */
    resume?: boolean;
}
export declare class WeightError extends Error {
    readonly code: "http" | "sha256" | "quota" | "abort" | "range";
    constructor(code: WeightError["code"], message: string);
}
export interface StoreOptions {
    /** Backend order to try, or backend objects. Default "auto": opfs, idb, cache, memory, skipping what is missing. */
    backends?: "auto" | readonly (BackendName | Backend)[];
    partBytes?: number;
    fetch?: typeof fetch;
    /** Called once per key per store with the licence line. Default console.info. */
    onNotice?: (line: string) => void;
    /** navigator.storage.estimate, injectable. */
    estimate?: () => Promise<{
        usage?: number;
        quota?: number;
    }>;
    /** navigator.storage.persist and persisted, injectable. */
    persist?: () => Promise<boolean>;
    persisted?: () => Promise<boolean>;
    /**
     * Web Locks, so pages and workers of one origin share one download per
     * key: the second page waits, then reads what the first stored. Default
     * navigator.locks where present; false turns it off.
     */
    locks?: LocksLike | false;
    /** Page protocol; "file:" removes opfs and cache from auto. */
    protocol?: string;
    now?: () => number;
}
/** The part of navigator.locks the store uses. */
export interface LocksLike {
    request<T>(name: string, opts: {
        signal?: AbortSignal;
    }, fn: () => Promise<T>): Promise<T>;
}
/** One download in flight, for a row with its own bar and cancel. */
export interface DownloadRow {
    key: string;
    url: string;
    loaded: number;
    total: number | null;
    fraction: number | null;
    /** Callers waiting on this download. */
    waiters: number;
}
export interface Estimate {
    used: number | null;
    quota: number | null;
    /** True when quota is unknown or free space is at least 1.2 times `bytes` (as earlier builds did). */
    fits(bytes: number): boolean;
}
export interface WeightStore {
    readonly backend: Backend;
    get(ref: WeightRef, opts?: GetOptions): Promise<Blob>;
    /** Bytes of a file, fetched once and shared by every caller until `release` (one fetch feeding many session attempts). */
    once(ref: WeightRef, opts?: GetOptions): Promise<Uint8Array>;
    release(key: string): void;
    /** Store weights the user supplied as a File, Blob or buffer. Checks the SHA-256 when the ref has one. */
    put(ref: Omit<WeightRef, "url"> & {
        url?: string;
        key: string;
    }, data: Blob | ArrayBuffer | Uint8Array): Promise<Blob>;
    has(key: string): Promise<boolean>;
    meta(key: string): Promise<Meta | null>;
    evict(key: string): Promise<void>;
    keys(): Promise<string[]>;
    estimate(): Promise<Estimate>;
    /** Downloads in flight, oldest first. */
    downloads(): DownloadRow[];
    /** Called with the rows whenever a download starts, moves or ends. Returns an unsubscribe. */
    onDownloads(fn: (rows: DownloadRow[]) => void): () => void;
    /** Stop one download for every caller waiting on it; its parts are kept for resume. False when nothing ran under the key. */
    cancel(key: string): boolean;
    /** Ask the browser not to clear this origin's storage (navigator.storage.persist). False when refused or missing. */
    persist(): Promise<boolean>;
    /** Whether the browser keeps this origin's storage; null when the browser cannot say. */
    persisted(): Promise<boolean | null>;
}
/**
 * Open a store. The first backend whose meta read works is used; a backend
 * that throws on open (OPFS on file://, a blocked IndexedDB) is skipped.
 */
export declare function openWeightStore(opts?: StoreOptions): Promise<WeightStore>;

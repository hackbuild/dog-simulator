/**
 * Storage backends. Each stores a weight file as numbered parts plus one
 * meta record, so every backend resumes the same way and a multi GB file
 * never has to sit in one buffer. Parts are Blobs, which lets the browser
 * keep them on disk.
 */
export type BackendName = "opfs" | "cache" | "idb" | "memory";
export interface Meta {
    key: string;
    url: string | null;
    licence: string;
    /** Total bytes from Content-Length or Content-Range, null when the server sent neither. */
    total: number | null;
    /** Byte length of each stored part, in order. */
    parts: number[];
    complete: boolean;
    etag: string | null;
    lastModified: string | null;
    /** SHA-256 hex of the complete file, set once it is complete. */
    sha256: string | null;
    updated: number;
}
export interface Backend {
    readonly name: BackendName;
    getMeta(key: string): Promise<Meta | null>;
    putMeta(meta: Meta): Promise<void>;
    getPart(key: string, n: number): Promise<Blob | null>;
    putPart(key: string, n: number, part: Blob): Promise<void>;
    /** Remove the meta and every part of a key. */
    remove(key: string): Promise<void>;
    keys(): Promise<string[]>;
}
export declare function memoryBackend(): Backend;
/**
 * IndexedDB parts, the layout earlier builds used: one `kv` store with
 * `<key>:meta` and `<key>:<n>` records. Works on file://.
 */
export declare function idbBackend(opts?: {
    db?: string;
    indexedDB?: IDBFactory;
}): Backend;
/** Cache Storage parts at synthetic URLs. Not available on file://. */
export declare function cacheBackend(opts?: {
    cache?: string;
    caches?: CacheStorage;
    origin?: string;
}): Backend;
/** The parts of FileSystemDirectoryHandle the OPFS backend uses. */
export interface DirLike {
    getDirectoryHandle(name: string, o?: {
        create?: boolean;
    }): Promise<DirLike>;
    getFileHandle(name: string, o?: {
        create?: boolean;
    }): Promise<{
        getFile(): Promise<Blob>;
        createWritable(): Promise<{
            write(d: Blob | string): Promise<void>;
            close(): Promise<void>;
        }>;
    }>;
    removeEntry(name: string, o?: {
        recursive?: boolean;
    }): Promise<void>;
    keys?(): AsyncIterable<string>;
}
/** Origin private file system: one directory per key, files `meta.json` and `<n>.part`. */
export declare function opfsBackend(opts?: {
    root?: () => Promise<DirLike>;
    dir?: string;
}): Backend;

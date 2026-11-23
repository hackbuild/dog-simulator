export interface RouteHit {
    /** a local file to serve */
    file?: string;
    /** or a body to serve */
    body?: string | Uint8Array;
    contentType?: string;
    /** checked before the file is served; a mismatch fails the request and is recorded */
    sha256?: string;
}
export type Route = (url: URL) => RouteHit | null;
export declare const contentTypeOf: (path: string) => string;
export declare function sha256File(path: string): string;
/** Resolves a hit to bytes, checking the pin. Throws on a missing file or a hash mismatch. */
export declare function serve(hit: RouteHit): {
    body: Uint8Array | string;
    contentType: string;
};
/**
 * npm CDN URLs (cdn.jsdelivr.net/npm, unpkg.com) served from a local
 * node_modules, only when the installed version equals the requested one.
 */
export declare function npmCdn(nodeModules: string): Route;
export interface LockEntry {
    /** the remote URL the page asks for */
    url: string;
    /** the local file, relative to the lock file's root */
    file: string;
    sha256: string;
}
/** Exact URLs pinned to local files with hashes, as in an assets lock. */
export declare function pinned(entries: readonly LockEntry[], root?: string): Route;
/** Google Fonts stylesheet requests answered with a fixed body (fonts then go through other routes). */
export declare function fixedBody(match: (u: URL) => boolean, body: string, contentType: string): Route;

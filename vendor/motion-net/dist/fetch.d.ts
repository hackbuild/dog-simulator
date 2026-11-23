import type { WeightLicence } from "./manifest.js";
export type WeightSource = string | URL | ArrayBuffer | ArrayBufferView | Blob;
export interface FetchOptions {
    /** Hex SHA-256 the bytes must match. */
    sha256?: string;
    /** Cache Storage name; the file is stored there after a verified download. */
    cache?: string;
    onProgress?: (fraction: number) => void;
    signal?: AbortSignal;
}
export declare function sha256Hex(bytes: ArrayBuffer): Promise<string>;
/** Fetches, verifies and optionally caches a weight file. */
export declare function fetchVerified(url: string | URL, opts?: FetchOptions): Promise<ArrayBuffer>;
/** Any weight source to bytes. */
export declare function readWeights(source: WeightSource, opts?: FetchOptions): Promise<ArrayBuffer>;
/** The licence line for a set of weights. */
export declare function licenceNotice(l: WeightLicence): string;
/**
 * States the weight licence once per weight name. The default sink is
 * console.info; pass one to show it in a page.
 */
export declare function stateLicence(l: WeightLicence, sink?: (line: string) => void): void;

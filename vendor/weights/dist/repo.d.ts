/**
 * Multi file models: ONNX graphs with external data files, transformers.js
 * repos (config, tokenizer, one or more .onnx files), GGUF split files.
 * Each file is an ordinary store entry, so resume and SHA-256 apply per file.
 */
import type { GetOptions, Progress, WeightStore } from "./store.js";
/** One file of a multi file repo, by its path in the repo, with an optional SHA-256. */
export interface RepoFile {
    /** Path inside the repo, e.g. "onnx/model_q4f16.onnx". */
    path: string;
    sha256?: string;
    /** A missing optional file (404) is skipped instead of failing the repo. */
    optional?: boolean;
}
/** A multi file model: base URL, file list, weight licence and key prefix. */
export interface RepoRef {
    /** Base URL ending in "/", e.g. hfResolve("onnx-community/x", "main"). */
    base: string;
    files: readonly RepoFile[];
    licence: string;
    /** Key prefix; default the base URL. */
    keyPrefix?: string;
}
/** Progress over a whole repo: the current file, bytes so far and the known total. */
export interface RepoProgress {
    file: string;
    fileProgress: Progress;
    /** Bytes of finished files plus the current file. */
    loaded: number;
    /** Sum of known totals; null while any file total is unknown. */
    total: number | null;
    index: number;
    count: number;
}
/** Hugging Face resolve URL base for a repo and revision. Pin a commit hash for reproducible loads. */
export declare function hfResolve(repo: string, revision?: string, host?: string): string;
/** Fetch every file of a repo in order. Returns path to Blob; skipped optional files are absent. */
export declare function getRepo(store: WeightStore, repo: RepoRef, opts?: Omit<GetOptions, "onProgress"> & {
    onProgress?: (p: RepoProgress) => void;
}): Promise<Map<string, Blob>>;
/**
 * onnxruntime-web `externalData` entries for a graph whose weights sit in
 * side files (model.onnx plus model.onnx_data). Pass the result as
 * `sessionOptions.externalData`.
 */
export declare function ortExternalData(files: Map<string, Blob>, graphPath: string): Promise<{
    path: string;
    data: Uint8Array;
}[]>;
/**
 * A cache object for transformers.js (`env.useCustomCache = true;
 * env.customCache = transformersCache(store, ...)`). URLs that
 * `licenceFor` names are downloaded through the store on `match`, so they
 * get parts, resume and the licence line; other URLs pass through to
 * transformers.js's own fetch and are stored on `put`. Keys that are not
 * http(s) URLs (the local model path) miss without a fetch.
 */
export declare function transformersCache(store: WeightStore, opts: {
    licenceFor: (url: string) => string | null;
    /** SHA-256 for a URL when known (e.g. pinnedSha from @hackbuild/models); the store checks it. */
    sha256For?: (url: string) => string | undefined;
    onProgress?: (p: Progress) => void;
    /** The URL a request is stored and fetched under, e.g. a resolve/main URL moved to its pinned revision (pinnedUrl from @hackbuild/models), so one file is fetched once. */
    keyFor?: (url: string) => string;
}): {
    match(req: string | Request): Promise<Response | undefined>;
    put(req: string | Request, res: Response): Promise<void>;
};

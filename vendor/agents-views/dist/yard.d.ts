/**
 * Where a yard asset comes from: a URL (fetched), the bytes, a Blob, or a function that returns
 * any of those. A string that starts with `data:` is read as a data URL.
 */
export type YardAsset = string | URL | ArrayBuffer | Uint8Array | Blob | (() => Promise<string | URL | ArrayBuffer | Uint8Array | Blob>);
/** Options of `mountYard`. */
export interface YardOptions {
    /**
     * Returns the `@dimforge/rapier3d-compat` module (or its default export). The yard calls
     * `init()` on it. It is a function so a host can load the 1.6 MB gzip (measured) core lazily,
     * from its own bundle or from a plain file.
     */
    physics: () => Promise<unknown>;
    /** The dog model, a binary glTF with the rig the yard expects. */
    dog: YardAsset;
    /** The person model, a binary glTF; null or left out draws a placeholder of capsules. */
    human?: YardAsset | null;
    /** The person's clip pack (JSON with roles, fps and clips), as an object or an asset. */
    anims: YardAsset | object;
    /** His voice reference, a wav for the cloned voice; left out, he speaks in a browser voice. */
    voice?: YardAsset | null;
    /** A model hub base URL for the cortex models in place of https://huggingface.co/. */
    hub?: string;
    /**
     * Where the readout chips, the setup button and the command button go, such as the host's
     * header. Left out, the two buttons float in the stage's top right corner, apart from the verbs,
     * and the chips are not shown.
     */
    bar?: HTMLElement | null;
    /**
     * The yard's switches as a query string: `test&seed=N` for lockstep, `seed=N&speed=S`,
     * `cortex=stub`, `stubloads`. Default: the page hash, when `reseed` is also left out.
     */
    params?: string;
    /** Runs a new seed (the tune tab's seed row). Left out with `params`, the row only reads. */
    reseed?: (params: string) => void;
    /** Opens the setup panel on a first visit (default true); the setup button opens it anyway. */
    setup?: boolean;
    /** The suite's base URL; links into it show only when it is set. */
    suiteUrl?: string;
}
/** What `mountYard` returns. */
export interface YardHandle {
    /** the yard root inside the host */
    readonly root: HTMLElement;
    /** resolves with the scope's test handle once the dog and his person stand in the yard */
    readonly ready: Promise<unknown>;
    /** stops the loop, the workers, the voice and the microphone, and empties the host */
    dispose(): void;
}
/**
 * Mounts the yard in `host`. The yard keeps one instance per page: its parts find each other by
 * id. Its stylesheet goes into the document head once. Load hackbuild-ui's `hackbuild.css` on the
 * page for the look.
 */
export declare function mountYard(host: HTMLElement, o: YardOptions): Promise<YardHandle>;

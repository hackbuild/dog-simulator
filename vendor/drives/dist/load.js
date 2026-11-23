// Loads the drives wasm once. The source can be a URL (fetched), bytes
// (ArrayBuffer or a typed array), a compiled WebAssembly.Module, or nothing,
// in which case the base64 copy in ./wasm/inline.js is decoded, which works
// from file:// where fetch of a local file is refused.
import initAsync, { initSync as initFromBytes } from "./wasm/drives.js";
let pending = null;
let ready = false;
const isBytes = (s) => s instanceof ArrayBuffer || ArrayBuffer.isView(s) || (typeof WebAssembly !== "undefined" && s instanceof WebAssembly.Module);
export function wasmReady() {
    return ready;
}
/** Instantiates the wasm. Later calls return the first load. */
export function loadWasm(source) {
    if (pending)
        return pending;
    pending = (async () => {
        let input = source;
        if (input === undefined)
            input = (await import("./wasm/inline.js")).wasmBytes();
        if (isBytes(input))
            initFromBytes({ module: input });
        else
            await initAsync({ module_or_path: input });
        ready = true;
    })();
    pending.catch(() => {
        pending = null;
    });
    return pending;
}
/** Synchronous load from bytes or a compiled module. */
export function loadWasmSync(source) {
    if (ready)
        return;
    initFromBytes({ module: source });
    ready = true;
    pending = Promise.resolve();
}
export function assertReady(pkg) {
    if (!ready)
        throw new Error(`${pkg}: wasm not loaded. call load() first.`);
}

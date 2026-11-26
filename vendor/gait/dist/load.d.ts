/** Where the wasm comes from: a URL or path to fetch, a Response, the bytes, or a compiled module. */
export type WasmSource = URL | string | Response | ArrayBuffer | ArrayBufferView | WebAssembly.Module;
export declare function wasmReady(): boolean;
/** Instantiates the wasm. Later calls return the first load. */
export declare function loadWasm(source?: WasmSource): Promise<void>;
/** Synchronous load from bytes or a compiled module. */
export declare function loadWasmSync(source: ArrayBuffer | ArrayBufferView | WebAssembly.Module): void;
export declare function assertReady(pkg: string): void;

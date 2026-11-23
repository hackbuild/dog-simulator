// Worker bootstrap, bundled to one script string at build time with the
// wasm inlined, so a page from file:// starts it from a blob.
import { createHost } from "./host.js";
import { loadWasm } from "./load.js";
const scope = globalThis;
const host = createHost((m, t) => scope.postMessage(m, t ?? []), () => loadWasm());
scope.onmessage = (e) => void host(e.data);

// The message host that runs a CPU model. The same function runs inside a
// worker and, when the page refuses blob workers, in the page behind a
// zero delay hop, so both paths speak one protocol.
import { createCpuModel } from "./cpu.js";
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
/** A handler for host requests; replies go to `post`. `ready` loads the wasm first. */
export function createHost(post, ready) {
    let model = null;
    return async (m) => {
        try {
            if (m.t === "load") {
                await ready();
                model?.dispose();
                model = createCpuModel(m.manifest, m.weights, m.accum);
                post({ t: "ready", bytes: model.bytes });
            }
            else if (m.t === "run") {
                if (!model)
                    throw new Error("motion-net: run before load");
                const t0 = now();
                const out = model.run(m.input, m.frames);
                post({ t: "out", id: m.id, out, ms: now() - t0 }, [out.buffer]);
            }
            else {
                model?.dispose();
                model = null;
            }
        }
        catch (e) {
            const reply = { t: "error", message: e instanceof Error ? e.message : String(e) };
            if (m.t === "run")
                reply.id = m.id;
            post(reply);
        }
    };
}

// Entry: three.js (WebGPU build), the glTF loader, orbit controls and Rapier are bundled;
// the scope modules (app/src/scope.json) run in one module scope generated at build time.
import type { HackleHandle, SimHandle } from "./sim/types.ts";
import "virtual:hackle-scope";

declare global {
  interface Window {
    __sim?: SimHandle;
    __hackle?: HackleHandle;
    __simSpeed?: number;
  }
}

export type { HackleHandle, SimHandle };

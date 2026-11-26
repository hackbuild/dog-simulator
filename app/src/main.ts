// The dog simulator page: a thin shell over @hackbuild/agents-views Yard. It holds the bar, the
// owner's dog, person and voice clip (embedded in the page at build time, so it opens from
// file:// and offline) and the physics core, bundled. The yard is the view.
import * as RAPIER from "@dimforge/rapier3d-compat";
import { mountYard } from "@hackbuild/agents-views/yard";
import type { HackleHandle, SimHandle } from "./sim/types.ts";

declare global {
  interface Window {
    __sim?: SimHandle;
    __hackle?: HackleHandle;
    __simSpeed?: number;
  }
}

declare const SUITE_URL: string;

const block = (id: string): string => (document.getElementById(id)?.textContent ?? "").trim();
const b64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const human = block("humanGLB");
const voice = block("voiceB64");

void mountYard(document.getElementById("yard") as HTMLElement, {
  physics: async () => RAPIER,
  dog: b64(block("dogGLB")),
  human: human ? b64(human) : null,
  anims: JSON.parse(block("humanAnims")) as object,
  voice: voice ? b64(voice) : null,
  bar: document.querySelector<HTMLElement>("#app>.hb-header"),
  suiteUrl: SUITE_URL,
});

export type { HackleHandle, SimHandle };

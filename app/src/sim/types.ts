// The typed surface of the app scope. The modules listed in app/src/scope.json share one
// module scope (the legacy layout, kept so traces hold); this file types what leaves it.

/** One trace row every 0.25 sim s; column names in scenarios/list.mjs COLS. */
export type TraceRow = [number, ...Array<number | string>];

export interface Trace {
  seed: number;
  steps: number;
  t: number;
  hash: string;
  rows: TraceRow[];
}

/** window.__sim, present when the page opens with #test&seed=N. */
export interface SimHandle {
  seed: number;
  /** fixed step length in sim seconds */
  dt: number;
  /** advance n fixed steps; resolves after any dog eye readback in those steps */
  step(n: number): Promise<number>;
  trace(): Trace;
  traceFrom(i: number): TraceRow[];
  /** render the main view once, for screenshots */
  render(): void;
  hash(): string;
}

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

/** window.__hackle: the scope objects the scenario runner reads. */
export interface HackleHandle {
  dog: { ready: boolean; pos: Vec3Like; yaw: number; v: number };
  HUM: { ready: boolean; pos: Vec3Like; yaw: number; v: number; task: { name: string } | null };
  brain: { cur: string; sub: string | null };
  NG: { ready: boolean; active: boolean; state: string };
  startTask(name: string, args?: object, why?: string): void;
  throwBall(to?: Vec3Like): void;
  time(): number;
}

export interface TestParams {
  seed: number;
  off: string[];
  on: string[];
  /** &nnacc=f32 or f64: the network's accumulation in place of the build default */
  nnacc: "f32" | "f64" | null;
}

/** Parse the test hash the same way sim/prelude.js does. */
export function parseTestHash(hash: string): TestParams | null {
  const h = new URLSearchParams(hash.replace(/^#/, ""));
  if (!h.has("test")) return null;
  return { seed: (Number(h.get("seed")) || 1) >>> 0, off: (h.get("off") ?? "").split(",").filter(Boolean), on: (h.get("on") ?? "").split(",").filter(Boolean), nnacc: h.get("nnacc") === "f32" || h.get("nnacc") === "f64" ? (h.get("nnacc") as "f32" | "f64") : null };
}

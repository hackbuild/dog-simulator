/** Uniform numbers in [0, 1). The family contract: injected, never Math.random. */
export type Rng = () => number;
/** Mulberry32, the same stream as the Rust `Mulberry32`. */
export declare function seededRng(seed: number): Rng;
/** A 32 bit seed drawn from an injected Rng; how a wasm object is seeded. */
export declare const seedFrom: (rng: Rng) => number;
/** Standard normal by Box Muller, u then v, as the crate draws them. */
export declare function gauss(rng: Rng): number;
/** Angular size in radians of an object of `size` metres at `dist` metres. */
export declare const angularSize: (size: number, dist: number) => number;
/** Time to contact tau = theta / (d theta / dt); Infinity when not growing. */
export declare function timeToContact(prevAngle: number, angle: number, dt: number): number;
/**
 * Heard azimuth (radians, 0 is +Z) for a source at `trueAzimuth`. Facing
 * the source narrows the error to 0.35 of `sdDeg`; otherwise 6 percent of
 * sounds mirror front to back about the body `yaw` (Guerineau 2022: dogs
 * 1.3 to 13.2 degrees, mean 7.6).
 */
export declare function localizeSound(trueAzimuth: number, yaw: number, sdDeg: number, facing: boolean, rng: Rng): number;

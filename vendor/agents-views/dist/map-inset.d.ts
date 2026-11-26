import { type EyeInsetHandle } from "./eye-inset.js";
/** The map as the view reads it. */
export interface MapState {
    /** cells across and down */
    cols: number;
    rows: number;
    /** row major, 0 unknown, 1 free, 2 blocked */
    cells: ArrayLike<number>;
    /** half the floor's side in metres; the map spans x and z from -half to half */
    half: number;
    /** points walked, in metres */
    trail: readonly {
        x: number;
        z: number;
    }[];
    /** where the body is */
    at: {
        x: number;
        z: number;
    };
}
/** Draws one frame of the map; returns the mode line, as "212 cells seen". */
export declare function drawMap(canvas: HTMLCanvasElement, m: MapState): string;
/** Options of `mapInset`. */
export interface MapInsetOptions {
    /** the map now; read on every `frame()` */
    map: () => MapState;
    /** canvas side in pixels (default 160) */
    size?: number;
    /** the head title (default "map") */
    label?: string;
}
/** Makes `host` the map card; call `frame()` to draw. */
export declare function mapInset(host: HTMLElement, o: MapInsetOptions): EyeInsetHandle;

/** A @hackbuild/cameras FirstPerson, or anything that hides a head round a draw. */
export interface EyeLike {
    render(draw: () => void): void;
}
/** One choice of the who switch: whose eyes the card draws. */
export interface EyeWho {
    /** the id `select` and `onWho` use */
    id: string;
    /** the switch label, as "dog eye" */
    label: string;
    /** a longer name for assistive tech, as "what the dog sees" */
    title?: string;
    /** the eye whose render wraps the draw, so its own head is hidden */
    eye?: EyeLike;
}
/** Options of `eyeInset`. */
export interface EyeInsetOptions {
    /** the who switch, at least one */
    who: readonly EyeWho[];
    /** the selected id; the first by default */
    selected?: string;
    /**
     * Draws one frame of `who` on the canvas, inside `who.eye.render` when there
     * is an eye. A returned string becomes the mode line.
     */
    draw: (canvas: HTMLCanvasElement, who: EyeWho) => string | void;
    /** canvas width in pixels (default 320) */
    width?: number;
    /** canvas height in pixels (default 160) */
    height?: number;
    /** the canvas, when a renderer owns it already (a three WebGLRenderer's) */
    canvas?: HTMLCanvasElement;
    /** the head title (default "eye") */
    title?: string;
    /** the user picked another who */
    onWho?: (id: string) => void;
}
/** What `eyeInset` returns: the canvas, the selected who and the frame call. */
export interface EyeInsetHandle {
    /** the host element, now the card */
    readonly root: HTMLElement;
    /** the canvas `draw` paints */
    readonly canvas: HTMLCanvasElement;
    /** the selected who */
    readonly who: EyeWho;
    /** selects a who without calling `onWho` */
    select(id: string): void;
    /** draws one frame of the selected eye */
    frame(): void;
    /** sets the mode line */
    mode(text: string): void;
    /** empties the host and removes the card classes */
    dispose(): void;
}
/** Makes `host` the eye card: head with the mode line, the who switch, the canvas. */
export declare function eyeInset(host: HTMLElement, o: EyeInsetOptions): EyeInsetHandle;

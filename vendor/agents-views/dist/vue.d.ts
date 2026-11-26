import { type PropType } from "vue";
import { type AssociationsState } from "./associations-table.js";
import { type DrivesBarsState } from "./drives-bars.js";
import { type EyeWho } from "./eye-inset.js";
import { type MapState } from "./map-inset.js";
import { type PlanLogState, type StepLine } from "./plan-log.js";
/** The behavior block, utility rows (current in pink) and drive rows. */
export declare const DrivesBars: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    state: {
        type: PropType<DrivesBarsState>;
        required: true;
    };
    note: {
        type: StringConstructor;
        default: undefined;
    };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    state: {
        type: PropType<DrivesBarsState>;
        required: true;
    };
    note: {
        type: StringConstructor;
        default: undefined;
    };
}>> & Readonly<{}>, {
    note: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
/** The cues by acts heat table with attention, the explanation and reset. Emits `reset`. */
export declare const AssociationsTable: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    state: {
        type: PropType<AssociationsState>;
        required: true;
    };
    limit: {
        type: NumberConstructor;
        default: number;
    };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "reset"[], "reset", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    state: {
        type: PropType<AssociationsState>;
        required: true;
    };
    limit: {
        type: NumberConstructor;
        default: number;
    };
}>> & Readonly<{
    onReset?: (...args: any[]) => any;
}>, {
    limit: number;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
/**
 * The eye card. `draw` paints a frame of the selected who; call the exposed
 * `frame()` each frame (a template ref). v-model:who is the selected id.
 */
export declare const EyeInset: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    who: {
        type: PropType<EyeWho[]>;
        required: true;
    };
    draw: {
        type: PropType<(canvas: HTMLCanvasElement, who: EyeWho) => string | void>;
        required: true;
    };
    selected: {
        type: StringConstructor;
        default: undefined;
    };
    width: {
        type: NumberConstructor;
        default: number;
    };
    height: {
        type: NumberConstructor;
        default: number;
    };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "update:selected"[], "update:selected", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    who: {
        type: PropType<EyeWho[]>;
        required: true;
    };
    draw: {
        type: PropType<(canvas: HTMLCanvasElement, who: EyeWho) => string | void>;
        required: true;
    };
    selected: {
        type: StringConstructor;
        default: undefined;
    };
    width: {
        type: NumberConstructor;
        default: number;
    };
    height: {
        type: NumberConstructor;
        default: number;
    };
}>> & Readonly<{
    "onUpdate:selected"?: (...args: any[]) => any;
}>, {
    selected: string;
    width: number;
    height: number;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
/** The plan log: last plan, goals, thoughts and steps. `steps: false` leaves the step log out. */
export declare const PlanLog: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    state: {
        type: PropType<PlanLogState>;
        required: true;
    };
    steps: {
        type: BooleanConstructor;
        default: boolean;
    };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    state: {
        type: PropType<PlanLogState>;
        required: true;
    };
    steps: {
        type: BooleanConstructor;
        default: boolean;
    };
}>> & Readonly<{}>, {
    steps: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
/** The step log: one rack log row per tool call. */
export declare const StepLog: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    steps: {
        type: PropType<readonly StepLine[]>;
        required: true;
    };
    empty: {
        type: StringConstructor;
        default: string;
    };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    steps: {
        type: PropType<readonly StepLine[]>;
        required: true;
    };
    empty: {
        type: StringConstructor;
        default: string;
    };
}>> & Readonly<{}>, {
    empty: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
/** The map card. `map` returns the map; call the exposed `frame()` to draw it (a template ref). */
export declare const MapInset: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    map: {
        type: PropType<() => MapState>;
        required: true;
    };
    size: {
        type: NumberConstructor;
        default: number;
    };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    map: {
        type: PropType<() => MapState>;
        required: true;
    };
    size: {
        type: NumberConstructor;
        default: number;
    };
}>> & Readonly<{}>, {
    size: number;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;

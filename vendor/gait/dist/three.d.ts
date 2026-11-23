import { type Object3D, Quaternion, Vector3 } from "three";
import { type BodyGeometry, type BodyPose, type GaitState, type LegSpec } from "./index.js";
export interface LegNames {
    up: string;
    mid: string;
    end: string;
    /** Bones from the end joint down to the toe tip. */
    toes: string[];
}
export interface QuadrupedNames {
    legs: {
        LF: LegNames;
        RF: LegNames;
        LH: LegNames;
        RH: LegNames;
    };
    /** The bone that carries the body's pitch, roll and drop. */
    hips: string;
    spine?: string[];
    tail?: string[];
    ears?: [string, string];
}
interface MeasuredLeg {
    up: Object3D;
    mid: Object3D;
    end: Object3D;
    /** End joint to toe tip at rest, root space. */
    paw: Vector3;
    pole: Vector3;
    endRest: Quaternion;
}
export interface QuadrupedRig {
    root: Object3D;
    hips: Object3D;
    legs: MeasuredLeg[];
    spine: Object3D[];
    tail: Object3D[];
    ears: Object3D[];
    specs: LegSpec[];
    legLength: number;
    geometry: BodyGeometry;
    rest: Map<Object3D, {
        p: Vector3;
        q: Quaternion;
        s: Vector3;
    }>;
}
/**
 * Measures leg spots, toe heights, leg length and track width from the rest
 * pose. `root` must sit at the origin with identity rotation and face +Z
 * when this runs. Names can come from `@hackbuild/rig` `limbChains`.
 */
export declare function measureQuadruped(root: Object3D, names: QuadrupedNames): QuadrupedRig;
export interface DriveExtras {
    /** Tail link yaw angles and the root link lift, from `TailWag`. */
    tail?: {
        yaw: number[];
        lift: number;
    };
    /** Ear angles, from `Ears`. */
    ears?: [number, number];
    /** Leg IK on or off. Default on. */
    ik?: boolean;
}
/** Writes one frame of gait and body state onto the rig. Returns the legs whose target was out of reach. */
export declare function driveQuadruped(rig: QuadrupedRig, pose: {
    x: number;
    z: number;
    yaw: number;
}, gait: GaitState, body: BodyPose, extras?: DriveExtras): number[];
export {};

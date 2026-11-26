/** The 27 bones of the network's dog skeleton, in the order of its input and output. */
export declare const BONES: readonly ["Hips", "Spine", "Spine1", "Neck", "Head", "HeadSite", "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand", "LeftHandSite", "RightShoulder", "RightArm", "RightForeArm", "RightHand", "RightHandSite", "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftFootSite", "RightUpLeg", "RightLeg", "RightFoot", "RightFootSite", "Tail", "Tail1", "Tail1Site"];
/** One bone name of `BONES`. */
export type BoneName = (typeof BONES)[number];
/** The number of bones in `BONES`. */
export declare const BONE_COUNT = 27;
/** Parent index per bone, -1 for the root. */
export declare const PARENTS: readonly number[];
/** The style labels the network was trained on. */
export declare const STYLES: readonly ["Canter", "Idle", "Jump", "Lie", "Pace", "Sit", "Stand", "Trot", "Walk"];
/** One style label of `STYLES`. */
export type StyleLabel = (typeof STYLES)[number];
/** Paws in contact order: front left, front right, hind left, hind right. */
export declare const PAWS: readonly ["front left", "front right", "hind left", "hind right"];
/** Per paw: the end site, the paw bone, the lower and upper limb bones. */
export declare const PAW_CHAINS: readonly {
    site: number;
    paw: number;
    lower: number;
    upper: number;
}[];
/** Input vector offsets. */
export declare const IN: {
    readonly positions: 0;
    readonly velocities: 81;
    readonly trajPositions: 162;
    readonly trajDirections: 194;
    readonly trajVelocities: 226;
    readonly style: 258;
    readonly length: 339;
};
/** Output vector offsets, per frame. */
export declare const OUT: {
    readonly dx: 0;
    readonly dyaw: 1;
    readonly dz: 2;
    readonly positions: 3;
    readonly axisZ: 84;
    readonly axisY: 165;
    readonly velocities: 246;
    readonly contacts: 327;
    readonly style: 331;
    readonly length: 412;
};
/** Frames in one prediction. */
export declare const FRAMES = 16;
/** Seconds between predicted frames and between trajectory samples. */
export declare const FRAME_DT: number;
/** Trajectory samples in one network input. */
export declare const TRAJ_SAMPLES = 16;

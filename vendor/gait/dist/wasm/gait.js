/* @ts-self-types="./gait.d.ts" */

/**
 * Body dynamics with the dog postures (sit, down, bow, reach).
 */
export class BodyDynamics {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BodyDynamicsFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_bodydynamics_free(ptr, 0);
    }
    /**
     * `geometry` is `[frontZ, rearZ, halfWidth, size]`.
     * @param {Float64Array} geometry
     * @param {number} seed
     */
    constructor(geometry, seed) {
        const ptr0 = passArrayF64ToWasm0(geometry, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.bodydynamics_new(ptr0, len0, seed);
        this.__wbg_ptr = ret;
        BodyDynamicsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Returns `[rootY, drop, dz, pitch, roll, bend, flex, breathe, posture x4,
     * legOffsets x8, tilt x4]`.
     * @param {number} dt
     * @param {Float64Array} weights
     * @param {number} phase
     * @param {boolean} standing
     * @param {number} v
     * @param {number} w
     * @param {Float64Array} posture_goals
     * @param {Float64Array} ground
     * @param {number} breath_rate
     * @param {number} breath_depth
     * @returns {Float64Array}
     */
    update(dt, weights, phase, standing, v, w, posture_goals, ground, breath_rate, breath_depth) {
        const ptr0 = passArrayF64ToWasm0(weights, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(posture_goals, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArrayF64ToWasm0(ground, wasm.__wbindgen_malloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.bodydynamics_update(this.__wbg_ptr, dt, ptr0, len0, phase, standing, v, w, ptr1, len1, ptr2, len2, breath_rate, breath_depth);
        var v4 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v4;
    }
}
if (Symbol.dispose) BodyDynamics.prototype[Symbol.dispose] = BodyDynamics.prototype.free;

export class EarPair {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        EarPairFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_earpair_free(ptr, 0);
    }
    /**
     * @param {number} halflife
     */
    constructor(halflife) {
        const ret = wasm.earpair_new(halflife);
        this.__wbg_ptr = ret;
        EarPairFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {number} dt
     * @param {number} perk
     * @param {number} negative
     * @param {number} head_yaw_rate
     * @param {number} flap
     * @param {number} bounce
     * @returns {Float64Array}
     */
    update(dt, perk, negative, head_yaw_rate, flap, bounce) {
        const ret = wasm.earpair_update(this.__wbg_ptr, dt, perk, negative, head_yaw_rate, flap, bounce);
        var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
}
if (Symbol.dispose) EarPair.prototype[Symbol.dispose] = EarPair.prototype.free;

/**
 * A gait with its own seeded stream. `legs` holds `x z toe front` per leg
 * (front 1 or 0), in LF RF LH RH order for a quadruped.
 */
export class Gait {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GaitFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_gait_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    duty() {
        const ret = wasm.gait_duty(this.__wbg_ptr);
        return ret;
    }
    /**
     * `x height z stance swing` per foot; height is above the ground.
     * @returns {Float64Array}
     */
    feet() {
        const ret = wasm.gait_feet(this.__wbg_ptr);
        var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * @returns {number}
     */
    frequency() {
        const ret = wasm.gait_frequency(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    froude() {
        const ret = wasm.gait_froude(this.__wbg_ptr);
        return ret;
    }
    /**
     * Phase per leg, 0 at touchdown.
     * @returns {Float64Array}
     */
    legPhases() {
        const ret = wasm.gait_legPhases(this.__wbg_ptr);
        var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * @param {Float64Array} legs
     * @param {number} leg_length
     * @param {number} seed
     */
    constructor(legs, leg_length, seed) {
        const ptr0 = passArrayF64ToWasm0(legs, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.gait_new(ptr0, len0, leg_length, seed);
        this.__wbg_ptr = ret;
        GaitFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * World nominal spots `x z` per leg for a body at `x z yaw`.
     * @param {number} x
     * @param {number} z
     * @param {number} yaw
     * @returns {Float64Array}
     */
    nominal(x, z, yaw) {
        const ret = wasm.gait_nominal(this.__wbg_ptr, x, z, yaw);
        var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * @returns {number}
     */
    phase() {
        const ret = wasm.gait_phase(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} x
     * @param {number} z
     * @param {number} yaw
     */
    reset(x, z, yaw) {
        wasm.gait_reset(this.__wbg_ptr, x, z, yaw);
    }
    /**
     * Per leg posture offsets, `x z` per leg in the body frame.
     * @param {Float64Array} xz
     */
    setOffsets(xz) {
        const ptr0 = passArrayF64ToWasm0(xz, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.gait_setOffsets(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {number} bias
     */
    setPaceBias(bias) {
        wasm.gait_setPaceBias(this.__wbg_ptr, bias);
    }
    /**
     * @returns {boolean}
     */
    standing() {
        const ret = wasm.gait_standing(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Advances one frame; returns a bit per leg that touched down.
     * @param {number} dt
     * @param {number} x
     * @param {number} z
     * @param {number} yaw
     * @param {number} v
     * @param {number} w
     * @param {number} posed
     * @returns {number}
     */
    update(dt, x, z, yaw, v, w, posed) {
        const ret = wasm.gait_update(this.__wbg_ptr, dt, x, z, yaw, v, w, posed);
        return ret >>> 0;
    }
    /**
     * @returns {Float64Array}
     */
    weights() {
        const ret = wasm.gait_weights(this.__wbg_ptr);
        var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
}
if (Symbol.dispose) Gait.prototype[Symbol.dispose] = Gait.prototype.free;

/**
 * Phase, duty and stride frequency from foot contacts, for motor sources
 * without an oscillator.
 */
export class PhaseEstimator {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PhaseEstimatorFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_phaseestimator_free(ptr, 0);
    }
    /**
     * @param {number} legs
     * @param {number} reference
     */
    constructor(legs, reference) {
        const ret = wasm.phaseestimator_new(legs, reference);
        this.__wbg_ptr = ret;
        PhaseEstimatorFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * `contacts` is 1 or 0 per leg. Returns `[phase, duty, strideFrequency]`.
     * @param {number} dt
     * @param {Uint8Array} contacts
     * @returns {Float64Array}
     */
    update(dt, contacts) {
        const ptr0 = passArray8ToWasm0(contacts, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.phaseestimator_update(this.__wbg_ptr, dt, ptr0, len0);
        var v2 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v2;
    }
}
if (Symbol.dispose) PhaseEstimator.prototype[Symbol.dispose] = PhaseEstimator.prototype.free;

export class Wag {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WagFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wag_free(ptr, 0);
    }
    /**
     * @param {number} links
     * @param {number} halflife
     * @param {number} seed
     */
    constructor(links, halflife, seed) {
        const ret = wasm.wag_new(links, halflife, seed);
        this.__wbg_ptr = ret;
        WagFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Returns `[mode, lift, yaw per link]`.
     * @param {number} dt
     * @param {Float64Array} mode_weights
     * @param {number} arousal
     * @param {number} lift
     * @param {number} bias
     * @param {number} turn_rate
     * @param {number} amp_scale
     * @param {number} hz_scale
     * @returns {Float64Array}
     */
    update(dt, mode_weights, arousal, lift, bias, turn_rate, amp_scale, hz_scale) {
        const ptr0 = passArrayF64ToWasm0(mode_weights, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wag_update(this.__wbg_ptr, dt, ptr0, len0, arousal, lift, bias, turn_rate, amp_scale, hz_scale);
        var v2 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v2;
    }
}
if (Symbol.dispose) Wag.prototype[Symbol.dispose] = Wag.prototype.free;

/**
 * @param {number} seed
 * @returns {Float64Array}
 */
export function goldenTrace(seed) {
    const ret = wasm.goldenTrace(seed);
    var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    return v1;
}

/**
 * Quadruped footfall tables, 9 numbers each: four offsets, duty, clearance,
 * freq0, freqV, freqW.
 * @returns {Float64Array}
 */
export function quadrupedTables() {
    const ret = wasm.quadrupedTables();
    var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    return v1;
}

/**
 * Two bone leg solve; see `@hackbuild/ik` `twoBone` for the layout.
 * @param {Float64Array} abc
 * @param {Float64Array} target
 * @param {Float64Array} pole
 * @returns {Float64Array}
 */
export function solveLeg(abc, target, pole) {
    const ptr0 = passArrayF64ToWasm0(abc, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF64ToWasm0(target, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayF64ToWasm0(pole, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.solveLeg(ptr0, len0, ptr1, len1, ptr2, len2);
    var v4 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    return v4;
}

/**
 * `obstacles` holds `x z r` each; `params` is `[speed, stopDistance,
 * clearance, influence, turnSlow, turnFast, fence]` or empty for the
 * defaults. Returns `[v, w, arrived]`.
 * @param {number} x
 * @param {number} z
 * @param {number} yaw
 * @param {number} v
 * @param {number} tx
 * @param {number} tz
 * @param {Float64Array} obstacles
 * @param {Float64Array} params
 * @returns {Float64Array}
 */
export function steer(x, z, yaw, v, tx, tz, obstacles, params) {
    const ptr0 = passArrayF64ToWasm0(obstacles, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayF64ToWasm0(params, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.steer(x, z, yaw, v, tx, tz, ptr0, len0, ptr1, len1);
    var v3 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    return v3;
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_41e9ee4f547fc59a: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./gait_bg.js": import0,
    };
}

const BodyDynamicsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_bodydynamics_free(ptr, 1));
const EarPairFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_earpair_free(ptr, 1));
const GaitFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_gait_free(ptr, 1));
const PhaseEstimatorFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_phaseestimator_free(ptr, 1));
const WagFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wag_free(ptr, 1));

function getArrayF64FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat64ArrayMemory0().subarray(ptr / 8, ptr / 8 + len);
}

let cachedFloat64ArrayMemory0 = null;
function getFloat64ArrayMemory0() {
    if (cachedFloat64ArrayMemory0 === null || cachedFloat64ArrayMemory0.byteLength === 0) {
        cachedFloat64ArrayMemory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayF64ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 8, 8) >>> 0;
    getFloat64ArrayMemory0().set(arg, ptr / 8);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedFloat64ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('gait_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };

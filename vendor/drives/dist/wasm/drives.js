/* @ts-self-types="./drives.d.ts" */

export class Chooser {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ChooserFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_chooser_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get current() {
        const ret = wasm.chooser_current(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get dwellUntil() {
        const ret = wasm.chooser_dwellUntil(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {boolean}
     */
    get isDone() {
        const ret = wasm.chooser_isDone(this.__wbg_ptr);
        return ret !== 0;
    }
    markDone() {
        wasm.chooser_markDone(this.__wbg_ptr);
    }
    /**
     * `opts`: temperature, commitment, dwell mu, dwell tail, react mu, react tail, react margin, sample (0 or 1), noise (0 or 1).
     * @param {string[]} names
     * @param {Float64Array} opts
     * @param {number} seed
     * @param {number} start
     */
    constructor(names, opts, seed, start) {
        const ptr0 = passArrayJsValueToWasm0(names, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(opts, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.chooser_new(ptr0, len0, ptr1, len1, seed, start);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0];
        ChooserFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {number} t
     * @param {number} commitment
     */
    setTemperature(t, commitment) {
        wasm.chooser_setTemperature(this.__wbg_ptr, t, commitment);
    }
    /**
     * @param {number} option
     * @param {number} now
     */
    set(option, now) {
        wasm.chooser_set(this.__wbg_ptr, option, now);
    }
    /**
     * `[current, switched, pending option or -1, pending at, reason,
     * option, utility, best, best utility, probability, latency]`;
     * reasons 0 hold, 1 top, 2 sampled, 3 reactive, 4 forced, 5 argmax, 6 fired.
     * @param {number} now
     * @param {Float64Array} utilities
     * @param {Uint8Array} reactive
     * @param {number} forced
     * @returns {Float64Array}
     */
    update(now, utilities, reactive, forced) {
        const ptr0 = passArrayF64ToWasm0(utilities, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(reactive, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.chooser_update(this.__wbg_ptr, now, ptr0, len0, ptr1, len1, forced);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v3 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v3;
    }
    /**
     * @returns {string}
     */
    get why() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.chooser_why(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}
if (Symbol.dispose) Chooser.prototype[Symbol.dispose] = Chooser.prototype.free;

export class CueLearner {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CueLearnerFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_cuelearner_free(ptr, 0);
    }
    /**
     * @param {number} cue
     * @returns {number}
     */
    associability(cue) {
        const ret = wasm.cuelearner_associability(this.__wbg_ptr, cue);
        return ret;
    }
    /**
     * @param {string} cue
     * @returns {number}
     */
    cueIndex(cue) {
        const ptr0 = passStringToWasm0(cue, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.cuelearner_cueIndex(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @returns {string[]}
     */
    cues() {
        const ret = wasm.cuelearner_cues(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]);
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @param {number} dt
     */
    decay(dt) {
        wasm.cuelearner_decay(this.__wbg_ptr, dt);
    }
    /**
     * @param {string} cue
     * @returns {number}
     */
    ensure(cue) {
        const ptr0 = passStringToWasm0(cue, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.cuelearner_ensure(this.__wbg_ptr, ptr0, len0);
        return ret >>> 0;
    }
    /**
     * @param {number} cue
     * @param {number} action
     * @returns {number}
     */
    excitation(cue, action) {
        const ret = wasm.cuelearner_excitation(this.__wbg_ptr, cue, action);
        return ret;
    }
    /**
     * @param {number} cue
     * @param {number} action
     * @returns {number}
     */
    inhibition(cue, action) {
        const ret = wasm.cuelearner_inhibition(this.__wbg_ptr, cue, action);
        return ret;
    }
    /**
     * @param {number} action
     * @param {number} now
     */
    markDone(action, now) {
        wasm.cuelearner_markDone(this.__wbg_ptr, action, now);
    }
    /**
     * `opts`: alpha, theta, trace seconds, inhibition decay, offer rate, ignore, cue mu, cue tail, noise (0 or 1).
     * @param {number} actions
     * @param {Float64Array} opts
     * @param {number} seed
     */
    constructor(actions, opts, seed) {
        const ptr0 = passArrayF64ToWasm0(opts, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.cuelearner_new(actions, ptr0, len0, seed);
        this.__wbg_ptr = ret;
        CueLearnerFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {number} action
     * @param {number} now
     */
    offerTrick(action, now) {
        wasm.cuelearner_offerTrick(this.__wbg_ptr, action, now);
    }
    /**
     * @param {number} action
     * @returns {number}
     */
    offer(action) {
        const ret = wasm.cuelearner_offer(this.__wbg_ptr, action);
        return ret;
    }
    /**
     * `[kind, action, offered, latency]`; kind 0 ignored, 1 none, 2 act.
     * @param {string} cue
     * @param {number} now
     * @param {number} distraction
     * @param {number} trainability
     * @param {boolean} watched
     * @param {Uint8Array} offerable
     * @returns {Float64Array}
     */
    respond(cue, now, distraction, trainability, watched, offerable) {
        const ptr0 = passStringToWasm0(cue, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(offerable, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.cuelearner_respond(this.__wbg_ptr, ptr0, len0, now, distraction, trainability, watched, ptr1, len1);
        var v3 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v3;
    }
    /**
     * `[cue or -1, action, value, credit]` or empty when nothing was eligible.
     * @param {number} r
     * @param {number} now
     * @param {number} trainability
     * @returns {Float64Array}
     */
    reward(r, now, trainability) {
        const ret = wasm.cuelearner_reward(this.__wbg_ptr, r, now, trainability);
        var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * @param {number} cue
     * @param {number} a
     */
    setAssociability(cue, a) {
        wasm.cuelearner_setAssociability(this.__wbg_ptr, cue, a);
    }
    /**
     * @param {number} action
     * @param {number} v
     */
    setOffer(action, v) {
        wasm.cuelearner_setOffer(this.__wbg_ptr, action, v);
    }
    /**
     * @param {number} cue
     * @param {number} action
     * @param {number} w
     * @param {number} n
     */
    setWeight(cue, action, w, n) {
        wasm.cuelearner_setWeight(this.__wbg_ptr, cue, action, w, n);
    }
    /**
     * @param {number} cue
     * @param {number} action
     * @returns {number}
     */
    value(cue, action) {
        const ret = wasm.cuelearner_value(this.__wbg_ptr, cue, action);
        return ret;
    }
}
if (Symbol.dispose) CueLearner.prototype[Symbol.dispose] = CueLearner.prototype.free;

export class Drives {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DrivesFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_drives_free(ptr, 0);
    }
    /**
     * @param {Float64Array} h
     * @returns {number}
     */
    distance(h) {
        const ptr0 = passArrayF64ToWasm0(h, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.drives_distance(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {number} dt
     * @param {Float64Array} rates
     */
    grow(dt, rates) {
        const ptr0 = passArrayF64ToWasm0(rates, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.drives_grow(this.__wbg_ptr, dt, ptr0, len0);
    }
    /**
     * @param {Float64Array} weights
     * @param {number} n
     * @param {number} m
     * @param {number} gain
     */
    constructor(weights, n, m, gain) {
        const ptr0 = passArrayF64ToWasm0(weights, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.drives_new(ptr0, len0, n, m, gain);
        this.__wbg_ptr = ret;
        DrivesFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {Float64Array} effect
     * @param {number} scale
     * @returns {number}
     */
    rewardOf(effect, scale) {
        const ptr0 = passArrayF64ToWasm0(effect, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.drives_rewardOf(this.__wbg_ptr, ptr0, len0, scale);
        return ret;
    }
    /**
     * @param {number} n
     * @param {number} m
     * @param {number} gain
     */
    setShape(n, m, gain) {
        wasm.drives_setShape(this.__wbg_ptr, n, m, gain);
    }
    /**
     * @param {Float64Array} v
     */
    setValues(v) {
        const ptr0 = passArrayF64ToWasm0(v, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.drives_setValues(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @returns {Float64Array}
     */
    values() {
        const ret = wasm.drives_values(this.__wbg_ptr);
        var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
}
if (Symbol.dispose) Drives.prototype[Symbol.dispose] = Drives.prototype.free;

export class MemoryStream {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MemoryStreamFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_memorystream_free(ptr, 0);
    }
    /**
     * @param {string} text
     * @param {number} importance
     * @param {number} hour
     */
    add(text, importance, hour) {
        const ptr0 = passStringToWasm0(text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.memorystream_add(this.__wbg_ptr, ptr0, len0, importance, hour);
    }
    /**
     * @returns {number}
     */
    get length() {
        const ret = wasm.memorystream_length(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * `importance, hour` per memory, newest first.
     * @returns {Float64Array}
     */
    meta() {
        const ret = wasm.memorystream_meta(this.__wbg_ptr);
        var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * @param {number} capacity
     * @param {number} decay
     */
    constructor(capacity, decay) {
        const ret = wasm.memorystream_new(capacity, decay);
        this.__wbg_ptr = ret;
        MemoryStreamFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {number}
     */
    get pendingImportance() {
        const ret = wasm.memorystream_pendingImportance(this.__wbg_ptr);
        return ret;
    }
    /**
     * Indices into `texts()` of the best `k`, highest score first.
     * @param {number} hour
     * @param {string[]} cues
     * @param {number} k
     * @returns {Uint32Array}
     */
    retrieve(hour, cues, k) {
        const ptr0 = passArrayJsValueToWasm0(cues, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.memorystream_retrieve(this.__wbg_ptr, hour, ptr0, len0, k);
        var v2 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v2;
    }
    /**
     * @param {number} budget
     * @returns {boolean}
     */
    shouldReflect(budget) {
        const ret = wasm.memorystream_shouldReflect(this.__wbg_ptr, budget);
        return ret !== 0;
    }
    /**
     * @returns {string[]}
     */
    texts() {
        const ret = wasm.memorystream_texts(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]);
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
}
if (Symbol.dispose) MemoryStream.prototype[Symbol.dispose] = MemoryStream.prototype.free;

export class Sleep {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SleepFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_sleep_free(ptr, 0);
    }
    /**
     * @param {number} hour
     * @param {boolean} running
     * @returns {number}
     */
    fatigue(hour, running) {
        const ret = wasm.sleep_fatigue(this.__wbg_ptr, hour, running);
        return ret;
    }
    /**
     * @returns {Uint8Array}
     */
    hypnogram() {
        const ret = wasm.sleep_hypnogram(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @param {boolean} negative
     */
    lieDown(negative) {
        wasm.sleep_lieDown(this.__wbg_ptr, negative);
    }
    /**
     * `opts`: up, down, nrem, rem, wake chance, enough.
     * @param {Float64Array} opts
     * @param {number} pressure
     * @param {number} seed
     */
    constructor(opts, pressure, seed) {
        const ptr0 = passArrayF64ToWasm0(opts, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.sleep_new(ptr0, len0, pressure, seed);
        this.__wbg_ptr = ret;
        SleepFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {number} game_hours
     * @param {number} activity
     */
    pressureStep(game_hours, activity) {
        wasm.sleep_pressureStep(this.__wbg_ptr, game_hours, activity);
    }
    /**
     * @returns {number}
     */
    get pressure() {
        const ret = wasm.sleep_pressure(this.__wbg_ptr);
        return ret;
    }
    sample() {
        wasm.sleep_sample(this.__wbg_ptr);
    }
    /**
     * @param {number} p
     */
    set pressure(p) {
        wasm.sleep_set_pressure(this.__wbg_ptr, p);
    }
    /**
     * @param {number} hour
     * @returns {number}
     */
    sleepiness(hour) {
        const ret = wasm.sleep_sleepiness(this.__wbg_ptr, hour);
        return ret;
    }
    /**
     * 0 awake, 1 onset, 2 nrem, 3 rem, 4 wake
     * @returns {number}
     */
    get stage() {
        const ret = wasm.sleep_stage(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} game_minutes
     * @param {number} hour
     * @param {boolean} negative
     * @returns {boolean}
     */
    step(game_minutes, hour, negative) {
        const ret = wasm.sleep_step(this.__wbg_ptr, game_minutes, hour, negative);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    wakeThreshold() {
        const ret = wasm.sleep_wakeThreshold(this.__wbg_ptr);
        return ret;
    }
    wakeUp() {
        wasm.sleep_wakeUp(this.__wbg_ptr);
    }
}
if (Symbol.dispose) Sleep.prototype[Symbol.dispose] = Sleep.prototype.free;

/**
 * @param {number} h
 * @returns {number}
 */
export function bodyClock(h) {
    const ret = wasm.bodyClock(h);
    return ret;
}

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
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_30c8987f7c2ed4e2: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg___wbindgen_string_get_0380ccaa2f57f0d9: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_41e9ee4f547fc59a: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_generic_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
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
        "./drives_bg.js": import0,
    };
}

const ChooserFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_chooser_free(ptr, 1));
const CueLearnerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_cuelearner_free(ptr, 1));
const DrivesFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_drives_free(ptr, 1));
const MemoryStreamFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_memorystream_free(ptr, 1));
const SleepFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_sleep_free(ptr, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function getArrayF64FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat64ArrayMemory0().subarray(ptr / 8, ptr / 8 + len);
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
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

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function isLikeNone(x) {
    return x === undefined || x === null;
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

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    for (let i = 0; i < array.length; i++) {
        const add = addToExternrefTable0(array[i]);
        getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
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

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedFloat64ArrayMemory0 = null;
    cachedUint32ArrayMemory0 = null;
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
        module_or_path = new URL('drives_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };

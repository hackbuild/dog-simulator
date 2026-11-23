/* @ts-self-types="./senses.d.ts" */

export class Loom {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        LoomFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_loom_free(ptr, 0);
    }
    /**
     * @param {number} id
     */
    forget(id) {
        wasm.loom_forget(this.__wbg_ptr, id);
    }
    /**
     * @param {number} tau
     * @param {number} min_angle
     * @param {number} max_gap
     * @param {number} refractory
     */
    constructor(tau, min_angle, max_gap, refractory) {
        const ret = wasm.loom_new(tau, min_angle, max_gap, refractory);
        this.__wbg_ptr = ret;
        LoomFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * The tau of a startle, or NaN.
     * @param {number} id
     * @param {number} size
     * @param {number} dist
     * @param {number} now
     * @returns {number}
     */
    observe(id, size, dist, now) {
        const ret = wasm.loom_observe(this.__wbg_ptr, id, size, dist, now);
        return ret;
    }
}
if (Symbol.dispose) Loom.prototype[Symbol.dispose] = Loom.prototype.free;

export class OccupancyGrid {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        OccupancyGridFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_occupancygrid_free(ptr, 0);
    }
    /**
     * @param {number} x
     * @param {number} z
     * @returns {number}
     */
    at(x, z) {
        const ret = wasm.occupancygrid_at(this.__wbg_ptr, x, z);
        return ret;
    }
    /**
     * @param {number} x
     * @param {number} z
     */
    bump(x, z) {
        wasm.occupancygrid_bump(this.__wbg_ptr, x, z);
    }
    /**
     * @param {number} x
     * @param {number} z
     * @returns {boolean}
     */
    canStand(x, z) {
        const ret = wasm.occupancygrid_canStand(this.__wbg_ptr, x, z);
        return ret !== 0;
    }
    /**
     * @returns {Uint8Array}
     */
    cells() {
        const ret = wasm.occupancygrid_cells(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @param {number} x
     * @param {number} z
     */
    freeAround(x, z) {
        wasm.occupancygrid_freeAround(this.__wbg_ptr, x, z);
    }
    /**
     * `x z dist size` per frontier, nearest first.
     * @param {number} x
     * @param {number} z
     * @returns {Float64Array}
     */
    frontiers(x, z) {
        const ret = wasm.occupancygrid_frontiers(this.__wbg_ptr, x, z);
        var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * @param {Float64Array} camera
     * @param {Float32Array} depth
     * @param {number} width
     * @param {number} height
     * @param {number} far
     * @param {number} ax
     * @param {number} ay
     * @param {number} az
     */
    integrate(camera, depth, width, height, far, ax, ay, az) {
        const ptr0 = passArrayF64ToWasm0(camera, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF32ToWasm0(depth, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.occupancygrid_integrate(this.__wbg_ptr, ptr0, len0, ptr1, len1, width, height, far, ax, ay, az);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * `[free square metres, occupied cells]`
     * @returns {Float64Array}
     */
    known() {
        const ret = wasm.occupancygrid_known(this.__wbg_ptr);
        var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * @param {number} x
     * @param {number} z
     */
    markDead(x, z) {
        wasm.occupancygrid_markDead(this.__wbg_ptr, x, z);
    }
    /**
     * @param {number} x
     * @param {number} z
     * @param {boolean} obstacle
     */
    mark(x, z, obstacle) {
        wasm.occupancygrid_mark(this.__wbg_ptr, x, z, obstacle);
    }
    /**
     * `opts`: cells, cell size, radius, floor y, head y, max range, hits to mark, bucket.
     * @param {Float64Array} opts
     * @param {number} cx
     * @param {number} cz
     */
    constructor(opts, cx, cz) {
        const ptr0 = passArrayF64ToWasm0(opts, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.occupancygrid_new(ptr0, len0, cx, cz);
        this.__wbg_ptr = ret;
        OccupancyGridFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * `x z` per waypoint, or empty when no path exists.
     * @param {number} ax
     * @param {number} az
     * @param {number} bx
     * @param {number} bz
     * @returns {Float64Array}
     */
    path(ax, az, bx, bz) {
        const ret = wasm.occupancygrid_path(this.__wbg_ptr, ax, az, bx, bz);
        var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * @returns {number}
     */
    get revision() {
        const ret = wasm.occupancygrid_revision(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) OccupancyGrid.prototype[Symbol.dispose] = OccupancyGrid.prototype.free;

export class OdourField {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        OdourFieldFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_odourfield_free(ptr, 0);
    }
    clearPuffs() {
        wasm.odourfield_clearPuffs(this.__wbg_ptr);
    }
    /**
     * @param {number} x
     * @param {number} z
     * @returns {number}
     */
    concentration(x, z) {
        const ret = wasm.odourfield_concentration(this.__wbg_ptr, x, z);
        return ret;
    }
    /**
     * @param {number} elapsed
     * @param {number} halflife
     */
    decayTrail(elapsed, halflife) {
        wasm.odourfield_decayTrail(this.__wbg_ptr, elapsed, halflife);
    }
    /**
     * @param {number} x
     * @param {number} z
     * @param {number} amount
     * @param {number} now
     */
    deposit(x, z, amount, now) {
        wasm.odourfield_deposit(this.__wbg_ptr, x, z, amount, now);
    }
    /**
     * @param {number} x
     * @param {number} z
     * @returns {number}
     */
    groundConcentration(x, z) {
        const ret = wasm.odourfield_groundConcentration(this.__wbg_ptr, x, z);
        return ret;
    }
    /**
     * `opts`: size, cells, max puffs, puff life, bounds, puff rate, wind, meander, wind heading.
     * @param {Float64Array} opts
     * @param {number} seed
     */
    constructor(opts, seed) {
        const ptr0 = passArrayF64ToWasm0(opts, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.odourfield_new(ptr0, len0, seed);
        this.__wbg_ptr = ret;
        OdourFieldFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {number} x
     * @param {number} z
     * @returns {number}
     */
    puffConcentration(x, z) {
        const ret = wasm.odourfield_puffConcentration(this.__wbg_ptr, x, z);
        return ret;
    }
    /**
     * @returns {number}
     */
    get puffCount() {
        const ret = wasm.odourfield_puffCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {Float64Array}
     */
    puffs() {
        const ret = wasm.odourfield_puffs(this.__wbg_ptr);
        var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * @param {number} rate
     */
    setPuffRate(rate) {
        wasm.odourfield_setPuffRate(this.__wbg_ptr, rate);
    }
    /**
     * @param {number} speed
     * @param {number} meander
     */
    setWind(speed, meander) {
        wasm.odourfield_setWind(this.__wbg_ptr, speed, meander);
    }
    /**
     * `sources`: id, x, z, strength per source.
     * @param {number} dt
     * @param {Float64Array} sources
     */
    step(dt, sources) {
        const ptr0 = passArrayF64ToWasm0(sources, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.odourfield_step(this.__wbg_ptr, dt, ptr0, len0);
    }
    /**
     * `[dx, dz]` or empty; pass NaN for no previous direction.
     * @param {number} x
     * @param {number} z
     * @param {number} prev_x
     * @param {number} prev_z
     * @returns {Float64Array}
     */
    trailDirection(x, z, prev_x, prev_z) {
        const ret = wasm.odourfield_trailDirection(this.__wbg_ptr, x, z, prev_x, prev_z);
        var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * @returns {Float32Array}
     */
    trail() {
        const ret = wasm.odourfield_trail(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {Float64Array}
     */
    wind() {
        const ret = wasm.odourfield_wind(this.__wbg_ptr);
        var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
}
if (Symbol.dispose) OdourField.prototype[Symbol.dispose] = OdourField.prototype.free;

export class PerceptMemory {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PerceptMemoryFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_perceptmemory_free(ptr, 0);
    }
    /**
     * `opts`: half fov, range per size, motion gain, motion speed, night floor, forget after, drift.
     * @param {Float64Array} opts
     * @param {number} seed
     */
    constructor(opts, seed) {
        const ptr0 = passArrayF64ToWasm0(opts, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.perceptmemory_new(ptr0, len0, seed);
        this.__wbg_ptr = ret;
        PerceptMemoryFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * `[x, y, z, confidence]` or empty.
     * @param {number} id
     * @param {number} now
     * @returns {Float64Array}
     */
    recall(id, now) {
        const ret = wasm.perceptmemory_recall(this.__wbg_ptr, id, now);
        var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * `eye`: x y z; `obj`: px py pz vx vy vz size occluded hidden fixed.
     * Returns `[visible, seen (NaN if none), salience, confidence, dist, speed]`.
     * @param {number} id
     * @param {Float64Array} eye
     * @param {number} yaw
     * @param {Float64Array} obj
     * @param {number} light
     * @param {number} t
     * @returns {Float64Array}
     */
    sense(id, eye, yaw, obj, light, t) {
        const ptr0 = passArrayF64ToWasm0(eye, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(obj, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.perceptmemory_sense(this.__wbg_ptr, id, ptr0, len0, yaw, ptr1, len1, light, t);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v3 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v3;
    }
}
if (Symbol.dispose) PerceptMemory.prototype[Symbol.dispose] = PerceptMemory.prototype.free;

export class Saliency {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SaliencyFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_saliency_free(ptr, 0);
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} weight
     */
    biasPoint(x, y, z, weight) {
        wasm.saliency_biasPoint(this.__wbg_ptr, x, y, z, weight);
    }
    /**
     * @param {number} u
     * @param {number} v
     * @param {number} weight
     */
    biasUv(u, v, weight) {
        wasm.saliency_biasUv(this.__wbg_ptr, u, v, weight);
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} until
     */
    inhibit(x, y, z, until) {
        wasm.saliency_inhibit(this.__wbg_ptr, x, y, z, until);
    }
    /**
     * @returns {number}
     */
    inhibited() {
        const ret = wasm.saliency_inhibited(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get mapHeight() {
        const ret = wasm.saliency_mapHeight(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get mapWidth() {
        const ret = wasm.saliency_mapWidth(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {Float32Array}
     */
    map() {
        const ret = wasm.saliency_map(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * `opts`: width, height, gain, threshold, fixation median, ior seconds,
     * snap angle, ground y, then the four channel weights.
     * @param {Float64Array} opts
     * @param {number} seed
     */
    constructor(opts, seed) {
        const ptr0 = passArrayF64ToWasm0(opts, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.saliency_new(ptr0, len0, seed);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0];
        SaliencyFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {number} now
     * @returns {boolean}
     */
    ready(now) {
        const ret = wasm.saliency_ready(this.__wbg_ptr, now);
        return ret !== 0;
    }
    /**
     * `[x, y, value, px, py, pz, object]` (object -1 for the ground), or empty.
     * @param {number} now
     * @param {Float64Array} camera
     * @param {Float64Array} objects
     * @param {number} arousal
     * @returns {Float64Array}
     */
    shift(now, camera, objects, arousal) {
        const ptr0 = passArrayF64ToWasm0(camera, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(objects, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.saliency_shift(this.__wbg_ptr, now, ptr0, len0, ptr1, len1, arousal);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v3 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v3;
    }
    /**
     * @param {Uint8Array} frame
     * @param {number} width
     * @param {number} height
     * @param {number} now
     * @param {Float64Array} camera
     * @returns {Float32Array}
     */
    update(frame, width, height, now, camera) {
        const ptr0 = passArray8ToWasm0(frame, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(camera, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.saliency_update(this.__wbg_ptr, ptr0, len0, width, height, now, ptr1, len1);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v3 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v3;
    }
    /**
     * `[index, value]`, or empty when nothing beats the threshold.
     * @returns {Float64Array}
     */
    winner() {
        const ret = wasm.saliency_winner(this.__wbg_ptr);
        var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
}
if (Symbol.dispose) Saliency.prototype[Symbol.dispose] = Saliency.prototype.free;

export class Sniffer {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SnifferFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_sniffer_free(ptr, 0);
    }
    /**
     * @param {number} sniff_hz
     * @param {number} bout_hz
     * @param {number} seed
     */
    constructor(sniff_hz, bout_hz, seed) {
        const ret = wasm.sniffer_new(sniff_hz, bout_hz, seed);
        this.__wbg_ptr = ret;
        SnifferFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {number} sniff_hz
     * @param {number} bout_hz
     */
    setRates(sniff_hz, bout_hz) {
        wasm.sniffer_setRates(this.__wbg_ptr, sniff_hz, bout_hz);
    }
    /**
     * `[left, right, mean of both, running mean, last whiff time]`
     * @returns {Float64Array}
     */
    state() {
        const ret = wasm.sniffer_state(this.__wbg_ptr);
        var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * @param {OdourField} field
     * @param {number} dt
     * @param {number} now
     * @param {boolean} active
     * @param {number} nx
     * @param {number} nz
     * @param {number} sx
     * @param {number} sz
     * @returns {boolean}
     */
    tick(field, dt, now, active, nx, nz, sx, sz) {
        _assertClass(field, OdourField);
        const ret = wasm.sniffer_tick(this.__wbg_ptr, field.__wbg_ptr, dt, now, active, nx, nz, sx, sz);
        return ret !== 0;
    }
    /**
     * @param {number} now
     * @param {number} window
     * @returns {boolean}
     */
    whiff(now, window) {
        const ret = wasm.sniffer_whiff(this.__wbg_ptr, now, window);
        return ret !== 0;
    }
}
if (Symbol.dispose) Sniffer.prototype[Symbol.dispose] = Sniffer.prototype.free;

export class Tracker {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TrackerFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_tracker_free(ptr, 0);
    }
    /**
     * @param {number} seed
     */
    constructor(seed) {
        const ret = wasm.tracker_new(seed);
        this.__wbg_ptr = ret;
        TrackerFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {number} x
     * @param {number} z
     */
    setWaypoint(x, z) {
        wasm.tracker_setWaypoint(this.__wbg_ptr, x, z);
    }
    /**
     * `[mode, has waypoint, wx, wz, speed, stop distance, done, changed]`;
     * mode 0 decide, 1 trail, 2 surge, 3 cast.
     * @param {OdourField} field
     * @param {Sniffer} sniffer
     * @param {number} dt
     * @param {number} now
     * @param {number} x
     * @param {number} z
     * @param {number} heading
     * @param {boolean} arrived
     * @returns {Float64Array}
     */
    step(field, sniffer, dt, now, x, z, heading, arrived) {
        _assertClass(field, OdourField);
        _assertClass(sniffer, Sniffer);
        const ret = wasm.tracker_step(this.__wbg_ptr, field.__wbg_ptr, sniffer.__wbg_ptr, dt, now, x, z, heading, arrived);
        var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
}
if (Symbol.dispose) Tracker.prototype[Symbol.dispose] = Tracker.prototype.free;

/**
 * @param {number} size
 * @param {number} dist
 * @returns {number}
 */
export function angularSize(size, dist) {
    const ret = wasm.angularSize(size, dist);
    return ret;
}

/**
 * A camera at a position looking along yaw and pitch, as 16 numbers.
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} yaw
 * @param {number} pitch
 * @param {number} fov
 * @param {number} aspect
 * @param {number} near
 * @param {number} far
 * @returns {Float64Array}
 */
export function cameraLook(x, y, z, yaw, pitch, fov, aspect, near, far) {
    const ret = wasm.cameraLook(x, y, z, yaw, pitch, fov, aspect, near, far);
    var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    return v1;
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

/**
 * @param {number} prev
 * @param {number} angle
 * @param {number} dt
 * @returns {number}
 */
export function timeToContact(prev, angle, dt) {
    const ret = wasm.timeToContact(prev, angle, dt);
    return ret;
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_30c8987f7c2ed4e2: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
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
        "./senses_bg.js": import0,
    };
}

const LoomFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_loom_free(ptr, 1));
const OccupancyGridFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_occupancygrid_free(ptr, 1));
const OdourFieldFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_odourfield_free(ptr, 1));
const PerceptMemoryFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_perceptmemory_free(ptr, 1));
const SaliencyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_saliency_free(ptr, 1));
const SnifferFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_sniffer_free(ptr, 1));
const TrackerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_tracker_free(ptr, 1));

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayF64FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat64ArrayMemory0().subarray(ptr / 8, ptr / 8 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
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

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayF64ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 8, 8) >>> 0;
    getFloat64ArrayMemory0().set(arg, ptr / 8);
    WASM_VECTOR_LEN = arg.length;
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

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedFloat32ArrayMemory0 = null;
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
        module_or_path = new URL('senses_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };

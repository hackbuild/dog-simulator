// three.js adapter: cameras as the 16 number layout the wasm takes, and an
// agent eye that renders an object ID buffer and a depth buffer from the
// agent's head, so perception reads only what the eye can see. Written for
// this library from an earlier unpublished perception prototype by the
// same author and the eye render of the earlier dog simulator
// (https://github.com/hackbuild/dog-simulator/tree/main/legacy).
// Readback is synchronous by default; `passAsync` uses
// readRenderTargetPixelsAsync and refuses a second pass while one is in
// flight (learned in earlier builds: a busy flag, never a queue).
import * as THREE from "three";
/** The camera layout the wasm takes, from a three PerspectiveCamera. */
export function cameraFromThree(cam, out = new Float64Array(16)) {
    cam.updateMatrixWorld();
    const e = cam.matrixWorld.elements;
    const right = new THREE.Vector3(e[0], e[1], e[2]).normalize();
    const up = new THREE.Vector3(e[4], e[5], e[6]).normalize();
    const back = new THREE.Vector3(e[8], e[9], e[10]).normalize();
    out.set([e[12], e[13], e[14], right.x, right.y, right.z, up.x, up.y, up.z, back.x, back.y, back.z, cam.fov, cam.aspect, cam.near, cam.far]);
    return out;
}
// Built from three's own chunks so instanced, batched, skinned and morphed
// meshes land where the ID pass draws them.
const DEPTH_VERT = [
    "#include <common>",
    "#include <batching_pars_vertex>",
    "#include <morphtarget_pars_vertex>",
    "#include <skinning_pars_vertex>",
    "varying vec3 vP;",
    "void main() {",
    "#include <batching_vertex>",
    "#include <skinbase_vertex>",
    "#include <morphinstance_vertex>",
    "#include <begin_vertex>",
    "#include <morphtarget_vertex>",
    "#include <skinning_vertex>",
    "#include <project_vertex>",
    "vP = mvPosition.xyz;",
    "}",
].join("\n");
const DEPTH_FRAG = "uniform float far; varying vec3 vP; void main() { float v = clamp(length(vP) / far, 0.0, 0.9999) * 255.0; gl_FragColor = vec4(floor(v) / 255.0, fract(v), 0.0, 1.0); }";
/** Decodes the RG packed depth of a bottom up readback into metres, row 0 at the top. */
export function decodeDepth(px, w, h, far, out = new Float32Array(w * h)) {
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const l = ((h - 1 - y) * w + x) * 4;
            out[y * w + x] = ((px[l] + px[l + 1] / 255) / 255) * far;
        }
    }
    return out;
}
/** Counts ID pixels per tracked index in a bottom up readback; ids are `index + 1` in red plus 256 times green. */
export function countIds(px, w, h, n) {
    const count = new Uint32Array(n);
    const sx = new Float64Array(n);
    const sy = new Float64Array(n);
    for (let i = 0; i < w * h; i++) {
        const id = px[i * 4] + 256 * px[i * 4 + 1] - 1;
        if (id < 0 || id >= n)
            continue;
        count[id] = count[id] + 1;
        sx[id] = sx[id] + (i % w);
        sy[id] = sy[id] + (h - 1 - Math.floor(i / w));
    }
    return { count, sx, sy };
}
export class Eye {
    renderer;
    scene;
    camera;
    opts;
    idTarget;
    depthTarget;
    idPx;
    depthPx;
    depth;
    black = new THREE.MeshBasicMaterial({ color: 0x000000 });
    idMats = [];
    depthMat;
    colorTarget = null;
    colorTmp = new Uint8Array(0);
    busy = false;
    constructor(renderer, scene, opts = {}) {
        this.renderer = renderer;
        this.scene = scene;
        this.opts = { fov: 74, width: 192, height: 108, depthWidth: 96, depthHeight: 54, far: 12, near: 0.03, ...opts };
        const o = this.opts;
        this.camera = new THREE.PerspectiveCamera(o.fov, o.width / o.height, o.near, o.far * 1.5);
        const rt = (w, h) => new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
        this.idTarget = rt(o.width, o.height);
        this.depthTarget = rt(o.depthWidth, o.depthHeight);
        this.idPx = new Uint8Array(o.width * o.height * 4);
        this.depthPx = new Uint8Array(o.depthWidth * o.depthHeight * 4);
        this.depth = new Float32Array(o.depthWidth * o.depthHeight);
        this.depthMat = new THREE.ShaderMaterial({ uniforms: { far: { value: o.far } }, vertexShader: DEPTH_VERT, fragmentShader: DEPTH_FRAG });
    }
    /** Puts the eye at a point looking along yaw (0 is +Z) and pitch. */
    place(pos, yaw, pitch) {
        const d = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
        this.camera.position.copy(pos);
        this.camera.lookAt(pos.clone().add(d));
        this.camera.updateMatrixWorld(true);
    }
    get pending() {
        return this.busy;
    }
    idMat(i) {
        let m = this.idMats[i];
        if (!m) {
            const id = i + 1;
            m = new THREE.MeshBasicMaterial();
            m.color.setRGB((id % 256) / 255, Math.floor(id / 256) / 255, 0, THREE.LinearSRGBColorSpace);
            this.idMats[i] = m;
        }
        return m;
    }
    renderBoth(tracked, hide) {
        const { renderer: r, scene } = this;
        const byMesh = new Map();
        tracked.forEach((t, i) => t.object.traverse((o) => byMesh.set(o, i)));
        const saved = [];
        scene.traverse((o) => {
            const m = o;
            if (o.isPoints || o.isLine || o.isSprite) {
                saved.push([o, null, o.visible]);
                o.visible = false;
            }
            else if (m.isMesh) {
                saved.push([m, m.material, m.visible]);
                const i = byMesh.get(m);
                m.material = i === undefined ? this.black : this.idMat(i);
            }
        });
        const hid = hide.map((h) => [h, h.visible]);
        for (const h of hide)
            h.visible = false;
        const bg = scene.background;
        const fog = scene.fog;
        scene.background = null;
        scene.fog = null;
        const prevTarget = r.getRenderTarget();
        const prevClear = r.getClearColor(new THREE.Color());
        const prevAlpha = r.getClearAlpha();
        const restore = () => {
            scene.overrideMaterial = null;
            r.setRenderTarget(prevTarget);
            r.setClearColor(prevClear, prevAlpha);
            for (const [o, mat, vis] of saved) {
                if (mat)
                    o.material = mat;
                o.visible = vis;
            }
            for (const [h, v] of hid)
                h.visible = v;
            scene.background = bg;
            scene.fog = fog;
        };
        // a throw mid render must not leave the scene in ID materials
        try {
            r.setRenderTarget(this.idTarget);
            r.setClearColor(0x000000, 1);
            r.clear();
            r.render(scene, this.camera);
            scene.overrideMaterial = this.depthMat;
            r.setRenderTarget(this.depthTarget);
            r.setClearColor(0xffffff, 1);
            r.clear();
            r.render(scene, this.camera);
            scene.overrideMaterial = null;
        }
        catch (e) {
            restore();
            throw e;
        }
        return restore;
    }
    finish(tracked) {
        const o = this.opts;
        decodeDepth(this.depthPx, o.depthWidth, o.depthHeight, o.far, this.depth);
        const { count, sx, sy } = countIds(this.idPx, o.width, o.height, tracked.length);
        const visible = [];
        tracked.forEach((t, i) => {
            const n = count[i];
            if (n < (t.minPixels ?? 2))
                return;
            const u = sx[i] / n / o.width;
            const v = sy[i] / n / o.height;
            const dx = Math.min(o.depthWidth - 1, Math.round(u * o.depthWidth));
            const dy = Math.min(o.depthHeight - 1, Math.round(v * o.depthHeight));
            visible.push({ label: t.label, pixels: n, u, v, dist: this.depth[dy * o.depthWidth + dx] });
        });
        return { visible, depth: this.depth, depthWidth: o.depthWidth, depthHeight: o.depthHeight, camera: cameraFromThree(this.camera) };
    }
    /** Renders the ID and depth buffers and reads them back synchronously. */
    pass(tracked, hide = []) {
        const restore = this.renderBoth(tracked, hide);
        const o = this.opts;
        this.renderer.readRenderTargetPixels(this.idTarget, 0, 0, o.width, o.height, this.idPx);
        this.renderer.readRenderTargetPixels(this.depthTarget, 0, 0, o.depthWidth, o.depthHeight, this.depthPx);
        restore();
        return this.finish(tracked);
    }
    /** The same pass with async readback; null while a previous pass is in flight. */
    async passAsync(tracked, hide = []) {
        if (this.busy)
            return null;
        this.busy = true;
        try {
            const restore = this.renderBoth(tracked, hide);
            restore();
            const o = this.opts;
            await this.renderer.readRenderTargetPixelsAsync(this.idTarget, 0, 0, o.width, o.height, this.idPx);
            await this.renderer.readRenderTargetPixelsAsync(this.depthTarget, 0, 0, o.depthWidth, o.depthHeight, this.depthPx);
            return this.finish(tracked);
        }
        finally {
            this.busy = false;
        }
    }
    /**
     * A colour frame for saliency (RGBA, row 0 at the top) of `w` by `h`.
     * Without `target` the eye keeps one render target and one readback
     * buffer for the size and reuses them; `dispose` frees them.
     */
    colorFrame(w, h, target, out = new Uint8Array(w * h * 4)) {
        let rt = target;
        if (!rt) {
            const c = this.colorTarget;
            if (!c || c.width !== w || c.height !== h) {
                c?.dispose();
                this.colorTarget = new THREE.WebGLRenderTarget(w, h);
            }
            rt = this.colorTarget;
        }
        if (this.colorTmp.length !== w * h * 4)
            this.colorTmp = new Uint8Array(w * h * 4);
        const tmp = this.colorTmp;
        const prev = this.renderer.getRenderTarget();
        try {
            this.renderer.setRenderTarget(rt);
            this.renderer.render(this.scene, this.camera);
            this.renderer.readRenderTargetPixels(rt, 0, 0, w, h, tmp);
        }
        finally {
            this.renderer.setRenderTarget(prev);
        }
        for (let y = 0; y < h; y++)
            out.set(tmp.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
        return out;
    }
    dispose() {
        this.idTarget.dispose();
        this.depthTarget.dispose();
        this.colorTarget?.dispose();
        this.colorTarget = null;
        this.depthMat.dispose();
        this.black.dispose();
        for (const m of this.idMats)
            m.dispose();
    }
}

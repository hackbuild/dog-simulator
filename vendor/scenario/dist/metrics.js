// Motion metrics from lessons of earlier builds: judge motion by numbers, not by
// eye in a slow headless browser. All pure functions over sampled series.
/** Percentile by nearest rank on a sorted copy. */
export function percentile(xs, p) {
    if (!xs.length)
        return Number.NaN;
    const s = [...xs].sort((a, b) => a - b);
    const i = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
    return s[i];
}
/** Count, mean, p50, p95 and max of a list; NaN for an empty list. */
export function stats(xs) {
    if (!xs.length)
        return { n: 0, mean: Number.NaN, p50: Number.NaN, p95: Number.NaN, max: Number.NaN };
    let sum = 0;
    let max = Number.NEGATIVE_INFINITY;
    for (const x of xs) {
        sum += x;
        if (x > max)
            max = x;
    }
    return { n: xs.length, mean: sum / xs.length, p50: percentile(xs, 50), p95: percentile(xs, 95), max };
}
/** Frame time p50, p95 and max in ms from frame durations. */
export function frameStats(ms) {
    return stats(ms);
}
/**
 * Jerk magnitudes (m/s^3) from positions sampled every `dt` seconds: the
 * third difference of position over dt^3. Points may be 2D or 3D.
 */
export function jerk(points, dt) {
    const out = [];
    for (let i = 3; i < points.length; i++) {
        const a = points[i];
        const b = points[i - 1];
        const c = points[i - 2];
        const d = points[i - 3];
        let s = 0;
        for (let k = 0; k < a.length; k++) {
            const j = (a[k] - 3 * b[k] + 3 * c[k] - d[k]) / (dt * dt * dt);
            s += j * j;
        }
        out.push(Math.sqrt(s));
    }
    return out;
}
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
/**
 * Sliding: the body faces one way and moves another. `yaw` 0 is +Z,
 * positions are (x, z). Samples below `minSpeed` m/s do not count.
 */
export function sliding(points, yaw, dt, threshold = 0.6, minSpeed = 0.15) {
    let slide = 0;
    let moving = 0;
    for (let i = 1; i < points.length; i++) {
        const p = points[i];
        const q = points[i - 1];
        const dx = p[0] - q[0];
        const dz = p[1] - q[1];
        if (Math.hypot(dx, dz) / dt < minSpeed)
            continue;
        moving++;
        const dir = Math.atan2(dx, dz);
        if (Math.abs(wrap(dir - yaw[i])) > threshold)
            slide++;
    }
    return { seconds: slide * dt, share: moving ? slide / moving : 0, moving };
}
/** State changes per second over a sampled label series. */
export function togglesPerSecond(states, dt) {
    if (states.length < 2)
        return 0;
    let n = 0;
    for (let i = 1; i < states.length; i++)
        if (states[i] !== states[i - 1])
            n++;
    return n / ((states.length - 1) * dt);
}
/**
 * Seconds where an agent with a goal moved under `dist` m over the
 * previous `window` s (the stall detector of earlier builds, 0.2 m in 2 s).
 */
export function stallSeconds(points, hasGoal, dt, window = 2, dist = 0.2) {
    const k = Math.max(1, Math.round(window / dt));
    let s = 0;
    for (let i = k; i < points.length; i++) {
        if (!hasGoal[i])
            continue;
        const p = points[i];
        const q = points[i - k];
        if (Math.hypot(p[0] - q[0], p[1] - q[1]) < dist)
            s += dt;
    }
    return s;
}

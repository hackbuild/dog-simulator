// The system Chrome through puppeteer-core: no bundled browser download,
// no Playwright (it refuses macOS 12). Every request is routed; a request
// with no route is refused and recorded, and the run fails on it.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer, {} from "puppeteer-core";
import { serve } from "./routes.js";
export const CHROME_MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CANDIDATES = [CHROME_MAC, "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
/** The first Chrome found, or null. `HB_CHROME` overrides. */
export function findChrome() {
    const env = process.env.HB_CHROME;
    if (env && existsSync(env))
        return env;
    return CANDIDATES.find((p) => existsSync(p)) ?? null;
}
export const DEFAULT_ARGS = ["--autoplay-policy=no-user-gesture-required", "--mute-audio", "--allow-file-access-from-files"];
/**
 * Software GL, the same on every machine; for lockstep runs. Under these
 * flags headless Chrome 150 on macOS 12 ran 0 to 1 animation frames per
 * second (measured 2026-11-22), so real frame rate runs use `gpu: "default"`.
 */
export const SWIFTSHADER_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-unsafe-webgpu"];
export async function open(o) {
    const chrome = o.chrome ?? findChrome();
    if (!chrome)
        throw new Error("no chrome found. set HB_CHROME to the browser binary.");
    const browser = await puppeteer.launch({
        executablePath: chrome,
        headless: o.headless ?? true,
        args: [...DEFAULT_ARGS, ...((o.gpu ?? "swiftshader") === "swiftshader" ? SWIFTSHADER_ARGS : []), ...(o.args ?? [])],
        defaultViewport: { width: o.width ?? 420, height: o.height ?? 280 },
    });
    try {
        return await prepare(browser, o);
    }
    catch (e) {
        await browser.close().catch(() => undefined);
        throw e;
    }
}
async function prepare(browser, o) {
    const page = await browser.newPage();
    const log = { errors: [], warnings: [], blocked: [], served: [], version: await browser.version() };
    page.on("pageerror", (e) => log.errors.push(`pageerror: ${String(e.message ?? e).slice(0, 400)}`));
    page.on("console", (m) => {
        const t = m.type();
        const text = m.text().slice(0, 400);
        if (t === "error")
            log.errors.push(`console: ${text}`);
        else if (t === "warn")
            log.warnings.push(text);
    });
    await page.setRequestInterception(true);
    page.on("request", (req) => {
        const url = req.url();
        if (url.startsWith("file:") || url.startsWith("data:") || url.startsWith("blob:"))
            return void req.continue();
        if (o.offline) {
            log.blocked.push(url);
            return void req.abort("internetdisconnected");
        }
        try {
            const u = new URL(url);
            for (const r of o.routes ?? []) {
                const hit = r(u);
                if (!hit)
                    continue;
                const s = serve(hit);
                log.served.push(url);
                return void req.respond({ status: 200, headers: { "access-control-allow-origin": "*", "cross-origin-resource-policy": "cross-origin" }, contentType: s.contentType, body: typeof s.body === "string" ? s.body : Buffer.from(s.body) });
            }
        }
        catch (e) {
            log.errors.push(`route: ${e.message}`);
        }
        log.blocked.push(url);
        return void req.abort("blockedbyclient");
    });
    if (o.beforeGoto)
        await o.beforeGoto(page);
    const target = /^[a-z]+:/.test(o.url) ? o.url : pathToFileURL(resolve(o.url)).href;
    await page.goto(target + (o.hash ?? ""), { waitUntil: "load", timeout: o.timeoutMs ?? 120000 });
    return { browser, page, log, close: () => browser.close() };
}
/** Polls a page condition until it is truthy or the time runs out (null). */
export async function waitFor(page, expr, timeoutMs, everyMs = 250) {
    const t0 = Date.now();
    for (;;) {
        const v = (await page.evaluate(expr));
        if (v)
            return v;
        if (Date.now() - t0 > timeoutMs)
            return null;
        await new Promise((r) => setTimeout(r, everyMs));
    }
}

/** Real official YouTube playback acceptance. No streaming URLs or media files are extracted. */
import assert from "node:assert/strict";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import puppeteer from "puppeteer-core";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const url = new URL(process.argv.find(arg => /^https?:/.test(arg)) || "http://127.0.0.1:4173/");
const staging = process.argv.includes("--stage-origin");
const liveOnly = process.argv.includes("--live-only");
const artifacts = process.env.FOUNDRY_ARTIFACT_DIR || join(homedir(), "DevData/Artifacts/20261017-skills-promo/foundry/official-music/qa-local");
const output = join(artifacts, "ui");
await mkdir(output, { recursive: true });
const report = {
  url: url.href,
  mode: staging ? "Current worktree staged under actual target origin; not an online deployment" : "Actual URL without local source interception",
  startedAt: new Date().toISOString(),
  testedCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  sourceSHA256: {},
  expectedVideoId: "E6wPP2tOHgg",
  audioEvidence: "Real YouTube API state/time and iframe native video state only; Chrome --mute-audio suppresses speakers. No listening review or unrestricted future availability is claimed.",
  checks: [], consoleErrors: [], pageErrors: [], cleanup: null,
};
for (const name of ["app.js", "official-music.js", "official-music.css", "index.html"])
  report.sourceSHA256[name] = createHash("sha256").update(await readFile(join(root, name))).digest("hex");
let browser;
const dock = "[data-official-music]";
const preview = "#ns-spec-cards .film-preview";
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function check(name, action) {
  try { report.checks.push({ name, passed: true, details: await action() }); console.log("PASS", name); }
  catch (error) { report.checks.push({ name, passed: false, error: error.message }); console.error("FAIL", name, error.message); }
}
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png", ".mp4": "video/mp4", ".json": "application/json", ".md": "text/plain", ".zip": "application/zip", ".woff2": "font/woff2" };
async function configure(page, { fault = false } = {}) {
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.setCacheEnabled(false);
  page.setDefaultTimeout(15_000);
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  page.on("pageerror", error => report.pageErrors.push({ message: error.message, stack: error.stack }));
  page.on("console", message => { if (message.type() === "error") report.consoleErrors.push({ text: message.text(), location: message.location(), intentionalFaultPage: fault }); });
  if (staging || fault) {
    await page.setRequestInterception(true);
    page.on("request", request => {
      void (async () => {
        const requestURL = new URL(request.url());
        if (fault && requestURL.hostname === "www.youtube.com" && requestURL.pathname === "/iframe_api") {
          await request.abort("failed"); return;
        }
        if (!staging || requestURL.origin !== url.origin) { await request.continue(); return; }
        const base = url.pathname.endsWith("/") ? url.pathname : url.pathname.slice(0, url.pathname.lastIndexOf("/") + 1);
        if (!requestURL.pathname.startsWith(base)) { await request.respond({ status: 404, body: "Not staged" }); return; }
        const relative = decodeURIComponent(requestURL.pathname.slice(base.length)) || "index.html";
        const file = resolve(root, relative);
        if (!file.startsWith(root + sep)) { await request.respond({ status: 403, body: "Outside staging root" }); return; }
        try {
          const size = (await stat(file)).size;
          const bytes = request.method() === "HEAD" ? Buffer.alloc(0) : await readFile(file);
          const headers = { "Content-Type": mime[extname(file)] || "application/octet-stream", "Accept-Ranges": "bytes", "Cache-Control": "no-store" };
          const match = /^bytes=(\d+)-(\d*)$/.exec(request.headers().range || "");
          if (match) {
            const start = Number(match[1]), end = Math.min(size - 1, match[2] ? Number(match[2]) : size - 1);
            if (start > end) { await request.respond({ status: 416, headers: { "Content-Range": `bytes */${size}` }, body: "" }); return; }
            await request.respond({ status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}` }, body: bytes.subarray(start, end + 1) });
          } else await request.respond({ status: 200, headers, body: bytes });
        } catch { await request.respond({ status: 404, body: "No local staging resource" }); }
      })().catch(error => { if (!page.isClosed()) report.consoleErrors.push({ text: "Staging request failed: " + error.message, intentionalFaultPage: fault }); });
    });
  }
}
async function open(page, reset = true) {
  await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForSelector(preview);
  if (reset) {
    await page.evaluate(() => { localStorage.removeItem("foundry-static"); localStorage.removeItem("foundry-bgm"); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(preview);
  }
  await page.mouse.move(2, 2);
}
async function snapshot(page) {
  return page.evaluate(selector => {
    const mount = document.querySelector(selector), iframe = mount?.querySelector("iframe");
    const rect = iframe?.getBoundingClientRect();
    return {
      dataset: { ...mount?.dataset }, hidden: mount?.hidden,
      text: mount?.querySelector(".official-music__status")?.textContent,
      sourceLink: mount?.querySelector(".official-music__source")?.getAttribute("href"),
      iframe: iframe ? { src: iframe.getAttribute("src"), width: rect.width, height: rect.height, visible: rect.width > 0 && rect.height > 0 && getComputedStyle(iframe).visibility === "visible" && getComputedStyle(iframe).opacity === "1" } : null,
      preference: localStorage.getItem("foundry-bgm"), buttonPressed: document.querySelector("#bgm-toggle")?.getAttribute("aria-pressed"),
      cards: [...document.querySelectorAll(".skill-video")].map(video => ({ id: video.id, paused: video.paused, muted: video.muted, time: video.currentTime })),
      documentHidden: document.hidden,
    };
  }, dock);
}
async function nativeState(page) {
  const frame = page.frames().find(frame => /^https:\/\/www\.youtube\.com\/embed\/E6wPP2tOHgg(?:\?|$)/.test(frame.url()));
  if (!frame) return { iframePresent: false, quiet: true };
  try { return await frame.evaluate(() => {
    const video = document.querySelector("video");
    return { iframePresent: true, videoPresent: !!video, paused: video?.paused ?? true, muted: video?.muted ?? true, time: video?.currentTime ?? 0, duration: Number.isFinite(video?.duration) ? video.duration : null, readyState: video?.readyState ?? 0, quiet: !video || video.paused || video.muted, adShowing: !!document.querySelector(".ad-showing") };
  }); } catch { return { iframePresent: false, quiet: true, removedDuringRead: true }; }
}
async function sameCardGesture(page) {
  // Click actual 18px card-body padding: a trusted, same-card gesture with no install/navigation action.
  const point = await page.$eval("#ns-spec-cards .film-body", body => { const rect = body.getBoundingClientRect(); return { x: rect.left + 6, y: rect.top + 8 }; });
  await page.mouse.click(point.x, point.y);
}
async function playOfficial(page) {
  await page.hover(preview);
  await page.waitForFunction(() => { const video = document.querySelector("#video-ns-spec-cards"); return !video.paused && video.currentTime > .1; });
  await page.waitForFunction(selector => { const mount = document.querySelector(selector); return mount?.dataset.ready === "true" || mount?.dataset.status === "error"; }, { timeout: 40_000 }, dock);
  const ready = await snapshot(page);
  assert.notEqual(ready.dataset.status, "error", "Official source unavailable: " + ready.dataset.error);
  await sameCardGesture(page);
  await page.waitForFunction(selector => { const d = document.querySelector(selector)?.dataset; return d?.playerState === "1" && d.playing === "true" && d.muted === "false" && Number(d.currentTime) > .6; }, { timeout: 20_000 }, dock);
  const first = await snapshot(page);
  try {
    await page.waitForFunction((selector, initialTime) => {
      const d = document.querySelector(selector)?.dataset;
      return d?.playerState === "1" && d.muted === "false" && Number(d.currentTime) > initialTime + .35;
    }, { timeout: 5000 }, dock, Number(first.dataset.currentTime));
  } catch (error) {
    throw new Error("Real YouTube time did not advance: " + JSON.stringify({ first, later: await snapshot(page), native: await nativeState(page) }), { cause: error });
  }
  const second = await snapshot(page);
  assert.equal(second.dataset.videoId, report.expectedVideoId);
  assert.ok(second.iframe?.src.includes("/embed/" + report.expectedVideoId));
  assert.ok(second.iframe.visible && second.iframe.width >= 200 && second.iframe.height >= 200, "Official player must remain visibly at least 200x200");
  assert.ok(Math.abs(Number(second.dataset.duration) - 153.421) < 1, "Unexpected official song duration");
  assert.ok(second.cards.every(video => video.muted));
  const native = await nativeState(page);
  assert.equal(native.paused, false); assert.equal(native.muted, false); assert.ok(native.time > .5 && native.readyState >= 2);
  return { ...second, native, advancedSeconds: Number(second.dataset.currentTime) - Number(first.dataset.currentTime), gesture: "Real same-card padding click" };
}
async function quiet(page) {
  await page.waitForFunction(selector => { const d = document.querySelector(selector)?.dataset; return d?.playing === "false" && d.muted === "true" && d.stopping !== "true"; }, { timeout: 2500 }, dock);
  const first = await nativeState(page); await delay(600); const later = await nativeState(page);
  assert.equal(first.quiet, true); assert.equal(later.quiet, true);
  if (first.iframePresent && later.iframePresent && first.paused && later.paused) assert.ok(Math.abs(later.time - first.time) < .08, "Paused official media kept advancing");
  const actual = await snapshot(page);
  assert.ok(actual.cards.every(video => video.muted));
  return { ...actual, native: later };
}
try {
  if (process.env.FOUNDRY_TESTED_COMMIT) assert.equal(report.testedCommit, process.env.FOUNDRY_TESTED_COMMIT, "HEAD does not match requested source commit");
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", userDataDir: join(artifacts, "chrome-official-music-qa-profile"), headless: true, pipe: true, args: ["--mute-audio", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"] });
  const page = await browser.newPage(); await configure(page); await open(page);
  await check("Idle stays quiet without lazily creating an official iframe", async () => {
    const actual = await snapshot(page);
    assert.equal(actual.buttonPressed, "true"); assert.equal(actual.dataset.wanted, "false"); assert.equal(actual.dataset.playing, "false"); assert.equal(actual.hidden, true); assert.equal(actual.iframe, null);
    assert.ok(actual.cards.every(video => video.paused && video.muted)); return actual;
  });
  await check("The actual official 2:33 song plays visibly after a real same-card gesture and stops on leave", async () => {
    const playing = await playOfficial(page);
    await page.screenshot({ path: join(output, "official-playing.png") });
    await page.mouse.move(2, 2);
    const immediateCards = await page.$$eval(".skill-video", videos => videos.every(video => video.paused && video.muted)); assert.equal(immediateCards, true);
    const stopped = await quiet(page); assert.equal(stopped.dataset.wanted, "false");
    return { playing, stopped, immediateCards, screenshot: "official-playing.png" };
  });
  if (!liveOnly) {
    await check("OFF survives ordinary gestures and reload; only explicit ON allows official playback again", async () => {
      await playOfficial(page); await page.mouse.move(2, 2); await quiet(page);
      await page.click("#bgm-toggle"); assert.equal(await page.$eval("#bgm-toggle", button => button.dataset.state), "off");
      await page.click("h1"); await page.hover(preview); await sameCardGesture(page); await quiet(page);
      assert.equal((await snapshot(page)).preference, "off");
      await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForSelector(preview);
      assert.equal((await snapshot(page)).buttonPressed, "false"); await page.hover(preview); await sameCardGesture(page);
      const off = await quiet(page); assert.equal(off.preference, "off"); await page.screenshot({ path: join(output, "official-off.png") });
      await page.mouse.move(2, 2); await page.click("#bgm-toggle"); const restored = await playOfficial(page);
      await page.mouse.move(2, 2); await quiet(page); return { off, restored, screenshot: "official-off.png" };
    });
    await check("A genuinely hidden document stops official audio and cannot revive it on return", async () => {
      await playOfficial(page);
      const other = await browser.newPage(); await other.goto("about:blank"); await other.bringToFront();
      try {
        await page.waitForFunction(() => document.hidden, { timeout: 5000 });
        const hidden = await quiet(page); assert.equal(hidden.documentHidden, true); assert.ok(hidden.cards.every(video => video.paused && video.muted));
        await page.bringToFront(); await page.mouse.move(2, 2); await delay(500); const returned = await quiet(page); return { hidden, returned };
      } finally { await other.close(); }
    });
    await check("Leaving while the real official API is loading revokes late playback", async () => {
      const context = await browser.createBrowserContext();
      try {
        const rapid = await context.newPage(); await configure(rapid); await open(rapid);
        await rapid.hover(preview); await rapid.waitForSelector('script[src="https://www.youtube.com/iframe_api"]'); await rapid.mouse.move(2, 2);
        await rapid.waitForFunction(() => !!window.YT?.Player, { timeout: 25_000 }); await delay(500);
        const actual = await quiet(rapid); assert.equal(actual.dataset.wanted, "false"); assert.ok(actual.cards.every(video => video.paused)); return actual;
      } finally { await context.close(); }
    });
    await check("An intentionally unavailable official API shows a source fallback while card video remains muted", async () => {
      const context = await browser.createBrowserContext();
      try {
        const failed = await context.newPage(); await configure(failed, { fault: true }); await open(failed);
        await failed.hover(preview); await failed.waitForFunction(selector => document.querySelector(selector)?.dataset.status === "error", {}, dock);
        const actual = await snapshot(failed); assert.equal(actual.hidden, false); assert.match(actual.text, /官方页面/); assert.equal(actual.sourceLink, "https://www.youtube.com/watch?v=" + report.expectedVideoId); assert.equal(actual.dataset.playing, "false"); assert.equal(actual.dataset.muted, "true"); assert.ok(actual.cards.every(video => video.muted));
        await failed.screenshot({ path: join(output, "official-unavailable.png") });
        return { ...actual, intentionalTransportFault: "Only official iframe_api script request aborted; no YT state or playback mocked", screenshot: "official-unavailable.png" };
      } finally { await context.close(); }
    });
  }
  await check("No uncaught application exceptions", async () => { assert.deepEqual(report.pageErrors, []); return { pageErrors: 0, consoleErrors: report.consoleErrors }; });
} catch (error) { report.fatalError = error.stack; console.error(error.stack); }
finally {
  if (browser) {
    const pages = await browser.pages();
    const closing = await Promise.allSettled(pages.map(page => page.close({ runBeforeUnload: false })));
    await browser.close();
    report.cleanup = { closedPages: pages.length, pageCloseErrors: closing.filter(result => result.status === "rejected").map(result => String(result.reason)), browserDisconnected: !browser.connected, activeResourcesAfterClose: process.getActiveResourcesInfo?.() || [] };
  }
  report.finishedAt = new Date().toISOString(); report.passed = !report.fatalError && report.checks.length > 0 && report.checks.every(check => check.passed);
  await writeFile(join(output, "official-verification.json"), JSON.stringify(report, null, 2) + "\n");
  console.log("Official verification:", join(output, "official-verification.json"));
  if (!report.passed) process.exitCode = 1;
}

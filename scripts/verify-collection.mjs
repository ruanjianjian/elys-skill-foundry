import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import puppeteer from "puppeteer-core";
import { skills } from "../catalog.js";
import { films } from "../collection-catalog.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.argv[2] || "http://127.0.0.1:4173/";
const artifacts =
  process.env.FOUNDRY_ARTIFACT_DIR ||
  join(
    homedir(),
    "DevData/Artifacts/20261017-skills-promo/foundry/collection-v3/qa-local",
  );
const output = join(artifacts, "ui");
await mkdir(output, { recursive: true });
const report = {
  url,
  startedAt: new Date().toISOString(),
  testedCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim(),
  audioEvidence:
    "Native media state and decoded audio-track presence only. Chrome --mute-audio suppresses speakers; no listening review is claimed.",
  checks: [],
  consoleErrors: [],
  pageErrors: [],
};
let browser;
const card = (id) => '.film-card[data-skill="' + id + '"]';
const preview = (id) => card(id) + " .film-preview";
async function check(name, action) {
  try {
    const details = await action();
    report.checks.push({ name, passed: true, details });
    console.log("PASS", name);
  } catch (error) {
    report.checks.push({
      name,
      passed: false,
      error: error.message,
      details: error.details,
    });
    console.error("FAIL", name, error.message);
  }
}
async function configure(page, mobile = false) {
  page.setDefaultTimeout(12_000);
  await page.setCacheEnabled(false);
  await page.setViewport(
    mobile
      ? {
          width: 390,
          height: 844,
          deviceScaleFactor: 1,
          isMobile: true,
          hasTouch: true,
        }
      : { width: 1440, height: 1000, deviceScaleFactor: 1 },
  );
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "no-preference" },
  ]);
  page.on("console", (message) => {
    if (message.type() === "error") report.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => report.pageErrors.push(error.message));
}
async function ready(page) {
  await page.waitForSelector(".film-card .film-preview");
}
async function settled(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}
async function waitPlaying(page, id) {
  await page.waitForFunction(
    (id) => {
      const video = document.querySelector("#video-" + id);
      return !video.paused && video.readyState >= 2 && video.currentTime > 0.25;
    },
    { polling: "raf", timeout: 10_000 },
    id,
  );
}
async function state(page, id) {
  return page.evaluate((id) => {
    const video = document.querySelector("#video-" + id);
    let audioTracks = null;
    if (typeof video.captureStream === "function") {
      const stream = video.captureStream();
      audioTracks = stream.getAudioTracks().length;
      for (const track of stream.getTracks()) track.stop();
    }
    return {
      id,
      src: video.currentSrc,
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      currentTime: video.currentTime,
      paused: video.paused,
      muted: video.muted,
      volume: video.volume,
      audioTracks,
      decodedAudioBytes: video.webkitAudioDecodedByteCount ?? null,
      running: [...document.querySelectorAll(".skill-video")]
        .filter((video) => !video.paused)
        .map((video) => video.id),
    };
  }, id);
}
async function leave(page) {
  await page.mouse.move(2, 2);
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".skill-video")].every(
      (video) => video.paused && video.muted,
    ),
  );
}
async function decodePosters(page) {
  return page.$$eval(".film-preview .poster", async (images) =>
    Promise.all(
      images.map(async (image) => {
        image.loading = "eager";
        await image.decode();
        return {
          src: image.getAttribute("src"),
          width: image.naturalWidth,
          height: image.naturalHeight,
        };
      }),
    ),
  );
}
async function freeze(page, id, time, filename, caption) {
  await page.hover(preview(id));
  await waitPlaying(page, id);
  await page.evaluate(
    (id, time) => {
      const video = document.querySelector("#video-" + id);
      video.pause();
      video.currentTime = time;
      // Review-only presentation: keep the decoded video above its poster.
      video.closest(".film-card").classList.add("is-playing");
    },
    id,
    time,
  );
  await page.waitForFunction(
    (id, time) => {
      const video = document.querySelector("#video-" + id);
      return (
        video.paused &&
        !video.seeking &&
        video.readyState >= 2 &&
        Math.abs(video.currentTime - time) < 0.08
      );
    },
    {},
    id,
    time,
  );
  await page.screenshot({ path: join(output, filename) });
  const result = await page.$eval("#video-" + id, (video) => ({
    src: video.currentSrc,
    time: video.currentTime,
    paused: video.paused,
  }));
  assert.ok(
    !result.src.startsWith("blob:"),
    "Review must use the original HTTP media",
  );
  await leave(page);
  return {
    ...result,
    screenshot: filename,
    caption,
    transport: "original HTTP video",
    presentation:
      "Native pause/seek; is-playing retained only to expose the decoded review frame.",
  };
}
try {
  if (process.env.FOUNDRY_TESTED_COMMIT)
    assert.equal(
      report.testedCommit,
      process.env.FOUNDRY_TESTED_COMMIT,
      "HEAD differs from the requested tested commit",
    );
  browser = await puppeteer.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    userDataDir: join(artifacts, "chrome-collection-qa-profile"),
    headless: true,
    args: [
      "--mute-audio",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
    ],
  });
  const page = await browser.newPage();
  await configure(page);
  await page.mouse.move(2, 2);
  const navigation = await page.goto(url, { waitUntil: "domcontentloaded" });
  assert.equal(navigation.status(), 200);
  await page.evaluate(() => {
    localStorage.removeItem("foundry-static");
    localStorage.removeItem("foundry-bgm");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await ready(page);
  await check(
    "Idle is silent with nine inline films and no independent audio player",
    async () => {
      const actual = await page.evaluate(() => ({
        cards: document.querySelectorAll(".film-card").length,
        videos: document.querySelectorAll(".skill-video").length,
        audioElements: document.querySelectorAll("audio").length,
        soundPreference: document
          .querySelector("#bgm-toggle")
          .getAttribute("aria-pressed"),
        allPaused: [...document.querySelectorAll(".skill-video")].every(
          (video) => video.paused,
        ),
        allMuted: [...document.querySelectorAll(".skill-video")].every(
          (video) => video.muted,
        ),
      }));
      assert.deepEqual(actual, {
        cards: 9,
        videos: 9,
        audioElements: 0,
        soundPreference: "true",
        allPaused: true,
        allMuted: true,
      });
      return actual;
    },
  );
  await check("Nine collection posters decode", async () => {
    const posters = await decodePosters(page);
    assert.equal(posters.length, 9);
    for (const poster of posters)
      assert.ok(poster.width > 0 && poster.height > 0);
    for (const film of films)
      assert.ok(
        posters.some((poster) =>
          poster.src.endsWith("/media/collection/" + film.id + ".jpg"),
        ),
      );
    return posters;
  });
  await check(
    "All nine real hovers play their own audible-track film, leave pauses and mutes all",
    async () => {
      await page.click("h1");
      const results = [];
      for (const film of films) {
        try {
          await page.hover(preview(film.id));
          await waitPlaying(page, film.id);
          const actual = await state(page, film.id);
          assert.ok(
            actual.src.endsWith("/media/collection/" + film.id + ".mp4"),
          );
          assert.ok(
            Math.abs(actual.duration - film.duration) < 0.1,
            "Unexpected duration for " + film.id,
          );
          assert.equal(actual.width, 1280);
          assert.equal(actual.height, 720);
          assert.equal(actual.muted, false);
          assert.ok(actual.volume > 0);
          assert.ok(
            actual.audioTracks > 0 || actual.decodedAudioBytes > 0,
            "No decoded audio track for " + film.id,
          );
          assert.deepEqual(actual.running, ["video-" + film.id]);
          await leave(page);
          results.push({
            passed: true,
            ...actual,
            allPausedAndMutedOnLeave: true,
          });
        } catch (error) {
          results.push({ id: film.id, passed: false, error: error.message });
          await page.mouse.move(2, 2);
        }
      }
      // One rapid switch-return checks the same interaction rather than a new case matrix.
      await page.hover(preview(films[0].id));
      await page.hover(preview(films[1].id));
      await page.hover(preview(films[0].id));
      await waitPlaying(page, films[0].id);
      const returned = await state(page, films[0].id);
      assert.deepEqual(returned.running, ["video-" + films[0].id]);
      assert.equal(returned.muted, false);
      await leave(page);
      const failed = results.filter((result) => !result.passed);
      if (failed.length)
        throw Object.assign(
          new Error(
            failed.map((result) => result.id + ": " + result.error).join("; "),
          ),
          { details: results },
        );
      return {
        films: results,
        rapidSwitchReturn: {
          id: returned.id,
          running: returned.running,
          muted: returned.muted,
        },
      };
    },
  );
  await check(
    "One idle sound click switches OFF; ordinary gestures and reload preserve OFF; explicit ON restores audio",
    async () => {
      await leave(page);
      await page.click("#bgm-toggle");
      await page.waitForFunction(
        () => document.querySelector("#bgm-toggle").dataset.state === "off",
      );
      await page.click("h1");
      await page.hover(preview("ns-spec-cards"));
      await waitPlaying(page, "ns-spec-cards");
      assert.equal(
        await page.$eval("#video-ns-spec-cards", (video) => video.muted),
        true,
      );
      await leave(page);
      await page.reload({ waitUntil: "domcontentloaded" });
      await ready(page);
      const persisted = await page.evaluate(() => ({
        preference: localStorage.getItem("foundry-bgm"),
        state: document.querySelector("#bgm-toggle").dataset.state,
      }));
      assert.deepEqual(persisted, { preference: "off", state: "off" });
      await page.click("h1");
      await page.hover(preview("ns-spec-cards"));
      await waitPlaying(page, "ns-spec-cards");
      assert.equal(
        await page.$eval("#video-ns-spec-cards", (video) => video.muted),
        true,
      );
      await leave(page);
      await page.click("#bgm-toggle");
      await page.hover(preview("ns-spec-cards"));
      await waitPlaying(page, "ns-spec-cards");
      const restored = await state(page, "ns-spec-cards");
      assert.equal(restored.muted, false);
      await leave(page);
      return {
        ordinaryClickDidNotEnableSound: true,
        persisted,
        explicitOn: {
          muted: restored.muted,
          audioTracks: restored.audioTracks,
        },
      };
    },
  );

  const mobile = await browser.newPage();
  await configure(mobile, true);
  await mobile.goto(url, { waitUntil: "domcontentloaded" });
  await ready(mobile);
  await check(
    "390px touch plays once, second tap stops, and leaving the viewport stops playback",
    async () => {
      await mobile.tap(preview("ns-spec-cards"));
      await waitPlaying(mobile, "ns-spec-cards");
      const actual = await state(mobile, "ns-spec-cards");
      assert.deepEqual(actual.running, ["video-ns-spec-cards"]);
      assert.equal(actual.muted, false);
      await mobile.tap(preview("ns-spec-cards"));
      await mobile.waitForFunction(
        () =>
          document.querySelector("#video-ns-spec-cards").paused &&
          document.querySelector("#video-ns-spec-cards").muted,
      );
      await mobile.tap(preview("ns-spec-cards"));
      await waitPlaying(mobile, "ns-spec-cards");
      await mobile.evaluate(() => {
        const rect = document
          .querySelector("#ns-spec-cards")
          .getBoundingClientRect();
        scrollTo({ top: scrollY + rect.bottom + 100, behavior: "instant" });
      });
      await mobile.waitForFunction(() =>
        [...document.querySelectorAll(".skill-video")].every(
          (video) => video.paused && video.muted,
        ),
      );
      return {
        firstTap: actual,
        secondTapStopped: true,
        scrolledOutStopped: true,
      };
    },
  );
  for (const width of [390, 320]) {
    await check("Mobile layout fits " + width + "px", async () => {
      await mobile.setViewport({
        width,
        height: 844,
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      });
      await mobile.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await settled(mobile);
      const dimensions = await mobile.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      assert.ok(
        dimensions.document <= width + 1 && dimensions.body <= width + 1,
        JSON.stringify(dimensions),
      );
      await decodePosters(mobile);
      await mobile.screenshot({ path: join(output, "mob" + width + ".png") });
      return dimensions;
    });
  }
  await mobile.close();
  await page.bringToFront();
  await check(
    "Reduced motion ignores hover but allows explicit play and stop",
    async () => {
      await page.emulateMediaFeatures([
        { name: "prefers-reduced-motion", value: "reduce" },
      ]);
      await page.evaluate(() => localStorage.removeItem("foundry-static"));
      await page.reload({ waitUntil: "domcontentloaded" });
      await ready(page);
      await page.hover(preview("ns-spec-cards"));
      await settled(page);
      const before = await page.evaluate(() => ({
        systemReduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
        staticClass: document.documentElement.classList.contains("static-mode"),
        allPaused: [...document.querySelectorAll(".skill-video")].every(
          (video) => video.paused,
        ),
      }));
      assert.deepEqual(before, {
        systemReduced: true,
        staticClass: true,
        allPaused: true,
      });
      await page.click(preview("ns-spec-cards"));
      await waitPlaying(page, "ns-spec-cards");
      await page.click(preview("ns-spec-cards"));
      await page.waitForFunction(
        () => document.querySelector("#video-ns-spec-cards").paused,
      );
      return { before, manualPlayAndStop: true };
    },
  );
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "no-preference" },
  ]);
  await page.reload({ waitUntil: "domcontentloaded" });
  await ready(page);
  await check(
    "Seven ZIPs and skill sources remain readable; two private source links remain accurate",
    async () => {
      const links = await page.$$eval(".film-card", (cards) =>
        cards.map((card) => {
          const source = card.querySelector(".skill-source");
          return {
            id: card.dataset.skill,
            href: source.getAttribute("href"),
            text: source.textContent,
            download: source.hasAttribute("download"),
          };
        }),
      );
      for (const skill of skills) {
        const link = links.find((link) => link.id === skill.id);
        assert.equal(link.href, skill.zipUrl || skill.skillUrl);
        if (!skill.zipUrl) {
          assert.equal(link.download, false);
          assert.ok(!link.text.includes("ZIP"));
        }
      }
      const paths = skills
        .filter((skill) => skill.zipUrl)
        .flatMap((skill) => [skill.zipUrl, skill.skillUrl]);
      assert.equal(paths.length, 14);
      const responses = await page.evaluate(
        async (paths) =>
          Promise.all(
            paths.map(async (path) => ({
              path,
              status: (await fetch(path, { method: "HEAD" })).status,
            })),
          ),
        paths,
      );
      for (const result of responses)
        assert.equal(result.status, 200, result.path);
      return { links, resources: responses };
    },
  );
  for (const [index, id] of ["ns-spec-cards", "test-journal"].entries()) {
    await check("Actual example dialog opens and closes: " + id, async () => {
      await page.click(card(id) + " .show-example");
      await page.waitForFunction(
        () => document.querySelector("#example-dialog").open,
      );
      const actual = await page.$eval("#example-image", async (image) => {
        await image.decode();
        return {
          src: image.getAttribute("src"),
          width: image.naturalWidth,
          height: image.naturalHeight,
        };
      });
      assert.ok(actual.width > 0 && actual.height > 0);
      if (index === 0)
        await page.screenshot({ path: join(output, "actual-example.png") });
      await page.click("#example-dialog .close-dialog");
      await page.waitForFunction(
        () => !document.querySelector("#example-dialog").open,
      );
      return { ...actual, closed: true };
    });
  }
  await check(
    "Clipboard denial still offers selected manual-copy text",
    async () => {
      await page.evaluate(() =>
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async () => {
              throw new Error("QA clipboard denial");
            },
          },
        }),
      );
      await page.click(card("ns-spec-cards") + " .copy-skill");
      await page.waitForFunction(
        () => document.querySelector("#copy-dialog").open,
      );
      const copy = await page.$eval("#copy-text", (input) => ({
        text: input.value,
        selected: input.selectionEnd - input.selectionStart,
        length: input.value.length,
        focused: document.activeElement === input,
      }));
      assert.ok(
        copy.text.includes(
          "https://github.com/Nature-Select/ns-skills/tree/main/base/ns-spec-cards",
        ),
      );
      assert.equal(copy.selected, copy.length);
      assert.equal(copy.focused, true);
      await page.click("#copy-dialog .done");
      await page.waitForFunction(
        () => !document.querySelector("#copy-dialog").open,
      );
      return { selected: copy.selected, focused: copy.focused, closed: true };
    },
  );
  await check(
    "Gallery review screenshots show all nine posters without active playback",
    async () => {
      await leave(page);
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await decodePosters(page);
      await settled(page);
      await page.screenshot({ path: join(output, "desktop.png") });
      await page.screenshot({
        path: join(output, "fullpage.png"),
        fullPage: true,
      });
      return {
        screenshots: ["desktop.png", "fullpage.png"],
        allPausedAndMuted: true,
        caption:
          "No hover: nine distinct collection posters; no video playing.",
      };
    },
  );
  await check(
    "Review frames expose original HTTP video after actual playback",
    async () => {
      const frames = [];
      frames.push(
        await freeze(
          page,
          "ns-spec-cards",
          7.7,
          "cards-hand-frame.png",
          "决策卡 7.7s：手持决策卡；原HTTP影片已暂停，仅供画面审阅。",
        ),
      );
      frames.push(
        await freeze(
          page,
          "test-journal",
          6.8,
          "journal-bug-frame.png",
          "测试日志 6.8s：关键问题与放大镜；原HTTP影片已暂停，仅供画面审阅。",
        ),
      );
      return frames;
    },
  );
  await check("No console or uncaught page errors", async () => {
    assert.deepEqual(report.consoleErrors, []);
    assert.deepEqual(report.pageErrors, []);
    return { consoleErrors: 0, pageErrors: 0 };
  });
} catch (error) {
  report.fatalError = error.stack;
  console.error(error.stack);
} finally {
  if (browser) await browser.close();
  report.finishedAt = new Date().toISOString();
  report.passed =
    !report.fatalError &&
    report.checks.length > 0 &&
    report.checks.every((check) => check.passed);
  await writeFile(
    join(output, "verification.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log("Verification:", join(output, "verification.json"));
  if (!report.passed) process.exitCode = 1;
}

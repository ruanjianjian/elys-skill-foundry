import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import puppeteer from "puppeteer-core";
import { skills } from "../catalog.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const url =
  process.argv[2] || "http://127.0.0.1:4173/?cut=cinematic#ns-spec-cards";
const artifacts =
  process.env.FOUNDRY_ARTIFACT_DIR ||
  join(homedir(), "DevData/Artifacts/20261017-skills-promo/foundry/pilot");
const output = join(artifacts, "ui");
await mkdir(output, { recursive: true });
const report = {
  url,
  startedAt: new Date().toISOString(),
  testedCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim(),
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
    report.checks.push({ name, passed: false, error: error.message });
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
async function waitPlaying(page, id) {
  await page.waitForFunction(
    (id) => {
      const video = document.querySelector("#video-" + id);
      return !video.paused && video.readyState >= 2 && video.currentTime > 0.25;
    },
    { polling: "raf", timeout: 8000 },
    id,
  );
}
async function state(page, id) {
  return page.evaluate((id) => {
    const video = document.querySelector("#video-" + id);
    return {
      src: video.currentSrc,
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      currentTime: video.currentTime,
      muted: video.muted,
      paused: video.paused,
      running: [...document.querySelectorAll(".skill-video")]
        .filter((video) => !video.paused)
        .map((video) => video.id),
      allMuted: [...document.querySelectorAll(".skill-video")].every(
        (video) => video.muted,
      ),
    };
  }, id);
}
async function freezeActualFrame(page, time, filename) {
  await page.evaluate((time) => {
    const video = document.querySelector("#video-ns-spec-cards");
    video.pause();
    video.currentTime = time;
    // QA-only presentation: preserve the real decoded frame instead of poster.
    video.closest(".film-card").classList.add("is-playing");
  }, time);
  await page.waitForFunction(
    (time) => {
      const video = document.querySelector("#video-ns-spec-cards");
      return (
        video.paused &&
        !video.seeking &&
        video.readyState >= 2 &&
        Math.abs(video.currentTime - time) < 0.08
      );
    },
    {},
    time,
  );
  await page.screenshot({ path: join(output, filename) });
  return {
    time: await page.$eval(
      "#video-ns-spec-cards",
      (video) => video.currentTime,
    ),
    screenshot: filename,
    frozenDecodedVideo: true,
    reviewTransport: "original HTTP video",
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
    userDataDir: join(artifacts, "chrome-pilot-qa-profile"),
    headless: true,
    args: [
      "--mute-audio",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
    ],
  });
  const page = await browser.newPage();
  await configure(page);
  const navigation = await page.goto(url, { waitUntil: "domcontentloaded" });
  assert.equal(navigation.status(), 200);
  await page.evaluate(() => {
    localStorage.removeItem("foundry-static");
    localStorage.removeItem("foundry-bgm");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(preview("ns-spec-cards"));
  await check("Nine cards remain and all poster images decode", async () => {
    const posters = await page.$$eval(".film-preview .poster", async (images) =>
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
    assert.equal(posters.length, 9);
    assert.ok(posters[0].src.endsWith("/media/pilots/ns-spec-cards.jpg"));
    for (const poster of posters)
      assert.ok(poster.width > 0 && poster.height > 0);
    return posters;
  });
  await check(
    "Real hover plays the 16-second pilot exclusively and muted",
    async () => {
      await page.mouse.move(3, 3);
      await page.hover(preview("ns-spec-cards"));
      await waitPlaying(page, "ns-spec-cards");
      const actual = await state(page, "ns-spec-cards");
      assert.ok(actual.src.endsWith("/media/pilots/ns-spec-cards.mp4"));
      assert.ok(Math.abs(actual.duration - 16) < 0.1);
      assert.equal(actual.width, 1280);
      assert.equal(actual.height, 720);
      assert.deepEqual(actual.running, ["video-ns-spec-cards"]);
      assert.equal(actual.allMuted, true);
      return actual;
    },
  );
  await check(
    "Real click starts the 16-second pilot BGM and sound button stops it",
    async () => {
      await page.click("h1");
      await page.waitForFunction(() => {
        const audio = document.querySelector("#bgm");
        return (
          !audio.paused && audio.readyState >= 2 && audio.currentTime > 0.1
        );
      });
      const actual = await page.$eval("#bgm", (audio) => ({
        src: audio.currentSrc,
        duration: audio.duration,
        paused: audio.paused,
        muted: audio.muted,
        currentTime: audio.currentTime,
      }));
      assert.ok(actual.src.endsWith("/media/pilots/score.m4a"));
      assert.ok(Math.abs(actual.duration - 16) < 0.1);
      assert.equal(actual.muted, false);
      await page.click("#bgm-toggle");
      await page.waitForFunction(
        () =>
          document.querySelector("#bgm").paused &&
          document.querySelector("#bgm-toggle").dataset.state === "off",
      );
      return {
        ...actual,
        stoppedByButton: true,
        audioOutput: "Chrome --mute-audio; browser autoplay policy retained",
      };
    },
  );
  await check(
    "Hovering the next card switches to its original 12-second film",
    async () => {
      await page.hover(preview("ns-spec-cards"));
      await waitPlaying(page, "ns-spec-cards");
      await page.hover(preview("test-journal"));
      await waitPlaying(page, "test-journal");
      const next = await state(page, "test-journal");
      assert.ok(next.src.endsWith("/media/films/test-journal.mp4"));
      assert.ok(Math.abs(next.duration - 12) < 0.1);
      assert.deepEqual(next.running, ["video-test-journal"]);
      assert.equal(next.allMuted, true);
      const pilotPaused = await page.$eval(
        "#video-ns-spec-cards",
        (video) => video.paused,
      );
      assert.equal(pilotPaused, true);
      return { ...next, pilotPaused };
    },
  );
  await check(
    "Pilot download is updated and the other eight video paths remain unchanged",
    async () => {
      const links = await page.$$eval(".film-card", (cards) =>
        cards.map((card) => ({
          id: card.dataset.skill,
          video: card.querySelector("video").getAttribute("src"),
          film: card.querySelector(".film-download").getAttribute("href"),
        })),
      );
      for (const skill of skills) {
        const actual = links.find((link) => link.id === skill.id);
        const expected =
          skill.id === "ns-spec-cards"
            ? "media/pilots/ns-spec-cards.mp4"
            : "media/films/" + skill.id + ".mp4";
        assert.equal(actual.video, expected);
        assert.equal(actual.film, expected);
      }
      return links;
    },
  );
  await check(
    "Review screenshots show actual decoded pilot frames",
    async () => {
      await page.hover(preview("ns-spec-cards"));
      await waitPlaying(page, "ns-spec-cards");
      const frames = [];
      for (const time of [6.8, 12.5, 14.8])
        frames.push(
          await freezeActualFrame(page, time, "frame-" + time + ".png"),
        );
      await page.screenshot({ path: join(output, "desktop-viewport.png") });
      return frames;
    },
  );

  const mobile = await browser.newPage();
  await configure(mobile, true);
  await mobile.goto(url, { waitUntil: "domcontentloaded" });
  await mobile.waitForSelector(preview("ns-spec-cards"));
  await check(
    "Mobile pilot taps play then pause, stays muted, and fits 390px",
    async () => {
      await mobile.tap(preview("ns-spec-cards"));
      await waitPlaying(mobile, "ns-spec-cards");
      const actual = await state(mobile, "ns-spec-cards");
      assert.ok(actual.src.endsWith("/media/pilots/ns-spec-cards.mp4"));
      assert.ok(Math.abs(actual.duration - 16) < 0.1);
      assert.equal(actual.allMuted, true);
      assert.deepEqual(actual.running, ["video-ns-spec-cards"]);
      await mobile.tap(preview("ns-spec-cards"));
      await mobile.waitForFunction(
        () => document.querySelector("#video-ns-spec-cards").paused,
      );
      const dimensions = await mobile.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      assert.equal(dimensions.viewport, 390);
      assert.ok(dimensions.document <= 391 && dimensions.body <= 391);
      await mobile.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await freezeActualFrame(mobile, 6.8, "mobile-viewport.png");
      return { ...actual, pausedAfterSecondTap: true, dimensions };
    },
  );
  await mobile.close();
  await check("No console or page errors", async () => {
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

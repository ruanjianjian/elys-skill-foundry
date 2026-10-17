import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const url = process.argv[2] || "http://127.0.0.1:4173/?cut=cinematic";
const artifacts =
  process.env.FOUNDRY_ARTIFACT_DIR ||
  "/Users/ryanjade/DevData/Artifacts/20261017-skills-promo/foundry/collection-v3";
await mkdir(artifacts, { recursive: true });
const report = { url, checks: [], errors: [] };
const browser = await puppeteer.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: join(artifacts, "chrome-sound-qa-profile"),
  args: ["--mute-audio"],
});
async function check(name, run) {
  try {
    const details = await run();
    report.checks.push({ name, passed: true, details });
    console.log("PASS", name);
  } catch (error) {
    report.checks.push({ name, passed: false, error: error.message });
    console.error("FAIL", name, error.message);
  }
}
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.setCacheEnabled(false);
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page.evaluateOnNewDocument(() => {
    localStorage.removeItem("foundry-bgm");
    localStorage.removeItem("foundry-static");
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".film-card");
  await page.click("h1");
  await page.hover(".film-card:first-child .film-preview");
  await page.waitForFunction(() => {
    const v = document.querySelector(".skill-video");
    return !v.paused && v.currentTime > 0.3;
  });
  await check(
    "Hover can play the active soundtrack after a user gesture",
    async () => {
      const audible = await page.$$eval("video,audio", (els) =>
        els
          .filter((m) => !m.paused && !m.muted && m.volume > 0)
          .map((m) => ({ tag: m.tagName, time: m.currentTime })),
      );
      assert.equal(audible.length, 1);
      return audible;
    },
  );
  await page.mouse.move(3, 110);
  await check(
    "Leaving the skill stops every audible media element",
    async () => {
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll("video,audio")].every(
            (m) => m.paused || m.muted || m.volume === 0,
          ),
        { timeout: 2000 },
      );
      return page.$$eval("video,audio", (els) =>
        els.map((m) => ({ tag: m.tagName, paused: m.paused, muted: m.muted })),
      );
    },
  );
  await page.click("#bgm-toggle");
  await check(
    "Sound toggle switches OFF even while nothing plays",
    async () => {
      assert.equal(
        await page.$eval("#bgm-toggle", (b) => b.getAttribute("aria-pressed")),
        "false",
      );
      await page.hover(".film-card:first-child .film-preview");
      await page.waitForFunction(
        () => !document.querySelector(".skill-video").paused,
      );
      assert.equal(
        await page.$$eval(
          "video,audio",
          (els) =>
            els.filter((m) => !m.paused && !m.muted && m.volume > 0).length,
        ),
        0,
      );
      return { soundEnabled: false, audible: 0 };
    },
  );
} catch (error) {
  report.fatal = error.stack;
  console.error(error.message);
} finally {
  await browser.close();
  report.passed =
    !report.fatal &&
    report.errors.length === 0 &&
    report.checks.every((c) => c.passed);
  await writeFile(
    join(
      artifacts,
      process.env.FOUNDRY_SOUND_REPORT || "sound-regression.json",
    ),
    JSON.stringify(report, null, 2) + "\n",
  );
  if (!report.passed) process.exitCode = 1;
}

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
    "DevData/Artifacts/20261017-skills-promo/foundry/native-mp3/qa-local",
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
    "Card films remain muted. This gallery suite keeps music OFF for card checks. Native MP3 playback is accepted separately with the Work local browser; no listening review is claimed.",
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
async function stableDefaultFrame(page) {
  await page.waitForFunction(() => {
    const videos = [...document.querySelectorAll(".skill-video")];
    const faces = [...document.querySelectorAll(".card-face")];
    const title = document.querySelector(".liquid-title-copy");
    return (
      videos.length > 0 &&
      videos.every(
        (video) =>
          video.paused &&
          video.muted &&
          Number(getComputedStyle(video).opacity) <= 0.001,
      ) &&
      faces.length === videos.length &&
      faces.every((face) => Number(getComputedStyle(face).opacity) >= 0.999) &&
      title &&
      Number(getComputedStyle(title).opacity) > 0.98
    );
  });
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
      decodedVideoFrames: video.getVideoPlaybackQuality?.().totalVideoFrames ?? null,
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
async function downloadZip(page, skill) {
  assert.ok(skill?.zipUrl, "Multi-agent skill must have a real ZIP link");
  const downloadDir = join(artifacts, "downloads");
  await mkdir(downloadDir, { recursive: true });
  const client = await browser.target().createCDPSession();
  try {
    await client.send("Browser.setDownloadBehavior", {
      behavior: "allowAndName",
      downloadPath: downloadDir,
      eventsEnabled: true,
    });
    const expectedUrl = new URL(skill.zipUrl, url).href;
    const download = await new Promise((resolve, reject) => {
      let started;
      const finish = (error, result) => {
        clearTimeout(timer);
        client.off("Browser.downloadWillBegin", onBegin);
        client.off("Browser.downloadProgress", onProgress);
        error ? reject(error) : resolve(result);
      };
      const onBegin = (event) => {
        if (event.url === expectedUrl) started = event;
      };
      const onProgress = (event) => {
        if (!started || event.guid !== started.guid) return;
        if (event.state === "canceled")
          finish(new Error("Multi-agent ZIP download canceled"));
        if (event.state === "completed")
          finish(null, {
            url: started.url,
            guid: started.guid,
            filename: started.suggestedFilename,
            bytes: event.totalBytes,
          });
      };
      const timer = setTimeout(
        () => finish(new Error("Multi-agent ZIP download did not complete")),
        12_000,
      );
      client.on("Browser.downloadWillBegin", onBegin);
      client.on("Browser.downloadProgress", onProgress);
      page
        .click(card(skill.id) + " .skill-source")
        .catch((error) => finish(error));
    });
    assert.equal(download.url, expectedUrl);
    assert.equal(download.filename, skill.id + ".zip");
    const bytes = await readFile(join(downloadDir, download.guid));
    assert.deepEqual(
      [...bytes.subarray(0, 4)],
      [0x50, 0x4b, 0x03, 0x04],
      "Downloaded asset must have a ZIP local-file signature",
    );
    assert.ok(bytes.length > 4);
    await leave(page);
    await page.$eval(card(skill.id), (element) =>
      element.scrollIntoView({ block: "center", behavior: "instant" }),
    );
    await stableDefaultFrame(page);
    await page.waitForFunction(
      () => {
        const columns = getComputedStyle(document.querySelector("#skill-grid"))
          .gridTemplateColumns.split(/\s+/)
          .map(Number.parseFloat);
        return (
          columns.length === 3 &&
          Math.max(...columns) - Math.min(...columns) <= 1
        );
      },
      { timeout: 3000 },
    );
    await page.screenshot({ path: join(output, "multi-download.png") });
    return {
      ...download,
      bytes: bytes.length,
      signature: "PK0304",
      screenshot: "multi-download.png",
      transport:
        "Real click with native Chrome download events and downloaded bytes",
    };
  } finally {
    await client.detach();
  }
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
    pipe: true,
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
    `Idle is silent with ${skills.length} muted card films and one paused native MP3`,
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
        cards: skills.length,
        videos: skills.length,
        audioElements: 1,
        soundPreference: "true",
        allPaused: true,
        allMuted: true,
      });
      const directory = await page.$$eval(".film-card", (cards) =>
        cards.map((card) => ({
          id: card.dataset.skill,
          lifecycle: card.dataset.lifecycle || null,
          featured: card.dataset.featured === "true",
          description: [
            card.querySelector(".film-description")?.textContent,
            card.querySelector(".install-note")?.textContent,
          ]
            .filter(Boolean)
            .join(" "),
        })),
      );
      assert.deepEqual(
        directory.map((item) => item.id),
        skills.map((skill) => skill.id),
      );
      assert.equal(
        directory.some((item) => item.id === "engineering-delivery"),
        true,
      );
      assert.equal(directory[2].id, "mac-dev-resource-guard");
      assert.equal(directory[3].id, "multi-agent-coding");
      assert.deepEqual(
        directory.filter((item) => item.featured).map((item) => item.id),
        ["ns-spec-cards", "test-journal", "mac-dev-resource-guard"],
      );
      assert.deepEqual(
        directory
          .filter((item) => item.lifecycle === "retiring")
          .map((item) => item.id)
          .sort(),
        [
          "codex-weekly-session-report",
          "elys-code-development",
          "engineering-delivery",
        ],
      );
      assert.deepEqual(
        films.map((film) => film.id).sort(),
        skills.map((skill) => skill.id).sort(),
      );
      const multiCatalog = skills.find(
        (skill) => skill.id === "multi-agent-coding",
      );
      assert.ok(!multiCatalog.installPending);
      assert.equal(multiCatalog.skillUrl, "skills/multi-agent-coding/SKILL.md");
      assert.equal(multiCatalog.zipUrl, "downloads/multi-agent-coding.zip");
      const multi = directory.find((item) => item.id === "multi-agent-coding");
      assert.match(multi.description, /Claude/i);
      assert.match(multi.description, /Codex/i);
      assert.match(multi.description, /session|会话/i);
      return { ...actual, directory };
    },
  );
  // Keep card UX deterministic; the Work local-browser journey proves native MP3 behavior.
  await page.click("#bgm-toggle");
  await page.waitForFunction(() => document.querySelector("#bgm-toggle").dataset.state === "off");
  await check(`${skills.length} collection posters decode`, async () => {
    const posters = await decodePosters(page);
    assert.equal(posters.length, skills.length);
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
    "Liquid title rotates without layout shift; hover expands its column and verb while media stops immediately on leave",
    async () => {
      await leave(page);
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await page.waitForSelector(".liquid-title-group .liquid-title-copy");
      const before = await page.evaluate(() => ({
        title: document.querySelector(".liquid-title-copy").textContent.trim(),
        titleTop:
          document.querySelector(".title-stage").getBoundingClientRect().top +
          scrollY,
        titleHeight: document
          .querySelector(".title-stage")
          .getBoundingClientRect().height,
        gridTop:
          document.querySelector("#skill-grid").getBoundingClientRect().top +
          scrollY,
      }));
      await page.waitForFunction(
        (previous) => {
          const copy = document.querySelector(".liquid-title-copy");
          return (
            copy &&
            copy.textContent.trim() !== previous &&
            copy.closest("h1").classList.contains("is-idle") &&
            Number(getComputedStyle(copy).opacity) > 0.98
          );
        },
        { timeout: 6500 },
        before.title,
      );
      const after = await page.evaluate(() => ({
        title: document.querySelector(".liquid-title-copy").textContent.trim(),
        titleTop:
          document.querySelector(".title-stage").getBoundingClientRect().top +
          scrollY,
        titleHeight: document
          .querySelector(".title-stage")
          .getBoundingClientRect().height,
        gridTop:
          document.querySelector("#skill-grid").getBoundingClientRect().top +
          scrollY,
      }));
      assert.notEqual(after.title, before.title);
      assert.ok(Math.abs(after.titleTop - before.titleTop) <= 1);
      assert.ok(Math.abs(after.titleHeight - before.titleHeight) <= 1);
      assert.ok(Math.abs(after.gridTop - before.gridTop) <= 1);
      await stableDefaultFrame(page);
      await page.screenshot({ path: join(output, "surface-idle.png") });
      await page.click("h1");
      await page.hover(preview("ns-spec-cards"));
      await waitPlaying(page, "ns-spec-cards");
      await page.waitForFunction(() => {
        const columns = getComputedStyle(document.querySelector("#skill-grid"))
          .gridTemplateColumns.split(/\s+/)
          .map(Number.parseFloat);
        const blob = document.querySelector("#ns-spec-cards .card-verb-blob");
        return (
          columns.length === 3 &&
          columns[0] > columns[1] * 1.35 &&
          blob?.getBoundingClientRect().width > 5
        );
      });
      const activeSurface = await page.evaluate(() => ({
        columns: getComputedStyle(document.querySelector("#skill-grid"))
          .gridTemplateColumns.split(/\s+/)
          .map(Number.parseFloat),
        blobWidth: document
          .querySelector("#ns-spec-cards .card-verb-blob")
          .getBoundingClientRect().width,
        intendedCard: document.querySelector(".film-card.has-intent")?.id,
      }));
      await page.screenshot({ path: join(output, "surface-active.png") });
      await page.mouse.move(2, 2);
      const stoppedImmediately = await page.$$eval(".skill-video", (videos) =>
        videos.every((video) => video.paused && video.muted),
      );
      assert.equal(stoppedImmediately, true);
      await page.waitForFunction(
        () => {
          const columns = getComputedStyle(
            document.querySelector("#skill-grid"),
          )
            .gridTemplateColumns.split(/\s+/)
            .map(Number.parseFloat);
          return (
            columns.length === 3 &&
            Math.max(...columns) - Math.min(...columns) <= 1
          );
        },
        { timeout: 3000 },
      );
      const idleColumns = await page.$eval(
        "#skill-grid",
        (grid) => getComputedStyle(grid).gridTemplateColumns,
      );
      return {
        before,
        after,
        activeSurface,
        stoppedImmediately,
        idleColumns,
        screenshots: ["surface-idle.png", "surface-active.png"],
      };
    },
  );
  await check(
    `All ${skills.length} real hovers decode their muted card film; leave pauses all`,
    async () => {
      await page.click("h1");
      const results = [];
      for (const film of films) {
        try {
          await page.hover(preview(film.id));
          await waitPlaying(page, film.id);
          const actual = await state(page, film.id);
          assert.ok(
            new URL(actual.src).pathname.endsWith("/media/collection/" + film.id + ".mp4"),
          );
          assert.equal(new URL(actual.src).searchParams.get("v"), "music-v3");
          assert.ok(
            Math.abs(actual.duration - film.duration) < 0.1,
            "Unexpected duration for " + film.id,
          );
          assert.equal(actual.width, 1280);
          assert.equal(actual.height, 720);
          assert.equal(actual.muted, true);
          if (actual.decodedVideoFrames !== null) assert.ok(actual.decodedVideoFrames > 0, "No decoded video frames for " + film.id);
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
      assert.equal(returned.muted, true);
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
    "Music intent toggles OFF once and persists; card films remain muted when intent is explicitly ON",
    async () => {
      await leave(page);
      if (await page.$eval("#bgm-toggle", button => button.getAttribute("aria-pressed") === "false")) await page.click("#bgm-toggle");
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
      await page.screenshot({ path: join(output, "sound-off.png") });
      await leave(page);
      await page.click("#bgm-toggle");
      const explicitOn = await page.evaluate(() => ({
        preference: localStorage.getItem("foundry-bgm"),
        pressed: document.querySelector("#bgm-toggle").getAttribute("aria-pressed"),
        cardsMuted: [...document.querySelectorAll(".skill-video")].every(video => video.muted),
      }));
      assert.deepEqual(explicitOn, { preference: "on", pressed: "true", cardsMuted: true });
      await page.click("#bgm-toggle");
      return { ordinaryClickDidNotEnableSound: true, persisted, explicitOn, externalPlaybackEvidence: "See Work local-browser native MP3 journey" };
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
      assert.equal(actual.muted, true);
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
      await stableDefaultFrame(mobile);
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
      await page.waitForFunction(
        () =>
          document.querySelector(".liquid-title-copy") &&
          !document.querySelector(".liquid-title-group"),
      );
      await page.hover(preview("ns-spec-cards"));
      await settled(page);
      const before = await page.evaluate(() => ({
        systemReduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
        staticClass: document.documentElement.classList.contains("static-mode"),
        allPaused: [...document.querySelectorAll(".skill-video")].every(
          (video) => video.paused,
        ),
        titleLiquidGroups: document.querySelectorAll(".liquid-title-group")
          .length,
        inlineColumns:
          document.querySelector("#skill-grid").style.gridTemplateColumns,
      }));
      assert.deepEqual(before, {
        systemReduced: true,
        staticClass: true,
        allPaused: true,
        titleLiquidGroups: 0,
        inlineColumns: "",
      });
      const titleWindow = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const stage = document.querySelector(".title-stage");
            const initial = stage
              .querySelector(".liquid-title-copy")
              .textContent.trim();
            const changes = [];
            const observer = new MutationObserver(() => {
              const current = stage
                .querySelector(".liquid-title-copy")
                ?.textContent.trim();
              if (current !== initial) changes.push(current);
            });
            observer.observe(stage, {
              childList: true,
              subtree: true,
              characterData: true,
            });
            setTimeout(() => {
              observer.disconnect();
              resolve({
                initial,
                final: stage
                  .querySelector(".liquid-title-copy")
                  .textContent.trim(),
                changes,
                observedMs: 3800,
              });
            }, 3800);
          }),
      );
      assert.equal(titleWindow.final, titleWindow.initial);
      assert.deepEqual(titleWindow.changes, []);
      await page.click(preview("ns-spec-cards"));
      await waitPlaying(page, "ns-spec-cards");
      await page.click(preview("ns-spec-cards"));
      await page.waitForFunction(
        () => document.querySelector("#video-ns-spec-cards").paused,
      );
      return { before, titleWindow, manualPlayAndStop: true };
    },
  );
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "no-preference" },
  ]);
  await page.reload({ waitUntil: "domcontentloaded" });
  await ready(page);
  await check(
    "Catalog ZIPs and skill sources remain readable; non-ZIP source links remain accurate",
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
        const expectedHref = skill.zipUrl || skill.skillUrl;
        assert.equal(link.href, expectedHref);
        if (!skill.zipUrl) {
          assert.equal(link.download, false);
          assert.ok(!link.text.includes("ZIP"));
        } else {
          assert.equal(link.download, true);
          assert.ok(link.text.includes("ZIP"));
        }
      }
      const downloadable = skills.filter((skill) => skill.zipUrl);
      const paths = downloadable.flatMap((skill) => [
        skill.zipUrl,
        skill.skillUrl,
      ]);
      assert.equal(paths.length, downloadable.length * 2);
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
      const downloadedMulti = await downloadZip(
        page,
        skills.find((skill) => skill.id === "multi-agent-coding"),
      );
      return {
        zipCount: downloadable.length,
        sourceCount: downloadable.length,
        downloadedMulti,
        links,
        resources: responses,
      };
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
    `Gallery review screenshots show ${skills.length} default text cards without active playback`,
    async () => {
      await leave(page);
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await decodePosters(page);
      await settled(page);
      await page.waitForFunction(
        () => {
          const columns = getComputedStyle(
            document.querySelector("#skill-grid"),
          )
            .gridTemplateColumns.split(/\s+/)
            .map(Number.parseFloat);
          return (
            columns.length === 3 &&
            Math.max(...columns) - Math.min(...columns) <= 1
          );
        },
        { timeout: 3000 },
      );
      const faces = await page.$$eval(".film-card", (cards) =>
        cards.map((card) => ({
          id: card.id,
          textOpacity: Number(
            getComputedStyle(card.querySelector(".card-face")).opacity,
          ),
          posterOpacity: Number(
            getComputedStyle(card.querySelector(".poster")).opacity,
          ),
        })),
      );
      assert.equal(faces.length, skills.length);
      for (const face of faces) {
        assert.ok(
          face.textOpacity > 0.98,
          face.id + " default text face must be visible",
        );
        assert.equal(face.posterOpacity, 0);
      }
      await stableDefaultFrame(page);
      if (await page.$eval("#bgm-toggle", button => button.getAttribute("aria-pressed") === "false")) await page.click("#bgm-toggle");
      await page.screenshot({ path: join(output, "desktop.png") });
      await page.screenshot({
        path: join(output, "fullpage.png"),
        fullPage: true,
      });
      await page.click("#bgm-toggle");
      return {
        screenshots: ["desktop.png", "fullpage.png"],
        allPausedAndMuted: true,
        faces,
        caption: `No hover: ${skills.length} default text cards in the restored original palette; posters hidden and no video playing.`,
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
  if (browser) {
    const pages = await browser.pages();
    const closing = await Promise.allSettled(pages.map(page => page.close({ runBeforeUnload: false })));
    await browser.close();
    report.cleanup = { closedPages: pages.length, pageCloseErrors: closing.filter(result => result.status === "rejected").map(result => result.reason?.message || String(result.reason)), browserDisconnected: !browser.connected, activeResourcesAfterClose: process.getActiveResourcesInfo?.() || [] };
  }
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

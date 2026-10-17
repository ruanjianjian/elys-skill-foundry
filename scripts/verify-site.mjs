import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import puppeteer from 'puppeteer-core';
import { skills } from '../catalog.js';

const url = process.argv[2] || 'http://127.0.0.1:4173/';
const artifacts = process.env.FOUNDRY_ARTIFACT_DIR || join(homedir(), 'DevData/Artifacts/20261017-skills-promo/foundry');
const output = join(artifacts, 'ui');
await mkdir(output, { recursive: true });
const report = { url, startedAt: new Date().toISOString(), checks: [], consoleErrors: [], pageErrors: [] };
let browser;

async function check(name, action) {
  try {
    const details = await action();
    report.checks.push({ name, passed: true, details });
    console.log('PASS', name);
  } catch (error) {
    report.checks.push({ name, passed: false, error: error.message });
    console.error('FAIL', name, error.message);
  }
}

try {
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    userDataDir: join(artifacts, 'chrome-qa-profile'),
    headless: true,
    // Test explicit unmuting without sending audio to the user's speakers.
    args: ['--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(12_000);
  page.on('console', message => {
    if (message.type() === 'error') report.consoleErrors.push(message.text());
  });
  page.on('pageerror', error => report.pageErrors.push(error.message));
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.evaluateOnNewDocument(() => {
    try { localStorage.removeItem('foundry-static'); } catch (_) {}
  });
  const navigation = await page.goto(url, { waitUntil: 'networkidle0' });
  assert.equal(navigation.status(), 200, 'Site must return HTTP 200');
  await page.waitForSelector('.film-card[data-skill]');

  await check('Nine skills and default muted playback', async () => {
    const initial = await page.evaluate(() => ({
      count: document.querySelectorAll('.film-card[data-skill]').length,
      muted: document.querySelector('#feature-video').muted,
    }));
    assert.equal(initial.count, 9);
    assert.equal(initial.muted, true);
    return initial;
  });

  await check('Nine poster images decode', async () => {
    const posters = await page.$$eval('.film-poster img', async images => Promise.all(images.map(async image => {
      await image.decode();
      return { src: new URL(image.src).pathname, width: image.naturalWidth, height: image.naturalHeight };
    })));
    assert.equal(posters.length, 9);
    for (const poster of posters) assert.ok(poster.width > 0 && poster.height > 0);
    return posters;
  });

  for (const skill of skills) {
    await check('Select and actually play ' + skill.id, async () => {
      await page.click('.film-card[data-skill="' + skill.id + '"]');
      await page.waitForFunction(id => {
        const video = document.querySelector('#feature-video');
        return video.currentSrc.endsWith('/' + id + '.mp4') && Number.isFinite(video.duration) && video.readyState >= 2;
      }, {}, skill.id);
      await page.evaluate(() => document.querySelector('.cinema').scrollIntoView({ behavior: 'instant', block: 'start' }));
      await page.waitForFunction(() => {
        const rect = document.querySelector('#feature-video').getBoundingClientRect();
        return Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0) >= rect.height * .5;
      });
      const state = await page.evaluate(() => {
        const video = document.querySelector('#feature-video');
        const source = document.querySelector('#skill-download');
        const download = document.querySelector('#film-download');
        return {
          src: video.currentSrc, duration: video.duration, width: video.videoWidth, height: video.videoHeight,
          command: document.querySelector('#skill-command').textContent,
          source: source.getAttribute('href'), sourceText: source.textContent, sourceDownload: source.hasAttribute('download'),
          filmDownload: download.getAttribute('href'),
          pressed: [...document.querySelectorAll('.film-card[aria-pressed="true"]')].map(button => button.dataset.skill),
        };
      });
      assert.ok(Math.abs(state.duration - 12) < .1, 'Video must contain 12 seconds');
      assert.ok(state.width > 0 && state.height > 0, 'A decoded video frame is required');
      assert.equal(state.command, skill.command);
      assert.deepEqual(state.pressed, [skill.id]);
      assert.equal(state.source, skill.zipUrl || skill.skillUrl);
      assert.equal(state.filmDownload, 'media/films/' + skill.id + '.mp4');
      if (!skill.zipUrl) {
        assert.equal(state.sourceDownload, false);
        assert.ok(!state.sourceText.includes('ZIP'), 'Private source cannot be advertised as a public ZIP');
        assert.ok(state.source.startsWith('https://github.com/Nature-Select/ns-skills/'));
      }
      await page.evaluate(async () => {
        const video = document.querySelector('#feature-video');
        video.pause();
        video.currentTime = .25;
        await video.play();
      });
      await page.waitForFunction(() => {
        const video = document.querySelector('#feature-video');
        return !video.paused && video.currentTime > .55;
      }, { polling: 'raf', timeout: 8000 });
      state.playedTo = await page.$eval('#feature-video', video => { video.pause(); return video.currentTime; });
      return state;
    });
  }

  await check('Seven public ZIPs and matching skill sources respond', async () => {
    const resources = skills.filter(skill => skill.zipUrl).flatMap(skill => [skill.zipUrl, skill.skillUrl]);
    assert.equal(resources.length, 14);
    const responses = await page.evaluate(async paths => Promise.all(paths.map(async path => {
      const response = await fetch(path, { method: 'HEAD' });
      return { path, status: response.status, type: response.headers.get('content-type') };
    })), resources);
    for (const response of responses) assert.equal(response.status, 200, response.path);
    return responses;
  });

  await check('Explicit sound control toggles and returns to muted', async () => {
    await page.click('#sound-toggle');
    const open = await page.$eval('#feature-video', video => video.muted);
    await page.click('#sound-toggle');
    const closed = await page.$eval('#feature-video', video => { video.pause(); return video.muted; });
    assert.equal(open, false);
    assert.equal(closed, true);
    return { mutedAfterEnable: open, mutedAfterDisable: closed, audioOutput: 'Chrome --mute-audio' };
  });

  async function showResultFrame() {
    await page.evaluate(() => {
      const video = document.querySelector('#feature-video');
      video.pause();
      video.currentTime = 10.2;
    });
    await page.waitForFunction(() => {
      const video = document.querySelector('#feature-video');
      return !video.seeking && Math.abs(video.currentTime - 10.2) < .1;
    });
  }
  await page.click('.film-card[data-skill="ns-spec-cards"]');
  await page.waitForFunction(() => document.querySelector('#feature-video').currentSrc.endsWith('/ns-spec-cards.mp4') && document.querySelector('#feature-video').readyState >= 2);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await showResultFrame();
  await page.screenshot({ path: join(output, 'desktop.png'), fullPage: true });

  for (const width of [390, 320]) {
    await check('No horizontal overflow at ' + width + 'px', async () => {
      await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
      assert.ok(dimensions.document <= width + 1 && dimensions.body <= width + 1, JSON.stringify(dimensions));
      if (width === 390) {
        await showResultFrame();
        await page.screenshot({ path: join(output, 'mobile.png'), fullPage: true });
      }
      return dimensions;
    });
  }

  await check('System reduced motion pauses at the result frame', async () => {
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.evaluate(() => { localStorage.removeItem('foundry-static'); });
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForFunction(() => {
      const video = document.querySelector('#feature-video');
      return document.documentElement.classList.contains('static-mode') && video.paused && !video.seeking && Math.abs(video.currentTime - 10.2) < .1;
    });
    const state = await page.evaluate(() => ({
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      class: document.documentElement.className,
      paused: document.querySelector('#feature-video').paused,
      currentTime: document.querySelector('#feature-video').currentTime,
      manualPreference: localStorage.getItem('foundry-static'),
    }));
    assert.equal(state.reducedMotion, true);
    assert.equal(state.manualPreference, null);
    await page.screenshot({ path: join(output, 'static.png'), fullPage: true });
    return state;
  });

  await check('No console errors or uncaught page errors', async () => {
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
  report.passed = !report.fatalError && report.checks.length > 0 && report.checks.every(check => check.passed);
  await writeFile(join(output, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('Verification:', join(output, 'verification.json'));
  if (!report.passed) process.exitCode = 1;
}

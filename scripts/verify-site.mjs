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
function observe(page) {
  page.setDefaultTimeout(12_000);
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
  page.on('pageerror', error => report.pageErrors.push(error.message));
}
const card = id => '.film-card[data-skill="' + id + '"]';
const preview = id => card(id) + ' .film-preview';
const movie = id => card(id) + ' video';
async function waitPlaying(page, id) {
  await page.waitForFunction(id => {
    const video = document.querySelector('#video-' + id);
    return !video.paused && video.readyState >= 2 && video.currentTime > .25;
  }, { polling: 'raf', timeout: 8000 }, id);
}
async function settled(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
try {
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    userDataDir: join(artifacts, 'chrome-qa-profile'),
    headless: true,
    // Suppress speaker output without bypassing the browser's autoplay policy.
    args: ['--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  });
  const page = await browser.newPage();
  observe(page);
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  const navigation = await page.goto(url, { waitUntil: 'domcontentloaded' });
  assert.equal(navigation.status(), 200, 'Site must return HTTP 200');
  await page.evaluate(() => {
    localStorage.removeItem('foundry-static');
    localStorage.removeItem('foundry-bgm');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.film-card .film-preview');

  await check('Nine inline films, no separate player, default BGM intent ON', async () => {
    const state = await page.evaluate(() => ({
      cards: document.querySelectorAll('.film-card').length,
      videos: document.querySelectorAll('.film-card video').length,
      separatePlayer: !!document.querySelector('.cinema, #feature-video'),
      allMuted: [...document.querySelectorAll('.skill-video')].every(video => video.muted),
      bgmIntent: document.querySelector('#bgm-toggle').getAttribute('aria-pressed'),
      bgmPreference: localStorage.getItem('foundry-bgm'),
      bgmState: document.querySelector('#bgm-toggle').dataset.state,
    }));
    assert.equal(state.cards, 9);
    assert.equal(state.videos, 9);
    assert.equal(state.separatePlayer, false);
    assert.equal(state.allMuted, true);
    assert.equal(state.bgmIntent, 'true');
    assert.equal(state.bgmPreference, null);
    assert.ok(['playing', 'waiting'].includes(state.bgmState));
    return state;
  });
  await check('Default BGM plays after a real first click', async () => {
    await page.click('h1');
    await page.waitForFunction(() => {
      const audio = document.querySelector('#bgm');
      return !audio.paused && audio.currentTime > .1 && audio.readyState >= 2;
    });
    const state = await page.$eval('#bgm', audio => ({ paused: audio.paused, muted: audio.muted, volume: audio.volume, currentTime: audio.currentTime, loop: audio.loop }));
    assert.equal(state.muted, false);
    assert.equal(state.loop, true);
    return { ...state, speakerOutput: 'Chrome --mute-audio' };
  });
  await check('Explicit BGM OFF persists across reload and later clicks', async () => {
    await page.click('#bgm-toggle');
    await page.waitForFunction(() => document.querySelector('#bgm').paused && document.querySelector('#bgm-toggle').dataset.state === 'off');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.click('h1');
    await settled(page);
    const state = await page.evaluate(() => ({ paused: document.querySelector('#bgm').paused, preference: localStorage.getItem('foundry-bgm'), state: document.querySelector('#bgm-toggle').dataset.state }));
    assert.deepEqual(state, { paused: true, preference: 'off', state: 'off' });
    return state;
  });
  await check('Nine posters decode', async () => {
    const posters = await page.$$eval('.film-preview .poster', async images => Promise.all(images.map(async image => {
      await image.decode();
      return { src: new URL(image.src).pathname, width: image.naturalWidth, height: image.naturalHeight };
    })));
    assert.equal(posters.length, 9);
    for (const poster of posters) assert.ok(poster.width > 0 && poster.height > 0);
    return posters;
  });

  for (const skill of skills) {
    await check('Real hover, exclusive playback and leave pause: ' + skill.id, async () => {
      await page.mouse.move(3, 3);
      await page.hover(preview(skill.id));
      await waitPlaying(page, skill.id);
      const state = await page.evaluate(id => {
        const video = document.querySelector('#video-' + id);
        return {
          src: video.currentSrc, duration: video.duration, width: video.videoWidth, height: video.videoHeight,
          currentTime: video.currentTime,
          running: [...document.querySelectorAll('.skill-video')].filter(video => !video.paused).map(video => video.id),
          allMuted: [...document.querySelectorAll('.skill-video')].every(video => video.muted),
        };
      }, skill.id);
      assert.ok(state.src.endsWith('/' + skill.id + '.mp4'));
      assert.ok(Math.abs(state.duration - 12) < .1);
      assert.ok(state.width > 0 && state.height > 0);
      assert.deepEqual(state.running, ['video-' + skill.id]);
      assert.equal(state.allMuted, true);
      await page.mouse.move(3, 3);
      await page.waitForFunction(id => document.querySelector('#video-' + id).paused, {}, skill.id);
      state.pausedOnLeave = true;
      return state;
    });
  }
  await check('Public resources and private installation links', async () => {
    const links = await page.$$eval('.film-card', cards => cards.map(card => {
      const link = card.querySelector('.skill-source');
      return { id: card.dataset.skill, href: link.getAttribute('href'), text: link.textContent, download: link.hasAttribute('download'), film: card.querySelector('.film-download').getAttribute('href') };
    }));
    for (const skill of skills) {
      const link = links.find(link => link.id === skill.id);
      assert.equal(link.href, skill.zipUrl || skill.skillUrl);
      assert.equal(link.film, 'media/films/' + skill.id + '.mp4');
      if (!skill.zipUrl) {
        assert.equal(link.download, false);
        assert.ok(!link.text.includes('ZIP'));
      }
    }
    const paths = skills.filter(skill => skill.zipUrl).flatMap(skill => [skill.zipUrl, skill.skillUrl]);
    assert.equal(paths.length, 14);
    const responses = await page.evaluate(async paths => Promise.all(paths.map(async path => {
      const response = await fetch(path, { method: 'HEAD' });
      return { path, status: response.status };
    })), paths);
    for (const response of responses) assert.equal(response.status, 200, response.path);
    return { links, resources: responses };
  });

  for (const [index, id] of ['ns-spec-cards', 'test-journal'].entries()) {
    await check('Actual example dialog: ' + id, async () => {
      await page.click(card(id) + ' .show-example');
      await page.waitForFunction(() => document.querySelector('#example-dialog').open);
      const state = await page.$eval('#example-image', async image => {
        await image.decode();
        return { src: image.getAttribute('src'), width: image.naturalWidth, height: image.naturalHeight };
      });
      assert.ok(state.width > 0 && state.height > 0);
      await page.screenshot({ path: join(output, index === 0 ? 'example.png' : 'example-report.png') });
      await page.click('#example-dialog .close-dialog');
      await page.waitForFunction(() => !document.querySelector('#example-dialog').open);
      return { ...state, closed: true };
    });
  }
  await check('Clipboard denial exposes selectable manual copy fallback', async () => {
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('QA forced clipboard denial'); } } }));
    await page.click(card('ns-spec-cards') + ' .copy-skill');
    await page.waitForFunction(() => document.querySelector('#copy-dialog').open);
    const state = await page.$eval('#copy-text', input => ({ text: input.value, selected: input.selectionEnd - input.selectionStart, length: input.value.length, focused: document.activeElement === input }));
    assert.ok(state.text.includes('https://github.com/Nature-Select/ns-skills/tree/main/base/ns-spec-cards'));
    assert.equal(state.selected, state.length);
    assert.equal(state.focused, true);
    await page.click('#copy-dialog .done');
    await page.waitForFunction(() => !document.querySelector('#copy-dialog').open);
    return { selected: state.selected, focused: state.focused, closed: true };
  });

  await page.mouse.move(3, 3);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await settled(page);
  await page.screenshot({ path: join(output, 'desktop.png'), fullPage: true });
  await page.screenshot({ path: join(output, 'desktop-viewport.png') });

  const mobile = await browser.newPage();
  observe(mobile);
  await mobile.setCacheEnabled(false);
  await mobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await mobile.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await mobile.goto(url, { waitUntil: 'domcontentloaded' });
  await mobile.waitForSelector('.film-preview');
  await check('Mobile touch taps play and pause one muted film', async () => {
    const selector = preview('ns-spec-cards');
    await mobile.tap(selector);
    await waitPlaying(mobile, 'ns-spec-cards');
    const playing = await mobile.$eval(movie('ns-spec-cards'), video => ({ paused: video.paused, muted: video.muted, currentTime: video.currentTime }));
    assert.equal(playing.muted, true);
    await mobile.tap(selector);
    await mobile.waitForFunction(() => document.querySelector('#video-ns-spec-cards').paused);
    return { ...playing, pausedAfterSecondTap: true };
  });
  for (const width of [390, 320]) {
    await check('Mobile layout without horizontal overflow: ' + width + 'px', async () => {
      await mobile.setViewport({ width, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
      const state = await mobile.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
      assert.ok(state.document <= width + 1 && state.body <= width + 1, JSON.stringify(state));
      if (width === 390) {
        await mobile.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        await mobile.screenshot({ path: join(output, 'mobile.png'), fullPage: true });
        await mobile.screenshot({ path: join(output, 'mobile-viewport.png') });
      }
      return state;
    });
  }
  await mobile.close();
  await page.bringToFront();
  await check('Reduced motion stays static until explicit preview click', async () => {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.evaluate(() => { localStorage.removeItem('foundry-static'); localStorage.setItem('foundry-bgm', 'on'); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.film-preview');
    await page.hover(preview('ns-spec-cards'));
    await settled(page);
    const before = await page.evaluate(() => ({
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      staticClass: document.documentElement.classList.contains('static-mode'),
      allPaused: [...document.querySelectorAll('.skill-video')].every(video => video.paused),
      bgmPaused: document.querySelector('#bgm').paused,
    }));
    assert.deepEqual(before, { reduced: true, staticClass: true, allPaused: true, bgmPaused: true });
    await page.screenshot({ path: join(output, 'static.png'), fullPage: true });
    await page.click(preview('ns-spec-cards'));
    await waitPlaying(page, 'ns-spec-cards');
    const manual = await page.$eval(movie('ns-spec-cards'), video => ({ paused: video.paused, muted: video.muted, currentTime: video.currentTime }));
    assert.equal(manual.muted, true);
    await page.click(preview('ns-spec-cards'));
    await page.waitForFunction(() => document.querySelector('#video-ns-spec-cards').paused);
    return { before, afterExplicitClick: manual, pausedAfterSecondClick: true };
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

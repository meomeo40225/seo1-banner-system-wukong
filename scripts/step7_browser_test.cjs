'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const url = process.env.STEP7_URL;
const screenshotPath = process.env.STEP7_SCREENSHOT;
if (!url) throw new Error('STEP7_URL is required');

async function waitForGlobalMedia(page, expectedVideos) {
  await page.waitForFunction((count) => {
    const runtime = window.THMTBannerRuntime;
    const videos = Array.from(document.querySelectorAll(
      '[data-slot^="LEFT_"] video,[data-slot^="RIGHT_"] video,[data-slot^="BOTTOM_"] video'
    ));
    return runtime && videos.length === count && videos.every((v) => v.currentSrc || v.querySelector('source'));
  }, expectedVideos, { timeout: 60000 });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 1000 });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForGlobalMedia(page, 6);

    const initial = await page.evaluate(() => ({
      version: window.THMTBannerRuntime.version,
      profile: window.THMTBannerRuntime.getPerformanceProfile(),
      brandCount: window.THMTBannerRuntime.getBrandCount(),
      interval: window.THMTBannerRuntime.getIntervalMs(),
      running: window.THMTBannerRuntime.isRunning(),
      slots: document.querySelectorAll('[data-slot]').length,
      globalVideos: document.querySelectorAll(
        '[data-slot^="LEFT_"] video,[data-slot^="RIGHT_"] video,[data-slot^="BOTTOM_"] video'
      ).length,
      gifFallbacks: document.querySelectorAll('.thmt-banner-gif-fallback').length,
      mediaKinds: Array.from(document.querySelectorAll('[data-slot]')).map((s) => s.dataset.media || '')
    }));

    assert.strictEqual(initial.version, '1.0.0');
    assert.strictEqual(initial.profile, 'full');
    assert.strictEqual(initial.brandCount, 14);
    assert.strictEqual(initial.interval, 5000);
    assert.strictEqual(initial.running, true);
    assert.strictEqual(initial.slots, 11);
    assert.strictEqual(initial.globalVideos, 6);
    assert.strictEqual(initial.gifFallbacks, 0);
    assert.strictEqual(await page.locator('[data-slot^="TOP_"]').count(), 0, 'TOP slots must not exist');
    assert.strictEqual(await page.locator('#thmt-banner-top').count(), 0, 'TOP container must not exist');
    assert(initial.mediaKinds.some((x) => x.startsWith('mp4')));

    const mediaSources = await page.evaluate(() => ({
      mp4: Array.from(document.querySelectorAll('video source')).map((s) => s.src),
      gifFallbacks: Array.from(document.querySelectorAll('.thmt-banner-gif-fallback')).map((img) => img.src)
    }));
    assert(mediaSources.mp4.length >= 6, 'Desktop global slots must point at MP4 media');
    assert(mediaSources.mp4.every((x) => x.includes('/media/') && x.endsWith('.mp4')), 'Normal media source must be optimized MP4');
    assert.strictEqual(mediaSources.gifFallbacks.length, 0, 'GIF should not load in normal v0.7.1 path');

    await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
    await page.waitForTimeout(250);
    const beforeGeometry = await page.evaluate(() => window.THMTBannerRuntime.getGeometryPassCount());

    await page.evaluate(() => {
      for (let i = 0; i < 100; i += 1) window.dispatchEvent(new Event('scroll'));
    });

    const frozen = await page.evaluate(() => ({
      scrolling: window.THMTBannerRuntime.isScrolling(),
      running: window.THMTBannerRuntime.isRunning(),
      paused: Array.from(document.querySelectorAll('[data-slot] video')).every((v) => v.paused)
    }));
    assert.strictEqual(frozen.scrolling, true);
    assert.strictEqual(frozen.running, false);
    assert.strictEqual(frozen.paused, true);

    await page.waitForTimeout(250);
    const afterGeometry = await page.evaluate(() => window.THMTBannerRuntime.getGeometryPassCount());
    assert(afterGeometry - beforeGeometry <= 1, 'scroll burst must not repeatedly calculate geometry');

    const resumed = await page.evaluate(() => ({
      scrolling: window.THMTBannerRuntime.isScrolling(),
      running: window.THMTBannerRuntime.isRunning()
    }));
    assert.strictEqual(resumed.scrolling, false);
    assert.strictEqual(resumed.running, true);

    await page.evaluate(() => {
      const header = document.createElement('header');
      header.id = 'step7-fixed-header';
      Object.assign(header.style, {
        position: 'fixed', left: '0', right: '0', top: '0', height: '120px', zIndex: '100000', background: '#111'
      });
      document.body.appendChild(header);
      window.THMTBannerRuntime.refreshHeaderCandidates();
      window.THMTBannerRuntime.recomputeGeometry();
    });
    await page.waitForTimeout(100);

    const headerGeometry = await page.evaluate(() => {
      const rail = document.querySelector('.thmt-banner-side-left').getBoundingClientRect();
      const header = document.getElementById('step7-fixed-header').getBoundingClientRect();
      return { railTop: rail.top, headerBottom: header.bottom, railHeight: rail.height };
    });
    assert(headerGeometry.railHeight > 20);
    assert(headerGeometry.railTop >= headerGeometry.headerBottom + 6, 'LEFT/RIGHT rails must start below fixed header');
    await page.evaluate(() => document.getElementById('step7-fixed-header')?.remove());

    await page.evaluate(() => {
      const middle = document.querySelector('.thmt-banner-middle-zone');
      const spacer = document.createElement('div');
      spacer.id = 'step7-middle-spacer';
      spacer.style.height = '2600px';
      middle.parentNode.insertBefore(spacer, middle);
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(300);

    const middleFar = await page.evaluate(() =>
      document.querySelectorAll('[data-slot^="MIDDLE_"] video,[data-slot^="MIDDLE_"] img').length
    );
    assert.strictEqual(middleFar, 0, 'far MIDDLE media must be released');

    await page.evaluate(() => {
      document.getElementById('step7-middle-spacer')?.remove();
      document.querySelector('.thmt-banner-middle-zone').scrollIntoView({ block: 'center' });
    });
    await page.waitForFunction(
      () => document.querySelectorAll('[data-slot^="MIDDLE_"] video').length === 5,
      null,
      { timeout: 15000 }
    );

    const middle = await page.evaluate(() => ({
      count: document.querySelectorAll('[data-slot^="MIDDLE_"] video').length,
      brands: Array.from(document.querySelectorAll('[data-slot^="MIDDLE_"]')).map((s) => s.dataset.brand),
      sources: Array.from(document.querySelectorAll('[data-slot^="MIDDLE_"] video source')).map((s) => s.src)
    }));
    assert.strictEqual(middle.count, 5);
    assert.strictEqual(new Set(middle.brands).size, 5);
    assert(middle.sources.every((x) => x.includes('/media/') && x.endsWith('.mp4')));

    const beforeTick = await page.evaluate(() => ({
      tick: window.THMTBannerRuntime.getCurrentTick(),
      brands: Array.from(document.querySelectorAll('[data-slot^="BOTTOM_"],[data-slot^="LEFT_"],[data-slot^="RIGHT_"]')).map((s) => s.dataset.brand)
    }));
    await page.waitForTimeout(5400);

    const afterTick = await page.evaluate(() => ({
      tick: window.THMTBannerRuntime.getCurrentTick(),
      running: window.THMTBannerRuntime.isRunning(),
      brands: Array.from(document.querySelectorAll('[data-slot^="BOTTOM_"],[data-slot^="LEFT_"],[data-slot^="RIGHT_"]')).map((s) => s.dataset.brand),
      fallback: document.querySelectorAll('.thmt-banner-gif-fallback').length
    }));
    assert.notStrictEqual(afterTick.tick, beforeTick.tick);
    assert.strictEqual(afterTick.running, true);
    assert.strictEqual(afterTick.fallback, 0);
    assert(afterTick.brands.some((b, i) => b !== beforeTick.brands[i]));

    const mobile = await context.newPage();
    await mobile.setViewportSize({ width: 800, height: 900 });
    await mobile.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await mobile.waitForFunction(
      () => window.THMTBannerRuntime && document.querySelectorAll('[data-slot^="BOTTOM_"] video').length === 2,
      null,
      { timeout: 60000 }
    );

    const mobileState = await mobile.evaluate(() => ({
      sideChildren: Array.from(document.querySelectorAll('[data-slot^="LEFT_"],[data-slot^="RIGHT_"]')).reduce((n, s) => n + s.children.length, 0),
      sideVideos: document.querySelectorAll('[data-slot^="LEFT_"] video,[data-slot^="RIGHT_"] video').length,
      gifFallback: document.querySelectorAll('.thmt-banner-gif-fallback').length
    }));
    assert.strictEqual(mobileState.sideChildren, 0, 'hidden mobile side slots must remain empty');
    assert.strictEqual(mobileState.sideVideos, 0);
    assert.strictEqual(mobileState.gifFallback, 0);
    await mobile.close();

    if (screenshotPath) {
      fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }

    console.log('PASS: Stable V1 1.0.0 no-TOP MP4 engine + scroll freeze + lazy MIDDLE + mobile no-side-load + rail header offset.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const url = process.env.STEP7_URL;
const screenshotPath = process.env.STEP7_SCREENSHOT;

if (!url) {
  throw new Error('STEP7_URL is required');
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.waitForFunction(() => {
      const runtime = window.THMTBannerRuntime;
      const slots = document.querySelectorAll('[data-slot]');
      const globalImages = document.querySelectorAll(
        '[data-slot^="TOP_"] img,[data-slot^="LEFT_"] img,[data-slot^="RIGHT_"] img,[data-slot^="BOTTOM_"] img'
      );
      return runtime &&
        slots.length === 13 &&
        globalImages.length === 8 &&
        Array.from(globalImages).every((img) => img.complete && img.naturalWidth > 0);
    }, null, { timeout: 60000 });

    const initial = await page.evaluate(() => ({
      brandCount: window.THMTBannerRuntime.getBrandCount(),
      intervalMs: window.THMTBannerRuntime.getIntervalMs(),
      currentTick: window.THMTBannerRuntime.getCurrentTick(),
      running: window.THMTBannerRuntime.isRunning(),
      middleActive: window.THMTBannerRuntime.isMiddleActive(),
      middleImages: document.querySelectorAll('[data-slot^="MIDDLE_"] img').length,
      globalImages: document.querySelectorAll(
        '[data-slot^="TOP_"] img,[data-slot^="LEFT_"] img,[data-slot^="RIGHT_"] img,[data-slot^="BOTTOM_"] img'
      ).length,
      hideControls: document.querySelectorAll('[data-thmt-hide], .thmt-banner-hide, .thmt-banner-toggle').length
    }));

    assert.strictEqual(initial.brandCount, 14, 'Runtime must see 14 enabled brands');
    assert.strictEqual(initial.intervalMs, 5000, 'Rotation interval must be 5000ms');
    assert.strictEqual(initial.running, true, 'Rotation timer must be running');
    assert.strictEqual(initial.globalImages, 8, 'The 8 always-visible global GIFs must load');
    assert.strictEqual(initial.hideControls, 0, 'Visitor hide controls must not exist');

    /*
     * The clean fixture is short, so MIDDLE may legitimately be near the first
     * viewport. Force it far away, then prove the hotfix releases those GIFs.
     */
    await page.evaluate(() => {
      const middle = document.querySelector('.thmt-banner-middle-zone');
      const spacer = document.createElement('div');
      spacer.id = 'step7-middle-offscreen-spacer';
      spacer.style.height = '2200px';
      middle.parentNode.insertBefore(spacer, middle);
      window.scrollTo(0, 0);
      window.THMTBannerRuntime.syncMiddleVisibility();
      window.THMTBannerRuntime.requestLayout();
    });
    await page.waitForTimeout(100);

    const offscreenMiddleImages = await page.evaluate(() =>
      document.querySelectorAll('[data-slot^="MIDDLE_"] img').length
    );
    assert.strictEqual(offscreenMiddleImages, 0, 'Far off-screen MIDDLE GIFs must be released');

    const beforeBurst = await page.evaluate(() => window.THMTBannerRuntime.getLayoutPassCount());
    await page.evaluate(() => {
      for (let i = 0; i < 100; i += 1) {
        window.dispatchEvent(new Event('scroll'));
      }
    });
    await page.waitForTimeout(100);
    const afterBurst = await page.evaluate(() => window.THMTBannerRuntime.getLayoutPassCount());
    assert(afterBurst - beforeBurst <= 4, 'Scroll layout work must be requestAnimationFrame-throttled');

    await page.evaluate(() => {
      const header = document.createElement('header');
      header.id = 'step7-fixed-header';
      Object.assign(header.style, {
        position: 'fixed',
        left: '0',
        right: '0',
        top: '0',
        height: '120px',
        zIndex: '100000',
        background: '#111'
      });
      document.body.appendChild(header);

      const spacer = document.createElement('div');
      spacer.id = 'step7-extra-scroll';
      spacer.style.height = '2000px';
      document.body.appendChild(spacer);
      window.scrollTo(0, 700);
      window.THMTBannerRuntime.requestLayout();
    });
    await page.waitForTimeout(150);

    const topWithHeader = await page.evaluate(() => {
      const top = document.getElementById('thmt-banner-top').getBoundingClientRect();
      const header = document.getElementById('step7-fixed-header').getBoundingClientRect();
      return { top: top.top, headerBottom: header.bottom, height: top.height };
    });
    assert(topWithHeader.height > 20, 'TOP row must keep a real visible height');
    assert(
      topWithHeader.top >= topWithHeader.headerBottom + 6,
      'TOP row must sit below a fixed/sticky site header'
    );

    await page.evaluate(() => {
      document.getElementById('step7-fixed-header')?.remove();
      document.getElementById('step7-extra-scroll')?.remove();
      document.getElementById('step7-middle-offscreen-spacer')?.remove();
      const middle = document.querySelector('.thmt-banner-middle-zone');
      const rect = middle.getBoundingClientRect();
      const target = window.scrollY + rect.top - ((window.innerHeight - rect.height) / 2);
      window.scrollTo(0, Math.max(0, target));
      window.dispatchEvent(new Event('scroll'));
      window.THMTBannerRuntime.syncMiddleVisibility();
      window.THMTBannerRuntime.requestLayout();
    });

    await page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('[data-slot^="MIDDLE_"] img'));
      return window.THMTBannerRuntime.isMiddleActive() && images.length === 5;
    }, null, { timeout: 5000 });

    const middle = await page.evaluate(() => {
      const slots = Array.from(document.querySelectorAll('[data-slot^="MIDDLE_"]')).map((slot) => {
        const img = slot.querySelector('img');
        return {
          brand: slot.getAttribute('data-brand'),
          objectFit: img ? getComputedStyle(img).objectFit : '',
          loading: img ? img.loading : '',
          src: img ? img.src : ''
        };
      });
      return slots;
    });

    assert.strictEqual(middle.length, 5, 'MIDDLE count');
    assert.strictEqual(new Set(middle.map((slot) => slot.brand)).size, 5, 'MIDDLE must show 5 distinct brands');
    middle.forEach((slot) => {
      assert(slot.src.includes('/assets/'), 'MIDDLE must receive a real remote asset URL near viewport');
      assert.strictEqual(slot.loading, 'lazy', 'MIDDLE browser hint must stay lazy');
      assert.strictEqual(slot.objectFit, 'contain', 'MIDDLE must use object-fit: contain');
    });

    const beforeRotation = await page.evaluate(() => ({
      tick: window.THMTBannerRuntime.getCurrentTick(),
      brands: Array.from(document.querySelectorAll(
        '[data-slot^="TOP_"],[data-slot^="LEFT_"],[data-slot^="RIGHT_"],[data-slot^="BOTTOM_"]'
      )).map((slot) => slot.getAttribute('data-brand'))
    }));

    await page.waitForTimeout(5400);

    const afterRotation = await page.evaluate(() => ({
      tick: window.THMTBannerRuntime.getCurrentTick(),
      running: window.THMTBannerRuntime.isRunning(),
      loaded: Array.from(document.querySelectorAll(
        '[data-slot^="TOP_"] img,[data-slot^="LEFT_"] img,[data-slot^="RIGHT_"] img,[data-slot^="BOTTOM_"] img'
      )).every((img) => img.complete && img.naturalWidth > 0),
      brands: Array.from(document.querySelectorAll(
        '[data-slot^="TOP_"],[data-slot^="LEFT_"],[data-slot^="RIGHT_"],[data-slot^="BOTTOM_"]'
      )).map((slot) => slot.getAttribute('data-brand'))
    }));

    assert.strictEqual(afterRotation.running, true, 'Rotation must remain running');
    assert.notStrictEqual(afterRotation.tick, beforeRotation.tick, 'Rotation tick must advance');
    assert.strictEqual(afterRotation.loaded, true, 'Global slots must never blank while the next GIF loads');
    assert(
      afterRotation.brands.some((brand, index) => brand !== beforeRotation.brands[index]),
      'At least one global banner must rotate'
    );

    if (screenshotPath) {
      fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }

    console.log('PASS: Step 7 hotfix — lazy MIDDLE + fixed-header TOP + rAF scroll + non-blank rotation.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

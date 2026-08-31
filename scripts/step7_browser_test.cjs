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
      const slots = Array.from(document.querySelectorAll('[data-slot]'));
      const images = Array.from(document.querySelectorAll('[data-slot] img'));
      return slots.length === 13 &&
        images.length === 13 &&
        images.every((img) => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
    }, { timeout: 60000 });

    const initial = await page.evaluate(() => {
      const runtime = window.THMTBannerRuntime;
      const system = window.THMTBannerSystem;
      if (!runtime || !system) {
        throw new Error('THMT runtime/config globals are missing');
      }

      const slots = Array.from(document.querySelectorAll('[data-slot]')).map((slot) => {
        const img = slot.querySelector('img');
        const link = slot.querySelector('.thmt-banner-link');
        const style = img ? getComputedStyle(img) : null;

        return {
          id: slot.getAttribute('data-slot'),
          brand: slot.getAttribute('data-brand'),
          size: slot.getAttribute('data-size'),
          src: img ? img.src : '',
          naturalWidth: img ? img.naturalWidth : 0,
          naturalHeight: img ? img.naturalHeight : 0,
          objectFit: style ? style.objectFit : '',
          href: link ? link.href : ''
        };
      });

      const rect = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      };

      return {
        brandCount: runtime.getBrandCount(),
        intervalMs: runtime.getIntervalMs(),
        currentTick: runtime.getCurrentTick(),
        running: runtime.isRunning(),
        configBrands: system.config.brands,
        slots,
        hideControls: document.querySelectorAll('[data-thmt-hide], .thmt-banner-hide, .thmt-banner-toggle').length,
        top: rect('#thmt-banner-top'),
        left: rect('.thmt-banner-side-left'),
        right: rect('.thmt-banner-side-right'),
        bottom: rect('#thmt-banner-bottom'),
        viewport: { width: innerWidth, height: innerHeight }
      };
    });

    assert.strictEqual(initial.brandCount, 14, 'Runtime must see 14 enabled brands');
    assert.strictEqual(initial.intervalMs, 5000, 'Rotation interval must be 5000ms');
    assert.strictEqual(initial.running, true, 'Rotation timer must be running');
    assert.strictEqual(initial.slots.length, 13, 'Exactly 13 visible V9 slots must exist');
    assert.strictEqual(initial.hideControls, 0, 'Visitor hide controls must not exist');

    const prefixCount = (prefix) => initial.slots.filter((slot) => slot.id.startsWith(prefix)).length;
    assert.strictEqual(prefixCount('TOP_'), 2, 'TOP count');
    assert.strictEqual(prefixCount('LEFT_'), 2, 'LEFT count');
    assert.strictEqual(prefixCount('RIGHT_'), 2, 'RIGHT count');
    assert.strictEqual(prefixCount('MIDDLE_'), 5, 'MIDDLE count');
    assert.strictEqual(prefixCount('BOTTOM_'), 2, 'BOTTOM count');

    const middleBrands = new Set(
      initial.slots.filter((slot) => slot.id.startsWith('MIDDLE_')).map((slot) => slot.brand)
    );
    assert.strictEqual(middleBrands.size, 5, 'MIDDLE must display 5 distinct brands');

    const brandByName = new Map(initial.configBrands.map((brand) => [String(brand.name || brand.id), brand]));
    for (const slot of initial.slots) {
      assert(slot.naturalWidth > 0 && slot.naturalHeight > 0, slot.id + ' image failed to load');
      assert.strictEqual(slot.objectFit, 'contain', slot.id + ' must use object-fit: contain');

      const brand = brandByName.get(slot.brand);
      assert(brand, slot.id + ' rendered unknown brand ' + slot.brand);

      const expectedPath = '/assets/' + brand.id + '/';
      assert(slot.src.includes(expectedPath), slot.id + ' image does not match brand path');

      if (!String(brand.url || '').trim()) {
        assert.strictEqual(slot.href, '', slot.id + ' must not be clickable while brand URL is blank');
      }
    }

    const inViewport = (rect, label) => {
      assert(rect && rect.width > 0 && rect.height > 0, label + ' must be rendered');
      assert(rect.left >= -1, label + ' overflows viewport left');
      assert(rect.right <= initial.viewport.width + 1, label + ' overflows viewport right');
      assert(rect.top >= -1, label + ' overflows viewport top');
      assert(rect.bottom <= initial.viewport.height + 1, label + ' overflows viewport bottom');
    };

    inViewport(initial.left, 'LEFT rail');
    inViewport(initial.right, 'RIGHT rail');
    inViewport(initial.bottom, 'BOTTOM row');

    const firstBrands = initial.slots.map((slot) => slot.brand);
    const firstTick = initial.currentTick;

    await page.waitForTimeout(5400);

    const after = await page.evaluate(() => ({
      currentTick: window.THMTBannerRuntime.getCurrentTick(),
      running: window.THMTBannerRuntime.isRunning(),
      brands: Array.from(document.querySelectorAll('[data-slot]')).map((slot) => slot.getAttribute('data-brand'))
    }));

    assert.strictEqual(after.running, true, 'Rotation must still be running after one interval');
    assert.notStrictEqual(after.currentTick, firstTick, 'Rotation tick must advance after 5 seconds');
    assert(after.brands.some((brand, index) => brand !== firstBrands[index]), 'At least one banner must rotate');

    if (screenshotPath) {
      fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }

    console.log('PASS: real WordPress install + 13-slot V9 layout + remote GIF loading + 5s rotation.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

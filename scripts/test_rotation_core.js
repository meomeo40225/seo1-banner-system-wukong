'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const core = require(path.join(root, 'plugin/thmt-banner-system/assets/js/rotation-core.js'));
const config = JSON.parse(fs.readFileSync(path.join(root, 'config/banners.json'), 'utf8'));

const brands = config.brands.filter((brand) => brand.enabled);
const count = brands.length;

assert.strictEqual(config.layout.baseline, 'V9_LOCKED');
assert.strictEqual(count, 14);
assert.strictEqual(config.system.rotation_mode, 'sequential');
assert.strictEqual(core.intervalMs(config.system.rotation_interval_seconds), 5000);
assert.strictEqual(core.nextTick(13, 14), 0);
assert.strictEqual(core.nextTick(0, 14), 1);

const expectedCounts = {
  top: 2,
  left: 2,
  right: 2,
  bottom: 2,
  middle: 5
};

for (let tick = 0; tick < count; tick += 1) {
  const frame = core.frame(tick, count);

  for (const [zone, expected] of Object.entries(expectedCounts)) {
    assert.strictEqual(frame[zone].length, expected, zone + ' count mismatch');
    frame[zone].forEach((index) => {
      assert(Number.isInteger(index));
      assert(index >= 0 && index < count);
    });
  }

  assert.strictEqual(new Set(frame.middle).size, 5, 'middle must show 5 distinct brands per tick');
}

const slotSelectors = [
  (f) => f.top[0],
  (f) => f.top[1],
  (f) => f.left[0],
  (f) => f.left[1],
  (f) => f.right[0],
  (f) => f.right[1],
  (f) => f.bottom[0],
  (f) => f.bottom[1],
  (f) => f.middle[0],
  (f) => f.middle[1],
  (f) => f.middle[2],
  (f) => f.middle[3],
  (f) => f.middle[4]
];

slotSelectors.forEach((select, slotIndex) => {
  const seen = new Set();
  for (let tick = 0; tick < count; tick += 1) {
    seen.add(select(core.frame(tick, count)));
  }
  assert.strictEqual(seen.size, 14, 'slot ' + slotIndex + ' does not cover all 14 brands');
});

console.log('PASS: sequential 14-brand rotation + 5-second config + V9 slot coverage.');

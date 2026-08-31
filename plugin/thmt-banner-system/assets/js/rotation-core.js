(function (root, factory) {
  'use strict';

  var api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.THMTRotationCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function normalizeIndex(value, count) {
    var size = Number(count) || 0;
    if (size <= 0) return 0;

    var number = Number(value) || 0;
    return ((number % size) + size) % size;
  }

  function intervalMs(seconds) {
    var value = Number(seconds);
    if (!Number.isFinite(value) || value <= 0) value = 5;
    return Math.max(1000, Math.round(value * 1000));
  }

  function nextTick(tick, brandCount) {
    if ((Number(brandCount) || 0) <= 0) return 0;
    return normalizeIndex((Number(tick) || 0) + 1, brandCount);
  }

  function frame(tick, brandCount) {
    var count = Number(brandCount) || 0;
    if (count <= 0) {
      return {
        top: [],
        left: [],
        right: [],
        bottom: [],
        middle: []
      };
    }

    var t = normalizeIndex(tick, count);

    return {
      top: [
        normalizeIndex(t + 0, count),
        normalizeIndex(t + 6, count)
      ],
      left: [
        normalizeIndex(t + 1, count),
        normalizeIndex(t + 4, count)
      ],
      right: [
        normalizeIndex(t + 7, count),
        normalizeIndex(t + 10, count)
      ],
      bottom: [
        normalizeIndex(t + 2, count),
        normalizeIndex(t + 8, count)
      ],
      middle: [
        normalizeIndex((t * 5) + 0, count),
        normalizeIndex((t * 5) + 1, count),
        normalizeIndex((t * 5) + 2, count),
        normalizeIndex((t * 5) + 3, count),
        normalizeIndex((t * 5) + 4, count)
      ]
    };
  }

  return {
    normalizeIndex: normalizeIndex,
    intervalMs: intervalMs,
    nextTick: nextTick,
    frame: frame
  };
}));
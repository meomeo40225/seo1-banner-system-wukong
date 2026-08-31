(function () {
  'use strict';

  var state = window.THMTBannerSystem || {};
  var config = state.config || {};
  var assetBaseUrl = String(state.assetBaseUrl || '');
  var debug = Boolean(state.debug);
  var rotationCore = window.THMTRotationCore || null;
  var currentRailScale = 1;
  var currentTick = 0;
  var rotationTimer = null;
  var middleZone = null;
  var middleActive = false;
  var layoutQueued = false;
  var layoutPassCount = 0;
  var slotTokens = Object.create(null);

  function enabledBrands() {
    var brands = Array.isArray(config.brands) ? config.brands : [];
    return brands.filter(function (brand) { return brand && brand.enabled; });
  }

  function assetUrl(relativePath) {
    var clean = String(relativePath || '').replace(/^\/+/, '');
    return assetBaseUrl.replace(/\/+$/, '/') + clean.split('/').map(encodeURIComponent).join('/');
  }

  function bannerFor(index, type) {
    var brands = enabledBrands();
    if (!brands.length) return null;

    var normalized = ((Number(index) || 0) % brands.length + brands.length) % brands.length;
    var brand = brands[normalized];
    var asset = brand.assets && brand.assets[type];
    if (!asset || !asset.file) return null;

    return {
      brand: String(brand.name || brand.id || ''),
      image: assetUrl(asset.file),
      url: String(brand.url || ''),
      size: String(asset.size || '')
    };
  }

  function buildLink(item) {
    if (!item.url.trim()) return null;

    var link = document.createElement('a');
    link.className = 'thmt-banner-link';
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'nofollow sponsored noopener noreferrer';
    link.setAttribute('aria-label', 'Open ' + item.brand);
    return link;
  }

  function buildBadge(slotId, item) {
    if (!debug) return null;

    var badge = document.createElement('span');
    badge.className = 'thmt-banner-debug-badge';
    badge.textContent = slotId + ' • ' + item.brand + ' • ' + item.size;
    return badge;
  }

  function commitSlot(el, slotId, item, img, token) {
    if (slotTokens[slotId] !== token) return;

    var nodes = [img];
    var link = buildLink(item);
    var badge = buildBadge(slotId, item);

    if (link) nodes.push(link);
    if (badge) nodes.push(badge);

    el.replaceChildren.apply(el, nodes);
    el.dataset.brand = item.brand;
    el.dataset.size = item.size;
  }

  function renderSlot(slotId, item, kind) {
    var el = document.querySelector('[data-slot="' + slotId + '"]');
    if (!el || !item) return;

    var existing = el.querySelector('img');
    if (
      existing &&
      existing.complete &&
      existing.naturalWidth > 0 &&
      el.dataset.brand === item.brand &&
      existing.src === item.image
    ) {
      return;
    }

    var token = (slotTokens[slotId] || 0) + 1;
    slotTokens[slotId] = token;

    var img = new Image();
    img.alt = (item.brand + ' ' + item.size).trim();
    img.decoding = 'async';
    img.loading = kind === 'middle' ? 'lazy' : 'eager';

    img.addEventListener('load', function () {
      commitSlot(el, slotId, item, img, token);
    }, { once: true });

    img.addEventListener('error', function () {
      /* Keep the previous good banner instead of flashing a black empty slot. */
    }, { once: true });

    img.src = item.image;

    if (img.complete && img.naturalWidth > 0) {
      commitSlot(el, slotId, item, img, token);
    }
  }

  function currentFrame(tick, count) {
    return rotationCore
      ? rotationCore.frame(tick, count)
      : {
          top: [tick + 0, tick + 6],
          left: [tick + 1, tick + 4],
          right: [tick + 7, tick + 10],
          bottom: [tick + 2, tick + 8],
          middle: [(tick * 5) + 0, (tick * 5) + 1, (tick * 5) + 2, (tick * 5) + 3, (tick * 5) + 4]
        };
  }

  function renderMiddle(frame) {
    if (!middleActive) return;

    for (var i = 0; i < 5; i += 1) {
      renderSlot('MIDDLE_' + (i + 1), bannerFor(frame.middle[i], 'middle'), 'middle');
    }
  }

  function clearMiddle() {
    for (var i = 0; i < 5; i += 1) {
      var slotId = 'MIDDLE_' + (i + 1);
      var el = document.querySelector('[data-slot="' + slotId + '"]');
      slotTokens[slotId] = (slotTokens[slotId] || 0) + 1;
      if (el) {
        el.replaceChildren();
        delete el.dataset.brand;
        delete el.dataset.size;
      }
    }
  }

  function renderTick(tick) {
    var brands = enabledBrands();
    if (!brands.length) return;

    var frame = currentFrame(tick, brands.length);

    renderSlot('TOP_1', bannerFor(frame.top[0], 'horizontal'), 'horizontal');
    renderSlot('TOP_2', bannerFor(frame.top[1], 'horizontal'), 'horizontal');
    renderSlot('LEFT_1', bannerFor(frame.left[0], 'vertical'), 'vertical');
    renderSlot('LEFT_2', bannerFor(frame.left[1], 'vertical'), 'vertical');
    renderSlot('RIGHT_1', bannerFor(frame.right[0], 'vertical'), 'vertical');
    renderSlot('RIGHT_2', bannerFor(frame.right[1], 'vertical'), 'vertical');
    renderSlot('BOTTOM_1', bannerFor(frame.bottom[0], 'horizontal'), 'horizontal');
    renderSlot('BOTTOM_2', bannerFor(frame.bottom[1], 'horizontal'), 'horizontal');

    renderMiddle(frame);

    currentTick = rotationCore
      ? rotationCore.normalizeIndex(tick, brands.length)
      : ((Number(tick) || 0) % brands.length + brands.length) % brands.length;

    requestLayout();
  }

  function rotationMode() {
    return String((config.system && config.system.rotation_mode) || 'sequential').toLowerCase();
  }

  function getIntervalMs() {
    var seconds = config.system && config.system.rotation_interval_seconds;
    return rotationCore ? rotationCore.intervalMs(seconds) : Math.max(1000, (Number(seconds) || 5) * 1000);
  }

  function stopRotation() {
    if (rotationTimer !== null) {
      window.clearInterval(rotationTimer);
      rotationTimer = null;
    }
  }

  function startRotation() {
    stopRotation();

    var brands = enabledBrands();
    if (!brands.length || rotationMode() !== 'sequential') return false;

    rotationTimer = window.setInterval(function () {
      var next = rotationCore
        ? rotationCore.nextTick(currentTick, brands.length)
        : (currentTick + 1) % brands.length;

      renderTick(next);
    }, getIntervalMs());

    return true;
  }

  function visibleElement(selectors) {
    for (var i = 0; i < selectors.length; i += 1) {
      var nodes = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < nodes.length; j += 1) {
        var rect = nodes[j].getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return nodes[j];
      }
    }
    return null;
  }

  function contentTarget() {
    return visibleElement([
      'main#primary',
      '#primary.site-main',
      'main.site-main',
      '.site-main',
      '.content-area main',
      'main',
      '#content',
      '.site-content',
      '#page',
      '.site'
    ]) || document.body;
  }

  function siteShell() {
    return visibleElement([
      '#page',
      '.site',
      '.wp-site-blocks',
      '.site-container',
      '.ast-container',
      '#content',
      '.site-content'
    ]) || document.body;
  }

  function adminBarOffset() {
    var bar = document.getElementById('wpadminbar');
    if (!bar) return 0;
    var rect = bar.getBoundingClientRect();
    return Math.max(0, rect.height || 0);
  }

  function fixedHeaderBottom() {
    var offset = adminBarOffset();
    var selectors = [
      '#masthead',
      '#header',
      '.site-header',
      'header.site-header',
      'header',
      '.header',
      '.navbar',
      '.navigation-top',
      '.main-navigation',
      '.elementor-location-header',
      '.ast-primary-header-bar'
    ];
    var visited = [];

    for (var i = 0; i < selectors.length; i += 1) {
      var nodes = document.querySelectorAll(selectors[i]);

      for (var j = 0; j < nodes.length; j += 1) {
        var node = nodes[j];
        if (visited.indexOf(node) !== -1) continue;
        visited.push(node);

        var style = window.getComputedStyle(node);
        if (style.position !== 'fixed' && style.position !== 'sticky') continue;

        var rect = node.getBoundingClientRect();
        if (rect.width < window.innerWidth * 0.45 || rect.height <= 0) continue;
        if (rect.top > offset + 12 || rect.bottom <= offset) continue;

        offset = Math.max(offset, rect.bottom);
      }
    }

    return Math.min(offset, window.innerHeight * 0.4);
  }

  function updateTopOffset() {
    var top = document.getElementById('thmt-banner-top');
    var occlusion = fixedHeaderBottom();

    if (top) {
      top.style.setProperty('--thmt-sticky-top', (Math.ceil(occlusion) + 8) + 'px');
    }

    return occlusion;
  }

  function mountTop() {
    var top = document.getElementById('thmt-banner-top');
    if (!top || top.classList.contains('is-mounted')) return;

    var target = contentTarget();
    target.insertBefore(top, target.firstChild);
    updateTopOffset();
    top.classList.add('is-mounted');
  }

  function fitHorizontalBounds() {
    var bottom = document.getElementById('thmt-banner-bottom');
    if (!bottom) return;

    if (window.innerWidth <= 1200) {
      bottom.style.left = '';
      bottom.style.right = '';
      return;
    }

    var shellRect = siteShell().getBoundingClientRect();
    var left = Math.max(0, shellRect.left);
    var rightGap = Math.max(0, window.innerWidth - shellRect.right);
    var inset = 174;

    bottom.style.left = (left + inset) + 'px';
    bottom.style.right = (rightGap + inset) + 'px';
  }

  function fitSideRails() {
    layoutPassCount += 1;

    var topRow = document.getElementById('thmt-banner-top');
    var bottomRow = document.getElementById('thmt-banner-bottom');
    var leftRail = document.querySelector('.thmt-banner-side-left');
    var rightRail = document.querySelector('.thmt-banner-side-right');
    var occlusion = updateTopOffset();

    syncMiddleVisibility();
    fitHorizontalBounds();

    if (!topRow || !bottomRow || !leftRail || !rightRail) return;

    if (window.innerWidth <= 1200) {
      leftRail.style.display = 'none';
      rightRail.style.display = 'none';
      return;
    }

    leftRail.style.display = '';
    rightRail.style.display = '';

    var shellRect = siteShell().getBoundingClientRect();
    var leftEdge = Math.max(12, shellRect.left + 12);
    var rightEdge = Math.max(12, (window.innerWidth - shellRect.right) + 12);
    var topRect = topRow.getBoundingClientRect();
    var bottomRect = bottomRow.getBoundingClientRect();
    var minTop = occlusion + 8;
    var railTop = Math.max(minTop, topRect.bottom + 8);
    var railBottom = Math.min(window.innerHeight - 8, bottomRect.top - 8);
    var naturalRailHeight = 1010;
    var availableHeight = Math.max(120, railBottom - railTop);
    var nextScale = Math.min(1, availableHeight / naturalRailHeight);

    leftRail.style.left = leftEdge + 'px';
    leftRail.style.right = 'auto';
    rightRail.style.right = rightEdge + 'px';
    rightRail.style.left = 'auto';
    leftRail.style.top = railTop + 'px';
    rightRail.style.top = railTop + 'px';

    if (Math.abs(nextScale - currentRailScale) > 0.001) {
      currentRailScale = nextScale;
      leftRail.style.transform = 'scale(' + currentRailScale + ')';
      rightRail.style.transform = 'scale(' + currentRailScale + ')';
    }
  }

  function requestLayout() {
    if (layoutQueued) return;

    layoutQueued = true;
    window.requestAnimationFrame(function () {
      layoutQueued = false;
      fitSideRails();
    });
  }

  function syncMiddleVisibility() {
    if (!middleZone) return;

    var rect = middleZone.getBoundingClientRect();
    var nearViewport = rect.bottom >= -300 && rect.top <= window.innerHeight + 300;

    if (nearViewport && !middleActive) {
      middleActive = true;
      renderMiddle(currentFrame(currentTick, enabledBrands().length));
    } else if (!nearViewport && middleActive) {
      middleActive = false;
      clearMiddle();
    }
  }

  function setupMiddleVisibility() {
    middleZone = document.querySelector('.thmt-banner-middle-zone');
    syncMiddleVisibility();
  }

  function init() {
    mountTop();
    renderTick(0);
    setupMiddleVisibility();
    fitSideRails();
    startRotation();
    requestLayout();
  }

  window.addEventListener('resize', requestLayout, { passive: true });
  window.addEventListener('scroll', requestLayout, { passive: true });
  window.addEventListener('pagehide', stopRotation, { once: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.THMTBannerRuntime = {
    version: '0.6.1',
    baseline: 'V9_LOCKED',
    renderTick: renderTick,
    startRotation: startRotation,
    stopRotation: stopRotation,
    fitSideRails: fitSideRails,
    requestLayout: requestLayout,
    getBrandCount: function () { return enabledBrands().length; },
    getRailScale: function () { return currentRailScale; },
    getCurrentTick: function () { return currentTick; },
    getIntervalMs: getIntervalMs,
    getLayoutPassCount: function () { return layoutPassCount; },
    isMiddleActive: function () { return middleActive; },
    isRunning: function () { return rotationTimer !== null; }
  };
}());

(function () {
  'use strict';

  var state = window.THMTBannerSystem || {};
  var config = state.config || {};
  var assetBaseUrl = String(state.assetBaseUrl || '');
  var debug = Boolean(state.debug);
  var currentRailScale = 1;

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

  function renderSlot(slotId, item) {
    var el = document.querySelector('[data-slot="' + slotId + '"]');
    if (!el || !item) return;

    el.replaceChildren();
    el.dataset.brand = item.brand;
    el.dataset.size = item.size;

    var img = document.createElement('img');
    img.src = item.image;
    img.alt = (item.brand + ' ' + item.size).trim();
    img.decoding = 'async';
    img.loading = 'eager';
    el.appendChild(img);

    if (item.url.trim()) {
      var link = document.createElement('a');
      link.className = 'thmt-banner-link';
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'nofollow sponsored noopener noreferrer';
      link.setAttribute('aria-label', 'Open ' + item.brand);
      el.appendChild(link);
    }

    if (debug) {
      var badge = document.createElement('span');
      badge.className = 'thmt-banner-debug-badge';
      badge.textContent = slotId + ' • ' + item.brand + ' • ' + item.size;
      el.appendChild(badge);
    }
  }

  function renderTick(tick) {
    renderSlot('TOP_1', bannerFor(tick + 0, 'horizontal'));
    renderSlot('TOP_2', bannerFor(tick + 6, 'horizontal'));
    renderSlot('LEFT_1', bannerFor(tick + 1, 'vertical'));
    renderSlot('LEFT_2', bannerFor(tick + 4, 'vertical'));
    renderSlot('RIGHT_1', bannerFor(tick + 7, 'vertical'));
    renderSlot('RIGHT_2', bannerFor(tick + 10, 'vertical'));
    renderSlot('BOTTOM_1', bannerFor(tick + 2, 'horizontal'));
    renderSlot('BOTTOM_2', bannerFor(tick + 8, 'horizontal'));

    for (var i = 0; i < 5; i += 1) {
      renderSlot('MIDDLE_' + (i + 1), bannerFor((tick * 5) + i, 'middle'));
    }

    window.requestAnimationFrame(fitSideRails);
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

  function mountTop() {
    var top = document.getElementById('thmt-banner-top');
    if (!top || top.classList.contains('is-mounted')) return;

    var target = contentTarget();
    target.insertBefore(top, target.firstChild);
    top.style.setProperty('--thmt-sticky-top', (adminBarOffset() + 8) + 'px');
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
    var topRow = document.getElementById('thmt-banner-top');
    var bottomRow = document.getElementById('thmt-banner-bottom');
    var leftRail = document.querySelector('.thmt-banner-side-left');
    var rightRail = document.querySelector('.thmt-banner-side-right');

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

    leftRail.style.left = leftEdge + 'px';
    leftRail.style.right = 'auto';
    rightRail.style.right = rightEdge + 'px';
    rightRail.style.left = 'auto';

    var topRect = topRow.getBoundingClientRect();
    var bottomRect = bottomRow.getBoundingClientRect();
    var minTop = adminBarOffset() + 8;
    var railTop = Math.max(minTop, topRect.bottom + 8);
    var railBottom = Math.min(window.innerHeight - 8, bottomRect.top - 8);
    var naturalRailHeight = 1010;
    var availableHeight = Math.max(120, railBottom - railTop);

    currentRailScale = Math.min(1, availableHeight / naturalRailHeight);

    leftRail.style.top = railTop + 'px';
    rightRail.style.top = railTop + 'px';
    leftRail.style.transform = 'scale(' + currentRailScale + ')';
    rightRail.style.transform = 'scale(' + currentRailScale + ')';
  }

  function init() {
    mountTop();
    fitSideRails();
    window.requestAnimationFrame(fitSideRails);
  }

  window.addEventListener('resize', fitSideRails, { passive: true });
  window.addEventListener('scroll', fitSideRails, { passive: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  /*
   * Step 4 runtime contract. Step 5 will own the scheduler and call renderTick().
   * Intentionally no setInterval here, so production rotation remains a separate step.
   */
  window.THMTBannerRuntime = {
    version: '0.4.0',
    baseline: 'V9_LOCKED',
    renderTick: renderTick,
    fitSideRails: fitSideRails,
    getBrandCount: function () { return enabledBrands().length; },
    getRailScale: function () { return currentRailScale; }
  };
}());

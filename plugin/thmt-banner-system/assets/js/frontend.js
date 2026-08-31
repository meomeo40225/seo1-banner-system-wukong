(function () {
  'use strict';

  var state = window.THMTBannerSystem || {};
  var config = state.config || {};
  var assetBaseUrl = normalizeBase(state.assetBaseUrl || '');
  var mediaBaseUrl = normalizeBase(state.mediaBaseUrl || assetBaseUrl);
  var debug = Boolean(state.debug);
  var rotationCore = window.THMTRotationCore || null;
  var profileOverride = String(state.profileOverride || '').toLowerCase();

  var currentTick = 0;
  var rotationTimer = null;
  var prefetchTimer = null;
  var scrollResumeTimer = null;
  var scrolling = false;
  var pageHidden = document.hidden;
  var middleActive = false;
  var middleObserver = null;
  var resizeObserver = null;
  var headerObserver = null;
  var geometryQueued = false;
  var geometryPassCount = 0;
  var headerRecheckedAfterScroll = false;
  var currentRailScale = 1;
  var slotTokens = Object.create(null);
  var slotStates = Object.create(null);
  var slots = Object.create(null);
  var slotWidths = Object.create(null);
  var headerNodes = [];
  var dom = {};
  var warmed = new Set();
  var desktopMql = window.matchMedia('(min-width: 1201px)');
  var performanceProfile = detectPerformanceProfile();

  function normalizeBase(value) {
    var text = String(value || '');
    return text ? text.replace(/\/+$/, '') + '/' : '';
  }

  function resolveUrl(base, relativePath) {
    var clean = String(relativePath || '').replace(/^\/+/, '');
    return normalizeBase(base) + clean.split('/').map(encodeURIComponent).join('/');
  }

  function enabledBrands() {
    var brands = Array.isArray(config.brands) ? config.brands : [];
    return brands.filter(function (brand) { return brand && brand.enabled; });
  }

  function detectPerformanceProfile() {
    if (['full', 'lite', 'poster'].indexOf(profileOverride) !== -1) {
      return profileOverride;
    }

    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
    var effectiveType = String(connection.effectiveType || '').toLowerCase();
    var memory = Number(navigator.deviceMemory || 0);
    var cores = Number(navigator.hardwareConcurrency || 0);
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced || connection.saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
      return 'poster';
    }

    if (effectiveType === '3g' || (memory > 0 && memory <= 4) || (cores > 0 && cores <= 4)) {
      return 'lite';
    }

    return 'full';
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
      brandId: String(brand.id || ''),
      url: String(brand.url || ''),
      file: String(asset.file || ''),
      size: String(asset.size || ''),
      kind: type
    };
  }

  function mediaPaths(file) {
    var mediaStem = String(file || '')
      .replace(/^assets\//, 'media/')
      .replace(/\.gif$/i, '');

    return {
      full: resolveUrl(mediaBaseUrl, mediaStem + '.mp4'),
      small: resolveUrl(mediaBaseUrl, mediaStem + '-sm.mp4'),
      poster: resolveUrl(mediaBaseUrl, mediaStem + '-poster.webp'),
      gif: resolveUrl(assetBaseUrl, file)
    };
  }

  function chooseMedia(item, slotId) {
    var paths = mediaPaths(item.file);
    var width = Number(slotWidths[slotId] || 0);
    var dpr = Math.min(2, Math.max(1, Number(window.devicePixelRatio || 1)));
    var required = width * dpr;
    var useSmall = performanceProfile === 'lite';

    if (item.kind === 'vertical') {
      useSmall = true;
    } else if (item.kind === 'middle') {
      useSmall = useSmall || required <= 360;
    } else if (item.kind === 'horizontal') {
      useSmall = useSmall || required <= 520;
    }

    return {
      video: useSmall ? paths.small : paths.full,
      poster: paths.poster,
      gif: paths.gif,
      useSmall: useSmall
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

  function buildBadge(slotId, item, mediaType) {
    if (!debug) return null;
    var badge = document.createElement('span');
    badge.className = 'thmt-banner-debug-badge';
    badge.textContent = slotId + ' • ' + item.brand + ' • ' + item.size + ' • ' + mediaType + ' • ' + performanceProfile;
    return badge;
  }

  function disposeNode(node) {
    if (!node) return;
    var videos = [];
    if (node.tagName === 'VIDEO') videos.push(node);
    if (node.querySelectorAll) {
      videos = videos.concat(Array.from(node.querySelectorAll('video')));
    }
    videos.forEach(function (video) {
      try {
        video.pause();
        video.removeAttribute('src');
        while (video.firstChild) video.removeChild(video.firstChild);
        video.load();
      } catch (e) {}
    });
  }

  function replaceSlot(slot, nodes) {
    Array.from(slot.children).forEach(disposeNode);
    slot.replaceChildren.apply(slot, nodes);
  }

  function commitPoster(slotId, slot, item, media, posterImage, token) {
    if (slotTokens[slotId] !== token) return;

    posterImage.className = 'thmt-banner-media thmt-banner-poster';
    posterImage.alt = (item.brand + ' ' + item.size).trim();
    posterImage.decoding = 'async';

    var nodes = [posterImage];
    var link = buildLink(item);
    var badge = buildBadge(slotId, item, 'poster');
    if (link) nodes.push(link);
    if (badge) nodes.push(badge);

    replaceSlot(slot, nodes);
    slot.dataset.brand = item.brand;
    slot.dataset.size = item.size;
    slot.dataset.media = 'poster';
    slotStates[slotId] = { item: item, media: media, node: posterImage };
  }

  function commitVideo(slotId, slot, item, media, token) {
    if (slotTokens[slotId] !== token) return;

    var video = document.createElement('video');
    video.className = 'thmt-banner-media thmt-banner-video';
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = performanceProfile === 'lite' ? 'metadata' : 'auto';
    video.poster = media.poster;
    video.disablePictureInPicture = true;
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-label', (item.brand + ' ' + item.size).trim());

    var source = document.createElement('source');
    source.src = media.video;
    source.type = 'video/mp4';
    video.appendChild(source);

    video.addEventListener('error', function () {
      if (slotTokens[slotId] !== token) return;
      var fallback = new Image();
      fallback.className = 'thmt-banner-media thmt-banner-gif-fallback';
      fallback.src = media.gif;
      fallback.alt = (item.brand + ' ' + item.size).trim();
      fallback.decoding = 'async';
      fallback.loading = item.kind === 'middle' ? 'lazy' : 'eager';
      var nodes = [fallback];
      var link = buildLink(item);
      var badge = buildBadge(slotId, item, 'gif-fallback');
      if (link) nodes.push(link);
      if (badge) nodes.push(badge);
      replaceSlot(slot, nodes);
      slot.dataset.media = 'gif-fallback';
      slotStates[slotId] = { item: item, media: media, node: fallback };
    }, { once: true });

    var nodes = [video];
    var link = buildLink(item);
    var badge = buildBadge(slotId, item, media.useSmall ? 'mp4-sm' : 'mp4');
    if (link) nodes.push(link);
    if (badge) nodes.push(badge);

    replaceSlot(slot, nodes);
    slot.dataset.brand = item.brand;
    slot.dataset.size = item.size;
    slot.dataset.media = media.useSmall ? 'mp4-sm' : 'mp4';
    slotStates[slotId] = { item: item, media: media, node: video };

    if (!scrolling && !pageHidden) {
      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(function () {});
    }
  }

  function renderSlot(slotId, item) {
    var slot = slots[slotId];
    if (!slot || !item) return;

    var media = chooseMedia(item, slotId);
    var existing = slotStates[slotId];
    if (
      existing &&
      existing.item &&
      existing.item.brandId === item.brandId &&
      existing.item.file === item.file &&
      existing.media &&
      existing.media.video === media.video &&
      slot.dataset.brand === item.brand
    ) {
      return;
    }

    var token = (slotTokens[slotId] || 0) + 1;
    slotTokens[slotId] = token;

    var poster = new Image();
    poster.src = media.poster;
    poster.decoding = 'async';
    poster.loading = item.kind === 'middle' ? 'lazy' : 'eager';

    var commit = function () {
      if (slotTokens[slotId] !== token) return;
      if (performanceProfile === 'poster') {
        commitPoster(slotId, slot, item, media, poster, token);
      } else {
        commitVideo(slotId, slot, item, media, token);
      }
    };

    if (poster.complete && poster.naturalWidth > 0) {
      commit();
      return;
    }

    poster.addEventListener('load', commit, { once: true });
    poster.addEventListener('error', function () {
      if (slotTokens[slotId] !== token) return;
      if (performanceProfile === 'poster') {
        var fallback = new Image();
        fallback.src = media.gif;
        fallback.alt = (item.brand + ' ' + item.size).trim();
        commitPoster(slotId, slot, item, media, fallback, token);
      } else {
        commitVideo(slotId, slot, item, media, token);
      }
    }, { once: true });
  }

  function releaseSlot(slotId) {
    var slot = slots[slotId];
    if (!slot) return;
    slotTokens[slotId] = (slotTokens[slotId] || 0) + 1;
    Array.from(slot.children).forEach(disposeNode);
    slot.replaceChildren();
    delete slot.dataset.brand;
    delete slot.dataset.size;
    delete slot.dataset.media;
    delete slotStates[slotId];
  }

  function currentFrame(tick, count) {
    return rotationCore
      ? rotationCore.frame(tick, count)
      : {
          top: [tick, tick + 6],
          left: [tick + 1, tick + 4],
          right: [tick + 7, tick + 10],
          bottom: [tick + 2, tick + 8],
          middle: [(tick * 5), (tick * 5) + 1, (tick * 5) + 2, (tick * 5) + 3, (tick * 5) + 4]
        };
  }

  function renderTick(tick) {
    var brands = enabledBrands();
    if (!brands.length) return;
    var frame = currentFrame(tick, brands.length);

    renderSlot('TOP_1', bannerFor(frame.top[0], 'horizontal'));
    renderSlot('TOP_2', bannerFor(frame.top[1], 'horizontal'));
    renderSlot('BOTTOM_1', bannerFor(frame.bottom[0], 'horizontal'));
    renderSlot('BOTTOM_2', bannerFor(frame.bottom[1], 'horizontal'));

    if (desktopMql.matches) {
      renderSlot('LEFT_1', bannerFor(frame.left[0], 'vertical'));
      renderSlot('LEFT_2', bannerFor(frame.left[1], 'vertical'));
      renderSlot('RIGHT_1', bannerFor(frame.right[0], 'vertical'));
      renderSlot('RIGHT_2', bannerFor(frame.right[1], 'vertical'));
    } else {
      ['LEFT_1', 'LEFT_2', 'RIGHT_1', 'RIGHT_2'].forEach(releaseSlot);
    }

    if (middleActive) {
      for (var i = 0; i < 5; i += 1) {
        renderSlot('MIDDLE_' + (i + 1), bannerFor(frame.middle[i], 'middle'));
      }
    }

    currentTick = rotationCore
      ? rotationCore.normalizeIndex(tick, brands.length)
      : ((Number(tick) || 0) % brands.length + brands.length) % brands.length;

    schedulePrefetch();
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
    if (scrolling || pageHidden || rotationMode() !== 'sequential') return false;
    var brands = enabledBrands();
    if (!brands.length) return false;

    rotationTimer = window.setInterval(function () {
      var next = rotationCore
        ? rotationCore.nextTick(currentTick, brands.length)
        : (currentTick + 1) % brands.length;
      renderTick(next);
    }, getIntervalMs());
    return true;
  }

  function pauseVideos() {
    Object.keys(slotStates).forEach(function (slotId) {
      var node = slotStates[slotId] && slotStates[slotId].node;
      if (node && node.tagName === 'VIDEO') {
        try { node.pause(); } catch (e) {}
      }
    });
  }

  function resumeVideos() {
    if (scrolling || pageHidden || performanceProfile === 'poster') return;
    Object.keys(slotStates).forEach(function (slotId) {
      var node = slotStates[slotId] && slotStates[slotId].node;
      if (node && node.tagName === 'VIDEO') {
        var promise = node.play();
        if (promise && typeof promise.catch === 'function') promise.catch(function () {});
      }
    });
  }

  function onScroll() {
    if (!scrolling) {
      scrolling = true;
      stopRotation();
      pauseVideos();
    }

    if (!headerRecheckedAfterScroll) {
      headerRecheckedAfterScroll = true;
      window.setTimeout(function () {
        discoverHeaders();
        scheduleGeometry();
      }, 0);
    }

    if (scrollResumeTimer) window.clearTimeout(scrollResumeTimer);
    scrollResumeTimer = window.setTimeout(function () {
      scrolling = false;
      resumeVideos();
      startRotation();
    }, 180);
  }

  function onVisibilityChange() {
    pageHidden = document.hidden;
    if (pageHidden) {
      stopRotation();
      pauseVideos();
    } else if (!scrolling) {
      resumeVideos();
      startRotation();
    }
  }

  function requestIdle(callback, timeout) {
    if ('requestIdleCallback' in window) {
      return window.requestIdleCallback(callback, { timeout: timeout || 1200 });
    }
    return window.setTimeout(callback, 50);
  }

  function prefetchUrl(url) {
    if (!url || warmed.has(url)) return;
    warmed.add(url);
    fetch(url, { cache: 'force-cache', credentials: 'omit', mode: 'cors' }).catch(function () {});
  }

  function schedulePrefetch() {
    if (performanceProfile === 'poster') return;
    if (prefetchTimer) window.clearTimeout(prefetchTimer);

    prefetchTimer = window.setTimeout(function () {
      if (scrolling || pageHidden) return;
      var brands = enabledBrands();
      if (!brands.length) return;
      var nextTick = rotationCore ? rotationCore.nextTick(currentTick, brands.length) : (currentTick + 1) % brands.length;
      var frame = currentFrame(nextTick, brands.length);
      var items = [
        ['TOP_1', bannerFor(frame.top[0], 'horizontal')],
        ['TOP_2', bannerFor(frame.top[1], 'horizontal')],
        ['BOTTOM_1', bannerFor(frame.bottom[0], 'horizontal')],
        ['BOTTOM_2', bannerFor(frame.bottom[1], 'horizontal')]
      ];

      if (desktopMql.matches) {
        items.push(['LEFT_1', bannerFor(frame.left[0], 'vertical')]);
        items.push(['LEFT_2', bannerFor(frame.left[1], 'vertical')]);
        items.push(['RIGHT_1', bannerFor(frame.right[0], 'vertical')]);
        items.push(['RIGHT_2', bannerFor(frame.right[1], 'vertical')]);
      }

      if (middleActive) {
        for (var i = 0; i < 5; i += 1) {
          items.push(['MIDDLE_' + (i + 1), bannerFor(frame.middle[i], 'middle')]);
        }
      }

      var queue = items.filter(function (pair) { return pair[1]; });
      function warmOne() {
        var pair = queue.shift();
        if (!pair) return;
        var media = chooseMedia(pair[1], pair[0]);
        prefetchUrl(media.poster);
        prefetchUrl(media.video);
        if (queue.length) requestIdle(warmOne, 1000);
      }
      requestIdle(warmOne, 1000);
    }, Math.round(getIntervalMs() * 0.6));
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
      'main#primary', '#primary.site-main', 'main.site-main', '.site-main',
      '.content-area main', 'main', '#content', '.site-content', '#page', '.site'
    ]) || document.body;
  }

  function discoverDom() {
    dom.top = document.getElementById('thmt-banner-top');
    dom.bottom = document.getElementById('thmt-banner-bottom');
    dom.left = document.querySelector('.thmt-banner-side-left');
    dom.right = document.querySelector('.thmt-banner-side-right');
    dom.middle = document.querySelector('.thmt-banner-middle-zone');
    dom.shell = visibleElement(['#page', '.site', '.wp-site-blocks', '.site-container', '.ast-container', '#content', '.site-content']) || document.body;

    document.querySelectorAll('[data-slot]').forEach(function (slot) {
      slots[slot.getAttribute('data-slot')] = slot;
    });
  }

  function mountTop() {
    if (!dom.top || dom.top.classList.contains('is-mounted')) return;
    var target = contentTarget();
    target.insertBefore(dom.top, target.firstChild);
    dom.top.classList.add('is-mounted');
  }

  function discoverHeaders() {
    var selectors = [
      '#masthead', '#header', '.site-header', 'header.site-header', 'header',
      '.header', '.navbar', '.navigation-top', '.main-navigation',
      '.elementor-location-header', '.ast-primary-header-bar'
    ];
    var found = [];
    selectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (node) {
        if (found.indexOf(node) === -1) found.push(node);
      });
    });
    headerNodes = found;
    observeGeometryNodes();
  }

  function adminBarOffset() {
    var bar = document.getElementById('wpadminbar');
    if (!bar) return 0;
    var rect = bar.getBoundingClientRect();
    return Math.max(0, rect.height || 0);
  }

  function fixedHeaderBottom() {
    var offset = adminBarOffset();
    headerNodes.forEach(function (node) {
      var style = window.getComputedStyle(node);
      if (style.position !== 'fixed' && style.position !== 'sticky') return;
      var rect = node.getBoundingClientRect();
      if (rect.width < window.innerWidth * 0.45 || rect.height <= 0) return;
      if (rect.top > offset + 12 || rect.bottom <= offset) return;
      offset = Math.max(offset, rect.bottom);
    });
    return Math.min(offset, window.innerHeight * 0.4);
  }

  function updateSlotWidths() {
    Object.keys(slots).forEach(function (slotId) {
      var rect = slots[slotId].getBoundingClientRect();
      slotWidths[slotId] = rect.width || 0;
    });
  }

  function recomputeGeometry() {
    geometryQueued = false;
    geometryPassCount += 1;
    if (!dom.top || !dom.bottom || !dom.left || !dom.right) return;

    var occlusion = fixedHeaderBottom();
    dom.top.style.setProperty('--thmt-sticky-top', (Math.ceil(occlusion) + 8) + 'px');

    var shellRect = dom.shell.getBoundingClientRect();
    if (window.innerWidth > 1200) {
      var leftEdge = Math.max(12, shellRect.left + 12);
      var rightEdge = Math.max(12, (window.innerWidth - shellRect.right) + 12);
      var topRect = dom.top.getBoundingClientRect();
      var bottomRect = dom.bottom.getBoundingClientRect();
      var railTop = Math.max(occlusion + 8, topRect.bottom + 8);
      var railBottom = Math.min(window.innerHeight - 8, bottomRect.top - 8);
      var availableHeight = Math.max(120, railBottom - railTop);
      var nextScale = Math.min(1, availableHeight / 1010);

      dom.left.style.left = leftEdge + 'px';
      dom.left.style.right = 'auto';
      dom.right.style.right = rightEdge + 'px';
      dom.right.style.left = 'auto';
      dom.left.style.top = railTop + 'px';
      dom.right.style.top = railTop + 'px';
      currentRailScale = nextScale;
      dom.left.style.transform = 'scale(' + nextScale + ')';
      dom.right.style.transform = 'scale(' + nextScale + ')';

      var inset = 174;
      dom.bottom.style.left = (Math.max(0, shellRect.left) + inset) + 'px';
      dom.bottom.style.right = (Math.max(0, window.innerWidth - shellRect.right) + inset) + 'px';
    } else {
      dom.bottom.style.left = '';
      dom.bottom.style.right = '';
    }

    updateSlotWidths();
  }

  function scheduleGeometry() {
    if (geometryQueued) return;
    geometryQueued = true;
    window.requestAnimationFrame(recomputeGeometry);
  }

  function observeGeometryNodes() {
    if ('ResizeObserver' in window) {
      if (resizeObserver) resizeObserver.disconnect();
      resizeObserver = new ResizeObserver(scheduleGeometry);
      [dom.shell, dom.top, dom.bottom].concat(headerNodes).forEach(function (node) {
        if (node) resizeObserver.observe(node);
      });
    }

    if ('MutationObserver' in window) {
      if (headerObserver) headerObserver.disconnect();
      headerObserver = new MutationObserver(scheduleGeometry);
      headerNodes.forEach(function (node) {
        headerObserver.observe(node, { attributes: true, attributeFilter: ['class', 'style'] });
      });
    }
  }

  function setupMiddleObserver() {
    if (!dom.middle) return;
    if (!('IntersectionObserver' in window)) {
      middleActive = true;
      renderTick(currentTick);
      return;
    }

    middleObserver = new IntersectionObserver(function (entries) {
      var near = entries.some(function (entry) { return entry.isIntersecting; });
      if (near && !middleActive) {
        middleActive = true;
        renderTick(currentTick);
      } else if (!near && middleActive) {
        middleActive = false;
        for (var i = 1; i <= 5; i += 1) releaseSlot('MIDDLE_' + i);
      }
    }, { root: null, rootMargin: '400px 0px', threshold: 0 });

    middleObserver.observe(dom.middle);
  }

  function handleDesktopChange() {
    if (!desktopMql.matches) {
      ['LEFT_1', 'LEFT_2', 'RIGHT_1', 'RIGHT_2'].forEach(releaseSlot);
    }
    scheduleGeometry();
    renderTick(currentTick);
  }

  function cleanup() {
    stopRotation();
    pauseVideos();
    if (prefetchTimer) window.clearTimeout(prefetchTimer);
    if (scrollResumeTimer) window.clearTimeout(scrollResumeTimer);
    if (middleObserver) middleObserver.disconnect();
    if (resizeObserver) resizeObserver.disconnect();
    if (headerObserver) headerObserver.disconnect();
    Object.keys(slots).forEach(releaseSlot);
  }

  function init() {
    discoverDom();
    mountTop();
    discoverHeaders();
    setupMiddleObserver();
    recomputeGeometry();
    renderTick(0);
    startRotation();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', scheduleGeometry, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });
    window.addEventListener('pagehide', cleanup, { once: true });
    if (desktopMql.addEventListener) desktopMql.addEventListener('change', handleDesktopChange);
    else if (desktopMql.addListener) desktopMql.addListener(handleDesktopChange);
  }

  window.THMTBannerRuntime = {
    version: '0.7.0',
    baseline: 'V9_LOCKED',
    renderTick: renderTick,
    startRotation: startRotation,
    stopRotation: stopRotation,
    recomputeGeometry: recomputeGeometry,
    refreshHeaderCandidates: discoverHeaders,
    getBrandCount: function () { return enabledBrands().length; },
    getCurrentTick: function () { return currentTick; },
    getIntervalMs: getIntervalMs,
    getRailScale: function () { return currentRailScale; },
    getGeometryPassCount: function () { return geometryPassCount; },
    getPerformanceProfile: function () { return performanceProfile; },
    isMiddleActive: function () { return middleActive; },
    isScrolling: function () { return scrolling; },
    isRunning: function () { return rotationTimer !== null; },
    pauseVideos: pauseVideos,
    resumeVideos: resumeVideos
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());

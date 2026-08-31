# WordPress Plugin — Step 5

Plugin source lives in `plugin/thmt-banner-system/`.

## Step 5 complete scope
- Keeps the locked V9 slot structure:
  - TOP: 2
  - LEFT: 2
  - RIGHT: 2
  - MIDDLE: 5
  - BOTTOM: 2
- Enables production sequential rotation for all 14 enabled brands.
- Rotation interval is read from `system.rotation_interval_seconds`; current locked config is 5 seconds.
- One slot render receives one brand object, so its image and URL are replaced together.
- MIDDLE advances as a 5-brand window while each middle slot covers all 14 brands across a full 14-tick cycle.
- Preserves `object-fit: contain`, aspect ratio and side-rail group scaling.
- Empty brand URL = visible banner with no click target.
- Runtime control is exposed as:
  - `THMTBannerRuntime.startRotation()`
  - `THMTBannerRuntime.stopRotation()`
  - `THMTBannerRuntime.renderTick(tick)`
  - `THMTBannerRuntime.getCurrentTick()`
  - `THMTBannerRuntime.getIntervalMs()`

## Intentionally NOT in Step 5
- No remote GitHub config sync/cache yet — Step 6.
- No production-site acceptance test yet — Step 7.
- No release ZIP yet — Step 8.

## V9 source
Implementation remains bound to `docs/BASELINE_V9.md`; Step 5 changes rotation only, not layout.

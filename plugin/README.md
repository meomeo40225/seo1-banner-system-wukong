# WordPress Plugin — Step 4

Plugin source lives in `plugin/thmt-banner-system/`.

## Step 4 complete scope
- WordPress plugin bootstrap.
- Reads a bundled snapshot of root `config/banners.json`.
- Renders the locked V9 slot structure:
  - TOP: 2
  - LEFT: 2
  - RIGHT: 2
  - MIDDLE: 5
  - BOTTOM: 2
- Uses repository asset paths through the GitHub raw asset base.
- Preserves `object-fit: contain` / aspect ratio.
- Side rails keep the original 2 × 150×500 natural boxes and scale as one group when the viewport is short.
- Empty brand URL = visible banner with no click target.
- No visitor hide/show controls.
- Exposes `window.THMTBannerRuntime.renderTick(tick)` as the Step 5 contract.

## Intentionally NOT in Step 4
- No production rotation scheduler (`setInterval`) yet — Step 5.
- No remote GitHub config sync/cache yet — Step 6.
- No production-site acceptance test yet — Step 7.
- No release ZIP yet — Step 8.

## V9 source
Implementation follows `docs/BASELINE_V9.md` and the locked V9 prototype behavior.

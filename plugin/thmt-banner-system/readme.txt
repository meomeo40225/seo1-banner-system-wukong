=== THMT Banner System ===
Contributors: thmt
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 0.4.0
License: Proprietary

Central banner renderer for the locked V9 layout.

== Step 4 scope ==
* Reads a bundled snapshot of config/banners.json.
* Renders TOP 2, LEFT 2, RIGHT 2, MIDDLE 5 and BOTTOM 2.
* Preserves object-fit: contain and side-rail group scaling.
* Empty brand URLs remain non-clickable.
* Exposes THMTBannerRuntime.renderTick() for Step 5.
* Does NOT start production rotation yet.
* Does NOT perform GitHub remote sync/cache yet.

=== THMT Banner System ===
Contributors: thmt
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 0.5.0
License: Proprietary

Central banner renderer and rotation engine for the locked V9 layout.

== Step 5 scope ==
* Reads the bundled config/banners.json snapshot.
* Renders TOP 2, LEFT 2, RIGHT 2, MIDDLE 5 and BOTTOM 2.
* Sequentially rotates through all 14 enabled brands.
* Rotation interval is read from config; current V9 value is 5 seconds.
* Image and brand URL are replaced from the same brand object in one render operation.
* MIDDLE keeps 5 brands visible per tick.
* Preserves object-fit: contain and side-rail group scaling.
* Empty brand URLs remain non-clickable.
* Does NOT perform GitHub remote sync/cache yet; that remains Step 6.

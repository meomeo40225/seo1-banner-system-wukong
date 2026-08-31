=== THMT Banner System ===
Contributors: thmt
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 0.6.0
License: Proprietary

Central GitHub-driven banner renderer for the locked V9 layout.

== Step 6 scope ==
* GitHub config/banners.json is the control-plane source of truth.
* Uses WordPress transient cache with interval from github_sync_interval_seconds.
* Keeps a persistent last-known-good config and falls back to the bundled snapshot.
* Uses ETag / Last-Modified conditional requests when available.
* A failed or malformed GitHub response never replaces the last-known-good config.
* Keeps sequential rotation from Step 5.
* Keeps TOP 2, LEFT 2, RIGHT 2, MIDDLE 5 and BOTTOM 2.
* Future additional brands are accepted without a plugin rebuild when they satisfy the V9 contract.
* Empty brand URLs remain non-clickable.

=== THMT Banner System ===
Contributors: thmt
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 0.7.1
License: Proprietary

GitHub-driven banner renderer with the TOP zone removed.

== Step 7 Performance Engine v0.7.1 ==
* New requested layout: TOP removed / LEFT 2 / RIGHT 2 / MIDDLE 5 / BOTTOM 2.
* Replaces normal animated-GIF rendering with generated H.264 MP4 media.
* Uses 15 fps H.264, full/small variants and WebP poster frames.
* GIF assets remain as fallback/archive, not the normal render path.
* Mobile/tablet do not mount hidden LEFT/RIGHT media.
* MIDDLE media is mounted only near the viewport and released when far away.
* Scroll freeze pauses video and rotation, then resumes after scrolling stops.
* Hidden browser tabs pause video and rotation.
* Geometry work is removed from the normal scroll path.
* ResizeObserver/MutationObserver handle geometry and sticky-header changes.
* Next rotation media is warmed gradually during idle time.
* Frontend config reads are stale-while-revalidate and never block on GitHub HTTP.
* Supports optional HTTPS media_base_url for a future CDN/R2 origin.
* Adaptive profiles: full, lite and poster.
* TOP slots are not rendered or downloaded.
* Empty brand URLs remain non-clickable.

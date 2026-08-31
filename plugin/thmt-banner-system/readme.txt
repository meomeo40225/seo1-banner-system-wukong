=== THMT Banner System ===
Contributors: thmt
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 1.0.1
License: Proprietary

GitHub-driven banner renderer with the TOP zone removed.

== Private Delivery Candidate — 1.0.1 ==
* Stable layout: TOP removed / LEFT 2 / RIGHT 2 / MIDDLE 5 / BOTTOM 2.
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
* Frontend config reads are stale-while-revalidate and never block on remote HTTP.
* Uses Cloudflare Pages as the public config/media/assets delivery origin.
* Adaptive profiles: full, lite and poster.
* TOP slots are not rendered or downloaded.
* Empty brand URLs remain non-clickable.

== Release status ==
* Step 7 clean-WordPress and real-site acceptance passed.
* Candidate 1.0.1 keeps Stable V1 behavior while moving public delivery off GitHub raw URLs.

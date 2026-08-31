=== THMT Banner System ===
Contributors: thmt
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 0.6.1
License: Proprietary

Central GitHub-driven banner renderer for the locked V9 layout.

== Step 7 candidate hotfix ==
* Fixes TOP overlap with fixed/sticky theme headers.
* rAF-throttles scroll/resize layout work.
* Removes expensive backdrop blur from fixed/sticky banner chrome.
* MIDDLE GIFs are mounted only near the viewport and released when far away.
* Banner swaps keep the previous image visible until the next GIF has loaded.
* Keeps GitHub sync/cache, V9 layout and 5-second sequential rotation unchanged.

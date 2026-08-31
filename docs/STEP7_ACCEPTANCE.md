# Step 7 — WordPress Acceptance

Step 7 has two gates. Do not create Stable V1 until both pass.

## Gate A — automated clean WordPress

The v0.7 acceptance workflow installs a clean WordPress + MariaDB instance, activates the candidate plugin and verifies:

- plugin activation;
- frontend config read returns locally without blocking on GitHub HTTP;
- explicit GitHub refresh creates last-known-good state;
- simulated GitHub/network failure preserves last-known-good;
- V9 has 13 slots: TOP 2 / LEFT 2 / RIGHT 2 / MIDDLE 5 / BOTTOM 2;
- normal media path uses H.264 MP4, not GIF;
- no unexpected GIF fallback;
- 5-second sequential rotation advances;
- 100-scroll burst does not repeatedly execute geometry;
- scroll pauses video + rotation, then resumes;
- injected fixed header cannot cover TOP;
- far-offscreen MIDDLE releases its media;
- near-viewport MIDDLE mounts exactly five videos;
- mobile/tablet hidden LEFT/RIGHT slots remain media-empty;
- candidate ZIP and browser screenshot are archived.

Current v0.7 automated Gate A: **PASS**.

## Media-generation gate

For all 42 source GIF creatives:

- one full H.264 MP4;
- one small H.264 MP4;
- one WebP poster;
- H.264 frame rate <= 15 fps;
- generated set exactly matches config;
- full MP4 set reduces source GIF bytes by at least 75%;
- small MP4 set reduces source GIF bytes by at least 82%.

Current generated totals:

```text
source GIF   ≈ 64.13 MiB
full H264    ≈ 5.99 MiB
small H264   ≈ 3.49 MiB
WebP poster  ≈ 0.30 MiB
```

## Gate B — one real user-owned WordPress site

The v0.7 candidate must be installed on the selected real WordPress site and checked for:

- perceptibly smooth scrolling;
- correct TOP placement below the site's real fixed/sticky header;
- correct LEFT / RIGHT group scaling;
- MIDDLE media appearing when approaching the section;
- BOTTOM fixed placement;
- no crop/stretch;
- 5-second rotation;
- no black flashes during normal media changes;
- no hidden side-media load on narrower viewport;
- acceptable desktop and mobile behavior;
- central GitHub config propagation.

Only after this real-site Gate B passes may the performance branch be merged and Step 8 Stable V1 be built.

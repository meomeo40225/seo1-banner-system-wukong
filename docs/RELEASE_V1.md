# THMT Banner System — Stable V1

Version: **1.0.0**

## Frozen layout

```text
TOP      0
LEFT     2
RIGHT    2
MIDDLE   5
BOTTOM   2
```

TOP is intentionally removed and must not be reintroduced without a new approved change.

## Stable runtime

- 14 enabled initial brands from centralized GitHub config.
- Sequential rotation; current config interval: 5 seconds.
- H.264 MP4 is the normal animated media path.
- 15 fps generated media.
- Full + small MP4 variants and WebP posters.
- Original GIFs retained as fallback/archive.
- Scroll freeze pauses video and rotation.
- Hidden-tab freeze.
- MIDDLE near-viewport mount and off-screen resource release.
- Hidden mobile/tablet LEFT/RIGHT media is not mounted.
- Stale-while-revalidate config: frontend does not wait for GitHub network I/O.
- Last-known-good and bundled fallback remain active.
- Optional HTTPS media_base_url keeps CDN/R2 migration possible.
- Image/video fit remains contain; no crop/stretch.

## Acceptance evidence

Stable V1 is derived from the v0.7.1 source that passed:

- plugin contract validation;
- config/assets validation;
- optimized-media validation;
- PHP and JavaScript syntax;
- rotation behavior;
- GitHub sync/cache policy;
- stale-while-revalidate policy;
- clean WordPress install/activation;
- browser performance acceptance;
- real-site Gate B acceptance.

## Package

Installable package:

`thmt-banner-system-stable-v1.0.0.zip`

Build output also includes:

`thmt-banner-system-stable-v1.0.0.zip.sha256`

Use the SHA256 checksum to verify the package has not changed.

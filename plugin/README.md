# WordPress Plugin — Step 7 Performance Engine v0.7.1

Plugin source lives in `plugin/thmt-banner-system/`.

## Why v0.7.1 exists

The first real-site Gate B test on the previous GIF renderer exposed persistent scroll jank even after the v0.6.1 JavaScript hotfix. The dominant remaining cost was animated GIF decode/compositing across fixed/sticky slots.

The 42 source GIFs total about **64.13 MiB**. The generated media set is now:

- full H.264 MP4: about **5.99 MiB**;
- small H.264 variants: about **3.49 MiB**;
- WebP posters: about **0.30 MiB**.

The source GIFs remain untouched as fallback/archive.

## v0.7.1 performance architecture

- H.264 MP4 at 15 fps.
- Full and small resolution variants per creative.
- WebP first-frame posters.
- Adaptive profile selection:
  - `full` for normal capable devices;
  - `lite` for constrained network/CPU/memory;
  - `poster` for Save-Data, very slow networks or reduced-motion.
- Hidden mobile/tablet side rails never mount media.
- MIDDLE mounts only within the near-viewport observation window and releases decoder resources when far away.
- Scroll freeze:
  - stop rotation;
  - pause active videos;
  - perform no repeated geometry reads;
  - resume after 180 ms without scroll.
- Hidden tabs pause media and rotation.
- Next-tick poster/video URLs are warmed sequentially during idle time.
- Video failure falls back to the original GIF.
- Banner URL remains paired with the same brand object as its media.

## Config performance

Frontend visitors no longer wait for GitHub when config cache is stale.

```text
visitor request
   ↓
transient / last-known-good / bundled snapshot
   ↓ immediate render
background WP-Cron
   ↓
GitHub conditional refresh
   ↓
validate → last-known-good → transient
```

This is stale-while-revalidate behavior. `wp_remote_get()` is never called inside the normal frontend `get()` path.

## Layout override requested for v0.7.1

- TOP: removed
- LEFT 2 fixed / group-scale
- RIGHT 2 fixed / group-scale
- MIDDLE 5 content
- BOTTOM 2 fixed
- `object-fit: contain`
- no crop / stretch
- sequential rotation, currently 5 seconds
- no visitor hide controls

## Gate status

Automated clean-WordPress Gate A for v0.7.1 passes. One real user-owned WordPress site must still pass the v0.7.1 retest before Step 7 can be closed and Step 8 Stable V1 can be produced.

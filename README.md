# SEO1 Banner System Wukong

Central banner distribution system cho nhiều website WordPress.

## Mục tiêu
GitHub là source-of-truth cho:
- brand
- link của brand
- banner source assets
- layout/config
- rotation settings

WordPress plugin sync config từ GitHub, cache local, render layout V9 và tự rotation.

## Trạng thái hiện tại
- [x] V9 layout locked
- [x] Schema `banners.json`
- [x] 14 initial brands
- [x] 42 selected source GIF assets
- [x] WordPress renderer
- [x] Sequential rotation engine
- [x] GitHub sync/cache
- [x] Step 7 automated clean-WordPress acceptance
- [x] v0.7 Performance Engine automated acceptance
- [ ] v0.7 real-site Gate B retest
- [ ] Stable V1 ZIP release

## Performance Engine v0.7 candidate

The original 42 animated GIFs total about **64.13 MiB**. GitHub Actions now generates, for every creative:

```text
source GIF
   ├── full H.264 MP4
   ├── small H.264 MP4
   └── WebP poster
```

Generated totals are approximately:

- full H.264: **5.99 MiB**
- small H.264: **3.49 MiB**
- posters: **0.30 MiB**

The browser normally renders MP4, with the original GIF retained only as fallback.

Additional performance controls:
- 15 fps media;
- adaptive full/lite/poster profiles;
- scroll freeze;
- hidden-tab freeze;
- mobile no-load for hidden side rails;
- near-viewport MIDDLE mounting;
- media resource release when off-screen;
- idle prefetch of the next rotation;
- cached geometry with ResizeObserver/MutationObserver;
- no normal geometry calculation on every scroll;
- stale-while-revalidate config so visitor requests do not wait on GitHub;
- optional `media_base_url` for future CDN/R2 delivery.

## Rule link
Mỗi brand chỉ có một field `url`. Ảnh/video và URL của brand được đổi cùng một render operation.

## Baseline
V9 đã chốt cứng. Performance work không được thay đổi layout V9.

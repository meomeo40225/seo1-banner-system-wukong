# SEO1 Banner System Wukong

Central banner distribution system cho nhiều website WordPress.

## Mục tiêu
GitHub là source-of-truth cho:
- brand
- link của brand
- banner assets
- layout/config
- rotation settings

WordPress plugin sync config từ GitHub, cache local, render layout V9 và tự rotation.

## Trạng thái hiện tại
- [x] V9 layout locked
- [x] Schema `banners.json`
- [x] 14 initial brands
- [x] 42 selected initial banner assets
- [x] Brand URLs để trống để bổ sung sau
- [x] WordPress plugin renderer (Step 4)
- [x] Rotation engine production (Step 5)
- [x] GitHub sync/cache engine (Step 6)
- [ ] Test thật trên 1 website
- [ ] Plugin ZIP release

## Step 6
GitHub đã trở thành control plane thật cho config. Website WordPress lấy `config/banners.json` từ GitHub, validate trước khi dùng, cache theo `github_sync_interval_seconds`, lưu last-known-good và fallback về bundled snapshot nếu GitHub lỗi.

Remote config có thể thêm brand mới sau 14 brand ban đầu mà không cần rebuild plugin; layout V9 vẫn bị khóa cứng.

## Rule link
Mỗi brand chỉ có một field `url`. Đổi URL một brand ở `config/banners.json` sẽ áp dụng cho mọi creative/slot của brand đó.

## Baseline
Layout/behavior V9 đã chốt cứng. Không tự ý thay đổi khi build plugin V1.

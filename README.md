# SEO1 Banner System Wukong

Central banner distribution system cho nhiều website WordPress.

## Mục tiêu
GitHub là source-of-truth cho:
- brand
- link của brand
- banner assets
- layout/config
- rotation settings

WordPress plugin sẽ sync config từ GitHub, cache local, render layout V9 và tự rotation.

## Trạng thái hiện tại
- [x] V9 layout locked
- [x] Schema `banners.json`
- [x] 14 brands
- [x] 42 selected banner assets
- [x] Brand URLs để trống để bổ sung sau
- [x] WordPress plugin renderer (Step 4)
- [ ] Rotation engine production
- [ ] GitHub sync/cache engine
- [ ] Test thật trên 1 website
- [ ] Plugin ZIP release

## Step 4
Plugin source: `plugin/thmt-banner-system/`.

Step 4 render được V9 với TOP 2, LEFT 2, RIGHT 2, MIDDLE 5 và BOTTOM 2; giữ `object-fit: contain`, side-rail group scaling và rule URL trống = không clickable. Rotation scheduler vẫn để Step 5, remote GitHub sync/cache vẫn để Step 6.

## Rule link
Mỗi brand chỉ có một field `url`. Đổi URL một brand ở `config/banners.json` sẽ áp dụng cho mọi creative/slot của brand đó.

## Baseline
Layout/behavior V9 đã chốt cứng. Không tự ý thay đổi khi build plugin V1.

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
- [x] Rotation engine production (Step 5)
- [ ] GitHub sync/cache engine
- [ ] Test thật trên 1 website
- [ ] Plugin ZIP release

## Step 5
Rotation engine chạy sequential trên đủ 14 brand. Chu kỳ lấy từ `banners.json` (hiện là 5 giây), không hard-code logic brand vào scheduler. Mỗi lần đổi slot, ảnh và URL lấy từ cùng một brand object nên không có trạng thái ảnh A nhưng link B.

## Rule link
Mỗi brand chỉ có một field `url`. Đổi URL một brand ở `config/banners.json` sẽ áp dụng cho mọi creative/slot của brand đó.

## Baseline
Layout/behavior V9 đã chốt cứng. Không tự ý thay đổi khi build plugin V1.

# V9 Locked Layout Baseline

Không tự ý thay đổi layout này khi build plugin V1.

## Layout
- TOP: 2 banner ngang.
- LEFT: 2 banner dọc.
- RIGHT: 2 banner dọc.
- MIDDLE: 5 banner cùng lúc.
- BOTTOM: 2 banner ngang.

## Scroll behavior
- TOP: luôn hiện khi cuộn.
- LEFT/RIGHT: chạy theo viewport.
- BOTTOM: luôn hiện khi cuộn.
- MIDDLE: nằm trong content và cuộn bình thường.

## Side fitting
- Luôn phải nhìn thấy đầy đủ 2 banner mỗi bên.
- Không crop.
- Không stretch.
- Nếu viewport không đủ cao, scale cả cụm side theo cùng một tỷ lệ.

## Rotation
- Pool đủ 14 brand.
- Mặc định 5 giây.
- Sequential ở V1.
- Thời gian phải lấy từ config, không hard-code trong plugin.

## Link rule
- Mỗi brand = 1 URL.
- Mọi creative của cùng một brand ở mọi slot dùng chung URL của brand.
- URL có thể để trống; khi trống banner vẫn hiển thị nhưng không clickable.

## Asset fit
- `object-fit: contain`.
- Preserve aspect ratio.
- Ưu tiên exact size.
- Nếu không có exact size, dùng compatible fallback đã khai báo trong `banners.json`.

## Controls
- Không có nút Ẩn/Hiện banner cho visitor.

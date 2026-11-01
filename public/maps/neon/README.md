# Lumina-01 (2D, khung xương board2d)

Đô thị neon nửa đêm. Bản duyệt hướng (T24), chưa phải asset cuối. Xem `BRIEF.md`.

## File

- `renderer.js` — 3 dòng, gọi `createBoard2D` (không sửa tay).
- `skin.js` — toàn bộ phong cách: palette, 13 slot (chỗ cần thay có chú thích `THAY:`).
- `preview.svg` — ảnh lobby tạm, thay bằng ảnh thật.
- `assets/` — sprite riêng của map (PNG ≤ 512 px, tổng ≤ 1,5 MB). Hiện trống.

## Phong cách

4 zone theo giai tầng: Back Alley, Nightlife, Cyber Financial, Megacorp HQ. Nền tối, neon vẽ bằng bút, lõi Reactor Core giữa bàn.

## Asset

- Kenney Isometric Buildings (CC0), dùng chung ở `public/assets/shared/`.
- (Ghi nguồn asset CC0 khác nếu thêm. Không dùng asset gốc Business Tour.)

## Còn thiếu

- Thay skin mẫu từng slot: tile, deco, house, resort, resortHouse, 4 góc, chance, tax, base, center.
- Chọn palette 8 nhóm đất, tên 4 cấp nhà resort (`labels.resortLevels`).
- Làm `preview.svg` thật; hoàn tất `docs/contracts/map-parity.md` và chạy `npm run verify` trước khi commit.

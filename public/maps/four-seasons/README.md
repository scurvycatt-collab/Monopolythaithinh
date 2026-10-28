# Bốn Mùa (2D, khung xương board2d)

Bàn isometric vẽ bằng canvas 2D. Mỗi cạnh một mùa: 0 Xuân, 1 Hạ, 2 Thu, 3 Đông.
Giữa bàn là hội chợ bốn mùa (chợ hoa Tết, bãi thả diều, phố đèn lồng, chợ Giáng sinh) quanh đài phun 3 tầng.

## File

- `renderer.js` — 3 dòng, gọi `createBoard2D` (không sửa tay).
- `skin.js` — toàn bộ phong cách: zones, 13 slot, ambient (tia nước đài phun; hạt mùa theo `zone.particles`).
- `preview.svg` — ảnh lobby dựng tay.

## Phương án đã chốt (map lab)

01 ô đất: viền mép sau · 02 nhà 5 cấp: khối Kenney, cây đổi mùa · 03 cây khối vuông ·
04 resort: cắm trại · 05 nhà resort: trại → glamping · 06 Start: vòm bốn mùa · 07 Lost Island: đảo nhiệt đới ·
08 Championships: sân vận động mùa Thu · 09 World Tour: khinh khí cầu · 10 Chance: hộp quà ·
11 Tax: ngân khố cột đá · 12 đế: khung gỗ chỉ vàng · 13 giữa bàn: hội chợ + đài phun.

## Asset

- Kenney Isometric Buildings và Nature Kit (CC0), dùng chung ở `public/assets/shared/`. Không có asset riêng.
- Quân cờ: ảnh Cube Pets sinh sẵn ở `public/thumbnails/static/pet-*.png`.

## Parity với Map 1

- Tuân thủ `docs/contracts/map-parity.md`: ô trống không hiện giá mua, quân cao chuẩn 1.08,
  popup dùng thumbnail tĩnh và Chance phát thẻ theo `seq` trước chuyển động do thẻ tạo ra.
- Cảnh tĩnh/sprite được cache; lúc rảnh giảm nhịp đánh thức, tab ẩn dừng render; mức `low`
  bỏ ambient. Chạy `npm run verify` trước commit/deploy.

## Còn thiếu

- Chuyển động của bản xem trước bị bỏ để giữ cảnh tĩnh nướng một lần: cờ bay, bóng bay, lửa trại, khói.
- Tên ô resort lấy từ `rules` (Bali, Cyprus…), không phải tên trại của bản xem trước.

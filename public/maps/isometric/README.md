# Isometric (2D, khung xương board2d)

Bàn isometric vẽ bằng canvas 2D, chuyển từ mẫu Isometric gốc: thành phố khối Kenney, đảo nhiệt đới,
sân bay / núi / hồ / tàu lượn / đu quay giữa bàn. Cả bàn một theme (`zones: null`).

## File

- `renderer.js` — 3 dòng, gọi `createBoard2D` (không sửa tay).
- `skin.js` — palette, 13 slot, ambient. `deco` bỏ trống (bản gốc không có), `base` dùng mặc định.
- `preview.svg` — ảnh lobby dựng tay.

## Điểm cần biết

- Giữa bàn: `zones: null` khiến khung xương gọi `center.draw` 4 lần (side 0–3); skin chỉ vẽ ở `side === 0`.
- Hoạt ảnh (`ambient.animate.world`): cánh cối xay, đu quay, tàu lượn, máy bay cất cánh, khinh khí cầu. Tắt ở mức `low`.
- Nhà resort cấp 1 (chòi dù): kit không cho mảng rỗng nên dùng mảnh `128` (bãi đất) + vật vẽ bằng bút trong `over`.
- Không có asset riêng; dùng pack `kenney-iso-buildings` ở `public/assets/shared/`.

## Khác bản gốc

- Bỏ: thác nước, thuyền chạy sông / hồ, ca nô, tàu kéo, tên lửa phóng, pháo hoa, cờ bay, xu nảy, mòng biển, tàu bập bênh (cảnh nướng tĩnh).
- Xác định mới: sông và núi dựng lại bằng toạ độ riêng, không chép đúng từng vị trí.

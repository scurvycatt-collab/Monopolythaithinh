# Map 1 — Thái Thịnh (3D, three.js)

Map mặc định. Bàn isometric 32 ô, giữa bàn là "thế giới" (núi, sông, hồ, công viên),
quân là thú khối, nhà mọc theo cấp với màu chủ đất.

## File

- `renderer.js` — `export default createRenderer(ctx)` theo `docs/contracts/map-renderer.md`:
  cảnh, texture ô (canvas), nhà, quân, xúc xắc, zoom/kéo/chụm, pháo giấy, mũi tên lượt, vòng vẽ.
- `preview.svg` — ảnh nhỏ ở màn tạo phòng / phòng chờ.
- Model dựng bằng code nằm ở `public/js/houses.js`, `specials.js`, `world.js`. **Không chuyển chỗ**:
  `scripts/generate-property-thumbnails.mjs` băm theo các đường dẫn đó.

## Đồ hoạ

- `high` 60 FPS, bóng 2048; `medium` 40 FPS, bóng 1024; `low` 30 FPS, không bóng, không antialias,
  ẩn vật trang trí ô góc, nhà dạng khối đơn giản (≈ 175 draw call trên bàn trống).
- Shadow map chỉ dựng lại khi thêm / xoá model (`requestShadowUpdate`), không theo khung hình.
- `stop()` dừng hẳn vòng vẽ; app gọi khi tab ẩn hoặc về màn chọn phòng.

## Asset

- Kenney CC0: Cube Pets (quân), City Kit Suburban / Commercial (nhà), Pattern Pack (nền ô).
- Texture xúc xắc, nền, mặt nước sinh sẵn ở `public/thumbnails/static/` (`npm run thumbnails`).

## Còn thiếu

- `effect('festival')` hiện chỉ bắn pháo giấy như `'confetti'`.
- Chưa có `map.json`; kích thước bàn, màu, vị trí trang trí vẫn viết trong `renderer.js`.

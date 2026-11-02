# Lumina-01 (2D, khung xương board2d)

Đô thị neon nửa đêm: 4 zone Back Alley, Nightlife, Cyber Financial, Megacorp HQ; lõi Reactor Core giữa bàn. Brief: `BRIEF.md`, concept: `docs/maps/neon-concept.md`.

- `renderer.js` gọi `createBoard2D` (không sửa tay); `skin.js` toàn bộ hình (vẽ bằng `Pen`, không sprite ngoài); `preview.svg` ảnh lobby.
- `assets/pets/`: avatar PNG 512 (`build-pets.mjs`), quân cờ SVG bọc PNG 440 dựng bằng Blender (`blender/README.md`). Tất cả tự dựng bằng code, không asset ngoài, không asset Business Tour.

## Nghiệm thu (T24, headless `?low`, 1600×1000)

Đạt (kiểm bằng code / headless):
- Dữ liệu theo index: skin không chứa giá/thuê/nhóm; `tileNames` đủ 32; ô chưa mua (city/resort) không hiện giá mua.
- 4 nhân vật đủ avatar + quân + màu riêng; quân dùng tỉ lệ chung, tâm đế ở điểm chân 0.94H (khung SVG dời 18,7, T24).
- Nhà: 4 màu × 5 cấp = 20 hình khác nhau (băm vùng ô); resort: chưa mua + 4 cấp khác nhau, tên cấp ở `labels.resortLevels`.
- Start, Firewall (Lost Island), Neon Arcade (Championship), Warp Gate (World Tour), 3 Data Cube, Thuế dữ liệu đều có landmark.
- Mất điện (số vòng + sét) và lễ hội (băng rôn ×2) hiện rõ ở `low`; không lỗi console, không 404 asset.
- Hiệu năng `low` qua `stats()`: bàn trống 2,3 ms/khung, bàn đầy 3,3 ms/khung (≤ 4 ms); asset map 1,0 MB (≤ 1,5 MB).
- Giữa bàn: chồng Data Cube dời khỏi cột ăng-ten (T24), không còn đè nhau.

Không đạt / lệch checklist:
- Bàn chuẩn của `rules.js` có 20 thành phố + 4 resort + 8 ô đặc biệt, không phải 22 + 4 + 6 như checklist (luật chung, ngoài phạm vi map).
- Quân cờ: chỉ có trạng thái thường; chưa có vui / mất lượt / phá sản (khung xương chưa yêu cầu).
- Thumbnail tĩnh nhà/resort cho popup chưa sinh riêng cho neon (`npm run thumbnails` không đòi).

Không kiểm được (cần người hoặc máy thật):
- Duyệt brief/moodboard/ảnh thực tế của chủ sản phẩm; avatar trong lobby/chat/kết quả.
- Mobile, 60/120/144 Hz, mức trung bình/cao trên GPU thật; bộ nhớ sau nhiều lần vào/rời phòng.
- Luồng mạng: host/khách/spectator/bot, reconnect, popup thẻ, World Tour/Championship, deploy production.

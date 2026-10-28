# Render three.js: map-1

Phạm vi: mọi thứ vẽ 3D của map-1: mức đồ hoạ, FPS, shadow, model bundle, houses/specials/world, cờ, bảng, băng rôn, viền quân, thumbnail sinh sẵn.
Code chính: `public/js/app.js` (phần render), `public/js/houses.js`, `public/js/specials.js`, `public/js/world.js`

## Ô đất và bàn
- Ô đất tô theo nhóm: màu pastel `GROUPS[g].ground` + hoa văn `GROUPS[g].pattern`.
  - Ảnh `public/patterns/pattern_NN.png` từ Kenney Pattern Pack CC0, pha hai sắc của màu nền, phủ độ đậm `GROUND_PATTERN_ALPHA = 0.45`.
  - Nhóm liền kề xen kẽ tông nóng/lạnh, dải giá trắng, không còn vạch màu nhóm.
- Ô chưa có chủ không hiện giá.
- Thế giới giữa bàn hạ `WORLD_DROP = 0.24` cho hàng ô nổi lên.
- Mất điện: `outageRounds(i)` (xem `rules.md`) hiện dạng gọn `N ⚡` trên dải giá trắng luôn nhìn thấy (không ở phần sân có thể bị nhà che).
  - Chữ ký `tileSigs` chứa số vòng này nên texture vẽ lại sau mỗi vòng, không chỉ khi bật/tắt.
- `public/js/houses.js` xem cả dải xanh và cam trong texture nguồn là màu nhận diện chủ sở hữu; mái cam cũ tô lại theo màu người chơi (Gấu trúc là vàng), không giữ màu cố định.

## Quân cờ, cờ, mũi tên, viền
- Quân dùng chung chiều cao `TOKEN_HEIGHT = 1.08` (lớn hơn cũ ~20%).
- Cờ màu chủ sở hữu: phần vải phóng `2.9x` (gấp đôi `1.45x` trước), cột và chóp giữ nguyên.
- Mũi tên trên đầu quân tới lượt: không có màu cố định; `placeOverlays()` lấy màu từ `seatOf[p.id].color`, cập nhật `color`/`emissive` khi người tới lượt đổi.
- Viền quân điều khiển: bản sao BackSide lớn hơn 1,075 lần, sáng theo màu người chơi. Chơi mạng chỉ viền quân `me`; một máy viền quân đang tới lượt.

## Lễ hội, Championships, pháo giấy
- Ba ô thưởng lễ hội `state.bonus` dùng `festivalFlag()`: băng rôn cam đậm căng giữa hai cọc ở giữa cạnh sau ô đất (không dùng cờ một cọc bán trong suốt). Băng rôn quay theo từng cạnh bàn, ghi hệ số `CFG.BONUS_MULT`.
- Championships dùng huy hiệu cúp vàng `festivalPlaque` (specials.js) phủ rõ trên phần chữ của ô.
  - Bảng vàng `1.56 × 0.44`, căn giữa, trải gần hết bề ngang ô ngay dưới dải tên/giá, một cúp lớn ở giữa.
  - Hai cạnh xa cao `0.28`, đáy nâng lên trên mặt giữa bàn để không bị che thành thanh vàng.
  - Material không chịu ánh sáng để rõ như nhau ở bốn cạnh.
- Tổ chức lễ hội: pháo giấy + băng rôn mọc lên.
- Pháo giấy dùng pool và geometry dùng chung; cờ/Championship tự dispose tài nguyên riêng khi thay.

## Engine đồ hoạ và mức chất lượng
- three.js 0.160 đóng kèm ở `public/vendor/three`.
- Mức `high` / `medium` / `low` giữ cố định lần lượt 60 / 40 / 30 FPS trước, trong và sau lượt (không khựng khi chuyển sang roll).
- Mức Thấp: dừng chuyển động trang trí, giảm pháo giấy, tắt bóng, pixel ratio 1, nhưng vòng render vẫn 30 FPS.
- Vòng render dùng timer để không polling vượt FPS đã chọn; tab ẩn dừng hoàn toàn.
- Shadow map chung 2048 / 1024 / tắt.
  - Không dựng lại từng frame khi xúc xắc, nhân vật hoặc nhà đang chuyển động.
  - Chỉ cập nhật một lần khi chuyển động kết thúc hay khi model thực sự được thêm/xoá/đổi.
  - Đổi texture như tiền thuê hoặc mất điện không cập nhật bóng.
- Lần mở đầu tự chọn mức theo RAM logic, số lõi và thiết bị cảm ứng; lựa chọn người dùng luôn ưu tiên. `?low` vẫn ép mức thấp.
- Chọn mức ở bảng bánh răng, lưu `tt-monopoly-graphics-v1`, áp dụng ngay qua pixel ratio, shadow map, FPS cố định, chuyển động trang trí, mật độ hiệu ứng.
  - Đổi sang/khỏi mức thấp thay WebGL renderer để antialias bật/tắt ngay, canvas tương tác được gắn lại, context cũ được giải phóng.
- Avatar dùng PNG sinh sẵn; overlay DOM chỉ đồng bộ 10 FPS.
- Đường render mức thấp giữ mặt bàn, nhãn ô, luật, quân cờ, trạng thái sở hữu; ẩn model trang trí ô đặc biệt/thế giới giữa bàn; dùng marker nhà low-poly.
- Đo bằng Chrome headless/SwiftShader trên bàn trống:
  - Thấp: 1376 → 128 draw calls; 86.414 → 3.693 tam giác; cảnh nhàn hạ 8 frame trong 2 giây (đúng 4 FPS).
  - Cao: đầy đủ chi tiết, 1228 draw calls / 86.714 tam giác.

## Model bundle
- Mô hình Kenney gói trong `public/models/bundle.json` (base64) + `Textures/colormap.png`.
- `models/bundle.json` thô ~3,09 MB; Cloudflare phục vụ Brotli ~555 KB.
- Client chỉ fetch/parse JSON một lần, dùng chung cho pet và building kit; vòng decode Base64 không dùng callback cấp phát trên từng byte.
- Chưa thêm Draco/KTX2: payload truyền đã nhỏ, texture nguồn rất nhỏ, decoder tăng code/CPU khởi động. Đánh giá lại khi thêm map hoặc model lớn.

## Thumbnail và asset ảnh sinh sẵn
- 45 thumbnail công trình ở `public/thumbnails/property/`.
- 78 asset ở `public/thumbnails/static/`: avatar, sáu mặt xúc xắc, nền thế giới, nước/khinh khí cầu, hoa văn nhóm đất, texture model theo mọi màu người chơi và màu nhà trang trí, biển hiệu/mái hiên, Chance, banner/huy hiệu lễ hội.
- Trình duyệt không còn dùng WebGL/Canvas để chụp avatar, thumbnail hay quét pixel đổi màu model lúc vào game.
- Model 3D gốc trong bundle vẫn là nguồn chuẩn và vẫn dựng vật thể thật trên bàn.
- Đổi model/màu/cấp/nền/texture → `npm run thumbnails` (pipeline: `build-deploy.md`).
- Ảnh đại diện phong cách bản đồ 3D: `public/assets/avatar-map-style-v2.png`, dùng cho favicon, Apple touch icon, ảnh chia sẻ Open Graph.

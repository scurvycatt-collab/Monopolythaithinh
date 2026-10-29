# Quy trình bắt buộc khi xây map mới

Đây là cổng nghiệm thu, không phải danh sách gợi ý. Một map chỉ được commit/deploy
khi mọi mục áp dụng đã hoàn tất và có bằng chứng kiểm tra. Mỗi map là một skin
độc lập; chỉ engine, kinh tế theo vị trí ô và luồng gameplay được dùng chung.

## 1. Thiết kế phải được duyệt trước khi dựng asset

- [ ] Có brief riêng: chủ đề, câu chuyện, bảng màu, vật liệu, ánh sáng và mật độ chi tiết.
- [ ] Chứng minh phong cách không trùng map đang có; không dùng asset visual của map khác.
- [ ] Có moodboard/reference và ghi rõ nguồn/provenance.
- [ ] Có ảnh review toàn bàn ở đúng góc camera game, không dùng sơ đồ thay thế.
- [ ] Có contact sheet 4 nhân vật và toàn bộ cấp công trình của từng người chơi.
- [ ] Chủ sản phẩm đã duyệt review trước khi tách/dựng từng asset chi tiết.
- [ ] Chốt ngân sách ảnh, kích thước, draw call và mục tiêu tải/render.

## 2. Dữ liệu 32 ô và ranh giới luật/skin

- [ ] Đủ 32 vị trí; loại ô, nhóm monopoly, giá mua, giá xây, tiền thuê và luật lấy
  từ nguồn chung theo **index**, không chép lại vào skin.
- [ ] Tên địa danh nằm ở `MAPS[].tileNames[index]`; thiếu tên thì fallback về tên
  mặc định. Đổi tên không được đổi giá, nhóm hoặc loại ô.
- [ ] Đủ 22 thành phố, 4 resort và 6 ô đặc biệt theo cấu trúc bàn chuẩn.
- [ ] Tám nhóm màu đủ tương phản; thanh màu phủ đủ vùng tên và không che quân.
- [ ] Tên 32 ô, 4 góc và Chance/Tax/Championship/World Tour đúng chủ đề.
- [ ] Không hiển thị giá mua trên mặt bàn; giá chỉ hiện trong UI chung.
- [ ] World Tour, Championship, Start, Lost Island, Tax, Chance giữ hành vi chung.

## 3. Ma trận asset bắt buộc

### Nhân vật

- [ ] 4 nhân vật khác nhau, mỗi nhân vật có avatar, quân trên bàn và màu riêng.
- [ ] Kích thước, điểm neo chân, vùng chạm và viền sáng lượt hiện tại đồng nhất.
- [ ] Tỷ lệ quân lấy từ `render-common/visual-scale.js` (nguồn chuẩn Map 1), skin
  không được khai báo lại kích thước quân riêng.
- [ ] Có trạng thái thường, đang đi, vui, mất lượt/phá sản nếu renderer yêu cầu.
- [ ] Avatar đúng trong lobby, thẻ người chơi, chat, tương tác và bảng kết quả.

### Thành phố và cấp nhà

- [ ] Với **mỗi 4 màu/người chơi** có đủ 5 trạng thái: đất, Nhà 1, Nhà 2, Nhà 3,
  khách sạn. Tổng tối thiểu 20 biến thể đã kiểm trực quan.
- [ ] Mỗi cấp tăng hình khối rõ ràng, không chỉ đổi số hoặc phóng to cùng một asset.
- [ ] Tỷ lệ footprint/chiều cao của 5 cấp dùng `PROPERTY_LEVEL_SCALE` và
  `PROPERTY_TILE_RATIO`; hình dáng được đổi nhưng không vượt envelope chuẩn của ô.
- [ ] Mái, cờ, biển sở hữu, mũi tên và điểm nhấn theo đúng màu chủ đất.
- [ ] Có trạng thái mất điện (số vòng trước dấu sét), lễ hội, Championship và chọn ô.
- [ ] Xây, bán, mua lại, đổi chủ, phá sản và reset trả visual về đúng cấp/trạng thái.

### Resort và ô đặc biệt

- [ ] Resort có trạng thái chưa mua và đủ 4 cấp riêng; không tái dùng nguyên nhà thường.
- [ ] Start, Lost Island, Championship, World Tour, 3 Chance và Tax có landmark riêng.
- [ ] Lễ hội dùng hai cọc + băng rôn; lá cờ đủ lớn nhưng không tăng thanh giữ.
- [ ] Championship/World Tour hiển thị thẻ trước, chỉ di chuyển sau nút xác nhận.
- [ ] Asset điện, lễ hội, thẻ đang giữ và badge vẫn đọc rõ ở đồ họa thấp.

### Môi trường và UI

- [ ] Nền trang chủ, preview chọn map, preview lobby và preview nhẹ đều có asset riêng.
- [ ] Board base/cạnh bàn, 4 khu trung tâm, landmark trung tâm và môi trường đủ chi tiết.
- [ ] Xúc xắc dùng module/kiểu roll chuẩn chung; skin không tự tạo animation khác nhịp.
- [ ] Có thumbnail tĩnh tạo sẵn cho mọi nhà/resort/cấp/màu; không sinh WebGL khi mở popup.
- [ ] Có asset/fallback đã kiểm cho popup mua, nâng, bán, thẻ và kết quả ván.
- [ ] File có tên ổn định, manifest, nguồn và script tái tạo nếu là generated asset.

## 4. Tích hợp renderer và trạng thái động

- [ ] Skin chỉ triển khai renderer contract, không chứa logic tiền, di chuyển hoặc phát thẻ.
- [ ] `create/reset/sync/destroy` chạy lặp mà không rò listener, timer, texture hay canvas.
- [ ] Reconnect dựng đúng vị trí quân, chủ đất, cấp nhà, mất điện, lễ hội và lượt.
- [ ] Di chuyển thường, xúc xắc đôi, auto-roll, World Tour và thẻ dùng chung pipeline.
- [ ] Nhận thẻ -> popup -> OK -> hiệu ứng/di chuyển -> xử lý ô đúng thứ tự chuẩn.
- [ ] Popup mua/nâng/bán không giật và ảnh hiện ngay lần mở đầu tiên.
- [ ] Spectator, bot, host, khách, người mất kết nối và phá sản đều render đúng.
- [ ] Thắng rồi không hiện tiếp cảnh báo gần monopoly; reset trả toàn bộ visual về đầu.

## 5. Âm thanh, chuyển động và khả năng đọc

- [ ] Nhạc/âm thanh dùng volume chung, không tự phát ngoài cài đặt người dùng.
- [ ] Chuyển động theo delta-time, cùng tốc độ trên màn 60/120/144 Hz.
- [ ] Môi trường không khựng trước/sau roll; chỉ cập nhật phần thực sự thay đổi.
- [ ] Text tương phản ở cả bốn cạnh; tên dài không tràn, đè hoặc bị cắt.
- [ ] Desktop/mobile không tạo scroll ngang/dọc thừa hay che nút roll/popup.
- [ ] Đồ họa thấp/trung bình/cao thật sự đổi chi phí nhưng không đổi luật.

## 6. Hiệu năng và vòng đời tài nguyên

- [ ] Trang chủ chỉ tải preview nhẹ, không dựng/tải toàn bộ map.
- [ ] Ảnh được resize/nén đúng kích thước; asset động/tĩnh không tải lặp.
- [ ] Cache có version; thumbnail tạo ở build time, không tạo mỗi lần vào game.
- [ ] Đo thời gian mở map, frame time idle/roll/đi, bộ nhớ ở ba mức đồ họa.
- [ ] Rời phòng phải dừng RAF/timer/audio và giải phóng ảnh/canvas không dùng.
- [ ] Không tăng listener, canvas, texture hoặc request sau nhiều lần vào/rời phòng.

## 7. Ma trận QA bắt buộc

- [ ] Chạy contract/parity cho toàn bộ map, không chỉ map vừa sửa.
- [ ] Kiểm 32 tên theo 32 index và xác nhận giá/rent không đổi theo skin.
- [ ] Kiểm đủ 20 cấp nhà, resort và mọi ô đặc biệt bằng ảnh/contact sheet.
- [ ] Kiểm host/khách/spectator/bot, reconnect, kick, ready, reset và room timeout.
- [ ] Kiểm Chrome desktop, màn nhỏ/mobile, 60/120 Hz và thấp/trung bình/cao.
- [ ] Kiểm Chance, VIP, thoát đảo, Championship, World Tour và thông báo sử dụng.
- [ ] Không có console error, 404, mojibake, popup trễ ảnh, quân giật hoặc sai màu.
- [ ] Lưu ảnh review thực tế của trang chủ, lobby, toàn bàn và trạng thái tiêu biểu.

## 8. Điều kiện commit/deploy

- [ ] Code, asset, manifest, generator, test và tài liệu cập nhật cùng nhau.
- [ ] `npm test` đạt; working tree chỉ chứa thay đổi đúng phạm vi.
- [ ] Chủ sản phẩm duyệt ảnh thực tế sau tích hợp, không chỉ duyệt concept.
- [ ] Commit/push GitHub trước, deploy đúng commit sau; kiểm HTTP và version production.
- [ ] Không deploy map còn placeholder, thiếu asset, dùng visual map khác hoặc còn mục
  checklist chưa đạt mà không có ngoại lệ được duyệt rõ ràng.

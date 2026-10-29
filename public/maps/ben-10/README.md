# Ben 10 · Omnitrix

Map 2D tối ưu dùng khung xương chung `board2d`. Toàn bộ mặt bàn là một căn cứ Plumber liên tục; Bellwood, lò Pyronite, phòng thí nghiệm Petropia và cổng Null Void là các cơ sở cục bộ, không còn chia mặt bàn thành bốn mảng kiểu Bốn Mùa.

## Bộ nhân vật

- Ben Tennyson — xanh lá `#70c83d`.
- Gwen Tennyson — xanh lam `#4c8ee8`.
- Kevin Levin — xám tím `#6f668c`.
- Ông Max — đỏ cam `#df5a3f`.

Ảnh nhân vật là asset PNG nền trong suốt do OpenAI ImageGen tạo riêng cho dự án theo yêu cầu của chủ dự án, sau đó được chuẩn hoá về canvas 512×512. Không sử dụng file ảnh hoặc model trích xuất từ game/phim Ben 10.

## Asset và hiệu năng

- Bốn landmark trung tâm Bellwood, Pyron, Petropia và Null Void trong
  `assets/landmarks/` được OpenAI ImageGen tạo riêng theo prompt cel-shaded,
  isometric, nền trong suốt; sau đó được resize/nén 512×512 bằng Sharp. Đây là
  asset riêng của Map 3 và không được Map 4 tham chiếu.
- Ben, Gwen, Kevin và Ông Max có bốn silhouette công trình riêng, mỗi bộ gồm cọc sở hữu và bốn cấp xây dựng. Công trình trên bàn được Pen dựng trong `skin.js` và cache theo chủ + cấp + màu.
- 20 thumbnail popup 512×512 có alpha nằm trong `assets/buildings/`; `npm run ben10:buildings` tạo trước và kiểm tra manifest, không dựng thumbnail lúc chơi.
- Bốn ảnh nhân vật nằm trong `assets/characters/`, mỗi file 512×512 và tổng dung lượng dưới 1,5 MB.
- Map không tải Kenney pack hay model 3D; mức đồ hoạ thấp bỏ hiệu ứng ambient theo khung xương chung.
- Luật, giá, thông báo Chance/World Tour/Championships, mất điện, lễ hội và kích thước quân cờ dùng chung với Map 1 theo `docs/contracts/map-parity.md`.
- Tên địa danh của skin được ánh xạ theo index bằng `MAPS[].tileNames`; giá và
  tiền thuê vẫn chỉ lấy từ `TILES[index]`.

# Ben 10 · Omnitrix

Map 2D tối ưu dùng khung xương chung `board2d`. Bốn cạnh đại diện Bellwood, Pyronite, Petropia và Null Void; trung tâm là Omnitrix cùng bốn vùng cảnh quan ngoài hành tinh.

## Bộ nhân vật

- Ben Tennyson — xanh lá `#70c83d`.
- Gwen Tennyson — xanh lam `#4c8ee8`.
- Kevin Levin — xám tím `#6f668c`.
- Ông Max — đỏ cam `#df5a3f`.

Ảnh nhân vật là asset PNG nền trong suốt do OpenAI ImageGen tạo riêng cho dự án theo yêu cầu của chủ dự án, sau đó được chuẩn hoá về canvas 512×512. Không sử dụng file ảnh hoặc model trích xuất từ game/phim Ben 10.

## Asset và hiệu năng

- Công trình, cổng, tàu, đấu trường, địa hình và Omnitrix được tự dựng bằng Pen trong `skin.js`; sprite được cache, không dựng thumbnail lúc chạy.
- Bốn ảnh nhân vật nằm trong `assets/characters/`, mỗi file 512×512 và tổng dung lượng dưới 1,5 MB.
- Map không tải Kenney pack hay model 3D; mức đồ hoạ thấp bỏ hiệu ứng ambient theo khung xương chung.
- Luật, giá, thông báo Chance/World Tour/Championships, mất điện, lễ hội và kích thước quân cờ dùng chung với Map 1 theo `docs/contracts/map-parity.md`.

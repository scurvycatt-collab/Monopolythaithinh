# Map 4: Ben10-02

Skin không gian lấy Omnitrix làm trung tâm, với bốn khu hành tinh Pyron, Galvan, Ledgerdomain và Terradino. Đây chỉ là lớp trình bày trên renderer chung `board2d`; map không tự định nghĩa hoặc thay đổi luật, state, di chuyển, giá hay thứ tự thông báo.

## Asset

- Tám landmark không gian chi tiết trong `assets/landmarks/` được OpenAI ImageGen
  tạo riêng theo prompt isometric, nền trong suốt (núi lửa, crystal city,
  metropolis, dome colony, Ledgerdomain, neon city, forge và jungle), rồi
  resize/nén 512×512 bằng Sharp. Map 4 không tham chiếu landmark của Map 3.
- Bộ portrait riêng gồm Ben, Gwen, Kevin và Rook trong `assets/characters/`; Map 4 không tham chiếu asset nhân vật của Map 3.
- Mỗi nhân vật có 5 thumbnail công trình tĩnh riêng trong `assets/buildings/` (20 PNG 512×512 có alpha). Chạy `npm run ben10:buildings` để tái tạo cả hai bộ skin.
- Công trình trên bàn do Pen dựng và cache theo `pet + level + color`; popup luôn dùng thumbnail đã sinh sẵn, không chụp Canvas lúc chơi.
- Map dùng hoàn toàn hình tự dựng trong dự án, không tải model hay asset ngoài khi vào phòng.
- Tên hành tinh/địa danh là lớp hiển thị `MAPS[].tileNames[index]`; mọi giá, rent,
  nhóm màu và luật vẫn dùng duy nhất `TILES[index]`.

## Parity

Chance, World Tour, Championships, mất điện, lễ hội, giá, kích thước quân và các Promise animation dùng nguyên khung chung. Mọi thay đổi phải qua `docs/contracts/map-parity.md` và `npm run verify`.

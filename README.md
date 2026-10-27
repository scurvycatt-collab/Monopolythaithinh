# Thái Thịnh Monopoly

Cờ tỷ phú 3D kiểu Business Tour cho gia đình (2–4 người). Chơi trên trình duyệt qua mạng nhà (Tailscale/LAN) hoặc trên cloud. Server giữ ván nên rớt mạng không mất ván.

## Cách nhanh nhất: file ThaiThinhMonopoly.exe (Windows)

1. Chép `ThaiThinhMonopoly.exe` vào một thư mục cố định (ví dụ `D:\Games\ThaiThinhMonopoly`). Ván được lưu vào thư mục `data` cạnh file này.
2. Bấm đúp để chạy. Trình duyệt tự mở; cửa sổ đen hiện link mời. Đóng cửa sổ đen là tắt game (ván vẫn được lưu).
3. Lần đầu:
   - Windows có thể báo "Windows protected your PC" vì file chưa ký số → **More info** → **Run anyway**.
   - Tường lửa hỏi quyền mạng → chọn **Allow** (mạng riêng / Private) để máy khác vào được.
4. Trong phòng chờ có **link và mã QR "Mời cả nhà"** (ưu tiên link Tailscale). Điện thoại quét mã là vào.
5. Bấm đúp lần nữa khi game đang chạy thì chỉ mở thêm trình duyệt, không chạy hai server.

Không cần cài Node.js hay gì khác. Máy chủ nên tắt chế độ ngủ trong lúc chơi.

## Chạy từ mã nguồn

1. Cài **Node.js 18 trở lên** (https://nodejs.org, bản LTS). Không cần cài thêm thư viện.
2. Chạy server:
   - Windows: bấm đúp `start-windows.bat`
   - macOS: bấm đúp `start-mac.command` (lần đầu: chuột phải → Open)
   - Dòng lệnh: `npm start` hoặc `node server.js`
3. Cửa sổ in ra các link. Gửi link **Tailscale** (dạng `http://100.x.x.x:3000`) cho cả nhà; ai cũng phải bật Tailscale cùng một tài khoản tailnet. Cùng wifi thì dùng link **Mạng LAN**.
4. Mỗi người mở link → nhập tên, chọn nhân vật → **Vào phòng**. Đủ người thì bấm **Bắt đầu**.

Đổi cổng: `PORT=8080 node server.js` (Windows: `set PORT=8080 && node server.js`). Đổi nơi lưu ván: biến `DATA_DIR`.

## Chống rớt mạng

- Ván lưu vào `data/game.json` sau mỗi nước đi. Tắt server rồi bật lại vẫn chơi tiếp.
- Rớt mạng: trang tự nối lại. Tải lại trang vẫn về đúng ghế (trình duyệt nhớ mã của bạn).
- Đổi sang máy khác giữa ván: mở link → chọn **Tôi là …** ở ghế đang mất kết nối.
- Người tới lượt mất kết nối: sau 15 giây người khác bấm được **Đi hộ lượt này**; sau 60 giây server tự đi hộ (chỉ đổ xúc xắc, trả tiền, bán đất khi nợ; không mua, không xây).

## Chơi không cần server

Mở `public/index.html` qua một web server tĩnh bất kỳ (ví dụ GitHub Pages) thì game tự chuyển sang **chơi chung một máy**, ván lưu trong trình duyệt.

## Chơi trên Cloudflare

Mở bản cloud, nhập username rồi **Tạo phòng mới** hoặc nhập mã để **Vào phòng**. Mỗi room code là một ván tách biệt; link mời và mã QR đã mang sẵn room code. Trang chờ ban đầu không mở SSE hay đánh thức Durable Object cho tới khi người chơi xác nhận vào room.

## Bộ luật chính (bắt buộc đọc trước khi sửa)

Toàn bộ luật nằm ở **một file duy nhất: `public/rules.js`**, gồm ba lớp:

1. **Thông số** — mọi con số (giá, hệ số, phí, thời gian, thẻ Chance, bố cục bàn).
2. **Sơ đồ trạng thái** — mỗi bước của lượt cho phép hành động nào, đi tới đâu. Engine từ chối hành động không có trong sơ đồ.
3. **Bảng quyết định** — mỗi dòng một tình huống và kết quả mong đợi; `test/rules.test.js` chạy từng dòng trên engine thật.

`docs/RULES.md` được sinh tự động từ `rules.js` (`npm run rules:doc`), không sửa tay.

Quy trình đổi luật: sửa `rules.js` (thông số + dòng bảng quyết định liên quan) → `npm run rules:doc` → `npm run verify` → sửa engine nếu có dòng báo lệch → commit.

`npm run verify` = tài liệu khớp luật + bảng quyết định + giả lập 300 ván + thử server thật. Chặn ở ba chỗ:
- **commit**: chạy `npm run setup` một lần để bật hook `.githooks/pre-commit`;
- **GitHub**: `.github/workflows/verify.yml` chạy mỗi lần push / pull request;
- **đóng gói**: `npm run build:exe` chạy verify trước.

## Cấu trúc

```
cloudflare/worker.js  bản server cho Cloudflare (Durable Object GameRoom), cùng API với server.js
wrangler.toml      cấu hình Cloudflare Workers
server.js          server Node: file tĩnh, SSE /events, API /api/*, lưu ván, đi hộ, hết giờ
public/
  index.html       khung trang
  style.css        giao diện
  rules.js         BỘ LUẬT CHÍNH: thông số, sơ đồ trạng thái, bảng quyết định
  game.js          engine thực thi luật (dùng chung server + trình duyệt), đọc từ rules.js
  js/app.js        bàn cờ 3D, hoạt ảnh, phòng chờ, kết nối mạng
  js/houses.js     nhà 5 cấp
  js/specials.js   ô đặc biệt: Start, Lost Island, Championships, World Tour, Chance, bãi biển, cờ, băng rôn
  js/world.js      thế giới giữa bàn
  models/          mô hình Kenney (bundle.json) + bảng màu
  patterns/        hoa văn lát nền ô đất (Kenney Pattern Pack, CC0)
  vendor/three/    three.js 0.160 (MIT), chạy được khi không có internet
test/rules.test.js chạy từng dòng bảng quyết định
test/sim.js        giả lập hàng trăm ván ngẫu nhiên để bắt lỗi luật
test/e2e.js        thử server thật qua HTTP
scripts/build-exe.mjs  đóng gói thành một file chạy (Bun), nhúng toàn bộ public/
assets/icon.ico    biểu tượng file chạy
scripts/rules-doc.mjs  sinh docs/RULES.md từ rules.js
docs/RULES.md      luật chơi (tự sinh)
docs/CLOUDFLARE.md hướng dẫn deploy Cloudflare
docs/HANDOFF.md    ghi chú kỹ thuật cho lần phát triển sau
```

Kiểm thử: `npm run verify`.

## Đóng gói file chạy

`npm run build:exe` → `dist/ThaiThinhMonopoly.exe` (cần mạng để tải Bun qua npx lần đầu). Thêm `mac` hoặc `linux` để dịch thêm bản cho hệ đó: `node scripts/build-exe.mjs mac`. Biểu tượng `assets/icon.ico` chỉ gắn được khi dịch trên máy Windows.

Thử bản đóng gói: `TTM_BIN=dist/ThaiThinhMonopoly-linux node test/e2e.js`.

## Bản quyền

Mô hình 3D và hoa văn ô đất (Pattern Pack): Kenney.nl (CC0). three.js: MIT. qrcode-generator: MIT. Bun (runtime trong file chạy): MIT. Phần còn lại dựng bằng code cho dự án này. Không dùng asset gốc của Business Tour.

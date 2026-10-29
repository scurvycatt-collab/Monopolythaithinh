# Server, phòng và mạng

Phạm vi: server Node, Cloudflare Worker + Durable Object, API, SSE, lưu ván, phòng, host, bot, khán giả, rejoin.
Code chính: `server.js`, `cloudflare/worker.js`, `cloudflare/` (Worker, `wrangler.toml`)

## server.js (Node thuần, không phụ thuộc)
- `GET /events?token=`: SSE, gửi `{ state: publicView, presence, now, proxySec }` mỗi khi đổi.
- `POST /api/join { name, pet }` → `{ id, token }`. `POST /api/claim { id }`: nhận ghế đang offline.
- `POST /api/act { token, type, data }`: hành động ván (`roll`, `buy`, …) và phòng chờ (`start`, `reset`, `leave`, `pet`, `rename`, `settings`, `proxy`).
- Lưu `DATA_DIR/game.json` (mặc định `data/`).
- Đi hộ: tự đi sau `settings.autoSec` (60 s); người khác được bấm đi hộ sau 15 s. Hết giờ: `G.checkTime` mỗi giây.
- File tĩnh nén gzip, giữ trong bộ nhớ. `GET /health` trả `{ app: 'thai-thinh-monopoly' }`; client dùng để nhận ra đang có server.
- `GET /api/info`, chế độ đóng gói `PACKED`: xem `build-deploy.md`.

## Cloudflare (v1.5)
- `cloudflare/worker.js` + `wrangler.toml`: Worker phục vụ `public/` làm static assets và trả `/health` mà không chạm Durable Object.
- Mỗi `?room=` hợp lệ ánh xạ tới một `GameRoom` riêng.
- Durable Object giữ `state` trong storage, SSE bằng TransformStream.
- Alarm hẹn đúng lúc có việc (hết ván, hết giờ bước, tới hạn đi hộ, ping 14 s) và xoá alarm khi phòng chờ không còn kết nối.
- Client chỉ gọi `/api/*` và mở `/events` sau khi xác nhận ở main menu (xem `client-ui.md`).
- Đã thử `wrangler dev`: `TTM_URL=http://127.0.0.1:8787/ node test/e2e.js` qua; alarm tự đi khi hết giờ bước đã thử.
- Production dùng domain thương hiệu và base path ghi trong `docs/CLOUDFLARE.md`.

## Phòng, host, kick
- Quyền room nằm trong `state.hostId`: người đầu tiên là host; host rời lobby thì chuyển cho người thật kế tiếp (bot không bao giờ làm host).
- `start`, `reset`, `kick`, `settings`, `addBot`, `removeBot` phải qua kiểm tra host server-side ở cả `server.js` và `cloudflare/worker.js`; không dựa vào việc ẩn nút trên UI.
- `kick`: mời ra ghế đang mất kết nối, có ở cả server.js và worker.js.
- Màn tạo phòng gửi `mapId` trong `/api/join`. Node server và Durable Object chỉ nhận nếu room chưa có người (`wasEmpty`), nên vào phòng hoặc rejoin không thể ghi đè map của host. (`MAPS`: xem `rules.md`.)

## TTL phòng trống
- Trình duyệt của người chơi gia hạn lease mỗi 30 giây. Nếu không còn lease nào được gia hạn, Node server và Durable Object xoá toàn bộ state phòng sau `EMPTY_ROOM_TTL_MS = 2 phút`; không phụ thuộc hoàn toàn vào việc proxy/SSE có báo đóng stream đúng lúc hay không.
- Mỗi phòng chỉ tồn tại tối đa `MAX_ROOM_AGE_MS = 12 giờ` kể từ lúc tạo. Đây là hạn cứng, heartbeat và reconnect không gia hạn được.
- Alarm thực hiện xoá chủ động; mọi request mới cũng kiểm tra hạn trước để room quá hạn không thể sống lại nếu alarm chạy trễ. Khán giả không gia hạn lease và không giữ phòng sống.

## Bot
- Host có nút **🤖 + Thêm bot** trong phòng chờ khi còn ghế trống, và xoá từng bot trước khi bắt đầu.
- Bot lấy tên/nhân vật còn trống, không có token đăng nhập, đánh dấu `bot: true`/`BOT`, không hiện mất kết nối.
- `G.botAction()` được mua, nâng cấp, mua lại, dùng World Tour/Championship và xử lý nợ; khác `autoAction()` (đi hộ người mất kết nối, không tự tiêu tiền).
- Node dùng timer 650 ms, Durable Object dùng alarm 650 ms để chạy trọn lượt bot rồi phát state mới.
- Không còn người thật online thì bot không giữ phòng sống.

## Khán giả
- Client mở SSE không token với tham số `viewer`. Server chỉ giữ tên trong kết nối hiện tại, phát danh sách `viewers[]`, không tạo ghế, không cấp quyền hành động.
- Rời phòng chỉ đóng phiên xem. (UI `#gwatch`, `#watchbadge`: xem `client-ui.md`.)

## Rejoin
- Vào lại từ máy khác dùng chính `/api/join`: `G.byName` tìm username cũ trong room.
  - Ghế offline: trả lại cùng `id`/`token`.
  - Ghế online: 409.
- Client nhận cờ `rejoined` và lưu phiên room-scoped như bình thường.
- Nút **Rời phòng** trong ván chỉ ngắt phiên local để giữ ghế/tài sản; chi tiết UI ở `client-ui.md`.
- Hành động mạng nhận `publicView(state)` ngay trong HTTP response; SSE là đồng bộ dự phòng.

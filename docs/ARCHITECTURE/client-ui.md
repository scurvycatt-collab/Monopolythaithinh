# Client: giao diện, mạng phía client, âm thanh

Phạm vi: phần UI của `app.js`: MODE, vòng act/playOut/drain, lobby, thẻ người chơi, modal, thông báo, âm thanh, bán đất, màn kết quả.
Code chính: `public/js/app.js`

## MODE và vòng cập nhật
- `MODE = 'net' | 'local'`. Không có server thì client tự chuyển sang chơi chung một máy.
- **Mạng:** `act()` gửi API. Trạng thái tới qua SSE vào hàng đợi `onState` → `drain`:
  - Chỉ đổi online: vẽ lại thẻ.
  - Ván mới, đổi người chơi hoặc phòng chờ: `resetView()` dựng lại, không hoạt ảnh.
  - Còn lại: `playOut()` chạy hoạt ảnh theo `seen` (xúc xắc, nước đi, thẻ, thông báo).
- **Một máy:** `G.act` tại chỗ rồi `playOut()`; lưu `localStorage['tt-monopoly-v11']`.
- Token của mình: `localStorage['tt-monopoly-me']`.
- Chỉ người tới lượt thấy nút và bảng (`myTurn()`); người khác thấy "Đang chờ…" và nút "Đi hộ lượt này" khi người kia offline đủ 15 s.
- Hành động mạng hiện `Đang xử lý…`, tự huỷ sau 12 giây nếu server không phản hồi; nhận `publicView(state)` trong HTTP response (server: xem `server.md`).
- Mỗi lần `connect()` tăng `connectionEpoch`.
  - Handler và hàng đợi SSE bỏ mọi gói từ epoch cũ; không nhận `state.version` thấp hơn bản đang hiển thị.
  - Đóng/mở EventSource khi đổi phiên không thể kéo máy lùi về trạng thái cũ.
- Main menu thu username + room code và che hoàn toàn scene; `prepareBoard()` chỉ tải model/map và khởi động render loop sau khi xác nhận (xem `render-map-1.md`). Sau đó mới gọi `/api/*` và mở `/events`.
- `#gwatch` gọi `enterRoom(false, true)` nhưng vẫn bắt buộc username. `#watchbadge` là thanh giữa cạnh trái, một thẻ tên cho mỗi khán giả, đánh dấu `bạn` trên máy đang xem; tự cập nhật theo SSE. (Phía server: `server.md`.)
- Màn tạo phòng dựng `#gmap` từ `MAPS` (`rules.md`).
- Nút **Rời phòng** gọi `leave` khi còn ở lobby; trong ván chỉ ngắt phiên local để giữ ghế/tài sản cho rejoin.

## Lobby
- Phòng chờ `#lobby`: mạng có `lobbyNet` / `lobbyClaim`; một máy có `lobbyLocal`.
- Link mời + mã QR: xem `build-deploy.md`.
- Nút host: **🤖 + Thêm bot**, xoá bot, `kick` (quyền: `server.md`).

## Thẻ người chơi và thông báo
- Thẻ 4 góc: người tới lượt sáng (`.cur`, thanh thời gian bước `.tbar`), người khác tối (`.dim`), offline mờ ảnh.
- Thẻ hiển thị `🛡️ VIP ×N` và `🛟 Thoát đảo ×N` khi N lớn hơn một; một thẻ chỉ hiện tên, không thêm `×1`.
- `state.notice` (`vipUsed`, `escapeUsed`, `cantPay`, `noTakeover`, `tour`, `festival`) hiện thông báo toàn màn hình cho mọi người (`showStatus`).
- `state.reaction = { kind: 'happyRent', pid }`: thẻ nhân vật chủ nhà sáng/nảy và hiện mặt 😄.
- Khi lượt chuyển sang người mới: banner toàn màn hình `Đến lượt…`.
- Tổng xúc xắc `#dicesum` bật giữa màn hình ~1 s; đồng hồ ván `#bigclock` giữa mép trên.
- Popup thẻ của người khác tự tắt (`#modal.peek`).
- Thẻ thông tin ô: `showInfo`.
- Mất điện trong `.pcard .power` của chủ sở hữu (`N ⚡`; phần ô: `render-map-1.md`).
- Achievements: client phát lần lượt các màn khi ván còn diễn ra; người vào giữa ván đánh dấu mốc cũ đã xem. Nếu `phase === 'over'`, `playOut()` bỏ mọi achievement mới trong lượt cuối (cả cảnh báo sắp Monopoly), chỉ hiện màn kết quả chiến thắng. (Mốc: `rules.md`.)

## Bán đất khi nợ
- `startSell` bán đất khi nợ.
- Nút **Bán tự động** tính trước tổng tiền mặt + giá bán các tài sản đã chọn; nếu vẫn thấp hơn nợ thì bán hết rồi tự gọi `bankrupt`. Bán thủ công không tự phá sản. Nút **Phá sản** chỉ bật khi tổng tiền mặt + giá thanh lý mọi tài sản vẫn thiếu; engine luôn tự thanh lý phần tài sản còn lại trước khi chuyển toàn bộ tiền cho chủ nợ, nên phá sản ngay và bán tự động rồi phá sản trả cùng một số tiền.

## Màn kết quả
- Phòng mạng luôn có nút đỏ **Thoát phòng** cho người chơi và khán giả; gọi `exitRoom()` để đóng SSE, xoá phiên local, về màn username/mã phòng.
- **Chơi ván mới** giữ luồng reset hiện có.

## Hoạt ảnh tiền và chuyển động
- Đếm tiền bị trừ: `MONEY_DEBIT_MS = 700`; tiền nhận dùng `MONEY_MS` (đồng bộ hoạt ảnh xây nhà). Nhãn tiền trừ bay 900 ms.
- Animation không phụ thuộc tần số quét: token nội suy `1 - (1 - 0.25)^(dt*60)`, lực cản pháo giấy `0.985^(dt*60)`.
- `prefers-reduced-motion` chỉ rút thời lượng còn ~55% (xúc xắc 650 ms, tiền 400/900 ms), không ép xuống 1 ms.

## Âm thanh
- Web Audio trong app.js, không tải asset ngoài. Nhạc nền và hiệu ứng lượt/cảnh báo có công tắc/âm lượng riêng, lưu `tt-monopoly-sound-v1`. AudioContext chỉ khởi tạo sau tương tác người dùng.
- Chế độ mạng: chuỗi chuông đến lượt và tick 5 giây cuối chỉ chạy khi tới lượt chính người dùng, không chạy ở lượt đối thủ.
- Gain tăng để nghe rõ trên loa điện thoại: mặc định `turnVolume = 75`, chuông lượt hệ số `0.30`, cảnh báo thời gian `0.23`. Nhạc nền giữ hệ số `0.09`. Người có setting cũ vẫn nhận gain mới.

## Cài đặt đồ hoạ
- Bảng bánh răng có mức `low` / `medium` / `high`, lưu `tt-monopoly-graphics-v1`. Chi tiết tác động: `render-map-1.md`.

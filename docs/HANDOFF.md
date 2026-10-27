# Thái Thịnh Monopoly: ghi chú bàn giao (27/10/2026, v1.5)

Đính kèm zip này khi mở conversation mới, nhắn: "Đọc docs/HANDOFF.md, làm tiếp từ mục *Việc tiếp theo*."

## Trạng thái
- **Phần lõi xong:** server làm trọng tài, client 3D chơi qua mạng, phòng chờ chọn tên và nhân vật, nhận lại ghế, đi hộ, lưu ván, hết giờ.
- **Kiểm thử:** `npm test` gồm `test/sim.js` (giả lập nhiều ván) và `test/e2e.js` (server thật qua HTTP); đã thử hai trình duyệt chơi cùng một ván.
- Không có `server` thì client tự chuyển sang **chơi chung một máy**. Artifact claude.ai chạy chế độ này: https://claude.ai/artifact/9FVdGVAm4jgr122wB1hxaG

## Kiến trúc
- **`public/rules.js` là nguồn sự thật duy nhất của luật** (thông số, sơ đồ trạng thái `STATES`, bảng quyết định `DECISIONS`). `public/game.js` (engine UMD, `window.Game` / `require`) chỉ thực thi và đọc mọi số từ đó; `act()` từ chối hành động không có trong `STATES[step].actions`. `docs/RULES.md` sinh từ rules.js. Mọi thay đổi phải qua `npm run verify` (hook pre-commit, CI GitHub, build:exe).
- Thiếu tiền: khoản phải trả **treo** ở `S.pending = { from, to, amount, why }`, chưa ai mất/nhận tiền; bước `debt` bán đất, đủ thì `settle()` chuyển tiền rồi mới `finish()` (đổ đôi thì đổ tiếp). Phá sản: tiền mặt còn lại về người nhận. Tiền không bao giờ âm.
- Thời gian mỗi bước: `settings.turnSec` (20/30/45/60, mặc định 30) + 6 s cho hoạt ảnh; `S.stepAt` ghi ở mỗi `act`; `G.checkTurn` tự làm `autoAction` một bước (server mỗi giây; chế độ một máy ở client).
- `S.notice.kind`: `cantPay`, `noTakeover`, `tour`, `festival` → popup toàn màn hình.
- `server.js`: Node thuần, không phụ thuộc.
  - `GET /events?token=`: SSE, gửi `{ state: publicView, presence, now, proxySec }` mỗi khi đổi.
  - `POST /api/join { name, pet }` → `{ id, token }`. `POST /api/claim { id }`: nhận ghế đang offline.
  - `POST /api/act { token, type, data }`: hành động ván (`roll`, `buy`, …) và phòng chờ (`start`, `reset`, `leave`, `pet`, `rename`, `settings`, `proxy`).
  - Lưu `DATA_DIR/game.json` (mặc định `data/`). Tự đi hộ sau `settings.autoSec` (60 s); người khác được bấm đi hộ sau 15 s. Hết giờ: `G.checkTime` mỗi giây.
  - File tĩnh nén gzip, giữ trong bộ nhớ. `GET /health` trả `{ app: 'thai-thinh-monopoly' }`; client dùng để nhận ra đang có server.
- `public/js/app.js`:
  - `MODE = 'net' | 'local'`.
  - **Mạng:** `act()` gửi API. Trạng thái tới qua SSE vào hàng đợi `onState` → `drain`: chỉ đổi online thì vẽ lại thẻ; ván mới, đổi người chơi hoặc phòng chờ thì `resetView()` dựng lại không hoạt ảnh; còn lại `playOut()` chạy hoạt ảnh theo `seen` (xúc xắc, nước đi, thẻ, thông báo).
  - **Một máy:** `G.act` tại chỗ rồi `playOut()`; lưu `localStorage['tt-monopoly-v11']`.
  - Token của mình lưu ở `localStorage['tt-monopoly-me']`.
  - Chỉ người tới lượt thấy nút và bảng (`myTurn()`); người khác thấy "Đang chờ…" và nút "Đi hộ lượt này" khi người kia offline đủ 15 s.
- Giao diện:
  - Thẻ người chơi 4 góc, người tới lượt sáng (`.cur`, có thanh thời gian bước `.tbar`), người khác tối (`.dim`), offline mờ ảnh. Mũi tên vàng trên đầu quân đang tới lượt; ô đất tô theo nhóm: màu pastel `GROUPS[g].ground` + hoa văn `GROUPS[g].pattern` (ảnh `public/patterns/pattern_NN.png` từ Kenney Pattern Pack CC0, pha hai sắc của màu nền, phủ với độ đậm `GROUND_PATTERN_ALPHA = 0.45`); nhóm liền kề xen kẽ tông nóng/lạnh, dải giá trắng, không còn vạch màu nhóm; tổng xúc xắc `#dicesum` bật giữa màn hình ~1 s; lễ hội: bảng xanh có cúp + hệ số (`festivalPlaque` trong specials.js) gắn phẳng lên mặt đất nâu dưới dải giá, cạnh gần cao 0,28, cạnh xa 0,19 (phần lộ trên mặt giữa bàn); đồng hồ ván `#bigclock` giữa mép trên; tổng xúc xắc `#dicesum`; ô chưa có chủ không hiện giá; thế giới giữa bàn hạ `WORLD_DROP = 0.24` cho hàng ô nổi lên; tổ chức lễ hội: pháo giấy + băng rôn mọc lên; popup thẻ của người khác tự tắt (`#modal.peek`).
  - Phòng chờ `#lobby`: mạng có `lobbyNet` / `lobbyClaim`; một máy có `lobbyLocal`.
  - Bán đất khi nợ: `startSell`. Thông báo toàn màn hình: `showStatus`. Thẻ thông tin ô: `showInfo`.
- Đồ hoạ: three.js 0.160 đóng kèm ở `public/vendor/three`. Mô hình Kenney gói trong `public/models/bundle.json` (base64) + `Textures/colormap.png`. `?low`: giảm bóng đổ và độ phân giải.

## Bản chạy local (.exe)
- `scripts/build-exe.mjs`: chép `public/` → `build/assets`, sinh `build/entry.js` import từng file kiểu `with { type: 'file' }` rồi gán `globalThis.__TTM_ASSETS`, sau đó `import('../server.js')`; gọi `npx bun@1.3.1 build --compile --target=bun-windows-x64`. Không nhúng thẳng `public/` vì server `require('./public/game.js')` sẽ bị Bun gộp thành đường dẫn file.
- `server.js` khi có `__TTM_ASSETS` (`PACKED`): đọc file tĩnh bằng `Bun.file`, lưu ván ở `data/` cạnh file `.exe`, tự mở trình duyệt (`OPEN=0` để tắt), trùng cổng thì chỉ mở trình duyệt rồi thoát.
- `GET /api/info` trả link Tailscale (MagicDNS nếu `tailscale status` chạy được) và LAN; phòng chờ hiện link đầu tiên kèm mã QR (`public/vendor/qrcode.mjs`).
- File `.exe` khoảng 120 MB vì chứa runtime Bun; chưa ký số nên SmartScreen cảnh báo lần đầu. Chưa thử trực tiếp trên Windows (chỉ thử bản Linux cùng mã bằng `TTM_BIN=… node test/e2e.js` và trình duyệt).

## Bản Cloudflare (v1.5)
- `cloudflare/worker.js` + `wrangler.toml`: Worker phục vụ `public/` làm static assets và trả `/health` mà không chạm Durable Object. Main menu thu username + room code và che hoàn toàn game scene; `prepareBoard()` chỉ tải model/map và khởi động render loop sau khi xác nhận. Sau đó client mới gọi `/api/*` và mở `/events`. Mỗi `?room=` hợp lệ ánh xạ tới một `GameRoom` riêng. Durable Object giữ `state` trong storage, SSE bằng TransformStream, alarm hẹn đúng lúc có việc (hết ván, hết giờ bước, tới hạn đi hộ, ping 14 s) và xóa alarm khi phòng chờ không còn kết nối.
- Quyền room nằm trong `state.hostId`: người đầu tiên là host, host rời lobby thì chuyển cho người kế tiếp. `start`, `reset`, `kick`, `settings` phải qua kiểm tra host server-side ở cả `server.js` và `cloudflare/worker.js`; không dựa vào việc ẩn nút trên UI.
- Danh sách map nằm trong `public/rules.js` (`MAPS`). Room lưu lựa chọn trong `settings.mapId`; `map-1` là map hiện tại và mặc định. Khi thêm map phải bổ sung asset/renderer, entry `MAPS`, kiểm thử và tài liệu cùng nhau.
- Luồng vào lại từ máy khác dùng chính `/api/join`: `G.byName` tìm username cũ trong room; nếu ghế offline thì trả lại cùng `id`/`token`, nếu online thì 409. Client nhận cờ `rejoined` và lưu phiên room-scoped như bình thường.
- Khi lượt chuyển sang người mới, client hiện banner toàn màn hình `Đến lượt…`; quân cờ dùng chung chiều cao `TOKEN_HEIGHT = 1.08`, tương đương lớn hơn kích thước cũ khoảng 20%.
- Màu sở hữu của Gấu trúc (trước đây là cam) là vàng `#f4c430`. `G.ensureHost` và `seatSetup` đồng bộ lại màu theo nhân vật để cả room cloud và bản lưu local cũ nhận màu mới.
- Animation đếm tiền bị trừ dùng `MONEY_DEBIT_MS = 700`; tiền nhận vẫn dùng `MONEY_MS` để đồng bộ với hoạt ảnh xây nhà. Nhãn tiền trừ bay trong 900 ms.
- Đã thử bằng `wrangler dev`: `TTM_URL=http://127.0.0.1:8787/ node test/e2e.js` qua; alarm tự đi khi hết giờ bước đã thử. Production dùng domain thương hiệu và base path ghi trong `docs/CLOUDFLARE.md`.
- Phòng chờ thêm hành động `kick` (mời ra ghế đang mất kết nối) ở cả server.js và worker.js.
- Hướng dẫn: `docs/CLOUDFLARE.md`.

## Ràng buộc bản quyền (giữ nguyên)
Không dùng asset gốc của Business Tour (bundle unity3d, PNG trích xuất, bản AI vẽ lại). Chỉ dùng Kenney CC0 và mô hình dựng bằng code. Ghi credit "Mô hình 3D: Kenney.nl (CC0)".

## Việc tiếp theo (người dùng chọn)
1. **Web app:** đẩy lên repo GitHub riêng tư, nối Railway (hoặc Fly.io/Render) để push là tự deploy. Cần ổ lưu cho `DATA_DIR`, thêm mã phòng hoặc mật khẩu vì link công khai.
2. ~~**App local:** `.exe` một file~~ (xong v1.1). Có thể thêm: ký số file, chạy nền không cửa sổ, tự khởi động cùng Windows.
3. Có thể thêm: âm thanh, nhiều phòng song song, PWA "Thêm vào màn hình chính".

## Ghi chú môi trường thử (sandbox Claude)
- Chromium headless dùng swiftshader (`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`), mở `?low`, viewport nhỏ. Chỉ được khoảng 1–2 khung hình/giây nên chờ lâu.
- Google Fonts bị chặn trong sandbox (chỉ đổi font, không lỗi).

# Thái Thịnh Monopoly: ghi chú bàn giao (27/10/2026, v1.5)

Đính kèm zip này khi mở conversation mới, nhắn: "Đọc docs/HANDOFF.md, làm tiếp từ mục *Việc tiếp theo*."

## Trạng thái
- **Phần lõi xong:** server làm trọng tài, client 3D chơi qua mạng, phòng chờ chọn tên và nhân vật, nhận lại ghế, đi hộ, lưu ván, hết giờ.
- **Kiểm thử:** `npm test` gồm `test/sim.js` (giả lập nhiều ván) và `test/e2e.js` (server thật qua HTTP); đã thử hai trình duyệt chơi cùng một ván.
- Không có `server` thì client tự chuyển sang **chơi chung một máy**. Artifact claude.ai chạy chế độ này: https://claude.ai/artifact/9FVdGVAm4jgr122wB1hxaG

## Kiến trúc
- **`public/rules.js` là nguồn sự thật duy nhất của luật** (thông số, sơ đồ trạng thái `STATES`, bảng quyết định `DECISIONS`). `public/game.js` (engine UMD, `window.Game` / `require`) chỉ thực thi và đọc mọi số từ đó; `act()` từ chối hành động không có trong `STATES[step].actions`. `docs/RULES.md` sinh từ rules.js. Mọi thay đổi phải qua `npm run verify` (hook pre-commit, CI GitHub, build:exe).
- `RULEBOOK` trong `public/rules.js` là nội dung luật tiếng Việt hiện trong nút **Luật chơi** ở bảng Cài đặt; giao diện và engine vì vậy cùng đọc một nguồn.
- Ảnh đại diện mới theo phong cách bản đồ 3D nằm ở `public/assets/avatar-map-style-v2.png`, được dùng cho favicon, Apple touch icon và ảnh chia sẻ Open Graph.
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
  - Thẻ người chơi 4 góc, người tới lượt sáng (`.cur`, có thanh thời gian bước `.tbar`), người khác tối (`.dim`), offline mờ ảnh. Mũi tên trên đầu quân đang tới lượt dùng đúng màu của người chơi; ô đất tô theo nhóm: màu pastel `GROUPS[g].ground` + hoa văn `GROUPS[g].pattern` (ảnh `public/patterns/pattern_NN.png` từ Kenney Pattern Pack CC0, pha hai sắc của màu nền, phủ với độ đậm `GROUND_PATTERN_ALPHA = 0.45`); nhóm liền kề xen kẽ tông nóng/lạnh, dải giá trắng, không còn vạch màu nhóm; tổng xúc xắc `#dicesum` bật giữa màn hình ~1 s; Championships dùng huy hiệu cúp vàng (`festivalPlaque` trong specials.js) phủ rõ trên phần chữ của ô; đồng hồ ván `#bigclock` giữa mép trên; ô chưa có chủ không hiện giá; thế giới giữa bàn hạ `WORLD_DROP = 0.24` cho hàng ô nổi lên; tổ chức lễ hội: pháo giấy + băng rôn mọc lên; popup thẻ của người khác tự tắt (`#modal.peek`).
  - Phòng chờ `#lobby`: mạng có `lobbyNet` / `lobbyClaim`; một máy có `lobbyLocal`.
  - Bán đất khi nợ: `startSell`. Thông báo toàn màn hình: `showStatus`. Thẻ thông tin ô: `showInfo`.
- Đồ hoạ: three.js 0.160 đóng kèm ở `public/vendor/three`. Mô hình Kenney gói trong `public/models/bundle.json` (base64) + `Textures/colormap.png`. Ba mức `high` / `medium` / `low` lần lượt giới hạn 60 / 40 / 30 FPS khi có thao tác; cảnh nhàn hạ tự hạ còn 15 / 12 / 4 FPS và dùng timer để không polling theo tần số màn hình. Shadow map là 2048 / 1024 / tắt, chỉ dựng lại khi cảnh thay đổi thay vì mỗi frame. Mức thấp dừng chuyển động trang trí, giảm pháo giấy và dùng pixel ratio 1; tab ẩn dừng hoàn toàn vòng render. Lần mở đầu tự chọn mức theo RAM logic, số lõi và thiết bị cảm ứng; lựa chọn người dùng luôn được ưu tiên. `?low` vẫn ép mức thấp.
- Đường render mức thấp giữ nguyên mặt bàn, nhãn ô, luật, quân cờ và trạng thái sở hữu nhưng ẩn model trang trí ô đặc biệt/thế giới giữa bàn, đồng thời dùng marker nhà low-poly. Đo bằng Chrome headless/SwiftShader trên bàn trống: mức thấp giảm từ 1376 xuống 128 draw calls và từ 86.414 xuống 3.693 tam giác; cảnh nhàn hạ ghi nhận 8 frame trong 2 giây, đúng 4 FPS. Mức cao giữ đầy đủ chi tiết, đo được 1228 draw calls / 86.714 tam giác.
- `models/bundle.json` thô khoảng 3,09 MB nhưng Cloudflare phục vụ Brotli khoảng 555 KB. Client chỉ fetch/parse JSON bundle một lần rồi dùng chung cho pet và building kit; vòng decode Base64 không còn dùng callback cấp phát trên từng byte. Chưa thêm Draco/KTX2 vì payload truyền hiện đã nhỏ và texture nguồn rất nhỏ; decoder bổ sung sẽ tăng code/CPU khởi động. Cần đánh giá lại khi thêm map hoặc model dung lượng lớn.
- Thumbnail công trình trong popup mua/nâng cấp và thẻ thông tin được tạo lần lượt sau khi giao diện đã gắn nút, đồng thời tạm hoãn khi đang có hoạt ảnh. Hành động mạng hiển thị `Đang xử lý…`, tự huỷ sau 12 giây nếu server không phản hồi và nhận `publicView(state)` ngay trong HTTP response; SSE vẫn giữ vai trò đồng bộ dự phòng. Cách này tránh cảm giác nút Nâng cấp/Để sau không bấm được trên máy yếu hoặc mạng di động chậm.

## Bản chạy local (.exe)
- `scripts/build-exe.mjs`: chép `public/` → `build/assets`, sinh `build/entry.js` import từng file kiểu `with { type: 'file' }` rồi gán `globalThis.__TTM_ASSETS`, sau đó `import('../server.js')`; gọi `npx bun@1.3.1 build --compile --target=bun-windows-x64`. Không nhúng thẳng `public/` vì server `require('./public/game.js')` sẽ bị Bun gộp thành đường dẫn file.
- `server.js` khi có `__TTM_ASSETS` (`PACKED`): đọc file tĩnh bằng `Bun.file`, lưu ván ở `data/` cạnh file `.exe`, tự mở trình duyệt (`OPEN=0` để tắt), trùng cổng thì chỉ mở trình duyệt rồi thoát.
- `GET /api/info` trả link Tailscale (MagicDNS nếu `tailscale status` chạy được) và LAN; phòng chờ hiện link đầu tiên kèm mã QR (`public/vendor/qrcode.mjs`).
- File `.exe` khoảng 120 MB vì chứa runtime Bun; chưa ký số nên SmartScreen cảnh báo lần đầu. Chưa thử trực tiếp trên Windows (chỉ thử bản Linux cùng mã bằng `TTM_BIN=… node test/e2e.js` và trình duyệt).

## Bản Cloudflare (v1.5)
- `cloudflare/worker.js` + `wrangler.toml`: Worker phục vụ `public/` làm static assets và trả `/health` mà không chạm Durable Object. Main menu thu username + room code và che hoàn toàn game scene; `prepareBoard()` chỉ tải model/map và khởi động render loop sau khi xác nhận. Sau đó client mới gọi `/api/*` và mở `/events`. Mỗi `?room=` hợp lệ ánh xạ tới một `GameRoom` riêng. Durable Object giữ `state` trong storage, SSE bằng TransformStream, alarm hẹn đúng lúc có việc (hết ván, hết giờ bước, tới hạn đi hộ, ping 14 s) và xóa alarm khi phòng chờ không còn kết nối.
- Khi toàn bộ người chơi mất kết nối, Node server và Durable Object bắt đầu thời gian đệm `EMPTY_ROOM_TTL_MS = 2 phút`, tạm dừng tự đi/hết bước và xoá toàn bộ state phòng khi hết hạn. Một SSE người chơi kết nối lại sẽ huỷ xoá; khán giả không giữ phòng sống.
- Quyền room nằm trong `state.hostId`: người đầu tiên là host, host rời lobby thì chuyển cho người kế tiếp. `start`, `reset`, `kick`, `settings` phải qua kiểm tra host server-side ở cả `server.js` và `cloudflare/worker.js`; không dựa vào việc ẩn nút trên UI.
- Danh sách map nằm trong `public/rules.js` (`MAPS`). Mỗi entry có `preview` trỏ tới ảnh SVG trong `public/maps/`; ảnh này hiện ở màn tạo phòng và danh sách map trong lobby. Room lưu lựa chọn trong `settings.mapId`; `map-1` là map hiện tại và mặc định. Khi thêm map phải bổ sung asset/renderer, ảnh preview, entry `MAPS`, kiểm thử và tài liệu cùng nhau.
- Màn tạo phòng dựng `#gmap` từ `MAPS` và gửi `mapId` trong `/api/join`. Cả Node server lẫn Durable Object chỉ nhận lựa chọn này nếu room chưa có người (`wasEmpty`), nên nút vào phòng hoặc rejoin không thể ghi đè map của host.
- `#gwatch` gọi `enterRoom(false, true)` nhưng vẫn bắt buộc username. Client mở SSE không token với tham số `viewer`; server chỉ giữ tên này trong kết nối hiện tại, phát danh sách `viewers[]`, không tạo ghế và không cấp quyền hành động. `#watchbadge` hiện danh tính khán giả; Rời phòng chỉ đóng phiên xem.
- Thẻ người chơi hiển thị số vật phẩm tích luỹ: `🛡️ VIP ×N` và `🛟 Thoát đảo ×N` khi số lượng lớn hơn một; một thẻ chỉ hiện tên, không thêm `×1`.
- Khi vật phẩm được dùng, engine phát `state.notice`: `vipUsed` ghi ô và số tiền thuê được miễn, `escapeUsed` báo đã dùng thẻ Thoát đảo. Client hiển thị thông báo toàn màn hình cho mọi người thay vì chỉ âm thầm thay đổi tiền/số thẻ.
- Khi chủ đất thực sự nhận tiền thuê, engine phát `state.reaction = { kind: 'happyRent', pid }`; nếu khoản thuê phải treo do thiếu tiền thì phát lúc `settle()`. Client làm thẻ nhân vật chủ nhà sáng/nảy và hiện mặt 😄; không phát khi ô mất điện hoặc VIP miễn thuê.
- Animation không phụ thuộc tần số quét: token dùng hệ số nội suy `1 - (1 - 0.25)^(dt*60)` và lực cản pháo giấy dùng `0.985^(dt*60)`. `prefers-reduced-motion` chỉ rút thời lượng còn khoảng 55% (xúc xắc 650 ms, tiền 400/900 ms), không ép animation xuống 1 ms như trước.
- Luồng vào lại từ máy khác dùng chính `/api/join`: `G.byName` tìm username cũ trong room; nếu ghế offline thì trả lại cùng `id`/`token`, nếu online thì 409. Client nhận cờ `rejoined` và lưu phiên room-scoped như bình thường.
- Mỗi lần `connect()` tăng `connectionEpoch`; handler và hàng đợi SSE bỏ mọi gói từ epoch cũ, đồng thời không nhận `state.version` thấp hơn bản đang hiển thị. Việc đóng/mở EventSource khi đổi phiên vì vậy không thể kéo một máy lùi về trạng thái cũ và gây lệch với người chơi khác.
- Khi lượt chuyển sang người mới, client hiện banner toàn màn hình `Đến lượt…`; quân cờ dùng chung chiều cao `TOKEN_HEIGHT = 1.08`, tương đương lớn hơn kích thước cũ khoảng 20%.
- Màu sở hữu của Gấu trúc (trước đây là cam) là vàng `#f4c430`. `G.ensureHost` và `seatSetup` đồng bộ lại màu theo nhân vật để cả room cloud và bản lưu local cũ nhận màu mới.
- Animation đếm tiền bị trừ dùng `MONEY_DEBIT_MS = 700`; tiền nhận vẫn dùng `MONEY_MS` để đồng bộ với hoạt ảnh xây nhà. Nhãn tiền trừ bay trong 900 ms.
- `public/js/houses.js` xem cả dải xanh và cam trong texture nguồn là màu nhận diện chủ sở hữu; vì vậy mái cam cũ được tô lại theo màu người chơi (Gấu trúc là vàng), không giữ màu cố định của model.
- Cờ màu chủ sở hữu trên ô đất phóng riêng phần vải lên `2.9x` (gấp đôi mức `1.45x` trước đó); cột và chóp cờ giữ nguyên kích thước.
- Mũi tên báo lượt không có màu vàng cố định: `placeOverlays()` lấy màu từ `seatOf[p.id].color` và cập nhật đồng thời `color`/`emissive` khi người tới lượt thay đổi.
- Âm thanh dùng Web Audio trong `public/js/app.js`, không tải asset ngoài: nhạc nền và hiệu ứng lượt/cảnh báo có công tắc/âm lượng riêng, lưu tại `tt-monopoly-sound-v1`; trình duyệt chỉ khởi tạo AudioContext sau tương tác người dùng. Trong chế độ mạng, chuỗi chuông đến lượt và tiếng tick 5 giây cuối chỉ chạy khi tới lượt chính người dùng trên máy đó, không chạy ở lượt đối thủ.
- Gain hiệu ứng được tăng để nghe rõ trên loa điện thoại: mặc định `turnVolume = 75`, chuông lượt dùng hệ số `0.30` và cảnh báo thời gian dùng `0.23`. Nhạc nền giữ nguyên hệ số `0.09` để không lấn âm báo; người đã có setting cũ vẫn nhận gain mới.
- Bảng bánh răng còn có mức đồ hoạ `low` / `medium` / `high`, lưu ở `tt-monopoly-graphics-v1` và áp dụng ngay bằng pixel ratio, shadow map, giới hạn FPS, chuyển động trang trí và mật độ hiệu ứng; đổi sang/khỏi mức thấp sẽ thay WebGL renderer để antialias bật/tắt ngay, canvas tương tác được gắn lại và context cũ được giải phóng. `?low` cũ vẫn ép mức thấp. Pháo giấy dùng pool và geometry dùng chung; cờ/Championship tự dispose tài nguyên riêng khi thay; renderer chụp avatar tự giải phóng context sau 2 giây; overlay DOM chỉ đồng bộ 10 FPS. Nút **Rời phòng** gọi `leave` khi còn ở lobby, nhưng trong ván chỉ ngắt phiên local để ghế/tài sản được giữ cho luồng rejoin.
- Tám thẻ Chance dùng cùng trọng số `w: 1` (12,5% mỗi thẻ). Vé máy bay chuyển sang bước `flight`: server chỉ tạo chuyển động tới World Tour sau khi người rút bấm OK; hết giờ thì `autoAction` xác nhận để ván không bị kẹt.
- Quân đang được điều khiển có một bản sao BackSide lớn hơn 1,075 lần làm viền sáng theo màu người chơi. Chơi mạng chỉ viền quân `me`; chơi chung một máy viền quân đang tới lượt.
- Nút **Bán tự động** tính trước tổng tiền mặt + giá bán các tài sản đã chọn; nếu vẫn thấp hơn khoản nợ thì bán hết rồi tự gọi `bankrupt`. Nút bán thủ công không tự phá sản.
- Engine lưu các mốc giao diện trong `state.achievements[]` và chặn phát trùng bằng `state.milestones`: `monopoly` khi hoàn thành một vùng màu, `tripleReady` khi có 2/3 vùng, `lineReady` khi còn thiếu một ô trên một cạnh và `resortReady` khi có 3/4 bãi biển. Client phát lần lượt các màn này khi ván còn diễn ra; người vào phòng giữa ván đánh dấu các mốc cũ là đã xem.
- Nếu state đã chuyển sang `phase === 'over'`, `playOut()` bỏ toàn bộ achievement mới trong lượt cuối (kể cả cảnh báo sắp Monopoly) và chỉ hiển thị màn kết quả chiến thắng.
- Màn kết quả của phòng mạng luôn có nút đỏ **Thoát phòng** cho cả người chơi và khán giả; nút gọi `exitRoom()` để đóng SSE, xoá phiên local và trở về màn username/mã phòng. Nút **Chơi ván mới** giữ nguyên luồng reset hiện có.
- Giá công trình thành phố hỗ trợ bảng `tile.values` tuyệt đối theo 5 cấp; `VALUE_MULT` chỉ là dữ liệu dự phòng cho map/thành phố mới. Toàn bộ thành phố Map 1 đã được đối chiếu: Granada, Seville và Madrid `60/110/160/210/360K`; Hong Kong và Beijing `100/150/200/250/400K`; Shanghai `120/170/220/270/420K`; Venice và Milan `140/240/340/440/690K`; Rome `160/260/360/460/710K`; Hamburg `180/280/380/480/730K`; Berlin `200/300/400/500/750K`; London `220/370/520/670/1045K`; Sydney `240/390/540/690/1065K`; Chicago và Las Vegas `260/410/560/710/1085K`; New York `280/430/580/730/1105K`; Lyon `300/500/700/900/1400K`; Paris `320/520/720/920/1420K`; Osaka `350/550/750/950/1450K`; Tokyo `400/600/800/1000/1500K`. `G.value()` đọc bảng này và thẻ thông tin hiển thị giá trị từng cấp, còn nâng cấp thực tế thu phần chênh lệch qua `G.upgradeCost()`.
- Resort có giá đất `200K`, không thể mua lại; tiền thuê chung theo tổng số resort cùng chủ là `25/50/100/200K` cho 1–4 resort, theo bảng Bali.
- Tiền thuê của cả 20 thành phố dùng bảng `tile.rents` tuyệt đối theo 5 cấp và `G.toll()` đọc trực tiếp bảng này. Dữ liệu đã được đối chiếu với bảng Business Tour: từ Granada `2/25/50/75/150K` đến Tokyo `50/200/400/600/1100K`; không còn thành phố nào sinh tiền thuê từ `TOLL_MULT`.
- Mất điện dùng `outageRounds(i) = state.outage[i] - state.round` để hiện dạng gọn `N ⚡` ngay trên dải giá trắng luôn nhìn thấy (không đặt ở phần sân có thể bị nhà che) và trong `.pcard .power` của chủ sở hữu. Chữ ký `tileSigs` chứa số vòng này để texture được vẽ lại sau mỗi vòng, không chỉ khi trạng thái bật/tắt.
- Ba ô thưởng lễ hội `state.bonus` dùng `festivalFlag()` dưới dạng một băng rôn cam đậm căng giữa hai cọc ở chính giữa cạnh sau ô đất; không dùng lá cờ một cọc bán trong suốt. Băng rôn quay theo từng cạnh bàn và ghi rõ hệ số `CFG.BONUS_MULT`.
- Ô đang tổ chức Championships dùng bảng vàng `1.56 × 0.44`, căn giữa và trải gần hết bề ngang ô đất ngay dưới dải tên/giá, với một cúp lớn ở giữa. Hai cạnh xa dùng chiều cao `0.28` và đáy được nâng lên trên mặt giữa bàn để không bị che thành một thanh vàng. Bảng dùng material không chịu ảnh hưởng ánh sáng để rõ như nhau ở cả bốn cạnh.
- Luật Business Tour đã được đồng bộ: ba ô lễ hội đầu ván nhân đôi tiền thuê; hệ số tổng cộng dồn theo monopoly/lễ hội/Championships và chặn ở ×10; chuyển Championships sang ô của mình tốn 50K (tăng tại ô hiện tại không mất phí); World Tour chỉ tới thành phố trống, hết thành phố trống mới tới ô của mình. Thuế là 10% tổng tài sản, không còn mức sàn tự đặt.
- Luật công khai chỉ xác nhận đi qua hoặc dừng ở Start nhận 300K; chưa có nguồn đủ tin cậy cho lựa chọn “nâng miễn phí 1 nhà hoặc roll thêm” khi dừng chính xác, nên engine chưa thêm cơ chế này.
- Đã thử bằng `wrangler dev`: `TTM_URL=http://127.0.0.1:8787/ node test/e2e.js` qua; alarm tự đi khi hết giờ bước đã thử. Production dùng domain thương hiệu và base path ghi trong `docs/CLOUDFLARE.md`.
- Phòng chờ thêm hành động `kick` (mời ra ghế đang mất kết nối) ở cả server.js và worker.js.
- Hướng dẫn: `docs/CLOUDFLARE.md`.

## Ràng buộc bản quyền (giữ nguyên)
Không dùng asset gốc của Business Tour (bundle unity3d, PNG trích xuất, bản AI vẽ lại). Chỉ dùng Kenney CC0 và mô hình dựng bằng code. Thông tin nguồn được giữ trong tài liệu dự án, không hiện chú thích cố định trên giao diện game.

## Việc tiếp theo (người dùng chọn)
1. **Web app:** đẩy lên repo GitHub riêng tư, nối Railway (hoặc Fly.io/Render) để push là tự deploy. Cần ổ lưu cho `DATA_DIR`, thêm mã phòng hoặc mật khẩu vì link công khai.
2. ~~**App local:** `.exe` một file~~ (xong v1.1). Có thể thêm: ký số file, chạy nền không cửa sổ, tự khởi động cùng Windows.
3. Có thể thêm: âm thanh, nhiều phòng song song, PWA "Thêm vào màn hình chính".

## Ghi chú môi trường thử (sandbox Claude)
- Chromium headless dùng swiftshader (`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`), mở `?low`, viewport nhỏ. Chỉ được khoảng 1–2 khung hình/giây nên chờ lâu.
- Google Fonts bị chặn trong sandbox (chỉ đổi font, không lỗi).

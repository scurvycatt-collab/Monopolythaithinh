# Luật và engine

Phạm vi: luật chơi, engine `game.js`, bảng giá, thuê, thẻ, thuế, resort, mất điện, lễ hội, achievements.
Code chính: `public/rules.js`, `public/game.js`

## Nguồn sự thật
- `public/rules.js` là nguồn sự thật duy nhất của luật: thông số, sơ đồ trạng thái `STATES`, bảng quyết định `DECISIONS`.
- `public/game.js` (engine UMD, `window.Game` / `require`) chỉ thực thi, đọc mọi số từ rules.js.
- `act()` từ chối hành động không có trong `STATES[step].actions`.
- `docs/RULES.md` sinh từ rules.js (`npm run rules:doc`). Mọi thay đổi phải qua `npm run verify` (hook pre-commit, CI GitHub, build:exe).
- `RULEBOOK` trong rules.js là luật tiếng Việt hiện ở nút **Luật chơi** (bảng Cài đặt). Giao diện và engine cùng đọc một nguồn.
- Danh sách map nằm trong `MAPS` (rules.js). Mỗi entry có `preview` trỏ ảnh SVG trong `public/maps/`, hiện ở màn tạo phòng và danh sách map trong lobby.
- Room lưu lựa chọn ở `settings.mapId`; `map-1` là map hiện tại và mặc định.
- Thêm map: bổ sung asset/renderer, ảnh preview, entry `MAPS`, kiểm thử và tài liệu cùng lúc.

## Luồng lượt
- Thiếu tiền: khoản phải trả **treo** ở `S.pending = { from, to, amount, why }`, chưa ai mất/nhận tiền.
  - Bước `debt` bán đất; đủ thì `settle()` chuyển tiền rồi mới `finish()` (đổ đôi thì đổ tiếp).
  - Phá sản: tiền mặt còn lại về người nhận. Tiền không bao giờ âm.
- Thời gian mỗi bước: `settings.turnSec` (20/30/45/60, mặc định 30) + 6 s cho hoạt ảnh.
  - `S.stepAt` ghi ở mỗi `act`.
  - `G.checkTurn` tự làm `autoAction` một bước (server mỗi giây; chế độ một máy ở client).
- `S.notice.kind`: `cantPay`, `noTakeover`, `tour`, `festival` → popup toàn màn hình.
- `autoAction()` đi hộ người mất kết nối, không tự tiêu tiền. `G.botAction()` của bot: xem `server.md`.
- Màu sở hữu của Gấu trúc (trước là cam) là vàng `#f4c430`. `G.ensureHost` và `seatSetup` đồng bộ lại màu theo nhân vật, để room cloud và bản lưu local cũ nhận màu mới.

## Luật Business Tour đã đồng bộ
- Ba ô lễ hội đầu ván nhân đôi tiền thuê.
- Hệ số tổng cộng dồn theo monopoly / lễ hội / Championships, chặn ở ×10.
- Chuyển Championships sang ô của mình tốn 50K (tăng tại ô hiện tại không mất phí).
- World Tour chỉ tới thành phố trống; hết thành phố trống mới tới ô của mình.
- Thuế là 10% tổng tài sản, không còn mức sàn tự đặt.
- Luật công khai chỉ xác nhận đi qua hoặc dừng ở Start nhận 300K. Chưa có nguồn đủ tin cậy cho "nâng miễn phí 1 nhà hoặc roll thêm" khi dừng chính xác, nên engine chưa thêm cơ chế này.

## Bảng giá và tiền thuê
- Giá công trình thành phố dùng bảng `tile.values` tuyệt đối theo 5 cấp; `VALUE_MULT` chỉ là dữ liệu dự phòng cho map/thành phố mới.
- `G.value()` đọc bảng này; thẻ thông tin hiển thị giá trị từng cấp. Nâng cấp thu phần chênh lệch qua `G.upgradeCost()`.
- Giá trị Map 1 (đã đối chiếu toàn bộ thành phố, đơn vị K, 5 cấp):
  - Granada, Seville, Madrid: `60/110/160/210/360K`
  - Hong Kong, Beijing: `100/150/200/250/400K`
  - Shanghai: `120/170/220/270/420K`
  - Venice, Milan: `140/240/340/440/690K`
  - Rome: `160/260/360/460/710K`
  - Hamburg: `180/280/380/480/730K`
  - Berlin: `200/300/400/500/750K`
  - London: `220/370/520/670/1045K`
  - Sydney: `240/390/540/690/1065K`
  - Chicago, Las Vegas: `260/410/560/710/1085K`
  - New York: `280/430/580/730/1105K`
  - Lyon: `300/500/700/900/1400K`
  - Paris: `320/520/720/920/1420K`
  - Osaka: `350/550/750/950/1450K`
  - Tokyo: `400/600/800/1000/1500K`
- Tiền thuê của cả 20 thành phố dùng bảng `tile.rents` tuyệt đối theo 5 cấp; `G.toll()` đọc trực tiếp.
  - Đã đối chiếu bảng Business Tour: từ Granada `2/25/50/75/150K` đến Tokyo `50/200/400/600/1100K`.
  - Không thành phố nào còn sinh tiền thuê từ `TOLL_MULT`.
- Resort: giá đất `200K`, không thể mua lại. Tiền thuê chung theo tổng số resort cùng chủ là `25/50/100/200K` cho 1–4 resort, theo bảng Bali.

## Chance
- Tám thẻ Chance cùng trọng số `w: 1` (12,5% mỗi thẻ).
- Vé máy bay chuyển sang bước `flight`; Tổ chức lễ hội chuyển sang `hostFestival`. Server chỉ tạo chuyển động tới World Tour/Championships sau khi người rút bấm OK, để renderer không nhận vị trí cuối quá sớm.
- Hết giờ thì `autoAction` xác nhận để ván không bị kẹt.

## Vật phẩm và phản ứng
- Thẻ hiển thị `🛡️ VIP ×N` và `🛟 Thoát đảo ×N` (hiển thị: xem `client-ui.md`).
- Khi dùng vật phẩm, engine phát `state.notice`: `vipUsed` (ghi ô và số tiền thuê được miễn), `escapeUsed` (báo đã dùng thẻ Thoát đảo).
- Khi chủ đất thực sự nhận tiền thuê, engine phát `state.reaction = { kind: 'happyRent', pid }`.
  - Nếu khoản thuê treo do thiếu tiền thì phát lúc `settle()`.
  - Không phát khi ô mất điện hoặc VIP miễn thuê.

## Mất điện
- `outageRounds(i) = state.outage[i] - state.round`. Hiển thị `N ⚡`: xem `render-map-1.md`.

## Achievements
- Engine lưu mốc giao diện trong `state.achievements[]`, chặn phát trùng bằng `state.milestones`:
  - `monopoly`: hoàn thành một vùng màu.
  - `tripleReady`: có 2/3 vùng.
  - `lineReady`: còn thiếu một ô trên một cạnh.
  - `resortReady`: có 3/4 bãi biển.
- Cách client phát các màn này: xem `client-ui.md`.

# Checklist parity bắt buộc cho mọi bản đồ

Mọi bản đồ mới phải giữ nguyên luật chơi và hành vi giao diện của Map 1. Skin/renderer
chỉ thay phần trình bày. Checklist này phải được kiểm tra trước mỗi lần commit hoặc deploy
có thay đổi bản đồ.

## 1. Nội dung ô đất

- Ô thành phố/resort chưa có chủ chỉ hiện tên, **không hiện giá mua trên bàn**.
- Giá mua chỉ hiện trong popup mua/nâng cấp. Ô đã có chủ hiện tiền thuê hiện tại.
- Ô mất điện hiện số vòng còn lại trước dấu sét theo dạng `2 ⚡`; thẻ chủ đất cũng hiện trạng thái này.
- Tên ô, nhóm màu, giá, cấp nhà và luật lấy từ `public/rules.js`; skin không tự định nghĩa lại.

## 2. Thứ tự sự kiện và thông báo

- Renderer phải hoàn tất Promise của `rollDice`, `moveToken`, `sync` đúng thời điểm để app
  phát sự kiện theo `seq` của server.
- Khi Chance làm nhân vật di chuyển: nhân vật tới ô Chance, thẻ được hiện và người chơi xác
  nhận, sau đó nhân vật mới đi tới đích. Ví dụ: thẻ tới Championships phải hiện trước khi
  quân bắt đầu đi tới Championships.
- Đây là luật engine dùng chung: mỗi thẻ di chuyển phải có một `STATES` xác nhận riêng;
  `drawCard` không được tạo sẵn movement tới đích trong cùng state rút thẻ. Map chỉ phát lại
  movement mà server sinh sau nút OK, giống nhau trên Map 1, Bốn Mùa và mọi map mới.
- Thẻ được sử dụng tự động (miễn tiền thuê, thoát đảo...) phải hiện thông báo. Các bước chọn
  mục tiêu của Chance, World Tour và Championships phải dùng `highlight` và không bị skin che.
- Map không tự xử lý luật, bỏ popup hoặc tự đổi thứ tự sự kiện do `public/js/app.js` phát.

## 3. Nhân vật

- Mọi mẫu nhân vật được chuẩn hoá cùng chiều cao hiển thị `1.08` đơn vị bản đồ.
- Map có bộ nhân vật riêng phải khai báo đủ 4 entry trong `MAPS[].pets`; mỗi entry dùng PNG tĩnh
  512×512 có alpha và đường dẫn `img`. Lobby, thẻ người chơi, chat và renderer đều phải đọc
  cùng danh sách qua `Game.petsForMap(mapId)`, không trộn nhân vật từ map khác.
- Mũi tên theo màu người chơi; quân của người đang điều khiển có viền sáng.
- Nhiều quân trên cùng ô phải được tách vị trí, không che hoàn toàn nhau.
- Mỗi map giữ phong cách và asset hiển thị độc lập. Map chỉ được dùng chung engine/contract trong
  `public/js/render-common/` và luật gameplay; không import skin, nhân vật hay công trình từ thư mục map khác.

## 4. Thumbnail và asset

- Preview map và thumbnail nhà/resort/cấp nhà/màu phải là file tĩnh sinh trước khi chạy game.
- Không chụp Canvas/WebGL, đổi màu model hoặc dựng thumbnail lúc người chơi mở popup.
- Chỉ sau khi người chơi vào phòng, client phải nạp và giải mã trước đúng bộ thumbnail của map đã chọn;
  không tải thumbnail map ở trang chủ và không để popup đầu tiên chờ tải ảnh.
- Khi thêm nhà, cấp nhà, màu hoặc model: cập nhật generator, chạy `npm run thumbnails`, rồi
  commit cả asset sinh ra và manifest/hash tương ứng.
- Map có bộ công trình riêng theo nhân vật phải đưa `pet` của chủ vào chữ ký cache sprite, sinh đủ thumbnail
  cho từng `pet × cấp`, và route popup tới đúng thư mục map. Hai skin Ben 10 dùng `npm run ben10:buildings`
  để tạo và kiểm tra 20 PNG cho mỗi skin trước khi commit.
- Chỉ dùng asset CC0 hoặc tự dựng; ghi nguồn trong README của map.

## 5. Tải và hiệu năng

- Trang chủ không khởi tạo renderer hay tải asset bản đồ. Khi vào phòng, chỉ tải map đã chọn.
- Cache texture/sprite/model đã tạo; cảnh tĩnh chỉ dựng lại khi dữ liệu hiển thị thay đổi.
- Không chặn luồng chính quá 50 ms; mức `low` đạt giới hạn trong `map-renderer.md`.
- Khi cảnh đứng yên phải giảm đánh thức; khi tab ẩn phải dừng render. `destroy()` phải giải
  phóng listener, timer, Canvas/GPU resource.
- Các mức đồ hoạ có cùng luật và kích thước tương đối; chỉ giảm hiệu ứng, độ phân giải hoặc bóng.
- Map 1–4 dùng chung quỹ đạo và thời lượng xúc xắc từ `public/js/render-common/dice-roll.js`. Chuẩn là kiểu
  Map 2: hai xúc xắc nảy/lăn tại chỗ, không rơi từ trên cao và Promise chỉ resolve khi cả hai đã dừng.
- Skin/renderer không được chứa logic nhận thẻ, xác nhận thẻ, thông báo hay thay đổi state. Các luồng đó chỉ
  tồn tại trong `public/game.js` và `public/js/app.js`; map chỉ phát lại hình ảnh qua Board contract.

## 6. Cổng kiểm tra trước commit/deploy

1. Chạy `npm run verify` và tất cả test phải qua.
2. Tạo phòng bằng từng map; kiểm tra trang chủ không dựng map trước khi vào phòng.
3. Kiểm tra ô trống, ô có chủ, mất điện, xây nhà, bán nhà và nhiều quân cùng ô.
4. Kiểm tra Chance di chuyển (đặc biệt tới Championships/World Tour) và thông báo thẻ sử dụng.
5. Kiểm tra `low`, `medium`, `high`, tab ẩn/hiện lại và rời phòng vào lại.
6. Nếu map có bộ nhân vật riêng: chọn đủ từng nhân vật, kiểm tra thumbnail không trễ/không cắt,
   màu tên–thẻ–mũi tên đồng nhất và server từ chối nhân vật thuộc map khác.

Không được bỏ qua checklist bằng ngoại lệ riêng cho một skin. Nếu thay đổi luật dùng chung,
cập nhật `public/rules.js`, test và tài liệu luật trước khi sửa renderer.

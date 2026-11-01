# Contract: Map Skin (khung xương 2D)

## Ranh giới dữ liệu hiển thị

- Giá, tiền thuê, nhóm màu, loại ô và mọi luật thuộc dữ liệu chung theo index
  trong `TILES`; skin không được sao chép hoặc ghi đè.
- Tên địa danh được thay theo chủ đề bằng `MAPS[].tileNames[index]`. Renderer/UI
  dùng tên này để hiển thị, engine vẫn định danh ô và tính tiền bằng index.
- Map mới phải hoàn tất [`map-build-checklist.md`](./map-build-checklist.md)
  trước khi commit/deploy.

Mọi map 2D mới = **khung xương chung** + **một skin**. Khung xương (`public/js/render-common/board2d/`) lo hình học bàn, camera, quân cờ, xúc xắc, hoạt ảnh, sở hữu, lễ hội, mất điện, overlay, và hiện thực sẵn `docs/contracts/map-renderer.md`. Skin chỉ khai báo **trông như thế nào**.

Người làm map chỉ đọc file này + `public/js/render-common/board2d/PEN.md` (bút vẽ). Không đọc code khung xương.

## 1. Thư mục một map 2D

```
public/maps/<id>/
  renderer.js   3 dòng, sinh bởi npm run map:new
  skin.js       export default defineSkin({...})
  preview.svg
  assets/       sprite riêng của map (PNG ≤ 512 px, tổng ≤ 1,5 MB)
  README.md
```

```js
// renderer.js — không sửa tay
import { createBoard2D } from '../../js/render-common/board2d/index.js';
import skin from './skin.js';
export default (ctx) => createBoard2D(ctx, skin);
```

Asset dùng chung giữa nhiều map (Kenney Isometric Buildings, Nature Kit) nằm một bản ở `public/assets/shared/<pack>/`; skin tham chiếu bằng tên pack, không chép.

## 2. Skin

```js
import { defineSkin } from '../../js/render-common/board2d/skin.js';
export default defineSkin({
  id: 'four-seasons',
  packs: ['kenney-iso-buildings', 'kenney-nature'],   // asset dùng chung cần tải
  sprites: { lantern: 'assets/lantern.png' },        // asset riêng, gọi bằng tên trong draw
  palette: { … },        // §3
  cityLabelBand: 0.18,   // tuỳ chọn: dải màu nhóm làm nền tên thành phố
  zones: [ … ] | null,   // §4
  slots: { … },          // §5
  ambient: { … },        // §6, tuỳ chọn
  labels: { … },         // §7, tuỳ chọn
});
```

`defineSkin` kiểm tra skin lúc tải: thiếu slot bắt buộc, sai kiểu, sprite không tồn tại → lỗi tiếng Việt nêu rõ trường.

`cityLabelBand` là tỷ lệ chiều sâu ô (0–0,3). Khi có, dải màu nhóm đất được kéo cao làm nền cho tên thành phố; khung xương tự chọn chữ đen/trắng theo độ sáng màu nhóm.

## 3. palette

| Khoá | Ý nghĩa |
|---|---|
| `groups` | `{ A…H: '#hex' }` màu 8 nhóm đất (giữ đúng 8 khoá trong `rules.GROUPS`) |
| `ground` | mặt cỏ / mặt ô mặc định |
| `priceStrip`, `priceText` | dải giá phía gần camera |
| `labelText`, `labelShadow` | chữ tên ô |
| `boardSide`, `boardSideDark` | thành đế bàn |
| `water`, `sand` | dùng bởi slot mặc định |

Màu người chơi **không** nằm trong skin: lấy từ `view.players[i].color`.

## 4. zones (tuỳ chọn)

Chia bàn theo cạnh để đổi theme từng cạnh (ví dụ Bốn Mùa: cạnh 0 Xuân … cạnh 3 Đông). Mảng 4 phần tử, phần tử `k` áp cho ô 8k+1 … 8k+7 và nửa giữa bàn phía đó:

```js
zones: [{ id: 'spring', ground: '#bde69c', wall: '#ffe4ee', particles: 'petals' }, …]
```

Mọi trường trong zone ghi đè `palette` cùng tên cho cạnh đó. Ô góc (0/8/16/24) nhận `zone = null` và tự pha 2 zone kề. `zones: null` = cả bàn một theme.

## 5. slots — 13 vị trí asset

| Slot | Vẽ cái gì | Biến thể khung xương gọi |
|---|---|---|
| ★ `tile` | mặt ô đất (cỏ, viền, hoa văn nhóm) | mỗi ô |
| ★ `house` | nhà thành phố | `level` 0–4 đúng `view.props[i].level` (0 = đất có cờ, 4 = Khách sạn / landmark), `color` chủ |
| `deco` | cây, vật trang trí trên ô trống / sân | `seed`, `zone` |
| ★ `resort` | ô resort khi chưa có chủ | |
| ★ `resortHouse` | công trình resort | `level` 1–4 = số resort cùng chủ |
| ★ `start` `island` `festival` `tour` | 4 ô góc | |
| ★ `chance` `tax` | ô đặc biệt | |
| `base` | đồ trang trí thêm lên đế bàn | `draw(pen, c)` một lần mỗi lần dựng cảnh |
| `center` | giữa bàn | `paint(g, c)` mặt đất một lần; `draw(pen, c)` **4 lần** (mỗi cạnh một lần); `core(pen, c)` vật ở tâm |
| `bonus` `outage` | băng rôn lễ hội ×2 / ô mất điện | `bonus`: `level` = hệ số; `outage`: `level` = số vòng còn lại |

★ = bắt buộc. Slot không ★ để trống → **không vẽ gì thêm**, trừ khi bảng dưới ghi bản mặc định:

| Slot bỏ trống | Kết quả |
|---|---|
| `deco` | ô đất không có cây / vật trang trí nào |
| `base` | chỉ còn khối đế phẳng màu `palette.boardSide` (mặt trên `boardTop` → `boardSide`, mặt tối `boardSideDark`; mặc định `#7fcfd8` / `#62b6c2` / `#8fd8e0`) và tấm nền bàn viền `palette.tileSide` / `tileSideDark` (mặc định `#c89d7b` / `#a47c5d`). `base.draw` vẽ **thêm lên trên** đế này, không thay thế |
| `center` | chỉ có cỏ từng zone, không vật giữa bàn |
| `bonus` | băng rôn đỏ "LỄ HỘI ×n" có dây cờ |
| `outage` | không có sprite; số vòng mất điện vẫn hiện trên dải giá |

Khoá palette tuỳ chọn khung xương có đọc thêm: `boardTop`, `tileSide`, `tileSideDark`, `ground2`, `ground3` (màu `#hex`).

Mỗi slot nhận **một trong ba dạng**, từ đơn giản tới tự do:

```js
house: { kind: 'kit', levels: [[[0,0,['128']]], [[0,0,['016'],'069']], …5 cấp], wall: 'zone' }  // A. khai báo: ghép mảnh Kenney, tô màu chủ
deco:  { kind: 'sprite', pick: ['tree_oak', 'tree_fat'], tint: 'zone' }            // B. chọn sprite từ pack
center: { draw(pen, c) { … } }                                                       // C. tự vẽ bằng Pen
```

Danh sách `kind` có sẵn và tham số: `public/js/render-common/board2d/KINDS.md`. Hàm `draw(pen, c)`:

| `c.` | Ý nghĩa |
|---|---|
| `tile`, `type`, `group`, `name` | ô hiện tại (từ `rules.TILES`) |
| `side`, `zone` | cạnh 0–3, zone tương ứng (hoặc `null`) |
| `level`, `color` | cấp và màu chủ (slot `house`, `resortHouse`) |
| `seed` | số cố định theo ô, dùng cho ngẫu nhiên lặp lại được |
| `w`, `d` | bề ngang / sâu ô (đơn vị thế giới): ô thường 1.7 × 3.1, ô góc 3.1 × 3.1 |
| `gz`, `strip` | `z` tâm vùng cỏ và `z` mép vùng cỏ / dải giá (ô thường: −0.74 và 0.26) |
| `cw`, `ch`, `px` | chỉ có trong `paint(g, c)`, xem dưới |
| `add(x, z, fn, d?)` | chỉ có trong `center.draw` / `core`, xem dưới |
| `sprite(name)` | lấy sprite đã tải |

Toạ độ trong `draw` là **toạ độ cục bộ của ô**: gốc ở tâm ô trên mặt bàn, `x` dọc cạnh (−`w`/2 … `w`/2), `z` vuông góc cạnh, **dương = phía dải giá, luôn quay về camera**, `y` lên trên. Phép chiếu isometric cố định (nắng từ +x), nên khung xương **không xoay** ô: cạnh 0/2 vẽ nguyên, cạnh 1/3 soi gương x ↔ z (bút tự đổi, mặt sáng vẫn bên phải). Vùng cỏ là `z` ∈ [−`d`/2, `c.strip`], tâm vùng cỏ `c.gz`. Ô góc: gốc ở tâm ô góc, trục thế giới, không soi gương. Slot `paint(g, c)` vẽ phẳng lên texture:

- `c.cw`, `c.ch`: bề ngang / cao **vùng vẽ của `paint`**, đơn vị **điểm ảnh** của canvas `g` (gốc ở góc trên trái). `c.px` = 110 điểm ảnh / đơn vị thế giới (cố định, không phụ thuộc mức chất lượng).
- Ô thường: `cw` = 187, `ch` = 259. `ch` chỉ là vùng cỏ (76 % chiều sâu ô); dải giá phía dưới do khung xương vẽ sau, đừng tô vào đó. `x` điểm ảnh = (x thế giới + `w`/2)·`px`, `y` = (z + `d`/2)·`px`.
- Ô góc: `cw` = `ch` = 341, toàn ô.
- Dùng `c.cw` / `c.ch` thay vì số cứng, ví dụ `c.grass(g, 0, 0, c.cw, c.ch)`.

Slot `center`: `paint(g, c)` tô thêm mặt đất (khung xương đã tô cỏ từng zone; `c.T(x, z)` → điểm ảnh, `c.px`, `c.half` = nửa cạnh bàn = 5.95; không có `cw`/`ch`). `draw(pen, c)` bút ở tâm bàn theo trục thế giới; `c.toWorld(u, v)` đổi toạ độ zone (u dọc cạnh, v từ tâm ra cạnh của zone) sang thế giới. `core(pen, c)` vẽ vật ở tâm (ví dụ đài phun).

- **`draw` luôn gọi đúng 4 lần**, `c.side` = 0…3, kể cả khi `zones: null` (khi đó `c.zone === null`, nên không được đọc `c.zone.id`). Mỗi lần ứng với một phần tư bàn (tam giác từ tâm tới cạnh `side`); `toWorld` đổi toạ độ phần tư đó sang thế giới.
- Skin **không zone** muốn vẽ một lần: hoặc đặt vật vào `core` (gọi đúng 1 lần, nên làm vậy cho vật ở tâm), hoặc `draw(pen, c) { if (c.side !== 0) return; … }`. Nếu vẽ cả 4 lần cùng một vật, nó bị chồng 4 lần (viền đậm lên, tốn thời gian nướng).
- `c.add(x, z, fn, d?)`: đẩy một vật vào **danh sách vẽ theo chiều sâu chung** của cả 4 lần `draw` và `core`. `x`, `z` là toạ độ **thế giới** (dùng `toWorld` trước), `fn(pen)` vẽ vật (bút vẫn ở tâm bàn, truyền toạ độ thế giới cho `fn`), `d` (mặc định 0) cộng vào khoá sắp xếp `x + z + d`. Sau 4 lần `draw` khung xương mới xếp và vẽ danh sách (sau `core` cũng vào danh sách tại (0, 0)). Vẽ trực tiếp bằng `pen` thì ra ngay, **nằm dưới** mọi vật qua `c.add`. Tương đương `c.layer()` ở các slot khác.
- **Cửa sổ nướng cố định**: ảnh `center` nướng một lần trong khung 18.8 × 12.4 đơn vị màn hình (L −9.4 … R 9.4, dưới −5.2, trên 7.2), gốc là tâm bàn, độ phân giải = 0.72 × `k` của mức chất lượng. Đơn vị là màn hình chứ không phải toạ độ thế giới; phần ngoài khung bị cắt. Đổi: `sx/k = (x − z)·0.707`, `sy/k = (x + z)·0.354 − y·0.866`. Bàn rộng ±5.95 (góc trái / phải chạm ±8.41, góc xa −4.2, góc gần +4.2), nên còn dư khoảng 1 đơn vị ở trái / phải / dưới và vật có thể cao tới khoảng y = 3.5 ở góc xa. Bảng cửa sổ của slot ô: `PEN.md`.

Kết quả `draw` được **nướng thành ảnh một lần** cho mỗi tổ hợp (slot, ô, level, màu) rồi dùng lại; vì vậy `draw` phải thuần, không đọc thời gian hay biến toàn cục.

## 6. ambient (tuỳ chọn, chuyển động)

```js
ambient: { particles: { petals: {…}, snow: {…} }, animate: { fountain(pen, t, c) {…} } }
```

- `particles`: hạt rơi theo zone, khung xương có sẵn `petals`, `sun`, `leaves`, `snow`, `none`.
- `animate`: vẽ lại mỗi khung, bút ở tâm bàn, **tổng ≤ 1 ms/khung**; mức `low` khung xương bỏ qua `ambient`.
- Hạt chọn theo `zone.particles` (vùng giữa bàn và các ô của cạnh đó).

## 7. labels (tuỳ chọn)

`{ start: 'START', island: 'LOST ISLAND', festival: 'CHAMPIONSHIPS', tour: 'WORLD TOUR' }` và font chữ ô. `resortLevels`: mảng 4 tên cấp nhà resort (tuỳ chọn); khung xương trả ra `board.meta.resortLevels` cùng `meta.buildMs` (PR #5). Tên thành phố và giá **luôn lấy từ `rules`**, skin không đổi. Giá mua không hiện trên ô chưa có chủ; chỉ popup mua được hiển thị giá. Ô đã có chủ dùng dải này để hiện tiền thuê hoặc số vòng mất điện.

## 8. Quy tắc

Ngoài contract skin, mọi map phải qua [`map-parity.md`](map-parity.md), gồm thứ tự thẻ/di chuyển,
kích thước nhân vật, thumbnail dựng sẵn và các cổng hiệu năng trước commit/deploy.

- Skin không định nghĩa ô, giá, nhóm, loại ô: đó là luật (`public/rules.js`).
- Skin không import gì ngoài `defineSkin` và hằng số của chính nó. Tiện ích (màu, `rng`, chữ, cỏ) lấy từ `c.` và bút (`PEN.md`). Cần một `kind` hay hạt mới → đề xuất thêm vào khung xương (PR riêng, owner render), không viết lại trong skin.
- Hiệu năng: mức `low` ≤ 4 ms/khung trên bàn trống; tải map ≤ 2 MB.
- Asset: Kenney CC0 hoặc tự dựng bằng code.
- `npm run verify` chạy `test/maps.test.mjs`: renderer 2D hợp lệ khi gọi `createBoard2D` và `skin.js` qua `defineSkin` không lỗi (chạy được trong Node, không cần canvas).

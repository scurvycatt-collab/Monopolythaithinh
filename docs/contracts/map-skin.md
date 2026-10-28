# Contract: Map Skin (khung xương 2D)

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
  zones: [ … ] | null,   // §4
  slots: { … },          // §5
  ambient: { … },        // §6, tuỳ chọn
  labels: { … },         // §7, tuỳ chọn
});
```

`defineSkin` kiểm tra skin lúc tải: thiếu slot bắt buộc, sai kiểu, sprite không tồn tại → lỗi tiếng Việt nêu rõ trường.

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
| `base` | đế bàn dưới 32 ô | |
| `center` | giữa bàn | `paint(g, c)` mặt đất một lần; `draw(pen, c)` mỗi zone; `core(pen, c)` vật ở tâm |

★ = bắt buộc. Slot không ★ để trống → khung xương dùng bản mặc định.

Mỗi slot nhận **một trong ba dạng**, từ đơn giản tới tự do:

```js
house: { kind: 'kit', stacks: [['000'], ['000','016'], …5 cấp], recolor: 'roof' }  // A. khai báo: ghép mảnh Kenney, tô màu chủ
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
| `w`, `d` | bề ngang / sâu vùng vẽ (đơn vị thế giới) |
| `sprite(name)` | lấy sprite đã tải |

Toạ độ trong `draw` là **toạ độ cục bộ của ô**: gốc ở tâm ô trên mặt bàn, `x` dọc cạnh (−`w`/2 … `w`/2), `z` vuông góc cạnh, **dương = phía dải giá, luôn quay về camera**, `y` lên trên. Phép chiếu isometric cố định (nắng từ +x), nên khung xương **không xoay** ô: cạnh 0/2 vẽ nguyên, cạnh 1/3 soi gương x ↔ z (bút tự đổi, mặt sáng vẫn bên phải). Vùng cỏ là `z` ∈ [−`d`/2, `c.strip`], tâm vùng cỏ `c.gz`. Ô góc: gốc ở tâm ô góc, trục thế giới, không soi gương. Slot `paint(g, c)` vẽ phẳng lên texture (điểm ảnh, `c.cw × c.ch`).

Slot `center`: `paint(g, c)` tô thêm mặt đất (khung xương đã tô cỏ từng zone; `c.T(x, z)` → điểm ảnh). `draw(pen, c)` gọi một lần cho mỗi zone, bút ở tâm bàn theo trục thế giới; `c.toWorld(u, v)` đổi toạ độ zone (u dọc cạnh, v từ tâm ra cạnh của zone) sang thế giới. `core(pen, c)` vẽ vật ở tâm (ví dụ đài phun).

Kết quả `draw` được **nướng thành ảnh một lần** cho mỗi tổ hợp (slot, ô, level, màu) rồi dùng lại; vì vậy `draw` phải thuần, không đọc thời gian hay biến toàn cục.

## 6. ambient (tuỳ chọn, chuyển động)

```js
ambient: { particles: { petals: {…}, snow: {…} }, animate: { fountain(pen, t, c) {…} } }
```

- `particles`: hạt rơi theo zone, khung xương có sẵn `petals`, `sun`, `leaves`, `snow`, `none`.
- `animate`: vẽ lại mỗi khung, bút ở tâm bàn, **tổng ≤ 1 ms/khung**; mức `low` khung xương bỏ qua `ambient`.
- Hạt chọn theo `zone.particles` (vùng giữa bàn và các ô của cạnh đó).

## 7. labels (tuỳ chọn)

`{ start: 'START', island: 'LOST ISLAND', festival: 'CHAMPIONSHIPS', tour: 'WORLD TOUR' }` và font chữ ô. `resortLevels`: mảng 4 tên cấp nhà resort (tuỳ chọn); khung xương trả ra `board.meta.resortLevels` cùng `meta.buildMs` (PR #5). Tên thành phố và giá **luôn lấy từ `rules`**, skin không đổi.

## 8. Quy tắc

- Skin không định nghĩa ô, giá, nhóm, loại ô: đó là luật (`public/rules.js`).
- Skin không import gì ngoài `defineSkin` và hằng số của chính nó. Tiện ích (màu, `rng`, chữ, cỏ) lấy từ `c.` và bút (`PEN.md`). Cần một `kind` hay hạt mới → đề xuất thêm vào khung xương (PR riêng, owner render), không viết lại trong skin.
- Hiệu năng: mức `low` ≤ 4 ms/khung trên bàn trống; tải map ≤ 2 MB.
- Asset: Kenney CC0 hoặc tự dựng bằng code.
- `npm run verify` chạy `test/maps.test.mjs`: renderer 2D hợp lệ khi gọi `createBoard2D` và `skin.js` qua `defineSkin` không lỗi (chạy được trong Node, không cần canvas).

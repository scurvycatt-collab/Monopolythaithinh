# Kind khai báo có sẵn

Slot nhận một trong ba dạng (`docs/contracts/map-skin.md` §5): `{ kind, … }`, `{ paint, draw }` tự vẽ, hoặc trộn
`kind` với `paint` (mặt ô) và `under` / `over` (vẽ thêm). Danh sách kind và slot được dùng nằm ở `packs.js`.

## `kit` — ghép khối Kenney Isometric Buildings

Slot: `house`, `resortHouse`. Cần `packs: ['kenney-iso-buildings']`.

```js
house: { kind: 'kit', levels: [ /* 5 cấp 0–4 */ [[0, 0, ['128']]], [[0, 0, ['016'], '069']], … ],
         wall: 'zone' | '#hex', snow: 'zone' | true, heights: [0.1, 0.6, 0.95, 1.3, 2.1],
         sign: 'HOTEL' | false, signY: 1.71, under(p, c) {…}, over(p, c) {…} }
```

| Tham số | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `levels` | mảng 5 (`house`) / 4 (`resortHouse`) cấp | bắt buộc | mỗi cấp là mảng chồng khối, xem dưới |
| `wall` | `'zone'` \| `'#hex'` | trắng (`#ffffff`) | màu tường; `'zone'` = `zone.wall` (không có zone / thiếu `wall` → trắng) |
| `bright` | số (0, 1.25] | `0.8` | hệ số sáng tường sau khi tô `wall`; `wall: '#ffffff'` + `bright: 0.8` ra xám ~204. Tăng (ví dụ `1`) cho tường sáng hơn |
| `snow` | `'zone'` \| `true` \| `false` | `false` | phủ tuyết nửa trên mái |
| `heights` | mảng 5 (`house`) / 4 (`resortHouse`) số | `[0.1, 0.6, 0.95, 1.3, 2.1]` (`resortHouse` dùng 4 số đầu) | chiều cao khối theo cấp (đơn vị thế giới), dùng cho bóng đổ và `signY` mặc định của `resortHouse`; sai độ dài → lỗi lúc tải |
| `sign` | `string` \| `false` | `labels.hotel` (`house`, mặc định `HOTEL`) / `labels.resort` (`resortHouse`, mặc định `RESORT`) | chữ biển trên nóc, chỉ ở cấp 4; `false` ẩn biển và 2 cờ |
| `signY` | số | `house`: 1.708; `resortHouse`: `heights[3]·0.81 + 0.02` (1.073) | độ cao `y` chân biển (đơn vị thế giới); thân biển cao 0.32 |
| `under(p, c)`, `over(p, c)` | hàm | không | vẽ thêm trước / sau khối |
| `assets(c)` | hàm → mảng tên sprite | không | khai báo sprite riêng (lazy) cần tải theo state |

Ví dụ: `house: { kind: 'kit', levels, wall: 'zone', snow: 'zone', sign: 'KHÁCH SẠN', signY: 1.9 }`.

- **Không có cấp rỗng**: mỗi cấp phải là mảng có ít nhất một chồng khối, nếu không `defineSkin` báo `slots.house.levels[n] phải là mảng chồng khối …` ngay lúc tải. Chồng có `[tầng]` rỗng qua được kiểm tra nhưng không có tầng nào để vẽ (chỉ còn mái, lệch vị trí): đừng dùng. Muốn cấp "trống" hoặc rất nhẹ: dùng mảnh thấp, ví dụ cấp 0 của Bốn Mùa là `[[0, 0, ['128']]]` (kèm cờ tự vẽ); muốn không vẽ gì (hoặc cấp tự do), bỏ `kind` và viết `house: { draw(pen, c) { if (!c.level) return; … } }`. `draw` không vẽ gì cho ra sprite `null` và khung xương bỏ qua. Lưu ý dạng `draw` không có cờ cấp 0, biển, cờ cấp 4: tự vẽ.
- Mỗi cấp là mảng chồng khối `[gx, gz, [tầng dưới → trên], mái?]`; tên mảnh là số file trong pack (`000` … `128`).
- `house` có 5 cấp (0 = đất có cờ, 4 = Khách sạn), `resortHouse` có 4 cấp (số resort cùng chủ).
- Điểm ảnh đỏ của mảnh (mái, khung cửa hàng) tô màu chủ; tường tô `wall` (`'zone'` = `zone.wall`).
- `snow`: phủ tuyết nửa trên mái (`'zone'` = `zone.snow`).
- Cấp 4: biển `sign` trên nóc và hai cờ màu chủ. `heights` chỉ dùng tính bóng đổ.
- `under` / `over`: vẽ thêm trước / sau khối (cây, sân trước); bút đặt ở tâm vùng cỏ, `c.w` = bề ngang khối.

## `sprite` — chọn sprite Nature Kit

Slot: `deco`, `resort`, `chance`, `tax`, 4 góc. Cần `packs: ['kenney-nature']`.

```js
deco: { kind: 'sprite', pick: ['tree_oak', 'tree_fat'], count: 3, tint: 'zone', scale: 1, z: -1.2 }
```

- Mỗi ô chọn ngẫu nhiên lặp lại được theo `c.seed`; `count` cây xếp đều dọc ô.
- `tint`: `'zone'` (theo `zone.id`), một mùa cố định, hoặc `'none'`.
- `z`: vị trí theo chiều sâu ô (mặc định giữa vùng cỏ, hàng sau nếu nhiều cây).

## Tuỳ chọn chung mọi slot ô

| Trường | Ý nghĩa |
|---|---|
| `paint(g, c)` | tô mặt ô lên texture (điểm ảnh `c.cw × c.ch`; ô thường chỉ là vùng cỏ, dải giá do khung xương vẽ) |
| `side: ['#hex', '#hex']` | màu thành ô (mặt sáng, mặt tối), ví dụ ô nước |
| `label: [x, y, cỡ, rộng] \| false` | vị trí nhãn góc (tỉ lệ ô), `false` để ẩn |

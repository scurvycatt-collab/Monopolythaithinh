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

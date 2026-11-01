# Bút vẽ (Pen) cho skin 2D

Hàm `draw(pen, c)` của slot nhận `pen` đã đặt gốc đúng chỗ (xem `docs/contracts/map-skin.md` §5).
Đơn vị là đơn vị thế giới: một ô thường rộng 1.7, sâu 3.1; ô góc 3.1 × 3.1. `y` lên trên, mặt ô ở `y = 0`.
Chiếu isometric cố định, nắng từ +x: mặt +x sáng, mặt +z tối hơn, mặt trên sáng nhất.
Ô cạnh 1 và 3 nhận bút đã soi gương x ↔ z; skin vẽ y như cạnh 0, không cần xử lý.

## Khối

| Hàm | Vẽ |
|---|---|
| `box(x, y, z, w, h, d, col, o?)` | hộp, góc nhỏ nhất (x, y, z); `o = { top, left, right, edge }` (`edge: null` bỏ viền sáng) |
| `rbox(x, y, z, w, h, d, col, yaw?, pitch?)` | hộp xoay quanh tâm đáy |
| `solid(pts8, col)` | khối lục diện bất kỳ: 4 đỉnh đáy rồi 4 đỉnh trên |
| `gableX / gableZ(x, y, z, w, d, rise, col, ov?, wall?)` | mái hai dốc, nóc theo trục x / z |
| `hip(x, y, z, w, d, rise, col, ov?)` | mái chóp bốn mặt |
| `cyl(x, y, z, r, h, col)`, `cone(…)`, `ball(x, y, z, r, col)` | trụ, nón, cầu (tô gradient) |
| `terrain(cells, cs, deco?)` | địa hình cột khối `{ x, z, h, top, side }` |

## Mặt phẳng, đường, chữ

| Hàm | Vẽ |
|---|---|
| `poly([[x, y, z]…], fill, stroke?, lw?)` | đa giác 3D |
| `ground(x0, z0, x1, z1, col, y?)`, `quadX(x, z0, z1, y0, y1, col)`, `quadZ(z, x0, x1, y0, y1, col)` | hình chữ nhật nằm / đứng |
| `flatEllipse(x, y, z, rx, rz, col, a?)` | elip nằm ngang |
| `line3(pts, col, w)` | đường gấp khúc, `w` theo đơn vị thế giới |
| `shadow(x, z, w, d, h, a?)`, `ellipseShadow(x, z, r, a?)` | bóng đổ khối / bóng tròn |
| `textZ / textX(str, x, y, z, h, col)` | chữ trên mặt +z / +x |
| `textD(str, x, y, z, h, col, stroke?)` | chữ đứng quay thẳng về người xem |
| `texture(cv, x0, z0, w, d, y?)` | dán canvas phẳng lên mặt ngang |

## Vật dựng sẵn

`disc`, `puff` (khói), `flag(x, z, h, col)`, `flagC(x, z, h, col, t?, base?)` (cờ khối),
`bunting(a, b, cols, sag?, n?, lantern?)` (dây cờ / đèn lồng), `cubeTree(x, z, s?)`.

## Sprite

| Hàm | Vẽ |
|---|---|
| `nat(tên, x, z, cỡ?, tô?, bóng?)` | sprite Nature Kit (pack `kenney-nature`, tên trong `meta.json`). `tô`: `'none'`, `'spring'`, `'summer'`, `'autumn'`, `'autumnRed'`, `'winter'` |
| `img(tên, x, z, cao?, y?)` | sprite riêng trong `skin.sprites`, đáy giữa chạm đất |
| `sprite(s, x, z, y?, scale?)` | sprite nướng `{ canvas, ax, ay, k }` |

## Gốc toạ độ và tiện ích

- `pen.at(x, y, z)`: bút mới có gốc dời tới điểm đó.
- `pen.p(x, y, z) → [sx, sy]` điểm ảnh; `pen.ctx` là CanvasRenderingContext2D khi cần vẽ tự do; `pen.k` = điểm ảnh / đơn vị.
- `pen.u`: `rng(seed)`, `hash(x, z)`, `shade(hex, f)`, `mix(a, b, t)`, `light(hex, t)`, `wp(s, n, ox?, oz?)` (toạ độ trên mặt phẳng chéo quay về người xem).
- `c.layer()`: danh sách vẽ theo chiều sâu, `L.add(x, z, (p) => …, d?)` rồi `L.flush(pen)`.
- `c.grass(g, x, y, w, h, seed?, zone?)`: tô cỏ theo màu zone trên texture (dùng trong `paint`).

## Cửa sổ nướng

Mỗi sprite nướng vào một khung cố định, gốc bút ở tâm ô (hoặc tâm bàn cho `center`). Đơn vị **màn hình** (nhân `pen.k` ra điểm ảnh), không phải toạ độ thế giới; phần ra ngoài khung bị cắt, vùng trống tự cắt gọn sau khi nướng.

| Sprite | Trái … Phải | Dưới … Trên (so với gốc, lên là dương) |
|---|---|---|
| ô thường | −3 … 3 | −2.2 … 3.8 |
| ô góc | −3.4 … 3.4 | −2.4 … 4.6 |
| `center` | −9.4 … 9.4 | −5.2 … 7.2 (độ phân giải 0.72·`k`) |

`pen.k` theo mức chất lượng: 170 (high), 150 (medium), 110 (low). Đổi toạ độ thế giới sang màn hình: `sx/k = (x − z)·0.707`, `sy/k = (x + z)·0.354 − y·0.866`. `c.add(x, z, fn, d?)` (chỉ trong `center`) và `c.layer()` đều là danh sách vẽ theo chiều sâu; xem `map-skin.md` §5.

## Quy tắc

- `draw` thuần: không đọc thời gian, không giữ trạng thái. Kết quả được nướng một lần theo (slot, ô, cấp, màu).
- Vẽ trong khung ô; vật cao được phép vượt lên trên nhưng không lấn sang ô bên cạnh quá 0.3.
- Chuyển động chỉ trong `ambient.animate(pen, t, c)`, tổng ≤ 1 ms/khung.

# Contract: Map Renderer

Mọi map (3D three.js, 2D canvas, …) cắm vào game qua **một** giao diện này. `public/js/app.js` (UI, mạng, lobby) chỉ được gọi các hàm dưới đây, không import three.js hay chạm vào scene. Ngược lại renderer **không** đọc DOM ngoài canvas được giao, không gọi API mạng, không sửa `state`.

## 1. Đăng ký map

`public/rules.js` → `MAPS[]`:

```js
{ id: 'four-seasons', name: 'Bốn Mùa', description: '…', preview: 'maps/four-seasons/preview.svg', renderer: 'maps/four-seasons/renderer.js' }
```

- `id`: chữ thường, gạch nối, trùng tên thư mục `public/maps/<id>/`.
- `renderer`: đường dẫn ES module tương đối với `public/`. Thiếu `renderer` ⇒ dùng `maps/map-1/renderer.js`.
- Phòng lưu lựa chọn ở `state.settings.mapId`; map không tải được ⇒ client rơi về `map-1` và báo toast.

## 2. Thư mục map

```
public/maps/<id>/
  renderer.js     export default createRenderer
  preview.svg     ảnh nhỏ cho lobby
  map.json        (tuỳ chọn) dữ liệu trang trí, palette, toạ độ
  assets/         ảnh / model riêng của map
  README.md       ≤ 30 dòng: phong cách, nguồn asset (chỉ CC0 / tự dựng), việc còn thiếu
```

Một map **chỉ** được sửa file trong thư mục của nó. Dùng chung code thì đặt ở `public/js/render-common/` và ghi vào contract này.

## 3. API

```js
// public/maps/<id>/renderer.js
export default async function createRenderer(ctx) → Board
```

`ctx` (do app.js truyền, chỉ đọc):

| Trường | Ý nghĩa |
|---|---|
| `canvas` | HTMLCanvasElement đã gắn vào `#stage` (renderer không tự tạo canvas khác, trừ khi phải tạo lại context WebGL — khi đó thay đúng canvas này trong DOM) |
| `rules` | `window.RULES` (TILES, GROUPS, CONFIG, PETS) — không tự import |
| `game` | `window.Game` — chỉ dùng hàm **đọc** để suy ra từ `view` (`rentOf`, `outaged`, `festMult`, `ownedBy`); không gọi hàm đổi state |
| `base` | URL thư mục map, ví dụ `'maps/four-seasons/'` |
| `quality` | `'high' \| 'medium' \| 'low'` ban đầu |
| `onProgress(done, total, label)` | báo tiến độ tải |

`Board` (renderer trả về). Hàm có ★ là bắt buộc; còn lại có thể là no-op nhưng phải tồn tại.

| Hàm | Gọi khi | Hợp đồng |
|---|---|---|
| ★ `reset(view)` | ván mới, vào giữa ván, đổi người | Dựng lại toàn bộ theo `view`, **không** hoạt ảnh |
| ★ `sync(view) → Promise<ms>` | sau mỗi hành động | Cập nhật nhà, chủ đất, lễ hội, mất điện, Championships; trả về số ms hoạt ảnh xây nhà còn chạy (để UI hoãn đếm tiền) |
| ★ `moveToken(pid, path, opts) → Promise` | quân đi | `path`: mảng ô (0–31). `opts.jump`: đặt thẳng, không nhảy. `opts.onStep(tile)` gọi khi chạm từng ô. `opts.view` (tuỳ chọn): `view` mới nhất, để xếp chỗ đứng với các quân khác trên ô đích |
| ★ `rollDice(a, b) → Promise` | đổ xúc xắc | Resolve khi xúc xắc dừng |
| ★ `tileScreen(i, lift = 0) → {x, y}` | đặt overlay DOM | Toạ độ CSS px trong canvas của tâm ô `i`; `lift` (đơn vị thế giới, tuỳ chọn) nâng điểm lên trên mặt ô — dùng cho nhãn giá khi bán đất. Map 2D được bỏ qua `lift` |
| ★ `pick(x, y) → i \| null` | chạm / click | Ô dưới điểm CSS px |
| `tokenScreen(pid) → {x, y}` | đặt mũi tên, mặt cười | |
| `setActive(pid, color, glowPid = pid)` | đổi lượt, sau mỗi `renderHub` | Mũi tên báo lượt trên quân `pid` màu `color` (`pid = null` để ẩn). `glowPid`: quân có viền sáng — app truyền quân của chính mình ở chế độ mạng, quân đang tới lượt ở chế độ một máy |
| `effect(kind, tile)` | `'confetti'`, `'festival'` | Hiệu ứng một lần |
| `highlight(tiles, kind)` | bán đất, chọn ô World Tour, thẻ Chance | Làm tối cảnh, chỉ sáng `tiles`; `tiles = []` để tắt |
| `setQuality(level)` | đổi đồ hoạ | |
| `resize()`, `zoomBy(f)`, `fit()` | khung hình | |
| `start()`, `stop()` | tab hiện / ẩn, vào / rời game | `stop()` phải dừng hoàn toàn vòng vẽ |
| `destroy()` | rời phòng, đổi map | Giải phóng GPU, listener, timer |
| `stats() → object` | `window.__TT.perf` (đo hiệu năng, test) | Tuỳ chọn. Map-1 trả `{ graphicsLevel, activeFps, antialias, frame, calls, triangles, … }` |

Kéo / cuộn / chụm để zoom do renderer tự xử lý trên `canvas`. App nghe `pointerup` (bubble lên `#stage`) để nhận một lần chạm không kéo rồi gọi `pick(x, y)`. Tổng xúc xắc, nhãn giá bán đất, đồng hồ ván là DOM của app.

`view` = `publicView(state)` từ server (xem `public/game.js`). Renderer tự suy ra mọi thứ cần vẽ từ `view`; màu người chơi lấy từ `view.players[i].color`.

## 4. Quy tắc

- Mặt bàn 32 ô, đánh số như `rules.TILES`; 4 góc 0/8/16/24. Map được đổi hình, không được đổi số ô hay thứ tự.
- Không chặn luồng chính quá 50 ms khi tải; tải asset trong `createRenderer`, trước khi trả `Board`.
- Mức `low`: ≤ 200 draw call (3D) hoặc ≤ 4 ms/khung (2D) trên bàn trống.
- Asset chỉ Kenney CC0 hoặc tự dựng bằng code. Không dùng asset gốc Business Tour.
- Thay đổi contract = PR riêng, cập nhật file này trước rồi mới sửa code.

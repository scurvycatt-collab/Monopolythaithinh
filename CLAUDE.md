# Thái Thịnh Monopoly — hướng dẫn cho agent

Cờ tỷ phú kiểu Business Tour, chơi qua mạng (Node `server.js` hoặc Cloudflare Worker), client trình duyệt. Tiếng Việt trong code, docs và commit.

**Đọc file này trước, rồi chỉ mở đúng file trong bảng "Việc → đọc gì". Không đọc cả repo.**

## Bản đồ repo

| Đường dẫn | Vai trò | Owner |
|---|---|---|
| `public/rules.js` | Nguồn sự thật của luật, `MAPS`, `STATES` | game |
| `public/game.js` | Engine luật (UMD, chạy cả server và client) | game |
| `server.js`, `cloudflare/` | Server Node / Worker + Durable Object | game |
| `public/js/app.js` | UI, lobby, mạng, âm thanh; gọi renderer qua contract | game |
| `public/maps/<id>/` | Mỗi map một thư mục: `renderer.js`, `preview.svg`, `assets/` | render / art |
| `public/js/render-common/board2d/` | Khung xương 2D dùng chung: map mới chỉ viết skin | render |
| `public/assets/shared/` | Asset dùng chung nhiều map (Kenney packs), một bản duy nhất | art |
| `public/js/houses.js`, `specials.js`, `world.js` | Model 3D của map-1 (sẽ chuyển vào `public/maps/map-1/`) | render |
| `tools/map-lab/` | Trang thử nghiệm, chọn asset; không vào bản phát hành | art |
| `test/`, `scripts/` | Kiểm thử, sinh thumbnail / tài liệu luật | qa |
| `docs/contracts/` | API giữa các module — đọc thay vì đọc code module khác | lead |
| `docs/ARCHITECTURE/` | Chi tiết từng module | lead |

## Việc → đọc gì

| Việc | Đọc | Không cần đọc |
|---|---|---|
| Làm / sửa skin map 2D | `docs/contracts/map-skin.md`, `public/js/render-common/board2d/PEN.md`, `KINDS.md`, `public/maps/<id>/**` | khung xương, `app.js`, `game.js`, `server.js` |
| Tạo map mới | `npm run map:new <id>` rồi như dòng trên | |
| Sửa khung xương 2D | `docs/contracts/map-renderer.md`, `map-skin.md`, `public/js/render-common/board2d/**` | skin từng map |
| Sửa map-1 (3D) | `docs/contracts/map-renderer.md`, `public/maps/map-1/**`, `docs/ARCHITECTURE/render-map-1.md` | |
| Đổi luật / giá / thẻ | `public/rules.js`, `docs/ARCHITECTURE/rules.md` | renderer |
| Lobby, UI, âm thanh | `docs/ARCHITECTURE/client-ui.md`, `public/js/app.js` | `public/maps/**` |
| Mạng, phòng, bot | `docs/ARCHITECTURE/server.md`, `server.js`, `cloudflare/worker.js` | renderer |
| Test / hiệu năng | `package.json` (script `verify`), `test/` | |

Cần biết hàm X nằm đâu: `grep -n "function X" public/js/*.js` rồi đọc khoảng dòng đó, không đọc cả file.

## Quy tắc bắt buộc

1. `npm run verify` phải qua trước khi commit (hook `.githooks/pre-commit`, CI `.github/workflows/verify.yml`). Lần đầu: `npm run setup`.
2. Đổi model, màu, cấp nhà, texture → chạy `npm run thumbnails` rồi commit kết quả.
3. Đổi luật trong `rules.js` → `npm run rules:doc`.
4. Không push thẳng `main`. Branch `agent/<role>/<mã task>` (ví dụ `agent/render/T06`), mở PR, mô tả ghi mã task.
5. Chỉ sửa file trong phạm vi task ghi trên board. Cần đụng file ngoài phạm vi → dừng, ghi vào PR, để lead quyết.
6. Đổi API giữa module → sửa `docs/contracts/*` trước, PR riêng.
7. Asset: chỉ Kenney CC0 hoặc dựng bằng code. Không dùng asset gốc Business Tour.
8. Server luôn là trọng tài: client và renderer không tự đổi `state`.

## Trạng thái

Trạng thái ngắn và việc đang làm: `docs/HANDOFF.md`. Lịch sử thay đổi: `docs/CHANGELOG.md`.

## Môi trường thử (sandbox)

Chromium headless: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, mở `?low`. Chỉ được 1–2 khung hình/giây, chờ lâu. Google Fonts bị chặn, chỉ đổi font.

# Build, deploy, kiểm thử

Phạm vi: bản .exe (Bun), Cloudflare deploy, pipeline thumbnail, verify/CI, kiểm thử.
Code chính: `scripts/build-exe.mjs`, `scripts/generate-property-thumbnails.mjs`, `scripts/rules-doc.mjs`

## Bản .exe (Bun)
- `scripts/build-exe.mjs`: chép `public/` → `build/assets`, sinh `build/entry.js` import từng file kiểu `with { type: 'file' }` rồi gán `globalThis.__TTM_ASSETS`, sau đó `import('../server.js')`.
- Lệnh build: `npx bun@1.3.1 build --compile --target=bun-windows-x64`.
- Không nhúng thẳng `public/` vì server `require('./public/game.js')` sẽ bị Bun gộp thành đường dẫn file.
- `server.js` khi có `__TTM_ASSETS` (`PACKED`):
  - Đọc file tĩnh bằng `Bun.file`.
  - Lưu ván ở `data/` cạnh file `.exe`.
  - Tự mở trình duyệt (`OPEN=0` để tắt); trùng cổng thì chỉ mở trình duyệt rồi thoát.
- `GET /api/info` trả link Tailscale (MagicDNS nếu `tailscale status` chạy được) và LAN; phòng chờ hiện link đầu tiên kèm mã QR (`public/vendor/qrcode.mjs`).
- File `.exe` ~120 MB (chứa runtime Bun); chưa ký số nên SmartScreen cảnh báo lần đầu.
- Chưa thử trực tiếp trên Windows; chỉ thử bản Linux cùng mã bằng `TTM_BIN=… node test/e2e.js` và trình duyệt.

## Cloudflare deploy
- Kiến trúc Worker/Durable Object: `server.md`. Hướng dẫn deploy: `docs/CLOUDFLARE.md`.
- Thử cục bộ: `wrangler dev` rồi `TTM_URL=http://127.0.0.1:8787/ node test/e2e.js`.

## Thumbnail pipeline
- `npm run thumbnails` (script `scripts/generate-property-thumbnails.mjs`) sinh thumbnail/asset tĩnh (danh sách: `render-map-1.md`).
- `npm run verify` kiểm tra hash, danh sách file và cache version; commit/build/deploy dừng nếu quên sinh lại.

## Verify, CI, kiểm thử
- `npm run verify` chạy qua: hook pre-commit, CI GitHub, `build:exe`; gồm `scripts/rules-doc.mjs --check` (không sửa `docs/RULES.md`; sinh bằng `npm run rules:doc`).
- Mọi thay đổi map phải qua checklist `docs/contracts/map-parity.md`; test tự động chặn việc Map 2 hiện giá mua trên ô trống, sai kích thước quân hoặc phát thẻ di chuyển sai thứ tự.
- `npm test` gồm `test/sim.js` (giả lập nhiều ván) và `test/e2e.js` (server thật qua HTTP).
- Đã thử hai trình duyệt chơi cùng một ván.
- Artifact claude.ai chạy chế độ một máy (không server).
- Môi trường thử sandbox: Chromium headless `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, mở `?low`, viewport nhỏ; chỉ 1–2 khung hình/giây nên chờ lâu. Google Fonts bị chặn (chỉ đổi font, không lỗi).

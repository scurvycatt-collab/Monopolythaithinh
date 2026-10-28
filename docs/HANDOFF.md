# Thái Thịnh Monopoly: bàn giao (27/10/2026, v1.5)

Mở conversation mới: đọc `CLAUDE.md`, file này, rồi chỉ file ARCHITECTURE đúng phần mình làm.

## Trạng thái
- Phần lõi xong: server làm trọng tài, client 3D chơi qua mạng, phòng chờ, nhận lại ghế, đi hộ, lưu ván, hết giờ, bot, khán giả.
- Chạy được: Node `server.js`, `.exe` Windows (v1.1), Cloudflare Worker (v1.5), chơi chung một máy khi không có server. Artifact claude.ai chạy chế độ này: https://claude.ai/artifact/9FVdGVAm4jgr122wB1hxaG
- Kiểm thử: `npm test`, `npm run verify`.

## Tài liệu theo module
| Module | File |
|---|---|
| Luật, engine, giá, thẻ | `docs/ARCHITECTURE/rules.md` |
| Server, Cloudflare, phòng, bot | `docs/ARCHITECTURE/server.md` |
| UI, mạng client, âm thanh | `docs/ARCHITECTURE/client-ui.md` |
| three.js map-1, đồ hoạ | `docs/ARCHITECTURE/render-map-1.md` |
| .exe, deploy, thumbnail, verify | `docs/ARCHITECTURE/build-deploy.md` |
| Mốc phiên bản | `docs/CHANGELOG.md` |

## Ràng buộc bản quyền (giữ nguyên)
Không dùng asset gốc của Business Tour (bundle unity3d, PNG trích xuất, bản AI vẽ lại). Chỉ dùng Kenney CC0 và mô hình dựng bằng code. Thông tin nguồn giữ trong tài liệu dự án, không hiện chú thích cố định trên giao diện game.

## Việc tiếp theo
Danh sách việc nằm ở task board; không liệt kê ở đây.
Ý chính cũ: (1) web app trên repo riêng tư nối Railway/Fly.io/Render tự deploy, cần ổ lưu cho `DATA_DIR` và mã phòng/mật khẩu; (2) `.exe` đã xong, có thể thêm ký số, chạy nền, tự khởi động cùng Windows; (3) có thể thêm nhiều phòng song song, PWA "Thêm vào màn hình chính".

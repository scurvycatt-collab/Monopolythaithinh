# Changelog

- **v1.1:** bản `.exe` một file (Bun) chạy local. Chi tiết: `ARCHITECTURE/build-deploy.md`.
- **v1.5 (27/10/2026):** bản Cloudflare (Worker + Durable Object), main menu username + room code, host/bot/khán giả, `EMPTY_ROOM_TTL_MS`, rejoin theo username, `connectionEpoch`, mức đồ hoạ `low`/`medium`/`high`, thumbnail sinh sẵn, đồng bộ luật Business Tour (giá/thuê tuyệt đối, thuế 10%, Chance đều `w: 1`).
- **v1.9.0 (02/11/2026):** map mới **Lumina-01** (neon, `public/maps/neon/`): nhà tháp kính + billboard 5 cấp, màu chủ = quầng chân nhà + tint, nền navy trơn, resort bãi biển neon (beach club), giữa bàn reactor + 6 công trình riêng, 4 nhân vật riêng (Vance, Nyx, Seraphina, K-9000; quân dựng bằng Blender, script trong `assets/pets/blender/`). Map **Isometric**. Khung xương 2D thêm `kit.bright`, `palette.rentText/rentShadow`. Bốn Mùa: tên 4 ô góc mới, bảng tên góc không bị che. Tạo phòng không còn mở nhầm bản đồ. `npm run verify` bắt biến chưa khai báo (CI chạy `npm ci`). Tài liệu skin bổ sung.
- Chi tiết kỹ thuật từng phần: `docs/ARCHITECTURE/`.

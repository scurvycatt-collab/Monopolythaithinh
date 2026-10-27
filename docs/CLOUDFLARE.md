# Chạy Thái Thịnh Monopoly trên Cloudflare

Bản Cloudflare dùng **Workers + Durable Objects**:

- `public/` là giao diện, do Workers Static Assets phục vụ.
- `cloudflare/worker.js`: chuyển `/events`, `/health`, `/api/*` vào Durable Object `GameRoom`. Phòng này giữ ván, chạy luật (`public/rules.js` + `public/game.js`, đúng bộ luật chính), lưu ván vào bộ nhớ của Durable Object, phát trạng thái qua SSE, tự đi hộ và kiểm tra hết giờ bằng alarm.
- API giống hệt `server.js`, nên trình duyệt không cần sửa gì. Mã QR "Mời cả nhà" tự dùng địa chỉ web của Worker.

Cấu hình nằm ở `wrangler.toml` (tên Worker `thai-thinh-monopoly`, binding `ROOM`, migration `v1` dùng SQLite).

## Deploy lần đầu (từ máy bạn)

```
npm install
npx wrangler login        # mở trình duyệt, đăng nhập tài khoản Cloudflare
npm run cf:deploy         # chạy npm run verify rồi wrangler deploy
```

Xong sẽ có link dạng `https://thai-thinh-monopoly.<tài-khoản>.workers.dev`. Muốn dùng tên miền riêng: Cloudflare dashboard → Workers & Pages → thai-thinh-monopoly → Settings → Domains & Routes → Add custom domain.

## Tự deploy mỗi khi push lên GitHub (Workers Builds)

1. Cloudflare dashboard → Workers & Pages → Create → Import a repository → chọn `scurvycatt-collab/Monopolythaithinh`.
2. Build command: `npm run verify`. Deploy command: `npx wrangler deploy`. Root directory: để trống.
3. Mỗi lần push lên nhánh `main`, Cloudflare kiểm tra luật rồi deploy. Kiểm tra fail thì không deploy.

## Thử trên máy trước khi deploy

```
npm run cf:dev                                  # chạy giống hệt Cloudflare tại http://localhost:8787
TTM_URL=http://127.0.0.1:8787/ node test/e2e.js  # chạy bộ thử server trên bản Cloudflare
```

## Lưu ý

- Mặc định chỉ có **một phòng** (`main`). Thêm `?room=ten-phong` vào các lệnh gọi API để tách phòng. Giao diện chưa có ô chọn phòng.
- Link Worker **công khai**: ai có link đều vào được phòng chờ. Trong phòng chờ có thể mời ra những ghế đang mất kết nối (nút ×).
- Kết nối SSE giữ Durable Object luôn hoạt động khi có người mở trang, nên tính vào thời lượng sử dụng của Durable Objects. Xem bảng giá Cloudflare Workers trước khi để chạy lâu dài.
- Ván lưu trong Durable Object, không lưu file `data/game.json`. Bản chạy local (`server.js`, `.exe`) vẫn giữ nguyên.

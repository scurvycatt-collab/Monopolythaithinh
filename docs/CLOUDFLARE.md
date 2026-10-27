# Chạy Thái Thịnh Monopoly trên Cloudflare

Bản Cloudflare dùng **Workers + Durable Objects**:

- `public/` là giao diện, do Workers Static Assets phục vụ.
- `cloudflare/worker.js`: trả `/health` trực tiếp, chỉ chuyển `/events` và `/api/*` vào Durable Object `GameRoom`. Phòng này giữ ván, chạy luật (`public/rules.js` + `public/game.js`, đúng bộ luật chính), lưu ván vào bộ nhớ của Durable Object, phát trạng thái qua SSE, tự đi hộ và kiểm tra hết giờ bằng alarm.
- API giống hệt `server.js`, nên trình duyệt không cần sửa gì. Mã QR "Mời cả nhà" tự dùng địa chỉ web của Worker.
- Trang đầu tiên chỉ phục vụ static assets và health check. Người chơi phải nhập username rồi tạo hoặc vào room; lúc đó trình duyệt mới mở SSE và đánh thức Durable Object của room.
- Mỗi room code là một Durable Object tách biệt. Link mời và QR giữ `?room=<mã>`. Khi room chờ không còn kết nối, alarm dư thừa được xóa; trạng thái vẫn lưu bền vững mà không chạy liên tục.

Cấu hình nằm ở `wrangler.toml` (tên Worker `thai-thinh-monopoly`, binding `ROOM`, migration `v1` dùng SQLite). Bản production chạy tại `https://game.nauagency.asia/monopolyThaithinh/`; Worker chuẩn hóa base path này trước khi chuyển API hoặc static asset, và không xuất bản `workers.dev`/preview URL.

## Deploy lần đầu (từ máy bạn)

```
npm install
npx wrangler login        # mở trình duyệt, đăng nhập tài khoản Cloudflare
npm run cf:deploy         # chạy npm run verify rồi wrangler deploy
```

Lệnh deploy gắn Worker vào hai route `game.nauagency.asia/monopolyThaithinh` và `game.nauagency.asia/monopolyThaithinh/*`. Bản không tạo URL `workers.dev`; bản ghi DNS `game.nauagency.asia` phải ở trạng thái proxied trong zone `nauagency.asia`.

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

- Room code dùng 3–24 ký tự chữ thường, số hoặc dấu gạch ngang. Room code giúp tách ván chơi, không phải mật khẩu; ai có link mời đều có thể vào phòng.
- Link Worker **công khai**: ai có link đều vào được phòng chờ. Trong phòng chờ có thể mời ra những ghế đang mất kết nối (nút ×).
- Kết nối SSE giữ Durable Object luôn hoạt động khi có người mở trang, nên tính vào thời lượng sử dụng của Durable Objects. Xem bảng giá Cloudflare Workers trước khi để chạy lâu dài.
- Ván lưu trong Durable Object, không lưu file `data/game.json`. Bản chạy local (`server.js`, `.exe`) vẫn giữ nguyên.

# LEAD — bàn giao cho chat điều phối

Cập nhật: 01/11/2026. Chat mới mở đầu: **"Đọc docs/LEAD.md, làm tiếp."**

## Vai của bạn (Lead · Opus 5.5 · effort medium)
Hệ thống hoá, chia việc, review, merge, giữ board. Không tự viết task lớn; task < ~30 dòng thì tự làm, còn lại giao agent.

## Khởi động (mỗi chat mới)
1. Gắn repo `scurvycatt-collab/Monopolythaithinh` (add_repo, access push), clone `--depth 1` vào `/home/claude/monopolythaithinh`.
2. `git config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'` (clone shallow chỉ theo dõi `main`, hook sẽ báo "chưa push" nếu thiếu).
3. Đọc file này + `CLAUDE.md`. Không đọc code trước khi có task.
4. Đọc board: `ArtifactData query` collection `tasks`, `where status != done`.

## Công cụ & link
- **Board:** https://claude.ai/artifact/4VVm66rSs5LqJ6LodCeFpN (collection `tasks`, doc id = mã task; trường: code, title, phase, role, status todo/doing/review/done, files, done, deps, pr, note). Ghi bằng `ArtifactData batch`, luôn kèm `if_version`.
- **GitHub:** GraphQL bị chặn → dùng REST: tạo PR `gh api repos/scurvycatt-collab/Monopolythaithinh/pulls -f head=… -f base=main -f title=… -F body=@file`; merge `gh api -X PUT …/pulls/N/merge -f merge_method=merge`; CI `gh api …/commits/<branch>/check-runs`.
- Commit/PR kết thúc bằng dòng attribution mà hệ thống nhắc trong phiên.

## Agent (định nghĩa trong `.claude/agents/`, gọi bằng `subagent_type`)
| Vai | Model · effort | Dùng khi |
|---|---|---|
| `render` | Sonnet · high | sửa khung xương 2D / map-1 3D |
| `render-heavy` | Opus · medium | đổi kiến trúc/contract, hoặc `render` hỏng 2 lần |
| `map-skin` | Sonnet · medium | map 2D mới / sửa skin |
| `game` | Sonnet · medium | luật, server, lobby, UI, chat |
| `qa` | Haiku · medium | test, verify, đo hiệu năng |
| `docs` | Haiku · low | tài liệu |

Nâng một bậc (Haiku→Sonnet→Opus) khi agent hỏng hoặc phải đoán ≥ 2 lần.

## Quy trình một task
1. Board: tạo/cập nhật task (files, done, deps) → `doing`.
2. `git worktree add -b agent/<vai>/<mã> ../wt-<mã> origin/main`.
3. Giao agent: worktree, mã task, file được sửa, tiêu chí xong, có cần trình duyệt không. Gom task nhỏ cùng vai vào một lần gọi.
4. Review: `git log`/`diff --stat`, xem ảnh nếu có, chạy `npm run verify`.
5. Push, mở PR (mô tả: thay đổi, đã thử, còn thiếu) → board `review` + số PR.
6. Gửi ảnh cho người dùng duyệt nếu đổi phần hình. Duyệt → merge → board `done`.

## Tiết kiệm token (bắt buộc)
- Trình duyệt chỉ khi task đổi phần hình; tối đa 1 ảnh/task. Task khác chỉ `npm run verify`.
- Báo cáo agent ≤ 10 dòng. Không đọc transcript agent.
- Bàn giao sang chat mới sau ~10 task hoặc khi context dày: cập nhật mục "Trạng thái" bên dưới, commit qua PR.

## Trạng thái (01/11/2026)
- `main` @ `89afc5f`. Maps trong `MAPS`: `map-1` (3D, mặc định), `four-seasons` ("Bốn Mùa Hà Nội"), `ben-10`, `ben-10-02` — 3 map sau chạy trên khung xương 2D. Collab đã thêm `docs/contracts/map-build-checklist.md`, `map-parity.md`, `docs/plans/`, `docs/reviews/`.
- Từ 28/10 collab thêm: chat người chơi, nhạc nền, World Tour bay về ô của mình, timeout phòng 12 giờ, Championships chỉ chọn ô của mình.
- **PR mở:**
  - #9 `T17` Isometric (skin thứ hai, 230 dòng, không sửa khung xương). Mergeable, nhưng `main` đã đổi nhiều; cần hỏi người dùng còn muốn giữ Isometric không, rồi rebase + chạy lại verify trước khi merge.
  - #1 của collab (Championships, chuyển host, v1.8.1) — không đụng, để người dùng/collab xử lý.

## Chờ người dùng quyết
1. **Ben 10:** `ben-10`, `ben-10-02` dùng nhân vật/thương hiệu Cartoon Network, trái quy tắc 7 trong `CLAUDE.md` (chỉ Kenney CC0 / tự dựng); repo đang public. Đã báo, người dùng chưa quyết. Không tự sửa.
2. Giữ hay đóng PR #9 (Isometric).
3. T11: chủ đề map tiếp theo.

## Backlog (board là nguồn chuẩn)
- T20 (docs, ưu tiên trước map mới): bổ sung tài liệu skin — 8 chỗ agent T17 phải đoán: `kit` không cho cấp rỗng; `center.draw` bị gọi 4 lần khi `zones: null`; `c.cw`/`c.ch`/`c.add` chưa ghi; cửa sổ nướng `center` cố định chưa nêu kích thước; `base`/`deco` mặc định trông thế nào; bảng tham số `kit` (`sign`, `signY`, `heights`). Kiểm lại với code hiện tại vì collab có thể đã sửa.
- T21 (qa): thêm kiểm tra `no-undef` vào verify (lỗi `RESORT_COLOR` từng lọt CI). Globals trình duyệt cần khai báo: `AbortController`, `URLSearchParams`, `DOMMatrix`.
- T18 (render): chữ ô góc Lost Island/Championships bị công trình che (Bốn Mùa) — kiểm lại vì collab đã đổi Bốn Mùa.
- T19 (game): chọn map ở màn tạo phòng có thể không ăn; server chỉ nhận `mapId` khi bấm Tạo phòng và phòng trống.
- T12 (map-skin): asset picker cho map mới, sau T11.
- T05 (lead): dọn Claude project "Mônpoly" — chỉ giữ một doc trỏ về repo.

## Bẫy môi trường đã gặp
- Hash thumbnail lệch do CRLF (Windows): đã sửa bằng `.gitattributes` + chuẩn hoá trong script (PR #2). Collab Windows cần `git add --renormalize .` một lần.
- `git push` báo "repository moved": remote đúng là `https://github.com/scurvycatt-collab/Monopolythaithinh.git`.
- Agent có thể dừng giữa chừng do giới hạn API: dặn commit sau mỗi bước; tiếp tục bằng SendMessage tới agent đó, không tạo agent mới.
- Chromium sandbox chỉ 1–2 khung/giây; `?low`; Google Fonts bị chặn.

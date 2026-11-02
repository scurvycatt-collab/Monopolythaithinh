# LEAD — bàn giao cho chat điều phối

Cập nhật: 02/11/2026. Chat mới mở đầu: **"Đọc docs/LEAD.md, làm tiếp."**

## Vai của bạn (Lead · Opus 5.5 · effort medium)
Hệ thống hoá, chia việc, review, merge, giữ board. Không tự viết task lớn; task < ~30 dòng thì tự làm, còn lại giao agent.

## Khởi động (mỗi chat mới)
1. Gắn repo `scurvycatt-collab/Monopolythaithinh` (add_repo, access push), clone `--depth 1` vào `/home/claude/monopolythaithinh`.
2. `git config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'` (clone shallow chỉ theo dõi `main`, hook sẽ báo "chưa push" nếu thiếu).
3. `npm ci`, rồi đọc file này + `CLAUDE.md`. Không đọc code trước khi có task.
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
- **Ngưỡng 80% usage (giới hạn 5 giờ):** khi ước lượng đã dùng ~80%, không giao task mới; làm nốt task đang chạy, cập nhật checkpoint, rồi hỏi người dùng duyệt trước khi chạy tiếp.
- **Checkpoint thay cho đọc lại context:** mỗi task dở dang phải có checkpoint đủ để làm tiếp (mục "Trạng thái" bên dưới + `note` trên board + commit trên nhánh). Chat mới / agent mới chỉ đọc checkpoint + file trong phạm vi task, không đọc lại hội thoại cũ hay transcript.
- **Không báo trạng thái hoàn thành trong chat** (02/11): ghi ngắn vào `note` trên board, người dùng tự đọc. Chat chỉ dùng khi cần hỏi/quyết định.
- Bàn giao sang chat mới sau ~10 task hoặc khi context dày: cập nhật mục "Trạng thái", commit qua PR.

## Uỷ quyền (02/11/2026)
Người dùng uỷ quyền lead **tự duyệt mọi đề xuất** (ảnh, phương án, merge PR khi CI xanh và verify qua). Vẫn báo kết quả + ảnh cuối cho người dùng xem lại; chỉ hỏi khi quyết định không đảo ngược được hoặc vượt ngưỡng 80% usage.

## Trạng thái (02/11/2026, 02:30)
- `main` có: T18 (#14 tên góc Bốn Mùa), T19 (#12), T20 (#11), T21 (#13 no-undef + `npm ci` trong CI → máy mới cần `npm ci`), T23 (#15 `kit.bright`, `palette.rentText`), T17 Isometric (#9, đã merge 02/11).
- **Map neon "Lumina-01" — PR #16 (draft), nhánh `agent/map-skin/T24`** (gộp sẵn nhánh nhân vật `agent/map-skin/T25`). Brief gốc: `docs/maps/neon-concept.md` (có spec 4 nhân vật); ảnh mẫu bố cục: `docs/maps/neon-ref-board.png`; brief kỹ thuật + danh sách "Cần khung xương": `public/maps/neon/BRIEF.md`. Đã chốt: nhà style B (tháp kính + billboard), màu chủ = quầng chân nhà + tint billboard/tháp phụ (×0.95), nền navy trơn `#0d1932`, 4 nhân vật Vance `#ffb81f` / Nyx `#1fd8ff` / Seraphina `#ff2fd2` / K-9000 `#a4ff1c` (id `neon-*`, sinh bằng `public/maps/neon/assets/pets/build-pets.mjs`).
- Harness chụp ảnh không nằm trong repo (scratchpad mất khi đổi máy): agent tự dựng lại từ `server.js` + Chromium headless `?low`.
- Có lúc một phiên Claude khác cũng đẩy lên nhánh neon: luôn `git fetch` và merge trước khi làm/push.

## Việc tiếp theo (theo thứ tự)
1. **T26 v2 — giữa bàn neon sát ảnh mẫu hơn** (`public/maps/neon/skin.js` slot `center`): người dùng thấy chưa hợp lý. So với `neon-ref-board.png`: tháp trung tâm phải là khối lớn, chiếm phần lớn giữa bàn, đặt trên bệ vuông bo góc cao nhiều tầng; đường vành đai bo tròn ôm sát quanh tháp, có dốc/cầu nối; cụm cao ốc dày đặc bám quanh bệ (không rải lác đác); billboard holo lớn (cá koi), chồng Data Cube kính to; bệ xúc xắc tròn có vạch chia như mặt đồng hồ; bản đồ thế giới holo nổi ở góc sau. Giữ không che ô/nhãn, nằm trong cửa sổ nướng `center`.
2. **T25 v5 — nhân vật thêm chi tiết, bám đúng spec** trong `docs/maps/neon-concept.md`: chân dung (tay máy vàng-đen của Vance, monocle AR có biểu đồ; bomber LED + tai mèo cơ khí + cyberdeck + kẹo cao su phát sáng của Nyx; váy sợi quang tím→hồng + áo lông phát sáng + tẩu dài khói hồng + mắt kim cương của Seraphina; vest nhung + sơ mi phanh + đầu CRT cong mắt xanh của K-9000) và quân cờ (siêu xe bay khí động học mạ vàng; drone nhện 4 chân chi tiết; hồ ly origami neon nhiều mặt gấp; máy slot có tay gạt, cửa sổ 777). Giữ màu/id, PNG 512 + SVG 220.
3. Sau 1–2: chụp toàn bàn với nhân vật mới, đối chiếu `docs/contracts/map-build-checklist.md`, bỏ draft và merge #16 (đã được uỷ quyền).
4. Backlog: VFX/emote/SFX nhân vật (game/render), vòng holo xoay thật + xe khuất sau nhà (render, khung xương), 10 mục "Cần khung xương" trong BRIEF.md, T05 dọn Claude project.

## Bẫy môi trường đã gặp
- Hash thumbnail lệch do CRLF (Windows): đã sửa bằng `.gitattributes` + chuẩn hoá trong script (PR #2). Collab Windows cần `git add --renormalize .` một lần.
- `git push` báo "repository moved": remote đúng là `https://github.com/scurvycatt-collab/Monopolythaithinh.git`.
- Agent có thể dừng giữa chừng do giới hạn API: dặn commit sau mỗi bước; tiếp tục bằng SendMessage tới agent đó, không tạo agent mới.
- Chromium sandbox chỉ 1–2 khung/giây; `?low`; Google Fonts bị chặn.

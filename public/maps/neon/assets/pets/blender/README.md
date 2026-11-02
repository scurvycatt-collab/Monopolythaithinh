# Quân cờ neon (Lumina-01) — dựng bằng Blender

Bốn quân cờ `../neon-*-token.svg` (T30) dựng hoàn toàn bằng code trong Blender (không asset ngoài), render kiểu
toon 2.5D cho khớp bàn cờ: camera trực giao el 30° / az 45° như `Pen`, mặt phẳng 3 tông, viền navy (inverted hull),
cạnh neon màu chủ phát sáng. Avatar (`*-avatar.png`) vẫn do `../build-pets.mjs` sinh.

| Quân | Khoá | Mẫu |
|---|---|---|
| `neon-vance` | `vance_b` | Vua kính đen, đai vàng |
| `neon-nyx` | `nyx_a` | drone nhện 4 chân |
| `neon-seraphina` | `sera_a` | hồ ly origami |
| `neon-k9000` | `k9_a` | máy slot "JACKPOT" |

## File

- `lib.py` — hình khối cơ bản, vật liệu, đế tròn chung, camera.
- `tokens.py` — model từng nhân vật (`CHARS`; các bản `*_a`/`*_b` khác là phương án đã loại).
- `toon.py` — chuyển sang toon (bảng màu phẳng `PAL`, mảng màu chủ `OWN_OBJ`, phóng nhân vật `CHAR_K`, viền `OUTLINE`)
  và xuất quân cho game (`export`).

## Tạo lại

Cần Python 3 + `bpy` 5.x (`pip install bpy`, Cycles CPU là đủ), `numpy`, `Pillow`, font DejaVu Sans Bold
(`/usr/share/fonts/truetype/dejavu/`, cho chữ JACKPOT / 7).

```sh
cd public/maps/neon/assets/pets/blender
for k in vance_b nyx_a sera_a k9_a; do python3 toon.py $k 0 export ..; done
```

Mỗi lần ~10 s. Ảnh trung gian ghi vào `$NEON_TOKEN_TMP` (mặc định `<tmp>/neon-token-renders`), không commit.

## Khung ảnh (quy ước renderer)

Renderer 2D vẽ ảnh vuông cạnh `H = TOKEN_HEIGHT·K` với điểm chân ở `(0.5H, 0.94H)` và tự vẽ elip màu chủ dưới chân.
`export` render 1320 px rồi thu về PNG 440×440 (bảng màu 256, nhúng base64 trong SVG 220×220 như các bộ trước):

- tỉ lệ cố định `PPU_OUT = 223` px / đơn vị Blender cho cả 4 quân (đĩa đế ≈ elip của renderer);
- tâm đế ở `x = 220`, `y = ANCHOR_Y·440 = 376` để cả đĩa đế + quầng nằm gọn trong khung (đáy ≈ 436 px như bộ cũ);
- quầng sáng (mặt nạ phát sáng làm mờ 3 lớp, `GLOW_R`) nướng sẵn vào alpha, mờ dần ở mép dưới.

Chỉnh nhanh: độ to nhân vật `CHAR_K`, độ dày viền `OUTLINE`, ống neon tối thiểu `MIN_EMIT_R`, mảng màu chủ `OWN_OBJ`.

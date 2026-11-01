# Brief Lumina-01 (map `neon`) — bản duyệt hướng T24

Nguồn ý tưởng: `docs/maps/neon-concept.md` (chủ sản phẩm). Đây là bản duyệt **hướng**, chưa phải asset cuối.

## 1. Câu chuyện
Trung tâm một đại đô thị lúc nửa đêm sau mưa: mặt đường đen bóng phản chiếu biển hologram. Người chơi là **Data Tycoon** thâu tóm node mạng, khu phố và trạm năng lượng. Không phải cyberpunk đổ nát: một thiên đường tư bản hào nhoáng, tốc độ cao, điện là tiền tệ.

## 2. Bảng màu
| Vai | Màu | Hex |
|---|---|---|
| Nền (Dark Charcoal / Midnight / Obsidian) | mặt ô theo cạnh | `#141a1c` `#1a1230` `#0e1a2c` `#15120c` |
| Đế bàn / thành | obsidian | `#0b0f1c` `#070a14` `#121a2e` |
| Neon cyan | công nghệ, dữ liệu, viền bàn | `#27e6ff` |
| Neon magenta | giải trí, may rủi (Data Cube) | `#ff3fb4` |
| Acid green | thuế, năng lượng (Tax, Power Grid) | `#b6ff3c` |
| Cyber gold | đất đắt, trung tâm | `#ffc83d` |
| Cảnh báo | Firewall | `#ff3b4e` |
| Portal | Warp Gate | `#9b6bff` |
Nhóm đất A…H: `#e8742a` rỉ cam, `#2fb87a` lục tối (Back Alley); `#ff3fb4`, `#9b6bff` (Nightlife); `#27e6ff`, `#3d7bff` (Cyber Financial); `#d9a521`, `#ffe14d` (Megacorp). Chữ giá thuê tối `#0a0e1a` vì dải nhóm đều sáng.
Màu người chơi giữ nguyên từ game (mái, cờ, bệ neon dưới nhà).

## 3. Vật liệu, ánh sáng, mật độ
- Vật liệu: khối Kenney tường tối (kit `wall` theo zone + `bright 0.9`), mái màu chủ; đế kim loại tối; mặt ô là lưới mờ + mạch điện (Circuit Traces) vẽ ngẫu nhiên lặp lại được theo `seed`.
- Ánh sáng: không có đèn thật. Neon = nét sáng + `shadowBlur` trên `pen.ctx`, **nướng sẵn vào sprite** (lõi trắng, quầng màu). Mỗi nhà có bệ neon màu chủ ("mạch thắp sáng ô").
- Mật độ: vừa. Mỗi ô đất ≤ ~6 nét neon; ô góc và trung tâm dày hơn; ô trống chỉ một cột đèn + thùng máy.

## 4. Ánh xạ concept → ô
| Concept | Ô | Hình |
|---|---|---|
| Start = Power Grid | 0 `START` | trạm biến áp, cuộn Tesla acid green, 4 trụ cáp vàng |
| Lost Island = Firewall | 8 `FIREWALL` | lồng laser đỏ 12 thanh, lõi bị khoá, chữ ACCESS DENIED |
| Championships = Neon Arcade | 16 `NEON ARCADE` | 4 máy arcade, marquee magenta, xu vàng |
| World Tour = Warp Gate | 24 `WARP GATE` | cổng xoáy tím + vòng cyan |
| Chance | 12, 20, 28 | Data Cube magenta nổi, dấu ? |
| Tax | 30 | cổng thu thuế acid green |
| Resort | 4, 14, 18, 25 | bệ sạc → 1–4 trụ pin màu chủ (Trạm sạc, Cụm pin, Trạm điện, Nhà máy năng lượng) |
| Giữa bàn | | Reactor Core (cột cyan, vòng xoay, vòng pulse ở ambient), mạch 4 hướng, 2 trụ mỗi cạnh |

Bốn cạnh theo thứ tự bàn và tiến trình giá: cạnh 0 (ô 1–7, nhóm A,B, rẻ) **Back Alley** (cam rỉ, dây điện) → cạnh 1 (9–15, C,D) **Nightlife** (magenta/tím) → cạnh 2 (17–23, E,F) **Cyber Financial** (cyan/trắng lạnh) → cạnh 3 (25–31, G,H, đắt nhất) **Megacorp HQ** (đen vàng). Tên 32 ô: `MAPS[].tileNames` trong `public/rules.js`.

Cấp nhà (kit Kenney + neon): 0 đất + cờ → 1 **Kiosk** → 2 **Văn phòng** → 3 **Tháp truyền thông** (antenna + đèn magenta) → 4 **Megacorp Tower** (biển MEGACORP, vòng vàng, tia lên trời).

## 5. Vì sao khác map đang có
- Bốn Mùa: sáng, pastel, mỗi cạnh một mùa, cỏ + cây. Lumina: nền gần đen, tách cạnh theo **giai tầng đô thị** chứ không theo thời tiết, không cây cỏ, sáng bằng neon.
- Isometric: sáng, nhiệt đới, ô góc là sân bay / núi / đảo. Lumina: ô góc là hạ tầng công nghệ (trạm điện, tường lửa, arcade, cổng dịch chuyển), tông lạnh tương phản.
- Không dùng chung asset hình ảnh của map khác: chỉ khối Kenney Iso Buildings (pack dùng chung, tường tối) và vẽ bằng code.

## 6. Moodboard và provenance
- Moodboard = bảng màu trên (swatch dựng bằng code, không ảnh tham khảo bản quyền) + ảnh review `neon-board.png`, `neon-levels.png` (scratchpad của task, chưa vào repo).
- Nguồn: (1) concept văn bản của chủ sản phẩm `docs/maps/neon-concept.md`; (2) Kenney Isometric Buildings CC0; (3) mọi thứ khác vẽ bằng code trong `skin.js`. Không dùng ảnh/nhân vật/logo có bản quyền.

## 7. Ngân sách đề xuất
- Ảnh rời: 0 PNG riêng (hiện), tất cả vẽ bằng bút; pack dùng chung `kenney-iso-buildings` chỉ cần ~24 mảnh đã có sẵn. Mục tiêu tải map ≤ 1 MB (< 2 MB của contract), `assets/` ≤ 0,3 MB nếu thêm sprite biển hiệu hán tự/katakana.
- Kích thước sprite: theo cửa sổ nướng chuẩn (ô 6 × 6 đv màn hình, `k` 110/150/170); dựng ≈ 0,8 s ở `low` (đo `meta.buildMs` 760 ms), mục tiêu ≤ 1,5 s ở `high`.
- Draw call: giữ như khung xương (sprite nướng); `ambient.animate` chỉ 1 vòng pulse (< 0,2 ms); `low` bỏ ambient.

## 8. Cần khung xương
Những chỗ khung xương hiện cản bản neon đẹp hơn (đề xuất cho owner render, không sửa trong T24):
1. **Không có phát sáng thật**: không blend `lighter`/bloom khi ghép sprite lên bàn; glow chỉ là quầng alpha nướng sẵn, không cộng sáng lên nền và không nhấp nháy theo thời gian (flicker, chạy xung mạch).
2. **Không có hạt mưa** (`particles` chỉ petals/sun/leaves/snow/none) và không có lớp phản chiếu ướt trên mặt đường.
3. **`ambient.animate` chỉ vẽ ở tâm bàn, bỏ qua ở `low`**: không có animation theo ô (biển hiệu nhấp nháy, xe bay Spinner chạy dưới bàn, mạch điện chạy dọc viền khi mua đất).
4. **Mạch điện nối ô theo chủ sở hữu** cần `tile.paint` biết chủ đất; hiện `paint` chỉ biết ô, nên bệ neon màu chủ phải vẽ trong `house.under`.
5. **Màu tường kit giới hạn**: `wall` tô cả khối bằng một màu, không tách tường tối / ô cửa sáng phát sáng; cửa sổ neon phải vẽ chồng bằng `over`. Cần `kind` khối "tòa nhà đêm" (cửa sổ sáng, biển) hoặc mảnh Kenney tối.
6. **`rentText` một màu cho cả bàn**: dải nhóm đất sáng chói nên phải dùng chữ tối; muốn chữ sáng trên nhóm tối cần tự chọn theo độ sáng (như `cityLabelBand` đã làm).
7. **Nền ngoài bàn**: canvas ngoài bàn trong lúc thử trắng (nền do app/CSS); map tối cần màu nền/vignette trang theo skin (`palette.page`).
8. **Chữ**: font ô lấy từ khung xương, không có font digital/LED hay chữ Hán/Katakana; chữ nhỏ trên ô thường khó đọc ở `low`.
9. **Sprite ô góc là ô vuông 3.1**: portal/laser cao dễ bị cắt ở mép trên cửa sổ nướng (−2.4…4.6).

# Brief Lumina-01 (map `neon`) — bản duyệt hướng T24

Nguồn ý tưởng: `docs/maps/neon-concept.md` (chủ sản phẩm). Đây là bản duyệt **hướng**, chưa phải asset cuối.

## 1. Câu chuyện
Trung tâm một đại đô thị lúc nửa đêm sau mưa: mặt đường đen bóng phản chiếu biển hologram. Người chơi là **Data Tycoon** thâu tóm node mạng, khu phố và trạm năng lượng. Không phải cyberpunk đổ nát: một thiên đường tư bản hào nhoáng, tốc độ cao, điện là tiền tệ.

## 2. Bảng màu
| Vai | Màu | Hex |
|---|---|---|
| Nền chung (T12) | mặt ô, tâm bàn, mặt bàn: navy đặc, phẳng, không lưới / mạch | `#0d1932` (Chance `#150f33`, Tax `#0c2030`, Resort `#0b1630`) |
| Đế bàn / thành | obsidian | `#0b0f1c` `#070a14` `#121a2e` |
| Neon cyan | công nghệ, dữ liệu, viền bàn | `#27e6ff` |
| Neon magenta | giải trí, may rủi (Data Cube) | `#ff3fb4` |
| Acid green | thuế, năng lượng (Tax, Power Grid) | `#b6ff3c` |
| Cyber gold | đất đắt, trung tâm | `#ffc83d` |
| Cảnh báo | Firewall | `#ff3b4e` |
| Portal | Warp Gate | `#9b6bff` |
Nhóm đất A…H: `#e8742a` rỉ cam, `#2fb87a` lục tối (Back Alley); `#ff3fb4`, `#9b6bff` (Nightlife); `#27e6ff`, `#3d7bff` (Cyber Financial); `#d9a521`, `#ffe14d` (Megacorp). Chữ giá thuê tối `#0a0e1a` vì dải nhóm đều sáng.
Màu người chơi lấy từ game (palette neon mới T25); xem mục Màu chủ.

## 3. Vật liệu, ánh sáng, mật độ
- Vật liệu: khối Kenney tường tối (kit `wall` theo zone + `bright 0.9`), mái màu chủ; đế kim loại tối; mặt ô là navy đặc `#0d1932`, phẳng (T12 bỏ lưới và mạch điện cho dịu mắt; chỉ giữ viền ô, dải giá, vòng đồng tâm ô góc).
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
| Giữa bàn | | Lò dữ liệu + đường vành đai + 6 công trình riêng (T26 v3, xem mục Giữa bàn) |

Bốn cạnh theo thứ tự bàn và tiến trình giá: cạnh 0 (ô 1–7, nhóm A,B, rẻ) **Back Alley** (cam rỉ, dây điện) → cạnh 1 (9–15, C,D) **Nightlife** (magenta/tím) → cạnh 2 (17–23, E,F) **Cyber Financial** (cyan/trắng lạnh) → cạnh 3 (25–31, G,H, đắt nhất) **Megacorp HQ** (đen vàng). Tên 32 ô: `MAPS[].tileNames` trong `public/rules.js`.

Cấp nhà (T12, chủ sản phẩm chọn phương án B ngày 02/11; vẽ bằng bút, mái phẳng, glyph giả katakana, không chữ/logo thương hiệu): tháp kính mảnh trên đế podium tối, cửa sổ dày cyan/vàng/magenta, viền neon dọc, biển hologram nổi (tấm trong suốt + glyph), bệ neon và vòng viền màu chủ. 5 cấp: 0 bãi đất + cờ màu chủ + vòng cyan → 1 **Kiosk** (một tháp 0,95 + khối phụ, antenna) → 2 **Văn phòng** (tháp 1,5 có bậc + tháp phụ, đĩa vệ tinh) → 3 **Tháp truyền thông** (3 tháp nối cầu, 2 biển hologram, antenna đỏ) → 4 **Megacorp Tower** (tháp chính 2,0 + 3 bậc, 3 tháp phụ, vòng chủ + vòng vàng, tia và quả cầu vàng lên trời).

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
- Draw call: giữ như khung xương (sprite nướng); `ambient.animate` chỉ 5 chấm xe + 1 chấm vòng hologram (< 0,2 ms); `low` bỏ ambient.

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
10. (T12) `kind` nhà không cho kích thước chân đế / mái phẳng / cửa sổ sáng theo tầng: nhà neon phải dùng `draw` thuần nên mất cờ cấp 0, biển cấp 4 và hai cờ tự có của `kit`; tự vẽ lại. Cần hoặc `kit` hỗ trợ mảnh tối + cửa sổ phát sáng, hoặc `kind: 'tower'` (mô-đun xếp tầng, lưới cửa sổ, biển dọc).

## Màu chủ (T12, chốt 02/11)
Một chế độ duy nhất, gộp hai kiểu cũ: **bệ sáng** màu chủ dưới nhà / resort (hai lớp glow + vòng) và **nhuốm** (biển hologram, tháp phụ, viền neon dọc, viền kính, vòng đỉnh). Mọi độ sáng / alpha màu chủ nhân hệ số `OWN = 0.95` (giảm 5%): màu qua `mixHex(c.color, OWN)`, alpha bệ 0.38→0.361 và 0.72→0.684, hologram 0.28→0.266. Resort dùng quầng bệ thu nhỏ (`bl = 0.6`, bán kính 0.56) để không lem sang nhãn giá. Không còn công tắc `OWNER_MODE`. Màu luôn lấy từ `c.color`.

## Giữa bàn (T26 v3, theo ảnh tham khảo `docs/maps/neon-ref-board.png` của chủ sản phẩm, chỉ lấy bố cục / không khí, không chép)
Vẽ hoàn toàn bằng bút, một lần (`center.draw` chỉ chạy ở `side 0`, mọi vật qua `c.add` để xếp chiều sâu chung); không chữ, không logo. Xúc xắc khung xương nằm quanh (1, 1) nên khối tháp lùi về sau.
- **Data Tower** tâm (−1.5, −1.5) trên **bệ vuông bo góc 3 tầng** (nửa cạnh 1.75 / 1.38 / 1.0, cao 0.3 / 0.62 / 0.95), mặt bên tối sáng dần về +x, viền neon cyan / magenta / cyan, dải đèn giữa thân, cầu thang hai mặt trước; trống đế + thân sọc sáng, ống kính có cột sáng, đĩa vàng giữa, đĩa đỉnh rộng 0.72, chóp + cầu cyan (y ≈ 3.2, dưới nhãn ô góc xa); 3 vòng hologram (r 1.0–1.32) tách nửa sau / trước. **v3 (review chủ sản phẩm):** thêm máy móc cho lò — 24 cánh tản nhiệt quanh trống đế, 4 bồn làm mát viền lime trên tầng 1 có ống dẫn vào thân, 2 vòng giàn thép (y 1.82 / 2.48) với cột đỡ và đèn vàng.
- **Đường vành đai** ôm sát bệ: vuông bo góc nửa cạnh 2.5, rộng 0.36, cao 0.55, góc trước bo rộng 1.4 để chừa bệ xúc xắc; thành cầu, viền cyan ngoài / magenta trong, vạch vàng, đèn xe nướng sẵn; **2 dốc** xuống phố ở mặt trước phải / trái nối với 2 phố có vạch neon.
- **Bỏ cụm cao ốc lưới** (trùng kiểu tháp kính ở ô). Thay bằng 6 công trình riêng, không dùng `block` / `wins` / `spire` / `antenna` / `dish` của nhà ô, không lưới cửa sổ: **tháp biển cá chép** (trụ tròn sọc neon dọc, biển cá chép treo nổi trên giá, giàn thép đèn trên đỉnh biển) ở (−3.45, 1.62); **khối bậc thang** 4 tầng lùi, dải kính liền, vườn sân thượng, vòm kính (−4.6, 3.0); **két dữ liệu** bọc thép trên đế sọc cảnh báo, khoang kính lộ tủ máy chủ có LED, cửa két tròn mặt +x, 2 quạt mái (2.45, −2.75); **ga monorail** trên cạnh phải vành đai (sân ga hai bên, mái vòm, toa con nhộng) + **cầu kính** sang két; **cột ăng-ten** giàn tam giác thon, giằng chéo, đèn đỏ, 3 chảo trên cột + 2 chảo đất, nhà máy phát (−1.55, 4.95); **trạm bồn** 3 bồn làm mát, ống góp chạy dưới vành đai vào bệ (−4.95, −1.3). Tránh mép gần (nhà ô vẽ đè lên ảnh giữa bàn); chiều cao kẹp bởi `hMax(x, z)`.
- **Chồng Data Cube kính** 6 khối ở (−2.5, 3.45); **bản đồ thế giới hologram** quay mặt về người xem dời ra (5.0, −3.0) để không che két dữ liệu, lưới chấm theo vài elip giản lược.
- **Bệ xúc xắc** (`paint`, tâm (1.15, 1.15), r 1.0): nền tối, quầng + vòng đôi cyan, vòng đứt magenta, 60 vạch chia như mặt đồng hồ (12 vạch lớn), 12 chấm vàng / magenta quanh vành.
- **Chuyển động** (`ambient.animate.cityFx`, `low` bỏ qua): 6 chấm xe trên nửa trước vành đai + 1 chấm sáng quay trên vòng hologram giữa.
- Ảnh review: `neon-board-v6.png` (scratchpad của task, chưa vào repo). Đo `?low` bàn trống: `stats().ms` ≈ 1.9 ms/khung.
- Tài liệu thiếu: vị trí xúc xắc không ghi trong contract; đo từ ảnh chụp (quanh (1, 1)).

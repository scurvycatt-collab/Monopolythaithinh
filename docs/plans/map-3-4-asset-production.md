# Kế hoạch sản xuất asset Map 3 và Map 4

## Tiến độ thực tế (2026-10-30)

- Map 3: M3-A → M3-E hoàn tất, 65/65 asset PASS QA độc lập.
- Map 4 M4-A: 16/16 asset board/trung tâm PASS.
- Map 4 M4-B: 10/10 asset ô đặc biệt/trạng thái PASS.
- Map 4 M4-C: 20/20 asset công trình (Ben, Gwen, Kevin, Rook × 5 cấp) PASS theo từng owner; thumbnail popup lấy từ exact master.
- Map 4 M4-D: 5 resort, 4 token và 4 avatar đã tích hợp runtime, có contact sheet/metadata alpha thật và PASS QA độc lập.
- Map 4 M4-E: 8 décor và 5 output UI đã PASS QA độc lập; cold-load 2.383.540 byte (dưới 2,5 MiB), source master bị loại khỏi static deploy.
- Cả Map 3 và Map 4 đã hoàn tất asset, parity rule chung và QA; đủ điều kiện commit/deploy.

Trạng thái: **chưa được phép deploy**. Hai map chỉ được commit/deploy khi mọi asset
trong manifest đạt cổng QA độc lập và ảnh render tích hợp được chủ sản phẩm duyệt.

## 1. Mục tiêu và ranh giới

- Map 3 (`ben-10`) là thế giới Ben 10 mặt đất: Bellwood/Plumber, Pyron,
  Petropia và Null Void. Phong cách hoạt hình 3D sáng, hình khối sạch, dễ đọc.
- Map 4 (`ben-10-02`) là bàn Ben 10 ngoài không gian theo ảnh tham chiếu đã gửi:
  nền sao, Omnitrix lớn ở giữa, tám khu hành tinh/công trình dày chi tiết và ánh
  sáng neon xanh. Không dùng lại visual của Map 3.
- Asset 3D trong pipeline này là **render 3D isometric nền trong suốt**, được nén
  thành WebP/PNG và cache sẵn. Engine không dựng ảnh popup hay landmark lúc chạy.
- Deliverable là sprite raster render theo phong cách 3D, không phải model có thể
  xoay/chỉnh sửa (`.glb/.gltf/.blend`). Việc đổi renderer sang true 3D nằm ngoài
  phạm vi skin này và phải được duyệt riêng nếu cần.
- Luật, giá, rent, vị trí, nhận thẻ, di chuyển và animation xúc xắc vẫn dùng module
  chung. Skin chỉ ánh xạ asset và tên hiển thị theo index.

## 2. Chuẩn kỹ thuật bắt buộc

| Loại | File nguồn cuối | Canvas | Góc nhìn | Quy tắc |
|---|---|---:|---|---|
| Landmark/ô góc | WebP alpha | 1024×1024 | isometric 3/4, camera cố định | không chữ, không nền, bóng mềm trong footprint |
| Nhà/cấp đất | WebP alpha | 768×768 | cùng camera landmark | chân giữa, cùng footprint envelope |
| Quân cờ | WebP alpha + avatar PNG | 768×768 | isometric 3/4 | cùng chiều cao theo `TOKEN_HEIGHT` |
| Môi trường nhỏ | WebP alpha | 512×512 | cùng camera | tối đa 2–3 vật thể/cụm |
| Preview | WebP | 640×400 | camera thật trong game | tạo từ renderer, không vẽ mockup |

- Mọi asset không có chữ tạo bởi AI; chữ/tên địa danh vẽ bằng code để không sai.
- Không watermark, không nền vuông, không viền cắt, không vật thể thừa.
- Màu sở hữu phải là lớp tint/biển/cờ do renderer áp dụng, không bake cứng vào
  hình nếu asset dùng cho nhiều người.
- `PROPERTY_TILE_RATIO` là envelope: footprint rộng ≤ 84% ô, sâu ≤ 58% ô, cao
  ≤ 125% chuẩn. Năm cấp dùng `PROPERTY_LEVEL_SCALE` chung.
- File có manifest gồm ID, prompt, nguồn, checksum, kích thước và trạng thái QA.

### Reference đã khóa

| Map | File | SHA-256 | Trạng thái |
|---|---|---|---|
| Map 3 | `docs/references/map-3-ben10-approved.png` | `8B85AC8F939279268AEE108D1C7D27D7B310BDC75A73CDEFB2D93A5D374473E5` | LOCKED — owner approved |
| Map 4 | `docs/references/map-4-ben10-02-approved.png` | `AF267711178BED274C8E86CDB5AC71446429AACA7916DCCC4240123D65252488` | LOCKED |

Mọi ảnh so sánh dùng viewport 1600×1000, cùng camera/zoom với script review. QA
lưu ảnh current, reference crop, overlay 50% và diff vào `docs/reviews/map34/`.

### Metadata bắt buộc của từng asset

Mỗi record manifest phải có: `id`, `mapId`, `batch`, `path`, `sourceRef`,
`prompt`, `canvas`, `alpha`, `footAnchor`, `worldScale`, `depthOffset`, `tileIndexes`,
`useCases`, `sha256`, `bytes`, `qaStatus`, `qaEvidence`. Popup thumbnail phải được
sinh từ chính master asset dùng trên bàn, không có bộ hình song song.

### Ngân sách định lượng

- Tổng tải ban đầu mỗi map ≤ 2,5 MB; mỗi asset WebP ≤ 180 KB; preview ≤ 80 KB.
- Cold entry chỉ tải board base, center, special và landmark đang thấy. Công trình,
  resort, token/state chưa xuất hiện phải lazy-load theo state, cache một lần và
  preload có ngân sách sau first-visible; QA lưu danh sách request cho home/cold entry.
- Dựng board ≤ 500 ms trên máy desktop QA; first-visible ≤ 1,5 giây khi cache và
  ≤ 3 giây cold load.
- High: idle ≥ 55 FPS, roll/move ≥ 50 FPS; Low: ≥ 30 FPS.
- Sau 5 lần vào/rời: không tăng quá 1 canvas/listener và không còn RAF/timer map cũ.
- Trang chủ tải đúng 1 preview của map chọn, không tải landmark/building/token.

## 2.1. Ánh xạ 32 ô — khóa trước khi dựng

| i | Loại/nhóm | Map 3 | Map 4 | Khu/asset décor |
|---:|---|---|---|---|
| 0 | Start | Hero Start | Omnitrix Start | start gate riêng map |
| 1 | A | Bellwood | Bellwood Orbit | đô thị xanh/Plumber |
| 2 | A | Undertown | Undertown Station | đô thị xanh/Plumber |
| 3 | A | Plumber HQ | Plumber Command | đô thị xanh/Plumber |
| 4 | Resort | Galvan Prime | Galvan Prime | resort/cổng dịch chuyển |
| 5 | B | Khoros | Khoros Forge | dung nham/forge |
| 6 | B | Kylmyys | Kylmyys | dung nham/forge |
| 7 | B | Pyros | Pyros | dung nham/forge |
| 8 | Island | Null Void | Null Void | prison/portal riêng map |
| 9 | C | Ledgerdomain | Ledgerdomain | neon tím |
| 10 | C | Anur Transyl | Anur Transyl | neon tím |
| 11 | C | Anur Phaetos | Anur Phaetos | neon tím |
| 12 | Chance | Omnitrix Chance | Omnitrix Charge | device biến thể 1 |
| 13 | D | Petropia | Petropia | pha lê cyan |
| 14 | Resort | Piscciss | Piscciss | resort/vệ tinh |
| 15 | D | Galvan Mark II | Galvan Mark II | pha lê cyan |
| 16 | Championship | Galactic Cup | Galactic Championship | arena riêng map |
| 17 | E | Revonnah | Revonnah | metropolis bạc |
| 18 | Resort | Aldabra | Aldabra | resort/trạm quỹ đạo |
| 19 | E | Terradino | Terradino | metropolis bạc |
| 20 | Chance | Omnitrix Chance | Omnitrix Charge | device biến thể 2 |
| 21 | F | Encephalonus IV | Encephalonus IV | sa mạc đỏ |
| 22 | F | Turrawuste | Turrawuste | sa mạc đỏ |
| 23 | F | Xenon | Xenon | sa mạc đỏ |
| 24 | Tour | Plumber Tour | Plumber Tour | ship/portal riêng map |
| 25 | Resort | Primus | Primus | resort/pháo đài |
| 26 | G | Aranhascimmia | Aranhascimmia | rừng alien |
| 27 | G | Hathor | Hathor | rừng alien |
| 28 | Chance | Omnitrix Chance | Omnitrix Charge | device biến thể 3 |
| 29 | H | Osmos V | Osmos V | công nghiệp nâu |
| 30 | Tax | Plumber Tax | Plumber Tax | tax terminal riêng map |
| 31 | H | Luna Lobo | Luna Lobo | công nghiệp nâu |

Mỗi nhóm A–H có một landmark lớn sát cạnh tương ứng và ít nhất hai décor nhỏ
trên/giữa các ô thành phố. Bbox landmark không được lấn quá 15% vùng tâm và không
che text/strip màu. Map 4 phải đủ tám biome như reference, không rút còn bốn zone.

## 3. Asset Map 3 — `ben-10`

### M3-A · Board và trung tâm (9 asset)

1. `m3-board-base`: bệ Plumber hợp kim xanh đậm, cạnh bàn và glow xanh lá.
2. `m3-center-omnitrix`: Omnitrix 3D lớn, tâm bàn, không che xúc xắc.
3. `m3-zone-bellwood`: Bellwood + Plumber HQ, cây và đường phố.
4. `m3-zone-pyron`: đền/làng Pyronite, dung nham cam.
5. `m3-zone-petropia`: thành pha lê xanh cyan.
6. `m3-zone-nullvoid`: pháo đài/cổng Null Void tím.
7. `m3-center-prop-aliens`: vòng silhouette alien quanh Omnitrix.
8. `m3-dice-pad`: bệ xúc xắc trung tâm.
9. `m3-board-edge-lights`: đèn/cọc viền nhẹ, không lặp dày.

### M3-B · Ô đặc biệt (10 asset)

1. Hero Start gate.
2. Null Void detention/island.
3. Galactic Cup/Championship arena.
4. Plumber Tour ship/portal.
5–7. Ba biến thể Omnitrix Chance.
8. Plumber Tax terminal.
9. Festival banner hai cọc.
10. Power-outage marker có vùng đặt số trước dấu sét.

### M3-C · Công trình 4 người × 5 cấp (20 asset)

- Ben: đất/claim pad → trạm Omnitrix → căn cứ → tháp chỉ huy → Hero HQ.
- Gwen: rune pad → phòng phép → học viện → tháp mana → Anodite Citadel.
- Kevin: scrap pad → xưởng → garage → foundry → Tech Forge.
- Max: Plumber pad → tiền đồn → bunker → command post → Plumber HQ.

Mỗi cấp phải thay đổi silhouette thật, không chỉ phóng to. Màu chủ sở hữu nằm ở
cờ, đèn và trim; kết cấu chính giữ bản sắc nhân vật.

### M3-D · Resort và nhân vật (13 asset)

- Resort: trạng thái chưa mua + 4 cấp (5 asset).
- Ben, Gwen, Kevin, Max: mỗi người một quân cờ toàn thân và một avatar (8 asset).

Trạng thái nhân vật không tạo thêm sprite rời: idle/walk dùng translate/bob theo
delta-time; happy dùng face badge/pose overlay; disconnected/bankrupt dùng opacity
và badge chung. QA phải kiểm đủ các state này từ cùng token master.

### M3-E · UI và décor theo nhóm (13 asset)

- 8 cụm décor A–H tương ứng bảng index trên.
- Background trang chủ, preview map, player-card/avatar crop, popup master và
  result-state review (5 asset/output). Preview/popup được sinh từ master đã duyệt.

## 4. Asset Map 4 — `ben-10-02`

### M4-A · Board và trung tâm theo ảnh mẫu (16 asset)

1. `m4-board-base`: bệ không gian đen, viền kim loại + glow xanh Omnitrix.
2. `m4-center-omnitrix`: Omnitrix lớn nhiều tầng, đúng trọng tâm ảnh mẫu.
3. `m4-alien-ring`: vòng biểu tượng alien quanh tâm.
4. `m4-mount-rushmore`: núi đá/đài tưởng niệm ở nửa trên tâm bàn.
5. `m4-pyron-volcano`: khu dung nham ngoài viền.
6. `m4-neon-city`: đô thị neon cyan/magenta.
7. `m4-crystal-citadel`: thành pha lê băng cyan.
8. `m4-tech-metropolis`: đại đô thị công nghệ xám.
9. `m4-desert-fortress`: pháo đài sa mạc đỏ.
10. `m4-blue-domes`: cụm mái vòm hành tinh xanh.
11. `m4-purple-castle`: lâu đài tím Null Void.
12. `m4-jungle-domain`: rừng alien xanh.
13. `m4-card-pad-charge`: bệ thẻ Omnitrix Charge bên trái tâm.
14. `m4-card-pad-plumber`: bệ Plumber Level bên phải tâm.
15. `m4-dice-pad`: bệ xúc xắc gần Start.
16. `m4-center-props`: cụm alien/vehicle nhỏ quanh các đường hướng tâm.

Tám khu phải nằm sát nhóm ô tương ứng như ảnh mẫu, không dồn thành hai hàng ở
giữa bàn và không che Omnitrix.

### M4-B · Ô đặc biệt (10 asset)

1. Omnitrix Start gate.
2. Null Void prison.
3. Galactic Championship arena + crystal towers.
4. Plumber Tour spacecraft.
5–7. Ba Omnitrix Charge/Chance device khác nhau.
8. Plumber Tax station.
9. Festival hologram hai cọc.
10. Power-outage hologram có vùng đặt số.

### M4-C · Công trình 4 người × 5 cấp (20 asset)

- Ben: Omnitrix outpost → Hero tower → command hub → Galactic Hero HQ.
- Gwen: mana platform → energy lab → Anodite tower → Anodite palace.
- Kevin: salvage pad → garage → foundry → interstellar Tech Forge.
- Rook: Proto-tool pad → Revonnah outpost → Plumber station → Galactic fortress.

Các cấp Map 4 phải sci-fi/neon hơn Map 3 và không tái dùng hình Map 3.

### M4-D · Resort và nhân vật (13 asset)

- Resort: cổng dịch chuyển + vệ tinh + trạm quỹ đạo + pháo đài (5 asset).
- Ben, Gwen, Kevin, Rook: quân cờ và avatar riêng (8 asset).

Trạng thái dùng cùng cơ chế code như Map 3; không dùng portrait 2D làm quân trên bàn.

### M4-E · UI và décor theo nhóm (13 asset)

- 8 cụm décor A–H, mỗi cụm bám đúng biome/nhóm trong reference.
- Background trang chủ, preview map, player-card/avatar crop, popup master và
  result-state review (5 asset/output).

## 5. Trình tự sản xuất và cổng QA

Không dựng đồng loạt. Thứ tự bắt buộc:

1. Khoá plan, manifest và ảnh tham chiếu.
2. Dựng M3-A; tích hợp; chụp board; agent QA so sánh; sửa đến PASS.
3. Dựng M3-B; QA từng ô đặc biệt và thứ tự popup/di chuyển.
4. Dựng M3-C theo từng người (5 asset/lần); tạo contact sheet; QA từng cấp.
5. Dựng M3-D; QA tỷ lệ quân/resort/avatar; chụp Map 3 hoàn chỉnh.
6. Dựng M3-E; QA décor A–H, background/preview/popup/card/result và request list.
7. Dựng M4-A; QA vị trí tám khu và mức giống ảnh mẫu.
8. Dựng M4-B; QA ô góc/Chance/Tax/trạng thái động.
9. Dựng M4-C theo từng người; contact sheet và QA như Map 3.
10. Dựng M4-D; QA tỷ lệ quân/resort/avatar; chụp Map 4 hoàn chỉnh.
11. Dựng M4-E; QA décor A–H, background/preview/popup/card/result và request list.
12. Agent QA chạy audit chéo cả 4 map, parity rule và regression.
13. Chủ sản phẩm duyệt ảnh render thực tế cuối.
14. Chỉ sau bước 13 mới `npm test`, commit/push và deploy đúng commit.

### Phiếu PASS cho từng asset

- [ ] Đúng ID/chủ đề/map; không dùng visual map khác.
- [ ] Nền alpha sạch; không cắt silhouette; không chữ/watermark.
- [ ] Cùng camera, ánh sáng và vật liệu với batch.
- [ ] Footprint, điểm neo và chiều cao nằm trong envelope.
- [ ] Đọc rõ ở kích thước thật trên ô và mức đồ hoạ thấp.
- [ ] Không che tên, quân, xúc xắc hoặc ô kế bên.
- [ ] File được nén, manifest/checksum cập nhật, không tải khi ở trang chủ.
- [ ] Agent QA độc lập ghi PASS; nếu FAIL phải có ảnh/dòng lý do và dựng lại.

Mỗi batch phải lưu `contact-sheet.webp` và `qa.md` tại
`docs/reviews/map34/<map>/<batch>/`. Tin nhắn agent không thay thế artifact QA.

### Tiêu chí similarity Map 4

- Omnitrix tâm chiếm 18–22% chiều rộng phần board trong screenshot.
- Có đủ tám landmark/biome quanh viền theo đúng thứ tự bảng index; tâm không bị
  biến thành hai hàng asset lớn.
- Núi/đài tưởng niệm ở nửa trên tâm; vòng alien bao quanh Omnitrix; hai bệ card ở
  trái/phải; xúc xắc phía Start.
- Overlay reference/current cùng camera phải giữ được silhouette board, bốn góc và
  tâm; landmark nằm trong bbox QA định trước, không lấn tên ô.

### Tiêu chí similarity Map 3

- Đủ tám vùng theo candidate: Plumber/Bellwood, forge, lava, neon tím, pha lê,
  silver-tech, sa mạc và rừng alien; phân bố sát track, không dồn giữa.
- Omnitrix tâm chiếm 14–19% chiều rộng phần board, còn khoảng trống cho xúc xắc
  và đường di chuyển; bốn góc có silhouette rõ như candidate.
- Mật độ décor đạt ít nhất 2 cụm nhỏ/nhóm nhưng không che tile/name/token.
- Ảnh asset cuối không bake chữ; mọi label do renderer vẽ từ `tileNames[index]`.
- Overlay cùng camera giữ silhouette/vị trí tám vùng; sai bbox hoặc thiếu vùng là FAIL.

## 6. Kiểm thử cuối

- Contact sheet đủ 40 công trình, 10 resort và 8 quân cờ; không file placeholder.
- 32 tên/index mỗi map; giá/rent/group/type giống nguồn chung.
- Start, Lost Island, Championship, World Tour, Chance và Tax đúng pipeline chung.
- Kiểm reconnect, spectator, bot, mất điện, festival, đổi chủ, bán và phá sản.
- Không 404/console error; popup có ảnh ngay; không giật trước/sau roll.
- Đo idle/roll/move ở low/medium/high; desktop và màn nhỏ không tràn.
- Review cuối gồm trang chủ, lobby, full board, 20 cấp nhà/map và trạng thái đặc biệt.

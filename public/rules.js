/* ============================================================================
   THÁI THỊNH MONOPOLY — BỘ LUẬT CHÍNH (nguồn sự thật duy nhất)
   ----------------------------------------------------------------------------
   Mọi con số, luồng lượt chơi và kết quả từng tình huống nằm ở file này.
   - public/game.js (engine) đọc THÔNG SỐ và SƠ ĐỒ TRẠNG THÁI từ đây.
   - test/rules.test.js chạy từng dòng BẢNG QUYẾT ĐỊNH như một ca kiểm thử.
   - docs/RULES.md được sinh tự động từ file này (npm run rules:doc).
   Đổi luật: sửa file này trước, chạy `npm run verify`, rồi mới sửa engine nếu bảng báo lệch.
   Đơn vị tiền: K (×1000 đồng).
   ============================================================================ */
(function (root) {
  'use strict';
  const VERSION = '1.8.0';

  /* ===================== LỚP 1 — THÔNG SỐ ===================== */
  const CONFIG = {
    START_MONEY: 2000,            // tiền đầu ván
    SALARY: 300,                  // đi qua hoặc dừng ở Start (kể cả bay World Tour qua Start)
    MIN_PLAYERS: 2, MAX_PLAYERS: 4,
    MAX_DOUBLES: 3,               // đổ đôi lần thứ 3 liên tiếp → vào Lost Island
    ISLAND_IDX: 8, ISLAND_TURNS: 3, ISLAND_FEE: 200,
    FESTIVAL_IDX: 16, FEST_MULT: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // hệ số Championships, tối đa ×10
    CHAMP_MOVE_FEE: 50,           // chuyển Championships sang ô của mình
    TOUR_IDX: 24, TOUR_FEE: 50,
    TAX_RATE: 0.1, TAX_MIN: 0,    // thuế = 10% tổng tài sản (tiền mặt + giá trị đất)
    VALUE_MULT: [1, 1.5, 2.5, 4, 6],      // hệ số tạm cho thành phố chưa có bảng giá đối chiếu riêng
    TOLL_MULT: [0.25, 0.6, 1.5, 3.2, 5.5], // tiền thuê theo cấp 0..4 (× giá đất)
    LAP_CAP: [2, 3],              // cấp xây tối đa: vòng đầu Nhà 2; đã qua Start: Nhà 3
    LANDMARK: 4,                  // Khách sạn: chỉ xây khi quay lại ô đã có Nhà 3; không bị mua lại
    BUYOUT_MULT: 2,               // giá mua lại = 2 × giá trị cộng dồn
    SELL_MULT: 0.5,               // bán cho ngân hàng = 50% giá trị cộng dồn
    MONOPOLY_MULT: 2,             // sở hữu cả nhóm màu → thuê × 2
    RESORT_PRICE: 200, RESORT_TOLL: [0, 25, 50, 100, 200], // thuê bãi biển theo số resort cùng chủ
    OUTAGE_ROUNDS: 3,             // thẻ Cúp điện
    BONUS_TILES: 3, BONUS_MULT: 2, MAX_RENT_MULT: 10, // 3 ô lễ hội đầu ván ×2; tổng hệ số thuê tối đa ×10
    RENT_ROUND: 0.5,              // tiền thuê làm tròn tới 0,5K
    TIME_OPTIONS: [60, 90, 120],  // thời lượng ván (phút); hết giờ → giàu nhất thắng
    TURN_OPTIONS: [20, 30, 45, 60], TURN_SEC: 30, // thời gian cho mỗi bước của lượt (giây); hết → tự đi
    TURN_GRACE_SEC: 6,            // cộng thêm cho hoạt ảnh (xúc xắc, di chuyển, xây nhà) trước khi bắt đầu đếm
    AUTO_OFFLINE_SEC: 60, PROXY_SEC: 15, // người mất kết nối: server tự đi sau 60 s; người khác bấm "Đi hộ" sau 15 s
  };

  const LEVEL_NAMES = ['Ô đất', 'Nhà 1', 'Nhà 2', 'Nhà 3', 'Khách sạn']; // = Land, Villa, Building, Hotel, Landmark

  /* Nội dung luật dùng chung cho rulebook, thông báo và thẻ thông tin ô.
     Chuỗi trong TILE_INFO dùng placeholder {name}; app.js chỉ thay dữ liệu động,
     không tự giữ thêm một bản mô tả luật riêng. */
  const RULE_TEXT = {
    TOUR_DESTINATION: 'một thành phố chưa có chủ; nếu không còn thành phố trống thì được chọn một ô của mình',
  };

  const TILE_INFO = {
    start: { color: '#e2557f', subtitle: 'Điểm xuất phát', items: [
      'Mỗi lần đi qua hoặc dừng ở Start nhận lương <b>{salary}</b>, kể cả khi bay World Tour qua Start.',
      'Vòng đầu xây tối đa Nhà 2. Qua Start lần đầu mở khoá Nhà 3.',
      'Khách sạn xây được khi quay lại ô đã có Nhà 3.',
    ] },
    island: { color: '#3aa0f0', subtitle: 'Đảo hoang', items: [
      'Dừng ở đây hoặc đổ đôi {maxDoubles} lần liên tiếp thì bị kẹt tối đa {islandTurns} lượt.',
      'Mỗi lượt trên đảo chọn: đổ xúc xắc (ra đôi thì thoát và đi luôn), trả <b>{islandFee}</b> để rời đảo ngay, hoặc dùng thẻ Thoát đảo.',
      'Hết {islandTurns} lượt thì tự rời đảo. Trong lúc kẹt vẫn thu tiền thuê bình thường.',
    ] },
    festival: { color: '#f5a20a', subtitle: 'Lễ hội', items: [
      'Dừng ở đây được tăng hệ số ô đang tổ chức thêm 1, hoặc trả <b>{champMoveFee}</b> để chuyển Championships sang ô của mình.',
      'Hệ số tăng dần tới tối đa x{maxRentMult}. Lần tổ chức tới sẽ là x{nextFestivalMult}.',
      'Cả bàn chỉ có một lễ hội; tổ chức ở ô mới thì lễ hội chuyển sang ô đó. Thẻ Cúp điện làm mất lễ hội.',
      '{currentFestival}',
    ] },
    tour: { color: '#2c8ff0', subtitle: 'Du lịch thế giới', items: [
      `Dừng ở đây thì lượt sau trả <b>{tourFee}</b> để bay tới ${RULE_TEXT.TOUR_DESTINATION}.`,
      'Bay qua Start vẫn nhận lương. Tới ô nào thì xử lý như dừng ở ô đó: mua đất, nâng cấp, trả tiền thuê, mua lại…',
    ] },
    tax: { color: '#6b7685', subtitle: 'Thuế', items: [
      'Dừng ở đây nộp <b>{taxRate}%</b> tổng tài sản (tiền mặt + giá trị đất và nhà).',
      '{taxPreview}',
    ] },
    chance: { color: '#f2a33c', subtitle: 'Cơ hội', items: [
      'Dừng ở đây rút một thẻ ngẫu nhiên:',
      '{chanceCards}',
    ] },
  };

  const GROUPS = {
    // color: màu nhóm (dải tiêu đề, thẻ thông tin); ground: màu nền pastel của ô đất; pattern: hoa văn lát nền (Kenney Pattern Pack, CC0)
    // nhóm liền kề trên bàn xen kẽ tông nóng / lạnh để không lẫn vào nhau
    A: { name: 'Tây Ban Nha', color: '#e8843f', ground: '#ffc9a0', pattern: 18 }, B: { name: 'Trung Quốc', color: '#2fae6b', ground: '#a8e6c3', pattern: 72 },
    C: { name: 'Ý', color: '#e0558f', ground: '#f9b3cf', pattern: 79 }, D: { name: 'Đức', color: '#3d8fe0', ground: '#a9d3f5', pattern: 17 },
    E: { name: 'Anh – Úc', color: '#d9a40f', ground: '#fbe38e', pattern: 22 }, F: { name: 'Mỹ', color: '#8a63e8', ground: '#cbb8f2', pattern: 14 },
    G: { name: 'Pháp', color: '#e0564a', ground: '#f7a9a0', pattern: 60 }, H: { name: 'Nhật Bản', color: '#17a8a2', ground: '#9ee0dd', pattern: 59 },
  };

  // bố cục bàn theo Business Tour; [loại, tên, nhóm, giá đất, giá mua tích lũy 5 cấp, tiền thuê 5 cấp]
  const TILE_LIST = [
    ['start', 'Start'],
    ['city', 'Granada', 'A', 60, [60, 110, 160, 210, 360], [2, 25, 50, 75, 150]],
    ['city', 'Seville', 'A', 60, [60, 110, 160, 210, 360], [2, 28, 55, 83, 165]],
    ['city', 'Madrid', 'A', 60, [60, 110, 160, 210, 360], [4, 30, 60, 90, 180]],
    ['resort', 'Bali'],
    ['city', 'Hong Kong', 'B', 100, [100, 150, 200, 250, 400], [6, 33, 65, 98, 195]],
    ['city', 'Beijing', 'B', 100, [100, 150, 200, 250, 400], [6, 35, 75, 105, 210]],
    ['city', 'Shanghai', 'B', 120, [120, 170, 220, 270, 420], [8, 38, 75, 113, 225]],
    ['island', 'Lost Island'],
    ['city', 'Venice', 'C', 140, [140, 240, 340, 440, 690], [10, 70, 140, 210, 385]],
    ['city', 'Milan', 'C', 140, [140, 240, 340, 440, 690], [10, 75, 150, 225, 413]],
    ['city', 'Rome', 'C', 160, [160, 260, 360, 460, 710], [12, 80, 160, 240, 440]],
    ['chance', 'Chance'],
    ['city', 'Hamburg', 'D', 180, [180, 280, 380, 480, 730], [14, 85, 170, 255, 468]],
    ['resort', 'Cyprus'],
    ['city', 'Berlin', 'D', 200, [200, 300, 400, 500, 750], [16, 90, 180, 270, 495]],
    ['festival', 'Championships'],
    ['city', 'London', 'E', 220, [220, 370, 520, 670, 1045], [18, 113, 225, 338, 619]],
    ['resort', 'Dubai'],
    ['city', 'Sydney', 'E', 240, [240, 390, 540, 690, 1065], [20, 120, 240, 360, 660]],
    ['chance', 'Chance'],
    ['city', 'Chicago', 'F', 260, [260, 410, 560, 710, 1085], [22, 128, 255, 383, 701]],
    ['city', 'Las Vegas', 'F', 260, [260, 410, 560, 710, 1085], [22, 135, 270, 405, 743]],
    ['city', 'New York', 'F', 280, [280, 430, 580, 730, 1105], [24, 143, 285, 428, 784]],
    ['tour', 'World Tour'],
    ['resort', 'Nice'],
    ['city', 'Lyon', 'G', 300, [300, 500, 700, 900, 1400], [26, 170, 340, 510, 935]],
    ['city', 'Paris', 'G', 320, [320, 520, 720, 920, 1420], [28, 180, 360, 540, 990]],
    ['chance', 'Chance'],
    ['city', 'Osaka', 'H', 350, [350, 550, 750, 950, 1450], [35, 190, 380, 570, 1045]],
    ['tax', 'Tax'],
    ['city', 'Tokyo', 'H', 400, [400, 600, 800, 1000, 1500], [50, 200, 400, 600, 1100]],
  ];
  const TILES = TILE_LIST.map(([type, name, group, price, values, rents], i) => {
    const t = { i, type, name };
    if (type === 'city') Object.assign(t, {
      group, price,
      values: values || CONFIG.VALUE_MULT.map((mult) => price * mult),
      rents: rents || CONFIG.TOLL_MULT.map((mult) => price * mult),
    });
    if (type === 'resort') t.price = CONFIG.RESORT_PRICE;
    return t;
  });

  // Thẻ Chance có trọng số bằng nhau: mỗi thẻ 1/8 = 12,5%.
  const CARDS = [
    { id: 'POWER_OUTAGE', title: 'Cúp điện', w: 1, text: 'Chọn 1 thành phố của đối thủ: mất điện 3 vòng, không thu được tiền thuê và mất lễ hội.' },
    { id: 'EARTHQUAKE', title: 'Động đất', w: 1, text: 'Chọn 1 thành phố của đối thủ (đã có nhà, chưa lên Khách sạn) để hạ 1 cấp.' },
    { id: 'FORCED_SWAP', title: 'Đổi đất cưỡng chế', w: 1, text: 'Đổi 1 thành phố của bạn lấy 1 thành phố của đối thủ (đều chưa lên Khách sạn).' },
    { id: 'VIP_SHIELD', title: 'Thẻ VIP', w: 1, text: 'Giữ trong tay: tự động miễn 100% tiền thuê một lần.' },
    { id: 'ESCAPE_ISLAND', title: 'Thoát đảo', w: 1, text: 'Giữ trong tay: rời Lost Island ngay, không mất phí.' },
    { id: 'HOST_FESTIVAL', title: 'Tổ chức lễ hội', w: 1, text: 'Đi ngay tới Championships để tổ chức lễ hội.' },
    { id: 'FLIGHT_TICKET', title: 'Vé máy bay', w: 1, text: 'Đi ngay tới World Tour, lượt sau bay tới ô bất kỳ.' },
    { id: 'GOLDEN_LOTTERY', title: 'Trúng số độc đắc', w: 1, text: 'Nhận ngay 200K từ ngân hàng.', amount: 200 },
  ];

  // nhân vật (Cube Pets, Kenney CC0): mỗi người một con, màu đi theo nhân vật
  const PETS = [
    { id: 'animal-dog', n: 'Chó', c: '#ec3f78' }, { id: 'animal-cat', n: 'Mèo', c: '#2c8ff0' },
    { id: 'animal-fox', n: 'Cáo', c: '#3cb043' }, { id: 'animal-panda', n: 'Gấu trúc', c: '#f4c430' },
  ];

  // Danh sách map có thể chọn trong room. Map hiện tại là map mặc định;
  // thêm map mới vào đây trước khi nối renderer/asset tương ứng.
  const MAPS = [
    { id: 'map-1', name: 'Map 1', description: 'Bản đồ Thái Thịnh mặc định', preview: 'maps/map-1-preview.svg', default: true },
  ];

  /* ===================== LỚP 2 — SƠ ĐỒ TRẠNG THÁI ===================== */
  // Mỗi bước (step.kind) liệt kê hành động hợp lệ và đi tới đâu. Engine từ chối mọi hành động không có trong bảng.
  const STATES = {
    roll: { desc: 'Chờ đổ xúc xắc', actions: { roll: 'Đổ 2 xúc xắc, đi tổng số ô → giải quyết ô dừng. Đổ đôi: được đổ thêm sau khi xong ô (đôi lần 3 → Lost Island).' } },
    island: { desc: 'Đang kẹt ở Lost Island', actions: { roll: 'Ra đôi → thoát và đi luôn; không ra đôi → mất 1 lượt (hết 3 lượt thì tự rời đảo và đi).', payIsland: 'Trả phí rời đảo → về bước roll.', useCard: 'Dùng thẻ Thoát đảo → về bước roll.' } },
    tour: { desc: 'Lượt sau khi dừng ở World Tour', actions: { tour: 'Trả vé, bay tới thành phố chưa có chủ; nếu không còn thành phố trống thì bay tới ô của mình.', skip: 'Không bay → về bước roll.' } },
    flight: { desc: 'Vừa rút thẻ Vé máy bay', actions: { flight: 'Bấm OK trên thẻ → đi tới World Tour → giải quyết ô dừng.' } },
    buy: { desc: 'Dừng ở ô chưa có chủ, đủ tiền mua đất', actions: { buy: 'Mua đất + xây tới cấp chọn (≤ giới hạn vòng) → kiểm tra thắng → kết thúc ô.', skip: 'Không mua → kết thúc ô.' } },
    upgrade: { desc: 'Dừng ở ô của mình (hoặc vừa mua lại) còn nâng cấp được', actions: { upgrade: 'Nâng lên cấp chọn → kết thúc ô.', skip: 'Để sau → kết thúc ô.' } },
    takeover: { desc: 'Vừa trả thuê ô người khác, đủ tiền mua lại', actions: { takeover: 'Trả 2× giá trị cho chủ, nhận nguyên cấp nhà → nếu còn nâng cấp được thì sang upgrade, không thì kết thúc ô.', skip: 'Không mua → kết thúc ô.' } },
    festival: { desc: 'Dừng ở Championships', actions: { festival: 'Tăng hệ số ô đang tổ chức thêm 1; hoặc trả 50K để chuyển sang ô của mình. Hệ số tối đa ×10.', skip: 'Bỏ qua → kết thúc ô.' } },
    card: { desc: 'Thẻ Chance cần chọn ô', actions: { card: 'Áp dụng thẻ lên ô chọn (Đổi đất: chọn 2 lần) → kết thúc ô.', skip: 'Bỏ thẻ → kết thúc ô.' } },
    debt: { desc: 'Có khoản phải trả (thuê/thuế) lớn hơn tiền mặt; khoản này đang treo', actions: { sell: 'Bán 1 ô cho ngân hàng; đủ tiền thì trả khoản treo cho người nhận → kết thúc ô (đổ đôi thì đổ tiếp).', bankrupt: 'Phá sản: toàn bộ tiền mặt cho người nhận, đất trả về ngân hàng → lượt người kế.' } },
  };
  // "Kết thúc ô": còn khoản treo → debt; đổ đôi và không kẹt đảo → roll (đổ thêm); còn lại → lượt người kế (bước đầu: tour / island / roll).
  const FLOW = [
    'Phòng chờ: người vào đầu tiên là host; chỉ host được đổi cấu hình room, mời người chơi ra, bắt đầu hoặc reset ván. Host rời phòng thì quyền chuyển cho người vào kế tiếp.',
    'Bắt đầu lượt → tour (nếu đang có vé World Tour) / island (nếu đang kẹt đảo) / roll',
    'roll → di chuyển → GIẢI QUYẾT Ô (bảng quyết định) → buy | upgrade | takeover | festival | card | debt | KẾT THÚC Ô',
    'KẾT THÚC Ô → debt (còn khoản treo) | roll (đổ đôi) | lượt người kế',
    'Bất kỳ lúc nào: hết thời lượng ván → over (giàu nhất thắng); thắng ngay khi đủ điều kiện → over',
    'Hết thời gian một bước → tự làm hành động an toàn: roll / skip / bán ô rẻ nhất / bay không',
  ];

  /* ===================== LỚP 3 — BẢNG QUYẾT ĐỊNH ===================== */
  // Mỗi dòng: tình huống (when) → kết quả (then), kèm setup/do/expect để test/rules.test.js chạy được.
  // Quy ước setup: hai người chơi; "me" đang tới lượt, "op" là đối thủ. dice: [a, b] cho lần đổ kế tiếp.
  //   card: id thẻ rút trúng (khi dừng ở Chance). props: { ô: [chủ 'me'|'op', cấp] }.
  // expect: step (bước kế; 'next' = đã sang lượt op), me/op (tiền), pos, laps, owner, level, notice, pending, error, phase…
  const D = (table, id, when, then, setup, act, expect) => ({ table, id, when, then, setup, do: act, expect });
  const DECISIONS = [
    // ---- đổ xúc xắc & di chuyển
    D('Di chuyển', 'M1', 'Đổ 1+3 từ Start', 'Đi 4 ô tới Bali (chưa chủ) → bước buy', { dice: [1, 3] }, [['roll']], { pos: 4, step: 'buy' }),
    D('Di chuyển', 'M2', 'Đổ đôi 2+2, không mua', 'Được đổ thêm', { dice: [2, 2] }, [['roll'], ['skip']], { step: 'roll', turn: 'me' }),
    D('Di chuyển', 'M3', 'Đã đôi 2 lần, đổ đôi lần 3', 'Vào Lost Island 3 lượt, sang người kế', { doubles: 2, dice: [3, 3] }, [['roll']], { pos: 8, island: 3, step: 'next' }),
    D('Di chuyển', 'M4', 'Đứng ô 30, đổ 1+2', 'Qua Start: +300K, tính 1 vòng', { pos: 30, dice: [1, 2] }, [['roll']], { pos: 1, me: 2300, laps: 1, step: 'buy' }),
    // ---- ô thành phố chưa có chủ
    D('Thành phố — chưa có chủ', 'C1', 'Đủ tiền mua đất', 'Bước buy', { pos: 30, dice: [1, 2] }, [['roll']], { step: 'buy' }),
    D('Thành phố — chưa có chủ', 'C2', 'Không đủ tiền mua đất', 'Bỏ qua, sang người kế', { money: 30, dice: [1, 2] }, [['roll']], { step: 'next', me: 30 }),
    D('Thành phố — chưa có chủ', 'C3', 'Vòng đầu, chọn mua kèm Nhà 3', 'Bị từ chối (vòng đầu tối đa Nhà 2)', { dice: [1, 2] }, [['roll'], ['buy', { level: 3 }]], { error: true }),
    D('Thành phố — chưa có chủ', 'C4', 'Vòng đầu, mua kèm Nhà 2', 'Trả giá Nhà 2 của Madrid: 160K', { dice: [1, 2] }, [['roll'], ['buy', { level: 2 }]], { owner: [3, 'me'], level: [3, 2], me: 2000 - 160 }),
    D('Thành phố — chưa có chủ', 'C5', 'Đã qua Start, mua kèm Nhà 3', 'Được phép, trả giá Nhà 3 của Madrid: 210K', { laps: 1, dice: [1, 2] }, [['roll'], ['buy', { level: 3 }]], { level: [3, 3], me: 2000 - 210 }),
    // ---- ô thành phố của mình
    D('Thành phố — của mình', 'C6', 'Ô của mình cấp 1, còn được xây', 'Bước upgrade', { props: { 3: ['me', 1] }, dice: [1, 2] }, [['roll']], { step: 'upgrade' }),
    D('Thành phố — của mình', 'C7', 'Ô của mình cấp 2, vòng đầu', 'Không nâng được nữa → kết thúc', { props: { 3: ['me', 2] }, dice: [1, 2] }, [['roll']], { step: 'next' }),
    D('Thành phố — của mình', 'C8', 'Ô của mình Nhà 3', 'Được xây Khách sạn', { props: { 3: ['me', 3] }, dice: [1, 2] }, [['roll'], ['upgrade', { level: 4 }]], { level: [3, 4] }),
    // ---- ô thành phố của người khác
    D('Thành phố — của người khác', 'C9', 'Đủ thuê, đủ mua lại', 'Trả thuê, chủ nhà hiện mặt vui → bước takeover', { props: { 3: ['op', 1] }, dice: [1, 2] }, [['roll']], { me: 2000 - 30, op: 2030, reaction: ['op', 'happyRent'], step: 'takeover' }),
    D('Thành phố — của người khác', 'C10', 'Mua lại ô cấp 1', 'Trả 2× giá trị cho chủ, nhận nguyên Nhà 1', { props: { 3: ['op', 1] }, dice: [1, 2] }, [['roll'], ['takeover']], { owner: [3, 'me'], level: [3, 1], me: 2000 - 30 - 220, op: 2030 + 220 }),
    D('Thành phố — của người khác', 'C11', 'Đủ thuê, không đủ mua lại', 'Trả thuê, thông báo "không đủ tiền mua tài sản này"', { money: 100, props: { 3: ['op', 1] }, dice: [1, 2] }, [['roll']], { me: 70, notice: 'noTakeover', step: 'next' }),
    D('Thành phố — của người khác', 'C12', 'Khách sạn của người khác', 'Trả thuê, không được mua lại', { props: { 3: ['op', 4] }, dice: [1, 2] }, [['roll']], { me: 2000 - 180, step: 'next' }),
    D('Thành phố — của người khác', 'C13', 'Tiền thuê lớn hơn tiền mặt', 'Khoản thuê treo lại, chưa ai mất/nhận tiền → bước debt, thông báo "không đủ tiền thanh toán"', { money: 50, props: { 3: ['op', 3], 9: ['me', 2] }, dice: [1, 2] }, [['roll']], { step: 'debt', me: 50, op: 2000, pending: 90, notice: 'cantPay' }),
    D('Thành phố — của người khác', 'C14', 'Đang nợ, bán 1 ô đủ tiền', 'Trả khoản treo cho chủ rồi mới sang người kế', { money: 50, props: { 3: ['op', 3], 9: ['me', 2] }, dice: [1, 2] }, [['roll'], ['sell', { tile: 9 }]], { me: 50 + 170 - 90, op: 2090, pending: 0, step: 'next' }),
    D('Thành phố — của người khác', 'C15', 'Đổ đôi vào ô người khác, không đủ tiền', 'Phải bán trả xong mới được đổ tiếp', { money: 100, props: { 6: ['op', 3], 9: ['me', 2] }, dice: [3, 3] }, [['roll'], ['sell', { tile: 9 }]], { me: 100 + 170 - 105, op: 2000 + 105, step: 'roll', turn: 'me' }),
    D('Thành phố — của người khác', 'C16', 'Đang nợ, phá sản', 'Toàn bộ tiền mặt cho chủ nợ, đất về ngân hàng', { money: 50, props: { 3: ['op', 3], 9: ['me', 2] }, dice: [1, 2] }, [['roll'], ['bankrupt']], { op: 2050, owner: [9, null], phase: 'over' }),
    D('Thành phố — của người khác', 'C17', 'Chủ sở hữu cả nhóm màu', 'Thuê × 2', { props: { 1: ['op', 0], 2: ['op', 0], 3: ['op', 1] }, dice: [1, 2] }, [['roll']], { me: 2000 - 60 }),
    D('Thành phố — của người khác', 'C18', 'Ô cắm cờ lễ hội đầu ván', 'Thuê × 2', { bonus: [3], props: { 3: ['op', 1] }, dice: [1, 2] }, [['roll']], { me: 2000 - 60 }),
    D('Thành phố — của người khác', 'C19', 'Ô đang tổ chức lễ hội lần 2', 'Thuê × 3', { festival: 3, festLevel: 2, props: { 3: ['op', 1] }, dice: [1, 2] }, [['roll']], { me: 2000 - 90 }),
    D('Thành phố — của người khác', 'C20', 'Ô đang mất điện', 'Không trả thuê', { outage: { 3: 4 }, props: { 3: ['op', 1] }, dice: [1, 2] }, [['roll']], { me: 2000, op: 2000 }),
    D('Thành phố — của người khác', 'C21', 'Có thẻ VIP, dừng ở ô đối thủ', 'Tự dùng 1 thẻ, miễn tiền thuê và hiện thông báo', { shields: 1, props: { 3: ['op', 1] }, dice: [1, 2] }, [['roll']], { me: 2000, op: 2000, shields: 0, notice: 'vipUsed', step: 'takeover' }),
    D('Thành phố — của người khác', 'C22', 'Có thẻ VIP nhưng không đủ tiền mua lại', 'Ưu tiên thông báo đã dùng thẻ miễn thuê', { money: 10, shields: 1, props: { 3: ['op', 1] }, dice: [1, 2] }, [['roll']], { me: 10, op: 2000, shields: 0, notice: 'vipUsed', step: 'next' }),
    D('Thành phố — của người khác', 'C21', 'Có thẻ VIP', 'Miễn thuê, mất 1 thẻ VIP', { shields: 1, props: { 3: ['op', 1] }, dice: [1, 2] }, [['roll']], { me: 2000, shields: 0 }),
    // ---- bãi biển
    D('Bãi biển', 'R1', 'Bãi biển chưa chủ', 'Bước buy (chỉ mua đất)', { dice: [1, 3] }, [['roll'], ['buy', { level: 0 }]], { owner: [4, 'me'], me: 1800 }),
    D('Bãi biển', 'R2', 'Bãi của người có 2 bãi', 'Thuê 50, không được mua lại', { props: { 4: ['op', 0], 14: ['op', 0] }, dice: [1, 3] }, [['roll']], { me: 1950, step: 'next' }),
    // ---- ô đặc biệt
    D('Ô đặc biệt', 'S1', 'Dừng ở Lost Island', 'Kẹt 3 lượt', { pos: 5, dice: [1, 2] }, [['roll']], { pos: 8, island: 3, step: 'next' }),
    D('Ô đặc biệt', 'S2', 'Đang kẹt, trả phí', 'Trả 200 → đổ bình thường', { pos: 8, island: 3, step: 'island' }, [['payIsland']], { me: 1800, island: 0, step: 'roll' }),
    D('Ô đặc biệt', 'S3', 'Đang kẹt, đổ không ra đôi', 'Mất lượt, còn 2', { pos: 8, island: 3, step: 'island', dice: [1, 2] }, [['roll']], { island: 2, step: 'next', pos: 8 }),
    D('Ô đặc biệt', 'S4', 'Đang kẹt, dùng thẻ Thoát đảo', 'Rời đảo miễn phí và hiện thông báo', { pos: 8, island: 3, escapeCards: 1, step: 'island' }, [['useCard']], { me: 2000, island: 0, escapeCards: 0, notice: 'escapeUsed', step: 'roll' }),
    D('Ô đặc biệt', 'S5', 'Dừng ở World Tour', 'Lượt sau được bay', { pos: 21, dice: [1, 2] }, [['roll']], { pos: 24, tourPending: true, step: 'next' }),
    D('Ô đặc biệt', 'S6', 'Bay từ World Tour tới Madrid', 'Trả vé 50, qua Start +300, tính 1 vòng', { pos: 24, tourPending: true, step: 'tour' }, [['tour', { tile: 3 }]], { pos: 3, me: 2250, laps: 1, step: 'buy' }),
    D('Ô đặc biệt', 'S7', 'Còn thành phố trống nhưng chọn ô của người khác', 'Bị từ chối', { pos: 24, tourPending: true, step: 'tour', props: { 3: ['op', 1] } }, [['tour', { tile: 3 }]], { error: true }),
    D('Ô đặc biệt', 'S8', 'Dừng ở Tax, tổng tài sản 2000', 'Nộp 10% = 200', { pos: 27, dice: [1, 2] }, [['roll']], { pos: 30, me: 1800 }),
    D('Ô đặc biệt', 'S9', 'Dừng ở Championships, chuyển giải tới đất của mình', 'Trả 50K, hệ số lên ×2', { pos: 13, dice: [1, 2], props: { 3: ['me', 1] } }, [['roll'], ['festival', { tile: 3 }]], { me: 1950, festival: 3, festLevel: 1 }),
    // ---- thẻ Chance
    D('Thẻ Chance', 'K1', 'Rút Trúng số', '+200', { pos: 9, dice: [1, 2], card: 'GOLDEN_LOTTERY' }, [['roll']], { me: 2200, step: 'next' }),
    D('Thẻ Chance', 'K2', 'Rút Thẻ VIP', 'Giữ 1 thẻ VIP', { pos: 9, dice: [1, 2], card: 'VIP_SHIELD' }, [['roll']], { shields: 1 }),
    D('Thẻ Chance', 'K3', 'Rút Cúp điện, đối thủ có thành phố', 'Chọn ô của đối thủ', { pos: 9, dice: [1, 2], card: 'POWER_OUTAGE', props: { 3: ['op', 1] } }, [['roll'], ['card', { tile: 3 }]], { outage: 3 }),
    D('Thẻ Chance', 'K4', 'Rút Động đất', 'Hạ 1 cấp ô đối thủ', { pos: 9, dice: [1, 2], card: 'EARTHQUAKE', props: { 3: ['op', 2] } }, [['roll'], ['card', { tile: 3 }]], { level: [3, 1] }),
    D('Thẻ Chance', 'K5', 'Rút Vé máy bay', 'Hiện thẻ, bấm OK rồi đi tới World Tour', { pos: 17, dice: [1, 2], card: 'FLIGHT_TICKET' }, [['roll'], ['flight']], { pos: 24, tourPending: true }),
    // ---- thắng
    D('Thắng', 'W1', 'Mua ô cuối cùng hoàn thành 3 nhóm màu', 'Thắng ngay', { dice: [1, 2], props: { 1: ['me', 0], 2: ['me', 0], 5: ['me', 0], 6: ['me', 0], 7: ['me', 0], 9: ['me', 0], 10: ['me', 0], 11: ['me', 0] } }, [['roll'], ['buy', { level: 0 }]], { phase: 'over', winner: 'me' }),
    D('Thắng', 'W2', 'Hết thời lượng ván', 'Ván dừng, người có tổng tài sản lớn nhất thắng', { money: 5000, timeUp: true }, [], { phase: 'over', winner: 'me' }),
  ];

  const RULEBOOK = [
    { title: 'Mục tiêu', items: [
      'Thắng ngay khi sở hữu toàn bộ thành phố và bãi biển trên một cạnh bàn cờ.',
      'Thắng ngay khi sở hữu cả 4 bãi biển.',
      'Thắng ngay khi hoàn thành 3 nhóm màu bất kỳ.',
      'Nếu hết thời gian, người có tổng tài sản cao nhất thắng. Bạn cũng thắng khi tất cả đối thủ phá sản.',
    ] },
    { title: 'Bắt đầu ván', items: [
      'Mỗi người nhận 2.000.000. Thứ tự đi được xáo ngẫu nhiên.',
      'Ba thành phố hoặc bãi biển được chọn ngẫu nhiên để mở lễ hội; tiền thuê tại đó nhân 2 suốt ván.',
      'Người chơi lần lượt theo chiều kim đồng hồ.',
    ] },
    { title: 'Xúc xắc và lượt đi', items: [
      'Hết thời gian mà chưa thao tác, game tự đổ xúc xắc hoặc tự chọn hành động an toàn.',
      'Đổ đôi được thêm một lượt sau khi xử lý xong ô dừng. Đổ đôi 3 lần liên tiếp sẽ vào Lost Island.',
      'Game gia đình này không dùng gadget ép xúc xắc chẵn, lẻ hoặc đôi.',
    ] },
    { title: 'Mua đất, xây nhà và tiền thuê', items: [
      'Vòng đầu được mua hoặc xây tối đa Nhà 2. Sau khi qua Start lần đầu mới mở Nhà 3.',
      'Khách sạn chỉ được xây khi quay lại ô đã có Nhà 3; không thể mua Nhà 3 và Khách sạn trong cùng một lần.',
      'Giá nâng cấp là phần chênh lệch giữa cấp hiện tại và cấp muốn mua. Khách sạn không thể bị mua lại.',
      'Sở hữu đủ một nhóm màu làm hệ số thuê tăng 1. Lễ hội và Championships cũng cộng vào hệ số; tổng tối đa ×10.',
      'Không đủ tiền trả thuê hoặc thuế thì phải bán tài sản; nếu vẫn không đủ có thể tuyên bố phá sản.',
    ] },
    { title: 'Các ô đặc biệt', items: [
      'Start: mỗi lần đi qua hoặc dừng đúng ô nhận 300.000.',
      'Lost Island: kẹt tối đa 3 lượt; thoát bằng cách trả 200.000, đổ đôi hoặc dùng thẻ Thoát đảo.',
      'Tax: nộp 10% tổng tài sản. Không đủ tiền thì phải bán tài sản.',
      'Bãi biển: giá 200.000, không thể mua lại; tiền thuê tăng theo tổng số bãi cùng chủ.',
      'Championships: tăng hệ số ô đang tổ chức thêm 1, hoặc trả 50.000 để chuyển giải sang ô của mình; có thể bỏ qua.',
      `World Tour: trả 50.000 để bay tới ${RULE_TEXT.TOUR_DESTINATION}.`,
    ] },
    { title: 'Thẻ Chance', items: [
      'Bàn có 3 ô Chance. Tám loại thẻ trong phiên bản gia đình có tỷ lệ bằng nhau (mỗi loại 12,5%).',
      'Thẻ VIP và Thoát đảo được giữ trong tay; số lượng đang có hiển thị trên thẻ người chơi.',
      'Các thẻ còn lại có hiệu lực ngay hoặc yêu cầu chọn thành phố mục tiêu.',
    ] },
  ];

  const RULES = { VERSION, CONFIG, LEVEL_NAMES, RULE_TEXT, TILE_INFO, GROUPS, TILES, CARDS, PETS, MAPS, STATES, FLOW, DECISIONS, RULEBOOK };
  if (typeof module !== 'undefined' && module.exports) module.exports = RULES;
  else root.RULES = RULES;
})(typeof self !== 'undefined' ? self : this);

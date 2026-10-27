// Sinh docs/RULES.md từ public/rules.js (bộ luật chính). Không sửa tay docs/RULES.md.
//   node scripts/rules-doc.mjs          → ghi lại docs/RULES.md
//   node scripts/rules-doc.mjs --check  → báo lỗi nếu docs/RULES.md cũ hơn rules.js (dùng trong verify)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const R = require(ROOT + 'public/rules.js');
const C = R.CONFIG, OUT = ROOT + 'docs/RULES.md';
const k = (n) => `${n}K`;
const L = [];
L.push(`# Luật chơi Thái Thịnh Monopoly — v${R.VERSION}`, '');
L.push('> Tự sinh từ `public/rules.js` bằng `npm run rules:doc`. Không sửa tay file này: sửa `rules.js`, chạy `npm run verify`.', '');
L.push('Bộ luật có ba lớp: **thông số** (con số), **sơ đồ trạng thái** (luồng một lượt), **bảng quyết định** (kết quả từng tình huống). Engine đọc thông số và sơ đồ trạng thái từ cùng file; mỗi dòng bảng quyết định là một bài kiểm thử (`test/rules.test.js`).', '');

L.push('## 1. Thông số', '');
L.push('| Thông số | Giá trị |', '|---|---|');
const rows = [
  ['Tiền đầu ván', k(C.START_MONEY)], ['Lương qua Start', k(C.SALARY)], ['Số người chơi', `${C.MIN_PLAYERS}–${C.MAX_PLAYERS}`],
  ['Đổ đôi liên tiếp vào đảo', `lần thứ ${C.MAX_DOUBLES}`], ['Lost Island', `kẹt ${C.ISLAND_TURNS} lượt, phí rời đảo ${k(C.ISLAND_FEE)}`],
  ['Lễ hội (Championships)', C.FEST_MULT.slice(1).map((m) => '×' + m).join(' → ') + ' theo số lần tổ chức'], ['Vé World Tour', k(C.TOUR_FEE)],
  ['Thuế', `${C.TAX_RATE * 100}% tổng tài sản, tối thiểu ${k(C.TAX_MIN)}`],
  ['Giá trị cộng dồn theo cấp', C.VALUE_MULT.map((m, i) => `${R.LEVEL_NAMES[i]} ×${m}`).join(', ') + ' (× giá đất)'],
  ['Tiền thuê theo cấp', C.TOLL_MULT.map((m, i) => `${R.LEVEL_NAMES[i]} ×${m}`).join(', ') + ' (× giá đất)'],
  ['Giới hạn xây', `vòng đầu tối đa ${R.LEVEL_NAMES[C.LAP_CAP[0]]}; đã qua Start: ${R.LEVEL_NAMES[C.LAP_CAP[1]]}; ${R.LEVEL_NAMES[C.LANDMARK]} khi quay lại ô đã có ${R.LEVEL_NAMES[3]}`],
  ['Mua lại', `${C.BUYOUT_MULT}× giá trị cộng dồn; ${R.LEVEL_NAMES[C.LANDMARK]} và bãi biển không bị mua lại; người mua nhận nguyên cấp nhà`],
  ['Bán cho ngân hàng', `${C.SELL_MULT * 100}% giá trị cộng dồn`], ['Độc quyền nhóm màu', `thuê ×${C.MONOPOLY_MULT}`],
  ['Bãi biển', `giá ${k(C.RESORT_PRICE)}; thuê ${C.RESORT_TOLL.slice(1).map(k).join(' / ')} theo số bãi cùng chủ`],
  ['Cờ lễ hội', `mỗi ván ${C.BONUS_TILES} ô ngẫu nhiên, thuê ×${C.BONUS_MULT}`], ['Làm tròn tiền thuê', k(C.RENT_ROUND)],
  ['Thẻ Cúp điện', `${C.OUTAGE_ROUNDS} vòng`], ['Thời lượng ván', C.TIME_OPTIONS.map((m) => m + ' phút').join(' / ') + '; hết giờ → giàu nhất thắng'],
  ['Thời gian mỗi bước', `${C.TURN_OPTIONS.join(' / ')} giây (mặc định ${C.TURN_SEC}), cộng ${C.TURN_GRACE_SEC} giây cho hoạt ảnh; hết giờ → tự đi`],
  ['Mất kết nối', `người khác bấm "Đi hộ" sau ${C.PROXY_SEC} giây; server tự đi sau ${C.AUTO_OFFLINE_SEC} giây`],
];
rows.forEach(([a, b]) => L.push(`| ${a} | ${b} |`));
L.push('', '### Bàn cờ', '', '| Ô | Tên | Loại | Nhóm | Giá đất | Thuê Ô đất → Khách sạn |', '|---|---|---|---|---|---|');
R.TILES.forEach((t) => L.push(`| ${t.i} | ${t.name} | ${t.type} | ${t.group ? R.GROUPS[t.group].name : ''} | ${t.price ? k(t.price) : ''} | ${t.type === 'city' ? C.TOLL_MULT.map((m) => Math.round(t.price * m * 10) / 10).join(' / ') : ''} |`));
L.push('', '### Thẻ Chance', '', '| Thẻ | Trọng số | Tác dụng |', '|---|---|---|');
R.CARDS.forEach((c) => L.push(`| ${c.title} | ${c.w} | ${c.text} |`));

L.push('', '## 2. Sơ đồ trạng thái', '');
L.push('```mermaid', 'stateDiagram-v2', '  [*] --> roll', '  [*] --> island: đang kẹt đảo', '  [*] --> tour: có vé World Tour',
  '  roll --> GiaiQuyetO: đổ, di chuyển', '  island --> GiaiQuyetO: ra đôi / hết hạn', '  island --> roll: trả phí / dùng thẻ', '  tour --> GiaiQuyetO: bay', '  tour --> roll: không bay',
  '  GiaiQuyetO --> buy', '  GiaiQuyetO --> upgrade', '  GiaiQuyetO --> takeover', '  GiaiQuyetO --> festival', '  GiaiQuyetO --> card', '  GiaiQuyetO --> debt: thiếu tiền (khoản treo)', '  GiaiQuyetO --> KetThucO',
  '  takeover --> upgrade: còn nâng được', '  buy --> KetThucO', '  upgrade --> KetThucO', '  takeover --> KetThucO', '  festival --> KetThucO', '  card --> KetThucO',
  '  debt --> KetThucO: bán đủ, trả khoản treo', '  debt --> LuotKe: phá sản', '  KetThucO --> roll: đổ đôi', '  KetThucO --> LuotKe', '  LuotKe --> [*]', '```', '');
L.push('| Bước | Khi nào | Hành động hợp lệ → kết quả |', '|---|---|---|');
for (const [kd, v] of Object.entries(R.STATES)) L.push(`| \`${kd}\` | ${v.desc} | ${Object.entries(v.actions).map(([a, d]) => `**${a}**: ${d}`).join('<br>')} |`);
L.push('', ...R.FLOW.map((f) => `- ${f}`));

L.push('', '## 3. Bảng quyết định', '');
let table = '';
for (const d of R.DECISIONS) {
  if (d.table !== table) { table = d.table; L.push('', `### ${table}`, '', '| Mã | Tình huống | Kết quả |', '|---|---|---|'); }
  L.push(`| ${d.id} | ${d.when} | ${d.then} |`);
}
L.push('');
const md = L.join('\n');
if (process.argv.includes('--check')) {
  if (!existsSync(OUT) || readFileSync(OUT, 'utf8') !== md) { console.error('docs/RULES.md chưa khớp rules.js — chạy: npm run rules:doc'); process.exit(1); }
  console.log('OK docs/RULES.md khớp rules.js');
} else { writeFileSync(OUT, md); console.log('Đã ghi docs/RULES.md'); }

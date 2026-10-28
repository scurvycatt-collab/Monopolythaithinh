// Tạo / xoá khung một map 2D mới (khung xương board2d + skin mẫu). Node thuần, không dependency.
//   npm run map:new <id> [-- --name "Tên hiển thị"] [--dry-run]
//   npm run map:new -- --remove <id> [--dry-run]
// Biến môi trường MAP_NEW_ROOT đổi thư mục gốc repo (dùng trong test).
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.MAP_NEW_ROOT || fileURLToPath(new URL('..', import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const RULES = path.join(PUBLIC, 'rules.js');
const ID_RE = /^[a-z0-9-]+$/;

const die = (msg) => { console.error(`Lỗi: ${msg}`); process.exit(1); };
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

function parseArgs(argv) {
  const o = { dry: false, remove: false, name: null, id: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') o.dry = true;
    else if (a === '--remove') o.remove = true;
    else if (a === '--name') { o.name = argv[++i]; if (!o.name) die('--name cần một giá trị, ví dụ --name "Tên hiển thị".'); }
    else if (a.startsWith('--name=')) o.name = a.slice(7);
    else if (a.startsWith('--')) die(`tuỳ chọn lạ "${a}". Có: --name, --dry-run, --remove.`);
    else if (!o.id) o.id = a;
    else die(`thừa đối số "${a}". Cú pháp: npm run map:new <id> [-- --name "Tên"].`);
  }
  return o;
}

const titleFromId = (id) => id.split('-').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---------- đọc / sửa mảng MAPS trong rules.js ---------- */
function mapsBlock(src) {
  const start = src.indexOf('const MAPS = [');
  if (start < 0) die('không tìm thấy `const MAPS = [` trong public/rules.js.');
  const nl = src.indexOf('\n', start);
  const m = /^[ \t]*\];[ \t]*$/m.exec(src.slice(nl));
  if (!m) die('không tìm thấy dấu `];` kết thúc mảng MAPS trong public/rules.js.');
  return { start, end: nl + m.index };   // end = vị trí đầu dòng `];`
}
function registeredIds() {
  const { MAPS } = createRequire(import.meta.url)(RULES);
  return MAPS;
}
function entryLine(id, name) {
  const desc = `Map 2D mới (khung xương board2d). Sửa public/maps/${id}/skin.js để đổi phong cách.`;
  return `    { id: ${q(id)}, name: ${q(name)}, description: ${q(desc)}, preview: ${q(`maps/${id}/preview.svg`)}, renderer: ${q(`maps/${id}/renderer.js`)} },\n`;
}

/* ---------- nội dung file sinh ra ---------- */
const RENDERER = `import { createBoard2D } from '../../js/render-common/board2d/index.js';
import skin from './skin.js';
export default (ctx) => createBoard2D(ctx, skin);
`;

function skinJs(id, name) {
  return `/* Skin "${name}" — sinh bởi npm run map:new. Chạy được ngay; thay dần từng slot (chú thích "THAY:").
   Hợp đồng: docs/contracts/map-skin.md · bút vẽ: public/js/render-common/board2d/PEN.md · kind có sẵn: KINDS.md.
   Chỉ dùng asset Kenney CC0 (public/assets/shared/) hoặc dựng bằng code. */
import { defineSkin } from '../../js/render-common/board2d/skin.js';

const flat = (col) => (g, c) => { g.fillStyle = col; g.fillRect(0, 0, c.cw, c.ch); };

export default defineSkin({
  id: ${q(id)},
  packs: ['kenney-iso-buildings', 'kenney-nature'],   // THAY: bỏ pack không dùng
  palette: {
    // THAY: 8 màu nhóm đất A…H (giữ đúng 8 khoá), hợp tông map
    groups: { A: '#f27aa6', B: '#8fcf4f', C: '#ffbf1f', D: '#1fb5d6', E: '#f07a2a', F: '#c43a3a', G: '#7b86e0', H: '#3fb0e8' },
    ground: '#bde69c', priceStrip: '#c6cdd6', priceText: '#5b6676', labelText: '#ffffff',
    boardSide: '#7a5236', boardSideDark: '#5e3d27', water: '#8fd6ef', sand: '#f1dcaa',
  },
  zones: null,   // THAY: mảng 4 zone nếu mỗi cạnh một theme (map-skin.md §4)
  slots: {
    tile: { paint: (g, c) => c.grass(g, 0, 0, c.cw, c.ch) },   // THAY: mặt ô đất (viền, hoa văn)
    deco: { kind: 'sprite', pick: ['tree_oak', 'tree_fat'], count: 2, tint: 'none' },   // THAY: cây / vật trang trí ô trống
    house: {   // THAY: 5 cấp nhà (0 = đất có cờ, 4 = Khách sạn); tên mảnh trong KINDS.md
      kind: 'kit',
      levels: [[[0, 0, ['128']]], [[0, 0, ['016'], '069']], [[0, 0, ['016', '047'], '082'], [1, 0, ['055']]], [[0, 0, ['016', '047', '047'], '083'], [1, 0, ['024', '051'], '090']], [[0, 0, ['016', '053', '053', '053']], [1, 0, ['000', '053', '053', '053']]]],
      wall: '#ffffff', sign: 'HOTEL',
    },
    resort: { kind: 'sprite', pick: ['tent_smallClosed'], tint: 'none' },   // THAY: ô resort chưa có chủ
    resortHouse: {   // THAY: công trình resort, 4 cấp theo số resort cùng chủ
      kind: 'kit',
      levels: [[[0, 0, ['128']]], [[0, 0, ['016'], '069']], [[0, 0, ['016', '047'], '082']], [[0, 0, ['016', '047', '047'], '083']]],
      wall: '#ffffff', sign: false,
    },
    start: { kind: 'sprite', pick: ['flower_redA'], tint: 'none', paint: flat('#ffe08a') },   // THAY: ô Start
    island: { kind: 'sprite', pick: ['rock_largeA'], tint: 'none', paint: flat('#8fd6ef'), side: ['#7cc3e0', '#5fa9c9'] },   // THAY: Lost Island
    festival: { kind: 'sprite', pick: ['tree_fat'], tint: 'none', paint: flat('#ffb36b') },   // THAY: Championships
    tour: { kind: 'sprite', pick: ['rock_tallA'], tint: 'none', paint: flat('#c9b6ff') },   // THAY: World Tour
    chance: { kind: 'sprite', pick: ['flower_yellowA'], tint: 'none', paint: flat('#fff1d8') },   // THAY: ô Chance
    tax: { kind: 'sprite', pick: ['rock_smallA'], tint: 'none', paint: flat('#dceef3') },   // THAY: ô Tax
    base: {   // THAY: đế bàn dưới 32 ô (khung viền mỏng)
      draw: (p, c) => { const a = c.half + c.margin - 0.1, y = c.y + 0.002; p.line3([[-a, y, a], [a, y, a], [a, y, -a], [-a, y, -a], [-a, y, a]], '#f5b934', 0.03); },
    },
    center: {   // THAY: giữa bàn (paint = mặt đất, draw = mỗi zone, core = vật ở tâm)
      core: (p) => { p.ellipseShadow(0, 0, 0.6, 0.15); p.cyl(0, 0, 0, 0.5, 0.2, '#e2dccb'); p.ball(0, 0.45, 0, 0.3, '#8fd6ef'); },
    },
  },
  labels: { resortLevels: ['Cấp 1', 'Cấp 2', 'Cấp 3', 'Cấp 4'] },   // THAY: tên 4 cấp nhà resort
});
`;
}

function previewSvg(id, name) {
  // vòng 32 ô: 9x9 lưới, mỗi cạnh 8 ô, ô góc ở 4 đỉnh
  const S = 40, X0 = 140, Y0 = 20, cells = [];
  for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
    if (i > 0 && i < 8 && j > 0 && j < 8) continue;
    const corner = (i === 0 || i === 8) && (j === 0 || j === 8);
    cells.push(`<rect x="${X0 + j * S}" y="${Y0 + i * S}" width="${S}" height="${S}" fill="${corner ? '#ffe08a' : '#bde69c'}" stroke="#7a5236" stroke-width="2"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" role="img" aria-labelledby="t d"><title id="t">${xml(name)}</title><desc id="d">Ảnh tạm của map ${xml(name)}: vòng 32 ô. Thay bằng ảnh thật khi skin xong.</desc><rect width="640" height="400" fill="#d9eef8"/>${cells.join('')}<rect x="${X0 + S}" y="${Y0 + S}" width="${S * 7}" height="${S * 7}" fill="#8fd6ef"/><text x="320" y="200" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="30" font-weight="700" fill="#33415c">${xml(name)}</text></svg>
`;
}

function readme(id, name) {
  return `# ${name} (2D, khung xương board2d)

Map khung do \`npm run map:new ${id}\` sinh ra. Đang dùng skin mẫu: chạy được nhưng chưa có phong cách riêng.

## File

- \`renderer.js\` — 3 dòng, gọi \`createBoard2D\` (không sửa tay).
- \`skin.js\` — toàn bộ phong cách: palette, 13 slot (chỗ cần thay có chú thích \`THAY:\`).
- \`preview.svg\` — ảnh lobby tạm, thay bằng ảnh thật.
- \`assets/\` — sprite riêng của map (PNG ≤ 512 px, tổng ≤ 1,5 MB). Hiện trống.

## Phong cách

(Mô tả ý tưởng: chủ đề, mỗi cạnh một zone hay cả bàn một theme, tông màu.)

## Asset

- Kenney Isometric Buildings và Nature Kit (CC0), dùng chung ở \`public/assets/shared/\`.
- (Ghi nguồn asset CC0 khác nếu thêm. Không dùng asset gốc Business Tour.)

## Còn thiếu

- Thay skin mẫu từng slot: tile, deco, house, resort, resortHouse, 4 góc, chance, tax, base, center.
- Chọn palette 8 nhóm đất, tên 4 cấp nhà resort (\`labels.resortLevels\`).
- Làm \`preview.svg\` thật; hoàn tất \`docs/contracts/map-parity.md\` và chạy \`npm run verify\` trước khi commit.
`;
}

/* ---------- lệnh ---------- */
function doCreate(o) {
  const { id } = o;
  if (!id) die('thiếu id map. Cú pháp: npm run map:new <id> [-- --name "Tên hiển thị"].');
  if (!ID_RE.test(id)) die(`id "${id}" không hợp lệ: chỉ dùng chữ thường a-z, số 0-9 và gạch nối (-).`);
  const dir = path.join(PUBLIC, 'maps', id);
  if (existsSync(dir)) die(`thư mục ${rel(dir)} đã tồn tại. Chọn id khác hoặc chạy --remove ${id}.`);
  if (registeredIds().some((m) => m.id === id)) die(`id "${id}" đã có trong MAPS (public/rules.js).`);
  const name = (o.name || titleFromId(id)).trim();
  if (!name) die('--name không được rỗng.');

  const files = [['renderer.js', RENDERER], ['skin.js', skinJs(id, name)], ['preview.svg', previewSvg(id, name)], ['README.md', readme(id, name)], ['assets/.gitkeep', '']];
  const line = entryLine(id, name);
  const src = readFileSync(RULES, 'utf8');
  const { end } = mapsBlock(src);

  console.log(`${o.dry ? '[dry-run] Sẽ tạo' : 'Đã tạo'} map "${id}" (${name}):`);
  for (const [f] of files) console.log(`  + ${rel(path.join(dir, f))}`);
  console.log(`  ~ ${rel(RULES)}: thêm entry vào MAPS`);
  if (!o.dry) {
    for (const [f, text] of files) { const p = path.join(dir, f); mkdirSync(path.dirname(p), { recursive: true }); writeFileSync(p, text); }
    writeFileSync(RULES, src.slice(0, end) + line + src.slice(end));
  }
  console.log(`
Bước tiếp theo:
  1. Sửa ${rel(path.join(dir, 'skin.js'))} (thay từng slot có chú thích "THAY:"), docs/contracts/map-skin.md, public/js/render-common/board2d/PEN.md.
  2. Điền ${rel(path.join(dir, 'README.md'))}; làm lại ${rel(path.join(dir, 'preview.svg'))}.
  3. Xem thử: PORT=3100 node server.js, mở http://localhost:3100, tạo phòng và chọn map "${name}".
  4. Kiểm tra docs/contracts/map-parity.md rồi chạy npm run verify trước khi commit. Dọn khi thử xong: npm run map:new -- --remove ${id}`);
}

function doRemove(o) {
  const { id } = o;
  if (!id) die('thiếu id cần xoá. Cú pháp: npm run map:new -- --remove <id>.');
  if (!ID_RE.test(id)) die(`id "${id}" không hợp lệ.`);
  const dir = path.join(PUBLIC, 'maps', id);
  const reg = registeredIds().find((m) => m.id === id);
  if (reg && reg.default) die(`"${id}" là map mặc định, không được xoá.`);
  const src = readFileSync(RULES, 'utf8');
  const { start, end } = mapsBlock(src);
  const block = src.slice(start, end);
  const lineRe = new RegExp(`^[ \\t]*\\{[^\\n]*\\bid:\\s*'${id}'[^\\n]*\\},?[ \\t]*\\n`, 'm');
  const hasLine = lineRe.test(block);
  const hasDir = existsSync(dir);
  if (!hasLine && !hasDir) die(`không có map "${id}" (không thư mục, không entry trong MAPS).`);
  console.log(`${o.dry ? '[dry-run] Sẽ xoá' : 'Đã xoá'} map "${id}":`);
  if (hasDir) console.log(`  - ${rel(dir)}/`);
  if (hasLine) console.log(`  ~ ${rel(RULES)}: bỏ entry khỏi MAPS`);
  if (o.dry) return;
  if (hasDir) rmSync(dir, { recursive: true, force: true });
  if (hasLine) writeFileSync(RULES, src.slice(0, start) + block.replace(lineRe, '') + src.slice(end));
}

const opts = parseArgs(process.argv.slice(2));
if (opts.remove) doRemove(opts); else doCreate(opts);

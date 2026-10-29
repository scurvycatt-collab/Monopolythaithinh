import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Kiểm tra tĩnh mọi map khai báo trong RULES.MAPS theo docs/contracts/map-renderer.md (mục 1–3).
// Không import renderer vì nó cần trình duyệt (canvas, three.js). Renderer 2D (docs/contracts/map-skin.md) gọi
// createBoard2D: kiểm tra khung xương có đủ hàm ★ và import skin.js trong Node để chạy defineSkin.
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const { MAPS } = require('../public/rules.js');

const DEFAULT_RENDERER = 'maps/map-1/renderer.js';
const REQUIRED_FNS = ['reset', 'sync', 'moveToken', 'rollDice', 'tileScreen', 'pick'];
const BOARD2D = 'js/render-common/board2d/index.js';
const errors = [];
const fail = (id, msg) => errors.push(`Map "${id}": ${msg}`);
const isFile = (p) => existsSync(p) && statSync(p).isFile();

if (!Array.isArray(MAPS) || MAPS.length === 0) errors.push('RULES.MAPS phải là mảng có ít nhất một map.');

const seen = new Set();
let defaults = 0;
for (const [i, entry] of (Array.isArray(MAPS) ? MAPS : []).entries()) {
  const id = typeof entry.id === 'string' ? entry.id : `#${i}`;
  if (typeof entry.id !== 'string' || !/^[a-z0-9-]+$/.test(entry.id)) fail(id, 'id phải khớp /^[a-z0-9-]+$/ (chữ thường, số, gạch nối).');
  if (seen.has(entry.id)) fail(id, 'id bị trùng với map khác.');
  seen.add(entry.id);
  if (entry.default === true) defaults++;
  if (typeof entry.name !== 'string' || !entry.name.trim()) fail(id, 'thiếu `name`.');

  if (entry.pets !== undefined) {
    if (!Array.isArray(entry.pets) || entry.pets.length !== 4) fail(id, '`pets` riêng phải có đúng 4 nhân vật.');
    else {
      const petIds = new Set(), petColors = new Set();
      for (const pet of entry.pets) {
        if (!pet || typeof pet.id !== 'string' || !/^[a-z0-9-]+$/.test(pet.id)) fail(id, 'nhân vật có id không hợp lệ.');
        if (!pet || typeof pet.n !== 'string' || !pet.n.trim()) fail(id, 'nhân vật thiếu tên.');
        if (!pet || typeof pet.c !== 'string' || !/^#[0-9a-f]{6}$/i.test(pet.c)) fail(id, `nhân vật "${pet && pet.id}" có màu không hợp lệ.`);
        if (petIds.has(pet.id)) fail(id, `id nhân vật bị trùng: ${pet.id}.`);
        if (petColors.has(pet.c.toLowerCase())) fail(id, `màu nhân vật bị trùng: ${pet.c}.`);
        petIds.add(pet.id); petColors.add(pet.c.toLowerCase());
        const imagePath = typeof pet.img === 'string' ? path.join(PUBLIC, pet.img) : '';
        if (!imagePath || !isFile(imagePath)) { fail(id, `thumbnail nhân vật không tồn tại: ${pet.img || '(trống)'}.`); continue; }
        const png = readFileSync(imagePath);
        if (png.length > 512 * 1024) fail(id, `thumbnail ${pet.img} vượt 512 KB.`);
        if (png.toString('ascii', 1, 4) !== 'PNG') { fail(id, `thumbnail ${pet.img} không phải PNG.`); continue; }
        const width = png.readUInt32BE(16), height = png.readUInt32BE(20), colorType = png[25];
        if (width !== 512 || height !== 512) fail(id, `thumbnail ${pet.img} phải đúng 512×512, hiện ${width}×${height}.`);
        const hasAlpha = [4, 6].includes(colorType) || (colorType === 3 && png.indexOf(Buffer.from('tRNS')) >= 0);
        if (!hasAlpha) fail(id, `thumbnail ${pet.img} phải có kênh alpha trong suốt (RGBA hoặc indexed PNG + tRNS).`);
      }
      const total = entry.pets.reduce((sum, pet) => { const p = pet && pet.img ? path.join(PUBLIC, pet.img) : ''; return sum + (p && isFile(p) ? statSync(p).size : 0); }, 0);
      if (total > 1.5 * 1024 * 1024) fail(id, `tổng thumbnail nhân vật ${(total / 1024 / 1024).toFixed(2)} MB vượt 1,5 MB.`);
    }
  }

  if (typeof entry.preview !== 'string' || !entry.preview) fail(id, 'thiếu `preview`.');
  else if (!isFile(path.join(PUBLIC, entry.preview))) fail(id, `file preview không tồn tại: public/${entry.preview}`);

  const rendererRel = entry.renderer || DEFAULT_RENDERER;
  const rendererPath = path.join(PUBLIC, rendererRel);
  if (!isFile(rendererPath)) {
    fail(id, `file renderer không tồn tại: public/${rendererRel}`);
  } else {
    const src = readFileSync(rendererPath, 'utf8');
    if (!/^\s*export\s+default\b/m.test(src)) fail(id, `renderer public/${rendererRel} thiếu \`export default\` (createRenderer).`);
    if (/\bcreateBoard2D\s*\(/.test(src)) {
      const lines = src.split('\n').filter((l) => l.trim()).length;
      if (lines !== 3) fail(id, `renderer 2D public/${rendererRel} phải đúng 3 dòng như contract map-skin, hiện có ${lines}.`);
      const skinPath = path.join(PUBLIC, path.dirname(rendererRel), 'skin.js');
      if (!isFile(skinPath)) fail(id, `renderer 2D thiếu public/${path.dirname(rendererRel)}/skin.js.`);
      else {
        try {
          const skin = (await import(pathToFileURL(skinPath).href)).default;
          if (!skin || skin.id !== entry.id) fail(id, `skin.js phải export default defineSkin({ id: '${entry.id}', … }).`);
          if (entry.id === 'four-seasons') {
            const winter = (skin.zones || []).find((zone) => zone.id === 'winter');
            if (!winter || winter.labelText !== '#17212b') fail(id, 'cạnh Mùa Đông phải dùng chữ đen để đủ tương phản trên nền tuyết.');
            if (skin.cityLabelBand !== 0.18) fail(id, 'dải màu Monopoly phải phủ nền tên địa danh với tỷ lệ 0.18 chiều sâu ô.');
          }
          if (entry.id === 'ben-10') {
            if ((skin.zones || []).length !== 4) fail(id, 'phải có đủ bốn vùng Bellwood, Pyronite, Petropia và Null Void.');
            if (skin.cityLabelBand !== 0.18) fail(id, 'dải màu Monopoly phải phủ nền tên địa danh với tỷ lệ 0.18 chiều sâu ô.');
            if ((skin.packs || []).length) fail(id, 'map Ben 10 phải giữ thiết kế Pen nhẹ, không tải asset pack ngoài.');
          }
          for (const p of Object.values(skin.sprites || {})) if (!isFile(path.join(PUBLIC, path.dirname(rendererRel), p))) fail(id, `sprite riêng không tồn tại: ${p}`);
          for (const pack of skin.packs) if (!existsSync(path.join(PUBLIC, 'assets/shared', pack, 'LICENSE.txt'))) fail(id, `pack dùng chung "${pack}" thiếu public/assets/shared/${pack}/LICENSE.txt.`);
        } catch (e) { fail(id, `skin.js không qua defineSkin: ${e.message}`); }
      }
    } else {
      const missing = REQUIRED_FNS.filter((fn) => !new RegExp(`\\b${fn}\\s*(\\(|:|=)`).test(src));
      if (missing.length) fail(id, `renderer public/${rendererRel} thiếu hàm bắt buộc (★): ${missing.join(', ')}.`);
    }
  }

  const dir = path.dirname(rendererRel);
  if (/^maps\/[^/]+$/.test(dir) && !isFile(path.join(PUBLIC, dir, 'README.md'))) {
    fail(id, `thư mục public/${dir}/ thiếu README.md.`);
  }
}
// khung xương 2D: phải hiện thực đủ hàm ★ của map-renderer contract
{
  const src = readFileSync(path.join(PUBLIC, BOARD2D), 'utf8');
  const missing = REQUIRED_FNS.filter((fn) => !new RegExp(`\\b${fn}\\s*(\\(|:|=)`).test(src));
  if (missing.length) errors.push(`Khung xương public/${BOARD2D} thiếu hàm bắt buộc (★): ${missing.join(', ')}.`);
  if (!/scheduleFrame\(active \?[^:]+: 250\)/.test(src)) errors.push('Khung 2D phải giảm nhịp đánh thức khi cảnh đứng yên.');
  if (!/document\.hidden/.test(src) || !/visibilitychange/.test(src)) errors.push('Khung 2D phải dừng render khi tab bị ẩn như Map 1.');
  if (!/const sprites = new Map\(\)/.test(src) || !/function cached\(key, fn\)/.test(src)) errors.push('Khung 2D phải cache sprite đã nướng thay vì tạo lại mỗi frame.');
  if (!/const TOKEN_HEIGHT = 1\.08;/.test(src) || !/H = TOKEN_HEIGHT \* K/.test(src)) errors.push('Khung 2D phải chuẩn hoá kích thước nhân vật bằng Map 1 (1.08).');
  if (/t\.price \+ 'K'/.test(src)) errors.push('Khung 2D không được hiện giá mua trên ô chưa có chủ.');
  for (const doc of ['PEN.md', 'KINDS.md']) if (!isFile(path.join(PUBLIC, path.dirname(BOARD2D), doc))) errors.push(`Khung xương thiếu ${doc}.`);
  // defineSkin phải bắt lỗi: thiếu slot bắt buộc
  const { defineSkin } = await import(pathToFileURL(path.join(PUBLIC, 'js/render-common/board2d/skin.js')).href);
  try { defineSkin({ id: 'x', palette: { groups: {} }, slots: {} }); errors.push('defineSkin không báo lỗi skin thiếu palette/slot.'); } catch (e) { /* đúng: phải lỗi */ }
}
{
  const parityPath = path.join(ROOT, 'docs/contracts/map-parity.md');
  if (!isFile(parityPath)) errors.push('Thiếu checklist parity bắt buộc docs/contracts/map-parity.md.');
  else {
    const parity = readFileSync(parityPath, 'utf8');
    for (const rule of ['không hiện giá mua', 'thẻ tới Championships', '1.08', 'npm run thumbnails', 'npm run verify']) {
      if (!parity.includes(rule)) errors.push(`Checklist parity thiếu quy tắc: ${rule}`);
    }
  }
  const map1 = readFileSync(path.join(PUBLIC, DEFAULT_RENDERER), 'utf8');
  if (!/if \(own\) text\(out \?/.test(map1)) errors.push('Map 1 phải chỉ hiện tiền thuê/mất điện khi ô đã có chủ.');
}
if (defaults !== 1) errors.push(`Phải có đúng một map \`default: true\`, hiện có ${defaults}.`);

if (errors.length) {
  console.error('Map registry tests FAILED:\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log('Map registry tests passed.');

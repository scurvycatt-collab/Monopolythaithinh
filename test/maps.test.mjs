import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Kiểm tra tĩnh mọi map khai báo trong RULES.MAPS theo docs/contracts/map-renderer.md (mục 1–3).
// Không import renderer vì nó cần trình duyệt (canvas, three.js). Renderer 2D (docs/contracts/map-skin.md) gọi
// createBoard2D: kiểm tra khung xương có đủ hàm ★ và import skin.js trong Node để chạy defineSkin.
const require = createRequire(import.meta.url);
const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
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
  for (const doc of ['PEN.md', 'KINDS.md']) if (!isFile(path.join(PUBLIC, path.dirname(BOARD2D), doc))) errors.push(`Khung xương thiếu ${doc}.`);
  // defineSkin phải bắt lỗi: thiếu slot bắt buộc
  const { defineSkin } = await import(pathToFileURL(path.join(PUBLIC, 'js/render-common/board2d/skin.js')).href);
  try { defineSkin({ id: 'x', palette: { groups: {} }, slots: {} }); errors.push('defineSkin không báo lỗi skin thiếu palette/slot.'); } catch (e) { /* đúng: phải lỗi */ }
}
if (defaults !== 1) errors.push(`Phải có đúng một map \`default: true\`, hiện có ${defaults}.`);

if (errors.length) {
  console.error('Map registry tests FAILED:\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log('Map registry tests passed.');

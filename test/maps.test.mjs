import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Kiểm tra tĩnh mọi map khai báo trong RULES.MAPS theo docs/contracts/map-renderer.md (mục 1–3).
// Không import renderer vì nó cần trình duyệt (canvas, three.js).
const require = createRequire(import.meta.url);
const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const { MAPS } = require('../public/rules.js');

const DEFAULT_RENDERER = 'maps/map-1/renderer.js';
const REQUIRED_FNS = ['reset', 'sync', 'moveToken', 'rollDice', 'tileScreen', 'pick'];
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
    const missing = REQUIRED_FNS.filter((fn) => !new RegExp(`\\b${fn}\\s*(\\(|:|=)`).test(src));
    if (missing.length) fail(id, `renderer public/${rendererRel} thiếu hàm bắt buộc (★): ${missing.join(', ')}.`);
  }

  const dir = path.dirname(rendererRel);
  if (/^maps\/[^/]+$/.test(dir) && !isFile(path.join(PUBLIC, dir, 'README.md'))) {
    fail(id, `thư mục public/${dir}/ thiếu README.md.`);
  }
}
if (defaults !== 1) errors.push(`Phải có đúng một map \`default: true\`, hiện có ${defaults}.`);

if (errors.length) {
  console.error('Map registry tests FAILED:\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log('Map registry tests passed.');

import { existsSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
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
  if (entry.tileNames !== undefined) {
    if (!Array.isArray(entry.tileNames) || entry.tileNames.length !== 32) fail(id, '`tileNames` phải có đúng 32 tên ánh xạ theo index.');
    else if (entry.tileNames.some((name) => typeof name !== 'string' || !name.trim())) fail(id, '`tileNames` không được có tên trống.');
  }

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
        if (entry.id === 'ben-10') {
          const tokenPath = typeof pet.tokenImg === 'string' ? path.join(PUBLIC, pet.tokenImg) : '';
          if (!tokenPath || !isFile(tokenPath)) fail(id, `quân cờ toàn thân không tồn tại: ${pet.tokenImg || '(trống)'}.`);
        }
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
    for (const forbidden of ['showCard', 'showStatus', 'CARD_CONFIRM_ACTION', 'lastCard', 'notice.kind', 'Game.act', 'G.act']) {
      if (src.includes(forbidden)) fail(id, `renderer không được xử lý luật/thông báo dùng chung (${forbidden}).`);
    }
    if (!/^\s*export\s+default\b/m.test(src)) fail(id, `renderer public/${rendererRel} thiếu \`export default\` (createRenderer).`);
    if (/\bcreateBoard2D\s*\(/.test(src)) {
      const lines = src.split('\n').filter((l) => l.trim()).length;
      if (lines !== 3) fail(id, `renderer 2D public/${rendererRel} phải đúng 3 dòng như contract map-skin, hiện có ${lines}.`);
      const skinPath = path.join(PUBLIC, path.dirname(rendererRel), 'skin.js');
      if (!isFile(skinPath)) fail(id, `renderer 2D thiếu public/${path.dirname(rendererRel)}/skin.js.`);
      else {
        try {
          const skinSource = readFileSync(skinPath, 'utf8');
          for (const forbidden of ['showCard', 'showStatus', 'CARD_CONFIRM_ACTION', 'lastCard', 'notice.kind', 'Game.act', 'G.act']) {
            if (skinSource.includes(forbidden)) fail(id, `skin không được xử lý luật/thông báo dùng chung (${forbidden}).`);
          }
          for (const other of MAPS.filter((map) => map.id !== entry.id)) {
            const escaped = other.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (new RegExp(`(?:from\\s+['"]|assets?\\/)(?:\\.\\.\\/)*${escaped}(?:\\/|['"])`).test(skinSource)) {
              fail(id, `skin/asset phải độc lập, không được dùng visual của map "${other.id}".`);
            }
          }
          const skin = (await import(pathToFileURL(skinPath).href)).default;
          if (!skin || skin.id !== entry.id) fail(id, `skin.js phải export default defineSkin({ id: '${entry.id}', … }).`);
          if (entry.id === 'four-seasons') {
            const winter = (skin.zones || []).find((zone) => zone.id === 'winter');
            if (!winter || winter.labelText !== '#17212b') fail(id, 'cạnh Mùa Đông phải dùng chữ đen để đủ tương phản trên nền tuyết.');
            if (skin.cityLabelBand !== 0.18) fail(id, 'dải màu Monopoly phải phủ nền tên địa danh với tỷ lệ 0.18 chiều sâu ô.');
          }
          if (entry.id === 'ben-10' || entry.id === 'ben-10-02') {
            if ((skin.zones || []).length !== 4) fail(id, 'phải có đủ bốn khu Ben 10.');
            if (skin.cityLabelBand !== 0.18) fail(id, 'dải màu Monopoly phải phủ nền tên địa danh với tỷ lệ 0.18 chiều sâu ô.');
            if ((skin.packs || []).length) fail(id, 'skin Ben 10 phải giữ thiết kế Pen nhẹ, không tải asset pack ngoài.');
            const buildingDir = path.join(PUBLIC, 'maps', entry.id, 'assets', 'buildings');
            const manifestPath = path.join(buildingDir, 'manifest.json');
            if (!isFile(manifestPath)) fail(id, 'thiếu manifest 20 thumbnail công trình tĩnh.');
            else {
              const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
              if (manifest.mapId !== entry.id || !Array.isArray(manifest.files) || manifest.files.length !== 20) fail(id, 'manifest công trình phải đúng map và đủ 20 file.');
              for (const file of manifest.files || []) {
                const full = path.join(buildingDir, file);
                if (!isFile(full)) { fail(id, `thiếu thumbnail công trình: ${file}`); continue; }
                const png = readFileSync(full);
                if (png.toString('ascii', 1, 4) !== 'PNG' || png.readUInt32BE(16) !== 512 || png.readUInt32BE(20) !== 512) fail(id, `thumbnail công trình ${file} phải là PNG 512×512.`);
              }
            }
            if (entry.id === 'ben-10') {
              for (const key of ['m3BoardBase', 'm3CenterOmnitrix', 'm3DicePad']) {
                if (!skin.spriteMeta || !skin.spriteMeta[key] || !Array.isArray(skin.spriteMeta[key].anchor)) fail(id, `sprite v2 ${key} phải khai báo anchor dùng thật trong renderer.`);
              }
              if (!Array.isArray(skin.diceAt) || skin.diceAt.length !== 2) fail(id, 'bệ xúc xắc Map 3 phải khai báo đúng hai vị trí xúc xắc.');
              const expectedResortLevels = ['Cổng dịch chuyển', 'Trạm vệ tinh', 'Trạm trung chuyển quỹ đạo', 'Pháo đài Plumber'];
              if (JSON.stringify(skin.labels?.resortLevels) !== JSON.stringify(expectedResortLevels)) fail(id, 'tên bốn cấp resort Map 3 phải khớp progression asset M3-D.');
            }
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
  const assetSrc = readFileSync(path.join(PUBLIC, 'js/render-common/board2d/assets.js'), 'utf8');
  if (!/OWNMETA\[name\]/.test(assetSrc) || !/meta\.anchor \|\| \[0\.5, 1\]/.test(assetSrc)) errors.push('Khung 2D phải dùng spriteMeta.anchor thật, không chỉ lưu metadata chết trong manifest.');
  if (!/OWNMETA\[n\]\?\.lazy/.test(assetSrc) || !/export async function ensureAssets/.test(assetSrc)) errors.push('Khung 2D phải bỏ qua sprite lazy khi cold-load và chỉ tải theo state.');
  if (!/ensureAssets\(stateAssets\(v\)\)/.test(src) || !/slot\.assets/.test(src)) errors.push('Khung 2D phải tải sprite công trình theo state trước khi dựng, không preload cả bộ map.');
  if (!/visual-scale\.js/.test(src) || !/H = TOKEN_HEIGHT \* K/.test(src) || !/PROPERTY_LEVEL_SCALE\[level\]/.test(src) || !/propertyRatio: PROPERTY_TILE_RATIO/.test(src)) errors.push('Khung 2D phải dùng chuẩn tỷ lệ quân, cấp nhà và ô đất chung của Map 1.');
  if (!/def\.tokenImg \|\| def\.img/.test(src)) errors.push('Khung 2D phải ưu tiên quân cờ toàn thân tokenImg và chỉ fallback về avatar img.');
  if (/t\.price \+ 'K'/.test(src)) errors.push('Khung 2D không được hiện giá mua trên ô chưa có chủ.');
  if (!/own\.pet/.test(src) || !/\|\$\{pet\}/.test(src)) errors.push('Cache công trình phải gồm pet của chủ để bốn bộ nhà Ben 10 không dùng nhầm sprite.');
  for (const doc of ['PEN.md', 'KINDS.md']) if (!isFile(path.join(PUBLIC, path.dirname(BOARD2D), doc))) errors.push(`Khung xương thiếu ${doc}.`);
  // defineSkin phải bắt lỗi: thiếu slot bắt buộc
  const { defineSkin } = await import(pathToFileURL(path.join(PUBLIC, 'js/render-common/board2d/skin.js')).href);
  try { defineSkin({ id: 'x', palette: { groups: {} }, slots: {} }); errors.push('defineSkin không báo lỗi skin thiếu palette/slot.'); } catch (e) { /* đúng: phải lỗi */ }
}
{
  const scalePath = path.join(PUBLIC, 'js/render-common/visual-scale.js');
  if (!isFile(scalePath)) errors.push('Thiếu chuẩn tỷ lệ thị giác chung visual-scale.js.');
  else {
    const scale = readFileSync(scalePath, 'utf8');
    if (!/TOKEN_HEIGHT = 1\.08/.test(scale) || !/PROPERTY_LEVEL_SCALE = Object\.freeze\(\[1, 1, 1\.03, 1\.06, 1\.08\]\)/.test(scale) || !/tileWidth: 1\.7/.test(scale) || !/tileDepth: 3\.1/.test(scale) || !/maxFootprintWidth: 0\.84/.test(scale) || !/maxFootprintDepth: 0\.58/.test(scale) || !/maxHeight: 1\.25/.test(scale)) errors.push('visual-scale.js thiếu tỷ lệ quân/cấp nhà/ô chuẩn Map 1.');
    const map1 = readFileSync(path.join(PUBLIC, DEFAULT_RENDERER), 'utf8');
    if (!/visual-scale\.js/.test(map1) || /const TOKEN_HEIGHT\s*=/.test(map1)) errors.push('Map 1 phải dùng visual-scale.js, không khai báo kích thước quân riêng.');
  }
}
{
  const capture = readFileSync(path.join(ROOT, 'scripts/capture-map-review.mjs'), 'utf8');
  if (!/mkdtempSync\(path\.join\(os\.tmpdir\(\), 'ttm-map-review-'\)\)/.test(capture)) errors.push('Script review map phải tạo profile trình duyệt trong thư mục temp của hệ điều hành.');
  if (!/rmSync\(profile, \{ recursive: true, force: true/.test(capture)) errors.push('Script review map phải xoá profile trình duyệt trong finally.');
  if (/path\.resolve\(`\.qa-cdp-profile-/.test(capture)) errors.push('Script review map không được tạo profile QA lẻ trong workspace.');
}
{
  const dicePath = path.join(PUBLIC, 'js', 'render-common', 'dice-roll.js');
  if (!isFile(dicePath)) errors.push('Thiếu quỹ đạo xúc xắc dùng chung public/js/render-common/dice-roll.js.');
  else {
    const dice = readFileSync(dicePath, 'utf8');
    if (!/export function diceRollFrame/.test(dice) || !/export const diceRollDuration/.test(dice)) errors.push('Module xúc xắc chung thiếu duration/frame chuẩn.');
    const map1Dice = readFileSync(path.join(PUBLIC, 'maps/map-1/renderer.js'), 'utf8');
    const board2dDice = readFileSync(path.join(PUBLIC, BOARD2D), 'utf8');
    if (!/render-common\/dice-roll\.js/.test(map1Dice) || !/dice-roll\.js/.test(board2dDice)) errors.push('Map 1 và khung Map 2–4 phải cùng gọi module xúc xắc chuẩn.');
    if (/const startP\s*=/.test(map1Dice)) errors.push('Map 1 không được thả xúc xắc từ trên cao; phải dùng quỹ đạo nảy tại chỗ chuẩn Map 2.');
  }
}
{
  const parityPath = path.join(ROOT, 'docs/contracts/map-parity.md');
  if (!isFile(parityPath)) errors.push('Thiếu checklist parity bắt buộc docs/contracts/map-parity.md.');
  else {
    const parity = readFileSync(parityPath, 'utf8');
    for (const rule of ['không hiện giá mua', 'thẻ tới Championships', '1.08', 'npm run thumbnails', 'npm run ben10:buildings', 'npm run verify']) {
      if (!parity.includes(rule)) errors.push(`Checklist parity thiếu quy tắc: ${rule}`);
    }
  }
  const buildChecklistPath = path.join(ROOT, 'docs/contracts/map-build-checklist.md');
  if (!isFile(buildChecklistPath)) errors.push('Thiếu cổng nghiệm thu docs/contracts/map-build-checklist.md.');
  else {
    const checklist = readFileSync(buildChecklistPath, 'utf8');
    for (const rule of ['20 biến thể', 'tileNames[index]', 'World Tour', 'delta-time', 'Trang chủ chỉ tải preview nhẹ', 'Điều kiện commit/deploy']) {
      if (!checklist.includes(rule)) errors.push(`Checklist build map thiếu quy tắc: ${rule}`);
    }
  }
  const map1 = readFileSync(path.join(PUBLIC, DEFAULT_RENDERER), 'utf8');
  if (!/if \(own\) text\(out \?/.test(map1)) errors.push('Map 1 phải chỉ hiện tiền thuê/mất điện khi ô đã có chủ.');
}
if (defaults !== 1) errors.push(`Phải có đúng một map \`default: true\`, hiện có ${defaults}.`);

{
  const boardSrc = readFileSync(path.join(PUBLIC, BOARD2D), 'utf8');
  const captureSrc = readFileSync(path.join(ROOT, 'scripts/capture-map-review.mjs'), 'utf8');
  const m3 = readFileSync(path.join(PUBLIC, 'maps/ben-10/skin.js'), 'utf8');
  if (!/SL\.bonus && SL\.bonus\.assets/.test(boardSrc) || !/SL\.outage && SL\.outage\.assets/.test(boardSrc)) errors.push('Banner festival va marker outage phai tai lazy theo state that.');
  if (!/--state-assets/.test(captureSrc) || !/stateAssetLoad/.test(captureSrc)) errors.push('Script review map phai do request-list asset lazy truoc/sau state.');
  for (const name of ['m3Start', 'm3NullVoid', 'm3Championship', 'm3Tour', 'm3Chance1', 'm3Chance2', 'm3Chance3', 'm3Tax', 'm3Festival', 'm3Outage']) {
    if (!m3.includes(name)) errors.push(`Map 3 thieu asset M3-B: ${name}.`);
  }
  if (!/m3Festival: \{ anchor: \[0\.5, 0\.9375\], lazy: true \}/.test(m3) || !/m3Outage: \{ anchor: \[0\.5, 0\.9375\], lazy: true \}/.test(m3)) errors.push('Festival/outage Map 3 phai lazy.');
  if (!/c\.tile === 20 \? 'm3Chance2' : c\.tile === 28 \? 'm3Chance3' : 'm3Chance1'/.test(m3)) errors.push('Ba o Chance Map 3 phai dung ba silhouette rieng.');
}
{
  const id = 'ben-10-02';
  const skinPath = path.join(PUBLIC, 'maps/ben-10-02/skin.js');
  const skin = (await import(pathToFileURL(skinPath).href)).default;
  const required = [
    'm4BoardBase', 'm4CenterOmnitrix', 'm4AlienRing', 'm4MountRushmore',
    'm4PyronVolcano', 'm4NeonCity', 'm4CrystalCitadel', 'm4TechMetropolis',
    'm4DesertFortress', 'm4BlueDomes', 'm4PurpleCastle', 'm4JungleDomain',
    'm4CardPadCharge', 'm4CardPadPlumber', 'm4DicePad', 'm4CenterProps'
  ];
  for (const key of required) {
    if (!skin.sprites?.[key] || !skin.spriteMeta?.[key] || !Array.isArray(skin.spriteMeta[key].anchor)) fail(id, `sprite M4-A ${key} must declare a runtime path and anchor.`);
  }
  const manifestPath = path.join(PUBLIC, 'maps/ben-10-02/assets/v2/manifest.json');
  if (!isFile(manifestPath)) fail(id, 'missing Map 4 v2 asset manifest.');
  else {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const batch = (manifest.assets || []).filter((asset) => asset.batch === 'M4-A');
    if (manifest.mapId !== id || batch.length !== 16) fail(id, 'Map 4 manifest must contain exactly 16 M4-A assets.');
    const expectedBiomeTiles = {
      'm4-tech-metropolis': [17, 19],
      'm4-desert-fortress': [21, 22, 23],
      'm4-blue-domes': [29, 31]
    };
    for (const [assetId, indexes] of Object.entries(expectedBiomeTiles)) {
      const asset = batch.find((item) => item.id === assetId);
      if (!asset || JSON.stringify(asset.tileIndexes) !== JSON.stringify(indexes)) fail(id, `${assetId} must remain mapped to tile indexes ${indexes.join(',')}.`);
    }
    for (const asset of batch) {
      const full = path.join(PUBLIC, 'maps/ben-10-02/assets/v2', asset.path || '');
      if (!isFile(full)) { fail(id, `missing M4-A asset: ${asset.path || asset.id}`); continue; }
      const bytes = readFileSync(full);
      const sha256 = createHash('sha256').update(bytes).digest('hex').toUpperCase();
      if (bytes.length !== asset.bytes || sha256 !== asset.sha256) fail(id, `M4-A checksum/bytes do not match manifest: ${asset.id}.`);
      if (bytes.length > 180 * 1024) fail(id, `M4-A asset ${asset.id} exceeds 180 KiB.`);
    }
    const specialBatch = (manifest.assets || []).filter((asset) => asset.batch === 'M4-B');
    if (specialBatch.length !== 10) fail(id, 'Map 4 manifest must contain exactly 10 M4-B special assets.');
    for (const asset of specialBatch) {
      const full = path.join(PUBLIC, 'maps/ben-10-02/assets/v2', asset.path || '');
      if (!isFile(full)) { fail(id, `missing M4-B asset: ${asset.path || asset.id}`); continue; }
      const bytes = readFileSync(full);
      const sha256 = createHash('sha256').update(bytes).digest('hex').toUpperCase();
      if (bytes.length !== asset.bytes || sha256 !== asset.sha256) fail(id, `M4-B checksum/bytes do not match manifest: ${asset.id}.`);
      if (bytes.length > 180 * 1024) fail(id, `M4-B asset ${asset.id} exceeds 180 KiB.`);
    }
    for (const key of ['m4SpecialStart', 'm4SpecialNullVoid', 'm4SpecialChampionship', 'm4SpecialTour', 'm4SpecialChance1', 'm4SpecialChance2', 'm4SpecialChance3', 'm4SpecialTax', 'm4SpecialFestival', 'm4SpecialOutage']) {
      if (!skin.sprites?.[key] || !skin.spriteMeta?.[key]) fail(id, `missing runtime M4-B sprite mapping: ${key}.`);
    }
    if (!skin.spriteMeta?.m4SpecialFestival?.lazy || !skin.spriteMeta?.m4SpecialOutage?.lazy) fail(id, 'Map 4 festival and outage assets must remain lazy.');
    if (!skin.slots?.bonus?.assets || !skin.slots?.outage?.assets) fail(id, 'Map 4 state overlays must declare lazy asset resolvers.');
    const skinSource = readFileSync(skinPath, 'utf8');
    if (!/c\.tile === 20 \? 'm4SpecialChance2' : c\.tile === 28 \? 'm4SpecialChance3' : 'm4SpecialChance1'/.test(skinSource)) fail(id, 'three Map 4 Chance tiles must use three distinct silhouettes.');
    const benBuildings = (manifest.assets || []).filter((asset) => asset.batch === 'M4-C-Ben');
    if (benBuildings.length !== 5) fail(id, 'Map 4 manifest must contain exactly five M4-C-Ben property levels.');
    for (const asset of benBuildings) {
      const full = path.join(PUBLIC, 'maps/ben-10-02/assets/v2', asset.path || '');
      if (!isFile(full)) { fail(id, `missing M4-C-Ben asset: ${asset.path || asset.id}`); continue; }
      const bytes = readFileSync(full);
      const sha256 = createHash('sha256').update(bytes).digest('hex').toUpperCase();
      if (bytes.length !== asset.bytes || sha256 !== asset.sha256) fail(id, `M4-C-Ben checksum/bytes do not match manifest: ${asset.id}.`);
      if (bytes.length > 180 * 1024) fail(id, `M4-C-Ben asset ${asset.id} exceeds 180 KiB.`);
    }
    for (let level = 0; level < 5; level++) {
      const key = `m4BuildingBen${level}`;
      if (!skin.sprites?.[key] || !skin.spriteMeta?.[key]?.lazy) fail(id, `missing lazy runtime M4-C-Ben sprite mapping: ${key}.`);
    }
    const gwenBuildings = (manifest.assets || []).filter((asset) => asset.batch === 'M4-C-Gwen');
    if (gwenBuildings.length !== 5) fail(id, 'Map 4 manifest must contain exactly five M4-C-Gwen property levels.');
    for (const asset of gwenBuildings) {
      const full = path.join(PUBLIC, 'maps/ben-10-02/assets/v2', asset.path || '');
      if (!isFile(full)) { fail(id, `missing M4-C-Gwen asset: ${asset.path || asset.id}`); continue; }
      const bytes = readFileSync(full);
      const sha256 = createHash('sha256').update(bytes).digest('hex').toUpperCase();
      if (bytes.length !== asset.bytes || sha256 !== asset.sha256) fail(id, `M4-C-Gwen checksum/bytes do not match manifest: ${asset.id}.`);
      if (bytes.length > 180 * 1024) fail(id, `M4-C-Gwen asset ${asset.id} exceeds 180 KiB.`);
    }
    for (let level = 0; level < 5; level++) {
      const key = `m4BuildingGwen${level}`;
      if (!skin.sprites?.[key] || !skin.spriteMeta?.[key]?.lazy) fail(id, `missing lazy runtime M4-C-Gwen sprite mapping: ${key}.`);
    }
    const kevinBuildings = (manifest.assets || []).filter((asset) => asset.batch === 'M4-C-Kevin');
    if (kevinBuildings.length !== 5) fail(id, 'Map 4 manifest must contain exactly five M4-C-Kevin property levels.');
    for (const asset of kevinBuildings) {
      const full = path.join(PUBLIC, 'maps/ben-10-02/assets/v2', asset.path || '');
      if (!isFile(full)) { fail(id, `missing M4-C-Kevin asset: ${asset.path || asset.id}`); continue; }
      const bytes = readFileSync(full);
      const sha256 = createHash('sha256').update(bytes).digest('hex').toUpperCase();
      if (bytes.length !== asset.bytes || sha256 !== asset.sha256) fail(id, `M4-C-Kevin checksum/bytes do not match manifest: ${asset.id}.`);
      if (bytes.length > 180 * 1024) fail(id, `M4-C-Kevin asset ${asset.id} exceeds 180 KiB.`);
    }
    for (let level = 0; level < 5; level++) {
      const key = `m4BuildingKevin${level}`;
      if (!skin.sprites?.[key] || !skin.spriteMeta?.[key]?.lazy) fail(id, `missing lazy runtime M4-C-Kevin sprite mapping: ${key}.`);
    }
    const rookBuildings = (manifest.assets || []).filter((asset) => asset.batch === 'M4-C-Rook');
    if (rookBuildings.length !== 5) fail(id, 'Map 4 manifest must contain exactly five M4-C-Rook property levels.');
    for (const asset of rookBuildings) {
      const full = path.join(PUBLIC, 'maps/ben-10-02/assets/v2', asset.path || '');
      if (!isFile(full)) { fail(id, `missing M4-C-Rook asset: ${asset.path || asset.id}`); continue; }
      const bytes = readFileSync(full);
      const sha256 = createHash('sha256').update(bytes).digest('hex').toUpperCase();
      if (bytes.length !== asset.bytes || sha256 !== asset.sha256) fail(id, `M4-C-Rook checksum/bytes do not match manifest: ${asset.id}.`);
      if (bytes.length > 180 * 1024) fail(id, `M4-C-Rook asset ${asset.id} exceeds 180 KiB.`);
    }
    for (let level = 0; level < 5; level++) {
      const key = `m4BuildingRook${level}`;
      if (!skin.sprites?.[key] || !skin.spriteMeta?.[key]?.lazy) fail(id, `missing lazy runtime M4-C-Rook sprite mapping: ${key}.`);
    }
    if (!skin.slots?.house?.assets) fail(id, 'Map 4 houses must declare a lazy asset resolver.');
    else {
      const assets = skin.slots.house.assets({ pet: 'ben10-02-ben', level: 3 });
      if (JSON.stringify(assets) !== JSON.stringify(['m4BuildingBen3'])) fail(id, 'Map 4 Ben house resolver must map owner and level to the matching raster asset.');
      const gwenAssets = skin.slots.house.assets({ pet: 'ben10-02-gwen', level: 2 });
      if (JSON.stringify(gwenAssets) !== JSON.stringify(['m4BuildingGwen2'])) fail(id, 'Map 4 Gwen house resolver must map owner and level to the matching raster asset.');
      const kevinAssets = skin.slots.house.assets({ pet: 'ben10-02-kevin', level: 4 });
      if (JSON.stringify(kevinAssets) !== JSON.stringify(['m4BuildingKevin4'])) fail(id, 'Map 4 Kevin house resolver must map owner and level to the matching raster asset.');
      const rookAssets = skin.slots.house.assets({ pet: 'ben10-02-rook', level: 1 });
      if (JSON.stringify(rookAssets) !== JSON.stringify(['m4BuildingRook1'])) fail(id, 'Map 4 Rook house resolver must map owner and level to the matching raster asset.');
    }
    const verifyBatch = (batchName, expectedCount, maxBytes = 180 * 1024) => {
      const assets = (manifest.assets || []).filter((asset) => asset.batch === batchName);
      if (assets.length !== expectedCount) fail(id, `Map 4 manifest must contain exactly ${expectedCount} ${batchName} assets.`);
      for (const asset of assets) {
        const full = path.resolve(PUBLIC, 'maps/ben-10-02/assets/v2', asset.path || '');
        if (!isFile(full)) { fail(id, `missing ${batchName} asset: ${asset.path || asset.id}`); continue; }
        const bytes = readFileSync(full);
        const sha256 = createHash('sha256').update(bytes).digest('hex').toUpperCase();
        if (bytes.length !== asset.bytes || sha256 !== asset.sha256) fail(id, `${batchName} checksum/bytes do not match manifest: ${asset.id}.`);
        if (bytes.length > maxBytes) fail(id, `${batchName} asset ${asset.id} exceeds ${Math.round(maxBytes / 1024)} KiB.`);
      }
      return assets;
    };
    verifyBatch('M4-D-Resort', 5);
    verifyBatch('M4-D-Characters', 8);
    verifyBatch('M4-E-Decor', 8);
    verifyBatch('M4-E-UI', 5, 180 * 1024);
    const productionMap34 = isFile(path.join(ROOT, 'docs/plans/map-3-4-asset-production.md'));
    for (const batchName of ['M4-D-Resort', 'M4-D-Characters', 'M4-E-Decor', 'M4-E-UI']) {
      for (const asset of (manifest.assets || []).filter((item) => item.batch === batchName)) {
        const [x, y, width, height] = asset.contentBounds || [];
        const [canvasWidth, canvasHeight] = asset.canvas || [];
        if (![x, y, width, height, canvasWidth, canvasHeight].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > canvasWidth || y + height > canvasHeight) fail(id, `${asset.id} has invalid alpha content bounds.`);
        if (!asset.qaEvidence || (productionMap34 && !isFile(path.join(ROOT, asset.qaEvidence)))) fail(id, `${asset.id} is missing its QA evidence file.`);
      }
    }
    const runtimeReportPath = path.join(ROOT, 'docs/reviews/map34/ben-10-02/M4-E/runtime-request-list.json');
    if (productionMap34 && !isFile(runtimeReportPath)) fail(id, 'Map 4 is missing its runtime request-list evidence.');
    else if (isFile(runtimeReportPath)) {
      const runtimeReport = JSON.parse(readFileSync(runtimeReportPath, 'utf8'));
      if (runtimeReport.coldBytes > runtimeReport.coldBudgetBytes || runtimeReport.coldBytes > 2.5 * 1024 * 1024) fail(id, 'Map 4 cold assets exceed the 2.5 MiB budget.');
      if (!runtimeReport.lazyAssets?.some((asset) => asset.path === 'resorts/m4-resort-4.webp')) fail(id, 'Map 4 request list must prove resort levels 1-4 are lazy.');
    }
    const assetsIgnore = path.join(PUBLIC, '.assetsignore');
    if (!isFile(assetsIgnore) || !/maps\/\*\/assets\/v2\/source\/\*\*/.test(readFileSync(assetsIgnore, 'utf8'))) fail(id, 'Map source masters must be excluded from production static assets.');
    for (let level = 0; level <= 4; level++) {
      const key = `m4Resort${level}`;
      if (!skin.sprites?.[key] || !skin.spriteMeta?.[key]) fail(id, `missing runtime M4-D resort sprite: ${key}.`);
      if (level > 0 && !skin.spriteMeta?.[key]?.lazy) fail(id, `${key} must remain lazy.`);
    }
    if (!skin.slots?.resortHouse?.assets || JSON.stringify(skin.slots.resortHouse.assets({ level: 4 })) !== JSON.stringify(['m4Resort4'])) fail(id, 'Map 4 resort resolver must map count to matching raster level.');
    for (const letter of 'ABCDEFGH') if (!skin.sprites?.[`m4Decor${letter}`] || !skin.spriteMeta?.[`m4Decor${letter}`]) fail(id, `missing Map 4 decor ${letter} runtime mapping.`);
    if (!skin.slots?.deco?.assets || JSON.stringify(skin.slots.deco.assets({ group: 'H' })) !== JSON.stringify(['m4DecorH'])) fail(id, 'Map 4 decor resolver must map group to matching biome sprite.');
    const mapEntry = MAPS.find((item) => item.id === 'ben-10-02');
    if (!mapEntry?.preview?.includes('/assets/v2/ui/m4-map-preview.webp') || !mapEntry?.background?.includes('/assets/v2/ui/m4-home-background.webp')) fail(id, 'Map 4 must use approved v2 preview and home background outputs.');
    for (const pet of mapEntry?.pets || []) if (!pet.tokenImg?.includes('/assets/v2/characters/m4-token-')) fail(id, `Map 4 pet ${pet.id} must use a full-body v2 token.`);
  }
}
if (errors.length) {
  console.error('Map registry tests FAILED:\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log('Map registry tests passed.');

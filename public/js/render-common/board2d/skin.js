/* Khung xương 2D — defineSkin: kiểm tra skin theo docs/contracts/map-skin.md lúc tải.
   Không dùng DOM: test/maps.test.mjs import file này trong Node. Lỗi nêu rõ trường, tiếng Việt. */
import { KINDS, PIECES, PACKS, PARTICLES } from './packs.js';

export const SLOTS = ['tile', 'house', 'deco', 'resort', 'resortHouse', 'start', 'island', 'festival', 'tour', 'chance', 'tax', 'bonus', 'outage', 'base', 'center'];
export const REQUIRED = ['tile', 'house', 'resort', 'resortHouse', 'start', 'island', 'festival', 'tour', 'chance', 'tax'];
const GROUP_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const HEX = /^#[0-9a-f]{6}$/i;
const FNS = { center: ['paint', 'draw', 'core'] };

class SkinError extends Error {}
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

export function defineSkin(skin) {
  const err = (field, msg) => { throw new SkinError(`Skin "${(skin && skin.id) || '?'}": ${field} ${msg}`); };
  if (!isObj(skin)) throw new SkinError('Skin phải là một object.');
  if (typeof skin.id !== 'string' || !/^[a-z0-9-]+$/.test(skin.id)) err('id', 'phải là chuỗi chữ thường, số, gạch nối.');
  const packs = skin.packs || [];
  if (!Array.isArray(packs)) err('packs', 'phải là mảng tên pack.');
  packs.forEach((p) => { if (!PACKS.includes(p)) err('packs', `có pack không tồn tại "${p}" (có: ${PACKS.join(', ')}).`); });
  if (skin.sprites !== undefined) {
    if (!isObj(skin.sprites)) err('sprites', 'phải là object { tên: đường dẫn }.');
    for (const [n, p] of Object.entries(skin.sprites)) if (typeof p !== 'string' || !/\.(png|webp|svg)$/i.test(p) || /^(\/|[a-z]+:)/i.test(p)) err(`sprites.${n}`, 'phải là đường dẫn tương đối tới ảnh .png/.webp/.svg trong thư mục map.');
  }
  if (skin.spriteMeta !== undefined) {
    if (!isObj(skin.spriteMeta)) err('spriteMeta', 'phải là object { tên: { anchor: [x,y] } }.');
    for (const [n, meta] of Object.entries(skin.spriteMeta)) {
      if (!skin.sprites || !skin.sprites[n]) err(`spriteMeta.${n}`, 'phải trỏ tới một sprite đã khai báo.');
      if (!isObj(meta) || !Array.isArray(meta.anchor) || meta.anchor.length !== 2 || meta.anchor.some((v) => !Number.isFinite(v) || v < 0 || v > 1)) err(`spriteMeta.${n}.anchor`, 'phải là [x,y], mỗi giá trị trong khoảng 0…1.');
      if (meta.lazy !== undefined && typeof meta.lazy !== 'boolean') err(`spriteMeta.${n}.lazy`, 'phải là boolean.');
    }
  }
  if (skin.diceAt !== undefined && (!Array.isArray(skin.diceAt) || skin.diceAt.length !== 2 || skin.diceAt.some((p) => !Array.isArray(p) || p.length !== 2 || p.some((v) => !Number.isFinite(v))))) err('diceAt', 'phải gồm đúng hai tọa độ [[x,z],[x,z]].');

  const pal = skin.palette;
  if (!isObj(pal)) err('palette', 'bắt buộc.');
  if (!isObj(pal.groups)) err('palette.groups', 'bắt buộc: { A…H: "#hex" }.');
  GROUP_KEYS.forEach((g) => { if (!HEX.test(pal.groups[g] || '')) err(`palette.groups.${g}`, 'phải là màu "#rrggbb".'); });
  Object.keys(pal.groups).forEach((g) => { if (!GROUP_KEYS.includes(g)) err('palette.groups', `có khoá lạ "${g}" (chỉ A…H như rules.GROUPS).`); });
  for (const [k, v] of Object.entries(pal)) if (k !== 'groups' && !HEX.test(v)) err(`palette.${k}`, 'phải là màu "#rrggbb".');
  if (skin.cityLabelBand !== undefined && (!Number.isFinite(skin.cityLabelBand) || skin.cityLabelBand <= 0 || skin.cityLabelBand > 0.3)) err('cityLabelBand', 'phải là tỷ lệ > 0 và ≤ 0.3 chiều sâu ô.');

  if (skin.zones !== null && skin.zones !== undefined) {
    if (!Array.isArray(skin.zones) || skin.zones.length !== 4) err('zones', 'phải là mảng đúng 4 phần tử (cạnh 0…3) hoặc null.');
    skin.zones.forEach((z, k) => {
      if (!isObj(z) || typeof z.id !== 'string') err(`zones[${k}]`, 'phải có id.');
      if (z.particles !== undefined && !PARTICLES.includes(z.particles)) err(`zones[${k}].particles`, `phải là một trong ${PARTICLES.join(', ')}.`);
      for (const [f, v] of Object.entries(z)) if (f !== 'id' && f !== 'particles' && typeof v === 'string' && v.startsWith('#') && !HEX.test(v)) err(`zones[${k}].${f}`, 'màu sai định dạng.');
    });
  }

  const slots = skin.slots;
  if (!isObj(slots)) err('slots', 'bắt buộc.');
  Object.keys(slots).forEach((s) => { if (!SLOTS.includes(s)) err(`slots.${s}`, `không phải slot hợp lệ (có: ${SLOTS.join(', ')}).`); });
  REQUIRED.forEach((s) => { if (!slots[s]) err(`slots.${s}`, 'là slot bắt buộc (★) nhưng đang thiếu.'); });
  for (const [s, v] of Object.entries(slots)) {
    if (!isObj(v)) err(`slots.${s}`, 'phải là object { kind, … } hoặc { paint, draw }.');
    if (v.kind !== undefined) {
      if (!KINDS[v.kind]) err(`slots.${s}.kind`, `"${v.kind}" không có (có: ${Object.keys(KINDS).join(', ')}).`);
      if (!KINDS[v.kind].slots.includes(s)) err(`slots.${s}.kind`, `"${v.kind}" chỉ dùng cho slot ${KINDS[v.kind].slots.join(', ')}.`);
      if (v.kind === 'kit') checkKit(v, s, err, packs);
      if (v.kind === 'sprite') { if (!packs.includes('kenney-nature')) err('packs', 'thiếu "kenney-nature" cho kind sprite.'); if (!Array.isArray(v.pick) || !v.pick.length || v.pick.some((n) => typeof n !== 'string')) err(`slots.${s}.pick`, 'phải là mảng tên sprite.'); }
    } else {
      const fns = FNS[s] || ['paint', 'draw'];
      if (!fns.some((f) => typeof v[f] === 'function')) err(`slots.${s}`, `cần ít nhất một hàm ${fns.join(' / ')} hoặc một kind.`);
    }
    for (const f of ['paint', 'draw', 'core', 'under', 'over']) if (v[f] !== undefined && typeof v[f] !== 'function') err(`slots.${s}.${f}`, 'phải là hàm.');
    if (v.assets !== undefined && typeof v.assets !== 'function') err(`slots.${s}.assets`, 'phải là hàm trả về danh sách sprite cần theo state.');
    if (v.label !== undefined && v.label !== false && !(Array.isArray(v.label) && v.label.length === 4 && v.label.every(Number.isFinite))) err(`slots.${s}.label`, 'phải là [x, y, cỡ, rộng] (tỉ lệ ô) hoặc false.');
  }

  const amb = skin.ambient;
  if (amb !== undefined) {
    if (!isObj(amb)) err('ambient', 'phải là object.');
    if (amb.animate !== undefined) { if (!isObj(amb.animate)) err('ambient.animate', 'phải là object { tên: hàm(pen, t, c) }.'); for (const [n, f] of Object.entries(amb.animate)) if (typeof f !== 'function') err(`ambient.animate.${n}`, 'phải là hàm.'); }
    if (amb.particles !== undefined && !isObj(amb.particles)) err('ambient.particles', 'phải là object.');
  }
  if (skin.labels !== undefined) { if (!isObj(skin.labels)) err('labels', 'phải là object.'); for (const [k, v] of Object.entries(skin.labels)) { if (k === 'resortLevels') { if (!Array.isArray(v) || v.length !== 4 || v.some((x) => typeof x !== 'string')) err('labels.resortLevels', 'phải là mảng 4 tên cấp nhà resort.'); } else if (typeof v !== 'string') err(`labels.${k}`, 'phải là chuỗi.'); } }
  return Object.freeze({ zones: null, sprites: {}, spriteMeta: {}, ambient: {}, labels: {}, ...skin, packs });
}

function checkKit(v, s, err, packs) {
  if (!packs.includes('kenney-iso-buildings')) err('packs', 'thiếu "kenney-iso-buildings" cho kind kit.');
  const n = s === 'house' ? 5 : 4;
  if (!Array.isArray(v.levels) || v.levels.length !== n) err(`slots.${s}.levels`, `phải có đúng ${n} cấp.`);
  v.levels.forEach((plan, lv) => {
    if (!Array.isArray(plan) || !plan.length) err(`slots.${s}.levels[${lv}]`, 'phải là mảng chồng khối [gx, gz, [tầng], mái?].');
    plan.forEach((st) => {
      if (!Array.isArray(st) || !Number.isFinite(st[0]) || !Number.isFinite(st[1]) || !Array.isArray(st[2])) err(`slots.${s}.levels[${lv}]`, 'mỗi chồng khối là [gx, gz, [tầng…], mái?].');
      [...st[2], ...(st[3] ? [st[3]] : [])].forEach((p) => { if (!PIECES.includes(p)) err(`slots.${s}.levels[${lv}]`, `mảnh khối "${p}" không có trong kenney-iso-buildings.`); });
    });
  });
  if (v.heights !== undefined && (!Array.isArray(v.heights) || v.heights.length !== n)) err(`slots.${s}.heights`, `phải có ${n} số.`);
}

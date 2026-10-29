/* Khung xương 2D (canvas 2D, isometric cố định) — hiện thực docs/contracts/map-renderer.md cho mọi skin
   theo docs/contracts/map-skin.md. Map 2D chỉ cần:  export default (ctx) => createBoard2D(ctx, skin);
   Lớp vẽ: (1) cảnh tĩnh nướng vào một canvas cỡ màn hình — đế, mặt giữa bàn, 32 ô, mọi sprite (nhà, góc, hội chợ…),
   chỉ dựng lại khi đổi khung nhìn hoặc trạng thái; (2) mỗi khung: chép cảnh tĩnh, ambient (trừ low), quân, xúc xắc,
   hoạt ảnh xây nhà, pháo giấy, làm tối khi chọn ô. Bàn trống ở low = một lần drawImage + quân. */
import { Pen, P, CX, CY, swapPen, bake, canvas, fitText, shade, mix, light, rgb, rng, hash, wp, FONT } from './pen.js';
import { loadAssets, composeKit } from './assets.js';
import { diceRollDuration, diceRollFrame } from '../dice-roll.js';
import { TOKEN_HEIGHT, PROPERTY_LEVEL_SCALE, PROPERTY_TILE_RATIO } from '../visual-scale.js';

const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// kích thước bàn (đơn vị thế giới): mặt ô ở y = 0, đế bên dưới. Ô Start là góc gần màn hình, đi về −x.
const TOPY = 0.34, TW = 1.7, TD = 3.1, C3 = 3.1, GR = 0.76, L = 2 * C3 + 7 * TW, H2 = L / 2, WH = H2 - TD;
const GZ = -TD / 2 + (TD * GR) / 2, STRIP = -TD / 2 + TD * GR, PX = 110;
const QUALITY = { high: { dpr: 1.5, fps: 60, ambient: 1, k: 170 }, medium: { dpr: 1.25, fps: 30, ambient: 0.5, k: 150 }, low: { dpr: 1, fps: 30, ambient: 0, k: 110 } };
const WIN_TILE = { L: -3, R: 3, B: -2.2, T: 3.8 }, WIN_CORNER = { L: -3.4, R: 3.4, B: -2.4, T: 4.6 }, WIN_CENTER = { L: -9.4, R: 9.4, B: -5.2, T: 7.2 };
const REG = [(u, v) => [u, v], (u, v) => [-v, u], (u, v) => [u, -v], (u, v) => [v, u]];   // toạ độ zone → thế giới
const regionOf = (x, z) => (z >= Math.abs(x) ? 0 : -x > Math.abs(z) ? 1 : -z >= Math.abs(x) ? 2 : 3);
const CORNER_LABEL = { start: [0.5, 0.5, 90, 0.92], island: [0.7, 0.8, 33, 0.5], festival: [0.7, 0.78, 33, 0.62], tour: [0.7, 0.78, 33, 0.62] };
const DEFAULT_LABELS = { start: 'START', island: 'LOST ISLAND', festival: 'CHAMPIONSHIPS', tour: 'WORLD TOUR', chance: 'CHANCE', tax: 'TAX', hotel: 'HOTEL', resort: 'RESORT' };
const SELL_MS = 380, BUILD_MS = 760, REBUILD_GAP = 420;   // hoạt ảnh bán / xây nhà
const CONFETTI = ['#ff6fa0', '#ffc23a', '#5cc6e8', '#7fd6a0', '#a98af0', '#ffffff'];
const shortK = (n) => (n >= 1000 ? (n / 1000).toFixed(n % 1000 ? 1 : 0).replace('.', ',') + 'M' : n + 'K');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (u) => u * u * (3 - 2 * u);

export function frame(i) {
  const side = Math.floor(i / 8), k = i % 8;
  if (k === 0) { const h = H2 - C3 / 2, p = [[h, h], [-h, h], [-h, -h], [h, -h]][side]; return { x: p[0], z: p[1], corner: true, side, swap: false, hw: C3 / 2, hd: C3 / 2 }; }
  const a = H2 - C3 - (k - 0.5) * TW, h = H2 - TD / 2, q = [[a, h], [-h, a], [-a, -h], [h, -a]][side], swap = side % 2 === 1;
  return { x: q[0], z: q[1], corner: false, side, swap, hw: swap ? TD / 2 : TW / 2, hd: swap ? TW / 2 : TD / 2 };
}
const toWorld = (i, X, Z) => { const f = frame(i); return f.swap ? [f.x + Z, f.z + X] : [f.x + X, f.z + Z]; };
// danh sách vẽ theo chiều sâu (x + z + d), dùng trong skin qua c.layer()
export class Layer { constructor() { this.a = []; } add(x, z, fn, d = 0) { this.a.push({ x, z, d, fn }); return this; } flush(pen) { this.a.sort((p, q) => p.x + p.z + p.d - (q.x + q.z + q.d)).forEach((o) => o.fn(pen)); this.a = []; } }
const raw = (pen) => (pen.swapped ? pen.raw : pen);

export async function createBoard2D(ctx, skin) {
  const R = ctx.rules, G = ctx.game, TILES = R.TILES, CFG = R.CONFIG, PETS = G.petsForMap ? G.petsForMap(skin.id) : (R.PETS || []);
  const MAP = (R.MAPS || []).find((m) => m.id === skin.id);
  const displayName = (i) => (MAP && MAP.tileNames && MAP.tileNames[i]) || TILES[i].name;
  const cv = ctx.canvas, g = cv.getContext('2d');
  const SL = skin.slots, ZONES = skin.zones, LB = { ...DEFAULT_LABELS, ...skin.labels };
  let Q = QUALITY[ctx.quality] ? ctx.quality : 'high', q = QUALITY[Q];
  await loadAssets(skin, ctx.base, (d, n) => ctx.onProgress && ctx.onProgress(d, n, 'Tải ảnh bản đồ'));

  /* ---------- trạng thái ---------- */
  let S = null, alive = true, running = false, raf = 0, frameTimer = 0;
  const view = { K: 40, ox: 0, oy: 0, fitK: 40, init: false };
  let dpr = 1, W0 = 0, H0 = 0, dirty = true, sceneDirty = true, lastInteract = 0, t = 0, lastT = 0, lastFrame = 0;
  const perf = { ms: 0, buildMs: 0, frames: 0, builds: 0, sprites: 0 };
  const sprites = new Map(), texCache = {}, objs = {}, anims = [], confetti = [];
  let highlight = null, arrow = { pid: null, color: '' }, glowPid = null;
  const tok = {}, petImg = {};
  const dice = { a: 5, b: 1, t0: -1, dur: 0, faces: null };

  /* ---------- màu theo zone, đối tượng c cho skin ---------- */
  const zoneOf = (i) => (ZONES && i % 8 ? ZONES[Math.floor(i / 8)] : null);
  const zonesOf = (i) => (ZONES ? (i % 8 ? [zoneOf(i)] : [ZONES[(Math.floor(i / 8) + 3) % 4], ZONES[Math.floor(i / 8)]]) : []);
  const palOf = (z) => { const p = { ...skin.palette }; if (z) for (const [k, v] of Object.entries(z)) if (typeof v === 'string' && v[0] === '#') p[k] = v; return p; };
  const grass = (c2, x, y, w, h, seed = 1, z) => {
    const p = palOf(z), r = rng(seed); c2.fillStyle = p.ground; c2.fillRect(x, y, w, h);
    for (let n = 0; n < 16; n++) { c2.globalAlpha = 0.55; c2.fillStyle = r() < 0.5 ? (p.ground2 || shade(p.ground, 0.93)) : (p.ground3 || light(p.ground, 0.25)); const ww = 8 + r() * 26; c2.fillRect(x + r() * w, y + r() * h, ww, ww * 0.6); }
    c2.globalAlpha = 1;
  };
  const U = { rng, hash, shade, mix, light, wp, font: FONT, layer: () => new Layer(), grass, fitText, propertyRatio: PROPERTY_TILE_RATIO };
  function cOf(i, extra = {}) {
    const t = TILES[i], f = frame(i), z = zoneOf(i);
    return { ...U, tile: i, type: t.type, group: t.group, name: displayName(i), side: f.side, zone: z, zones: zonesOf(i), seed: i * 3 + 1,
      w: f.corner ? C3 : TW, d: f.corner ? C3 : TD, gz: GZ, strip: STRIP, palette: palOf(z), grass: (c2, x, y, w, h, s = i * 3 + 1, zz = z) => grass(c2, x, y, w, h, s, zz), ...extra };
  }
  const slotOf = (t) => ({ city: 'tile', resort: 'resort', chance: 'chance', tax: 'tax', start: 'start', island: 'island', festival: 'festival', tour: 'tour' }[t.type]);

  /* ---------- nướng sprite: cache theo (slot, ô, level, màu) ---------- */
  function cached(key, fn) { if (!sprites.has(key)) sprites.set(key, fn()); return sprites.get(key); }
  const bakeTile = (i, fn, win = WIN_TILE) => bake((pen) => fn(frame(i).swap ? swapPen(pen) : pen), win, q.k);
  function drawKind(slot, pen, c) {
    if (slot.kind === 'sprite') { const r = rng(c.seed), n = slot.count || 1; for (let k = 0; k < n; k++) { const name = slot.pick[Math.floor(r() * slot.pick.length)], x = n > 1 ? (k / (n - 1) - 0.5) * (c.w - 0.5) : 0; pen.nat(name, x, slot.z ?? (c.gz - (n > 1 ? 0.8 : 0)), (slot.scale || 1) * (0.85 + r() * 0.3), slot.tint === 'zone' ? (c.zone ? c.zone.id : 'none') : slot.tint || 'none'); } return; }
    if (slot.kind === 'kit') return drawKit(slot, pen, c);
    if (slot.draw) slot.draw(pen, c);
  }
  function drawKit(slot, pen, c) {
    const lv = c.level, plan = slot.levels[c.slot === 'resortHouse' ? lv - 1 : lv], S0 = 0.72, w = plan.length * S0, p = pen.at(0, 0, c.gz), z = c.zone || {};
    const hs = slot.heights || [0.1, 0.6, 0.95, 1.3, 2.1], top = hs[c.slot === 'resortHouse' ? lv - 1 : lv];
    const wall = slot.wall === 'zone' ? z.wall : slot.wall, snow = slot.snow === 'zone' ? !!z.snow : !!slot.snow;
    p.shadow(-w / 2, -S0 / 2, w, S0, top, 0.16);
    if (slot.under) slot.under(p, { ...c, w });
    raw(p).sprite(cached(`kit|${c.slot}|${lv}|${c.color}|${wall}|${snow}|${pen.swapped ? 'z' : 'x'}`, () => composeKit(plan, c.color, q.k, { wall, snow, axis: pen.swapped ? 'z' : 'x' })));
    const big = lv === 4;
    if (c.slot === 'house' && lv === 0) p.flag(-0.05, -0.05, 0.7, c.color);
    const sign = slot.sign === false ? null : slot.sign || (c.slot === 'house' ? LB.hotel : LB.resort);
    if (big && sign) {
      const y = slot.signY ?? (c.slot === 'house' ? 4 * 0.422 + 0.02 : top * 0.81 + 0.02);
      p.box(-0.32, y, -0.04, 0.03, 0.12, 0.03, '#8a94a3', { edge: null }); p.box(0.28, y, -0.04, 0.03, 0.12, 0.03, '#8a94a3', { edge: null });
      p.box(-0.4, y + 0.1, -0.04, 0.8, 0.22, 0.04, c.color, { left: c.color, right: shade(c.color, 0.8) }); p.textZ(sign, 0, y + 0.21, 0.002, 0.15, '#ffffff');
      p.flag(-w / 2 - 0.12, S0 / 2 + 0.12, 0.9, c.color); p.flag(w / 2 + 0.1, S0 / 2 + 0.1, 0.9, c.color);
    }
    if (slot.over) slot.over(p, { ...c, w });
  }
  const spriteFor = (name, i, lv = '', color = '', pet = '') => cached(`${name}|${i}|${lv}|${color}|${pet}`, () => {
    const slot = SL[name]; if (!slot) return null;
    const c = cOf(i, { slot: name, level: lv === '' ? undefined : lv, color: color || undefined, pet: pet || undefined });
    return frame(i).corner ? bake((pen) => drawKind(slot, pen, c), WIN_CORNER, q.k) : bakeTile(i, (pen) => drawKind(slot, pen, c));
  });
  // băng rôn lễ hội ×2 (view.bonus) và bảng Championships (view.festival)
  const bonusSprite = (i) => cached(`bonus|${i}`, () => bakeTile(i, (p) => {
    for (const x of [-0.62, 0.62]) p.box(x - 0.02, 0, -1.36, 0.04, 0.95, 0.04, '#8a6040', { edge: null });
    p.bunting([-0.62, 0.92, -1.34], [0.62, 0.92, -1.34], ['#e2342a', '#ffd23a', '#1fb5d6', '#ffffff'], 0.05, 8);
    p.box(-0.5, 0.5, -1.36, 1.0, 0.3, 0.03, '#e2342a', { left: '#e2342a', right: '#b52a22', edge: null }); p.textZ(`LỄ HỘI ×${CFG.BONUS_MULT}`, 0, 0.65, -1.329, 0.15, '#ffffff');
  }));
  const festSprite = (i, m) => cached(`fest|${i}|${m}`, () => bakeTile(i, (p) => {
    const z = STRIP + 0.05; p.ellipseShadow(0.55, z, 0.25, 0.2);
    p.box(0.42, 0, z - 0.12, 0.26, 0.08, 0.24, '#ffffff'); p.rbox(0.55, 0.08, z, 0.08, 0.06, 0.08, '#f5b934', 0.6); p.rbox(0.55, 0.14, z, 0.04, 0.1, 0.04, '#f5b934', 0.6); p.rbox(0.55, 0.24, z, 0.18, 0.16, 0.18, '#f5b934', 0.6);
    p.box(-0.72, 0, z - 0.02, 0.9, 0.34, 0.06, '#f5b934', { left: '#f5b934', right: '#c98a1a', edge: null }); p.textZ(`×${m}`, -0.27, 0.17, z + 0.042, 0.26, '#7a4a0a');
  }));

  /* ---------- texture mặt ô (dải giá, tên, tiền thuê, mất điện) ---------- */
  const outRounds = (i) => (S ? Math.max(0, Number((S.outage && S.outage[i]) || 0) - Number(S.round || 0)) : 0);
  const ownerOf = (i) => { const pr = S && S.props && S.props[i]; return pr ? (S.players.find((p) => p.id === pr.owner) || null) : null; };
  const colorOf = (p) => { if (!p) return '#9aa4b1'; const def = PETS.find((x) => x.id === p.pet); return def ? def.c : p.color || '#9aa4b1'; };
  const contrastOn = (hex) => { const [r, g, b] = rgb(hex); return (r * 0.299 + g * 0.587 + b * 0.114) / 255 > 0.62 ? '#17212b' : '#ffffff'; };
  function tileTex(i) {
    const t = TILES[i], f = frame(i), own = ownerOf(i), out = own && G.outaged(S, i), slot = SL[slotOf(t)] || {};
    if (f.corner) {
      const c = cOf(i), cw = Math.round(C3 * PX), tex = canvas(cw, cw), c2 = tex.getContext('2d');
      if (slot.paint) slot.paint(c2, { ...c, cw, ch: cw, px: PX }); else grass(c2, 0, 0, cw, cw, i, c.zones[1]);
      const [lx, ly, ls, lw] = slot.label || CORNER_LABEL[t.type]; if (slot.label !== false) fitText(c2, LB[t.type] || displayName(i).toUpperCase(), cw * lx, cw * ly, ls, cw * lw, -Math.PI / 4, c.palette.labelText || '#fff', c.palette.labelShadow);
      return tex;
    }
    const c = cOf(i), tex = canvas(TW * PX, TD * PX), c2 = tex.getContext('2d'), cw = tex.width, ch = tex.height, gH = Math.round(ch * GR), sH = ch - gH, pal = c.palette;
    if (slot.paint) slot.paint(c2, { ...c, cw, ch: gH, px: PX }); else grass(c2, 0, 0, cw, gH, c.seed, c.zone);
    c2.fillStyle = own ? (out ? shade(colorOf(own), 0.55) : colorOf(own)) : pal.priceStrip || '#c6cdd6'; c2.fillRect(0, gH, cw, sH);
    const band = t.group ? pal.groups[t.group] : t.type === 'resort' ? pal.resortBand || '#7fd3dd' : null;
    const cityBandH = t.group && skin.cityLabelBand ? Math.round(ch * skin.cityLabelBand) : 0;
    if (band) { c2.fillStyle = band; c2.fillRect(0, cityBandH ? gH - cityBandH : gH - 4, cw, cityBandH || 8); }
    const sy = gH + sH / 2 + 3, ink = pal.priceText || '#5b6676', inkSh = 'rgba(255,255,255,.6)';
    if (t.price) {
      const nameInk = cityBandH ? contrastOn(band) : pal.labelText || '#fff';
      const nameShadow = cityBandH ? (nameInk === '#ffffff' ? 'rgba(0,0,0,.38)' : 'rgba(255,255,255,.48)') : pal.labelShadow;
      fitText(c2, displayName(i).toUpperCase(), cw / 2, gH - 26, 34, cw - 12, 0, nameInk, nameShadow);
      if (out) fitText(c2, `${outRounds(i)} ⚡`, cw / 2, sy, 60, cw - 16, 0, '#ffd23a', 'rgba(0,0,0,.45)');
      else if (own) fitText(c2, shortK(G.rentOf(S, i)), cw / 2, sy, 58, cw - 16, 0, '#ffffff', 'rgba(0,0,0,.35)');
    } else fitText(c2, LB[t.type] || t.type.toUpperCase(), cw / 2, sy, 40, cw - 16, 0, ink, inkSh);
    return tex;
  }
  const texSig = (i) => { const pr = S && S.props && S.props[i]; return pr ? `${pr.owner}:${pr.level}:${colorOf(ownerOf(i))}:${outRounds(i)}:${G.rentOf(S, i)}` : ''; };
  function texOf(i) { const sig = texSig(i); if (!texCache[i] || texCache[i].sig !== sig) texCache[i] = { sig, cv: tileTex(i) }; return texCache[i].cv; }

  /* ---------- vật thể trên bàn ---------- */
  const resortLevel = (pid) => Math.min(4, G.ownedBy(S, pid).filter((j) => TILES[j].type === 'resort').length);
  function objSig(i) {
    const t = TILES[i], pr = S && S.props && S.props[i], own = ownerOf(i);
    if (!pr || !own) return '';
    return t.type === 'resort' ? `r:${resortLevel(own.id)}:${colorOf(own)}:${own.pet}` : `h:${pr.level}:${colorOf(own)}:${own.pet}`;
  }
  function buildingSprite(i) {
    const t = TILES[i], pr = S.props[i], own = ownerOf(i);
    return t.type === 'resort' ? spriteFor('resortHouse', i, resortLevel(own.id), colorOf(own), own.pet) : spriteFor('house', i, pr.level, colorOf(own), own.pet);
  }
  let CENTER = null, ORDER = [];
  function centerSprite() {
    const slot = SL.center; if (!slot || (!slot.draw && !slot.core)) return null;
    return cached('center', () => bake((pen) => {
      const L0 = new Layer(), base = { ...U, half: WH, regionOf, zones: ZONES || [], add: (x, z, fn, d) => L0.add(x, z, fn, d), palette: skin.palette };
      for (let s = 0; s < 4; s++) if (slot.draw) slot.draw(pen, { ...base, side: s, zone: ZONES ? ZONES[s] : null, toWorld: (u, v) => REG[s](u, v) });
      if (slot.core) L0.add(0, 0, (p) => slot.core(p, base));
      L0.flush(pen);
    }, WIN_CENTER, Math.round(q.k * 0.72)));
  }
  // danh sách sprite tĩnh (không tính nhà đang chạy hoạt ảnh), sắp theo chiều sâu
  function collect() {
    const list = [], busy = new Set(anims.map((a) => a.i));
    CENTER = centerSprite(); if (CENTER) list.push({ x: 0, z: 0, d: 0, s: CENTER });
    for (let i = 0; i < 32; i++) {
      const t = TILES[i], f = frame(i), at = (s, d, scale = 1) => s && list.push({ x: f.x, z: f.z, d, s, scale }), owned = !!objSig(i);
      if (f.corner) { at(spriteFor(slotOf(t), i), 0); continue; }
      if (t.type === 'city' && SL.deco) at(spriteFor('deco', i), -1.2);
      if (t.type === 'resort' && !owned) at(spriteFor('resort', i), 0);
      if (t.type === 'chance' || t.type === 'tax') at(spriteFor(t.type, i), 0);
      if (owned && !busy.has(i)) {
        const pr = S.props[i], level = t.type === 'resort' ? resortLevel(pr.owner) : pr.level;
        at(buildingSprite(i), GZ, PROPERTY_LEVEL_SCALE[level] || 1);
      }
      if (S && (S.bonus || []).includes(i)) at(bonusSprite(i), -1.3);
      if (S && S.festival === i && S.props[i]) at(festSprite(i, G.festMult(S)), 0.8);
    }
    ORDER = list.sort((a, b) => a.x + a.z + a.d - (b.x + b.z + b.d)); perf.sprites = ORDER.length;
  }

  /* ---------- cảnh tĩnh: một canvas cỡ màn hình ---------- */
  const scene = canvas(1, 1), sg = scene.getContext('2d'); let sv = null;
  function slab(pen, x0, z0, w, d, top, side) { pen.box(x0, -TOPY, z0, w, TOPY, d, side[0], { right: side[0], left: side[1], top, edge: null }); }
  const groundTex = () => cached('ground', () => {
    const WS = 2 * WH, tex = canvas(WS * PX, WS * PX), c2 = tex.getContext('2d'), T = (x, z) => [(x + WH) * PX, (z + WH) * PX];
    const tri = [[[-WH, WH], [WH, WH]], [[-WH, -WH], [-WH, WH]], [[-WH, -WH], [WH, -WH]], [[WH, -WH], [WH, WH]]];
    for (let s = 0; s < 4; s++) { c2.save(); c2.beginPath(); [...tri[s], [0, 0]].forEach((p, k) => (k ? c2.lineTo(...T(...p)) : c2.moveTo(...T(...p)))); c2.closePath(); c2.clip(); grass(c2, 0, 0, tex.width, tex.height, s + 20, ZONES ? ZONES[s] : null); c2.restore(); }
    if (SL.center && SL.center.paint) SL.center.paint(c2, { ...U, T, px: PX, half: WH, zones: ZONES || [], toWorld: (s, u, v) => REG[s](u, v), regionOf, palette: skin.palette });
    return { canvas: tex };
  });
  function buildScene() {
    const t0 = performance.now(); collect();
    scene.width = cv.width; scene.height = cv.height; sg.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pen = new Pen(sg, view.K, view.ox, view.oy), pal = skin.palette, M = 0.3, B = -TOPY, X0 = -H2 - M, X1 = H2 + M;
    pen.box(X0, B - 0.45, X0, X1 - X0, 0.45, X1 - X0, pal.boardSide || '#7fcfd8', { right: pal.boardSide || '#7fcfd8', left: pal.boardSideDark || '#62b6c2', top: pal.boardTop || pal.boardSide || '#8fd8e0', edge: null });
    if (SL.base && SL.base.draw) SL.base.draw(pen, { ...U, half: H2, margin: M, y: B, palette: pal });
    slab(pen, -WH, -WH, 2 * WH, 2 * WH, pal.ground, [pal.tileSide || '#c89d7b', pal.tileSideDark || '#a47c5d']);
    const gt = groundTex().canvas; pen.paintTex(gt, [-WH, -WH], [2 * WH / gt.width, 0], [0, 2 * WH / gt.height]);
    [...Array(32).keys()].sort((a, b) => { const fa = frame(a), fb = frame(b); return fa.x + fa.z - (fb.x + fb.z); }).forEach((i) => {
      const f = frame(i), tx = texOf(i), slot = SL[slotOf(TILES[i])] || {}, e = 0.03, w = f.hw - e, d = f.hd - e;
      slab(pen, f.x - w, f.z - d, 2 * w, 2 * d, pal.ground, slot.side || [pal.tileSide || '#c89d7b', pal.tileSideDark || '#a47c5d']);
      if (!f.swap) pen.paintTex(tx, [f.x - w, f.z - d], [2 * w / tx.width, 0], [0, 2 * d / tx.height]);
      else pen.paintTex(tx, [f.x - w, f.z + d], [0, -2 * d / tx.width], [2 * w / tx.height, 0]);
    });
    for (const o of ORDER) pen.sprite(o.s, o.x, o.z, 0, o.scale || 1);
    sv = { K: view.K, ox: view.ox, oy: view.oy, w: cv.width, h: cv.height }; sceneDirty = false;
    perf.buildMs = performance.now() - t0; perf.builds++;
  }

  /* ---------- khung nhìn ---------- */
  function resize() {
    dpr = Math.min(globalThis.devicePixelRatio || 1, q.dpr); W0 = cv.clientWidth; H0 = cv.clientHeight; if (!W0 || !H0) return;
    cv.width = Math.round(W0 * dpr); cv.height = Math.round(H0 * dpr);
    const span = L + 0.9, k = Math.min(W0 / (span * 2 * CX + 0.6), H0 / (span * 2 * CY + 3.6)), z = view.K / view.fitK; view.fitK = k;
    if (!view.init) Object.assign(view, { K: k, ox: W0 / 2, oy: H0 / 2 + 0.9 * k, init: true }); else view.K = k * z;
    clampView(); sceneDirty = true; dirty = true; if (running) wake();
  }
  function clampView() { const [cx, cy] = [view.ox, view.oy - 0.9 * view.K], m = L * CX * view.K * 0.5; view.ox = Math.max(W0 / 2 - m, Math.min(W0 / 2 + m, cx)); view.oy = Math.max(H0 / 2 - m / 2, Math.min(H0 / 2 + m / 2, cy)) + 0.9 * view.K; }
  function zoomAt(f, x = W0 / 2, y = H0 / 2) {
    const nk = Math.max(view.fitK * 0.7, Math.min(view.fitK * 4, view.K * f)), r = nk / view.K;
    view.ox = x - (x - view.ox) * r; view.oy = y - (y - view.oy) * r; view.K = nk; clampView(); lastInteract = performance.now(); dirty = true; if (running) wake();
  }
  const scr = (x, y, z) => { const [a, b] = P(x, y, z, view.K); return { x: view.ox + a, y: view.oy + b }; };
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resize()) : null; if (ro) ro.observe(cv);

  /* ---------- kéo, chụm, cuộn ---------- */
  const ptrs = new Map(); let pinch = null;
  const down = (e) => { try { cv.setPointerCapture(e.pointerId); } catch (_) { /* bỏ qua */ } ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), K: view.K }; } };
  const move = (e) => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    if (ptrs.size === 2 && pinch) { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); const [a, b] = [...ptrs.values()], r = cv.getBoundingClientRect(); zoomAt(pinch.K * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d / view.K, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); return; }
    view.ox += e.clientX - p.x; view.oy += e.clientY - p.y; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); clampView(); lastInteract = performance.now(); dirty = true; if (running) wake();
  };
  const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; };
  const wheel = (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top); };
  cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('wheel', wheel, { passive: false });

  /* ---------- quân cờ ---------- */
  const seats = () => (S ? S.players : []);
  function spot(pid, pos, posOf = (p) => p.pos) {
    const here = seats().filter((p) => !p.bankrupt && posOf(p) === pos), k = Math.max(0, here.findIndex((p) => p.id === pid)), n = Math.max(1, here.length), f = frame(pos);
    if (f.corner) { const o = [[0.85, 0.25], [0.25, 0.85], [1.2, 0.6], [0.6, 1.2]][k % 4]; return [f.x + o[0], f.z + o[1]]; }
    return toWorld(pos, (k - (n - 1) / 2) * 0.42, 0.45 + (k % 2) * 0.16);
  }
  const posOf = (p) => (tok[p.id] && tok[p.id].moving ? tok[p.id].tile : p.pos);
  function placeTokens(snap) {
    for (const p of seats()) {
      const o = tok[p.id] || (tok[p.id] = { x: 0, z: 0, y: 0, tile: p.pos, moving: false });
      if (o.moving) continue; o.tile = p.pos; const [x, z] = spot(p.id, p.pos, posOf); if (snap || !o.init) Object.assign(o, { x, z, y: 0, init: true }); else Object.assign(o, { tx: x, tz: z });
      const pet = p.pet || (PETS[seats().indexOf(p) % PETS.length] || {}).id;
      if (pet && !petImg[pet]) { const def = PETS.find((x) => x.id === pet), im = new Image(); petImg[pet] = im; im.onload = () => (dirty = true); im.src = new URL(def && def.img ? def.img : `thumbnails/static/pet-${pet}.png`, document.baseURI).href; }
      o.pet = pet; o.color = colorOf(p); o.hidden = !!p.bankrupt;
    }
    for (const id of Object.keys(tok)) if (!seats().some((p) => p.id === id)) delete tok[id];
    dirty = true;
  }
  function drawToken(o, pid, now) {
    if (o.hidden) return;
    if (o.tx !== undefined) { o.x += (o.tx - o.x) * 0.25; o.z += (o.tz - o.z) * 0.25; if (Math.abs(o.tx - o.x) + Math.abs(o.tz - o.z) < 0.002) { o.x = o.tx; o.z = o.tz; delete o.tx; } }
    const K = view.K, b = scr(o.x, 0, o.z), top = scr(o.x, o.y, o.z), im = petImg[o.pet], H = TOKEN_HEIGHT * K;
    g.save(); g.fillStyle = 'rgba(30,50,70,.22)'; g.beginPath(); g.ellipse(b.x, b.y, 0.3 * K, 0.15 * K, 0, 0, 7); g.fill();
    g.fillStyle = o.color; g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1.5, K * 0.03); g.beginPath(); g.ellipse(top.x, top.y, 0.28 * K, 0.14 * K, 0, 0, 7); g.fill(); g.stroke();
    if (pid === glowPid) { g.shadowColor = o.color; g.shadowBlur = Math.max(6, K * 0.25); }
    if (im && im.complete && im.naturalWidth) g.drawImage(im, top.x - H / 2, top.y - H * 0.94, H, H);
    else { g.restore(); g.save(); new Pen(g, K, top.x, top.y).box(-0.2, 0, -0.2, 0.4, 0.5, 0.4, o.color); }
    g.restore();
    if (arrow.pid === pid) {
      const bob = q.ambient ? Math.sin(now / 220) * 0.08 * K : 0, a = scr(o.x, o.y + 1.35, o.z), y = a.y + bob, s = 0.22 * K;
      g.beginPath(); g.moveTo(a.x - s, y - s); g.lineTo(a.x + s, y - s); g.lineTo(a.x, y + s * 0.6); g.closePath(); g.fillStyle = arrow.color || o.color; g.fill(); g.lineWidth = Math.max(2, K * 0.04); g.strokeStyle = '#ffffff'; g.stroke();
    }
  }
  async function hop(pid, path, onStep) {
    const o = tok[pid]; if (!o) return; o.moving = true; delete o.tx;
    for (const pos of path) {
      o.tile = pos; const [x, z] = spot(pid, pos, posOf), from = { x: o.x, z: o.z }, dur = 210;
      o.anim = { from, to: { x, z }, t0: performance.now(), dur }; dirty = true; if (running) wake();
      await sleep(dur); o.x = x; o.z = z; o.y = 0; o.anim = null;
      if (onStep) try { onStep(pos); } catch (e) { console.error(e); }
    }
    o.moving = false; placeTokens(false);
  }

  /* ---------- xúc xắc ---------- */
  const PIP = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  const dieSprite = (n) => cached(`die|${n}`, () => bake((p) => {
    const sp = 0.19, e = 0.06, side = { 1: [2, 3], 2: [3, 6], 3: [5, 2], 4: [2, 1], 5: [3, 1], 6: [5, 4] }[n];
    p.box(-0.35, 0, -0.35, 0.7, 0.7, 0.7, '#ffffff', { top: '#ffffff', right: '#eef1f5', left: '#dde3ea', edge: null });
    PIP[n].forEach(([a, b]) => p.poly([[a * sp - e, 0.701, b * sp - e], [a * sp + e, 0.701, b * sp - e], [a * sp + e, 0.701, b * sp + e], [a * sp - e, 0.701, b * sp + e]], n === 1 ? '#e2557f' : '#26364a'));
    PIP[side[0]].forEach(([a, b]) => p.quadX(0.351, b * sp - e, b * sp + e, 0.35 + a * sp - e, 0.35 + a * sp + e, side[0] === 1 ? '#e2557f' : '#26364a'));
    PIP[side[1]].forEach(([a, b]) => p.quadZ(0.351, a * sp - e, a * sp + e, 0.35 + b * sp - e, 0.35 + b * sp + e, side[1] === 1 ? '#e2557f' : '#26364a'));
  }, { L: -0.8, R: 0.8, B: -0.6, T: 1.1 }, 120));
  const DICE_AT = [[1.75, 0.55], [0.55, 1.75]];
  function drawDice(now) {
    [dice.a, dice.b].forEach((n, k) => {
      const [x, z] = DICE_AT[k], frame = diceRollFrame(now, dice.t0, dice.dur, k, n);
      const s = dieSprite(frame.face), p = scr(x + frame.jitter, frame.height, z - frame.jitter), f = (view.K / s.k) * 0.6;
      g.drawImage(s.canvas, p.x - s.ax * f, p.y - s.ay * f, s.canvas.width * f, s.canvas.height * f);
    });
  }

  /* ---------- hoạt ảnh xây / bán nhà ---------- */
  function drawAnims(now) {
    for (let k = anims.length - 1; k >= 0; k--) {
      const a = anims[k], u = (now - a.t0) / a.dur;
      if (u >= 1) { anims.splice(k, 1); sceneDirty = true; dirty = true; continue; }
      if (u < 0 || !a.s) continue;
      const f = frame(a.i), e = a.kind === 'build' ? ease(u) : 1 - ease(u), p = scr(f.x, a.kind === 'build' ? (1 - e) * 2.2 : (1 - e) * 1.2, f.z), sc = (view.K / a.s.k) * (0.6 + 0.4 * e);
      g.globalAlpha = Math.min(1, e * 1.4); g.drawImage(a.s.canvas, p.x - a.s.ax * sc, p.y - a.s.ay * sc, a.s.canvas.width * sc, a.s.canvas.height * sc); g.globalAlpha = 1;
    }
  }
  const built = {};   // ô → { sig, s } nhà đang đứng trên bàn
  function syncObjects(instant) {
    let startAt = 0; const now = performance.now();
    for (let i = 0; i < 32; i++) {
      const sig = objSig(i), old = built[i]; if ((old ? old.sig : '') === sig) continue;
      const s = sig ? buildingSprite(i) : null; built[i] = sig ? { sig, s } : null; if (instant) continue;
      let wait = 0;
      if (old && old.s) { anims.push({ i, kind: 'sell', t0: now, dur: SELL_MS, s: old.s }); wait = REBUILD_GAP; }
      if (s) { anims.push({ i, kind: 'build', t0: now + wait, dur: BUILD_MS, s }); startAt = Math.max(startAt, wait); }
    }
    sceneDirty = true; dirty = true; return startAt;
  }

  /* ---------- ambient: hạt mùa + animate của skin ---------- */
  let PARTS = null;
  function particles() {
    if (PARTS) return PARTS; PARTS = [];
    if (!ZONES) return PARTS;
    ZONES.forEach((z, s) => { if (!z.particles || z.particles === 'none') return; const r = rng(s + 91);
      for (let n = 0; n < 26; n++) { const [x, zz] = REG[s](-4 + r() * 8, 2.6 + r() * 3.2); if (regionOf(x, zz) === s) PARTS.push({ k: z.particles, x, z: zz, ph: r(), sp: 0.12 + r() * 0.1, sw: r() * 6 }); }
      for (let i = s * 8 + 1; i < s * 8 + 8; i++) { const f = frame(i), rr = rng(i + 7); PARTS.push({ k: z.particles, x: f.x + (rr() - 0.5) * 2 * f.hw * 0.8, z: f.z + (rr() - 0.5) * 2 * f.hd * 0.8, ph: rr(), sp: 0.12 + rr() * 0.1, sw: rr() * 6 }); } });
    return PARTS;
  }
  function drawAmbient(tt) {
    const pen = new Pen(g, view.K, view.ox, view.oy), every = q.ambient < 1 ? 2 : 1;
    const anim = (skin.ambient && skin.ambient.animate) || {};
    for (const fn of Object.values(anim)) fn(pen, tt, { ...U, half: WH, zones: ZONES || [], regionOf, toWorld: (s, u, v) => REG[s](u, v) });
    const R0 = Math.max(1.5, view.K * 0.03);
    particles().forEach((p, n) => {
      if (n % every) return;
      const u = (tt * p.sp + p.ph) % 1, [sx, sy] = pen.p(p.x + Math.sin(tt * 0.8 + p.sw) * 0.25, 2.6 * (1 - u), p.z + Math.cos(tt * 0.6 + p.sw) * 0.2);
      g.globalAlpha = u < 0.1 ? u * 10 : u > 0.9 ? (1 - u) * 10 : 1;
      if (p.k === 'petals') { g.fillStyle = '#ffc1d6'; g.beginPath(); g.ellipse(sx, sy, R0, R0 * 0.55, tt * 2 + p.sw, 0, 7); g.fill(); }
      else if (p.k === 'leaves') { g.fillStyle = ['#f08a3c', '#e0533a', '#f6b93b'][Math.floor(p.sw) % 3]; g.save(); g.translate(sx, sy); g.rotate(tt * 1.5 + p.sw); g.fillRect(-R0, -R0 * 0.5, R0 * 2, R0); g.restore(); }
      else if (p.k === 'snow') { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(sx, sy, R0 * 0.75, 0, 7); g.fill(); }
      else if (u > 0.4 && u < 0.6) { g.fillStyle = 'rgba(255,240,170,.9)'; g.beginPath(); g.arc(sx, sy - view.K * 1.2, R0 * 0.6, 0, 7); g.fill(); }
    });
    g.globalAlpha = 1;
  }

  /* ---------- hiệu ứng, làm tối khi chọn ô ---------- */
  function burst(i, n) { const f = frame(i), now = performance.now(); for (let k = 0; k < n; k++) confetti.push({ x: f.x + (Math.random() - 0.5) * 0.6, z: f.z + (Math.random() - 0.5) * 0.6, y: 1.4, vx: (Math.random() - 0.5) * 2.4, vz: (Math.random() - 0.5) * 2.4, vy: 2 + Math.random() * 2.2, c: CONFETTI[k % 6], spin: Math.random() * 10, t0: now }); dirty = true; }
  function drawConfetti(now, dt) {
    for (let k = confetti.length - 1; k >= 0; k--) {
      const c = confetti[k], age = (now - c.t0) / 1000; c.vy -= 4.5 * dt; c.x += c.vx * dt; c.z += c.vz * dt; c.y = Math.max(0, c.y + c.vy * dt);
      if (age > 2.8) { confetti.splice(k, 1); continue; }
      const p = scr(c.x, c.y, c.z), s = view.K * 0.07; g.globalAlpha = Math.max(0, 1 - Math.max(0, age - 2) / 0.8); g.save(); g.translate(p.x, p.y); g.rotate(age * c.spin); g.fillStyle = c.c; g.fillRect(-s, -s * 0.5, s * 2, s); g.restore();
    }
    g.globalAlpha = 1;
  }
  function quad(i) { const f = frame(i); return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => scr(f.x + a * f.hw, 0, f.z + b * f.hd)); }
  function drawHighlight() {
    if (!highlight) return;
    g.save(); g.beginPath(); g.rect(0, 0, W0, H0); for (const i of highlight) quad(i).forEach((p, k) => (k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
    g.fillStyle = 'rgba(15,25,40,.5)'; g.fill('evenodd'); g.lineWidth = Math.max(2, view.K * 0.05); g.strokeStyle = '#ffd23a';
    for (const i of highlight) { g.beginPath(); quad(i).forEach((p, k) => (k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); g.stroke(); }
    g.restore();
  }

  /* ---------- vòng vẽ ---------- */
  const animating = (now) => anims.length || confetti.length || Object.values(tok).some((o) => o.anim || o.tx !== undefined) || (dice.t0 >= 0 && now - dice.t0 < dice.dur + 50) || (q.ambient && running) || (arrow.pid && q.ambient);
  function render(now) {
    const t0 = performance.now(), interacting = now - lastInteract < 160;
    const moved = !sv || sv.K !== view.K || sv.ox !== view.ox || sv.oy !== view.oy || sv.w !== cv.width || sv.h !== cv.height;
    let built0 = 0; if (sceneDirty || (moved && !interacting)) { buildScene(); built0 = perf.buildMs; }
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    const r = view.K / sv.K; g.setTransform(dpr * r, 0, 0, dpr * r, dpr * (view.ox - sv.ox * r), dpr * (view.oy - sv.oy * r)); g.drawImage(scene, 0, 0, sv.w / dpr, sv.h / dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawAnims(now);
    if (q.ambient) drawAmbient(t);
    drawDice(now);
    for (const [pid, o] of Object.entries(tok)) {
      if (o.anim) { const u = Math.min(1, (now - o.anim.t0) / o.anim.dur); o.x = o.anim.from.x + (o.anim.to.x - o.anim.from.x) * u; o.z = o.anim.from.z + (o.anim.to.z - o.anim.from.z) * u; o.y = Math.sin(u * Math.PI) * 0.55; }
    }
    Object.entries(tok).sort(([, a], [, b]) => a.x + a.z - (b.x + b.z)).forEach(([pid, o]) => drawToken(o, pid, now));
    drawConfetti(now, Math.min(0.05, (now - lastT) / 1000));
    drawHighlight();
    const ms = performance.now() - t0 - built0; perf.ms = perf.frames ? perf.ms * 0.9 + ms * 0.1 : ms; perf.last = ms; perf.frames++;
    if (moved && interacting) setTimeout(() => (dirty = true), 180);
  }
  function scheduleFrame(delay = 0) {
    if (!alive || !running || document.hidden) return;
    if (delay > 1) frameTimer = setTimeout(() => { frameTimer = 0; raf = requestAnimationFrame(loop); }, delay);
    else raf = requestAnimationFrame(loop);
  }
  function wake() {
    dirty = true;
    if (!running || document.hidden) return;
    if (frameTimer) { clearTimeout(frameTimer); frameTimer = 0; }
    if (raf) cancelAnimationFrame(raf);
    scheduleFrame();
  }
  function loop(now) {
    raf = 0;
    if (!alive || !running || document.hidden) return;
    const dt = Math.min(0.1, (now - (lastT || now)) / 1000);
    const active = dirty || animating(now);
    if (active) { if (q.ambient) t += dt; if (W0) render(now); dirty = false; }
    lastFrame = now; lastT = now;
    scheduleFrame(active ? Math.max(0, 1000 / q.fps - (performance.now() - now)) : 250);
  }
  function start() { if (!alive || running) return; running = true; lastT = 0; wake(); }
  function stop() { running = false; if (frameTimer) clearTimeout(frameTimer); frameTimer = 0; cancelAnimationFrame(raf); raf = 0; }
  const visibility = () => { if (document.hidden) { if (frameTimer) clearTimeout(frameTimer); frameTimer = 0; cancelAnimationFrame(raf); raf = 0; } else if (running) wake(); };
  document.addEventListener('visibilitychange', visibility);

  // nướng trước sprite tĩnh (góc, ô đặc biệt, giữa bàn, xúc xắc), nhả luồng chính giữa các lần nướng
  const pre = [() => centerSprite(), ...[1, 2, 3, 4, 5, 6].map((n) => () => dieSprite(n))];
  for (let i = 0; i < 32; i++) { const t = TILES[i], f = frame(i); pre.push(() => texOf(i)); if (f.corner || t.type !== 'city') pre.push(() => spriteFor(slotOf(t), i)); else if (SL.deco) pre.push(() => spriteFor('deco', i)); }
  for (let k = 0; k < pre.length; k++) { pre[k](); if (ctx.onProgress) ctx.onProgress(k + 1, pre.length, 'Vẽ bàn cờ'); await sleep(0); }

  resize();
  /* ---------------- Board (docs/contracts/map-renderer.md) ---------------- */
  return {
    // PR #5: app đọc thời lượng xây nhà và tên cấp nhà resort thay vì hằng của map-1
    meta: { buildMs: BUILD_MS, resortLevels: LB.resortLevels || null },
    reset(v) { S = v; anims.length = 0; confetti.length = 0; for (const k in built) delete built[k]; for (const k in tok) delete tok[k]; syncObjects(true); placeTokens(true); highlight = null; if (running) wake(); },
    async sync(v) { S = v; const wait = syncObjects(false); placeTokens(false); wake(); return wait; },
    async moveToken(pid, path, opts = {}) {
      if (opts.view) S = opts.view;
      if (!tok[pid]) placeTokens(true);
      if (!tok[pid] || !path || !path.length) return;
      if (opts.jump) { const o = tok[pid], last = path[path.length - 1]; o.moving = true; o.tile = last; const [x, z] = spot(pid, last, posOf); Object.assign(o, { x, z, y: 0 }); delete o.tx; o.moving = false; placeTokens(false); return; }
      await hop(pid, path, opts.onStep);
    },
    async rollDice(a, b) { Object.assign(dice, { a, b, t0: performance.now(), dur: diceRollDuration(Q, REDUCED) }); wake(); await sleep(dice.dur); wake(); },
    tileScreen(i, lift = 0) { const f = frame(i), [x, z] = f.corner ? [f.x, f.z] : toWorld(i, 0, GZ); return scr(x, lift, z); },
    pick(cx, cy) {
      const r = cv.getBoundingClientRect(), a = (cx - r.left - view.ox) / (CX * view.K), b = (cy - r.top - view.oy) / (CY * view.K), x = (a + b) / 2, z = (b - a) / 2;
      for (let i = 0; i < 32; i++) { const f = frame(i); if (Math.abs(x - f.x) <= f.hw && Math.abs(z - f.z) <= f.hd) return i; }
      return null;
    },
    tokenScreen(pid) { const o = tok[pid]; return o ? scr(o.x, o.y, o.z) : null; },
    setActive(pid, color, glow = pid) { arrow = { pid: pid || null, color: color || '' }; glowPid = glow || null; wake(); },
    effect(kind, tile) { if ((kind === 'confetti' || kind === 'festival') && tile !== null && tile !== undefined) { burst(tile, Q === 'low' ? 24 : kind === 'festival' ? 90 : 60); wake(); } },
    highlight(tiles) { highlight = tiles && tiles.length ? [...tiles] : null; wake(); },
    setQuality(level) { if (!QUALITY[level] || level === Q) return; Q = level; q = QUALITY[level]; sprites.clear(); PARTS = null; for (const k in texCache) delete texCache[k]; for (const k in built) delete built[k]; resize(); if (S) syncObjects(true); wake(); },
    resize, zoomBy: (f) => zoomAt(f), fit() { view.init = false; resize(); },
    start, stop,
    stats() { return { renderer: '2d', graphicsLevel: Q, activeFps: q.fps, ms: +perf.ms.toFixed(2), lastMs: +(perf.last || 0).toFixed(2), buildMs: +perf.buildMs.toFixed(1), builds: perf.builds, frames: perf.frames, sprites: perf.sprites, cached: sprites.size, dpr, running }; },
    destroy() {
      if (!alive) return; alive = false; stop(); document.removeEventListener('visibilitychange', visibility); if (ro) ro.disconnect();
      cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', up); cv.removeEventListener('wheel', wheel);
      sprites.clear(); scene.width = scene.height = 1;
    },
  };
}

/* Ben 10 · Omnitrix — skin 2D nhẹ, toàn bộ công trình/vật thể được dựng bằng Pen và cache một lần.
   Bốn cạnh: Bellwood, Pyronite, Petropia, Null Void. Luật/giá/ô đất vẫn dùng nguồn chung rules.js. */
import { defineSkin } from '../../js/render-common/board2d/skin.js';

const ZONES = [
  { id: 'bellwood', ground: '#153329', ground2: '#1a3d30', ground3: '#224b3a', acc: '#9cff2e', particles: 'none' },
  { id: 'pyronite', ground: '#153329', ground2: '#1a3d30', ground3: '#224b3a', acc: '#ff7a2e', particles: 'none' },
  { id: 'petropia', ground: '#153329', ground2: '#1a3d30', ground3: '#224b3a', acc: '#58e8ff', particles: 'none' },
  { id: 'null-void', ground: '#153329', ground2: '#1a3d30', ground3: '#224b3a', acc: '#c765ff', particles: 'none' },
];
const zoneId = (c) => (c.zone ? c.zone.id : 'bellwood');
const flat = (color) => (g, c) => { g.fillStyle = color; g.fillRect(0, 0, c.cw, c.ch); };

function circuitPaint(g, c) {
  c.grass(g, 0, 0, c.cw, c.ch);
  const z = c.zone || ZONES[0], r = c.rng(c.seed + 91);
  g.save(); g.globalAlpha = 0.42; g.strokeStyle = z.acc; g.lineWidth = 3;
  for (let n = 0; n < 6; n++) {
    const y = 12 + r() * (c.ch - 24), x0 = r() * c.cw * 0.35, x1 = c.cw * (0.55 + r() * 0.4);
    g.beginPath(); g.moveTo(x0, y); g.lineTo((x0 + x1) / 2, y); g.lineTo((x0 + x1) / 2, y + (r() - 0.5) * 28); g.lineTo(x1, y + (r() - 0.5) * 28); g.stroke();
    g.fillStyle = z.acc; g.beginPath(); g.arc(x0, y, 4, 0, 7); g.fill(); g.beginPath(); g.arc(x1, y + (r() - 0.5) * 28, 4, 0, 7); g.fill();
  }
  g.restore();
}

function energyRing(p, x, y, z, radius, color, spokes = 8) {
  p.flatEllipse(x, y, z, radius, radius, '#17231c');
  p.flatEllipse(x, y + 0.015, z, radius * 0.78, radius * 0.78, color);
  p.flatEllipse(x, y + 0.03, z, radius * 0.5, radius * 0.5, '#132019');
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    p.box(x + Math.cos(a) * radius * 0.6 - 0.025, y + 0.035, z + Math.sin(a) * radius * 0.6 - 0.025, 0.05, 0.04, 0.05, '#e6ffd0', { edge: null });
  }
}

function crystal(p, x, z, h, color) {
  p.ellipseShadow(x, z, h * 0.16, 0.13);
  p.solid([
    [x - h * 0.1, 0, z - h * 0.08], [x + h * 0.1, 0, z - h * 0.08], [x + h * 0.08, 0, z + h * 0.08], [x - h * 0.08, 0, z + h * 0.08],
    [x - h * 0.035, h * 0.72, z - h * 0.03], [x + h * 0.035, h, z - h * 0.03], [x + h * 0.03, h * 0.75, z + h * 0.03], [x - h * 0.03, h * 0.62, z + h * 0.03],
  ], color);
}

function alienTree(p, x, z, s, color = '#75db45') {
  p.ellipseShadow(x, z, 0.19 * s, 0.13);
  p.cyl(x, 0, z, 0.035 * s, 0.34 * s, '#33452f');
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    p.line3([[x, 0.31 * s, z], [x + Math.cos(a) * 0.23 * s, 0.52 * s, z + Math.sin(a) * 0.23 * s]], '#405f36', 0.035 * s);
    p.ball(x + Math.cos(a) * 0.24 * s, 0.55 * s, z + Math.sin(a) * 0.24 * s, 0.11 * s, i % 2 ? color : '#a8f15a');
  }
}

function flameVent(p, x, z, s = 1) {
  p.ellipseShadow(x, z, 0.16 * s, 0.12);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; p.box(x + Math.cos(a) * 0.11 * s - 0.025, 0, z + Math.sin(a) * 0.11 * s - 0.025, 0.05, 0.05, 0.05, '#49221d', { edge: null }); }
  p.cone(x, 0.04, z, 0.13 * s, 0.38 * s, '#ff6a24'); p.cone(x, 0.05, z, 0.07 * s, 0.28 * s, '#ffd642');
}

function decorImageName(c) {
  const group = String(c.group || 'A').toUpperCase();
  return `m3Decor${/^[A-H]$/.test(group) ? group : 'A'}`;
}

function deco(p, c) {
  const x = c.seed % 2 ? -0.32 : 0.32;
  p.img(decorImageName(c), x, c.gz - 0.32, 1.4);
}

function windowBand(p, x, y, z, w, color) {
  p.box(x, y, z, w, 0.13, 0.025, '#16242a', { left: '#16242a', right: '#0f1b20', edge: null });
  const n = Math.max(2, Math.round(w / 0.16));
  for (let i = 0; i < n; i++) p.box(x + 0.035 + i * (w - 0.07) / n, y + 0.025, z + 0.027, (w - 0.12) / n, 0.075, 0.012, color, { edge: null });
}

function claimPad(p, c, shape) {
  const z = c.gz, col = c.color; p.ellipseShadow(0, z, 0.34, 0.14);
  if (shape === 'ben') { energyRing(p, 0, 0.01, z, 0.27, col, 8); p.box(-0.04, 0.04, z - 0.2, 0.08, 0.34, 0.4, '#111a17', { edge: null }); }
  if (shape === 'gwen') { p.flatEllipse(0, 0.02, z, 0.29, 0.22, '#20243a'); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; p.disc(Math.cos(a) * 0.22, 0.05, z + Math.sin(a) * 0.17, 0.045, i % 2 ? '#7ae8ff' : col); } crystal(p, 0, z, 0.28, '#85f2ff'); }
  if (shape === 'kevin') { p.box(-0.29, 0, z - 0.22, 0.58, 0.1, 0.44, '#343945', { top: '#525866', edge: null }); p.rbox(0, 0.1, z, 0.18, 0.11, 0.18, col, 0.55); p.line3([[-0.25, 0.15, z - 0.18], [0.25, 0.15, z + 0.18]], '#aeb8bd', 0.035); }
  if (shape === 'max') { p.box(-0.3, 0, z - 0.22, 0.6, 0.12, 0.44, '#b8c5c1', { top: '#e7efeb', edge: null }); p.cyl(0, 0.11, z, 0.1, 0.3, '#263a35'); p.ball(0, 0.48, z, 0.11, col); p.disc(0, 0.49, z, 0.055, '#fff4d6'); }
  p.flagC(-0.48, z - 0.18, 0.8, col);
}

function benBuilding(p, c) {
  const lv = c.level, z = c.gz, col = c.color; if (!lv) return claimPad(p, c, 'ben');
  const h = 0.22 + lv * 0.2, w = 0.48 + lv * 0.08; p.ellipseShadow(0, z, 0.42 + lv * 0.05, 0.16);
  p.cyl(0, 0, z, w * 0.52, h, '#263a34'); p.flatEllipse(0, h, z, w * 0.5, w * 0.38, col); energyRing(p, 0, h + 0.03, z, 0.18 + lv * 0.015, '#b8ff58', 8);
  for (let i = 0; i < lv; i++) { const a = (i / lv) * Math.PI * 2; p.cyl(Math.cos(a) * w * 0.44, 0, z + Math.sin(a) * w * 0.32, 0.055, h * 0.78, i % 2 ? '#d5dfda' : col); }
  if (lv >= 2) windowBand(p, -w * 0.34, h * 0.38, z + w * 0.38, w * 0.68, '#aaff73');
  if (lv >= 3) { p.cyl(0, h, z, 0.1, 0.28 + lv * 0.06, '#18241f'); p.ball(0, h + 0.36 + lv * 0.06, z, 0.11, '#caff7c'); }
  if (lv === 4) { for (const x of [-0.46, 0.46]) p.line3([[x, 0.08, z], [x * 0.8, 1.18, z]], col, 0.07); p.flatEllipse(0, 1.18, z, 0.46, 0.18, '#111a17'); p.textD('HERO', 0, 1.2, z, 0.13, '#b8ff58'); }
}

function gwenBuilding(p, c) {
  const lv = c.level, z = c.gz, col = c.color; if (!lv) return claimPad(p, c, 'gwen');
  const h = 0.18 + lv * 0.17, r = 0.32 + lv * 0.045; p.ellipseShadow(0, z, r + 0.18, 0.15);
  p.cyl(0, 0, z, r, h, '#e9eef2'); p.flatEllipse(0, h, z, r * 0.92, r * 0.72, '#252841');
  for (let i = 0; i < 3 + lv; i++) { const a = i * Math.PI * 2 / (3 + lv); p.cyl(Math.cos(a) * r * 0.78, h, z + Math.sin(a) * r * 0.62, 0.035, 0.2 + lv * 0.05, i % 2 ? col : '#e66fe8'); p.ball(Math.cos(a) * r * 0.78, h + 0.24 + lv * 0.05, z + Math.sin(a) * r * 0.62, 0.055, '#8ff5ff'); }
  crystal(p, 0, z, 0.28 + lv * 0.12, '#75e9ff');
  if (lv >= 2) { p.line3([[-r, h + 0.1, z], [0, h + 0.58, z], [r, h + 0.1, z]], col, 0.055); p.disc(0, h + 0.58, z, 0.09, '#f09cff'); }
  if (lv === 4) { p.flatEllipse(0, 1.18, z, 0.48, 0.18, '#272540'); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; p.disc(Math.cos(a) * 0.37, 1.2, z + Math.sin(a) * 0.14, 0.045, i % 2 ? col : '#f09cff'); } }
}

function kevinBuilding(p, c) {
  const lv = c.level, z = c.gz, col = c.color; if (!lv) return claimPad(p, c, 'kevin');
  const w = 0.52 + lv * 0.1, h = 0.2 + lv * 0.15; p.ellipseShadow(0, z, w * 0.7, 0.17);
  p.box(-w / 2, 0, z - 0.3, w, h, 0.6, '#59616a', { top: '#7b838b', left: '#3d434b', right: '#4a5159', edge: '#24282d' });
  p.box(-w * 0.38, 0.03, z + 0.305, w * 0.76, h * 0.55, 0.025, '#20252b', { edge: null });
  for (let i = 0; i < lv; i++) { const x = -w * 0.35 + i * (w * 0.7 / Math.max(1, lv - 1)); p.cyl(x, h, z - 0.18, 0.055, 0.2 + i * 0.04, i % 2 ? '#b5bec2' : col); }
  p.line3([[-w / 2, h + 0.05, z + 0.28], [w / 2, h + 0.05, z + 0.28]], col, 0.055);
  if (lv >= 2) { p.box(w * 0.18, h, z - 0.18, 0.2, 0.32 + lv * 0.08, 0.22, '#30363e', { top: col, edge: null }); p.line3([[w * 0.28, h + 0.28, z], [w * 0.55, h + 0.58, z + 0.08]], '#b6c0c5', 0.045); }
  if (lv === 4) { p.box(-0.48, h + 0.56, z - 0.04, 0.96, 0.18, 0.08, '#262b31', { edge: null }); p.textZ('FORGE', 0, h + 0.65, z + 0.045, 0.13, '#d7dce0'); }
}

function maxBuilding(p, c) {
  const lv = c.level, z = c.gz, col = c.color; if (!lv) return claimPad(p, c, 'max');
  const w = 0.5 + lv * 0.09, h = 0.2 + lv * 0.17; p.ellipseShadow(0, z, w * 0.68, 0.16);
  p.box(-w / 2, 0, z - 0.3, w, h, 0.6, '#c9d4cf', { top: '#edf3ef', left: '#8fa09a', right: '#aebdb7', edge: null });
  p.box(-w / 2 - 0.04, 0, z - 0.32, 0.08, h * 0.8, 0.64, col, { edge: null }); p.box(w / 2 - 0.04, 0, z - 0.32, 0.08, h * 0.8, 0.64, col, { edge: null });
  windowBand(p, -w * 0.36, h * 0.38, z + 0.305, w * 0.72, '#9df3d2');
  p.box(-0.08, 0, z + 0.31, 0.16, h * 0.42, 0.025, '#24352f', { edge: null });
  if (lv >= 2) { p.cyl(-w * 0.3, h, z - 0.12, 0.055, 0.26 + lv * 0.05, '#61736c'); p.ball(-w * 0.3, h + 0.3 + lv * 0.05, z - 0.12, 0.08, col); }
  if (lv >= 3) { p.line3([[w * 0.22, h, z], [w * 0.22, h + 0.5, z]], '#3c4e47', 0.045); p.flatEllipse(w * 0.22, h + 0.5, z, 0.18, 0.07, '#edf3ef'); }
  if (lv === 4) { p.box(-0.45, h + 0.58, z - 0.04, 0.9, 0.2, 0.08, col, { edge: null }); p.textZ('PLUMBER', 0, h + 0.68, z + 0.045, 0.1, '#ffffff'); p.flagC(-0.56, z - 0.18, 1.18, col); p.flagC(0.56, z - 0.18, 1.18, col); }
}

function buildingImageName(c) {
  const owner = { 'ben10-ben': 'Ben', 'ben10-gwen': 'Gwen', 'ben10-kevin': 'Kevin', 'ben10-max': 'Max' }[c.pet];
  return owner ? `m3Building${owner}${c.level}` : '';
}
function techHouse(p, c) {
  const sprite = buildingImageName(c); if (sprite) return p.img(sprite, 0, c.gz, 1.6);
  if (c.pet === 'ben10-gwen') return gwenBuilding(p, c);
  if (c.pet === 'ben10-kevin') return kevinBuilding(p, c);
  if (c.pet === 'ben10-max') return maxBuilding(p, c);
  return benBuilding(p, c);
}

function resortImageName(c) { return `m3Resort${Math.max(0, Math.min(4, Number(c.level) || 0))}`; }
function resortImage(p, c) { p.img(resortImageName(c), 0, c.gz, 1.6); }

function portalPad(p, c) {
  const z = c.gz; energyRing(p, 0, 0.01, z, 0.42, c.color || '#9aed32', 10);
  p.line3([[-0.32, 0.06, z], [0, 0.6, z], [0.32, 0.06, z]], c.color || '#9aed32', 0.04);
  p.ball(0, 0.58, z, 0.1, '#d9ffb7');
}

function outpost(p, c) {
  portalPad(p, c); const lv = c.level, z = c.gz;
  for (let i = 0; i < lv; i++) { const a = (i / Math.max(1, lv)) * Math.PI * 2, x = Math.cos(a) * 0.48, zz = z + Math.sin(a) * 0.36; p.cyl(x, 0, zz, 0.11, 0.2 + i * 0.08, '#b9c9c3'); p.cone(x, 0.2 + i * 0.08, zz, 0.14, 0.16, c.color); }
  if (lv === 4) { p.cyl(0, 0.12, z, 0.16, 0.9, '#d4dfdb'); p.ball(0, 1.05, z, 0.18, '#aaff32'); }
}

function omnitrixArch(p, c) {
  const z = 0.12; for (const x of [-0.64, 0.64]) p.box(x - 0.08, 0, z - 0.16, 0.16, 1.05, 0.32, '#1d2925', { top: '#35463f', edge: null });
  p.line3([[-0.64, 1.05, z], [-0.35, 1.42, z], [0.35, 1.42, z], [0.64, 1.05, z]], '#a6ef3b', 0.12);
  energyRing(p, 0, 1.1, z, 0.28, '#9aed32', 8);
}

function nullVoid(p) {
  p.flatEllipse(0, 0.01, 0, 1.02, 0.86, '#281c46'); p.flatEllipse(0, 0.025, 0, 0.78, 0.64, '#a451de'); p.flatEllipse(0, 0.04, 0, 0.52, 0.42, '#18202a');
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; p.line3([[Math.cos(a) * 0.6, 0.05, Math.sin(a) * 0.48], [Math.cos(a) * 0.92, 0.8, Math.sin(a) * 0.72]], '#d476ff', 0.045); }
  p.cyl(0, 0.02, 0, 0.13, 0.72, '#77848b'); p.ball(0, 0.88, 0, 0.19, '#e99aff');
}

function arena(p) {
  p.flatEllipse(0, 0.01, 0, 1.04, 0.86, '#1c2729'); p.flatEllipse(0, 0.05, 0, 0.78, 0.61, '#77d63d');
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; p.box(Math.cos(a) * 0.89 - 0.08, 0, Math.sin(a) * 0.72 - 0.08, 0.16, 0.35 + (i % 2) * 0.1, 0.16, i % 2 ? '#283c35' : '#3a5147', { edge: null }); }
  p.line3([[-0.62, 0.38, -0.52], [0, 0.75, -0.65], [0.62, 0.38, -0.52]], '#aaff32', 0.06);
}

function plumberShip(p) {
  p.ellipseShadow(0, 0, 0.8, 0.15); p.flatEllipse(0, 0.38, 0, 0.82, 0.55, '#b8c9cc'); p.flatEllipse(0, 0.55, 0, 0.48, 0.34, '#75dfff');
  p.cyl(0, 0.18, 0, 0.2, 0.28, '#dce6e5');
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; const x = Math.cos(a) * 0.68, z = Math.sin(a) * 0.45; p.cyl(x, 0.14, z, 0.1, 0.24, '#263b40'); p.ball(x, 0.13, z, 0.085, '#aaff32'); }
}

function chancePod(p, c) {
  const z = c.gz; p.ellipseShadow(0, z, 0.28, 0.15); p.cyl(0, 0, z, 0.24, 0.36, '#26352f'); p.ball(0, 0.48, z, 0.27, '#8fe83a'); p.textD('?', 0, 0.5, z + 0.01, 0.35, '#101914', '#ffffff');
}

function plumberTax(p, c) {
  const z = c.gz; p.ellipseShadow(0, z, 0.34, 0.14); p.box(-0.35, 0, z - 0.25, 0.7, 0.58, 0.5, '#d7e1df', { top: '#eff6f4', left: '#a8b7b2', right: '#c3cfcb' });
  p.box(-0.3, 0.34, z + 0.255, 0.6, 0.16, 0.025, '#1b2925', { edge: null }); p.textZ('PLUMBER TAX', 0, 0.42, z + 0.282, 0.1, '#aaff32'); p.box(-0.08, 0, z + 0.26, 0.16, 0.3, 0.025, '#263b40', { edge: null });
}

const cornerImage = (name, scale) => (p) => p.img(name, 0, 0, scale);
function chanceImage(p, c) {
  const name = c.tile === 20 ? 'm3Chance2' : c.tile === 28 ? 'm3Chance3' : 'm3Chance1';
  p.img(name, 0, c.gz, name === 'm3Chance1' ? 1.45 : name === 'm3Chance2' ? 1.55 : 1.5);
}
function taxImage(p, c) { p.img('m3Tax', 0, c.gz, 1.55); }
function festivalImage(p, c) {
  p.img('m3Festival', 0, c.gz, 1.7);
  p.textZ(`×${c.level || 2}`, 0, 0.72, c.gz + 0.04, 0.18, '#ffffff', 'rgba(0,0,0,.45)');
}
function outageImage(p, c) { p.img('m3Outage', 0, c.gz, 1.45); }

function centerGround(g, c) {
  const W = (x, z) => c.T(x, z); g.save(); g.fillStyle = '#132c24'; g.fillRect(0, 0, g.canvas.width, g.canvas.height); g.globalAlpha = 0.52; g.strokeStyle = '#78d934'; g.lineWidth = 5;
  for (let r = 1; r <= 5; r++) { const [x, y] = W(0, 0); g.beginPath(); g.arc(x, y, r * 58, 0, Math.PI * 2); g.stroke(); }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, a0 = W(Math.cos(a) * 1.05, Math.sin(a) * 1.05), a1 = W(Math.cos(a) * 6.2, Math.sin(a) * 6.2); g.beginPath(); g.moveTo(...a0); g.lineTo(...a1); g.stroke(); }
  g.globalAlpha = 0.28; g.strokeStyle = '#8bc9b0'; g.lineWidth = 18; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, a0 = W(Math.cos(a) * 1.5, Math.sin(a) * 1.5), a1 = W(Math.cos(a) * 6.1, Math.sin(a) * 6.1); g.beginPath(); g.moveTo(...a0); g.lineTo(...a1); g.stroke(); }
  g.restore();
}

function biome(pen, c) {
  const add = (x, z, fn, d = 0) => c.add(x, z, (p) => fn(p, x, z), d);
  const landmark = (name, h) => (p, x, z) => p.img(name, x, z, h);
  if (c.zone.id === 'bellwood') {
    add(3.7, 2.45, landmark('bellwood', 3.65), .2);
    add(4.75, 1.15, (p, x, z) => alienTree(p, x, z, 1.15), .05);
  }
  if (c.zone.id === 'pyronite') {
    add(-2.75, -2.75, landmark('pyron', 3.65), .2);
    add(-4.15, -1.85, (p, x, z) => flameVent(p, x, z, 1.15), .05);
  }
  if (c.zone.id === 'petropia') {
    add(-1.1, 4.1, landmark('petropia', 3.65), .2);
    add(0.6, 4.8, (p, x, z) => crystal(p, x, z, .85, '#8df4ff'), .05);
  }
  if (c.zone.id === 'null-void') {
    add(-4.15, 0.35, landmark('nullvoid', 3.7), .2);
    add(-4.85, 1.7, (p, x, z) => { energyRing(p, x, .03, z, .42, '#c765ff', 10); p.ball(x, .62, z, .13, '#f0b5ff'); }, .05);
  }
}

function omnitrixCore(p) {
  // Hai ảnh ngang neo tại mép trước của mặt đất, không dùng neo đáy ảnh mặc định.
  p.img('m3AlienRing', 0, 0, 5.6, 0.8);
  p.img('m3CenterOmnitrix', 1.34, 1.34, 4.8, 0.015);
  p.img('m3DicePad', 3.25, 3.25, 3.35, 0.02);
}

function energyFx(p, t) {
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + t * 0.35, r = 0.75 + 0.12 * Math.sin(t * 2 + i); p.disc(Math.cos(a) * r, 0.82 + 0.08 * Math.sin(t * 3 + i), Math.sin(a) * r, 0.035, '#c9ff77', 0.75); }
}

export default defineSkin({
  id: 'ben-10',
  packs: [],
  sprites: {
    bellwood: 'assets/v2/zones/m3-zone-bellwood.webp', pyron: 'assets/v2/zones/m3-zone-pyron.webp',
    petropia: 'assets/v2/zones/m3-zone-petropia.webp', nullvoid: 'assets/v2/zones/m3-zone-nullvoid.webp',
    m3BoardBase: 'assets/v2/board/m3-board-base.webp',
    m3CenterOmnitrix: 'assets/v2/board/m3-center-omnitrix.webp',
    m3DicePad: 'assets/v2/board/m3-dice-pad.webp',
    m3AlienRing: 'assets/v2/zones/m3-center-prop-aliens.webp',
    m3EdgeLights: 'assets/v2/zones/m3-board-edge-lights.webp',
    m3Start: 'assets/v2/special/m3-special-start.webp',
    m3NullVoid: 'assets/v2/special/m3-special-null-void.webp',
    m3Championship: 'assets/v2/special/m3-special-championship.webp',
    m3Tour: 'assets/v2/special/m3-special-tour.webp',
    m3Chance1: 'assets/v2/special/m3-special-chance-1.webp',
    m3Chance2: 'assets/v2/special/m3-special-chance-2.webp',
    m3Chance3: 'assets/v2/special/m3-special-chance-3.webp',
    m3Tax: 'assets/v2/special/m3-special-tax.webp',
    m3Festival: 'assets/v2/special/m3-special-festival.webp',
    m3Outage: 'assets/v2/special/m3-special-outage.webp',
    m3BuildingBen0: 'assets/v2/buildings/m3-building-ben-0.webp',
    m3BuildingBen1: 'assets/v2/buildings/m3-building-ben-1.webp',
    m3BuildingBen2: 'assets/v2/buildings/m3-building-ben-2.webp',
    m3BuildingBen3: 'assets/v2/buildings/m3-building-ben-3.webp',
    m3BuildingBen4: 'assets/v2/buildings/m3-building-ben-4.webp',
    m3BuildingGwen0: 'assets/v2/buildings/m3-building-gwen-0.webp',
    m3BuildingGwen1: 'assets/v2/buildings/m3-building-gwen-1.webp',
    m3BuildingGwen2: 'assets/v2/buildings/m3-building-gwen-2.webp',
    m3BuildingGwen3: 'assets/v2/buildings/m3-building-gwen-3.webp',
    m3BuildingGwen4: 'assets/v2/buildings/m3-building-gwen-4.webp',
    m3BuildingKevin0: 'assets/v2/buildings/m3-building-kevin-0.webp',
    m3BuildingKevin1: 'assets/v2/buildings/m3-building-kevin-1.webp',
    m3BuildingKevin2: 'assets/v2/buildings/m3-building-kevin-2.webp',
    m3BuildingKevin3: 'assets/v2/buildings/m3-building-kevin-3.webp',
    m3BuildingKevin4: 'assets/v2/buildings/m3-building-kevin-4.webp',
    m3BuildingMax0: 'assets/v2/buildings/m3-building-max-0.webp',
    m3BuildingMax1: 'assets/v2/buildings/m3-building-max-1.webp',
    m3BuildingMax2: 'assets/v2/buildings/m3-building-max-2.webp',
    m3BuildingMax3: 'assets/v2/buildings/m3-building-max-3.webp',
    m3BuildingMax4: 'assets/v2/buildings/m3-building-max-4.webp',
    m3Resort0: 'assets/v2/resorts/m3-resort-0.webp',
    m3Resort1: 'assets/v2/resorts/m3-resort-1.webp',
    m3Resort2: 'assets/v2/resorts/m3-resort-2.webp',
    m3Resort3: 'assets/v2/resorts/m3-resort-3.webp',
    m3Resort4: 'assets/v2/resorts/m3-resort-4.webp',
    m3DecorA: 'assets/v2/decor/m3-decor-a.webp',
    m3DecorB: 'assets/v2/decor/m3-decor-b.webp',
    m3DecorC: 'assets/v2/decor/m3-decor-c.webp',
    m3DecorD: 'assets/v2/decor/m3-decor-d.webp',
    m3DecorE: 'assets/v2/decor/m3-decor-e.webp',
    m3DecorF: 'assets/v2/decor/m3-decor-f.webp',
    m3DecorG: 'assets/v2/decor/m3-decor-g.webp',
    m3DecorH: 'assets/v2/decor/m3-decor-h.webp',
  },
  spriteMeta: {
    bellwood: { anchor: [0.5, 0.9296875] }, pyron: { anchor: [0.5, 0.9296875] },
    petropia: { anchor: [0.5, 0.9296875] }, nullvoid: { anchor: [0.5, 0.9296875] },
    m3BoardBase: { anchor: [0.5, 0.94140625] },
    m3CenterOmnitrix: { anchor: [0.5, 0.92578125] },
    m3DicePad: { anchor: [0.5, 0.916015625] },
    m3AlienRing: { anchor: [0.5, 0.5] },
    m3EdgeLights: { anchor: [0.5, 0.921875] },
    m3Start: { anchor: [0.5, 0.9375] }, m3NullVoid: { anchor: [0.5, 0.9375] },
    m3Championship: { anchor: [0.5, 0.9375] }, m3Tour: { anchor: [0.5, 0.9375] },
    m3Chance1: { anchor: [0.5, 0.9375] }, m3Chance2: { anchor: [0.5, 0.9375] },
    m3Chance3: { anchor: [0.5, 0.9375] }, m3Tax: { anchor: [0.5, 0.9375] },
    m3Festival: { anchor: [0.5, 0.9375], lazy: true }, m3Outage: { anchor: [0.5, 0.9375], lazy: true },
    m3BuildingBen0: { anchor: [0.5, 0.9375], lazy: true }, m3BuildingBen1: { anchor: [0.5, 0.9375], lazy: true },
    m3BuildingBen2: { anchor: [0.5, 0.9375], lazy: true }, m3BuildingBen3: { anchor: [0.5, 0.9375], lazy: true },
    m3BuildingBen4: { anchor: [0.5, 0.9375], lazy: true },
    m3BuildingGwen0: { anchor: [0.5, 0.9375], lazy: true }, m3BuildingGwen1: { anchor: [0.5, 0.9375], lazy: true },
    m3BuildingGwen2: { anchor: [0.5, 0.9375], lazy: true }, m3BuildingGwen3: { anchor: [0.5, 0.9375], lazy: true },
    m3BuildingGwen4: { anchor: [0.5, 0.9375], lazy: true },
    m3BuildingKevin0: { anchor: [0.5, 0.9375], lazy: true }, m3BuildingKevin1: { anchor: [0.5, 0.9375], lazy: true },
    m3BuildingKevin2: { anchor: [0.5, 0.9375], lazy: true }, m3BuildingKevin3: { anchor: [0.5, 0.9375], lazy: true },
    m3BuildingKevin4: { anchor: [0.5, 0.9375], lazy: true },
    m3BuildingMax0: { anchor: [0.5, 0.9375], lazy: true }, m3BuildingMax1: { anchor: [0.5, 0.9375], lazy: true },
    m3BuildingMax2: { anchor: [0.5, 0.9375], lazy: true }, m3BuildingMax3: { anchor: [0.5, 0.9375], lazy: true },
    m3BuildingMax4: { anchor: [0.5, 0.9375], lazy: true },
    m3Resort0: { anchor: [0.5, 0.9375] },
    m3Resort1: { anchor: [0.5, 0.9375], lazy: true }, m3Resort2: { anchor: [0.5, 0.9375], lazy: true },
    m3Resort3: { anchor: [0.5, 0.9375], lazy: true }, m3Resort4: { anchor: [0.5, 0.9375], lazy: true },
    m3DecorA: { anchor: [0.5, 0.9375] }, m3DecorB: { anchor: [0.5, 0.9375] },
    m3DecorC: { anchor: [0.5, 0.9375] }, m3DecorD: { anchor: [0.5, 0.9375] },
    m3DecorE: { anchor: [0.5, 0.9375] }, m3DecorF: { anchor: [0.5, 0.9375] },
    m3DecorG: { anchor: [0.5, 0.9375] }, m3DecorH: { anchor: [0.5, 0.9375] },
  },
  diceAt: [[2.65, 1.82], [1.82, 2.65]],
  cityLabelBand: 0.18,
  palette: {
    groups: { A: '#a8ef45', B: '#4dd47a', C: '#32c6b7', D: '#45a8df', E: '#6775e8', F: '#a55cdf', G: '#e65d9c', H: '#ff8b38' },
    ground: '#153329', ground2: '#1a3d30', ground3: '#224b3a', priceStrip: '#202d29', priceText: '#d9f6df', labelText: '#ffffff', labelShadow: '#101914',
    boardSide: '#17231f', boardSideDark: '#0d1512', boardTop: '#273a32', tileSide: '#50635b', tileSideDark: '#34443d', water: '#64419a', sand: '#8651a8', resortBand: '#9aed32',
  },
  zones: ZONES,
  slots: {
    tile: { paint: circuitPaint },
    deco: { draw: deco, assets: (c) => [decorImageName(c)] },
    house: { draw: techHouse, assets: (c) => { const name = buildingImageName(c); return name ? [name] : []; } },
    resort: { paint: circuitPaint, draw: resortImage, assets: () => ['m3Resort0'] },
    resortHouse: { draw: resortImage, assets: (c) => [resortImageName(c)] },
    start: { paint: circuitPaint, label: [0.62, 0.65, 58, 0.82], draw: cornerImage('m3Start', 2.75) },
    island: { paint: flat('#4b3372'), side: ['#4c356e', '#34244d'], label: [0.7, 0.8, 31, 0.56], draw: cornerImage('m3NullVoid', 2.85) },
    festival: { paint: circuitPaint, draw: cornerImage('m3Championship', 2.95) },
    tour: { paint: circuitPaint, draw: cornerImage('m3Tour', 2.9) },
    chance: { paint: circuitPaint, draw: chanceImage },
    tax: { paint: circuitPaint, draw: taxImage },
    bonus: { draw: festivalImage, assets: () => ['m3Festival'] },
    outage: { draw: outageImage, assets: () => ['m3Outage'] },
    base: { draw: (p, c) => { const a = c.half + c.margin - 0.08; p.img('m3BoardBase', a, a, 19.45, c.y - 0.42); p.img('m3EdgeLights', a, a, 19.45, c.y - 0.38); } },
    center: { paint: centerGround, draw: biome, core: omnitrixCore },
  },
  ambient: { animate: { energy: energyFx } },
  labels: { start: 'HERO START', island: 'NULL VOID', festival: 'GALACTIC CUP', tour: 'PLUMBER TOUR', resortLevels: ['Cổng dịch chuyển', 'Trạm vệ tinh', 'Trạm trung chuyển quỹ đạo', 'Pháo đài Plumber'] },
});

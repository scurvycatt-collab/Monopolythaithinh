/* Skin "Lumina-01" — đô thị neon nửa đêm sau mưa. BẢN DUYỆT HƯỚNG (T24): thô nhưng thật, chỉ dùng tính năng khung xương hiện có.
   Phong cách: nền tối, khối Kenney tường tối + mái màu chủ, neon vẽ bằng bút (glow = shadowBlur trên pen.ctx, nướng sẵn vào sprite).
   Brief: public/maps/neon/BRIEF.md · hợp đồng: docs/contracts/map-skin.md · bút: public/js/render-common/board2d/PEN.md. */
import { defineSkin } from '../../js/render-common/board2d/skin.js';

const N = { cyan: '#27e6ff', mag: '#ff3fb4', lime: '#b6ff3c', gold: '#ffc83d', red: '#ff3b4e', violet: '#9b6bff', ink: '#070a14', steel: '#2a3350', steel2: '#39446a' };
const Z = [   // 4 cạnh: 0 Back Alley · 1 Nightlife · 2 Cyber Financial · 3 Megacorp HQ
  { id: 'alley', ground: '#141a1c', ground2: '#182022', ground3: '#1d2729', wall: '#8a6a52', acc: '#ff8a3d', particles: 'none' },
  { id: 'night', ground: '#1a1230', ground2: '#20163c', ground3: '#271c48', wall: '#8a5a9c', acc: N.mag, particles: 'none' },
  { id: 'fin', ground: '#0e1a2c', ground2: '#122238', ground3: '#162a44', wall: '#6f9ab8', acc: N.cyan, particles: 'none' },
  { id: 'hq', ground: '#15120c', ground2: '#1b170e', ground3: '#221c10', wall: '#8c7a4a', acc: N.gold, particles: 'none' },
];
const zid = (c) => (c.zone ? c.zone : { acc: N.cyan, ground: '#0d1226' });

/* ---------- glow: shadowBlur trên pen.ctx (nướng sẵn, không phải phát sáng thật) ---------- */
function glow(p, col, blur, fn) { const g = p.ctx; g.save(); g.shadowColor = col; g.shadowBlur = p.k * blur; fn(g); g.restore(); }
function neon(p, pts, col, w = 0.03, blur = 0.14) { glow(p, col, blur, () => p.line3(pts, col, w)); p.line3(pts, p.u.light(col, 0.6), w * 0.35); }
function neonLoop(p, x0, z0, x1, z1, y, col, w, blur) { neon(p, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [x0, y, z0]], col, w, blur); }
function neonText(p, s, x, y, z, h, col) { glow(p, col, 0.16, () => p.textD(s, x, y, z, h, col)); }
function ring(p, x, y, z, r, col, w = 0.03, n = 40) { neon(p, Array.from({ length: n + 1 }, (_, i) => [x + Math.cos((i / n) * 6.283) * r, y, z + Math.sin((i / n) * 6.283) * r]), col, w); }
function slab(p, x, z, w, d, h, col) { p.box(x - w / 2, 0, z - d / 2, w, h, d, col, { edge: 'rgba(120,160,255,.18)' }); }
function screen(p, x, y, z, w, h, col) { glow(p, col, 0.1, () => p.quadZ(z, x - w / 2, x + w / 2, y, y + h, col)); }

/* ---------- mặt phẳng (texture điểm ảnh): nền tối + mạch điện ---------- */
function circuit(g, c, x, y, w, h, seed, col, alpha = 0.4) {
  const r = c.rng(seed + 3); g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.strokeStyle = 'rgba(120,150,255,.07)'; g.lineWidth = 1; for (let i = 0; i <= w; i += 24) { g.beginPath(); g.moveTo(x + i, y); g.lineTo(x + i, y + h); g.stroke(); } for (let j = 0; j <= h; j += 24) { g.beginPath(); g.moveTo(x, y + j); g.lineTo(x + w, y + j); g.stroke(); }
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2; g.lineJoin = 'round'; g.globalAlpha = alpha; g.shadowColor = col; g.shadowBlur = 6;
  for (let t = 0; t < 5; t++) { let px = x + Math.floor(r() * (w / 24)) * 24, py = y + Math.floor(r() * (h / 24)) * 24; g.beginPath(); g.moveTo(px, py); for (let s = 0; s < 3 + Math.floor(r() * 3); s++) { if (r() < 0.5) px += (r() < 0.5 ? -1 : 1) * (1 + Math.floor(r() * 3)) * 24; else py += (r() < 0.5 ? -1 : 1) * (1 + Math.floor(r() * 3)) * 24; g.lineTo(px, py); } g.stroke(); g.beginPath(); g.arc(px, py, 4, 0, 7); g.fill(); }
  g.restore();
}
function floor(g, c, col, acc, seed = c.seed) { g.fillStyle = col; g.fillRect(0, 0, c.cw, c.ch); circuit(g, c, 0, 0, c.cw, c.ch, seed, acc); }
const tilePaint = (g, c) => { const z = zid(c); floor(g, c, z.ground, z.acc); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 4; g.strokeRect(2, 2, c.cw - 4, c.ch - 4); };
const cornerPaint = (a, b, ring2) => (g, c) => {
  const gr = g.createRadialGradient(c.cw / 2, c.ch / 2, 10, c.cw / 2, c.ch / 2, c.cw * 0.72); gr.addColorStop(0, b); gr.addColorStop(1, a); g.fillStyle = gr; g.fillRect(0, 0, c.cw, c.ch);
  circuit(g, c, 0, 0, c.cw, c.ch, c.seed + 11, ring2, 0.5);
  g.save(); g.strokeStyle = ring2; g.globalAlpha = 0.55; g.shadowColor = ring2; g.shadowBlur = 8; g.lineWidth = 3; for (let i = 1; i <= 3; i++) { g.strokeRect(c.cw * (0.5 - i * 0.14), c.ch * (0.5 - i * 0.14), c.cw * i * 0.28, c.ch * i * 0.28); } g.restore();
};

/* ---------- bảng tên ô góc (vẽ sau cùng) ---------- */
function plaque(p, c, text, col) {
  const [sx, sy] = p.p(1.12, 0.05, 1.12), g = p.ctx, fs = p.k * 0.16;
  g.save(); g.font = `900 ${fs}px ${c.font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(text).width + fs * 0.9, h = fs * 1.45;
  g.shadowColor = col; g.shadowBlur = fs * 0.7; g.fillStyle = 'rgba(6,9,20,.92)'; g.strokeStyle = col; g.lineWidth = fs * 0.09; g.beginPath(); g.rect(sx - w / 2, sy - h / 2, w, h); g.fill(); g.stroke();
  g.shadowBlur = fs * 0.4; g.fillStyle = '#ffffff'; g.fillText(text, sx, sy + fs * 0.04); g.restore();
}
const named = (draw, text, col) => (p, c) => { draw(p, c); plaque(p, c, text, col); };

/* ---------- ô góc ---------- */
function powerGrid(p) {   // Start: trạm biến áp, cuộn Tesla acid green, trụ cáp vàng
  const L = [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]];
  p.ellipseShadow(0, 0, 0.9, 0.2); p.cyl(0, 0, 0, 0.62, 0.14, N.steel); p.cyl(0, 0.14, 0, 0.46, 0.1, N.steel2); ring(p, 0, 0.16, 0, 0.58, N.lime, 0.035);
  p.cyl(0, 0.24, 0, 0.14, 0.9, '#1b2438'); for (let i = 0; i < 5; i++) ring(p, 0, 0.36 + i * 0.17, 0, 0.19 - i * 0.012, i % 2 ? N.lime : N.gold, 0.03, 20);
  glow(p, N.lime, 0.3, () => p.ball(0, 1.28, 0, 0.13, N.lime)); p.ball(0, 1.3, 0, 0.07, '#f4ffd8');
  L.forEach(([x, z], i) => { p.box(x - 0.06, 0, z - 0.06, 0.12, 0.55, 0.12, N.steel2, { edge: null }); glow(p, N.gold, 0.2, () => p.ball(x, 0.6, z, 0.07, N.gold)); neon(p, [[x, 0.58, z], [x * 0.45, 0.8, z * 0.45], [0, 1.15, 0]], i % 2 ? N.lime : N.gold, 0.012, 0.08); });
  neon(p, [[1.2, 0.01, 0.6], [1.45, 0.01, 0.6], [1.45, 0.01, 1.2]], N.gold, 0.04);
}
function firewall(p) {   // Lost Island: lồng laser đỏ quanh lõi bị khoá
  p.ellipseShadow(0, 0, 0.9, 0.2); const R = 0.85; p.box(-0.3, 0, -0.3, 0.6, 0.32, 0.6, '#1b2438', { edge: null }); screen(p, 0, 0.1, 0.31, 0.3, 0.14, N.red);
  glow(p, N.red, 0.2, () => p.flatEllipse(0, 0.004, 0, R + 0.1, R + 0.1, 'rgba(255,59,78,.18)')); ring(p, 0, 0.012, 0, R + 0.06, N.red, 0.025);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283, x = Math.cos(a) * R, z = Math.sin(a) * R; neon(p, [[x, 0.02, z], [x, 1.1, z]], N.red, 0.022, 0.1); }
  ring(p, 0, 1.1, 0, R, N.red, 0.03); ring(p, 0, 0.55, 0, R, '#ff8a96', 0.012);
  [[-1.15, -1.15], [1.15, -1.15], [-1.15, 1.15], [1.15, 1.15]].forEach(([x, z]) => { p.box(x - 0.07, 0, z - 0.07, 0.14, 0.28, 0.14, N.steel, { edge: null }); glow(p, N.red, 0.14, () => p.ball(x, 0.32, z, 0.06, N.red)); });
  neonText(p, 'ACCESS DENIED', 0, 1.42, 0, 0.17, N.red);
}
function arcade(p) {   // Championships: dãy máy arcade + biển marquee
  p.ellipseShadow(0, 0, 1.1, 0.2); const cols = [N.mag, N.cyan, N.lime, N.gold];
  [[-0.8, -0.2], [-0.3, -0.5], [0.3, -0.5], [0.8, -0.2]].forEach(([x, z], i) => { p.box(x - 0.2, 0, z - 0.17, 0.4, 0.62, 0.34, '#1a1430', { top: '#2a2050', edge: null }); screen(p, x, 0.3, z + 0.172, 0.28, 0.2, cols[i]); neon(p, [[x - 0.2, 0.62, z + 0.17], [x + 0.2, 0.62, z + 0.17]], cols[(i + 1) % 4], 0.025, 0.08); p.ball(x - 0.08, 0.18, z + 0.18, 0.03, N.red); p.ball(x + 0.08, 0.18, z + 0.18, 0.03, N.gold); });
  for (const x of [-1.05, 1.05]) p.box(x - 0.05, 0, 0.35 - 0.05, 0.1, 1.4, 0.1, N.steel2, { edge: null });
  neonLoop(p, -1.1, 0.3, 1.1, 0.3, 1.0, N.mag, 0.02, 0.1); p.box(-1.1, 1.0, 0.28, 2.2, 0.4, 0.06, '#120a22', { edge: null }); neonText(p, 'ARCADE', 0, 1.1, 0.34, 0.24, N.mag);
  for (let i = 0; i < 4; i++) glow(p, N.gold, 0.1, () => p.cyl(0.2, i * 0.035, 0.85, 0.11, 0.03, N.gold)); glow(p, N.gold, 0.1, () => p.cyl(-0.3, 0, 0.9, 0.11, 0.03, N.gold));
}
function warpGate(p) {   // World Tour: cổng dịch chuyển xoáy
  p.ellipseShadow(0, 0, 0.9, 0.2); p.cyl(0, 0, 0, 0.7, 0.1, N.steel); ring(p, 0, 0.11, 0, 0.62, N.cyan, 0.03);
  for (const x of [-0.62, 0.62]) { p.box(x - 0.08, 0, -0.08, 0.16, 1.5, 0.16, N.steel2, { edge: null }); neon(p, [[x, 0.1, 0.09], [x, 1.45, 0.09]], N.cyan, 0.02, 0.1); }
  const g = p.ctx, [cx, cy] = p.p(0, 0.82, 0.1), R = p.k * 0.62;
  g.save(); g.shadowColor = N.violet; g.shadowBlur = p.k * 0.35; const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R); gr.addColorStop(0, '#f2eaff'); gr.addColorStop(0.35, N.violet); gr.addColorStop(1, 'rgba(60,20,140,.2)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, R * 0.62, R, 0, 0, 7); g.fill(); g.shadowBlur = 0; g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = p.k * 0.012; for (let k = 0; k < 3; k++) { g.beginPath(); for (let i = 0; i <= 30; i++) { const t = i / 30, a = t * 9 + k * 2.09; g.lineTo(cx + Math.cos(a) * R * 0.55 * t * 0.62, cy + Math.sin(a) * R * 0.55 * t); } g.stroke(); }
  g.shadowColor = N.cyan; g.shadowBlur = p.k * 0.2; g.strokeStyle = N.cyan; g.lineWidth = p.k * 0.035; g.beginPath(); g.ellipse(cx, cy, R * 0.64, R * 1.02, 0, 0, 7); g.stroke(); g.restore();
  neon(p, [[-1.2, 0.01, 1.0], [1.2, 0.01, 1.0]], N.violet, 0.03);
}

/* ---------- ô Chance (Data Cube) / Tax ---------- */
function dataCube(p) {
  p.ellipseShadow(0, 0.1, 0.32, 0.2); glow(p, N.mag, 0.2, () => p.flatEllipse(0, 0.004, 0.1, 0.34, 0.34, 'rgba(255,63,180,.22)')); ring(p, 0, 0.01, 0.1, 0.3, N.mag, 0.02, 24);
  p.box(-0.2, 0.28, -0.1, 0.4, 0.4, 0.4, '#1a1030', { top: '#3a1f5c', left: '#1a1030', right: '#2a1850', edge: N.mag });
  glow(p, N.mag, 0.2, () => { const [sx, sy] = p.p(0, 0.5, 0.31), g = p.ctx; g.fillStyle = '#fff'; g.font = `900 ${p.k * 0.22}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', sx, sy); });
  neonLoop(p, -0.2, -0.1, 0.2, 0.3, 0.68, N.cyan, 0.015, 0.06);
}
function taxTerminal(p) {
  p.ellipseShadow(0, 0, 0.55, 0.2); slab(p, 0, 0, 0.9, 0.5, 0.7, '#121c24'); screen(p, 0, 0.3, 0.251, 0.7, 0.26, N.lime);
  neonText(p, 'TAX', 0, 0.38, 0.27, 0.16, '#0b1a05'); neonLoop(p, -0.45, -0.25, 0.45, 0.25, 0.7, N.lime, 0.02, 0.1);
  for (let i = 0; i < 3; i++) glow(p, N.lime, 0.1, () => p.cyl(0.6, i * 0.03, 0.4, 0.1, 0.025, N.lime));
}
function chargePad(p, c) {   // resort chưa mua: bệ sạc
  const z = c.gz; p.ellipseShadow(0, z, 0.7, 0.2); p.cyl(0, 0, z, 0.62, 0.08, N.steel); ring(p, 0, 0.09, z, 0.5, N.cyan, 0.03);
  for (let i = 0; i < 3; i++) { const x = (i - 1) * 0.3; p.box(x - 0.08, 0.08, z - 0.1, 0.16, 0.3, 0.2, '#16223a', { edge: null }); neon(p, [[x, 0.14, z + 0.101], [x, 0.34, z + 0.101]], N.lime, 0.03, 0.08); }
}
function chargeHub(p, c) {   // resort đã mua: n trụ pin màu chủ trên bệ
  const z = c.gz, n = c.level, col = c.color; p.ellipseShadow(0, z, 0.8, 0.2); p.cyl(0, 0, z, 0.72, 0.1, N.steel); ring(p, 0, 0.11, z, 0.62, col, 0.035);
  const P = [[-0.35, -0.2], [0.35, -0.2], [-0.35, 0.3], [0.35, 0.3]];
  for (let i = 0; i < n; i++) { const [dx, dz] = P[i], h = 0.45 + i * 0.12; p.cyl(dx, 0.1, z + dz, 0.12, h, '#16223a'); glow(p, col, 0.16, () => p.cyl(dx, 0.1 + h, z + dz, 0.12, 0.05, col)); neon(p, [[dx, 0.2, z + dz + 0.121], [dx, h, z + dz + 0.121]], col, 0.03, 0.08); }
  if (n === 4) neon(p, [[-0.35, 1.05, z - 0.2], [0.35, 1.05, z - 0.2], [0.35, 1.05, z + 0.3], [-0.35, 1.05, z + 0.3], [-0.35, 1.05, z - 0.2]], col, 0.02);
}

/* ---------- nhà: khối Kenney tường tối + mái chủ, neon vẽ thêm ---------- */
const HEIGHTS = [0.1, 0.6, 0.95, 1.3, 2.1];
const houseUnder = (p, c) => {   // bệ neon màu chủ: "mạch điện thắp sáng ô"
  const z = zid(c), col = c.color; neonLoop(p, -0.72, -0.72, 0.72, 0.72, 0.006, col, 0.025, 0.12);
  if (c.level) for (const [x, zz] of [[-0.72, -0.72], [0.72, -0.72], [-0.72, 0.72], [0.72, 0.72]]) glow(p, col, 0.1, () => p.ball(x, 0.02, zz, 0.035, col));
  void z;
};
const houseOver = (p, c) => {
  const z = zid(c), lv = c.level, h = HEIGHTS[lv];
  if (lv === 0) return;
  if (lv >= 1) neonLoop(p, -0.3, -0.3, 0.3, 0.3, h * 0.45, z.acc, 0.014, 0.08);
  if (lv === 1) { screen(p, 0, 0.1, 0.361, 0.3, 0.14, z.acc); }
  if (lv >= 2) { neonLoop(p, -0.3, -0.3, 0.3, 0.3, h * 0.8, z.acc, 0.014, 0.08); screen(p, -0.1, 0.2, 0.5, 0.3, 0.2, N.cyan); }
  if (lv >= 3) { p.box(-0.02, h, -0.02, 0.04, 0.4, 0.04, N.steel2, { edge: null }); glow(p, N.mag, 0.25, () => p.ball(0, h + 0.44, 0, 0.05, N.mag)); neon(p, [[-0.25, h * 0.6, 0.35], [-0.25, h * 0.95, 0.35]], N.mag, 0.02, 0.08); }
  if (lv === 4) { ring(p, 0, h + 0.2, 0, 0.28, N.gold, 0.025, 24); neon(p, [[0, h, 0], [0, h + 0.75, 0]], N.gold, 0.02, 0.12); glow(p, N.gold, 0.3, () => p.ball(0, h + 0.8, 0, 0.07, N.gold)); }
};
const deco = (p, c) => {   // ô trống: cột đèn, thùng máy, hơi nước — vài nét thôi
  const z = zid(c), r = p.u.rng(c.seed + 9), x = (r() < 0.5 ? -1 : 1) * 0.55;
  p.ellipseShadow(x, -0.9, 0.2, 0.2); p.box(x - 0.015, 0, -1.0, 0.03, 0.7, 0.03, N.steel2, { edge: null }); neon(p, [[x, 0.7, -1.0], [x + 0.18, 0.7, -1.0]], z.acc, 0.03, 0.1);
  if (r() < 0.5) { p.box(-x - 0.12, 0, -0.85, 0.24, 0.22, 0.2, '#161d33', { edge: null }); neon(p, [[-x - 0.1, 0.15, -0.649], [-x + 0.1, 0.15, -0.649]], z.acc, 0.02, 0.06); }
};

/* ---------- giữa bàn: Reactor Core ---------- */
function reactorFloor(g, c) {
  const { T, px } = c, [cx, cy] = T(0, 0); g.save();
  g.strokeStyle = '#27e6ff'; g.shadowColor = '#27e6ff'; g.shadowBlur = 10; g.lineCap = 'round';
  for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + (i * Math.PI) / 2, [ex, ey] = T(Math.cos(a - Math.PI / 4 + Math.PI / 4) * 0, 0); void ex; void ey; }
  const arms = [[1, 1], [-1, 1], [-1, -1], [1, -1]]; arms.forEach(([x, z], i) => { g.globalAlpha = 0.7; g.lineWidth = 0.05 * px; g.strokeStyle = [N.cyan, N.mag, N.gold, N.lime][i]; g.beginPath(); g.moveTo(cx, cy); const [mx, my] = T(x * 2.2, z * 0.6); g.lineTo(mx, my); g.lineTo(...T(x * 4.6, z * 0.6)); g.lineTo(...T(x * 5.2, z * 5.2)); g.stroke(); });
  g.globalAlpha = 1; for (let r = 1; r <= 3; r++) { g.strokeStyle = r === 2 ? N.mag : N.cyan; g.lineWidth = 0.03 * px; g.beginPath(); g.arc(cx, cy, r * 0.75 * px, 0, 7); g.stroke(); }
  g.shadowBlur = 0; g.fillStyle = 'rgba(8,12,28,.75)'; g.beginPath(); g.arc(cx, cy, 0.6 * px, 0, 7); g.fill(); g.restore();
}
function reactorCore(p) {
  p.ellipseShadow(0, 0, 1, 0.2); p.cyl(0, 0, 0, 1.0, 0.12, N.steel); p.cyl(0, 0.12, 0, 0.8, 0.1, N.steel2); ring(p, 0, 0.23, 0, 0.78, N.cyan, 0.04, 48);
  p.cyl(0, 0.22, 0, 0.4, 0.3, '#121a30'); glow(p, N.cyan, 0.4, () => p.cyl(0, 0.52, 0, 0.26, 0.9, 'rgba(39,230,255,.85)')); p.cyl(0, 0.52, 0, 0.1, 0.9, '#e9fdff');
  for (let i = 0; i < 3; i++) ring(p, 0, 0.7 + i * 0.4, 0, 0.42 - (i % 2) * 0.06, i === 1 ? N.mag : N.cyan, 0.035, 36);
  glow(p, N.cyan, 0.5, () => p.ball(0, 1.78, 0, 0.17, N.cyan)); p.ball(0, 1.78, 0, 0.09, '#ffffff');
  for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.283 + 0.78, x = Math.cos(a) * 0.9, z = Math.sin(a) * 0.9; p.box(x - 0.06, 0.1, z - 0.06, 0.12, 0.5, 0.12, N.steel2, { edge: null }); glow(p, [N.gold, N.mag, N.lime, N.cyan][i], 0.14, () => p.ball(x, 0.66, z, 0.06, [N.gold, N.mag, N.lime, N.cyan][i])); }
}
function sidePylon(p, x, z, col, cube) {
  p.ellipseShadow(x, z, 0.3, 0.2); p.box(x - 0.28, 0, z - 0.28, 0.56, 0.12, 0.56, N.steel, { edge: null });
  if (cube) { p.box(x - 0.2, 0.3, z - 0.2, 0.4, 0.4, 0.4, '#1a1030', { top: '#3a1f5c', edge: col }); neon(p, [[x, 0.12, z], [x, 0.3, z]], col, 0.02, 0.08); }
  else { p.box(x - 0.1, 0.12, z - 0.1, 0.2, 0.9, 0.2, '#16223a', { edge: null }); neon(p, [[x, 0.2, z + 0.101], [x, 0.95, z + 0.101]], col, 0.04, 0.1); }
}
function centerSide(pen, c) {
  const col = Z[c.side].acc;
  [[-1.8, 3.6], [1.8, 3.6]].forEach(([u, v], i) => { const [x, z] = c.toWorld(u, v); c.add(x, z, (p) => sidePylon(p, x, z, col, i === 0)); });
}
function coreFx(p, t) { const r = 0.9 + Math.sin(t * 2) * 0.06; ring(p, 0, 0.24, 0, r, N.cyan, 0.02, 32); }

export default defineSkin({
  id: 'neon',
  packs: ['kenney-iso-buildings'],
  cityLabelBand: 0.18,
  palette: {
    // A rỉ cam · B lục tối (Back Alley) · C magenta · D tím (Nightlife) · E cyan · F xanh điện (Cyber Financial) · G vàng đậm · H vàng sáng (Megacorp)
    groups: { A: '#e8742a', B: '#2fb87a', C: '#ff3fb4', D: '#9b6bff', E: '#27e6ff', F: '#3d7bff', G: '#d9a521', H: '#ffe14d' },
    ground: '#0e1a2c', priceStrip: '#080b18', priceText: '#6fe9ff', labelText: '#eaf6ff', labelShadow: '#000000', rentText: '#0a0e1a', rentShadow: '#ffffff',
    boardSide: '#0b0f1c', boardSideDark: '#070a14', boardTop: '#121a2e', tileSide: '#222d4a', tileSideDark: '#141c32', water: '#0d1226', sand: '#1a2038', gold: N.cyan,
  },
  zones: Z,
  slots: {
    tile: { paint: tilePaint },
    deco: { draw: deco },
    house: {
      kind: 'kit',
      levels: [[[0, 0, ['128']]], [[0, 0, ['016'], '069']], [[0, 0, ['016', '047'], '082'], [1, 0, ['055']]], [[0, 0, ['016', '047', '047'], '083'], [1, 0, ['024', '051'], '090']], [[0, 0, ['016', '053', '053', '053']], [1, 0, ['000', '053', '053', '053']]]],
      wall: 'zone', bright: 0.9, sign: 'MEGACORP', under: houseUnder, over: houseOver,
    },
    resort: { paint: (g, c) => floor(g, c, '#0c1428', N.cyan, c.seed + 1), draw: chargePad },
    resortHouse: { draw: chargeHub },
    chance: { paint: (g, c) => floor(g, c, '#1b0f2e', N.mag), draw: dataCube },
    tax: { paint: (g, c) => floor(g, c, '#0f1c12', N.lime), draw: taxTerminal },
    start: { paint: cornerPaint('#0a1a10', '#16301c', N.lime), label: false, draw: named(powerGrid, 'START', N.lime) },
    island: { paint: cornerPaint('#1c0a10', '#321018', N.red), label: false, side: ['#3a1018', '#24090e'], draw: named(firewall, 'FIREWALL', N.red) },
    festival: { paint: cornerPaint('#150a24', '#2a1244', N.mag), label: false, draw: named(arcade, 'NEON ARCADE', N.mag) },
    tour: { paint: cornerPaint('#0c0a24', '#1c1448', N.violet), label: false, draw: named(warpGate, 'WARP GATE', N.violet) },
    base: { draw: (p, c) => { const a = c.half + c.margin - 0.1, y = c.y + 0.002; neon(p, [[-a, y, a], [a, y, a], [a, y, -a], [-a, y, -a], [-a, y, a]], N.cyan, 0.03, 0.12); } },
    center: { paint: reactorFloor, draw: centerSide, core: reactorCore },
  },
  ambient: { animate: { coreFx } },
  labels: { chance: 'DATA CUBE', tax: 'THUẾ DỮ LIỆU', resortLevels: ['Trạm sạc', 'Cụm pin', 'Trạm điện', 'Nhà máy năng lượng'] },
});

/* Skin "Lumina-01" — đô thị neon nửa đêm sau mưa. BẢN DUYỆT HƯỚNG (T24): thô nhưng thật, chỉ dùng tính năng khung xương hiện có.
   Phong cách: nền tối, khối Kenney tường tối + mái màu chủ, neon vẽ bằng bút (glow = shadowBlur trên pen.ctx, nướng sẵn vào sprite).
   Brief: public/maps/neon/BRIEF.md · hợp đồng: docs/contracts/map-skin.md · bút: public/js/render-common/board2d/PEN.md. */
import { defineSkin } from '../../js/render-common/board2d/skin.js';

const N = { cyan: '#27e6ff', mag: '#ff3fb4', lime: '#b6ff3c', gold: '#ffc83d', red: '#ff3b4e', violet: '#9b6bff', ink: '#070a14', steel: '#2a3350', steel2: '#39446a' };
const Z = [   // 4 cạnh: 0 Back Alley · 1 Nightlife · 2 Cyber Financial · 3 Megacorp HQ
  { id: 'alley', ground: '#0d1932', ground2: '#101d3a', ground3: '#13223f', wall: '#8a6a52', acc: '#ff8a3d', particles: 'none' },
  { id: 'night', ground: '#0d1932', ground2: '#101d3a', ground3: '#13223f', wall: '#8a5a9c', acc: N.mag, particles: 'none' },
  { id: 'fin', ground: '#0d1932', ground2: '#101d3a', ground3: '#13223f', wall: '#6f9ab8', acc: N.cyan, particles: 'none' },
  { id: 'hq', ground: '#0d1932', ground2: '#101d3a', ground3: '#13223f', wall: '#8c7a4a', acc: N.gold, particles: 'none' },
];
/* Màu chủ (gộp base + tint): mảng sáng màu chủ dưới nhà/resort + bảng hologram, tháp phụ, viền neon dọc, viền kính nhuốm màu chủ.
   Chế độ gộp giảm 5%: mọi độ sáng/alpha màu chủ nhân 0.95 (OWN) — màu qua mixHex(c.color, 0.95), alpha pad 0.38→0.361 và 0.72→0.684, viền kính 0.6→0.57, tấm hologram 0.28→0.266, nền bãi trống 0.45/0.7→0.4275/0.665, đế 0.45/0.8→0.4275/0.76. */
const OWN = 0.95;
const mixHex = (h, k) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
const zid = (c) => (c.zone ? c.zone : { acc: N.cyan, ground: NAVY });

/* ---------- glow: shadowBlur trên pen.ctx (nướng sẵn, không phải phát sáng thật) ---------- */
function glow(p, col, blur, fn) { const g = p.ctx; g.save(); g.shadowColor = col; g.shadowBlur = p.k * blur; fn(g); g.restore(); }
function neon(p, pts, col, w = 0.03, blur = 0.14) { glow(p, col, blur, () => p.line3(pts, col, w)); p.line3(pts, p.u.light(col, 0.6), w * 0.35); }
function neonLoop(p, x0, z0, x1, z1, y, col, w, blur) { neon(p, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [x0, y, z0]], col, w, blur); }
function neonText(p, s, x, y, z, h, col) { glow(p, col, 0.16, () => p.textD(s, x, y, z, h, col)); }
function ring(p, x, y, z, r, col, w = 0.03, n = 40) { neon(p, Array.from({ length: n + 1 }, (_, i) => [x + Math.cos((i / n) * 6.283) * r, y, z + Math.sin((i / n) * 6.283) * r]), col, w); }
function slab(p, x, z, w, d, h, col) { p.box(x - w / 2, 0, z - d / 2, w, h, d, col, { edge: 'rgba(120,160,255,.18)' }); }
function screen(p, x, y, z, w, h, col) { glow(p, col, 0.1, () => p.quadZ(z, x - w / 2, x + w / 2, y, y + h, col)); }

/* ---------- mặt phẳng: nền xanh navy đặc, phẳng (T12: bỏ lưới + mạch điện cho dịu mắt) ---------- */
const NAVY = '#0d1932';
function floor(g, c, col) { g.fillStyle = col; g.fillRect(0, 0, c.cw, c.ch); }
const tilePaint = (g, c) => { const z = zid(c); floor(g, c, z.ground); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 4; g.strokeRect(2, 2, c.cw - 4, c.ch - 4); };
const cornerPaint = (a, b, ring2) => (g, c) => {
  const gr = g.createRadialGradient(c.cw / 2, c.ch / 2, 10, c.cw / 2, c.ch / 2, c.cw * 0.72); gr.addColorStop(0, b); gr.addColorStop(1, a); g.fillStyle = gr; g.fillRect(0, 0, c.cw, c.ch);
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
  const z = c.gz, n = c.level, col = mixHex(c.color, OWN); ownerPad(p, z, c.color, 0.56, 0.6); p.ellipseShadow(0, z, 0.8, 0.2); p.cyl(0, 0, z, 0.72, 0.1, N.steel); ring(p, 0, 0.11, z, 0.62, col, 0.035);
  const P = [[-0.35, -0.2], [0.35, -0.2], [-0.35, 0.3], [0.35, 0.3]];
  for (let i = 0; i < n; i++) { const [dx, dz] = P[i], h = 0.45 + i * 0.12; p.cyl(dx, 0.1, z + dz, 0.12, h, '#16223a'); glow(p, col, 0.16, () => p.cyl(dx, 0.1 + h, z + dz, 0.12, 0.05, col)); neon(p, [[dx, 0.2, z + dz + 0.121], [dx, h, z + dz + 0.121]], col, 0.03, 0.08); }
  if (n === 4) neon(p, [[-0.35, 1.05, z - 0.2], [0.35, 1.05, z - 0.2], [0.35, 1.05, z + 0.3], [-0.35, 1.05, z + 0.3], [-0.35, 1.05, z - 0.2]], col, 0.02);
}

/* ---------- nhà: cyberpunk anime, vẽ bằng bút (tháp kính mảnh + biển hologram; chủ sản phẩm chọn 02/11) ---------- */
/*  Chỉ dựng chung, KHÔNG chữ/logo/nhãn hiệu có thật: biển chỉ là khối glyph giả katakana vẽ bằng hình chữ nhật. */
const hexA = (h, a) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;
const Q = (p, f, k, a0, a1, y0, y1, col) => (f === 'x' ? p.quadX(k, a0, a1, y0, y1, col) : p.quadZ(k, a0, a1, y0, y1, col));
function wins(p, f, k, a0, a1, y0, y1, r, o = {}) {   // lưới cửa sổ sáng trên một mặt (f='x' dọc z, f='z' dọc x)
  const cw = o.cw || 0.12, ch = o.ch || 0.15, lit = o.lit ?? 0.55, cols = o.cols || WINB;
  const n = Math.max(1, Math.floor((a1 - a0) / cw)), m = Math.max(1, Math.floor((y1 - y0) / ch)), sa = (a1 - a0) / n, sy = (y1 - y0) / m, mx = o.mx ?? 0.18, my = o.my ?? 0.2;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const on = r() < lit, col = cols[Math.floor(r() * cols.length)]; Q(p, f, k, a0 + i * sa + sa * mx, a0 + (i + 1) * sa - sa * mx, y0 + j * sy + sy * my, y0 + (j + 1) * sy - sy * my, on ? col : (o.off || 'rgba(4,7,18,.78)')); }
}
function block(p, x, y, z, w, h, d, col, r, o = {}) {   // hộp + cửa sổ trên mặt +x và +z
  p.box(x, y, z, w, h, d, col, { edge: o.edge ?? 'rgba(150,180,255,.22)', top: o.top });
  if (o.win === false) return;
  const wo = { cw: o.cw, ch: o.ch, lit: o.lit, cols: o.cols, off: o.off, mx: o.mx, my: o.my };
  wins(p, 'x', x + w + 0.002, z + 0.05, z + d - 0.05, y + (o.y0 ?? 0.07), y + h - 0.05, r, wo);
  wins(p, 'z', z + d + 0.002, x + 0.05, x + w - 0.05, y + (o.y0 ?? 0.07), y + h - 0.05, r, wo);
}
function antenna(p, x, y, z, h, col = N.red) { p.box(x - 0.012, y, z - 0.012, 0.024, h, 0.024, '#9aa6c8', { edge: null }); p.box(x - 0.07, y + h * 0.55, z - 0.01, 0.14, 0.014, 0.02, '#9aa6c8', { edge: null }); glow(p, col, 0.2, () => p.ball(x, y + h + 0.02, z, 0.03, col)); }
function dish(p, x, y, z) { p.cyl(x, y, z, 0.018, 0.1, N.steel2); p.rbox(x, y + 0.1, z, 0.2, 0.035, 0.2, '#c9d2ea', 0.7, 0.8); }
function vent(p, x, y, z, w = 0.16, d = 0.12) { p.box(x, y, z, w, 0.09, d, '#1f263c', { edge: null }); for (let i = 0; i < 3; i++) Q(p, 'z', z + d + 0.002, x + 0.02 + i * (w / 3), x + 0.02 + i * (w / 3) + w / 6, y + 0.03, y + 0.07, '#0a0e1c'); }
function ownerPad(p, z, col, r0 = 0.62, bl = 1) {   // mảng sáng đặc màu chủ trải ra ô quanh chân nhà (nhìn rõ từ xa); bl<1 thu quầng glow cho resort để không lem sang nhãn giá
  glow(p, col, 0.5 * bl, () => p.flatEllipse(0, 0.003, z, r0 + 0.3, r0 + 0.3, hexA(col, 0.38 * OWN)));
  glow(p, col, 0.3 * bl, () => p.flatEllipse(0, 0.004, z, r0 + 0.1, r0 + 0.1, hexA(col, 0.72 * OWN)));
  ring(p, 0, 0.012, z, r0 + 0.2, col, 0.04, 36);
}
function ownerBand(p, x0, z0, x1, z1, y, col) { neonLoop(p, x0, z0, x1, z1, y, col, 0.026, 0.14); }
function lot(p, c, extra) {   // cấp 0: bãi đất trống, cờ neon màu chủ
  const gz = c.gz, col = mixHex(c.color, OWN);
  p.box(-0.5, 0, gz - 0.5, 1, 0.04, 1, mixHex(col, 0.45 * OWN), { top: mixHex(col, 0.7 * OWN), edge: 'rgba(150,180,255,.2)' });
  for (let i = 0; i < 5; i++) Q(p, 'z', gz + 0.502, -0.46 + i * 0.2, -0.46 + i * 0.2 + 0.09, 0.005, 0.035, i % 2 ? '#0b0f1c' : N.gold);
  neon(p, [[0.38, 0.04, gz - 0.38], [0.38, 0.72, gz - 0.38]], '#aab4d6', 0.02, 0.03);
  p.flag(0.38, gz - 0.38, 0.72, col); neonLoop(p, -0.5, gz - 0.5, 0.5, gz + 0.5, 0.045, col, 0.02, 0.1);
  extra(p, gz);
}

const WINB = ['#27e6ff', '#bff6ff', '#ffe14d', '#ff3fb4', '#7fd8ff'];
function spire(p, x, z, w, d, h, r, col, steps = 0) {
  const ec = col, eb = hexA(col, 0.6 * OWN);   // tháp kính, cửa sổ dày, viền neon dọc
  block(p, x, 0, z, w, h, d, '#0f2a44', r, { cw: 0.07, ch: 0.1, lit: 0.72, cols: WINB, mx: 0.12, my: 0.18, y0: 0.08, edge: eb });
  neon(p, [[x + w, 0.02, z + d], [x + w, h, z + d]], ec, 0.02, 0.1);
  neon(p, [[x, 0.02, z + d], [x, h, z + d]], ec, 0.02, 0.1); neon(p, [[x + w, 0.02, z], [x + w, h, z]], ec, 0.02, 0.1);
  let y = h, cx = x + w / 2, cz = z + d / 2, ww = w, dd = d;
  for (let i = 0; i < steps; i++) { ww *= 0.72; dd *= 0.72; const hh = 0.28 + (steps - i) * 0.05; block(p, cx - ww / 2, y, cz - dd / 2, ww, hh, dd, '#0f2a44', r, { cw: 0.06, ch: 0.09, lit: 0.8, cols: WINB, y0: 0.04, edge: eb }); y += hh; }
  ownerBand(p, cx - ww / 2, cz - dd / 2, cx + ww / 2, cz + dd / 2, y + 0.012, col);
  return { y, cx, cz };
}
function holo(p, x0, x1, y0, y1, z, col, r) {   // biển hologram nổi: tấm trong suốt + glyph
  glow(p, col, 0.22, () => p.quadZ(z, x0, x1, y0, y1, hexA(col, 0.28 * OWN)));
  glow(p, col, 0.12, () => { for (let y = y0 + 0.05; y < y1 - 0.07; y += 0.09) { const t = r(); if (t < 0.55) p.quadZ(z + 0.002, x0 + 0.04, x0 + 0.04 + (x1 - x0 - 0.08) * (0.4 + r() * 0.6), y, y + 0.025, col); else { p.quadZ(z + 0.002, x0 + 0.05, x0 + 0.07, y, y + 0.06, col); p.quadZ(z + 0.002, x1 - 0.07, x1 - 0.05, y, y + 0.06, col); } } p.line3([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [x0, y0, z]], col, 0.014); });
}
function houseB(p, c) {
  const lv = c.level, gz = c.gz, col = mixHex(c.color, OWN), r = p.u.rng(c.seed + 57), A = col, M = col;
  if (!lv) return lot(p, c, (pp, z) => { glow(pp, N.cyan, 0.2, () => pp.flatEllipse(-0.1, 0.045, z, 0.3, 0.3, 'rgba(39,230,255,.2)')); ring(pp, -0.1, 0.05, z, 0.26, N.cyan, 0.02, 24); neon(pp, [[-0.1, 0.05, z], [-0.1, 0.5, z]], N.cyan, 0.016, 0.1); neon(pp, [[-0.3, 0.05, z - 0.3], [-0.3, 0.3, z - 0.3]], N.mag, 0.016, 0.08); });
  p.shadow(-0.5, gz - 0.5, 1, 1, 0.6, 0.35);
  p.box(-0.5, 0, gz - 0.5, 1, 0.05, 1, mixHex(col, 0.45 * OWN), { top: mixHex(col, 0.8 * OWN), edge: 'rgba(150,180,255,.2)' });   // đế podium chung
  let top;
  if (lv === 1) { top = spire(p, -0.2, gz - 0.2, 0.42, 0.42, 0.95, r, col); block(p, -0.46, 0.05, gz - 0.12, 0.26, 0.3, 0.4, '#2c3552', r, { lit: 0.4 }); vent(p, -0.44, 0.35, gz - 0.05, 0.14, 0.1); holo(p, -0.18, 0.2, 0.2, 0.72, gz + 0.3, col, r); antenna(p, top.cx, 0.95 + 0.0, top.cz, 0.35, N.red); }
  else if (lv === 2) { top = spire(p, -0.05, gz - 0.28, 0.4, 0.4, 1.5, r, col, 1); spire(p, -0.46, gz + 0.02, 0.3, 0.3, 0.85, r, A); holo(p, -0.4, 0.0, 0.3, 1.0, gz + 0.36, col, r); antenna(p, top.cx, top.y, top.cz, 0.4, N.red); dish(p, -0.31, 0.85, gz + 0.17); }
  else if (lv === 3) { top = spire(p, -0.02, gz - 0.3, 0.42, 0.42, 1.9, r, col, 2); spire(p, -0.48, gz - 0.02, 0.3, 0.3, 1.2, r, M); spire(p, 0.18, gz + 0.14, 0.3, 0.3, 0.9, r, A); p.line3([[-0.18, 1.0, gz + 0.13], [-0.02, 1.0, gz - 0.09]], '#8fa0d0', 0.04); holo(p, -0.48, -0.1, 0.35, 1.2, gz + 0.36, M, r); holo(p, 0.0, 0.36, 0.2, 0.8, gz + 0.5, A, r); antenna(p, top.cx, top.y, top.cz, 0.5, N.red); dish(p, 0.33, 0.9, gz + 0.29); }
  else {
    top = spire(p, -0.14, gz - 0.14, 0.48, 0.48, 2.0, r, col, 3);
    spire(p, -0.5, gz - 0.02, 0.28, 0.28, 1.5, r, M); spire(p, 0.22, gz + 0.1, 0.28, 0.28, 1.1, r, A);
    p.line3([[-0.22, 1.1, gz + 0.12], [-0.14, 1.1, gz + 0.1]], '#8fa0d0', 0.04); p.line3([[0.34, 0.9, gz + 0.2], [0.34, 0.9, gz + 0.1]], '#8fa0d0', 0.04);
    holo(p, -0.5, -0.2, 0.4, 1.4, gz + 0.32, M, r); holo(p, 0.18, 0.5, 0.2, 0.9, gz + 0.6, A, r); holo(p, -0.1, 0.34, 0.5, 1.6, gz + 0.5, col, r);
    ring(p, top.cx, top.y + 0.1, top.cz, 0.3, col, 0.026, 28); ring(p, top.cx, top.y + 0.28, top.cz, 0.2, N.gold, 0.02, 24);
    neon(p, [[top.cx, top.y, top.cz], [top.cx, top.y + 0.55, top.cz]], N.gold, 0.02, 0.14); glow(p, N.gold, 0.3, () => p.ball(top.cx, top.y + 0.58, top.cz, 0.05, N.gold)); antenna(p, -0.36, 1.5, gz + 0.12, 0.3, N.red);
  }
  ownerBand(p, -0.5, gz - 0.5, 0.5, gz + 0.5, 0.062, col);
}

const houseDraw = (p, c) => {   // bệ neon màu chủ + tháp kính
  const col = mixHex(c.color, OWN); ownerPad(p, c.gz, c.color); neonLoop(p, -0.72, c.gz - 0.72, 0.72, c.gz + 0.72, 0.006, col, 0.025, 0.12);
  if (c.level) for (const [x, zz] of [[-0.72, -0.72], [0.72, -0.72], [-0.72, 0.72], [0.72, 0.72]]) glow(p, col, 0.1, () => p.ball(x, 0.02, c.gz + zz, 0.035, col));
  houseB(p, c);
};
const deco = (p, c) => {   // ô trống: cột đèn, thùng máy, hơi nước — vài nét thôi
  const z = zid(c), r = p.u.rng(c.seed + 9), x = (r() < 0.5 ? -1 : 1) * 0.55;
  p.ellipseShadow(x, -0.9, 0.2, 0.2); p.box(x - 0.015, 0, -1.0, 0.03, 0.7, 0.03, N.steel2, { edge: null }); neon(p, [[x, 0.7, -1.0], [x + 0.18, 0.7, -1.0]], z.acc, 0.03, 0.1);
  if (r() < 0.5) { p.box(-x - 0.12, 0, -0.85, 0.24, 0.22, 0.2, '#161d33', { edge: null }); neon(p, [[-x - 0.1, 0.15, -0.649], [-x + 0.1, 0.15, -0.649]], z.acc, 0.02, 0.06); }
};

/* ---------- giữa bàn (T26): tháp dữ liệu + đường vành đai trên cao + cụm cao ốc, theo ảnh tham khảo của chủ sản phẩm ---------- */
/*  Bố cục (toạ độ thế giới, camera ở phía +x+z): tháp lùi về sau (TX, TZ) để chừa chỗ xúc xắc phía trước;
    xúc xắc khung xương rơi quanh (1.3, 1.3) → bệ hologram tròn vẽ phẳng trong paint. Cao ốc bậc thang thấp dần ra mép;
    chiều cao bị kẹp bởi hMax() để không che dải giá/nhãn của ô phía xa (−x, −z). Không chữ, không logo. */
const TX = -1.2, TZ = -1.2, RH = 1.9, RR = 0.6, RW = 0.34, RY = 0.5;   // tâm tháp, nửa cạnh / bán kính góc / bề rộng / độ cao đường vành đai
const PADX = 1.3, PADZ = 1.3, PADR = 0.95;                                // bệ xúc xắc
const hMax = (x0, z0) => Math.max(0.3, ((2 * Math.min(x0, z0) + 11.9) * 0.354 - 0.3) / 0.866);   // đỉnh nhà phải thấp hơn mép trong ô phía xa trên màn hình
const ROAD = (() => {   // đường tâm vành đai: hình vuông bo góc, chia đoạn ngắn để xếp chiều sâu đúng
  const pts = [], a = RH - RR, C = [[a, a, 0], [-a, a, 1], [-a, -a, 2], [a, -a, 3]];
  C.forEach(([cx, cz, k]) => {
    for (let i = 0; i <= 5; i++) { const t = (k + i / 5) * (Math.PI / 2); pts.push([TX + cx + Math.cos(t) * RR, TZ + cz + Math.sin(t) * RR]); }
    const [nx, nz] = C[(k + 1) % 4], t1 = (k + 1) * (Math.PI / 2), s = [TX + cx + Math.cos(t1) * RR, TZ + cz + Math.sin(t1) * RR], e = [TX + nx + Math.cos(t1) * RR, TZ + nz + Math.sin(t1) * RR];
    for (let i = 1; i < 4; i++) pts.push([s[0] + (e[0] - s[0]) * (i / 4), s[1] + (e[1] - s[1]) * (i / 4)]);
  });
  const n = pts.length, N2 = pts.map((q, i) => { const a0 = pts[(i + n - 1) % n], a1 = pts[(i + 1) % n]; let nx = a1[1] - a0[1], nz = -(a1[0] - a0[0]); const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l; if (nx * (q[0] - TX) + nz * (q[1] - TZ) < 0) { nx = -nx; nz = -nz; } return [nx, nz]; });
  let L = 0; const acc = pts.map((q, i) => { const r = L; const b = pts[(i + 1) % n]; L += Math.hypot(b[0] - q[0], b[1] - q[1]); return r; });
  return { pts, nrm: N2, acc, len: L };
})();
function arc(p, x, y, z, r, a0, a1, col, w = 0.03, n = 20) { neon(p, Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [x + Math.cos(a) * r, y, z + Math.sin(a) * r]; }), col, w); }
const BACK = [0.75 * Math.PI, 1.75 * Math.PI], FRONT = [-0.25 * Math.PI, 0.75 * Math.PI];   // nửa sau / nửa trước so với camera

function cityFloor(g, c) {   // mặt phẳng: quảng trường tối hơn chút dưới cụm nhà, bóng đường vành đai, bệ xúc xắc hologram; ngoài ra để navy trơn
  const { T, px } = c; g.save();
  const rr = (x0, z0, x1, z1, r) => { g.beginPath(); const P = []; for (let k = 0; k < 4; k++) { const cx = k === 0 || k === 3 ? x1 - r : x0 + r, cz = k < 2 ? z1 - r : z0 + r; for (let i = 0; i <= 6; i++) { const t = (k + i / 6) * (Math.PI / 2); P.push(T(cx + Math.cos(t) * r, cz + Math.sin(t) * r)); } } P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  rr(-5.3, -5.3, 0.9, 0.9, 1.4); g.fillStyle = 'rgba(18,32,64,.6)'; g.fill(); g.strokeStyle = 'rgba(39,230,255,.22)'; g.lineWidth = 0.03 * px; g.stroke();
  rr(TX - RH - 0.1, TZ - RH - 0.1, TX + RH + 0.25, TZ + RH + 0.25, RR + 0.1); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.38 * px; g.stroke();
  [[0.9, -0.2, 5.0, -0.2], [-0.2, 0.9, -0.2, 5.0]].forEach(([a, b, x1, z1], i) => { g.strokeStyle = i ? N.mag : N.cyan; g.globalAlpha = 0.3; g.lineWidth = 0.025 * px; g.beginPath(); g.moveTo(...T(a, b)); g.lineTo(...T(x1, z1)); g.stroke(); });
  g.globalAlpha = 1; const [cx, cy] = T(PADX, PADZ), R = PADR * px;
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.15); gr.addColorStop(0, 'rgba(39,230,255,.22)'); gr.addColorStop(0.8, 'rgba(39,230,255,.08)'); gr.addColorStop(1, 'rgba(39,230,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R * 1.15, 0, 7); g.fill();
  g.shadowColor = N.cyan; g.shadowBlur = 8; g.strokeStyle = N.cyan; g.lineWidth = 0.045 * px; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
  g.strokeStyle = N.mag; g.lineWidth = 0.02 * px; g.setLineDash([0.12 * px, 0.08 * px]); g.beginPath(); g.arc(cx, cy, R * 0.8, 0, 7); g.stroke(); g.setLineDash([]);
  g.shadowBlur = 0; g.strokeStyle = 'rgba(191,246,255,.7)'; g.lineWidth = 0.015 * px; for (let i = 0; i < 48; i++) { const a = (i / 48) * 6.283, l = i % 4 ? 0.06 : 0.14; g.beginPath(); g.moveTo(cx + Math.cos(a) * (R + 0.04 * px), cy + Math.sin(a) * (R + 0.04 * px)); g.lineTo(cx + Math.cos(a) * (R + l * px), cy + Math.sin(a) * (R + l * px)); g.stroke(); }
  g.restore();
}
function tower(p) {   // tháp dữ liệu: đế 3 bậc vòng neon, cột sáng dọc, 3 vòng hologram nổi (nửa sau vẽ trước cột, nửa trước vẽ sau)
  const X = TX, Z = TZ, H = [[1.5, 0.92, N.cyan], [1.95, 1.08, N.mag], [2.4, 0.8, N.cyan]];
  p.ellipseShadow(X, Z, 1.25, 0.3);
  p.cyl(X, 0, Z, 1.05, 0.22, N.steel); ring(p, X, 0.23, Z, 1.03, N.cyan, 0.035, 48);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283 + 0.39, x = X + Math.cos(a) * 0.93, z = Z + Math.sin(a) * 0.93; p.box(x - 0.05, 0.22, z - 0.05, 0.1, 0.18, 0.1, N.steel2, { edge: null }); glow(p, N.gold, 0.1, () => p.ball(x, 0.43, z, 0.03, N.gold)); }
  p.cyl(X, 0.22, Z, 0.8, 0.3, N.steel2); ring(p, X, 0.53, Z, 0.78, N.mag, 0.03, 44);
  p.cyl(X, 0.52, Z, 0.56, 0.38, '#121a30'); ring(p, X, 0.91, Z, 0.55, N.cyan, 0.03, 40);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; if (Math.cos(a) + Math.sin(a) < -0.2) continue; const x = X + Math.cos(a) * 0.565, z = Z + Math.sin(a) * 0.565; neon(p, [[x, 0.6, z], [x, 0.82, z]], i % 2 ? N.cyan : '#7fd8ff', 0.012, 0.05); }
  H.forEach(([y, r, col]) => { p.flatEllipse(X, y, Z, r, r, hexA(col, 0.07)); arc(p, X, y, Z, r, BACK[0], BACK[1], col, 0.022, 18); });
  glow(p, N.cyan, 0.5, () => p.line3([[X, 0.9, Z], [X, 3.15, Z]], 'rgba(39,230,255,.55)', 0.46)); glow(p, N.cyan, 0.25, () => p.line3([[X, 0.9, Z], [X, 3.15, Z]], '#7ff2ff', 0.24)); p.line3([[X, 0.9, Z], [X, 3.15, Z]], '#f2feff', 0.1);
  p.cyl(X, 2.1, Z, 0.36, 0.1, '#121a30'); ring(p, X, 2.21, Z, 0.36, N.gold, 0.025, 32);
  p.cyl(X, 3.12, Z, 0.32, 0.08, N.steel); ring(p, X, 3.2, Z, 0.32, N.cyan, 0.03, 32);
  glow(p, N.cyan, 0.5, () => p.ball(X, 3.32, Z, 0.14, N.cyan)); p.ball(X, 3.33, Z, 0.07, '#ffffff');
  H.forEach(([y, r, col]) => { arc(p, X, y, Z, r, FRONT[0], FRONT[1], col, 0.026, 18); for (let i = 0; i < 6; i++) { const a = FRONT[0] + (i + 0.5) * ((FRONT[1] - FRONT[0]) / 6); glow(p, col, 0.08, () => p.ball(X + Math.cos(a) * r, y, Z + Math.sin(a) * r, 0.022, '#ffffff')); } });
}
function roadPiece(p, i) {   // một đoạn đường vành đai: trụ, mặt cầu, viền neon, đèn xe nướng sẵn
  const { pts, nrm } = ROAD, n = pts.length, j = (i + 1) % n, [ax, az] = pts[i], [bx, bz] = pts[j], [anx, anz] = nrm[i], [bnx, bnz] = nrm[j], h = RW / 2;
  const o = (x, z, nx, nz, s, y) => [x + nx * h * s, y, z + nz * h * s];
  if (i % 4 === 0) { p.box(ax - 0.05, 0, az - 0.05, 0.1, RY - 0.06, 0.1, N.steel2, { edge: null }); }
  p.poly([o(ax, az, anx, anz, 1, RY - 0.08), o(bx, bz, bnx, bnz, 1, RY - 0.08), o(bx, bz, bnx, bnz, 1, RY), o(ax, az, anx, anz, 1, RY)], '#0e1528');
  p.poly([o(ax, az, anx, anz, -1, RY - 0.08), o(bx, bz, bnx, bnz, -1, RY - 0.08), o(bx, bz, bnx, bnz, -1, RY), o(ax, az, anx, anz, -1, RY)], '#121a30');
  p.poly([o(ax, az, anx, anz, 1, RY), o(bx, bz, bnx, bnz, 1, RY), o(bx, bz, bnx, bnz, -1, RY), o(ax, az, anx, anz, -1, RY)], '#1b2544');
  neon(p, [o(ax, az, anx, anz, 1, RY + 0.005), o(bx, bz, bnx, bnz, 1, RY + 0.005)], N.cyan, 0.018, 0.08);
  p.line3([o(ax, az, anx, anz, -1, RY + 0.005), o(bx, bz, bnx, bnz, -1, RY + 0.005)], N.mag, 0.012);
  if (i % 2) p.line3([[ax, RY + 0.004, az], [(ax + bx) / 2, RY + 0.004, (az + bz) / 2]], 'rgba(255,225,77,.45)', 0.01);
  if (i % 5 === 2) { const m = [(ax + bx) / 2, (az + bz) / 2]; glow(p, '#fff6c8', 0.08, () => p.ball(m[0] + anx * 0.07, RY + 0.03, m[1] + anz * 0.07, 0.026, '#fff6c8')); glow(p, N.red, 0.08, () => p.ball(m[0] - anx * 0.07 + (bx - ax) * 0.3, RY + 0.03, m[1] - anz * 0.07 + (bz - az) * 0.3, 0.022, N.red)); }
}
function koi(p, x0, x1, y0, y1, z) {   // biển quảng cáo cá chép neon (motif chung, không thương hiệu)
  p.quadZ(z, x0, x1, y0, y1, '#0a0d1a'); neon(p, [[x0, y0, z + 0.003], [x1, y0, z + 0.003], [x1, y1, z + 0.003], [x0, y1, z + 0.003], [x0, y0, z + 0.003]], N.mag, 0.014, 0.08);
  const fish = (cx, cy, s, rot, col) => { const P = (u, v) => [cx + (u * Math.cos(rot) - v * Math.sin(rot)) * s, cy + (u * Math.sin(rot) + v * Math.cos(rot)) * s, z + 0.006];
    const body = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * 6.283; return P(Math.cos(a) * 1, Math.sin(a) * 0.38 * (1 - 0.35 * Math.max(0, -Math.cos(a)))); });
    glow(p, col, 0.12, () => { p.poly(body, col); p.poly([P(-0.85, 0), P(-1.5, 0.45), P(-1.3, 0), P(-1.5, -0.45)], col); p.poly([P(0.1, 0.3), P(-0.25, 0.65), P(-0.35, 0.3)], col); });
    p.poly([P(0.35, 0.05), P(0.1, 0.2), P(-0.2, 0.1), P(0.05, -0.08)], '#ffffff'); p.ball(...P(0.7, 0.08), 0.012, '#0a0d1a'); };
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, s = (x1 - x0) * 0.22;
  fish(cx - s * 0.5, cy + (y1 - y0) * 0.18, s, -0.5, '#ff8a3d'); fish(cx + s * 0.6, cy - (y1 - y0) * 0.18, s * 0.85, 2.6, '#ff3fb4');
}
function vsign(p, x, y, z, h, col, r) {   // biển neon dọc trên mặt +z: thanh tối + glyph giả
  p.box(x - 0.045, y, z, 0.09, h, 0.03, '#0a0d1a', { edge: null });
  glow(p, col, 0.1, () => { for (let yy = y + 0.04; yy < y + h - 0.06; yy += 0.085) { const t = r(); if (t < 0.5) p.quadZ(z + 0.032, x - 0.03, x + 0.03, yy, yy + 0.02, col); else { p.quadZ(z + 0.032, x - 0.03, x - 0.01, yy, yy + 0.05, col); p.quadZ(z + 0.032, x + 0.01, x + 0.03, yy, yy + 0.05, col); } } });
  neon(p, [[x - 0.045, y, z + 0.031], [x - 0.045, y + h, z + 0.031]], col, 0.008, 0.05);
}
function tall(p, b) {   // cao ốc tối, cửa sổ sáng, viền neon góc trước; tuỳ chọn biển dọc / hologram / cá chép / antenna
  const { x, z, w, d, acc } = b, r = p.u.rng(b.seed), h = Math.min(b.h, hMax(x, z)), x0 = x - w / 2, z0 = z - d / 2;
  p.shadow(x0, z0, w, d, h, 0.3);
  block(p, x0, 0, z0, w, h, d, '#0c1530', r, { cw: 0.075, ch: 0.1, lit: 0.48, cols: WINB, mx: 0.16, my: 0.22, edge: 'rgba(120,160,255,.18)' });
  neon(p, [[x0 + w, 0.02, z0 + d], [x0 + w, h, z0 + d]], acc, 0.014, 0.08);
  neonLoop(p, x0, z0, x0 + w, z0 + d, h + 0.005, acc, 0.012, 0.06);
  if (h > 0.9 && w > 0.3) { p.box(x0 + w * 0.2, h, z0 + d * 0.2, w * 0.6, 0.12, d * 0.6, '#101a34', { edge: 'rgba(120,160,255,.2)' }); }
  if (b.sign && h > 0.6) vsign(p, x0 + w * 0.78, h * 0.3, z0 + d, h * 0.55, b.sign, r);
  if (b.holo && h > 0.6) holo(p, x0 + 0.03, x0 + w - 0.03, h * 0.42, h * 0.82, z0 + d + 0.06, b.holo, r);
  if (b.koi) koi(p, x0 + 0.02, x0 + w - 0.02, h * 0.35, h * 0.85, z0 + d + 0.035);
  if (b.ant && h > 1) antenna(p, x, h + 0.12, z, 0.3, N.red);
}
const CITY = (() => {   // danh sách cao ốc [x, z, w, d, h, acc, tuỳ chọn]
  const A = [N.cyan, N.mag, N.lime, N.gold, N.violet], L = [], T = (dx, dz) => [TX + dx, TZ + dz];
  const put = ([x, z], w, d, h, i, o = {}) => L.push({ x, z, w, d, h, acc: A[i % A.length], seed: 300 + L.length * 17, ...o });
  // trong vành đai, quanh chân tháp: sau cao, trước thấp
  put(T(-1.45, -1.45), 0.46, 0.46, 2.1, 0, { ant: 1 }); put(T(-1.5, -0.45), 0.42, 0.5, 1.75, 1, { sign: N.mag }); put(T(-0.45, -1.5), 0.5, 0.42, 1.85, 4, { sign: N.cyan, ant: 1 });
  put(T(-1.5, 0.6), 0.42, 0.44, 1.35, 3, { holo: N.cyan }); put(T(0.6, -1.5), 0.44, 0.42, 1.45, 2, { sign: N.gold });
  put(T(1.5, -0.55), 0.42, 0.44, 1.05, 1, { holo: N.mag }); put(T(-0.55, 1.5), 0.48, 0.4, 1.0, 0, { koi: 1 });
  put(T(1.45, 0.5), 0.4, 0.4, 0.75, 4, { sign: N.lime }); put(T(0.5, 1.45), 0.4, 0.4, 0.7, 3); put(T(1.3, 1.3), 0.34, 0.34, 0.5, 2);
  // ngoài vành đai, phía sau-trái / sau-phải: bậc thang thấp dần ra mép (hMax kẹp thêm)
  [[-4.0, -3.3, 1.5], [-4.1, -2.1, 1.7, { holo: N.mag }], [-4.0, -0.9, 1.8, { sign: N.cyan, ant: 1 }], [-3.95, 0.35, 1.4, { sign: N.mag }], [-4.15, 1.5, 0.95], [-3.4, 2.5, 0.7],
    [-4.95, -2.6, 0.7], [-5.0, -1.3, 0.75], [-5.0, 0.0, 0.7], [-4.9, 1.2, 0.55], [-4.6, 2.5, 0.45]].forEach(([x, z, h, o], i) => { put([x, z], 0.52, 0.5, h, i + 1, o); put([z, x], 0.5, 0.52, h * 0.97, i + 3, o && { sign: o.sign, holo: o.holo }); });
  put([-4.15, -4.15], 0.6, 0.6, 1.3, 1, { ant: 1 }); put([-4.95, -4.0], 0.5, 0.5, 0.6, 0); put([-4.0, -4.95], 0.5, 0.5, 0.6, 2); put([-5.0, -5.0], 0.5, 0.5, 0.4, 4);
  return L;
})();
function cubeStack(p, x, z) {   // chồng Data Cube trong suốt (thẻ Cơ hội)
  p.ellipseShadow(x, z, 0.6, 0.2); p.cyl(x, 0, z, 0.62, 0.1, N.steel); ring(p, x, 0.11, z, 0.55, N.mag, 0.03, 36);
  glow(p, N.mag, 0.25, () => p.flatEllipse(x, 0.115, z, 0.48, 0.48, 'rgba(255,63,180,.18)'));
  const C = [[-0.18, -0.12, 0.11, N.mag], [0.16, 0.1, 0.11, N.cyan], [-0.02, -0.02, 0.5, N.mag], [0.05, 0.02, 0.87, N.violet]], s = 0.34;
  C.forEach(([dx, dz, y, col]) => { const x0 = x + dx - s / 2, z0 = z + dz - s / 2; glow(p, col, 0.18, () => p.box(x0, y, z0, s, s, s, '#3a1f5c', { top: hexA(col, 0.55), left: hexA(col, 0.3), right: hexA(col, 0.42), edge: col })); neonLoop(p, x0, z0, x0 + s, z0 + s, y + s, '#ffffff', 0.006, 0.04); });
  glow(p, N.mag, 0.2, () => { const [sx, sy] = p.p(x + 0.05, 1.04, z + 0.2), g = p.ctx; g.fillStyle = '#fff'; g.font = `900 ${p.k * 0.2}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', sx, sy); });
}
function worldPanel(p, x, z) {   // bảng hologram bản đồ thế giới giản lược (chấm theo vài elip, không theo bản đồ có bản quyền)
  const z0 = z - 0.75, z1 = z + 0.75, y0 = 0.55, y1 = 1.4;
  p.box(x - 0.08, 0, z - 0.08, 0.16, 0.1, 0.16, N.steel, { edge: null }); p.box(x - 0.02, 0.1, z - 0.02, 0.04, 0.45, 0.04, N.steel2, { edge: null });
  glow(p, N.cyan, 0.25, () => p.quadX(x, z0, z1, y0, y1, 'rgba(39,230,255,.16)'));
  const E = [[0.22, 0.62, 0.16, 0.14], [0.32, 0.32, 0.06, 0.16], [0.52, 0.66, 0.08, 0.1], [0.56, 0.4, 0.08, 0.17], [0.74, 0.62, 0.17, 0.13], [0.84, 0.3, 0.07, 0.06]];
  glow(p, N.cyan, 0.06, () => { for (let i = 0; i < 26; i++) for (let j = 0; j < 14; j++) { const u = (i + 0.5) / 26, v = (j + 0.5) / 14; if (!E.some(([a, b, ra, rb]) => ((u - a) / ra) ** 2 + ((v - b) / rb) ** 2 < 1)) continue; const zz = z0 + u * (z1 - z0), yy = y0 + v * (y1 - y0); p.quadX(x + 0.003, zz - 0.018, zz + 0.018, yy - 0.018, yy + 0.018, '#bff6ff'); } });
  neon(p, [[x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0], [x, y0, z0]], N.cyan, 0.014, 0.08);
}
function centerCity(pen, c) {   // vẽ một lần (cạnh 0), mọi vật vào danh sách chiều sâu chung
  if (c.side !== 0) return;
  c.add(TX, TZ, tower);
  ROAD.pts.forEach((q, i) => { const b = ROAD.pts[(i + 1) % ROAD.pts.length]; c.add((q[0] + b[0]) / 2, (q[1] + b[1]) / 2, (p) => roadPiece(p, i), 0.05); });
  CITY.forEach((b) => c.add(b.x, b.z, (p) => tall(p, b)));
  c.add(-1.3, 2.9, (p) => cubeStack(p, -1.3, 2.9)); c.add(2.9, -1.3, (p) => worldPanel(p, 2.9, -1.3));
}
function cityFx(p, t) {   // chuyển động rẻ: 5 xe chạy trên nửa trước vành đai + chấm sáng quay trên vòng hologram giữa
  const { pts, acc, len } = ROAD, n = pts.length;
  for (let k = 0; k < 5; k++) {
    const s = ((t * 0.35 + (k * len) / 5) % len + len) % len; let i = 0; while (i < n - 1 && acc[i + 1] <= s) i++;
    const a = pts[i], b = pts[(i + 1) % n], f = (s - acc[i]) / (Math.hypot(b[0] - a[0], b[1] - a[1]) || 1), x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f;
    if (x - TX + (z - TZ) < 0.6) continue; p.ball(x, RY + 0.03, z, 0.03, k % 2 ? '#fff6c8' : N.red);
  }
  const a = (t * 0.8) % 6.283; if (Math.cos(a) + Math.sin(a) > 0.3) p.ball(TX + Math.cos(a) * 1.08, 1.95, TZ + Math.sin(a) * 1.08, 0.035, '#ffffff');
}

export default defineSkin({
  id: 'neon',
  packs: ['kenney-iso-buildings'],
  cityLabelBand: 0.18,
  palette: {
    // A rỉ cam · B lục tối (Back Alley) · C magenta · D tím (Nightlife) · E cyan · F xanh điện (Cyber Financial) · G vàng đậm · H vàng sáng (Megacorp)
    groups: { A: '#e8742a', B: '#2fb87a', C: '#ff3fb4', D: '#9b6bff', E: '#27e6ff', F: '#3d7bff', G: '#d9a521', H: '#ffe14d' },
    ground: '#0d1932', priceStrip: '#080b18', priceText: '#6fe9ff', labelText: '#eaf6ff', labelShadow: '#000000', rentText: '#0a0e1a', rentShadow: '#ffffff',
    boardSide: '#0b0f1c', boardSideDark: '#070a14', boardTop: '#0d1932', tileSide: '#222d4a', tileSideDark: '#141c32', water: '#0d1932', sand: '#13223f', gold: N.cyan,
  },
  zones: Z,
  slots: {
    tile: { paint: tilePaint },
    deco: { draw: deco },
    house: { draw: houseDraw },
    resort: { paint: (g, c) => floor(g, c, '#0b1630'), draw: chargePad },
    resortHouse: { draw: chargeHub },
    chance: { paint: (g, c) => floor(g, c, '#150f33'), draw: dataCube },
    tax: { paint: (g, c) => floor(g, c, '#0c2030'), draw: taxTerminal },
    start: { paint: cornerPaint('#0a1a10', '#16301c', N.lime), label: false, draw: named(powerGrid, 'START', N.lime) },
    island: { paint: cornerPaint('#1c0a10', '#321018', N.red), label: false, side: ['#3a1018', '#24090e'], draw: named(firewall, 'FIREWALL', N.red) },
    festival: { paint: cornerPaint('#150a24', '#2a1244', N.mag), label: false, draw: named(arcade, 'NEON ARCADE', N.mag) },
    tour: { paint: cornerPaint('#0c0a24', '#1c1448', N.violet), label: false, draw: named(warpGate, 'WARP GATE', N.violet) },
    base: { draw: (p, c) => { const a = c.half + c.margin - 0.1, y = c.y + 0.002; neon(p, [[-a, y, a], [a, y, a], [a, y, -a], [-a, y, -a], [-a, y, a]], N.cyan, 0.03, 0.12); } },
    center: { paint: cityFloor, draw: centerCity },
  },
  ambient: { animate: { cityFx } },
  labels: { chance: 'DATA CUBE', tax: 'THUẾ DỮ LIỆU', resortLevels: ['Trạm sạc', 'Cụm pin', 'Trạm điện', 'Nhà máy năng lượng'] },
});

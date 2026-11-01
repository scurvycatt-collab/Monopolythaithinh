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

/* ---------- giữa bàn (T26 v2): tháp dữ liệu lớn trên bệ vuông bo góc nhiều tầng + đường vành đai ôm sát + cụm cao ốc dày, theo ảnh tham khảo ---------- */
/*  Bố cục (toạ độ thế giới, camera ở phía +x+z, trái màn hình = −x+z, phải = +x−z): tháp và bệ lùi về sau (TX, TZ);
    xúc xắc khung xương nằm quanh (1, 1) → bệ xúc xắc tròn vạch đồng hồ ở (PADX, PADZ), góc trước vành đai bo rộng để chừa chỗ.
    Cao ốc phủ phần còn lại theo lưới khối phố, cao gần bệ, thấp dần ra mép và phía trước; chiều cao kẹp bởi hMax() để không che dải giá/nhãn ô phía xa. Không chữ, không logo. */
const TX = -1.5, TZ = -1.5;                                   // tâm tháp / bệ
const PODIUM = [[1.75, 0.7, 0, 0.3, N.cyan], [1.38, 0.55, 0.3, 0.62, N.mag], [1.0, 0.42, 0.62, 0.95, N.cyan]];   // [nửa cạnh, bo góc, y0, y1, màu viền]
const RH = 2.5, RW = 0.36, RY = 0.55, RRC = [1.4, 0.9, 0.9, 0.9];   // vành đai: nửa cạnh đường tâm, bề rộng, độ cao, bo góc (trước, trái, sau, phải)
const PADX = 1.15, PADZ = 1.15, PADR = 1.0;                         // bệ xúc xắc
const RAMPS = [[1, -1.0], [0, -1.0]];                               // dốc xuống đất: [trục (1 = đi theo +x, 0 = theo +z), toạ độ trục kia]
const CUBE = [-2.5, 3.45], MAP = [3.4, -2.5], KOI = [-3.45, 1.62];  // chồng Data Cube, bản đồ hologram, toà biển cá chép
const hMax = (x0, z0) => Math.max(0.3, ((2 * Math.min(x0, z0) + 11.9) * 0.354 - 0.3) / 0.866);   // đỉnh nhà phải thấp hơn mép trong ô phía xa trên màn hình
function rrPts(cx, cz, h, rs, n = 6) {   // đường bao hình vuông bo góc (rs: số hoặc 4 bán kính theo góc trước, trái, sau, phải), ngược chiều kim đồng hồ từ góc +x+z
  const R = Array.isArray(rs) ? rs : [rs, rs, rs, rs], C = [[1, 1], [-1, 1], [-1, -1], [1, -1]], P = [];
  C.forEach(([sx, sz], k) => { const r = R[k], ox = cx + sx * (h - r), oz = cz + sz * (h - r); for (let i = 0; i <= n; i++) { const t = (k + i / n) * (Math.PI / 2); P.push([ox + Math.cos(t) * r, oz + Math.sin(t) * r]); } });
  return P;
}
const inRR = (x, z, cx, cz, h, r) => { const dx = Math.max(Math.abs(x - cx) - (h - r), 0), dz = Math.max(Math.abs(z - cz) - (h - r), 0); return Math.abs(x - cx) <= h && Math.abs(z - cz) <= h && Math.hypot(dx, dz) <= r; };
const ROAD = (() => {   // đường tâm vành đai, chia đoạn ngắn để xếp chiều sâu đúng với nhà và tháp
  const base = rrPts(TX, TZ, RH, RRC, 6), pts = [];
  base.forEach((q, i) => { const b = base[(i + 1) % base.length], l = Math.hypot(b[0] - q[0], b[1] - q[1]), m = Math.max(1, Math.round(l / 0.55)); for (let j = 0; j < m; j++) pts.push([q[0] + ((b[0] - q[0]) * j) / m, q[1] + ((b[1] - q[1]) * j) / m]); });
  const n = pts.length, nrm = pts.map((q, i) => { const a0 = pts[(i + n - 1) % n], a1 = pts[(i + 1) % n]; let nx = a1[1] - a0[1], nz = -(a1[0] - a0[0]); const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l; if (nx * (q[0] - TX) + nz * (q[1] - TZ) < 0) { nx = -nx; nz = -nz; } return [nx, nz]; });
  let L = 0; const acc = pts.map((q, i) => { const r = L, b = pts[(i + 1) % n]; L += Math.hypot(b[0] - q[0], b[1] - q[1]); return r; });
  return { pts, nrm, acc, len: L };
})();
function arc(p, x, y, z, r, a0, a1, col, w = 0.03, n = 20) { neon(p, Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [x + Math.cos(a) * r, y, z + Math.sin(a) * r]; }), col, w); }
const BACK = [0.75 * Math.PI, 1.75 * Math.PI], FRONT = [-0.25 * Math.PI, 0.75 * Math.PI];   // nửa sau / nửa trước so với camera

function cityFloor(g, c) {   // mặt phẳng: sân tối dưới bệ, bóng vành đai, phố có vạch neon, bệ xúc xắc vạch đồng hồ; còn lại navy trơn
  const { T, px } = c; g.save();
  const path = (P) => { g.beginPath(); P.forEach(([x, z], i) => { const [a, b] = T(x, z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); };
  path(rrPts(TX, TZ, RH + 0.55, RRC.map((r) => r + 0.5))); g.fillStyle = 'rgba(16,28,58,.75)'; g.fill(); g.strokeStyle = 'rgba(39,230,255,.25)'; g.lineWidth = 0.03 * px; g.stroke();
  path(rrPts(TX + 0.12, TZ + 0.12, RH, RRC)); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 0.42 * px; g.stroke();
  const lane = (x0, z0, x1, z1, col) => { g.strokeStyle = 'rgba(8,12,28,.85)'; g.lineWidth = 0.34 * px; g.beginPath(); g.moveTo(...T(x0, z0)); g.lineTo(...T(x1, z1)); g.stroke();
    g.strokeStyle = col; g.globalAlpha = 0.55; g.lineWidth = 0.02 * px; g.setLineDash([0.14 * px, 0.1 * px]); g.beginPath(); g.moveTo(...T(x0, z0)); g.lineTo(...T(x1, z1)); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; };
  lane(2.7, -1.0, 5.9, -1.0, N.cyan); lane(-1.0, 2.7, -1.0, 5.9, N.mag); lane(-5.9, 0.3, -4.35, 0.3, N.gold); lane(0.3, -5.9, 0.3, -4.35, N.gold);
  const [cx, cy] = T(PADX, PADZ), R = PADR * px;   // bệ xúc xắc: quầng, vòng đôi, vạch chia như mặt đồng hồ
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25); gr.addColorStop(0, 'rgba(39,230,255,.2)'); gr.addColorStop(0.75, 'rgba(39,230,255,.08)'); gr.addColorStop(1, 'rgba(39,230,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R * 1.25, 0, 7); g.fill();
  g.fillStyle = 'rgba(8,14,32,.85)'; g.beginPath(); g.arc(cx, cy, R * 0.98, 0, 7); g.fill();
  g.shadowColor = N.cyan; g.shadowBlur = 10; g.strokeStyle = N.cyan; g.lineWidth = 0.05 * px; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
  g.lineWidth = 0.025 * px; g.beginPath(); g.arc(cx, cy, R * 0.62, 0, 7); g.stroke();
  g.shadowColor = N.mag; g.strokeStyle = N.mag; g.lineWidth = 0.02 * px; g.setLineDash([0.1 * px, 0.07 * px]); g.beginPath(); g.arc(cx, cy, R * 0.55, 0, 7); g.stroke(); g.setLineDash([]);
  g.shadowBlur = 0;
  for (let i = 0; i < 60; i++) { const a = (i / 60) * 6.283, big = i % 5 === 0, r0 = R * (big ? 0.7 : 0.8), r1 = R * 0.93; g.strokeStyle = big ? '#bff6ff' : 'rgba(127,216,255,.6)'; g.lineWidth = (big ? 0.03 : 0.013) * px; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke(); }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283 + 0.26; g.fillStyle = i % 3 ? 'rgba(255,63,180,.7)' : N.gold; g.fillRect(cx + Math.cos(a) * R * 1.07 - 0.03 * px, cy + Math.sin(a) * R * 1.07 - 0.03 * px, 0.06 * px, 0.06 * px); }
  g.restore();
}
function rprism(p, cx, cz, h, r, y0, y1, edge) {   // khối vuông bo góc: mặt bên tối (sáng hơn phía +x), mặt trên, viền neon trước, dải đèn giữa thân
  const P = rrPts(cx, cz, h, r, 5), n = P.length, seg = P.map((a, i) => { const b = P[(i + 1) % n], nx = b[1] - a[1], nz = -(b[0] - a[0]), l = Math.hypot(nx, nz) || 1; return { a, b, ux: nx / l, uz: nz / l, vis: (nx + nz) / l > 0.02 }; });   // pháp tuyến ngoài (đường bao ngược chiều kim đồng hồ)
  let s0 = seg.findIndex((s, i) => s.vis && !seg[(i + n - 1) % n].vis); if (s0 < 0) s0 = 0;
  const front = []; for (let k = 0; k < n; k++) { const s = seg[(s0 + k) % n]; if (!s.vis) break; front.push(s); }
  front.forEach(({ a, b, ux }) => p.poly([[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]], p.u.mix('#0c1328', '#1d2a4c', (ux + 1) / 2)));
  p.poly(P.map(([x, z]) => [x, y1, z]), '#172241');
  p.line3([...P, P[0]].map(([x, z]) => [x, y1 + 0.003, z]), 'rgba(120,160,255,.25)', 0.012);
  const fp = [front[0].a, ...front.map((s) => s.b)];
  neon(p, fp.map(([x, z]) => [x, y1 + 0.004, z]), edge, 0.026, 0.12);
  if (y1 - y0 > 0.2) p.line3(fp.map(([x, z]) => [x, (y0 + y1) / 2, z]), hexA(edge, 0.5), 0.02);
}
function stairs(p, x, z, ax, y0, y1, w, dep, n) {   // bậc thang trước mặt bệ (ax=1 đi về +x, 0 về +z)
  for (let i = 0; i < n; i++) { const y = y0 + ((y1 - y0) * i) / n, hh = (y1 - y0) / n + 0.002, o = dep * (1 - i / n); ax ? p.box(x, y, z - w / 2, o, hh, w, '#1a2442', { edge: null, top: '#26345c' }) : p.box(x - w / 2, y, z, w, hh, o, '#1a2442', { edge: null, top: '#26345c' }); }
  ax ? neon(p, [[x + dep, y0 + 0.01, z + w / 2], [x, y1, z + w / 2]], N.cyan, 0.012, 0.06) : neon(p, [[x + w / 2, y0 + 0.01, z + dep], [x + w / 2, y1, z]], N.cyan, 0.012, 0.06);
}
function tower(p) {   // bệ 3 tầng bo góc + tháp: trống đế, thân tối sọc sáng, ống kính có cột sáng, đĩa giữa, đĩa đỉnh, chóp; 3 vòng hologram (nửa sau trước thân, nửa trước sau cùng)
  const X = TX, Z = TZ, H = [[1.7, 1.15, N.cyan], [2.1, 1.32, N.mag], [2.5, 1.0, N.cyan]];
  p.shadow(X - 1.75, Z - 1.75, 3.5, 3.5, 1, 0.35);
  PODIUM.forEach(([h, r, y0, y1, col]) => rprism(p, X, Z, h, r, y0, y1, col));
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283 + 0.26, x = X + Math.cos(a) * 0.85, z = Z + Math.sin(a) * 0.85; if (Math.cos(a) + Math.sin(a) < -0.6) continue; glow(p, N.gold, 0.1, () => p.ball(x, 0.99, z, 0.028, N.gold)); }
  stairs(p, X - 0.3, Z + 1.38, 0, 0.3, 0.62, 0.6, 0.37, 5); stairs(p, X + 1.38, Z - 0.3, 1, 0.3, 0.62, 0.6, 0.37, 5);
  stairs(p, X - 0.3, Z + 1.75, 0, 0, 0.3, 0.6, 0.3, 4); stairs(p, X + 1.75, Z - 0.3, 1, 0, 0.3, 0.6, 0.3, 4);
  p.cyl(X, 0.95, Z, 0.78, 0.2, N.steel); ring(p, X, 1.16, Z, 0.77, N.mag, 0.03, 44);
  p.cyl(X, 1.15, Z, 0.55, 0.35, '#121a30'); ring(p, X, 1.51, Z, 0.55, N.cyan, 0.026, 40);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.283; if (Math.cos(a) + Math.sin(a) < -0.3) continue; const x = X + Math.cos(a) * 0.56, z = Z + Math.sin(a) * 0.56; neon(p, [[x, 1.2, z], [x, 1.45, z]], i % 2 ? N.cyan : '#7fd8ff', 0.012, 0.05); }
  H.forEach(([y, r, col]) => { p.flatEllipse(X, y, Z, r, r, hexA(col, 0.06)); arc(p, X, y, Z, r, BACK[0], BACK[1], col, 0.022, 20); });
  glow(p, N.cyan, 0.4, (g) => { g.globalAlpha = 0.3; p.cyl(X, 1.5, Z, 0.4, 1.3, '#27e6ff'); });
  glow(p, N.cyan, 0.6, () => p.line3([[X, 1.5, Z], [X, 2.8, Z]], 'rgba(39,230,255,.6)', 0.5)); glow(p, N.cyan, 0.3, () => p.line3([[X, 1.5, Z], [X, 2.8, Z]], '#7ff2ff', 0.28)); p.line3([[X, 1.5, Z], [X, 2.8, Z]], '#f2feff', 0.12);
  for (const y of [1.75, 2.05, 2.35, 2.62]) arc(p, X, y, Z, 0.4, FRONT[0], FRONT[1], 'rgba(191,246,255,.55)', 0.01, 14);
  p.cyl(X, 2.12, Z, 0.5, 0.08, '#121a30'); ring(p, X, 2.21, Z, 0.5, N.gold, 0.025, 32);
  p.cyl(X, 2.78, Z, 0.72, 0.1, N.steel); ring(p, X, 2.89, Z, 0.72, N.cyan, 0.03, 44); ring(p, X, 2.83, Z, 0.74, N.mag, 0.016, 44);
  p.cyl(X, 2.88, Z, 0.42, 0.12, '#121a30'); ring(p, X, 3.01, Z, 0.42, N.cyan, 0.02, 32);
  neon(p, [[X, 3.0, Z], [X, 3.2, Z]], '#bff6ff', 0.025, 0.1);
  glow(p, N.cyan, 0.5, () => p.ball(X, 3.22, Z, 0.09, N.cyan)); p.ball(X, 3.23, Z, 0.045, '#ffffff');
  H.forEach(([y, r, col]) => { arc(p, X, y, Z, r, FRONT[0], FRONT[1], col, 0.026, 20); for (let i = 0; i < 7; i++) { const a = FRONT[0] + (i + 0.5) * ((FRONT[1] - FRONT[0]) / 7); glow(p, col, 0.08, () => p.ball(X + Math.cos(a) * r, y, Z + Math.sin(a) * r, 0.022, '#ffffff')); } });
}
function roadPiece(p, i) {   // một đoạn đường vành đai: trụ, thành, mặt cầu, viền neon, vạch giữa, đèn xe nướng sẵn
  const { pts, nrm } = ROAD, n = pts.length, j = (i + 1) % n, [ax, az] = pts[i], [bx, bz] = pts[j], [anx, anz] = nrm[i], [bnx, bnz] = nrm[j], h = RW / 2;
  const o = (x, z, nx, nz, s, y) => [x + nx * h * s, y, z + nz * h * s];
  if (i % 3 === 0) p.box(ax - 0.06, 0, az - 0.06, 0.12, RY - 0.08, 0.12, N.steel2, { edge: null });
  p.poly([o(ax, az, anx, anz, 1, RY - 0.1), o(bx, bz, bnx, bnz, 1, RY - 0.1), o(bx, bz, bnx, bnz, 1, RY + 0.05), o(ax, az, anx, anz, 1, RY + 0.05)], '#0e1528');
  p.poly([o(ax, az, anx, anz, -1, RY - 0.1), o(bx, bz, bnx, bnz, -1, RY - 0.1), o(bx, bz, bnx, bnz, -1, RY + 0.05), o(ax, az, anx, anz, -1, RY + 0.05)], '#121a30');
  p.poly([o(ax, az, anx, anz, 1, RY), o(bx, bz, bnx, bnz, 1, RY), o(bx, bz, bnx, bnz, -1, RY), o(ax, az, anx, anz, -1, RY)], '#26335e');
  neon(p, [o(ax, az, anx, anz, 1, RY + 0.05), o(bx, bz, bnx, bnz, 1, RY + 0.05)], N.cyan, 0.03, 0.14);
  neon(p, [o(ax, az, anx, anz, -1, RY + 0.05), o(bx, bz, bnx, bnz, -1, RY + 0.05)], N.mag, 0.022, 0.1);
  p.line3([[ax, RY + 0.004, az], [(ax + bx) / 2, RY + 0.004, (az + bz) / 2]], 'rgba(255,225,77,.5)', 0.012);
  if (i % 4 === 1) { const m = [(ax + bx) / 2, (az + bz) / 2]; glow(p, '#fff6c8', 0.08, () => p.ball(m[0] + anx * 0.08, RY + 0.035, m[1] + anz * 0.08, 0.028, '#fff6c8')); glow(p, N.red, 0.08, () => p.ball(m[0] - anx * 0.08 + (bx - ax) * 0.3, RY + 0.035, m[1] - anz * 0.08 + (bz - az) * 0.3, 0.024, N.red)); }
}
function ramp(p, ax, k) {   // dốc / cầu nối từ mép ngoài vành đai xuống phố
  const h = RW / 2, s0 = TX + RH + h, s1 = s0 + 1.6, P = (s, y, t) => (ax ? [s, y, k + t] : [k + t, y, s]);
  p.poly([P(s0, RY, -h), P(s1, 0.01, -h), P(s1, 0.01, h), P(s0, RY, h)], '#1b2544');
  p.poly([P(s0, RY - 0.1, h), P(s1, 0, h), P(s0, 0, h)], '#0e1528');
  p.box(...(ax ? [s0 + 0.5, 0, k - 0.05] : [k - 0.05, 0, s0 + 0.5]), 0.1, RY * 0.6, 0.1, N.steel2, { edge: null });
  neon(p, [P(s0, RY + 0.05, h), P(s1, 0.03, h)], N.cyan, 0.02, 0.09); neon(p, [P(s0, RY + 0.05, -h), P(s1, 0.03, -h)], N.mag, 0.014, 0.06);
  p.line3([P(s0, RY + 0.004, 0), P(s1, 0.014, 0)], 'rgba(255,225,77,.5)', 0.012);
}
function koi(p, x0, x1, y0, y1, z) {   // biển quảng cáo cá chép neon (motif chung, không thương hiệu)
  p.quadZ(z, x0, x1, y0, y1, '#0a0d1a'); glow(p, N.mag, 0.25, () => p.quadZ(z + 0.002, x0 + 0.02, x1 - 0.02, y0 + 0.02, y1 - 0.02, 'rgba(255,63,180,.12)'));
  neon(p, [[x0, y0, z + 0.003], [x1, y0, z + 0.003], [x1, y1, z + 0.003], [x0, y1, z + 0.003], [x0, y0, z + 0.003]], N.mag, 0.02, 0.12);
  const fish = (cx, cy, s, rot, col) => { const P = (u, v) => [cx + (u * Math.cos(rot) - v * Math.sin(rot)) * s, cy + (u * Math.sin(rot) + v * Math.cos(rot)) * s, z + 0.006];
    const body = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * 6.283; return P(Math.cos(a) * 1, Math.sin(a) * 0.38 * (1 - 0.35 * Math.max(0, -Math.cos(a)))); });
    glow(p, col, 0.16, () => { p.poly(body, col); p.poly([P(-0.85, 0), P(-1.5, 0.45), P(-1.3, 0), P(-1.5, -0.45)], col); p.poly([P(0.1, 0.3), P(-0.25, 0.65), P(-0.35, 0.3)], col); });
    p.poly([P(0.35, 0.05), P(0.1, 0.2), P(-0.2, 0.1), P(0.05, -0.08)], '#ffffff'); p.ball(...P(0.7, 0.08), 0.014, '#0a0d1a'); };
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, s = Math.min(x1 - x0, (y1 - y0) * 0.9) * 0.24;
  fish(cx - s * 0.4, cy + (y1 - y0) * 0.2, s, -0.6, '#ff8a3d'); fish(cx + s * 0.5, cy - (y1 - y0) * 0.18, s * 0.9, 2.5, '#ff3fb4');
}
function vsign(p, x, y, z, h, col, r) {   // biển neon dọc trên mặt +z: thanh tối + glyph giả
  p.box(x - 0.045, y, z, 0.09, h, 0.03, '#0a0d1a', { edge: null });
  glow(p, col, 0.1, () => { for (let yy = y + 0.04; yy < y + h - 0.06; yy += 0.085) { const t = r(); if (t < 0.5) p.quadZ(z + 0.032, x - 0.03, x + 0.03, yy, yy + 0.02, col); else { p.quadZ(z + 0.032, x - 0.03, x - 0.01, yy, yy + 0.05, col); p.quadZ(z + 0.032, x + 0.01, x + 0.03, yy, yy + 0.05, col); } } });
  neon(p, [[x - 0.045, y, z + 0.031], [x - 0.045, y + h, z + 0.031]], col, 0.008, 0.05);
}
function tall(p, b) {   // cao ốc tối, cửa sổ sáng, viền neon góc trước; tuỳ chọn biển dọc / hologram / cá chép / antenna
  const { x, z, w, d, acc } = b, r = p.u.rng(b.seed), h = Math.min(b.h, hMax(x, z)), x0 = x - w / 2, z0 = z - d / 2;
  p.shadow(x0, z0, w, d, h, 0.3);
  block(p, x0, 0, z0, w, h, d, '#0c1530', r, { cw: 0.08, ch: 0.11, lit: 0.5, cols: WINB, mx: 0.16, my: 0.22, edge: 'rgba(120,160,255,.18)' });
  neon(p, [[x0 + w, 0.02, z0 + d], [x0 + w, h, z0 + d]], acc, 0.014, 0.08);
  neonLoop(p, x0, z0, x0 + w, z0 + d, h + 0.005, acc, 0.012, 0.06);
  if (h > 0.9 && w > 0.3) p.box(x0 + w * 0.2, h, z0 + d * 0.2, w * 0.6, 0.12, d * 0.6, '#101a34', { edge: 'rgba(120,160,255,.2)' });
  if (b.sign && h > 0.6) vsign(p, x0 + w * 0.78, h * 0.3, z0 + d, h * 0.55, b.sign, r);
  if (b.holo && h > 0.6) holo(p, x0 + 0.03, x0 + w - 0.03, h * 0.42, h * 0.82, z0 + d + 0.06, b.holo, r);
  if (b.koi) koi(p, x0 - 0.04, x0 + w + 0.04, 0.3, h - 0.08, z0 + d + 0.04);
  if (b.ant && h > 1) antenna(p, x, h + 0.12, z, 0.3, N.red);
}
const CITY = (() => {   // cao ốc: vành nhà sát bệ (trong vành đai) + lưới khối phố bên ngoài
  const A = [N.cyan, N.mag, N.lime, N.gold, N.violet], L = [], u = (s) => { const v = Math.sin(s * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const put = (x, z, w, d, h, o = {}) => L.push({ x, z, w, d, h, acc: A[L.length % A.length], seed: 300 + L.length * 17, ...o });
  // trong vành đai, bám quanh bệ: sau / hai bên cao, trước thấp; chừa chỗ cầu thang
  const g0 = 2.07;
  for (const t of [-1.55, -1.0, -0.45, 0.1, 0.65, 1.2]) {
    const back = t < 0.3;
    put(TX - g0, TZ + t, 0.4, 0.44, back ? 1.6 - t * 0.3 : 0.75, { sign: t === -1.0 ? N.mag : 0 });
    put(TX + t, TZ - g0, 0.44, 0.4, back ? 1.6 - t * 0.3 : 0.75, { sign: t === -0.45 ? N.cyan : 0, ant: t === -1.55 ? 1 : 0 });
    if (Math.abs(t + 0.3) > 0.45 && t < 1) { put(TX + g0, TZ + t, 0.4, 0.42, 0.55 + u(t) * 0.35, { holo: t === -1.55 ? N.mag : 0 }); put(TX + t, TZ + g0, 0.42, 0.4, 0.55 + u(t + 9) * 0.35, { sign: t === 0.65 ? N.lime : 0 }); }
  }
  put(TX - g0, TZ - g0, 0.46, 0.46, 2.1, { ant: 1 });
  put(KOI[0], KOI[1], 1.3, 0.5, 1.75, { koi: 1 });
  // ngoài vành đai: lưới khối phố, chừa phố (lane), bệ xúc xắc, chồng cube, bản đồ, toà cá chép
  const step = 0.6, free = (x, z) => !inRR(x, z, TX, TZ, RH + RW / 2 + 0.5, RRC[2] + 0.5) && Math.hypot(x - PADX, z - PADZ) > PADR + 0.45 && !(x + z > 1.2 && Math.min(x, z) > -1.4 && Math.max(x, z) < 4.6)
    && Math.hypot(x - CUBE[0], z - CUBE[1]) > 0.9 && Math.hypot(x - MAP[0], z - MAP[1]) > 0.95 && !(Math.abs(x - KOI[0]) < 1.0 && z > KOI[1] - 0.6 && z < KOI[1] + 1.6)
    && !(Math.abs(z + 1.0) < 0.45 && x > 0.9) && !(Math.abs(x + 1.0) < 0.45 && z > 0.9) && !(Math.abs(x - 0.3) < 0.4 && z < -3.9) && !(Math.abs(z - 0.3) < 0.4 && x < -3.9);
  for (let i = 0; i < 20; i++) for (let j = 0; j < 20; j++) {
    const x = -5.6 + i * step, z = -5.6 + j * step, s = i * 31 + j * 7;
    if (x > 5.65 || z > 5.65 || !free(x, z) || u(s) < (x + z > 1.2 && Math.min(x, z) > -1.4 ? 0.45 : 0.12)) continue;   // hàng sát mép trước thưa hơn
    const dt = Math.max(Math.abs(x - TX), Math.abs(z - TZ)) - RH, fr = Math.max(0.22, 1 - Math.max(0, x + z - 1) / 5.5);
    const ahead = x > TX + RH || z > TZ + RH, h = Math.max(0.55, (0.45 + Math.max(0, 1.9 - dt * 0.42) * (0.6 + u(s + 3) * 0.6)) * fr * (ahead ? 0.6 : 1)), w = 0.4 + u(s + 5) * 0.12, d = 0.4 + u(s + 6) * 0.12, k = u(s + 8);
    put(x + (u(s + 1) - 0.5) * 0.06, z + (u(s + 2) - 0.5) * 0.06, w, d, h, k < 0.12 ? { sign: N.mag } : k < 0.22 ? { sign: N.cyan } : k < 0.3 ? { holo: N.violet } : k < 0.36 ? { ant: 1 } : {});
  }
  return L;
})();
function cubeStack(p, x, z) {   // chồng Data Cube kính (thẻ Cơ hội)
  p.ellipseShadow(x, z, 0.8, 0.25); p.cyl(x, 0, z, 0.78, 0.12, N.steel); ring(p, x, 0.13, z, 0.72, N.mag, 0.035, 40); ring(p, x, 0.06, z, 0.79, N.cyan, 0.02, 40);
  glow(p, N.mag, 0.3, () => p.flatEllipse(x, 0.135, z, 0.62, 0.62, 'rgba(255,63,180,.18)'));
  const s = 0.44, C = [[-0.25, -0.2, 0.13, N.cyan], [0.22, -0.18, 0.13, N.mag], [-0.2, 0.25, 0.13, N.violet], [0.22, 0.24, 0.13, N.cyan], [-0.02, 0.0, 0.57, N.mag], [0.05, -0.03, 1.01, N.violet]];
  C.forEach(([dx, dz, y, col]) => { const x0 = x + dx - s / 2, z0 = z + dz - s / 2; glow(p, col, 0.2, () => p.box(x0, y, z0, s, s, s, '#3a1f5c', { top: hexA(col, 0.55), left: hexA(col, 0.3), right: hexA(col, 0.42), edge: col })); neonLoop(p, x0, z0, x0 + s, z0 + s, y + s, '#ffffff', 0.007, 0.04); });
  glow(p, N.mag, 0.2, () => { const [sx, sy] = p.p(x + 0.05, 1.25, z + 0.2), g = p.ctx; g.fillStyle = '#fff'; g.font = `900 ${p.k * 0.26}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', sx, sy); });
}
function worldPanel(p, x, z) {   // bảng hologram bản đồ thế giới giản lược, mặt quay về người xem (chấm theo vài elip, không theo bản đồ có bản quyền)
  const W = 1.1, y0 = 0.7, y1 = 1.75, e = 0.7071, P = (u, y) => [x + (u - 0.5) * 2 * W * e, y, z - (u - 0.5) * 2 * W * e];
  p.ellipseShadow(x, z, 0.4, 0.25); p.cyl(x, 0, z, 0.22, 0.12, N.steel); ring(p, x, 0.13, z, 0.22, N.cyan, 0.02, 24); p.box(x - 0.025, 0.12, z - 0.025, 0.05, y0 - 0.12, 0.05, N.steel2, { edge: null });
  glow(p, N.cyan, 0.4, () => p.poly([P(0, y0), P(1, y0), P(1, y1), P(0, y1)], 'rgba(39,230,255,.14)'));
  const E = [[0.2, 0.64, 0.15, 0.14], [0.3, 0.32, 0.06, 0.17], [0.5, 0.68, 0.08, 0.1], [0.55, 0.4, 0.08, 0.18], [0.73, 0.64, 0.18, 0.14], [0.84, 0.3, 0.07, 0.07]];
  const g = p.ctx, dsz = Math.max(1.5, p.k * 0.026); g.save(); g.shadowColor = N.cyan; g.shadowBlur = p.k * 0.05; g.fillStyle = '#bff6ff';
  for (let i = 0; i < 34; i++) for (let j = 0; j < 18; j++) { const uu = (i + 0.5) / 34, v = (j + 0.5) / 18; if (!E.some(([a, b, ra, rb]) => ((uu - a) / ra) ** 2 + ((v - b) / rb) ** 2 < 1)) continue; const [sx, sy] = p.p(...P(uu, y0 + v * (y1 - y0))); g.fillRect(sx - dsz / 2, sy - dsz / 2, dsz, dsz); }
  g.restore();
  neon(p, [P(0, y0), P(1, y0), P(1, y1), P(0, y1), P(0, y0)], N.cyan, 0.016, 0.1);
  for (const v of [0.33, 0.66]) p.line3([P(0, y0 + v * (y1 - y0)), P(1, y0 + v * (y1 - y0))], 'rgba(39,230,255,.25)', 0.006);
}
function centerCity(pen, c) {   // vẽ một lần (cạnh 0), mọi vật vào danh sách chiều sâu chung
  if (c.side !== 0) return;
  c.add(TX, TZ, tower);
  ROAD.pts.forEach((q, i) => { const b = ROAD.pts[(i + 1) % ROAD.pts.length]; c.add((q[0] + b[0]) / 2, (q[1] + b[1]) / 2, (p) => roadPiece(p, i), 0.05); });
  RAMPS.forEach(([ax, k]) => { const m = TX + RH + RW / 2 + 0.8; c.add(ax ? m : k, ax ? k : m, (p) => ramp(p, ax, k), 0.1); });
  CITY.forEach((b) => c.add(b.x, b.z, (p) => tall(p, b)));
  c.add(CUBE[0], CUBE[1], (p) => cubeStack(p, CUBE[0], CUBE[1])); c.add(MAP[0], MAP[1], (p) => worldPanel(p, MAP[0], MAP[1]));
}
function cityFx(p, t) {   // chuyển động rẻ: 6 xe chạy trên nửa trước vành đai + chấm sáng quay trên vòng hologram giữa
  const { pts, acc, len } = ROAD, n = pts.length;
  for (let k = 0; k < 6; k++) {
    const s = ((t * 0.4 + (k * len) / 6) % len + len) % len; let i = 0; while (i < n - 1 && acc[i + 1] <= s) i++;
    const a = pts[i], b = pts[(i + 1) % n], f = (s - acc[i]) / (Math.hypot(b[0] - a[0], b[1] - a[1]) || 1), x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f;
    if (x - TX + (z - TZ) < 0.8) continue; p.ball(x, RY + 0.035, z, 0.032, k % 2 ? '#fff6c8' : N.red);
  }
  const a = (t * 0.8) % 6.283; if (Math.cos(a) + Math.sin(a) > 0.3) p.ball(TX + Math.cos(a) * 1.32, 2.1, TZ + Math.sin(a) * 1.32, 0.035, '#ffffff');
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

/* Skin Bốn Mùa — mỗi cạnh một mùa: 0 Xuân, 1 Hạ, 2 Thu, 3 Đông. Phương án đã chốt (map lab):
   01 ô đất B viền mép sau · 02 nhà 5 cấp A (khối Kenney, cây đổi mùa) · 03 cây B khối vuông · 04 resort C cắm trại
   05 nhà resort A trại → glamping · 06 Start B vòm bốn mùa · 07 Lost Island A đảo nhiệt đới · 08 Championships C sân vận động Thu
   09 World Tour C khinh khí cầu · 10 Chance B hộp quà · 11 Tax C ngân khố cột đá · 12 đế C khung gỗ · 13 hội chợ bốn mùa + đài phun.
   Toạ độ, bút: docs/contracts/map-skin.md, public/js/render-common/board2d/PEN.md. */
import { defineSkin } from '../../js/render-common/board2d/skin.js';

const SEA = {
  spring: { id: 'spring', ground: '#bde69c', ground2: '#a7da86', ground3: '#d6f2bd', acc: '#f27aa6', particles: 'petals' },
  summer: { id: 'summer', ground: '#8fd06a', ground2: '#7fc35c', ground3: '#a8de8a', acc: '#ffbf1f', particles: 'sun' },
  autumn: { id: 'autumn', ground: '#dcc47a', ground2: '#cdb266', ground3: '#eedb9e', acc: '#f07a2a', particles: 'leaves' },
  winter: { id: 'winter', ground: '#f1f6fa', ground2: '#dbe6f0', ground3: '#ffffff', acc: '#5aa9e6', labelText: '#17212b', labelShadow: '#ffffff', particles: 'snow' },
};
const SS = ['spring', 'summer', 'autumn', 'winter'];
const PL = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00acc1'];   // màu trang trí (khán giả, đèn), không phải màu người chơi
const C = { stone: '#e2dccb', stone2: '#cfc7b1', sand: '#f1dcaa', wood: '#a87b4f', wood2: '#8a6040', white: '#ffffff', navy: '#33415c', gold: '#f5b934', water: '#8fd6ef' };
const G0 = [-0.72, -0.72];
const sea = (c) => (c.zone ? c.zone.id : 'spring');

/* ---------- mặt phẳng (texture điểm ảnh) ---------- */
function fancy(season) {
  return (g, c, x = 0, y = 0, w = c.cw, h = c.ch, seed = c.seed) => {
    c.grass(g, x, y, w, h, seed, SEA[season]); const r = c.rng(seed + 7); g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    if (season === 'spring') {
      for (let i = 0; i < 26; i++) { g.globalAlpha = 0.85; g.fillStyle = r() < 0.6 ? '#ffc1d6' : '#ffffff'; g.beginPath(); g.ellipse(x + r() * w, y + r() * h, 4, 2.2, r() * 3, 0, 7); g.fill(); }
      for (let i = 0; i < 16; i++) { const fx = x + 8 + r() * (w - 16), fy = y + 8 + r() * (h - 16); g.globalAlpha = 1; g.fillStyle = ['#ffffff', '#ff9cc0', '#fff07a', '#c9a6ff'][i % 4]; for (let a = 0; a < 5; a++) { g.beginPath(); g.arc(fx + Math.cos(a * 1.257) * 3.6, fy + Math.sin(a * 1.257) * 3.6, 2.8, 0, 7); g.fill(); } g.fillStyle = C.gold; g.beginPath(); g.arc(fx, fy, 2, 0, 7); g.fill(); }
    } else if (season === 'summer') {
      g.globalAlpha = 0.35; g.fillStyle = SEA.summer.ground2; for (let i = -6; i < 10; i += 2) { g.beginPath(); g.moveTo(x + i * 26, y); g.lineTo(x + i * 26 + 26, y); g.lineTo(x + i * 26 + 26 + h, y + h); g.lineTo(x + i * 26 + h, y + h); g.closePath(); g.fill(); }
      g.globalAlpha = 1; for (let i = 0; i < 10; i++) { const fx = x + r() * w, fy = y + r() * h; g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(fx, fy, 2.6, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(fx + 5, fy + 2, 2, 0, 7); g.fill(); }
    } else if (season === 'autumn') {
      for (let i = 0; i < 46; i++) { const lx = x + r() * w, ly = y + r() * h, a = r() * 6.28; g.save(); g.translate(lx, ly); g.rotate(a); g.fillStyle = ['#f08a3c', '#e0533a', '#f6b93b', '#c9672b'][i % 4]; g.beginPath(); g.moveTo(-6, 0); g.quadraticCurveTo(0, -4.5, 6, 0); g.quadraticCurveTo(0, 4.5, -6, 0); g.fill(); g.strokeStyle = 'rgba(120,60,20,.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-6, 0); g.lineTo(6, 0); g.stroke(); g.restore(); }
    } else {
      for (let i = 0; i < 10; i++) { g.globalAlpha = 0.55; g.fillStyle = '#d4e2ee'; g.beginPath(); g.ellipse(x + r() * w, y + r() * h, 14 + r() * 18, 7 + r() * 8, 0, 0, 7); g.fill(); }
      g.globalAlpha = 0.9; g.fillStyle = '#c4d4e3'; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(x + w * 0.25 + i * 7 + (i % 2) * 6, y + 10 + i * (h / 9.5), 3, 4.5, 0.5, 0, 7); g.fill(); }
      g.globalAlpha = 1; g.fillStyle = '#ffffff'; for (let i = 0; i < 22; i++) g.fillRect(x + r() * w - 1.5, y + r() * h - 1.5, 3, 3);
    }
    g.restore(); g.globalAlpha = 1;
  };
}
const sandPaint = (g, c) => { g.fillStyle = '#f7e2b5'; g.fillRect(0, 0, c.cw, c.ch); const wh = c.ch * 0.32; g.fillStyle = C.water; g.fillRect(0, 0, c.cw, wh); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(0, wh - 3, c.cw, 6); };
function waterPaint(g, c) { g.fillStyle = C.water; g.fillRect(0, 0, c.cw, c.ch); g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2.2; for (let r = 0; r < 9; r++) { g.beginPath(); for (let i = 0; i <= 20; i++) { const x = (i / 20) * c.cw, y = r * (c.ch / 8) + Math.sin(i * 0.9 + r) * 5; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } }
const flat = (col) => (g, c) => { g.fillStyle = col; g.fillRect(0, 0, c.cw, c.ch); };

/* ---------- cây (03 B khối vuông) và Nature Kit ---------- */
const VOX = { spring: [['#f6a5c0', '#ffc9db'], ['#f590b4', '#ffd6e5']], summer: [['#6fb944', '#86cc55'], ['#5aa83a', '#7fc24a']], autumn: [['#f08a3c', '#ffa552'], ['#e0533a', '#f06d48'], ['#f2b13a', '#ffc95a']], winter: [['#eef3f8', '#ffffff']] };
function treeV(p, x, z, s, kind = 'broad', k = 1, v = 0) {
  if (kind === 'pine') {
    p.ellipseShadow(x, z, 0.16 * k, 0.13); p.box(x - 0.03 * k, 0, z - 0.03 * k, 0.06 * k, 0.14 * k, 0.06 * k, '#7a5238', { edge: null });
    const gr = { spring: ['#4f9a3a', '#5aa843', '#7ccc55'], summer: ['#3f8a35', '#4f9a3a', '#5fae45'], autumn: ['#3c7a4a', '#45875a', '#4f9466'], winter: ['#2f6b55', '#367a60', '#3f866a'] }[s];
    [[0.36, 0.12], [0.27, 0.27], [0.17, 0.42]].forEach(([w, y], i) => { p.box(x - (w * k) / 2, y * k, z - (w * k) / 2, w * k, 0.16 * k, w * k, gr[i], { edge: 'rgba(255,255,255,.18)' }); if (s === 'winter') p.box(x - (w * k) / 2 - 0.005, (y + 0.16) * k, z - (w * k) / 2 - 0.005, w * k + 0.01, 0.035 * k, w * k + 0.01, '#ffffff', { edge: null }); });
    return;
  }
  const [c1, c2] = VOX[s][v % VOX[s].length];
  p.ellipseShadow(x, z, 0.15 * k, 0.14); p.box(x - 0.025 * k, 0, z - 0.025 * k, 0.05 * k, 0.2 * k, 0.05 * k, '#8a5a3c', { edge: null });
  if (s === 'winter') {
    p.box(x - 0.12 * k, 0.17 * k, z - 0.015 * k, 0.1 * k, 0.03 * k, 0.03 * k, '#8a5a3c', { edge: null }); p.box(x + 0.02 * k, 0.22 * k, z - 0.015 * k, 0.1 * k, 0.03 * k, 0.03 * k, '#8a5a3c', { edge: null });
    p.box(x - 0.11 * k, 0.2 * k, z - 0.11 * k, 0.22 * k, 0.18 * k, 0.22 * k, '#c9d7e5', { top: '#ffffff', right: '#eef3f8', left: '#d5e1ec', edge: null });
    p.box(x - 0.07 * k, 0.38 * k, z - 0.07 * k, 0.14 * k, 0.1 * k, 0.14 * k, '#ffffff', { top: '#ffffff', right: '#f4f8fb', left: '#dbe6f0', edge: null }); return;
  }
  p.box(x - 0.12 * k, 0.17 * k, z - 0.12 * k, 0.24 * k, 0.22 * k, 0.24 * k, c1, { edge: 'rgba(255,255,255,.25)' });
  p.box(x - 0.04 * k, 0.39 * k, z - 0.06 * k, 0.12 * k, 0.1 * k, 0.12 * k, c2, { edge: 'rgba(255,255,255,.25)' });
  if (s === 'spring') for (const [a, b] of [[0.13, -0.05], [0.13, 0.06], [-0.03, 0.13]]) p.box(x + a * k - 0.012, 0.3 * k, z + b * k - 0.012, 0.024, 0.024, 0.024, '#ffffff', { edge: null });
}
const BROAD_K = { spring: ['tree_oak', 'tree_default', 'tree_fat'], summer: ['tree_oak', 'tree_fat', 'tree_detailed'], autumn: ['tree_oak_fall', 'tree_default_fall', 'tree_detailed_fall'], winter: ['tree_oak', 'tree_default', 'tree_fat'] };
const PINE_K = { spring: 'tree_pineRoundA', summer: 'tree_pineRoundA', autumn: 'tree_pineRoundC', winter: 'tree_pineTallA_detailed' };
function treeK(p, x, z, s, kind = 'broad', k = 1, v = 0) {
  if (kind === 'pine') return p.nat(PINE_K[s], x, z, 0.8 * k, s);
  return p.nat(BROAD_K[s][v % 3], x, z, 0.72 * k, s === 'autumn' ? (v % 2 ? 'autumnRed' : 'none') : s);
}
function treeR(p, x, z, s, kind = 'broad', k = 1, v = 0) {
  if (kind === 'pine') {
    p.ellipseShadow(x, z, 0.17 * k, 0.13); p.cyl(x, 0, z, 0.03 * k, 0.12 * k, '#8a5a3c');
    const col = { spring: '#5aa843', summer: '#3f8f3a', autumn: '#3f7f55', winter: '#2f6b55' }[s];
    [[0.2, 0.1, 0.28], [0.16, 0.24, 0.26], [0.11, 0.38, 0.24]].forEach(([r, y, h]) => { p.cone(x, y * k, z, r * k, h * k, col); if (s === 'winter') p.cone(x, (y + h * 0.5) * k, z, r * 0.5 * k, h * 0.5 * k, '#ffffff'); });
    return;
  }
  const pal = { spring: ['#f7a8c4', '#ffc4d8'], summer: ['#6fbf4f', '#86cf62'], autumn: ['#f39a3c', '#e8603a', '#f6bd45'], winter: ['#f2f6fa'] }[s], col = pal[v % pal.length];
  p.ellipseShadow(x, z, 0.17 * k, 0.16); p.cyl(x, 0, z, 0.03 * k, 0.24 * k, '#9b6b45');
  p.ball(x - 0.025 * k, 0.32 * k, z, 0.16 * k, p.u.shade(col, 0.93)); p.ball(x + 0.035 * k, 0.45 * k, z + 0.02 * k, 0.12 * k, col);
  if (s === 'spring') for (const [a, b] of [[0.1, 0.36], [-0.12, 0.3], [0.02, 0.52], [0.13, 0.46]]) p.disc(x + a * k, b * k, z + 0.1 * k, 0.016 * k, '#ffffff');
}

/* ---------- vật trang trí ---------- */
function tulips(p, x, z, s = 1, cube = false) {
  [[-0.06, -0.03], [0.04, -0.06], [0.07, 0.04], [-0.03, 0.06]].forEach(([a, b], i) => {
    const px = x + a * s, pz = z + b * s, h = (0.1 + (i % 2) * 0.03) * s, col = ['#ff6f9c', '#ffd23a', '#ffffff', '#c58bff'][i]; p.line3([[px, 0, pz], [px, h, pz]], '#4f9a3a', 0.012 * s);
    if (cube) p.box(px - 0.02 * s, h, pz - 0.02 * s, 0.04 * s, 0.045 * s, 0.04 * s, col, { edge: null }); else p.ball(px, h + 0.02 * s, pz, 0.026 * s, col);
  });
}
function sunflower(p, x, z, s = 1) {
  p.ellipseShadow(x, z, 0.06 * s, 0.13); p.box(x - 0.008 * s, 0, z - 0.008 * s, 0.016 * s, 0.34 * s, 0.016 * s, '#4f9a3a', { edge: null }); p.rbox(x + 0.04 * s, 0.16 * s, z, 0.07 * s, 0.01 * s, 0.03 * s, '#5aa83a', 0, 0.5);
  const [sx, sy] = p.p(x, 0.38 * s, z), g = p.ctx, R = 0.075 * s * p.k; g.fillStyle = '#ffcc22'; for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; g.beginPath(); g.ellipse(sx + Math.cos(a) * R * 0.75, sy + Math.sin(a) * R * 0.75, R * 0.42, R * 0.2, a, 0, 7); g.fill(); }
  g.fillStyle = '#7a4a22'; g.beginPath(); g.arc(sx, sy, R * 0.5, 0, 7); g.fill();
}
function pumpkin(p, x, z, s = 1, cube = false) {
  p.ellipseShadow(x, z, 0.09 * s, 0.15);
  if (cube) { p.box(x - 0.08 * s, 0, z - 0.08 * s, 0.16 * s, 0.11 * s, 0.16 * s, '#f28a2a', { edge: 'rgba(255,255,255,.25)' }); p.box(x - 0.012 * s, 0.11 * s, z - 0.012 * s, 0.024 * s, 0.04 * s, 0.024 * s, '#5aa83a', { edge: null }); return; }
  p.ball(x - 0.035 * s, 0.065 * s, z, 0.065 * s, '#e57a22'); p.ball(x + 0.035 * s, 0.065 * s, z + 0.01 * s, 0.065 * s, '#f28a2a'); p.ball(x, 0.07 * s, z + 0.03 * s, 0.065 * s, '#f6983a'); p.cyl(x, 0.12 * s, z, 0.012 * s, 0.04 * s, '#5aa83a');
}
function leafPile(p, x, z, s = 1) { const r = p.u.rng(Math.round((x + 9) * 37 + z * 11)); for (let i = 0; i < 14; i++) { const a = r() * 6.28, d = r() * 0.12 * s; p.box(x + Math.cos(a) * d - 0.02, r() * 0.04 * s, z + Math.sin(a) * d - 0.02, 0.04 * s, 0.02 * s, 0.04 * s, ['#f08a3c', '#e0533a', '#f6b93b'][i % 3], { edge: null }); } }
function snowMound(p, x, z, rx, rz, h) { p.flatEllipse(x, 0.003, z, rx, rz, '#ffffff'); const [sx, sy] = p.p(x, 0, z), g = p.ctx, R = Math.max(rx, rz) * p.k * 0.9, gr = g.createRadialGradient(sx + R * 0.3, sy - h * p.k, R * 0.1, sx, sy, R); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#d9e5f0'); g.beginPath(); g.ellipse(sx, sy, R, h * p.k + R * 0.25, 0, Math.PI, 0); g.fillStyle = gr; g.fill(); }
function snowman(p, x, z, s = 1, cube = false) {
  p.ellipseShadow(x, z, 0.12 * s, 0.14);
  if (cube) {
    const W = { right: '#eef3f8', left: '#d5e1ec', edge: null };
    p.box(x - 0.1 * s, 0, z - 0.1 * s, 0.2 * s, 0.17 * s, 0.2 * s, '#ffffff', W); p.box(x - 0.075 * s, 0.17 * s, z - 0.075 * s, 0.15 * s, 0.13 * s, 0.15 * s, '#ffffff', W);
    p.box(x - 0.082 * s, 0.16 * s, z - 0.082 * s, 0.164 * s, 0.03 * s, 0.164 * s, '#e2534a', { edge: null }); p.box(x + 0.03 * s, 0.22 * s, z + 0.075 * s, 0.03 * s, 0.025 * s, 0.07 * s, '#ff8a1a', { edge: null });
    p.box(x - 0.06 * s, 0.3 * s, z - 0.06 * s, 0.12 * s, 0.02 * s, 0.12 * s, C.navy, { edge: null }); p.box(x - 0.04 * s, 0.32 * s, z - 0.04 * s, 0.08 * s, 0.07 * s, 0.08 * s, C.navy, { edge: null }); return;
  }
  p.ball(x, 0.1 * s, z, 0.1 * s, '#f6f9fc'); p.ball(x, 0.25 * s, z, 0.075 * s, '#ffffff');
  const [sx, sy] = p.p(x, 0.18 * s, z), g = p.ctx; g.fillStyle = '#e2534a'; g.fillRect(sx - 0.06 * s * p.k, sy - 0.012 * s * p.k, 0.12 * s * p.k, 0.03 * s * p.k);
  p.cyl(x, 0.31 * s, z, 0.05 * s, 0.07 * s, C.navy); p.flatEllipse(x, 0.31 * s, z, 0.075 * s, 0.075 * s, C.navy);
}
function palm(p, x, z, s = 1, lean = 0.06) {
  p.ellipseShadow(x, z, 0.14 * s, 0.12); let tx = x, ty = 0;
  for (let i = 0; i < 5; i++) { p.box(tx - 0.035 * s, ty, z - 0.035 * s, 0.07 * s, 0.13 * s, 0.07 * s, i % 2 ? C.wood : '#b98a5c', { edge: null }); ty += 0.13 * s; tx += lean * s * 0.4; }
  const top = [tx, ty, z], leaf = (dx, dz, col) => { const L = 0.36 * s, w = 0.07 * s, mid = [tx + dx * L * 0.5, ty + 0.03 * s, z + dz * L * 0.5]; p.poly([top, [mid[0] - dz * w, mid[1], mid[2] + dx * w], [tx + dx * L, ty - 0.12 * s, z + dz * L], [mid[0] + dz * w, mid[1], mid[2] - dx * w]], col); };
  [[-1, 0], [0, -1], [-0.7, 0.7], [0.7, -0.7]].forEach(([a, b]) => leaf(a, b, '#5ea83a')); [[1, 0], [0, 1], [0.7, 0.7]].forEach(([a, b]) => leaf(a, b, '#7fc24a'));
  p.box(tx - 0.04 * s, ty - 0.02 * s, z - 0.04 * s, 0.08 * s, 0.06 * s, 0.08 * s, '#6aa83d', { edge: null });
}
function figure(p, x, z, col, pose = 0) { p.ellipseShadow(x, z, 0.04, 0.15); p.rbox(x, 0, z, 0.05, 0.08, 0.04, C.navy, pose); p.rbox(x, 0.08, z, 0.06, 0.08, 0.05, col, pose); p.ball(x, 0.2, z, 0.03, '#f2c9a0'); }
function campfire(p, x, z, s = 1) { for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283; p.box(x + Math.cos(a) * 0.08 * s - 0.02, 0, z + Math.sin(a) * 0.08 * s - 0.02, 0.04 * s, 0.03 * s, 0.04 * s, '#9aa3ad', { edge: null }); } p.rbox(x, 0.01, z, 0.13 * s, 0.03 * s, 0.03 * s, '#7a5238', 0.5); p.rbox(x, 0.01, z, 0.13 * s, 0.03 * s, 0.03 * s, '#6b4530', -0.6); p.poly([[x - 0.05 * s, 0.03, z], [x + 0.05 * s, 0.03, z], [x, 0.2 * s, z]], '#ff8a1a'); p.poly([[x - 0.03 * s, 0.03, z], [x + 0.03 * s, 0.03, z], [x, 0.12 * s, z]], '#ffe066'); }
function blossomTree(p, x, z, s, col) {
  p.ellipseShadow(x, z, 0.2 * s, 0.12); p.line3([[x, 0, z], [x - 0.02, 0.35 * s, z]], '#6b4530', 0.05 * s); p.line3([[x - 0.02, 0.3 * s, z], [x - 0.2 * s, 0.5 * s, z]], '#6b4530', 0.03 * s); p.line3([[x - 0.02, 0.32 * s, z], [x + 0.18 * s, 0.55 * s, z + 0.03]], '#6b4530', 0.03 * s);
  [[-0.2, 0.55, 0.13], [0.18, 0.6, 0.13], [0, 0.66, 0.15], [-0.08, 0.48, 0.12], [0.1, 0.46, 0.11]].forEach(([a, b, r], i) => p.ball(x + a * s, b * s, z, r * s, i % 2 ? p.u.light(col, 0.25) : col));
  const r = p.u.rng(Math.round(x * 50 + 99)); for (let i = 0; i < 10; i++) p.disc(x + (r() - 0.5) * 0.5 * s, (0.45 + r() * 0.3) * s, z + 0.12 * s, 0.018 * s, '#ffffff');
}
function coins(p, x, z, n) { for (let i = 0; i < n; i++) p.cyl(x, i * 0.035, z, 0.07, 0.03, C.gold); }

/* ---------- nhà resort: trại → glamping (05 A) ---------- */
function tent(p, x, z, w, d, rise, col, snow) {
  p.shadow(x - w / 2, z - d / 2, w, d, rise * 0.8, 0.13); p.gableX(x - w / 2, 0, z - d / 2, w, d, rise, col, 0.02, p.u.light(col, 0.35));
  p.poly([[x + w / 2 + 0.001, 0, z - d * 0.16], [x + w / 2 + 0.001, 0, z + d * 0.16], [x + w / 2 + 0.001, rise * 0.62, z]], p.u.shade(col, 0.45));
  if (snow) p.poly([[x - w / 2 - 0.02, rise * 0.55, z + d * 0.225 + 0.02], [x + w / 2 + 0.02, rise * 0.55, z + d * 0.225 + 0.02], [x + w / 2 + 0.02, rise, z], [x - w / 2 - 0.02, rise, z]], '#ffffff');
}
function chalet(p, x, z, s, hex, snow) {
  p.shadow(x - 0.22 * s, z - 0.18 * s, 0.44 * s, 0.36 * s, 0.45 * s); p.box(x - 0.22 * s, 0, z - 0.18 * s, 0.44 * s, 0.26 * s, 0.36 * s, '#a8723f', { edge: null });
  for (let i = 1; i < 4; i++) p.quadZ(z + 0.18 * s + 0.001, x - 0.22 * s, x + 0.22 * s, i * 0.065 * s, i * 0.065 * s + 0.006, '#8a5a32');
  p.quadZ(z + 0.18 * s + 0.002, x - 0.05 * s, x + 0.05 * s, 0, 0.17 * s, '#5a3b27'); p.quadX(x + 0.22 * s + 0.001, z - 0.08 * s, z + 0.05 * s, 0.1 * s, 0.2 * s, '#ffd27a'); p.gableX(x - 0.22 * s, 0.26 * s, z - 0.18 * s, 0.44 * s, 0.36 * s, 0.2 * s, hex, 0.04, '#a8723f');
  if (snow) p.poly([[x - 0.26 * s, 0.38 * s, z + 0.08 * s], [x + 0.26 * s, 0.38 * s, z + 0.08 * s], [x + 0.26 * s, 0.46 * s, z], [x - 0.26 * s, 0.46 * s, z]], '#ffffff');
}
function lodge(p, x, z, hex, snow) {
  const w = 0.9, d = 0.5, h = 0.5; p.shadow(x - w / 2, z - d / 2, w, d, 0.9); p.box(x - w / 2 - 0.05, 0, z - d / 2 - 0.05, w + 0.1, 0.06, d + 0.25, C.wood2, { edge: null });
  p.box(x - w / 2, 0.06, z - d / 2, w, h, d, '#b07a45', { edge: null }); for (let i = 1; i < 7; i++) p.quadZ(z + d / 2 + 0.001, x - w / 2, x + w / 2, 0.06 + i * 0.07, 0.066 + i * 0.07, '#8a5a32');
  for (let i = 0; i < 3; i++) p.quadZ(z + d / 2 + 0.002, x - 0.36 + i * 0.26, x - 0.2 + i * 0.26, 0.3, 0.46, '#ffd27a'); p.quadZ(z + d / 2 + 0.002, x - 0.06, x + 0.06, 0.06, 0.24, '#5a3b27'); p.quadX(x + w / 2 + 0.001, z - 0.15, z + 0.1, 0.25, 0.42, '#ffd27a');
  p.gableX(x - w / 2, 0.56, z - d / 2, w, d, 0.3, hex, 0.06, '#b07a45'); if (snow) p.poly([[x - w / 2 - 0.06, 0.73, z + 0.13], [x + w / 2 + 0.06, 0.73, z + 0.13], [x + w / 2 + 0.06, 0.86, z], [x - w / 2 - 0.06, 0.86, z]], '#ffffff');
  p.box(x - 0.3, 0.56, z - 0.08, 0.08, 0.42, 0.08, '#9aa3ad', { edge: null });
}
function resortSign(p, x, y, z, hex, w = 0.62) { p.box(x - w / 2 + 0.04, 0, z - 0.015, 0.03, y, 0.03, C.wood2, { edge: null }); p.box(x + w / 2 - 0.07, 0, z - 0.015, 0.03, y, 0.03, C.wood2, { edge: null }); p.box(x - w / 2, y, z - 0.02, w, 0.17, 0.04, hex, { left: hex, right: p.u.shade(hex, 0.8), edge: null }); p.textZ('RESORT', x, y + 0.085, z + 0.021, 0.1, '#ffffff'); }
function seasonExtra(p, s, x, z) { if (s === 'spring') tulips(p, x, z, 1.1, true); if (s === 'summer') p.rbox(x, 0, z, 0.08, 0.42, 0.025, '#ffbf1f', 0.6); if (s === 'autumn') { pumpkin(p, x, z, 1, true); leafPile(p, x + 0.12, z + 0.1, 0.8); } if (s === 'winter') snowman(p, x, z, 1, true); }
function camp(pen, c) {
  const L = c.layer(), lv = c.level, hex = c.color, s = sea(c), z = c.gz + 0.15, snow = s === 'winter', T = (x, zz, k) => L.add(x, zz, (p) => treeV(p, x, zz, s, 'broad', k, 1));
  if (lv === 1) { L.add(-0.05, z - 0.2, (p) => tent(p, -0.05, z - 0.2, 0.55, 0.45, 0.34, hex, snow)); L.add(0.45, z + 0.25, (p) => campfire(p, 0.45, z + 0.25)); L.add(-0.45, z - 0.5, (p) => p.flagC(-0.45, z - 0.5, 0.6, hex)); T(0.5, z - 0.6, 0.9); L.add(-0.3, z + 0.45, (p) => seasonExtra(p, s, -0.3, z + 0.45)); }
  if (lv === 2) { L.add(-0.15, z - 0.3, (p) => { tent(p, -0.15, z - 0.3, 0.75, 0.6, 0.46, hex, snow); p.rbox(0.36, 0.3, z - 0.3, 0.3, 0.025, 0.62, p.u.light(hex, 0.15), 0, -0.25); for (const dz of [-0.28, 0.28]) p.box(0.49, 0, z - 0.3 + dz, 0.02, 0.27, 0.02, C.wood2, { edge: null }); }); L.add(0.45, z + 0.35, (p) => tent(p, 0.45, z + 0.35, 0.4, 0.34, 0.26, p.u.light(hex, 0.3), snow)); L.add(-0.35, z + 0.35, (p) => campfire(p, -0.35, z + 0.35)); T(-0.6, z - 0.75, 1); L.add(0.55, z - 0.7, (p) => seasonExtra(p, s, 0.55, z - 0.7)); }
  if (lv === 3) { L.add(-0.15, z - 0.35, (p) => chalet(p, -0.15, z - 0.35, 1.25, hex, snow)); L.add(0.45, z + 0.35, (p) => tent(p, 0.45, z + 0.35, 0.42, 0.36, 0.28, hex, snow)); L.add(-0.35, z + 0.4, (p) => { p.box(-0.5, 0.12, z + 0.32, 0.3, 0.03, 0.16, C.wood); for (const dx of [-0.48, -0.24]) p.box(dx, 0, z + 0.36, 0.03, 0.12, 0.08, C.wood2, { edge: null }); }); T(-0.65, z - 0.8, 1); T(0.6, z - 0.65, 0.85); }
  if (lv === 4) { L.add(-0.1, z - 0.45, (p) => lodge(p, -0.1, z - 0.45, hex, snow)); L.add(0.5, z + 0.35, (p) => tent(p, 0.5, z + 0.35, 0.36, 0.3, 0.24, hex, snow)); L.add(-0.45, z + 0.42, (p) => tent(p, -0.45, z + 0.42, 0.36, 0.3, 0.24, p.u.light(hex, 0.3), snow)); L.add(0.05, z + 0.5, (p) => campfire(p, 0.05, z + 0.5, 0.9)); L.add(0, z + 0.1, (p) => resortSign(p, 0, 0.7, z + 0.1, hex, 0.66), 0.2); L.add(0.62, z - 0.6, (p) => p.flagC(0.62, z - 0.6, 0.9, hex)); T(-0.68, z - 0.85, 1); }
  L.flush(pen);
}

/* ---------- ô resort chưa chủ: khu cắm trại (04 C) ---------- */
function campsite(pen, c) {
  const L = c.layer(), s = sea(c);
  if (s === 'spring') {
    L.add(0, -0.5, (p) => { for (let i = 0; i < 7; i++) for (let j = 0; j < 5; j++) p.ground(-0.35 + i * 0.1, -0.75 + j * 0.1, -0.25 + i * 0.1, -0.65 + j * 0.1, (i + j) % 2 ? '#e2534a' : '#ffffff', 0.004); p.box(0.05, 0, -0.65, 0.16, 0.1, 0.12, '#c08a55'); });
    L.add(0.4, 0.2, (p) => { const kx = 0.1, ky = 1.25, kz = -1.0; p.line3([[0.45, 0.15, 0.2], [kx + 0.2, ky * 0.6, kz + 0.5], [kx, ky - 0.1, kz]], 'rgba(60,60,60,.6)', 0.004); p.poly([[kx, ky + 0.12, kz], [kx + 0.1, ky, kz - 0.1], [kx, ky - 0.15, kz], [kx - 0.1, ky, kz + 0.1]], '#ffbf1f'); p.poly([[kx, ky + 0.12, kz], [kx + 0.1, ky, kz - 0.1], [kx, ky - 0.15, kz]], '#ff7aa8'); figure(p, 0.45, 0.2, '#43a047', 0.3); });
    L.add(-0.5, -1.2, (p) => treeR(p, -0.5, -1.2, 'spring', 'broad', 1.2)); L.add(0.5, -1.3, (p) => treeR(p, 0.5, -1.3, 'spring', 'broad', 1, 1));
  }
  if (s === 'summer') { L.add(-0.2, -0.45, (p) => p.nat('tent_detailedOpen', -0.2, -0.45, 1.25)); L.add(0.45, -0.2, (p) => { p.rbox(0.45, 0, -0.2, 0.08, 0.45, 0.025, '#ffbf1f', 0.6, 0); p.rbox(0.455, 0.01, -0.19, 0.02, 0.42, 0.027, '#1fb5d6', 0.6, 0); }); L.add(0.1, 0.3, (p) => { p.ball(0.1, 0.05, 0.3, 0.05, '#ff5a3c'); p.disc(0.12, 0.07, 0.32, 0.02, '#ffffff'); }); L.add(-0.5, 0.3, (p) => palm(p, -0.55, 0.25, 0.9, 0.06)); }
  if (s === 'autumn') {
    L.add(-0.25, -0.75, (p) => p.nat('tent_smallClosed', -0.25, -0.75, 1.4));
    L.add(0.15, -0.05, (p) => { const x = 0.15, z = -0.05; p.nat('campfire_stones', x, z, 1.5, 'none', false); p.nat('campfire_logs', x, z, 1.3, 'none', false); p.poly([[x - 0.06, 0.03, z], [x + 0.06, 0.03, z], [x, 0.24, z]], '#ff8a1a'); p.poly([[x - 0.035, 0.03, z], [x + 0.035, 0.03, z], [x + 0.005, 0.15, z]], '#ffe066'); for (let i = 0; i < 4; i++) p.puff(x - i * 0.04, 0.3 + i * 0.13, z, 0.04 + i * 0.02, 0.6 - i * 0.12); });
    L.add(0.5, 0.25, (p) => p.rbox(0.5, 0, 0.25, 0.3, 0.07, 0.07, '#9b6b45', 0.8)); L.add(-0.55, 0.3, (p) => treeK(p, -0.55, 0.3, 'autumn', 'broad', 1.1, 1)); L.add(0.5, -1.3, (p) => treeK(p, 0.5, -1.3, 'autumn', 'broad', 1.1, 0)); L.add(-0.55, -1.35, (p) => treeK(p, -0.55, -1.35, 'autumn', 'pine', 1));
  }
  if (s === 'winter') {
    L.add(-0.05, -0.6, (p) => { const x = -0.05, z = -0.65, R = 0.36; p.ellipseShadow(x, z, R, 0.12); for (let r = 0; r < 4; r++) { const y = r * 0.085; p.cyl(x, y, z, Math.cos(Math.asin(Math.min(1, y / R))) * R, 0.085, r % 2 ? '#ffffff' : '#f2f7fb'); } p.ball(x, 0.34, z, 0.07, '#ffffff'); p.box(x - 0.08, 0, z + 0.22, 0.16, 0.14, 0.22, '#f4f8fb', { top: '#ffffff', edge: null }); p.quadZ(z + 0.441, x - 0.05, x + 0.05, 0, 0.1, '#5b6f8c'); });
    L.add(0.45, 0.15, (p) => { p.rbox(0.45, 0.02, 0.15, 0.32, 0.03, 0.14, '#e2534a', 0.5); p.rbox(0.45, 0, 0.15, 0.34, 0.02, 0.03, C.wood2, 0.5); });
    L.add(-0.55, 0.3, (p) => treeR(p, -0.55, 0.3, 'winter', 'pine', 1.1)); L.add(0.55, -1.25, (p) => treeR(p, 0.55, -1.25, 'winter', 'pine', 1)); L.add(0.1, 0.45, (p) => snowman(p, 0.1, 0.45, 1));
  }
  L.flush(pen);
}

/* ---------- viền mép sau ô đất (01 B) ---------- */
function backRow(pen, c) {
  const L = c.layer(), s = sea(c), z = -1.32;
  if (s === 'spring') [-0.5, 0, 0.5].forEach((dx) => L.add(dx, z, (p) => { p.box(dx - 0.18, 0, z - 0.06, 0.36, 0.08, 0.12, '#a8724a', { top: '#7a4a2c', edge: null }); tulips(p.at(0, 0.08, 0), dx, z, 1.1); }));
  if (s === 'summer') { L.add(0, z, (p) => { for (let i = 0; i < 4; i++) p.box(-0.72 + i * 0.36, 0, z - 0.08, 0.34, 0.2, 0.16, '#5fae45', { top: '#7cc85a', edge: 'rgba(255,255,255,.2)' }); }); L.add(0.62, z + 0.2, (p) => sunflower(p, 0.62, z + 0.2, 1.1)); }
  if (s === 'autumn') { L.add(-0.35, z, (p) => { p.box(-0.6, 0, z - 0.09, 0.4, 0.18, 0.18, '#e9c46a', { top: '#f3d98a', edge: null }); for (let i = 1; i < 4; i++) p.quadZ(z + 0.091, -0.6 + i * 0.1, -0.595 + i * 0.1, 0, 0.18, '#c9a24e'); }); L.add(0.15, z + 0.05, (p) => pumpkin(p, 0.15, z + 0.05, 1.3)); L.add(0.48, z, (p) => pumpkin(p, 0.48, z, 1)); L.add(0.3, z + 0.3, (p) => leafPile(p, 0.3, z + 0.3)); }
  if (s === 'winter') { [-0.5, 0.05, 0.55].forEach((dx, i) => L.add(dx, z, (p) => snowMound(p, dx, z, 0.2, 0.12, 0.06 + i * 0.01))); [-0.25, 0.32].forEach((dx) => L.add(dx, z - 0.05, (p) => treeR(p, dx, z - 0.05, 'winter', 'pine', 0.75))); }
  L.flush(pen);
}

/* ---------- 4 góc ---------- */
function checker(p, half = 1.3, n = 16) { for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { const s0 = -half + i * (2 * half / n), s1 = s0 + 2 * half / n, n0 = -0.15 + j * 0.15, n1 = n0 + 0.15; p.poly([p.u.wp(s0, n0, ...G0), p.u.wp(s1, n0, ...G0), p.u.wp(s1, n1, ...G0), p.u.wp(s0, n1, ...G0)].map(([x, z]) => [x, 0.004, z]), (i + j) % 2 ? '#26364a' : '#ffffff'); } }
function startArch(pen, c) {
  checker(pen); const L = c.layer(), W = (s, n = 0) => pen.u.wp(s, n, ...G0), COLS = [['#f48fb1', '#ffd0e0'], ['#5fbf4a', '#9be07a'], ['#f08a3c', '#ffb066'], ['#9fd8f5', '#e6f6ff']], N = 20, R = 1.15;
  L.add(G0[0], G0[1], (p) => {
    for (let i = 0; i < N; i++) { const th = Math.PI - (i + 0.5) * (Math.PI / N), [x, z] = W(Math.cos(th) * R); p.rbox(x, Math.sin(th) * R + 0.05 - 0.09, z, 0.2, 0.2, 0.26, COLS[Math.min(3, Math.floor(i / (N / 4)))][i % 2], Math.PI / 4); }
    for (const s of [-R, R]) { const [x, z] = W(s); p.rbox(x, -0.02, z, 0.26, 0.12, 0.32, '#8a94a3', Math.PI / 4); }
    [0, 1, 2, 3].forEach((q) => {
      const th = Math.PI - (q + 0.5) * (Math.PI / 4), [x, z] = W(Math.cos(th) * (R + 0.28), 0.05), [sx, sy] = p.p(x, Math.sin(th) * (R + 0.28) + 0.05, z), g = p.ctx, r = p.k * 0.1; g.save(); g.translate(sx, sy);
      if (q === 0) { g.fillStyle = '#ff8fb6'; for (let a = 0; a < 5; a++) { g.beginPath(); g.arc(Math.cos(a * 1.257) * r * 0.55, Math.sin(a * 1.257) * r * 0.55, r * 0.45, 0, 7); g.fill(); } g.fillStyle = '#ffd23a'; g.beginPath(); g.arc(0, 0, r * 0.35, 0, 7); g.fill(); }
      if (q === 1) { g.strokeStyle = '#ffbf1f'; g.lineWidth = r * 0.22; for (let a = 0; a < 8; a++) { g.beginPath(); g.moveTo(Math.cos(a * 0.785) * r * 0.7, Math.sin(a * 0.785) * r * 0.7); g.lineTo(Math.cos(a * 0.785) * r * 1.05, Math.sin(a * 0.785) * r * 1.05); g.stroke(); } g.fillStyle = '#ffcc22'; g.beginPath(); g.arc(0, 0, r * 0.55, 0, 7); g.fill(); }
      if (q === 2) { g.rotate(-0.5); g.fillStyle = '#e0533a'; g.beginPath(); g.moveTo(0, -r); g.quadraticCurveTo(r * 0.9, -r * 0.2, 0, r); g.quadraticCurveTo(-r * 0.9, -r * 0.2, 0, -r); g.fill(); g.strokeStyle = '#a8321f'; g.lineWidth = r * 0.1; g.beginPath(); g.moveTo(0, -r * 0.8); g.lineTo(0, r * 1.2); g.stroke(); }
      if (q === 3) { g.strokeStyle = '#5aa9e6'; g.lineWidth = r * 0.18; g.lineCap = 'round'; for (let a = 0; a < 3; a++) { g.save(); g.rotate(a * 1.047); g.beginPath(); g.moveTo(0, -r); g.lineTo(0, r); g.moveTo(-r * 0.3, -r * 0.7); g.lineTo(0, -r * 0.45); g.lineTo(r * 0.3, -r * 0.7); g.moveTo(-r * 0.3, r * 0.7); g.lineTo(0, r * 0.45); g.lineTo(r * 0.3, r * 0.7); g.stroke(); g.restore(); } }
      g.restore();
    });
    const [ax, az] = W(0, 0.02); p.line3([[ax - 0.2, R - 0.12, az + 0.2], [ax - 0.2, R - 0.32, az + 0.2]], '#8a94a3', 0.008); p.line3([[ax + 0.2, R - 0.12, az - 0.2], [ax + 0.2, R - 0.32, az - 0.2]], '#8a94a3', 0.008);
    p.rbox(ax, R - 0.52, az, 0.75, 0.22, 0.04, '#26364a', Math.PI / 4); const [tx, tz] = W(0, 0.05); p.textD('START', tx, R - 0.41, tz, 0.15, '#ffffff');
  }, 0.3);
  L.add(...W(-1.5, -0.2), (p) => treeR(p, ...W(-1.5, -0.2), 'spring', 'broad', 1)); L.add(...W(1.5, -0.2), (p) => treeR(p, ...W(1.5, -0.2), 'winter', 'pine', 1));
  L.add(0.9, 0.9, (p) => { p.ellipseShadow(0.9, 0.9, 0.2, 0.14); [[0, 0, 4], [0.13, 0.05, 3], [-0.05, 0.13, 2]].forEach(([dx, dz, n]) => { for (let i = 0; i < n; i++) p.box(0.84 + dx, i * 0.035, 0.84 + dz, 0.12, 0.03, 0.12, C.gold, { edge: 'rgba(255,255,255,.4)' }); }); });
  L.flush(pen);
}
function island(p) {
  const ring = []; for (let i = 0; i <= 48; i++) { const a = (i / 48) * 6.283, rr = 1.2 * (1 + Math.sin(a * 5) * 0.035); ring.push([Math.cos(a) * rr, 0.004, Math.sin(a) * rr]); } p.line3(ring, 'rgba(255,255,255,.8)', 0.04);
  const { hash, wp } = p.u, cs = 0.18, cells = [];
  for (let x = -1.1; x <= 1.1; x += cs) for (let z = -1.1; z <= 1.1; z += cs) {
    if (Math.hypot(x, z) * (1 + (hash(x, z) - 0.5) * 0.12) > 1.02) continue; let h = 0.09, top = C.sand, side = '#dcc08a';
    if (Math.hypot(x + 0.12, z + 0.12) < 0.62) { h = 0.18; top = hash(z, x) > 0.5 ? '#8fd06a' : '#86c862'; side = '#b98a5c'; }
    const rr = Math.hypot(x + 0.45, z + 0.45); if (rr < 0.42) { h = 0.18 + Math.round(((0.42 - rr) * 1.6) / 0.08) * 0.08; top = '#c9c3b4'; side = '#aaa394'; }
    cells.push({ x, z, h, top, side });
  }
  p.ellipseShadow(0.05, 0.05, 1.05, 0.1); p.terrain(cells, cs);
  const P3 = (s, n, y) => { const [x, z] = wp(s, n); return [x, y, z]; };
  palm(p, ...wp(-0.5, -0.45), 1.0, 0.06); palm(p, ...wp(0.5, -0.45), 0.95, -0.04);
  const hy = 0.18, [hx, hz] = wp(0, -0.14), R2 = (s, n, y) => { const [x, yy, z] = P3(s, n, y); return [x + hx, yy, z + hz]; };
  p.rbox(hx, hy, hz, 0.4, 0.22, 0.3, '#d9b77f', Math.PI / 4); p.poly([R2(-0.06, 0.151, hy), R2(0.06, 0.151, hy), R2(0.06, 0.151, hy + 0.17), R2(-0.06, 0.151, hy + 0.17)], '#6b4a30');
  p.poly([R2(-0.26, -0.21, hy + 0.2), R2(0.26, -0.21, hy + 0.2), R2(0.26, 0, hy + 0.44), R2(-0.26, 0, hy + 0.44)], '#c9a24e'); p.poly([R2(-0.26, 0.21, hy + 0.2), R2(0.26, 0.21, hy + 0.2), R2(0.26, 0, hy + 0.44), R2(-0.26, 0, hy + 0.44)], '#e8c26a');
  palm(p, ...wp(-0.74, 0.02), 0.85, 0.08); palm(p, ...wp(0.74, 0.02), 0.8, -0.06);
  const Lt = { S: [[1, 0], [2, 0], [0, 1], [1, 2], [2, 3], [0, 4], [1, 4]], O: [[1, 0], [0, 1], [2, 1], [0, 2], [2, 2], [0, 3], [2, 3], [1, 4]] };
  'SOS'.split('').forEach((ch, k) => Lt[ch].forEach(([gx, gy]) => { const [x, z] = wp(-0.25 + k * 0.18 + gx * 0.05, 0.5 + gy * 0.05); p.box(x - 0.018, 0.09, z - 0.018, 0.036, 0.025, 0.036, '#8a94a3', { edge: null }); }));
  p.rbox(...P3(0.68, 0.3, 0.05), 0.42, 0.1, 0.16, '#9a6a42', Math.PI / 4 + 0.35, 0.18);
  { const [x, z] = wp(-0.64, 0.3); p.box(x - 0.07, 0.09, z - 0.07, 0.14, 0.14, 0.14, '#c08a55'); p.box(x - 0.04, 0.23, z - 0.04, 0.1, 0.1, 0.1, '#c08a55'); }
  const [fx, fz] = wp(0, 0.24); p.box(fx - 0.1, 0.18, fz - 0.1, 0.2, 0.04, 0.2, '#8a94a3', { edge: null }); p.poly([[fx - 0.06, 0.22, fz], [fx + 0.06, 0.22, fz], [fx, 0.42, fz]], '#ff8a1a'); p.poly([[fx - 0.035, 0.22, fz], [fx + 0.035, 0.22, fz], [fx, 0.34, fz]], '#ffe066');
}
function arena(pen0, c) {
  const p = pen0.at(-0.3, 0, -0.3), X0 = -1.25, X1 = 0.65, Z0 = -1.25, Z1 = 0.65, ST = 0.13, NS = 4;
  const crowd = (x0, x1, z0, z1, y, along) => { let n = 0; for (let s = 0.06; s < (along === 'x' ? x1 - x0 : z1 - z0) - 0.03; s += 0.075) { const col = ['#f08a3c', '#e0533a', '#f6b93b', PL[1], PL[4], '#ffffff'][(n++ * 7 + Math.round(y * 50)) % 6]; if (along === 'x') p.box(x0 + s, y, (z0 + z1) / 2 - 0.02, 0.04, 0.05, 0.04, col, { edge: null }); else p.box((x0 + x1) / 2 - 0.02, y, z0 + s, 0.04, 0.05, 0.04, col, { edge: null }); } };
  p.shadow(X0, Z0, X1 - X0, Z1 - Z0, 0.6, 0.12); p.box(X0, 0, Z0, X1 - X0, 0.04, Z1 - Z0, '#79c25a', { top: '#86cf66', edge: null });
  const mx = (X0 + 0.55 + X1 - 0.2) / 2, mz = (Z0 + 0.55 + Z1 - 0.2) / 2;
  p.line3([[X0 + 0.58, 0.043, Z0 + 0.58], [X1 - 0.22, 0.043, Z0 + 0.58], [X1 - 0.22, 0.043, Z1 - 0.22], [X0 + 0.58, 0.043, Z1 - 0.22], [X0 + 0.58, 0.043, Z0 + 0.58]], '#ffffff', 0.014);
  p.line3(Array.from({ length: 25 }, (_, i) => [mx + Math.cos((i / 24) * 6.283) * 0.17, 0.043, mz + Math.sin((i / 24) * 6.283) * 0.17]), '#ffffff', 0.012);
  for (let k = 0; k < NS; k++) { const h = 0.48 - k * 0.1; p.box(X0 + k * ST, 0, Z0, ST, h, Z1 - Z0, C.stone); crowd(X0 + k * ST, X0 + (k + 1) * ST, Z0 + NS * ST, Z1, h, 'z'); }
  for (let k = 0; k < NS; k++) { const h = 0.48 - k * 0.1; p.box(X0 + NS * ST, 0, Z0 + k * ST, X1 - X0 - NS * ST, h, ST, C.stone); crowd(X0 + NS * ST, X1, Z0 + k * ST, Z0 + (k + 1) * ST, h, 'x'); }
  p.box(-0.1, 0.48, Z0 + 0.02, 0.6, 0.3, 0.06, C.navy); p.quadZ(Z0 + 0.081, -0.05, 0.45, 0.53, 0.73, '#1f2a3d'); p.textZ('2 : 1', 0.2, 0.63, Z0 + 0.082, 0.13, '#ffd23a');
  p.box(X1 - 0.06, 0, Z0 + NS * ST, 0.06, 0.12, Z1 - Z0 - NS * ST, C.stone2); p.box(X0 + NS * ST, 0, Z1 - 0.06, X1 - X0 - NS * ST - 0.06, 0.12, 0.06, C.stone2);
  for (const [x, z] of [[X0 - 0.08, Z0 - 0.08], [X1 + 0.02, Z0 - 0.08], [X0 - 0.08, Z1 + 0.02]]) { p.box(x, 0, z, 0.05, 1.05, 0.05, '#8a94a3'); p.box(x - 0.08, 1.02, z - 0.02, 0.2, 0.12, 0.08, '#eef0f3'); }
  p.box(mx - 0.08, 0.04, mz - 0.08, 0.16, 0.06, 0.16, '#ffffff'); p.rbox(mx, 0.1, mz, 0.08, 0.04, 0.08, C.gold, 0.5); p.rbox(mx, 0.14, mz, 0.03, 0.08, 0.03, C.gold, 0.5); p.rbox(mx, 0.22, mz, 0.13, 0.12, 0.13, C.gold, 0.5);
  const L = c.layer();
  [[0.85, 0.5, 0], [0.5, 0.9, 1], [1.1, 0.95, 2], [1.15, -0.3, 1], [-0.3, 1.15, 0]].forEach(([x, z, v]) => L.add(x, z, (q) => treeK(q, x, z, 'autumn', 'broad', 1.0, v)));
  L.add(0.95, -0.95, (q) => leafPile(q, 0.95, -0.95, 1.6)); L.add(-1.0, 1.0, (q) => leafPile(q, -1.0, 1.0, 1.4)); L.flush(pen0);
}
function balloon(p, x, y, z, c1, c2, s = 1) {
  p.box(x - 0.07 * s, y, z - 0.07 * s, 0.14 * s, 0.1 * s, 0.14 * s, C.wood, { edge: null });
  for (const [dx, dz] of [[-0.06, -0.06], [0.06, -0.06], [-0.06, 0.06], [0.06, 0.06]]) p.line3([[x + dx * s, y + 0.1 * s, z + dz * s], [x + dx * 2 * s, y + 0.36 * s, z + dz * 2 * s]], 'rgba(90,74,58,.8)', 0.005);
  [0.24, 0.4, 0.52, 0.58, 0.58, 0.52, 0.38, 0.2].forEach((w, k) => p.box(x - (w * s) / 2, y + (0.36 + k * 0.09) * s, z - (w * s) / 2, w * s, 0.09 * s, w * s, [c1, c1, c2, c1, c1, c2, c1, c1][k], { edge: null }));
}
function balloonField(pen, c) {
  const O = [-0.3, -0.3]; pen.flatEllipse(O[0], 0.006, O[1], 0.75, 0.75, '#e2534a'); pen.flatEllipse(O[0], 0.008, O[1], 0.66, 0.66, '#ffffff'); pen.flatEllipse(O[0], 0.01, O[1], 0.2, 0.2, '#e2534a');
  const L = c.layer();
  L.add(O[0], O[1], (p) => { for (const [dx, dz] of [[-0.55, 0], [0.55, 0], [0, -0.55], [0, 0.55]]) { p.box(O[0] + dx - 0.02, 0, O[1] + dz - 0.02, 0.04, 0.1, 0.04, C.wood2, { edge: null }); p.line3([[O[0] + dx, 0.08, O[1] + dz], [O[0] + dx * 0.2, 0.36, O[1] + dz * 0.2]], 'rgba(90,74,58,.7)', 0.004); } balloon(p, O[0], 0.02, O[1], '#ef5a3c', '#ffd23a', 1.3); });
  L.add(0.6, -0.9, (p) => balloon(p, 0.6, 1.15, -0.9, '#2c8ff0', '#ffffff', 0.8), 3); L.add(-1.0, 0.5, (p) => balloon(p, -1.0, 1.55, 0.5, '#8a63e8', '#7fe3d2', 0.65), 3);
  L.add(0.9, 0.6, (p) => treeK(p, 0.9, 0.6, 'winter', 'pine', 1.1)); L.add(0.5, 1.0, (p) => treeK(p, 0.5, 1.0, 'winter', 'pine', 0.9));
  L.add(0.95, 0.05, (p) => { p.box(0.93, 0, 0.03, 0.04, 0.5, 0.04, C.wood2, { edge: null }); p.rbox(0.95, 0.38, 0.05, 0.4, 0.12, 0.03, '#26364a', -Math.PI / 4); });
  L.flush(pen);
}

/* ---------- Chance: hộp quà (10 B), Tax: ngân khố (11 C) ---------- */
function snowAt(p, s) { if (s === 'autumn') { pumpkin(p, 0.42, 0.32, 1); leafPile(p, -0.4, 0.35, 0.8); } if (s === 'summer') { const pts = []; for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283, r = i % 2 ? 0.025 : 0.065; pts.push([0.4 + Math.cos(a) * r, 0.006, 0.35 + Math.sin(a) * r]); } p.poly(pts, '#ff7a3c'); } if (s === 'winter') snowMound(p, 0.4, 0.35, 0.12, 0.08, 0.04); }
function gift(pen, c) {
  const p = pen.at(0, 0, c.gz), s = sea(c), col = { spring: '#f27aa6', summer: '#1fb5d6', autumn: '#f07a2a', winter: '#7b86e0' }[s], rib = { spring: '#ffffff', summer: '#ffbf1f', autumn: '#ffe08a', winter: '#ffffff' }[s], W = 0.46;
  p.ellipseShadow(0, 0, 0.36, 0.16); p.box(-W / 2, 0, -W / 2, W, 0.36, W, col, { edge: 'rgba(255,255,255,.3)' }); p.quadZ(W / 2 + 0.001, -0.04, 0.04, 0, 0.36, rib); p.quadX(W / 2 + 0.001, -0.04, 0.04, 0, 0.36, rib);
  if (s === 'winter') p.box(-W / 2 - 0.01, 0.36, -W / 2 - 0.01, W + 0.02, 0.015, W + 0.02, '#ffffff', { edge: null });
  p.rbox(0.04, 0.62, -0.04, 0.52, 0.09, 0.52, col, 0.3, 0.35); p.rbox(0.08, 0.72, -0.06, 0.1, 0.1, 0.06, rib, 0.9, 0.4); p.rbox(-0.02, 0.73, -0.02, 0.1, 0.1, 0.06, rib, -0.3, -0.4);
  const r = c.rng(SS.indexOf(s) + 1); for (let i = 0; i < 16; i++) { const a = r() * 6.283, d = 0.15 + r() * 0.35; p.rbox(Math.cos(a) * d, 0.45 + r() * 0.6, Math.sin(a) * d, 0.04, 0.04, 0.008, PL[i % 6], r() * 3, r() * 3); }
  snowAt(p, s);
  const [qx, qy] = p.p(0, 1.2, 0), g = p.ctx; g.save(); g.font = `900 ${p.k * 0.5}px ${c.font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = p.k * 0.05; g.strokeStyle = '#a65f12'; g.lineJoin = 'round'; g.strokeText('?', qx, qy); g.fillStyle = '#ffb93a'; g.fillText('?', qx, qy); g.restore();
}
function treasury(pen, c) {
  const p = pen.at(0, 0, c.gz);
  p.shadow(-0.5, -0.4, 1.0, 0.75, 0.9); p.box(-0.5, 0, -0.4, 1.0, 0.06, 0.8, C.stone); p.box(-0.45, 0.06, -0.38, 0.9, 0.05, 0.72, C.stone2);
  p.box(-0.38, 0.11, -0.36, 0.76, 0.55, 0.4, '#e9e4d8'); p.quadZ(0.041, -0.08, 0.08, 0.11, 0.42, '#5a3b27');
  for (const x of [-0.33, -0.12, 0.12, 0.33]) p.cyl(x, 0.11, 0.2, 0.045, 0.52, '#ffffff');
  p.box(-0.42, 0.63, -0.38, 0.84, 0.1, 0.66, '#f2eee4'); p.textZ('TAX', 0, 0.68, 0.282, 0.08, '#6b7685');
  p.poly([[-0.44, 0.73, 0.28], [0.44, 0.73, 0.28], [0, 0.95, 0.28]], '#f2eee4'); p.poly([[0.44, 0.73, 0.28], [0.44, 0.73, -0.38], [0, 0.95, -0.38], [0, 0.95, 0.28]], '#d9d3c4');
  p.poly([[-0.3, 0.8, 0.285], [0.3, 0.8, 0.285], [0, 0.93, 0.285]], '#ffffff'); p.poly([[0.46, 0.74, 0.3], [0.46, 0.74, -0.4], [0.02, 0.97, -0.4], [0.02, 0.97, 0.3]], 'rgba(255,255,255,.95)');
  snowMound(p, -0.55, 0.42, 0.12, 0.08, 0.04); coins(p, 0.55, 0.4, 3);
}

/* ---------- giữa bàn: hội chợ bốn mùa (13) ---------- */
function stall(p, x, z, col, goods, snow) {
  p.shadow(x - 0.22, z - 0.15, 0.44, 0.3, 0.4, 0.12); p.box(x - 0.22, 0, z - 0.12, 0.44, 0.18, 0.24, '#c08a55', { edge: null });
  for (const dx of [-0.2, 0.18]) p.box(x + dx, 0, z + 0.1, 0.02, 0.42, 0.02, C.wood2, { edge: null });
  for (let i = 0; i < 4; i++) p.rbox(x - 0.165 + i * 0.11, 0.4, z + 0.04, 0.11, 0.025, 0.36, i % 2 ? '#ffffff' : col, 0, 0);
  if (snow) p.box(x - 0.23, 0.425, z - 0.14, 0.46, 0.02, 0.36, '#ffffff', { edge: null });
  goods(p, x, 0.18, z);
}
const pots = (cols) => (p, x, y, z) => cols.forEach((c, i) => { const gx = x - 0.14 + i * 0.09; p.box(gx - 0.025, y, z + 0.02, 0.05, 0.04, 0.05, '#b8643a', { edge: null }); p.ball(gx, y + 0.08, z + 0.045, 0.04, c); });
const boxes = (cols) => (p, x, y, z) => cols.forEach((c, i) => p.box(x - 0.16 + i * 0.1, y, z - 0.02, 0.07, 0.05, 0.08, c, { edge: null }));
const post = (p, x, z, h, col = C.wood2) => p.box(x - 0.015, 0, z - 0.015, 0.03, h, 0.03, col, { edge: null });
function kumquat(p, x, z) { p.box(x - 0.08, 0, z - 0.08, 0.16, 0.1, 0.16, '#c0392b', { edge: null }); p.box(x - 0.012, 0.1, z - 0.012, 0.024, 0.1, 0.024, '#7a5238', { edge: null }); p.ball(x, 0.3, z, 0.15, '#3f8a3c'); const r = p.u.rng(Math.round(x * 31 + z * 17 + 80)); for (let i = 0; i < 9; i++) { const a = r() * 6.28, b = r() * 1.2 - 0.3; p.disc(x + Math.cos(a) * 0.12, 0.3 + b * 0.12, z + Math.sin(a) * 0.12 + 0.03, 0.022, '#ff9a1a'); } }
function lionDance(p, x, z) { p.ellipseShadow(x, z, 0.35, 0.14); for (let i = 0; i < 4; i++) p.rbox(x - 0.1 - i * 0.12, 0.1 + Math.sin(i) * 0.03, z + i * 0.04, 0.14, 0.16, 0.2, i % 2 ? '#ffd23a' : '#e2342a', 0.3); p.rbox(x + 0.08, 0.12, z, 0.22, 0.22, 0.24, '#e2342a', 0.3); p.rbox(x + 0.17, 0.3, z - 0.03, 0.06, 0.08, 0.22, '#ffd23a', 0.3); for (const dz of [-0.07, 0.07]) p.disc(x + 0.2, 0.25, z + dz, 0.025, '#ffffff'); p.rbox(x + 0.06, 0.34, z, 0.14, 0.04, 0.2, '#ffffff', 0.3); for (let i = 0; i < 4; i++) p.box(x - 0.1 - i * 0.12, 0, z + i * 0.04 - 0.01, 0.03, 0.08, 0.03, C.navy, { edge: null }); }
function kite(p, hx, hz, kx, ky, kz, c1, c2) { p.line3(Array.from({ length: 13 }, (_, i) => { const u = i / 12; return [hx + (kx - hx) * u, 0.16 + (ky - 0.16) * u - Math.sin(u * Math.PI) * 0.12, hz + (kz - hz) * u]; }), 'rgba(70,70,70,.55)', 0.004); const [sx, sy] = p.p(kx, ky, kz), g = p.ctx, R = p.k * 0.13; g.fillStyle = c1; g.beginPath(); g.moveTo(sx, sy - R); g.lineTo(sx + R * 0.7, sy); g.lineTo(sx, sy + R * 1.2); g.lineTo(sx - R * 0.7, sy); g.closePath(); g.fill(); g.fillStyle = c2; g.beginPath(); g.moveTo(sx, sy - R); g.lineTo(sx + R * 0.7, sy); g.lineTo(sx, sy); g.closePath(); g.fill(); g.beginPath(); g.moveTo(sx - R * 0.7, sy); g.lineTo(sx, sy + R * 1.2); g.lineTo(sx, sy); g.closePath(); g.fill(); g.strokeStyle = c2; g.lineWidth = Math.max(1, p.k * 0.008); g.beginPath(); g.moveTo(sx, sy + R * 1.2); for (let i = 1; i <= 4; i++) g.lineTo(sx + Math.sin(i * 1.4) * R * 0.3, sy + R * 1.2 + i * R * 0.35); g.stroke(); }
function picnicMat(p, x, z, col) { p.ground(x - 0.25, z - 0.18, x + 0.25, z + 0.18, col, 0.005); p.ground(x - 0.25, z - 0.02, x + 0.25, z + 0.02, '#ffffff', 0.006); p.box(x - 0.06, 0, z - 0.05, 0.12, 0.08, 0.1, '#c08a55', { edge: null }); }
function carpLantern(p, x, z) { post(p, x, z, 0.5); post(p, x + 0.6, z, 0.5); p.line3([[x, 0.5, z], [x + 0.6, 0.5, z]], '#5a3b27', 0.008); const cx = x + 0.3; p.rbox(cx, 0.28, z, 0.36, 0.16, 0.12, '#ff8a1a', 0); p.rbox(cx + 0.18, 0.3, z, 0.06, 0.12, 0.1, '#ffb63a', 0); p.poly([[cx - 0.18, 0.36, z], [cx - 0.34, 0.46, z], [cx - 0.3, 0.32, z], [cx - 0.34, 0.2, z]], '#e2342a'); p.disc(cx + 0.14, 0.38, z + 0.061, 0.02, '#ffffff'); p.line3([[cx, 0.44, z], [cx, 0.5, z]], '#5a3b27', 0.006); }
function xmasTree(p, x, z, k = 1.4) { p.ellipseShadow(x, z, 0.3 * k, 0.14); p.box(x - 0.04 * k, 0, z - 0.04 * k, 0.08 * k, 0.12 * k, 0.08 * k, '#7a5238', { edge: null }); [[0.5, 0.1], [0.38, 0.3], [0.26, 0.5], [0.15, 0.68]].forEach(([w, y], i) => { p.box(x - (w * k) / 2, y * k, z - (w * k) / 2, w * k, 0.2 * k, w * k, ['#2f6b55', '#367a60', '#3f866a', '#479272'][i], { edge: null }); for (let j = 0; j < 4; j++) p.box(x + ((j % 2 ? 1 : -0.3) * w * k) / 2 - 0.015, (y + 0.06 + (j % 2) * 0.08) * k, z + (w * k) / 2 - 0.01, 0.03, 0.03, 0.02, PL[(i + j) % 6], { edge: null }); }); const [sx, sy] = p.p(x, 0.98 * k, z), g = p.ctx, R = p.k * 0.08 * k; g.fillStyle = '#ffd23a'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? R * 0.45 : R; g.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } g.closePath(); g.fill(); }
function iceSculpture(p, x, z) { const g = p.ctx; g.globalAlpha = 0.8; p.box(x - 0.18, 0, z - 0.14, 0.36, 0.08, 0.28, '#d6f0fb', { edge: 'rgba(255,255,255,.8)' }); p.rbox(x, 0.08, z, 0.26, 0.14, 0.16, '#c5e9f8', 0.3); p.rbox(x + 0.1, 0.22, z - 0.03, 0.05, 0.22, 0.05, '#d6f0fb', 0.3, -0.25); p.rbox(x + 0.16, 0.42, z - 0.05, 0.1, 0.05, 0.05, '#e6f6ff', 0.3); p.rbox(x - 0.08, 0.2, z + 0.03, 0.18, 0.08, 0.04, '#e6f6ff', 0.3, 0.5); g.globalAlpha = 1; }
function stringLights(p, a, b, n = 12) { const at = (u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - Math.sin(u * Math.PI) * 0.15, a[2] + (b[2] - a[2]) * u]; p.line3(Array.from({ length: 17 }, (_, i) => at(i / 16)), 'rgba(60,50,40,.6)', 0.005); for (let i = 1; i < n; i++) { const [sx, sy] = p.p(...at(i / n)), g = p.ctx; g.fillStyle = ['#ffe58a', '#ff9cc0', '#9be0ff', '#ffd27a'][i % 4]; g.beginPath(); g.arc(sx, sy + 2, Math.max(1.5, p.k * 0.018), 0, 7); g.fill(); } }
const FAIR = {
  spring(A, W) {
    [-1.05, -0.35, 0.35, 1.05].forEach((u, i) => A(u, 3.5, (p, x, z) => stall(p, x, z, ['#e2342a', '#ffd23a', '#f27aa6', '#e2342a'][i], pots(['#ff9cc0', '#ffd23a', '#ffffff', '#ff7aa8']))));
    [-1.05, -0.35, 0.35, 1.05].forEach((u, i) => A(u, 5.15, (p, x, z) => (i % 2 ? kumquat(p, x, z) : blossomTree(p, x, z, 0.85, i === 0 ? '#f48fb1' : '#ffd23a'))));
    A(0, 4.35, (p, x, z) => lionDance(p, x, z)); [[-2.2, 4.4], [2.2, 4.4], [-3.3, 5.3], [3.3, 5.3]].forEach(([u, v]) => A(u, v, (p, x, z) => kumquat(p, x, z)));
    [[-2.4, 5.5], [2.4, 5.5]].forEach(([u, v]) => A(u, v, (p, x, z) => treeV(p, x, z, 'spring', 'broad', 1.1, 0)));
  },
  summer(A, W) {
    [-1.0, 0, 1.0].forEach((u, i) => A(u, 3.3, (p, x, z) => stall(p, x, z, ['#1fb5d6', '#ffbf1f', '#43a047'][i], boxes(i === 1 ? ['#ff5a3c', '#ffd23a', '#1fb5d6', '#ff9cc0'] : ['#ffffff', '#ff9cc0', '#ffd23a', '#9be0ff']))));
    [[-1.8, 4.5, '#e2342a', '#ffd23a'], [-0.6, 5.0, '#1e88e5', '#ffffff'], [0.7, 4.4, '#8e24aa', '#7fe3d2'], [1.9, 5.0, '#43a047', '#ffbf1f'], [0.0, 5.45, '#f27aa6', '#ffffff']].forEach(([u, v, c1, c2], i) => A(u, v, (p, x, z) => { figure(p, x, z, PL[i % 6], 0.5); const [kx, kz] = W(u + (i % 2 ? 0.35 : -0.35), v - 0.6); kite(p, x, z, kx, 1.25 + (i % 3) * 0.25, kz, c1, c2); }, 2));
    [[-2.6, 4.3, '#e2534a'], [2.7, 4.4, '#1fb5d6']].forEach(([u, v, col]) => A(u, v, (p, x, z) => picnicMat(p, x, z, col)));
    [[-3.6, 5.4], [3.6, 5.4], [-2.6, 5.5], [2.6, 5.6]].forEach(([u, v], i) => A(u, v, (p, x, z) => treeV(p, x, z, 'summer', 'broad', 1.05, i)));
  },
  autumn(A, W) {
    [[-1.9, 3.75], [1.9, 3.75], [-1.9, 5.0], [1.9, 5.0]].forEach(([u, v]) => A(u, v, (p, x, z) => post(p, x, z, 0.8)));
    A(0, 4.35, (p) => { for (const v of [3.75, 5.0]) { const [x0, z0] = W(-1.9, v), [x1, z1] = W(1.9, v); p.bunting([x0, 0.78, z0], [x1, 0.78, z1], ['#e2342a', '#ff8a1a', '#ffd23a'], 0.15, 11, true); } }, 1);
    [-1.25, 0, 1.25].forEach((u, i) => A(u, 4.4, (p, x, z) => stall(p, x, z, ['#f07a2a', '#c43a3a', '#f6b93b'][i], boxes(['#d9944a', '#c98a4b', '#e0a860', '#d9944a']))));
    [-0.9, 0.3].forEach((u) => A(u + 0.3, 3.25, (p, x, z) => carpLantern(p, x - 0.3, z)));
    [[-2.6, 5.5], [2.6, 5.5], [-3.9, 5.5], [3.9, 5.5], [-3.0, 4.6], [3.0, 4.6]].forEach(([u, v], i) => A(u, v, (p, x, z) => treeV(p, x, z, 'autumn', 'broad', 1.1, i)));
  },
  winter(A, W) {
    A(0, 4.4, (p, x, z) => xmasTree(p, x, z, 1.8));
    [[-1.7, 3.5], [-2.1, 4.5], [-1.1, 5.35], [1.7, 3.5], [2.1, 4.5], [1.1, 5.35]].forEach(([u, v], i) => A(u, v, (p, x, z) => stall(p, x, z, ['#c43a3a', '#2f9e6a'][i % 2], boxes(['#ffd27a', '#e2534a', '#ffffff', '#8fd0f0']), true)));
    A(0, 3.0, (p, x, z) => iceSculpture(p, x, z)); [[-2.6, 3.6], [-2.6, 5.5], [2.6, 3.6], [2.6, 5.5]].forEach(([u, v]) => A(u, v, (p, x, z) => post(p, x, z, 0.72, C.navy)));
    for (const u of [-2.6, 2.6]) A(u, 4.55, (p) => { const [x0, z0] = W(u, 3.6), [x1, z1] = W(u, 5.5); stringLights(p, [x0, 0.7, z0], [x1, 0.7, z1]); }, 1);
    [[-3.6, 5.4], [3.6, 5.4], [-3.3, 4.4], [3.3, 4.4]].forEach(([u, v]) => A(u, v, (p, x, z) => treeV(p, x, z, 'winter', 'pine', 1.0))); A(1.0, 3.0, (p, x, z) => snowman(p, x, z, 1.3, true));
  },
};
const PLAZA = 2.2;
function fairGround(g, c) {
  const { T, px } = c, [cx, cy] = T(0, 0), h = c.half;
  for (const [x, z] of [[h, h], [-h, h], [-h, -h], [h, -h]]) { g.lineCap = 'round'; g.strokeStyle = '#cfc4a8'; g.lineWidth = 0.42 * px; g.beginPath(); g.moveTo(cx, cy); g.lineTo(...T(x * 0.96, z * 0.96)); g.stroke(); g.strokeStyle = '#ece3cc'; g.lineWidth = 0.32 * px; g.stroke(); }
  g.fillStyle = '#d6ccb2'; g.beginPath(); g.arc(cx, cy, (PLAZA + 0.12) * px, 0, 7); g.fill();
  SS.forEach((s, i) => { const a0 = Math.PI * (0.25 + i * 0.5); g.fillStyle = SEA[s].acc; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, PLAZA * px, a0, a0 + Math.PI / 2); g.closePath(); g.fill(); });
  g.fillStyle = '#f1ebdc'; g.beginPath(); g.arc(cx, cy, (PLAZA - 0.22) * px, 0, 7); g.fill(); g.strokeStyle = 'rgba(170,155,120,.35)'; g.lineWidth = 3; for (let r = 0.5; r < PLAZA - 0.3; r += 0.5) { g.beginPath(); g.arc(cx, cy, r * px, 0, 7); g.stroke(); }
  // thảm chợ trong tam giác mùa (thụt 0.35 khỏi ranh giới)
  const rect = (s, u0, v0, u1, v1, col, border) => { const W = (u, v) => T(...c.toWorld(s, u, v)), k = 0.35 * Math.SQRT2; g.save(); g.beginPath(); [[-(h - k), h], [h - k, h], [0, k]].forEach(([u, v], i) => (i ? g.lineTo(...W(u, v)) : g.moveTo(...W(u, v)))); g.closePath(); g.clip(); g.beginPath(); [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].forEach(([u, v], i) => (i ? g.lineTo(...W(u, v)) : g.moveTo(...W(u, v)))); g.closePath(); g.fillStyle = col; g.fill(); if (border) { g.strokeStyle = border; g.lineWidth = 6; g.stroke(); } if (s === 1) { const r = c.rng(77); for (let i = 0; i < 70; i++) { const [a, b] = W(-2.6 + r() * 5.2, 3.6 + r() * 2.1); g.fillStyle = ['#ffe14d', '#ffffff', '#ff9cc0'][i % 3]; g.beginPath(); g.arc(a, b, 3, 0, 7); g.fill(); } } g.restore(); };
  rect(0, -1.6, 3.05, 1.6, 5.55, '#d9473f', '#f5b934'); rect(1, -2.4, 3.9, 2.4, 5.6, '#a6dc8c'); rect(2, -2.2, 3.15, 2.2, 5.5, '#c9a77a', '#a8865a'); rect(3, -2.3, 3.2, 2.3, 5.55, '#dbe6f0', '#c4d4e3');
}
function fountain(p) {
  p.ellipseShadow(0, 0, 1.1, 0.12); const seg = (a) => { const d = ((a % 6.283) + 6.283) % 6.283; return SEA[d > 0.785 && d <= 2.356 ? 'spring' : d > 2.356 && d <= 3.927 ? 'summer' : d > 3.927 && d <= 5.498 ? 'autumn' : 'winter'].acc; };
  p.flatEllipse(0, 0.004, 0, 1.08, 1.08, '#d8d0bc'); p.flatEllipse(0, 0.16, 0, 0.98, 0.98, '#5fbfe6');
  for (let i = 0; i < 24; i++) { const a0 = (i / 24) * 6.283, a1 = ((i + 1) / 24) * 6.283, am = (a0 + a1) / 2; if (Math.cos(am) + Math.sin(am) < -0.3) continue; p.poly([[Math.cos(a0), 0, Math.sin(a0)], [Math.cos(a1), 0, Math.sin(a1)], [Math.cos(a1), 0.18, Math.sin(a1)], [Math.cos(a0), 0.18, Math.sin(a0)]], p.u.shade(seg(am), 0.85 + 0.1 * Math.cos(am - 0.3))); }
  p.line3(Array.from({ length: 49 }, (_, i) => [Math.cos((i / 48) * 6.283), 0.18, Math.sin((i / 48) * 6.283)]), '#f4efe6', 0.05);
  p.cyl(0, 0.16, 0, 0.14, 0.5, '#e6dece'); p.cyl(0, 0.62, 0, 0.5, 0.08, '#e6dece'); p.flatEllipse(0, 0.7, 0, 0.44, 0.44, '#7fd0f0'); p.cyl(0, 0.7, 0, 0.08, 0.36, '#e6dece'); p.cyl(0, 1.02, 0, 0.24, 0.05, '#e6dece'); p.flatEllipse(0, 1.07, 0, 0.2, 0.2, '#9be0ff');
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; if (Math.cos(a) + Math.sin(a) < -0.6) continue; p.line3([[Math.cos(a) * 0.45, 0.68, Math.sin(a) * 0.45], [Math.cos(a) * 0.7, 0.5, Math.sin(a) * 0.7], [Math.cos(a) * 0.82, 0.2, Math.sin(a) * 0.82]], 'rgba(205,238,255,.9)', 0.016); }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; p.line3([[0, 1.3, 0], [Math.cos(a) * 0.15, 1.22, Math.sin(a) * 0.15], [Math.cos(a) * 0.22, 1.06, Math.sin(a) * 0.22]], 'rgba(220,245,255,.95)', 0.014); }
  p.line3([[0, 1.06, 0], [0, 1.38, 0]], 'rgba(230,248,255,.95)', 0.03);
}
// tia nước chuyển động (ambient)
function fountainFx(p, t) {
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; if (Math.cos(a) + Math.sin(a) < -0.6) continue; for (let k = 0; k < 3; k++) { const u = (t * 0.9 + k / 3 + i * 0.07) % 1, r = 0.45 + u * 0.4; p.disc(Math.cos(a) * r, 0.68 + Math.sin(u * Math.PI) * 0.12 - u * 0.45, Math.sin(a) * r, 0.018, '#e8f8ff', 0.9 * (1 - u * 0.5)); } }
  for (let k = 0; k < 5; k++) { const u = (t * 1.2 + k / 5) % 1; p.disc(Math.sin(k * 2.4) * 0.06 * u, 1.1 + u * 0.32, Math.cos(k * 2.4) * 0.06 * u, 0.022, '#ffffff', 1 - u); }
}

export default defineSkin({
  id: 'four-seasons',
  packs: ['kenney-iso-buildings', 'kenney-nature'],
  cityLabelBand: 0.18,
  palette: {
    groups: { A: '#f27aa6', B: '#8fcf4f', C: '#ffbf1f', D: '#1fb5d6', E: '#f07a2a', F: '#c43a3a', G: '#7b86e0', H: '#3fb0e8' },
    ground: '#bde69c', priceStrip: '#c6cdd6', priceText: '#5b6676', labelText: '#ffffff',
    boardSide: '#7a5236', boardSideDark: '#5e3d27', boardTop: '#8a6040', tileSide: '#c89d7b', tileSideDark: '#a47c5d', water: '#8fd6ef', sand: '#f1dcaa', resortBand: '#7fd3dd',
  },
  zones: SS.map((s) => SEA[s]),
  slots: {
    tile: { paint: (g, c) => c.grass(g, 0, 0, c.cw, c.ch) },
    deco: { draw: backRow },
    house: {
      kind: 'kit',
      levels: [[[0, 0, ['128']]], [[0, 0, ['016'], '069']], [[0, 0, ['016', '047'], '082'], [1, 0, ['055']]], [[0, 0, ['016', '047', '047'], '083'], [1, 0, ['024', '051'], '090']], [[0, 0, ['016', '053', '053', '053']], [1, 0, ['000', '053', '053', '053']]]],
      under: (p, c) => { if (c.level) treeV(p, -c.w / 2 - 0.22, 0.05, sea(c), 'broad', 0.9, 1); },
      over: (p, c) => { const s = sea(c); if (c.level === 0) { treeV(p, 0.45, 0.3, s, 'broad', 0.86, 1); treeV(p, -0.45, 0.35, s, 'broad', 0.76, 1); } else if (c.level < 4) treeV(p, 0.1, 0.56, s, 'broad', 0.76, 1); },
    },
    resort: { paint: (g, c) => ({ spring: fancy('spring'), summer: sandPaint, autumn: fancy('autumn'), winter: fancy('winter') }[sea(c)](g, c)), draw: campsite },
    resortHouse: { draw: camp },
    chance: { paint: (g, c) => flat({ spring: '#fdeef3', summer: '#fff1d8', autumn: '#fbe4c4', winter: '#eef4fa' }[sea(c)])(g, c), draw: gift },
    tax: { paint: flat('#dceef3'), draw: treasury },
    start: { paint: (g, c) => { c.grass(g, 0, 0, c.cw, c.ch, 5, SEA.spring); g.globalAlpha = 0.92; g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(c.cw * 0.45, 0); g.lineTo(c.cw, 0); g.lineTo(c.cw, c.ch * 0.55); g.closePath(); g.fill(); g.globalAlpha = 1; }, label: [0.62, 0.62, 70, 0.8], draw: startArch },
    island: { paint: waterPaint, side: ['#7cc3e0', '#5fa9c9'], label: [0.7, 0.8, 33, 0.5], draw: island },
    festival: { paint: (g, c) => fancy('autumn')(g, c, 0, 0, c.cw, c.ch, 8), draw: arena },
    tour: { paint: (g, c) => fancy('winter')(g, c, 0, 0, c.cw, c.ch, 12), draw: balloonField },
    base: { draw: (p, c) => { const a = c.half + c.margin - 0.1, y = c.y + 0.002; p.line3([[-a, y, a], [a, y, a], [a, y, -a], [-a, y, -a], [-a, y, a]], c.palette.gold || '#f5b934', 0.03); for (const [x, z] of [[a - 0.02, a - 0.02], [-a + 0.02, a - 0.02], [a - 0.02, -a + 0.02]]) { const [sx, sy] = p.p(x, c.y, z), R = p.k * 0.16, g = p.ctx; g.fillStyle = '#f5b934'; g.beginPath(); g.moveTo(sx, sy - R * 0.5); g.lineTo(sx + R, sy); g.lineTo(sx, sy + R * 0.5); g.lineTo(sx - R, sy); g.closePath(); g.fill(); } } },
    center: {
      paint: fairGround,
      draw: (pen, c) => FAIR[c.zone.id]((u, v, fn, d = 0) => { const [x, z] = c.toWorld(u, v); c.add(x, z, (p) => fn(p, x, z), d); }, c.toWorld),
      core: fountain,
    },
  },
  ambient: { animate: { fountain: fountainFx } },
  labels: { resortLevels: ['Lều trại', 'Trại có hiên', 'Nhà gỗ', 'Glamping'] },
});

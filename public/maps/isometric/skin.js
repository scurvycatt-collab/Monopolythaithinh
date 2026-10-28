/* Skin Isometric — thành phố khối Kenney, đảo nhiệt đới, sân bay / núi / tàu lượn giữa bàn. Phong cách lấy từ mẫu Isometric gốc.
   13 slot: tile · deco (bỏ trống, bản gốc không có) · house · resort · resortHouse · start · island · festival · tour · chance · tax · base (mặc định) · center.
   Toạ độ, bút: docs/contracts/map-skin.md, public/js/render-common/board2d/PEN.md. */
import { defineSkin } from '../../js/render-common/board2d/skin.js';

const C = { stone: '#e2dccb', stone2: '#cfc7b1', wood: '#a87b4f', wood2: '#8a6040', navy: '#33415c', gold: '#f5b934', water: '#8fd6ef', steel: '#8a94a3', red: '#e2534a' };
const PL = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00acc1'];   // màu trang trí (khán giả, đèn), không phải màu người chơi
const G0 = [-0.72, -0.72];
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };

/* ---------- mặt phẳng ---------- */
const flat = (col) => (g, c) => { g.fillStyle = col; g.fillRect(0, 0, c.cw, c.ch); };
const sandPaint = (g, c) => { g.fillStyle = '#f7e2b5'; g.fillRect(0, 0, c.cw, c.ch); const wh = c.ch * 0.32; g.fillStyle = C.water; g.fillRect(0, 0, c.cw, wh); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(0, wh - 3, c.cw, 6); };
function seaPaint(g, c) { flat(C.water)(g, c); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2.2; for (let r = 0; r < 9; r++) { g.beginPath(); for (let i = 0; i <= 20; i++) { const x = (i / 20) * c.cw, y = r * (c.ch / 8) + Math.sin(i * 0.9 + r) * 5; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } }

/* ---------- vật dựng nhỏ ---------- */
function palm(p, x, z, s = 1, lean = 0.06) {
  p.ellipseShadow(x, z, 0.14 * s, 0.12); let tx = x, ty = 0;
  for (let i = 0; i < 5; i++) { p.box(tx - 0.035 * s, ty, z - 0.035 * s, 0.07 * s, 0.13 * s, 0.07 * s, i % 2 ? C.wood : '#b98a5c', { edge: null }); ty += 0.13 * s; tx += lean * s * 0.4; }
  const top = [tx, ty, z], leaf = (dx, dz, col) => { const L = 0.36 * s, w = 0.07 * s, m = [tx + dx * L * 0.5, ty + 0.03 * s, z + dz * L * 0.5]; p.poly([top, [m[0] - dz * w, m[1], m[2] + dx * w], [tx + dx * L, ty - 0.12 * s, z + dz * L], [m[0] + dz * w, m[1], m[2] - dx * w]], col); };
  [[-1, 0], [0, -1], [-0.7, 0.7], [0.7, -0.7]].forEach(([a, b]) => leaf(a, b, '#5ea83a')); [[1, 0], [0, 1], [0.7, 0.7]].forEach(([a, b]) => leaf(a, b, '#7fc24a'));
  p.box(tx - 0.04 * s, ty - 0.02 * s, z - 0.04 * s, 0.08 * s, 0.06 * s, 0.08 * s, '#6aa83d', { edge: null });
}
function parasol(p, x, z, hex, s = 1) { p.ellipseShadow(x, z, 0.2 * s, 0.1); p.box(x - 0.01 * s, 0, z - 0.01 * s, 0.02 * s, 0.4 * s, 0.02 * s, '#ffffff', { edge: null }); p.cone(x, 0.34 * s, z, 0.24 * s, 0.12 * s, hex); p.flatEllipse(x, 0.34 * s, z, 0.24 * s, 0.24 * s, p.u.light(hex, 0.3)); }
function lounger(p, x, z, hex, s = 1) { p.box(x - 0.1 * s, 0.03 * s, z - 0.05 * s, 0.2 * s, 0.03 * s, 0.1 * s, '#ffffff', { edge: null }); p.rbox(x - 0.08 * s, 0.07 * s, z, 0.08 * s, 0.02 * s, 0.1 * s, hex, 0, 0.5); }
function flagpole(p, x, z, h, col) { p.box(x - 0.012, 0, z - 0.012, 0.024, h, 0.024, C.steel, { edge: null }); p.box(x, h * 0.72, z - 0.01, h * 0.35, h * 0.26, 0.02, col, { edge: null }); }

/* ---------- ô trống: viên cỏ nhỏ bên mép sau (deco bỏ trống nên chỉ resort có vật) ---------- */
function beachDecor(pen, c) { const L = c.layer(); L.add(-0.45, -0.6, (p) => palm(p, -0.45, -0.6, 0.9, 0.05)); L.add(0.4, 0.1, (p) => { parasol(p, 0.4, 0.1, '#ffffff', 0.9); lounger(p, 0.15, 0.25, '#4fc0e8', 0.9); }); L.flush(pen); }
// nhà resort: bungalow/villa là khối Kenney, chòi dù (cấp 1) vẽ thêm bằng bút
const resortOver = (p, c) => {
  const k = c.level;
  if (k === 1) { parasol(p, 0.15, 0.05, c.color, 1.4); lounger(p, 0.05, 0.4, c.color, 1.2); lounger(p, 0.4, 0.3, c.color, 1.2); palm(p, -0.5, -0.35, 0.95); }
  if (k === 2) { lounger(p, 0.3, 0.5, c.color, 1.1); parasol(p, 0.5, 0.2, c.color, 0.9); palm(p, -0.65, 0.4, 0.9); }
  if (k === 3) { p.box(-0.55, 0, 0.55, 0.9, 0.03, 0.32, '#ece3cf'); p.ground(-0.48, 0.6, 0.28, 0.82, '#4fc0e8', 0.032); lounger(p, 0.5, 0.7, c.color); parasol(p, 0.55, 0.5, c.color, 0.8); palm(p, -0.8, 0.5, 0.9); }
  if (k === 4) { p.box(-0.7, 0, 0.55, 1.4, 0.03, 0.34, '#ece3cf'); p.ground(-0.6, 0.6, 0.2, 0.83, '#4fc0e8', 0.032); lounger(p, 0.4, 0.75, c.color); lounger(p, 0.65, 0.65, c.color); parasol(p, 0.5, 0.45, c.color, 0.75); palm(p, 0.9, -0.1, 0.9); palm(p, -0.9, -0.1, 0.85); }
};

/* ---------- Start: cổng chữ START, vạch đích, xu lương ---------- */
function startGate(pen, c) {
  const L = c.layer(), W = (s, n = 0) => pen.u.wp(s, n, ...G0), R = 1.12;
  for (let i = 0; i < 14; i++) for (let j = 0; j < 2; j++) { const s0 = -R + i * ((2 * R) / 14), s1 = s0 + (2 * R) / 14, n0 = -0.15 + j * 0.15, n1 = n0 + 0.15; pen.poly([W(s0, n0), W(s1, n0), W(s1, n1), W(s0, n1)].map(([x, z]) => [x, 0.004, z]), (i + j) % 2 ? '#26364a' : '#ffffff'); }
  const pillar = (s, j) => { const [x, z] = W(s); L.add(x, z, (p) => { for (let i = 0; i < 6; i++) p.rbox(x, i * 0.16, z, 0.22, 0.16, 0.22, i % 2 ? '#ffffff' : '#ec4f7c', Math.PI / 4); p.rbox(x, 0.96, z, 0.3, 0.06, 0.3, '#26364a', Math.PI / 4);
    for (let i = 0; i < 3; i++) { const bx = x + (i - 1) * 0.1, bz = z - (i - 1) * 0.1, by = 1.28 + (i % 2) * 0.14; p.line3([[x, 1.02, z], [bx, by - 0.1, bz]], '#ffffff', 0.006); p.disc(bx, by, bz, 0.075, PL[i + j * 3]); } }); };
  pillar(-R, 0); pillar(R, 1);
  L.add(G0[0], G0[1], (p) => { const [x, z] = W(0, 0.02); p.rbox(x, 0.78, z, 2 * R + 0.1, 0.24, 0.14, '#ec4f7c', Math.PI / 4); const [tx, tz] = W(0, 0.06); p.textD('START', tx, 0.9, tz, 0.17, '#ffffff'); }, 0.4);
  [[1.3, 0.05], [0.05, 1.3]].forEach(([x, z]) => L.add(x, z, (p) => { p.ellipseShadow(x, z, 0.2, 0.14); [[0, 0, 4], [0.13, 0.05, 3], [-0.05, 0.13, 2]].forEach(([dx, dz, n]) => { for (let i = 0; i < n; i++) p.box(x - 0.06 + dx, i * 0.035, z - 0.06 + dz, 0.12, 0.03, 0.12, C.gold, { edge: 'rgba(255,255,255,.4)' }); }); }));
  [[-1.4, -0.9], [-0.9, -1.4]].forEach(([x, z], i) => L.add(x, z, (p) => p.flagC(x, z, 0.85, PL[i * 2 + 1])));
  [[-1.42, -1.25], [-1.25, -1.42]].forEach(([x, z]) => L.add(x, z, (p) => p.cubeTree(x, z, 0.85)));
  L.flush(pen);
}

/* ---------- Lost Island: đảo cột khối, lều tranh, SOS ---------- */
function island(p) {
  const { wp } = p.u, cs = 0.18, cells = [];
  p.line3(Array.from({ length: 49 }, (_, i) => { const a = (i / 48) * 6.283, r = 1.25 * (1 + Math.sin(a * 5) * 0.035); return [Math.cos(a) * r, 0.004, Math.sin(a) * r]; }), '#ffffff', 0.04);
  for (let x = -1.1; x <= 1.1; x += cs) for (let z = -1.1; z <= 1.1; z += cs) {
    if (Math.hypot(x, z) * (1 + (hash(x, z) - 0.5) * 0.12) > 1.02) continue;
    let h = 0.09, top = '#f1dcaa', side = '#dcc08a';
    if (Math.hypot(x + 0.12, z + 0.12) < 0.62) { h = 0.18; top = hash(z, x) > 0.5 ? '#8fd06a' : '#86c862'; side = '#b98a5c'; }
    const rr = Math.hypot(x + 0.45, z + 0.45); if (rr < 0.42) { h = 0.18 + Math.round(((0.42 - rr) * 1.6) / 0.08) * 0.08; top = '#c9c3b4'; side = '#aaa394'; }
    cells.push({ x, z, h, top, side });
  }
  p.ellipseShadow(0.05, 0.05, 1.05, 0.1); p.terrain(cells, cs);
  const P3 = (s, n, y) => { const [x, z] = wp(s, n); return [x, y, z]; };
  palm(p, ...wp(-0.5, -0.45), 1.0, 0.06); palm(p, ...wp(0.5, -0.45), 0.95, -0.04);
  const hy = 0.18, [hx, hz] = wp(0, -0.14), R = (s, n, y) => { const [x, yy, z] = P3(s, n, y); return [x + hx, yy, z + hz]; };
  p.rbox(hx, hy, hz, 0.4, 0.22, 0.3, '#d9b77f', Math.PI / 4);
  p.poly([R(-0.06, 0.151, hy), R(0.06, 0.151, hy), R(0.06, 0.151, hy + 0.17), R(-0.06, 0.151, hy + 0.17)], '#6b4a30');
  p.poly([R(-0.26, -0.21, hy + 0.2), R(0.26, -0.21, hy + 0.2), R(0.26, 0, hy + 0.44), R(-0.26, 0, hy + 0.44)], '#c9a24e');
  p.poly([R(-0.26, 0.21, hy + 0.2), R(0.26, 0.21, hy + 0.2), R(0.26, 0, hy + 0.44), R(-0.26, 0, hy + 0.44)], '#e8c26a');
  palm(p, ...wp(-0.74, 0.02), 0.85, 0.08); palm(p, ...wp(0.74, 0.02), 0.8, -0.06);
  const Lt = { S: [[1, 0], [2, 0], [0, 1], [1, 2], [2, 3], [0, 4], [1, 4]], O: [[1, 0], [0, 1], [2, 1], [0, 2], [2, 2], [0, 3], [2, 3], [1, 4]] };
  'SOS'.split('').forEach((ch, k) => Lt[ch].forEach(([gx, gy]) => { const [x, z] = wp(-0.25 + k * 0.18 + gx * 0.05, 0.5 + gy * 0.05); p.box(x - 0.018, 0.09, z - 0.018, 0.036, 0.025, 0.036, C.steel, { edge: null }); }));
  p.rbox(...P3(0.68, 0.3, 0.05), 0.42, 0.1, 0.16, '#9a6a42', Math.PI / 4 + 0.35, 0.18);
  { const [x, z] = wp(-0.64, 0.3); p.box(x - 0.07, 0.09, z - 0.07, 0.14, 0.14, 0.14, '#c08a55'); p.box(x - 0.04, 0.23, z - 0.04, 0.1, 0.1, 0.1, '#c08a55'); }
  const [fx, fz] = wp(0, 0.24); p.box(fx - 0.1, 0.18, fz - 0.1, 0.2, 0.04, 0.2, C.steel, { edge: null }); p.poly([[fx - 0.06, 0.22, fz], [fx + 0.06, 0.22, fz], [fx, 0.42, fz]], '#ff8a1a'); p.poly([[fx - 0.035, 0.22, fz], [fx + 0.035, 0.22, fz], [fx, 0.34, fz]], '#ffe066');
}

/* ---------- Championships: sân vận động ---------- */
function arena(pen0, c) {
  const p = pen0.at(-0.3, 0, -0.3), X0 = -1.25, X1 = 0.65, Z0 = -1.25, Z1 = 0.65, ST = 0.13, NS = 4;
  const crowd = (x0, x1, z0, z1, y, along) => { let n = 0; for (let s = 0.06; s < (along === 'x' ? x1 - x0 : z1 - z0) - 0.03; s += 0.075) { const col = [PL[0], PL[3], PL[1], PL[4], '#f6b93b', '#ffffff'][(n++ * 7 + Math.round(y * 50)) % 6]; if (along === 'x') p.box(x0 + s, y, (z0 + z1) / 2 - 0.02, 0.04, 0.05, 0.04, col, { edge: null }); else p.box((x0 + x1) / 2 - 0.02, y, z0 + s, 0.04, 0.05, 0.04, col, { edge: null }); } };
  p.ground(X0 - 0.15, Z0 - 0.15, X1 + 0.2, Z1 + 0.2, '#e8e2d2', 0.003); p.shadow(X0, Z0, X1 - X0, Z1 - Z0, 0.6, 0.12);
  p.box(X0, 0, Z0, X1 - X0, 0.04, Z1 - Z0, '#79c25a', { top: '#86cf66', edge: null });
  for (let i = 0; i < 6; i++) if (i % 2) p.ground(X0 + 0.55 + i * 0.12, Z0 + 0.55, X0 + 0.67 + i * 0.12, Z1 - 0.2, '#7ccb5c', 0.042);
  const mx = (X0 + 0.55 + X1 - 0.2) / 2, mz = (Z0 + 0.55 + Z1 - 0.2) / 2;
  p.line3([[X0 + 0.58, 0.043, Z0 + 0.58], [X1 - 0.22, 0.043, Z0 + 0.58], [X1 - 0.22, 0.043, Z1 - 0.22], [X0 + 0.58, 0.043, Z1 - 0.22], [X0 + 0.58, 0.043, Z0 + 0.58]], '#ffffff', 0.014);
  p.line3([[mx, 0.043, Z0 + 0.58], [mx, 0.043, Z1 - 0.22]], '#ffffff', 0.012);
  p.line3(Array.from({ length: 25 }, (_, i) => [mx + Math.cos((i / 24) * 6.283) * 0.17, 0.043, mz + Math.sin((i / 24) * 6.283) * 0.17]), '#ffffff', 0.012);
  for (let k = 0; k < NS; k++) { const h = 0.48 - k * 0.1; p.box(X0 + k * ST, 0, Z0, ST, h, Z1 - Z0, C.stone); crowd(X0 + k * ST, X0 + (k + 1) * ST, Z0 + NS * ST, Z1, h, 'z'); }
  for (let k = 0; k < NS; k++) { const h = 0.48 - k * 0.1; p.box(X0 + NS * ST, 0, Z0 + k * ST, X1 - X0 - NS * ST, h, ST, C.stone); crowd(X0 + NS * ST, X1, Z0 + k * ST, Z0 + (k + 1) * ST, h, 'x'); }
  p.box(-0.1, 0.48, Z0 + 0.02, 0.6, 0.3, 0.06, C.navy); p.quadZ(Z0 + 0.081, -0.05, 0.45, 0.53, 0.73, '#1f2a3d'); p.textZ('2 : 1', 0.2, 0.63, Z0 + 0.082, 0.13, '#ffd23a');
  p.box(X1 - 0.06, 0, Z0 + NS * ST, 0.06, 0.12, Z1 - Z0 - NS * ST, C.stone2); p.box(X0 + NS * ST, 0, Z1 - 0.06, X1 - X0 - NS * ST - 0.06, 0.12, 0.06, C.stone2);
  for (const [x, z] of [[X0 - 0.08, Z0 - 0.08], [X1 + 0.02, Z0 - 0.08], [X0 - 0.08, Z1 + 0.02]]) { p.box(x, 0, z, 0.05, 1.05, 0.05, C.steel); p.box(x - 0.08, 1.02, z - 0.02, 0.2, 0.12, 0.08, '#eef0f3'); }
  p.box(mx - 0.08, 0.04, mz - 0.08, 0.16, 0.06, 0.16, '#ffffff'); p.rbox(mx, 0.1, mz, 0.08, 0.04, 0.08, C.gold, 0.5); p.rbox(mx, 0.14, mz, 0.03, 0.08, 0.03, C.gold, 0.5); p.rbox(mx, 0.22, mz, 0.13, 0.12, 0.13, C.gold, 0.5);
  [[-1.2, -0.75], [-1.2, -0.05], [-0.75, -1.2], [-0.05, -1.2]].forEach(([x, z], i) => flagpole(p, x, z, 0.4, PL[i]));
}

/* ---------- World Tour: tàu du lịch giữa băng trôi ---------- */
function liner(p, x0, y, z) {
  const hw = 0.25, b = [[x0 - 1.0, y - 0.02, z - hw], [x0 + 0.95, y - 0.02, z - hw], [x0 + 0.95, y - 0.02, z + hw], [x0 - 1.0, y - 0.02, z + hw]], t = b.map(([x, , zz]) => [x - 0.02, y + 0.06, zz + (zz > z ? 0.01 : -0.01)]);
  p.ellipseShadow(x0, z, 1.1, 0.3); p.solid([...b, ...t], '#26467a');
  p.solid([[x0 + 0.95, y - 0.02, z - hw], [x0 + 1.28, y - 0.02, z - 0.01], [x0 + 1.28, y - 0.02, z + 0.01], [x0 + 0.95, y - 0.02, z + hw], [x0 + 0.95, y + 0.06, z - hw], [x0 + 1.32, y + 0.06, z - 0.01], [x0 + 1.32, y + 0.06, z + 0.01], [x0 + 0.95, y + 0.06, z + hw]], '#26467a');
  p.quadZ(z + hw + 0.012, x0 - 1.0, x0 + 0.95, y + 0.0, y + 0.03, '#e2534a');
  p.box(x0 - 0.9, y + 0.06, z - 0.22, 1.55, 0.18, 0.44, '#ffffff'); for (let i = 0; i < 12; i++) p.quadZ(z + 0.222, x0 - 0.85 + i * 0.125, x0 - 0.77 + i * 0.125, y + 0.12, y + 0.18, '#5b9fd6');
  p.box(x0 - 0.75, y + 0.24, z - 0.19, 1.2, 0.14, 0.38, '#ffffff'); for (let i = 0; i < 9; i++) p.quadZ(z + 0.192, x0 - 0.7 + i * 0.13, x0 - 0.62 + i * 0.13, y + 0.29, y + 0.34, '#5b9fd6');
  p.box(x0 + 0.42, y + 0.24, z - 0.2, 0.25, 0.22, 0.4, '#ffffff'); p.quadX(x0 + 0.672, z - 0.16, z + 0.16, y + 0.36, y + 0.44, '#26364a');
  for (const fx of [-0.55, -0.25, 0.05]) { p.box(x0 + fx, y + 0.38, z - 0.08, 0.15, 0.24, 0.16, C.red); p.box(x0 + fx, y + 0.62, z - 0.08, 0.15, 0.05, 0.16, '#26364a', { edge: null }); }
}
function iceberg(p, x, z, s) { p.flatEllipse(x, 0.004, z, 0.17 * s, 0.17 * s, '#ffffff', 0.35); p.box(x - 0.14 * s, 0, z - 0.12 * s, 0.28 * s, 0.14 * s, 0.24 * s, '#eaf7ff', { edge: 'rgba(255,255,255,.6)' }); p.box(x - 0.08 * s, 0.14 * s, z - 0.08 * s, 0.14 * s, 0.12 * s, 0.13 * s, '#ffffff', { edge: null }); p.box(x + 0.06 * s, 0, z + 0.04 * s, 0.12 * s, 0.08 * s, 0.1 * s, '#c5e9f8', { edge: null }); }
function tourSea(pen, c) { const L = c.layer(); [[-1.1, -1.05, 1.3], [-0.2, -1.25, 0.8], [0.85, -0.85, 0.9], [-1.3, 0.55, 1.0], [1.2, 0.35, 0.7], [0.3, 1.15, 0.75]].forEach(([x, z, s]) => L.add(x, z, (p) => iceberg(p, x, z, s))); L.add(-0.1, -0.05, (p) => liner(p, -0.1, 0.02, -0.05)); L.flush(pen); }

/* ---------- Chance: rương báu trên bệ đá; Tax: ngân hàng ---------- */
function chest(pen, c) {
  const p = pen.at(0, 0, c.gz); p.ellipseShadow(0, 0, 0.42, 0.14); p.box(-0.36, 0, -0.36, 0.72, 0.08, 0.72, C.stone2); p.box(-0.3, 0.08, -0.3, 0.6, 0.08, 0.6, C.stone);
  const y0 = 0.16, W = 0.44, D = 0.32, H = 0.2; p.box(-W / 2, y0, -D / 2, W, H, D, '#a8683a');
  for (const bx of [-W / 2 + 0.06, W / 2 - 0.1]) { p.quadZ(D / 2 + 0.001, bx, bx + 0.04, y0, y0 + H, C.gold); p.quadX(W / 2 + 0.001, -D / 2, D / 2, y0, y0 + H, '#8a5a30'); }
  p.rbox(0, y0 + H, 0, W, 0.07, D, '#c07a42', 0, 0.12); p.box(-0.03, y0 + 0.08, D / 2 + 0.002, 0.06, 0.08, 0.02, C.gold, { edge: null });
  const [sx, sy] = p.p(0, 0.72, 0), g = p.ctx; g.save(); g.font = `900 ${p.k * 0.38}px ${c.font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = p.k * 0.05; g.lineJoin = 'round'; g.strokeStyle = '#a65f12'; g.strokeText('?', sx, sy); g.fillStyle = '#ffb93a'; g.fillText('?', sx, sy); g.restore();
}
function bank(pen, c) {
  const p = pen.at(0, 0, c.gz); p.shadow(-0.5, -0.4, 1.0, 0.75, 0.9); p.box(-0.5, 0, -0.4, 1.0, 0.06, 0.8, C.stone); p.box(-0.45, 0.06, -0.38, 0.9, 0.05, 0.72, C.stone2);
  p.box(-0.38, 0.11, -0.36, 0.76, 0.55, 0.4, '#e9e4d8'); p.quadZ(0.041, -0.08, 0.08, 0.11, 0.42, '#5a3b27'); for (const x of [-0.33, -0.12, 0.12, 0.33]) p.cyl(x, 0.11, 0.2, 0.045, 0.52, '#ffffff');
  p.box(-0.42, 0.63, -0.38, 0.84, 0.1, 0.66, '#f2eee4'); p.textZ('TAX', 0, 0.68, 0.282, 0.08, '#6b7685'); p.gableX(-0.44, 0.73, -0.38, 0.88, 0.66, 0.22, '#d9d3c4', 0.02);
  for (let i = 0; i < 3; i++) p.cyl(0.55, i * 0.035, 0.4, 0.07, 0.03, C.gold);
}

/* ---------- giữa bàn: núi, sông, hồ, sân bay, ruộng, công viên ---------- */
const RIVER = [[-3.1, -2.4], [-3.0, -1.2], [-1.8, -0.6], [0, -1.2], [1.5, -2.6], [2.8, -3.5]];
const MT = { ax: -5.8, az: -5.8, cs: 0.32 };
function mountainCells() {
  const peaks = [[-4.35, -4.35, 1.5, 1.85], [-2.55, -4.75, 0.95, 1.15], [-4.75, -2.55, 0.9, 1.1], [-3.3, -3.25, 0.55, 0.85], [-5.1, -5.1, 0.7, 0.9]], cells = [];
  for (let x = MT.ax; x <= -1.3; x += MT.cs) for (let z = MT.az; z <= -1.3; z += MT.cs) {
    let h = 0; for (const [px, pz, H, R] of peaks) { const d = Math.hypot(x - px, z - pz); if (d < R) h = Math.max(h, H * Math.pow(1 - d / R, 1.1)); }
    if (RIVER.some(([a, b]) => Math.hypot(x - a, z - b) < 0.5)) h = 0;
    h = Math.round(h / 0.12) * 0.12; if (h < 0.1) continue;
    const snow = h >= 0.95, rock = h >= 0.42; cells.push({ x, z, h, top: snow ? '#ffffff' : rock ? '#d8d3c7' : '#8fd06a', side: snow ? '#e6edf2' : rock ? '#bdb6a8' : '#73b453' });
  }
  return cells;
}
function worldGround(g, c) {
  const { T, px } = c, R = c.rng(7), rect = (x0, z0, x1, z1, col) => { const [a, b] = T(x0, z0), [d, e] = T(x1, z1); g.fillStyle = col; g.fillRect(a, b, d - a, e - b); };
  for (let i = 0; i < 160; i++) { g.fillStyle = R() < 0.5 ? 'rgba(130,196,104,.4)' : 'rgba(190,232,160,.45)'; const w = 8 + R() * 40; g.fillRect(R() * c.cw, R() * c.ch, w, w * 0.6); }
  // sân bay: đường băng dọc trục z, sân đỗ, đường lăn
  rect(2.5, 2.7, 4.1, 5.5, '#e8e2d2'); rect(2.55, 2.75, 4.05, 5.45, '#c3c8cf'); rect(3.95, 3.2, 4.45, 3.5, '#8a8f97'); rect(3.95, 4.6, 4.45, 4.9, '#8a8f97');
  rect(4.25, 0.7, 5.05, 5.6, '#e8e2d2'); rect(4.3, 0.75, 5.0, 5.55, '#6e737c'); for (let z = 1.1; z < 5.4; z += 0.32) rect(4.635, z, 4.665, z + 0.16, '#ffffff'); rect(4.3, 0.75, 4.325, 5.55, '#ffffff'); rect(4.975, 0.75, 5.0, 5.55, '#ffffff');
  // ruộng
  const F = ['#f2d27a', '#a9d97e', '#d8b07c', '#cdb6f0', '#f6e3a3', '#9fd27a']; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) rect(-0.6 + i * 0.6, 3.0 + j * 0.72, -0.06 + i * 0.6, 3.66 + j * 0.72, F[(i * 3 + j) % 6]);
  // công viên (nền tàu lượn) + bãi phóng
  rect(-5.2, 1.4, -1.8, 4.5, '#efe4c8'); rect(3.8, -1.1, 5.2, 0.3, '#d4d8de'); g.strokeStyle = '#f2b632'; g.lineWidth = 0.05 * px; g.strokeRect(...T(3.95, -0.95), 1.1 * px, 1.1 * px);
  // sông, bờ cát, hồ
  const river = (w, col) => { g.beginPath(); RIVER.forEach(([x, z], i) => (i ? g.lineTo(...T(x, z)) : g.moveTo(...T(x, z)))); g.strokeStyle = col; g.lineWidth = w * px; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); };
  river(0.95, '#ecd9a4'); river(0.62, '#6cc8ee');
  g.save(); g.translate(...T(3.95, -3.95)); g.rotate(Math.PI / 4); g.fillStyle = '#ecd9a4'; g.beginPath(); g.ellipse(0, 0, 1.85 * px, 1.45 * px, 0, 0, 7); g.fill(); g.fillStyle = '#6cc8ee'; g.beginPath(); g.ellipse(0, 0, 1.66 * px, 1.26 * px, 0, 0, 7); g.fill(); g.restore();
  g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = 0.03 * px; g.lineCap = 'round'; for (let i = 0; i < 14; i++) { const k = (i + 0.5) / 14 * (RIVER.length - 1), a = Math.floor(k), [x0, z0] = RIVER[a], [x1, z1] = RIVER[Math.min(a + 1, RIVER.length - 1)], f = k - a, x = x0 + (x1 - x0) * f, z = z0 + (z1 - z0) * f; g.beginPath(); g.moveTo(...T(x - 0.1, z)); g.lineTo(...T(x + 0.1, z + 0.06)); g.stroke(); }
}
function plane(p, x, y, z, yaw, pitch, col) { p.rbox(x, y + 0.06, z, 0.62, 0.1, 0.13, '#ffffff', yaw, pitch); p.rbox(x, y + 0.07, z, 0.16, 0.025, 0.66, '#dfe6ee', yaw, pitch); p.rbox(x - Math.cos(yaw) * 0.26, y + 0.12, z + Math.sin(yaw) * 0.26, 0.12, 0.16, 0.03, col, yaw, pitch); }
function box3(p, x, z, w, d, h, wall, roof) { p.shadow(x - w / 2, z - d / 2, w, d, h, 0.14); p.box(x - w / 2, 0, z - d / 2, w, h, d, wall); if (roof) p.box(x - w / 2 - 0.04, h, z - d / 2 - 0.04, w + 0.08, 0.05, d + 0.08, roof); }
function terminal(p, x, z) { box3(p, x, z, 1.1, 0.8, 0.34, '#f2f4f7', '#2c8ff0'); p.quadZ(z + 0.401, x - 0.5, x + 0.5, 0.06, 0.24, '#8fd0f0'); p.box(x - 0.3, 0.39, z - 0.25, 0.6, 0.08, 0.5, '#e9edf2'); p.textZ('AIRPORT', x, 0.3, z + 0.402, 0.075, '#26364a'); }
function tower(p, x, z) { p.ellipseShadow(x, z, 0.18, 0.15); p.box(x - 0.09, 0, z - 0.09, 0.18, 0.82, 0.18, '#f2f4f7'); p.box(x - 0.18, 0.82, z - 0.18, 0.36, 0.05, 0.36, '#e9edf2'); p.box(x - 0.16, 0.87, z - 0.16, 0.32, 0.16, 0.32, '#8fd0f0', { edge: 'rgba(255,255,255,.6)' }); p.box(x - 0.19, 1.03, z - 0.19, 0.38, 0.05, 0.38, '#2c8ff0'); }
function coasterPts() {
  const spec = [[0, 1.0, 0.2], [0.6, 1.2, 0.2], [1.1, 1.35, 0.6], [1.5, 1.45, 1.05], [1.85, 1.35, 1.2], [2.2, 1.1, 0.7], [2.6, 0.85, 0.3], [3.1, 0.8, 0.3], [3.6, 1.15, 0.75], [4.0, 1.45, 0.8], [4.45, 1.45, 0.45], [4.9, 1.2, 0.25], [5.5, 1.05, 0.2]], n = spec.length, pts = spec.map(([a, r, y]) => [Math.cos(a) * r * 1.2, y, Math.sin(a) * r * 0.95]), out = [];
  for (let i = 0; i < n; i++) for (let s = 0; s < 10; s++) { const t = s / 10, p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]; out.push([0, 1, 2].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t))); }
  return out;
}
const TRACK = coasterPts(), CO = [-3.4, 3.1], FW = [-1.3, 4.7, 0.9, 0.7], WM = [2.0, 2.3];
function coaster(p) {
  for (let i = 0; i < TRACK.length; i += 4) { const [x, y, z] = TRACK[i]; if (y > 0.15) p.box(CO[0] + x - 0.02, 0, CO[1] + z - 0.02, 0.04, y, 0.04, '#ffffff', { edge: null }); }
  const loop = [...TRACK, TRACK[0]]; p.line3(loop.map(([x, y, z]) => [CO[0] + x, y + 0.02, CO[1] + z]), '#c2335e', 0.05); p.line3(loop.map(([x, y, z]) => [CO[0] + x, y + 0.05, CO[1] + z]), '#ff5c8a', 0.035);
  p.box(CO[0] + 0.8, 0, CO[1] - 0.15, 0.4, 0.22, 0.3, '#fff1d8'); p.box(CO[0] + 0.75, 0.22, CO[1] - 0.2, 0.5, 0.05, 0.4, '#ec4f7c');
}
function rocketPad(p, x, z) { for (let i = 0; i < 6; i++) p.box(x - 0.7, i * 0.2, z - 0.08, 0.16, 0.2, 0.16, i % 2 ? '#f2b632' : '#e2557f'); p.box(x - 0.55, 1.0, z - 0.03, 0.3, 0.04, 0.06, C.steel); p.box(x - 0.12, 0, z - 0.12, 0.24, 0.9, 0.24, '#ffffff'); p.box(x - 0.125, 0.55, z - 0.125, 0.25, 0.1, 0.25, C.red, { edge: null }); p.hip(x - 0.12, 0.9, z - 0.12, 0.24, 0.24, 0.3, C.red); for (const [fx, fz] of [[-0.2, 0], [0.12, 0], [0, -0.2], [0, 0.12]]) p.box(x + fx - (fx ? 0 : 0.02), 0, z + fz - (fz ? 0 : 0.02), fx ? 0.08 : 0.04, 0.22, fz ? 0.08 : 0.04, C.navy, { edge: null }); }
function bridge(p, x, z, alongX) { for (let i = -3; i <= 3; i++) alongX ? p.box(x + i * 0.12 - 0.05, 0.02, z - 0.3, 0.1, 0.03, 0.6, C.wood) : p.box(x - 0.3, 0.02, z + i * 0.12 - 0.05, 0.6, 0.03, 0.1, C.wood); }
function sailboat(p, x, z) { p.rbox(x, 0, z, 0.36, 0.08, 0.14, '#ffffff', 0.6); p.rbox(x, 0.08, z, 0.02, 0.4, 0.02, C.wood2, 0.6); p.poly([[x, 0.48, z], [x, 0.12, z], [x - 0.2, 0.12, z + 0.1]], '#ffffff'); p.poly([[x, 0.42, z], [x + 0.12, 0.12, z - 0.07], [x, 0.1, z]], '#ff8a3c'); }
function worldItems(add) {
  add(-4.0, -4.0, (p) => p.terrain(mountainCells(), MT.cs, (pp, cell) => { if (cell.h <= 0.36 && hash(cell.x * 3, cell.z * 5) < 0.22) pp.at(0, cell.h, 0).cubeTree(cell.x, cell.z, 0.6); }));
  [[-1.1, -3.4], [-1.4, -2.7], [-2.2, -1.2], [-1.8, -3.9], [-0.9, -4.3], [-3.9, -1.2], [-4.4, -0.8], [0.6, -4.6], [-2.4, 5.3], [-0.4, 5.4], [5.4, -2.0], [-5.2, 1.0], [-1.0, -0.5], [1.5, -0.6], [-0.5, 0.6], [2.0, 0.4]].forEach(([x, z], i) => add(x, z, (p) => (i > 7 && i < 11 ? palm(p, x, z, 1) : p.cubeTree(x, z, 0.8 + (i % 3) * 0.1))));
  add(2.8, -3.5, (p) => sailboat(p, 3.6, -3.7)); [0.27, 0.62].forEach((u) => { const k = u * (RIVER.length - 1), a = Math.floor(k), [x0, z0] = RIVER[a], [x1, z1] = RIVER[a + 1], x = x0 + (x1 - x0) * (k - a), z = z0 + (z1 - z0) * (k - a); add(x, z, (p) => bridge(p, x, z, Math.abs(x1 - x0) < Math.abs(z1 - z0))); });
  add(3.3, 4.2, (p) => terminal(p, 3.3, 4.2)); add(2.9, 3.2, (p) => box3(p, 2.9, 3.2, 0.76, 0.6, 0.32, '#dfe6ee', '#9aa5b3')); add(3.9, 5.0, (p) => tower(p, 3.9, 5.0)); add(3.3, 3.75, (p) => { p.ellipseShadow(3.3, 3.75, 0.35, 0.12); plane(p, 3.3, 0.06, 3.75, 0, 0, C.red); });
  add(WM[0], WM[1], (p) => { p.ellipseShadow(WM[0], WM[1], 0.25, 0.14); p.box(WM[0] - 0.15, 0, WM[1] - 0.15, 0.3, 0.7, 0.3, '#f4ecdc'); p.hip(WM[0] - 0.15, 0.7, WM[1] - 0.15, 0.3, 0.3, 0.22, '#c0573d'); });
  add(CO[0], CO[1], coaster); add(4.2, -0.4, (p) => rocketPad(p, 4.9, -0.4));
  add(FW[0], FW[1], (p) => { const [x, z] = [FW[0], FW[1]]; p.ellipseShadow(x, z, 0.5, 0.12); for (const dz of [-0.14, 0.14]) { p.poly([[x - 0.4, 0, z + dz], [x - 0.36, 0, z + dz], [x + 0.02, FW[2], z + dz], [x - 0.02, FW[2], z + dz]], '#ffffff'); p.poly([[x + 0.36, 0, z + dz], [x + 0.4, 0, z + dz], [x + 0.02, FW[2], z + dz], [x - 0.02, FW[2], z + dz]], '#ffffff'); } p.box(x - 0.04, FW[2] - 0.04, z - 0.18, 0.08, 0.08, 0.36, C.steel); });
}
// chuyển động: cánh cối xay, đu quay, tàu lượn, máy bay cất cánh, khinh khí cầu (tổng ≪ 1 ms)
function worldFx(p, t) {
  const [wx, wz] = WM, hx = wx + 0.17, hy = 0.72;
  for (let i = 0; i < 4; i++) { const a = t * 1.5 + (i * Math.PI) / 2, ca = Math.cos(a), sa = Math.sin(a); p.poly([[hx, hy, wz], [hx, hy + sa * 0.55 - ca * 0.07, wz + ca * 0.55 + sa * 0.07], [hx, hy + sa * 0.55, wz + ca * 0.55]], i % 2 ? '#ffffff' : '#e8e2d2'); }
  const [fx, fz, hub, R] = FW, rim = []; for (let i = 0; i <= 32; i++) { const a = (i / 32) * 6.283; rim.push([fx + Math.cos(a) * R, hub + Math.sin(a) * R, fz]); } p.line3(rim, '#ffd23a', 0.03);
  for (let i = 0; i < 10; i++) { const a = t * 0.35 + (i / 10) * 6.283, gx = fx + Math.cos(a) * R, gy = hub + Math.sin(a) * R; p.line3([[fx, hub, fz], [gx, gy, fz]], '#ffffff', 0.008); p.box(gx - 0.05, gy - 0.12, fz - 0.05, 0.1, 0.09, 0.1, PL[i % 6], { edge: null }); }
  const n = TRACK.length, hMax = 1.2, lap = (t * 0.045) % 1;
  for (let k = 0; k < 4; k++) { const i = Math.floor(((lap - k * 0.02 + 1) % 1) * n) % n, a = TRACK[i], b = TRACK[(i + 1) % n], yaw = Math.atan2(-(b[2] - a[2]), b[0] - a[0]), pitch = Math.atan2(b[1] - a[1], Math.hypot(b[0] - a[0], b[2] - a[2])); void hMax; p.rbox(CO[0] + a[0], a[1] + 0.07, CO[1] + a[2], 0.18, 0.09, 0.12, ['#ffd23a', '#2c8ff0', '#43a047', '#8e24aa'][k], yaw, pitch); }
  const u = t % 16; if (u > 2 && u < 9.5) { const a = u - 2, z = 0.9 + 0.2 * a * a; if (z < 5.2) { const y = z > 3.3 ? (z - 3.3) * 0.34 : 0; p.ellipseShadow(4.65, z, 0.3, 0.12 / (1 + y)); plane(p, 4.65, 0.06 + y, z, -Math.PI / 2, Math.min(0.28, Math.max(0, z - 3.3) * 0.18), '#2c8ff0'); } }
  [['#ef5a3c', '#ffd23a'], ['#2c8ff0', '#ffffff']].forEach(([c1, c2], i) => { const a = t * 0.06 + i * 2.1, x = Math.cos(a) * (1.4 + i * 0.5) + 0.3, y = 2.5 + i * 0.45 + Math.sin(t * 0.7 + i) * 0.12, z = Math.sin(a) * (1.3 + i * 0.4) - 0.6; p.box(x - 0.06, y, z - 0.06, 0.12, 0.08, 0.12, C.wood, { edge: null }); [0.2, 0.34, 0.44, 0.5, 0.5, 0.44, 0.32, 0.16].forEach((w, k) => p.box(x - w / 2, y + 0.3 + k * 0.075, z - w / 2, w, 0.075, w, k % 4 === 3 ? c2 : c1, { edge: null })); });
}

export default defineSkin({
  id: 'isometric',
  packs: ['kenney-iso-buildings'],
  palette: {
    groups: { A: '#c98a4b', B: '#ec4f7c', C: '#2fb5a3', D: '#f7a21b', E: '#ef5a3c', F: '#2f55c9', G: '#8a63e8', H: '#3aa0f0' },
    ground: '#a6dc8c', priceStrip: '#c6cdd6', priceText: '#5b6676', labelText: '#ffffff', labelShadow: '#344854',
    boardSide: '#7fcfd8', boardSideDark: '#62b6c2', boardTop: '#8fd8e0', tileSide: '#c89d7b', tileSideDark: '#a47c5d', water: '#8fd6ef', sand: '#f7e2b5', resortBand: '#7fd3dd',
  },
  zones: null,
  slots: {
    tile: { paint: (g, c) => c.grass(g, 0, 0, c.cw, c.ch, c.seed) },
    house: {
      kind: 'kit',
      levels: [[[0, 0, ['128']]], [[0, 0, ['016'], '069']], [[0, 0, ['016', '047'], '082'], [1, 0, ['055']]], [[0, 0, ['016', '047', '047'], '083'], [1, 0, ['024', '051'], '090']], [[0, 0, ['016', '053', '053', '053']], [1, 0, ['000', '053', '053', '053']]]],
      sign: 'HOTEL',
      under: (p, c) => { if (c.level) p.cubeTree(-c.w / 2 - 0.22, 0.05, 0.95); },
      over: (p, c) => { if (c.level === 0) { p.cubeTree(0.45, 0.3, 0.9); p.cubeTree(-0.45, 0.35, 0.8); } else if (c.level < 4) p.cubeTree(0.1, 0.56, 0.8); },
    },
    resort: { paint: sandPaint, draw: beachDecor },
    resortHouse: { kind: 'kit', levels: [[[0, 0, ['128']]], [[0, 0, ['039'], '074']], [[0, 0, ['024', '055'], '082'], [1, 0, ['008']]], [[0, 0, ['024', '031', '031']], [1, 0, ['015', '031', '031']]]], heights: [0.1, 0.5, 1.0, 1.4], sign: 'RESORT', signY: 1.29, over: resortOver },
    chance: { paint: flat('#fff1d8'), draw: chest },
    tax: { paint: flat('#a7dfe2'), draw: bank },
    start: { paint: (g, c) => c.grass(g, 0, 0, c.cw, c.ch, 5), label: [0.5, 0.62, 80, 0.8], draw: startGate },
    island: { paint: seaPaint, side: ['#7cc3e0', '#5fa9c9'], label: [0.74, 0.85, 33, 0.58], draw: island },
    festival: { paint: (g, c) => c.grass(g, 0, 0, c.cw, c.ch, 8), label: [0.7, 0.78, 33, 0.62], draw: arena },
    tour: { paint: seaPaint, side: ['#7cc3e0', '#5fa9c9'], label: [0.7, 0.78, 33, 0.62], draw: tourSea },
    center: {
      paint: worldGround,
      draw: (pen, c) => { if (c.side === 0) worldItems((x, z, fn, d = 0) => c.add(x, z, fn, d)); },   // zones:null → khung xương gọi draw 4 lần (side 0–3), chỉ vẽ một lần
    },
  },
  ambient: { animate: { world: worldFx } },
  labels: { start: 'START', island: 'LOST ISLAND', festival: 'CHAMPIONSHIPS', tour: 'WORLD TOUR', resortLevels: ['Chòi dù', 'Bungalow', 'Villa biển', 'Resort'] },
});

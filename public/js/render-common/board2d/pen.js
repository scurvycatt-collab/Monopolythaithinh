/* Khung xương 2D — bút vẽ isometric (gộp iso2d.js + c2d.js + phần lõi engine Bốn Mùa).
   Chiếu 2:1, góc nhìn 30°: sx = (x − z)·CX·k, sy = (x + z)·CY·k − y·CH·k. Nắng từ +x (mặt phải sáng).
   Mọi hàm DOM chỉ chạy khi gọi, nên file này import được trong Node. API cho skin: PEN.md. */
export const CX = Math.SQRT1_2, CY = Math.SQRT1_2 / 2, CH = Math.sqrt(3) / 2;
export const P = (x, y, z, k) => [(x - z) * CX * k, (x + z) * CY * k - y * CH * k];
export const FONT = 'Rubik, "Be Vietnam Pro", system-ui, sans-serif';

/* ---------- màu, số ngẫu nhiên lặp lại được ---------- */
export function rgb(hex) { const n = parseInt(String(hex).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const toHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const shade = (hex, f) => { const [r, g, b] = rgb(hex); return toHex(r * f, g * f, b * f); };
export const mix = (hex, hex2, t) => { const a = rgb(hex), b = rgb(hex2); return toHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t); };
export const light = (hex, t) => mix(hex, '#ffffff', t);
export const lit = (col, f) => (f >= 1 ? mix(col, '#ffffff', Math.min(1, (f - 1) * 2)) : shade(col, f));
export const rng = (seed) => { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); };
export const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
// mặt phẳng chéo quay thẳng về người xem: s chạy ngang màn hình, n hướng về người xem
export const wp = (s, n, ox = 0, oz = 0) => [ox + Math.SQRT1_2 * (s + n), oz + Math.SQRT1_2 * (n - s)];

const V = [0.612, 0.5, 0.612], SUN = [0.443, 0.886, 0.133];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
function convexHull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = []; for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function txt(c, k, str, h, col, stroke) {
  c.font = `900 ${h * k}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  if (stroke) { c.lineWidth = h * k * 0.16; c.strokeStyle = stroke; c.lineJoin = 'round'; c.strokeText(str, 0, 0); }
  c.fillStyle = col; c.fillText(str, 0, 0); c.restore();
}

export class Pen {
  constructor(ctx, k, ox = 0, oy = 0) { Object.assign(this, { ctx, k, ox, oy }); }
  p(x, y, z) { const [a, b] = P(x, y, z, this.k); return [a + this.ox, b + this.oy]; }
  at(x, y, z) { const [a, b] = this.p(x, y, z); return new Pen(this.ctx, this.k, a, b); }
  poly(pts, fill, stroke, lw = 1) {
    const c = this.ctx; c.beginPath();
    pts.forEach(([x, y, z], i) => { const [a, b] = this.p(x, y, z); i ? c.lineTo(a, b) : c.moveTo(a, b); });
    c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke(); }
  }
  // hộp: góc nhỏ nhất (x, y, z), rộng w theo x, cao h, sâu d theo z; o = { top, left, right, edge }
  box(x, y, z, w, h, d, col, o = {}) {
    const X = x + w, Y = y + h, Z = z + d, e = o.edge === undefined ? 'rgba(255,255,255,.35)' : o.edge;
    this.poly([[X, y, z], [X, y, Z], [X, Y, Z], [X, Y, z]], o.right || shade(col, 0.92));
    this.poly([[x, y, Z], [X, y, Z], [X, Y, Z], [x, Y, Z]], o.left || shade(col, 0.78));
    this.poly([[x, Y, z], [X, Y, z], [X, Y, Z], [x, Y, Z]], o.top || light(col, 0.08));
    if (e) { const c = this.ctx; c.beginPath(); for (const [a, b] of [[[x, Y, Z], [X, Y, Z]], [[X, Y, z], [X, Y, Z]]]) { c.moveTo(...this.p(...a)); c.lineTo(...this.p(...b)); } c.strokeStyle = e; c.lineWidth = Math.max(1, this.k / 90); c.stroke(); }
  }
  gableX(x, y, z, w, d, rise, col, ov = 0.05, wall = '#fff6e6') {
    const x0 = x - ov, x1 = x + w + ov, zc = z + d / 2, R = y + rise;
    this.poly([[x0, y, z - ov], [x1, y, z - ov], [x1, R, zc], [x0, R, zc]], shade(col, 0.7));
    this.poly([[x + w, y, z], [x + w, y, z + d], [x + w, R, zc]], shade(wall, 0.92));
    this.poly([[x0, y, z + d + ov], [x1, y, z + d + ov], [x1, R, zc], [x0, R, zc]], shade(col, 0.86));
    this.poly([[x1, y, z - ov], [x1, y - 0.02, z - ov], [x1, y - 0.02, z + d + ov], [x1, y, z + d + ov], [x1, R, zc]], shade(col, 0.62));
    const c = this.ctx; c.beginPath(); c.moveTo(...this.p(x0, R, zc)); c.lineTo(...this.p(x1, R, zc)); c.strokeStyle = light(col, 0.35); c.lineWidth = Math.max(1, this.k / 70); c.stroke();
  }
  gableZ(x, y, z, w, d, rise, col, ov = 0.05, wall = '#fff6e6') {
    const z0 = z - ov, z1 = z + d + ov, xc = x + w / 2, R = y + rise;
    this.poly([[x - ov, y, z0], [x - ov, y, z1], [xc, R, z1], [xc, R, z0]], shade(col, 0.7));
    this.poly([[x, y, z + d], [x + w, y, z + d], [xc, R, z + d]], shade(wall, 0.8));
    this.poly([[x + w + ov, y, z0], [x + w + ov, y, z1], [xc, R, z1], [xc, R, z0]], light(col, 0.04));
    this.poly([[x - ov, y, z1], [x - ov, y - 0.02, z1], [x + w + ov, y - 0.02, z1], [x + w + ov, y, z1], [xc, R, z1]], shade(col, 0.6));
    const c = this.ctx; c.beginPath(); c.moveTo(...this.p(xc, R, z0)); c.lineTo(...this.p(xc, R, z1)); c.strokeStyle = light(col, 0.35); c.lineWidth = Math.max(1, this.k / 70); c.stroke();
  }
  hip(x, y, z, w, d, rise, col, ov = 0.04) {
    const a = [x - ov, y, z - ov], b = [x + w + ov, y, z - ov], c2 = [x + w + ov, y, z + d + ov], d2 = [x - ov, y, z + d + ov], t = [x + w / 2, y + rise, z + d / 2];
    this.poly([a, d2, t], shade(col, 0.7)); this.poly([a, b, t], shade(col, 0.7)); this.poly([d2, c2, t], shade(col, 0.82)); this.poly([b, c2, t], light(col, 0.05));
  }
  quadZ(z, x0, x1, y0, y1, col) { this.poly([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], col); }
  quadX(x, z0, z1, y0, y1, col) { this.poly([[x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0]], col); }
  ground(x0, z0, x1, z1, col, y = 0.002) { this.poly([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], col); }
  // bóng đổ của khối cao h: chân đế và đỉnh dời theo nắng, lấy bao lồi
  shadow(x, z, w, d, h, a = 0.16) {
    const s = [-0.556 * h, -0.333 * h], pts = [];
    for (const [px, pz] of [[x, z], [x + w, z], [x + w, z + d], [x, z + d]]) pts.push([px, pz], [px + s[0], pz + s[1]]);
    const hull = convexHull(pts.map(([px, pz]) => this.p(px, 0, pz))), c = this.ctx;
    c.beginPath(); hull.forEach(([a1, b1], i) => (i ? c.lineTo(a1, b1) : c.moveTo(a1, b1))); c.closePath(); c.fillStyle = `rgba(30,50,70,${a})`; c.fill();
  }
  ellipseShadow(x, z, r, a = 0.18) { const [sx, sy] = this.p(x, 0, z), c = this.ctx; c.beginPath(); c.ellipse(sx - r * this.k * 0.25, sy - r * this.k * 0.08, r * this.k, r * this.k * 0.5, 0, 0, 7); c.fillStyle = `rgba(30,50,70,${a})`; c.fill(); }
  flatEllipse(x, y, z, rx, rz, col, a = 1) { const c = this.ctx; c.globalAlpha = a; c.beginPath(); for (let i = 0; i <= 40; i++) { const t = (i / 40) * Math.PI * 2, [sx, sy] = this.p(x + Math.cos(t) * rx, y, z + Math.sin(t) * rz); i ? c.lineTo(sx, sy) : c.moveTo(sx, sy); } c.closePath(); c.fillStyle = col; c.fill(); c.globalAlpha = 1; }
  cyl(x, y, z, r, h, col) {
    const [bx, by] = this.p(x, y, z), [, ty] = this.p(x, y + h, z), R = r * this.k, c = this.ctx;
    const g = c.createLinearGradient(bx - R, 0, bx + R, 0); g.addColorStop(0, shade(col, 0.72)); g.addColorStop(0.65, shade(col, 0.95)); g.addColorStop(1, shade(col, 0.85));
    c.beginPath(); c.moveTo(bx - R, ty); c.lineTo(bx - R, by); c.ellipse(bx, by, R, R / 2, 0, Math.PI, 0, true); c.lineTo(bx + R, ty); c.closePath(); c.fillStyle = g; c.fill();
    c.beginPath(); c.ellipse(bx, ty, R, R / 2, 0, 0, 7); c.fillStyle = light(col, 0.1); c.fill();
  }
  ball(x, y, z, r, col) {
    const [sx, sy] = this.p(x, y, z), R = r * this.k, c = this.ctx, g = c.createRadialGradient(sx + R * 0.35, sy - R * 0.4, R * 0.1, sx, sy, R);
    g.addColorStop(0, light(col, 0.25)); g.addColorStop(1, shade(col, 0.82)); c.beginPath(); c.arc(sx, sy, R, 0, 7); c.fillStyle = g; c.fill();
  }
  cone(x, y, z, r, h, col) {
    const [bx, by] = this.p(x, y, z), [tx, ty] = this.p(x, y + h, z), R = r * this.k, c = this.ctx;
    c.beginPath(); c.moveTo(tx, ty); c.lineTo(bx - R, by); c.ellipse(bx, by, R, R / 2, 0, Math.PI, Math.PI / 2, true); c.closePath(); c.fillStyle = shade(col, 0.8); c.fill();
    c.beginPath(); c.moveTo(tx, ty); c.lineTo(bx, by + R / 2); c.ellipse(bx, by, R, R / 2, 0, Math.PI / 2, 0, true); c.closePath(); c.fillStyle = col; c.fill();
  }
  // khối lục diện: 4 đỉnh đáy rồi 4 đỉnh trên; chỉ vẽ mặt quay về camera, tô theo nắng
  solid(c8, col) {
    const F = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]], ctr = c8.reduce((s, p) => [s[0] + p[0] / 8, s[1] + p[1] / 8, s[2] + p[2] / 8], [0, 0, 0]);
    for (const f of F) {
      const p = f.map((i) => c8[i]); let n = norm(cross(sub(p[1], p[0]), sub(p[3], p[0])));
      if (!isFinite(n[0]) || Math.hypot(...n) < 0.5) n = norm(cross(sub(p[2], p[1]), sub(p[0], p[1])));
      const fc = p.reduce((s, q) => [s[0] + q[0] / 4, s[1] + q[1] / 4, s[2] + q[2] / 4], [0, 0, 0]);
      if (dot(n, sub(fc, ctr)) < 0) n = [-n[0], -n[1], -n[2]];
      if (dot(n, V) > 1e-3) this.poly(p, lit(col, 0.78 + 0.3 * Math.max(0, dot(n, SUN))));
    }
  }
  // hộp xoay quanh tâm đáy: yaw quanh trục đứng, pitch chúc mũi
  rbox(x, y, z, w, h, d, col, yaw = 0, pitch = 0) { this.solid(rboxPts(x, y, z, w, h, d, yaw, pitch), col); }
  disc(x, y, z, r, col, a = 1) {
    const [sx, sy] = this.p(x, y, z), c = this.ctx; c.globalAlpha = a; c.beginPath(); c.arc(sx, sy, r * this.k, 0, 7); c.fillStyle = col; c.fill();
    c.beginPath(); c.arc(sx + r * this.k * 0.3, sy - r * this.k * 0.3, r * this.k * 0.35, 0, 7); c.fillStyle = 'rgba(255,255,255,.45)'; c.fill(); c.globalAlpha = 1;
  }
  puff(x, y, z, r, a) { const [sx, sy] = this.p(x, y, z), c = this.ctx; c.globalAlpha = a; c.fillStyle = '#f2f4f7'; c.beginPath(); c.arc(sx, sy, r * this.k, 0, 7); c.fill(); c.globalAlpha = 1; }
  line3(pts, col, w) { const c = this.ctx; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(...this.p(...p)) : c.moveTo(...this.p(...p)))); c.strokeStyle = col; c.lineWidth = w * this.k; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); }
  flag(x, z, h, col) {
    this.cyl(x, 0, z, 0.014, h, '#eef0f3'); this.ball(x, h + 0.02, z, 0.03, '#ffc23a');
    const c = this.ctx, [a, b] = this.p(x, h - 0.02, z), F = this.k;
    c.beginPath(); c.moveTo(a, b); c.quadraticCurveTo(a + 0.14 * F, b - 0.02 * F, a + 0.26 * F, b + 0.06 * F); c.quadraticCurveTo(a + 0.12 * F, b + 0.08 * F, a, b + 0.15 * F); c.closePath();
    c.fillStyle = col; c.fill(); c.strokeStyle = shade(col, 0.75); c.lineWidth = Math.max(1, F / 100); c.stroke();
  }
  flagC(x, z, h, col, t = 0, base = 0) {
    this.box(x - 0.012, base, z - 0.012, 0.024, h, 0.024, '#eef0f3', { edge: null });
    const pts = []; for (let i = 0; i <= 6; i++) { const u = i / 6; pts.push([x + u * 0.28, base + h - 0.02 + Math.sin(t * 6 - u * 4) * 0.025 * u, z - Math.sin(t * 5 - u * 3) * 0.02 * u]); }
    this.poly([...pts, ...pts.map(([a, b, c2]) => [a, b - 0.16 + (a - x) * 0.05, c2]).reverse()], col); this.box(x - 0.02, base + h, z - 0.02, 0.04, 0.04, 0.04, '#f5b934', { edge: null });
  }
  // dây cờ đuôi nheo / dây đèn lồng giữa hai điểm a, b
  bunting(a, b, cols, sag = 0.08, n = 9, lantern = false) {
    const at = (u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - Math.sin(u * Math.PI) * sag, a[2] + (b[2] - a[2]) * u];
    this.line3(Array.from({ length: 21 }, (_, i) => at(i / 20)), 'rgba(70,60,50,.7)', 0.006);
    for (let i = 1; i < n; i++) {
      const [x, y, z] = at(i / n), col = cols[i % cols.length];
      if (!lantern) { this.poly([[x - 0.03, y, z + 0.03], [x + 0.03, y, z - 0.03], [x, y - 0.09, z]], col); continue; }
      const [sx, sy] = this.p(x, y - 0.06, z), c = this.ctx, R = this.k * 0.045;
      c.fillStyle = col; c.beginPath(); c.ellipse(sx, sy, R, R * 1.2, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(sx + R * 0.3, sy - R * 0.3, R * 0.3, R * 0.45, 0, 0, 7); c.fill();
      c.fillStyle = '#f5b934'; c.fillRect(sx - R * 0.5, sy - R * 1.35, R, R * 0.25); c.fillRect(sx - R * 0.4, sy + R * 1.1, R * 0.8, R * 0.25);
    }
  }
  cubeTree(x, z, s = 1) { this.ellipseShadow(x, z, 0.13 * s, 0.14); this.box(x - 0.02 * s, 0, z - 0.02 * s, 0.04 * s, 0.18 * s, 0.04 * s, '#8a5a3c', { edge: null }); this.box(x - 0.11 * s, 0.16 * s, z - 0.11 * s, 0.22 * s, 0.22 * s, 0.22 * s, '#7fc24a', { edge: 'rgba(255,255,255,.25)' }); }
  // chữ trên mặt phẳng +z (textZ), +x (textX), hoặc đứng quay thẳng về người xem (textD)
  textZ(str, x, y, z, h, col) { const c = this.ctx, [sx, sy] = this.p(x, y, z); c.save(); c.translate(sx, sy); c.transform(CX, CY, 0, CH, 0, 0); txt(c, this.k, str, h, col); }
  textX(str, x, y, z, h, col) { const c = this.ctx, [sx, sy] = this.p(x, y, z); c.save(); c.translate(sx, sy); c.transform(CX, -CY, 0, CH, 0, 0); txt(c, this.k, str, h, col); }
  textD(str, x, y, z, h, col, stroke) { const c = this.ctx, [sx, sy] = this.p(x, y, z); c.save(); c.translate(sx, sy); c.scale(1, CH); txt(c, this.k, str, h, col, stroke); }
  // dán ảnh phẳng cv lên mặt ngang y: o góc, u/v vectơ thế giới cho mỗi điểm ảnh theo chiều ngang/dọc của ảnh
  paintTex(cv, o, u, v, y = 0) { const k = this.k, [ex, ey] = this.p(o[0], y, o[1]), c = this.ctx; c.save(); c.transform((u[0] - u[1]) * CX * k, (u[0] + u[1]) * CY * k, (v[0] - v[1]) * CX * k, (v[0] + v[1]) * CY * k, ex, ey); c.drawImage(cv, 0, 0); c.restore(); }
  texture(cv, x0, z0, w, d, y = 0) { this.paintTex(cv, [x0, z0], [w / cv.width, 0], [0, d / cv.height], y); }
  // địa hình cột khối: cells [{ x, z, h, top, side, y0?, edge? }] cạnh cs; vẽ sau → trước, deco(pen, cell) ngay sau cột
  terrain(cells, cs, deco) {
    cells.slice().sort((a, b) => a.x + a.z - (b.x + b.z) || a.x - b.x).forEach((c) => { this.box(c.x - cs / 2, c.y0 || 0, c.z - cs / 2, cs, c.h - (c.y0 || 0), cs, c.side, { top: c.top, edge: c.edge === undefined ? 'rgba(255,255,255,.14)' : c.edge }); if (deco) deco(this, c); });
  }
  // sprite nướng sẵn { canvas, ax, ay, k } neo tại (x, y, z)
  sprite(s, x = 0, z = 0, y = 0, scale = 1) { const cv = s.canvas, [sx, sy] = this.p(x, y, z), f = (this.k / s.k) * scale; this.ctx.drawImage(cv, sx - s.ax * f, sy - s.ay * f, cv.width * f, cv.height * f); }
}
// tiện ích cho skin (skin không import): pen.u.rng, hash, shade, mix, light, wp
Pen.prototype.u = { rng, hash, shade, mix, light, wp };
export function rboxPts(x, y, z, w, h, d, yaw = 0, pitch = 0) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), pts = [];
  for (const ly of [0, h]) for (const [lx, lz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]) { const x1 = lx * cp - ly * sp, y1 = lx * sp + ly * cp; pts.push([x + x1 * cy + lz * sy, y + y1, z - x1 * sy + lz * cy]); }
  return pts;
}

/* Bút soi gương x ↔ z: cùng mô hình cho ô cạnh 1 và 3, mặt sáng vẫn bên phải.
   Hàm nhận (x, …, z) đổi chỗ toạ độ; hàm nhận (x, z) ở đầu cũng vậy. Hàm không toạ độ đi thẳng. */
const S3 = ([x, y, z]) => [z, y, x];
const XYZ = ['p', 'at', 'cyl', 'ball', 'cone', 'disc', 'puff'], XZ = ['ellipseShadow', 'cubeTree', 'flag', 'flagC'];
export function swapPen(pen) {
  if (pen.swapped) return pen.raw;
  const w = Object.create(pen);
  Object.assign(w, { swapped: true, raw: pen });
  for (const m of XYZ) w[m] = (x, y, z, ...r) => (m === 'at' ? swapPen(pen.at(z, y, x)) : pen[m](z, y, x, ...r));
  for (const m of XZ) w[m] = (x, z, ...r) => pen[m](z, x, ...r);
  Object.assign(w, {
    poly: (pts, ...r) => pen.poly(pts.map(S3), ...r), solid: (c, col) => pen.solid(c.map(S3), col), line3: (pts, ...r) => pen.line3(pts.map(S3), ...r),
    bunting: (a, b, ...r) => pen.bunting(S3(a), S3(b), ...r),
    box: (x, y, z, W, h, d, col, o) => pen.box(z, y, x, d, h, W, col, o),
    gableX: (x, y, z, W, d, ...r) => pen.gableZ(z, y, x, d, W, ...r), gableZ: (x, y, z, W, d, ...r) => pen.gableX(z, y, x, d, W, ...r),
    hip: (x, y, z, W, d, ...r) => pen.hip(z, y, x, d, W, ...r),
    quadZ: (...a) => pen.quadX(...a), quadX: (...a) => pen.quadZ(...a),
    ground: (x0, z0, x1, z1, ...r) => pen.ground(z0, x0, z1, x1, ...r),
    shadow: (x, z, W, d, ...r) => pen.shadow(z, x, d, W, ...r),
    flatEllipse: (x, y, z, rx, rz, ...r) => pen.flatEllipse(z, y, x, rz, rx, ...r),
    textZ: (s, x, y, z, ...r) => pen.textX(s, z, y, x, ...r), textX: (s, x, y, z, ...r) => pen.textZ(s, z, y, x, ...r), textD: (s, x, y, z, ...r) => pen.textD(s, z, y, x, ...r),
    rbox: (x, y, z, W, h, d, col, yaw, pitch) => pen.solid(rboxPts(x, y, z, W, h, d, yaw, pitch).map(S3), col),
    paintTex: (cv, o, u, v, y) => pen.paintTex(cv, [o[1], o[0]], [u[1], u[0]], [v[1], v[0]], y),
    texture: (cv, x0, z0, W, d, y) => pen.paintTex(cv, [z0, x0], [0, W / cv.width], [d / cv.height, 0], y),
    sprite: (s, x = 0, z = 0, ...r) => pen.sprite(s, z, x, ...r), nat: (n, x, z, ...r) => pen.nat(n, z, x, ...r),
    terrain: (cells, cs, deco) => Pen.prototype.terrain.call(w, cells, cs, deco),
  });
  return w;
}

/* ---------- canvas tạm (chỉ trình duyệt) ---------- */
export function canvas(w, h) { const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h)); return cv; }
// nướng hàm vẽ thành sprite neo tại gốc mặt đất; khung win theo đơn vị camera; cắt bỏ viền trong suốt
export function bake(fn, win, k) {
  const cv = canvas((win.R - win.L) * k, (win.T - win.B) * k), g = cv.getContext('2d', { willReadFrequently: true }), ax = -win.L * k, ay = win.T * k;
  fn(new Pen(g, k, ax, ay));
  const W = cv.width, H = cv.height, d = g.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (d[(y * W + x) * 4 + 3] > 4) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(W, x1 + 3); y1 = Math.min(H, y1 + 3);
  const out = canvas(x1 - x0, y1 - y0); out.getContext('2d').drawImage(cv, -x0, -y0);
  return { canvas: out, ax: ax - x0, ay: ay - y0, k };
}
// chữ vừa khung trên texture phẳng (tên ô, nhãn góc)
export function fitText(c, str, x, y, size, maxW, rot = 0, color = '#fff', shadow = 'rgba(52,72,84,.55)') {
  c.save(); c.translate(x, y); c.rotate(rot); let f = size; do { c.font = `900 ${f}px ${FONT}`; f -= 2; } while (c.measureText(str).width > maxW && f > 10);
  c.textAlign = 'center'; c.textBaseline = 'middle'; if (shadow) { c.fillStyle = shadow; c.fillText(str, 0, Math.max(2, size * 0.07)); } c.fillStyle = color; c.fillText(str, 0, 0); c.restore();
}

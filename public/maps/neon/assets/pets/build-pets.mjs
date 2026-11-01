// T25: sinh 4 nhân vật Lumina-01 (SVG, vẽ bằng code, không asset ngoài).
// Chạy: node public/maps/neon/assets/pets/build-pets.mjs
// Mỗi nhân vật -> <id>-token.svg (nền trong, chân ở giữa đáy, 220x220 như pet-*.png)
//              -> <id>-avatar.png (vuông, nền tối + quầng màu chủ; PNG vì test maps yêu cầu).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const OUT = path.dirname(fileURLToPath(import.meta.url));
const S = 34;           // nửa chiều rộng 1 đơn vị (px)
const GX = 110, GY = 192; // gốc (chân); chân neo ở 0.94 chiều cao ~ y=207

export const CAST = [
  { id: 'neon-runner', n: 'Hacker', c: '#ff2fa0' },
  { id: 'neon-courier', n: 'Shipper', c: '#3d7bff' },
  { id: 'neon-cat', n: 'Mèo Chrome', c: '#9dff2e' },
  { id: 'neon-drone', n: 'Drone', c: '#ff9f1a' },
];

const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const shade = (h, f) => '#' + hx(h).map((v) => Math.max(0, Math.min(255, Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f))).toString(16).padStart(2, '0')).join('');
const P = (x, y, z) => [GX + (x - y) * S, GY + (x + y) * S / 2 - z * S];
const pts = (a) => a.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
const poly = (a, fill, extra = '') => `<polygon points="${pts(a)}" fill="${fill}" ${extra}/>`;

// Khối hộp iso: góc nhỏ (x,y,z), kích thước w (trục x), d (trục y), h (cao).
// Mặt thấy được: đỉnh, mặt trái (y lớn), mặt phải (x lớn).
function box(x, y, z, w, d, h, col, o = {}) {
  const st = `stroke="${shade(col, 0.4)}" stroke-width="1.1" stroke-linejoin="round"`;
  let s = '';
  s += poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], shade(col, 0.78), st);
  s += poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], shade(col, 0.55), st);
  s += poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], shade(col, 1.18), st);
  // dải sáng quanh cả hai mặt hướng người xem (z0..z1 tính từ đáy khối), màu glow
  if (o.band) {
    const [z0, z1, bc] = o.band;
    s += poly([P(x, y + d, z + z0), P(x + w, y + d, z + z0), P(x + w, y + d, z + z1), P(x, y + d, z + z1)], bc);
    s += poly([P(x + w, y, z + z0), P(x + w, y + d, z + z0), P(x + w, y + d, z + z1), P(x + w, y, z + z1)], shade(bc, 0.7));
  }
  return s;
}
// vạch glow (lõi sáng + quầng)
const glowLine = (a, col, w = 2) => `<polyline points="${pts(a)}" fill="none" stroke="${col}" stroke-width="${w + 3}" stroke-linecap="round" stroke-linejoin="round" opacity=".45" filter="url(#bl)"/><polyline points="${pts(a)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${pts(a)}" fill="none" stroke="#fff" stroke-width="${w * 0.35}" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>`;
const dot = (p, r, col) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r + 3}" fill="${col}" opacity=".45" filter="url(#bl)"/><circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r}" fill="${col}"/><circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r * 0.4}" fill="#fff"/>`;
const ground = (rx = 40, ry = 15, col = '#000') => `<ellipse cx="${GX}" cy="${GY + 8}" rx="${rx}" ry="${ry}" fill="${col}" opacity=".35"/>`;

const SK = '#e8b99a', DK = '#1d2238', DK2 = '#2b3152', CY = '#27e6ff';

function runner(c) {
  let s = ground(38, 14);
  s += box(-0.62, -0.25, 0, 0.5, 0.5, 0.9, DK2) + box(0.12, -0.25, 0, 0.5, 0.5, 0.9, DK2);   // chân
  // cáp từ mũ trùm sau lưng (vẽ trước thân để nằm phía sau)
  s += glowLine([P(-0.5, -0.6, 3.1), P(-1.1, -1.0, 2.6), P(-1.1, -0.6, 1.5), P(-0.7, -0.2, 0.6)], c, 2.2);
  s += box(-0.7, -0.45, 0.9, 1.4, 0.9, 1.2, '#3a2a6a', { band: [0.7, 0.9, c] });                    // áo khoác
  s += box(-0.5, -0.4, 2.1, 1.0, 0.8, 0.8, DK);                                                      // mũ trùm
  s += box(-0.45, -0.35, 2.2, 0.9, 0.7, 0.6, SK);                                                   // mặt
  s += box(-0.52, -0.42, 2.45, 1.04, 0.84, 0.28, '#101426', { band: [0.06, 0.2, CY] });             // kính visor
  s += box(-0.5, -0.4, 2.9, 1.0, 0.8, 0.2, shade(c, 0.9));                                          // viền mũ màu chủ
  s += dot(P(0.55, 0.4, 2.62), 2.2, CY);
  return s;
}
function courier(c) {
  let s = `<ellipse cx="${GX}" cy="${GY + 9}" rx="46" ry="15" fill="${c}" opacity=".35" filter="url(#bl)"/>` + ground(36, 11);
  s += box(-0.95, -0.6, 0.35, 1.9, 1.2, 0.22, '#141a30');                                           // ván bay
  s += glowLine([P(-0.95, 0.6, 0.38), P(0.95, 0.6, 0.38), P(0.95, -0.6, 0.38)], c, 2.4);
  s += box(-0.5, -0.3, 0.57, 0.4, 0.4, 0.8, DK2) + box(0.1, -0.3, 0.57, 0.4, 0.4, 0.8, DK2);       // chân
  s += box(-1.0, -0.5, 1.2, 0.5, 1.0, 1.0, '#e8f0ff', { band: [0.4, 0.6, c] });                    // thùng hàng sau lưng
  s += box(-0.5, -0.45, 1.37, 1.2, 0.9, 1.1, c, { band: [0.45, 0.6, '#ffffff'] });                  // áo
  s += box(-0.38, -0.36, 2.47, 0.95, 0.75, 0.7, SK);                                                // đầu
  s += box(-0.44, -0.4, 2.95, 1.07, 0.83, 0.28, '#10142a');                                         // mũ lưỡi trai
  s += box(0.2, -0.1, 3.0, 0.6, 0.5, 0.1, '#10142a');                                               // lưỡi
  s += dot(P(0.4, 0.38, 2.78), 1.8, '#27e6ff');
  return s;
}
function cat(c) {
  const CH = '#aab6cc';
  let s = ground(40, 14);
  s += glowLine([P(-0.9, -0.2, 0.9), P(-1.15, -0.3, 1.8), P(-0.95, -0.6, 2.6), P(-0.6, -0.5, 3.1)], c, 2.6); // đuôi phát sáng
  s += box(-0.65, -0.45, 0, 0.35, 0.35, 0.55, CH) + box(0.3, -0.45, 0, 0.35, 0.35, 0.55, CH);       // chân sau
  s += box(-0.75, -0.55, 0.45, 1.5, 1.05, 1.1, CH, { band: [0.5, 0.62, c] });                       // thân chrome
  s += box(-0.6, 0.1, 0, 0.35, 0.35, 0.55, '#c9d3e6') + box(0.3, 0.1, 0, 0.35, 0.35, 0.55, '#c9d3e6');
  s += box(-0.55, -0.45, 1.5, 1.2, 0.95, 0.95, '#c9d3e6');                                          // đầu
  s += box(-0.6, -0.4, 2.45, 0.42, 0.34, 0.7, '#c9d3e6') + box(0.25, -0.4, 2.45, 0.42, 0.34, 0.7, '#c9d3e6'); // tai nhọn
  s += box(-0.5, -0.05, 2.5, 0.22, 0.12, 0.4, c) + box(0.35, -0.05, 2.5, 0.22, 0.12, 0.4, c);
  s += glowLine([P(-0.4, 0.55, 1.75), P(-1.0, 0.75, 1.9)], '#fff', 1) + glowLine([P(0.7, 0.45, 1.75), P(0.95, 1.0, 1.85)], '#fff', 1);  // ria
  s += dot(P(-0.15, 0.5, 2.05), 2.6, c) + dot(P(0.55, 0.42, 2.05), 2.6, c);                         // mắt
  s += glowLine([P(-0.55, 0.5, 1.75), P(0.55, 0.5, 1.75)], '#27e6ff', 1.4);                         // dải LED cổ
  return s;
}
function drone(c) {
  const W = '#e9edf5';
  let s = ground(30, 10);
  s += `<polygon points="${pts([P(-0.5, -0.3, 1.6), P(0.5, -0.3, 1.6), P(0.2, 0.2, 0), P(-0.2, 0.2, 0)])}" fill="${c}" opacity=".22" filter="url(#bl)"/>`; // tia quét xuống
  s += box(-0.8, -0.8, 1.9, 1.6, 1.6, 0.2, '#141a30');                                              // khung dưới
  s += box(-0.7, -0.7, 2.1, 1.4, 1.4, 0.9, c, { band: [0.3, 0.45, '#ffffff'] });                    // thân cam
  s += box(-0.6, -0.6, 3.0, 1.2, 1.2, 0.25, W);                                                     // nắp trắng
  s += box(-0.12, -0.12, 3.25, 0.24, 0.24, 0.3, '#ff3b4e');                                         // đèn còi
  // cánh quạt 4 góc
  for (const [rx, ry] of [[-1.35, -0.2], [0.75, -0.2], [-0.3, 0.75], [-0.3, -1.35]]) s += box(rx, ry, 2.55, 0.6, 0.6, 0.1, '#10142a') + glowLine([P(rx - 0.1, ry + 0.3, 2.75), P(rx + 0.7, ry + 0.3, 2.75)], CY, 1.2);
  s += dot(P(0.1, 0.72, 2.45), 3, CY);                                                                // mắt cảm biến
  s += dot(P(0.0, 0.0, 3.62), 2.2, '#ff3b4e');
  return s;
}
const DRAW = { 'neon-runner': runner, 'neon-courier': courier, 'neon-cat': cat, 'neon-drone': drone };

const defs = '<defs><filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter></defs>';
const token = (p) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="220" height="220">${defs}${DRAW[p.id](p.c)}</svg>\n`;
const avatar = (p) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="220" height="220">${defs}<defs><radialGradient id="g" cx="50%" cy="62%" r="62%"><stop offset="0" stop-color="${p.c}" stop-opacity=".55"/><stop offset="1" stop-color="#0b0f1c"/></radialGradient></defs><rect width="220" height="220" rx="34" fill="url(#g)"/><rect x="3" y="3" width="214" height="214" rx="32" fill="none" stroke="${p.c}" stroke-width="3" opacity=".9"/><g transform="translate(110 112) scale(1.12) translate(-110 -128)">${DRAW[p.id](p.c)}</g></svg>\n`;

for (const p of CAST) {
  fs.writeFileSync(path.join(OUT, `${p.id}-token.svg`), token(p));
  await sharp(Buffer.from(avatar(p)), { density: 384 }).resize(512, 512).png({ compressionLevel: 9 }).toFile(path.join(OUT, `${p.id}-avatar.png`));
}
console.log('đã sinh', CAST.length * 2, 'file (token SVG + avatar PNG) ở', OUT);

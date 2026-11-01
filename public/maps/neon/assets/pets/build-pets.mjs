// T25 (vòng 4): sinh 4 nhân vật Lumina-01 theo spec chủ sản phẩm (docs/maps/neon-concept.md, "Thiết Kế Nhân Vật").
// Chạy: node public/maps/neon/assets/pets/build-pets.mjs
// Vẽ bằng code (SVG), không asset ngoài. Nhân vật gốc, không dựa vào nhân vật / logo / thương hiệu nào.
// Phong cách: anime trưởng thành, cel-shading 3 lớp tự động (bóng cứng dưới-phải, rim light màu chủ mép phải,
// highlight mép trên-trái), viền tối mảnh. Quân cờ có viền tối + quầng màu chủ để tách khỏi nền (kể cả cyan của bàn).
// Mỗi nhân vật -> <id>-avatar.png (512x512, chân dung bán thân, nền tối + quầng màu chủ; PNG vì test maps yêu cầu)
//              -> <id>-token.svg (nền trong, 220x220, vẽ góc nhìn 3/4 từ trên; bóng/điểm neo giữa đáy y≈204).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const OUT = path.dirname(fileURLToPath(import.meta.url));

// Màu chủ: 4 tông cách xa nhau về hue (vàng 42°, cyan 190°, magenta 312°, lime 84°).
export const CAST = [
  { id: 'neon-vance', n: 'Vance', c: '#ffb81f' },
  { id: 'neon-nyx', n: 'Nyx', c: '#1fd8ff' },
  { id: 'neon-seraphina', n: 'Seraphina', c: '#ff2fd2' },
  { id: 'neon-k9000', n: 'K-9000', c: '#a4ff1c' },
];

const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// f < 1 tối đi, f > 1 sáng lên (pha trắng)
const shade = (h, f) => '#' + hx(h).map((v) => Math.max(0, Math.min(255, Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f))).toString(16).padStart(2, '0')).join('');

const OL = '#070914'; // viền tối

const lg = (id, stops, x1 = 0.2, y1 = 0, x2 = 0.7, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`;
const rg = (id, stops, cx = 0.35, cy = 0.3, r = 0.8) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`;
// nét phát sáng: quầng mờ + nét màu + lõi trắng
const glow = (d, col, w = 3, core = true, o = 0.55) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w + 4}" stroke-linecap="round" stroke-linejoin="round" opacity="${o}" filter="url(#bl)"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>${core ? `<path d="${d}" fill="none" stroke="#fff" stroke-width="${(w * 0.38).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>` : ''}`;
const halo = (cx, cy, r, col, o = 0.6) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}" opacity="${o}" filter="url(#bl)"/>`;
const line = (d, col, w = 1.2, o = 1) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${o}"/>`;
const shine = (d, w = 1.4, o = 0.85) => line(d, '#fff', w, o);
// bóng đổ mềm dưới quân (điểm neo)
const shadow = (rx = 34, ry = 8, o = 0.5) => `<ellipse cx="110" cy="204" rx="${rx}" ry="${ry}" fill="#000" opacity="${o}" filter="url(#sb)"/>`;

// ---- cel-shading tự động: mỗi mảng = nền + bóng cứng (dưới-phải) + rim màu chủ (mép phải) + highlight (mép trên-trái)
function makeCel(rim) {
  let n = 0;
  const defs = [];
  const M = (id, dx, dy) => `<mask id="${id}" maskUnits="userSpaceOnUse" x="-60" y="-60" width="340" height="340"><rect x="-60" y="-60" width="340" height="340" fill="#fff"/><use href="#${id.split('-')[0]}" transform="translate(${dx} ${dy})" fill="#000"/></mask>`;
  const R = '<rect x="-60" y="-60" width="340" height="340"';
  // o: { fill, sh (màu bóng), sx, sy (độ dày bóng), rw (độ dày rim, 0 = không), hw (highlight), ho, w (viền), rimC }
  const cel = (d, o) => {
    const id = 'p' + (n++);
    const { fill, sh, sx = 5, sy = 4, rw = 2.2, hw = 1.6, ho = 0.5, w = 1.6, rimC = rim, hi = '#ffffff', op = 1 } = o;
    defs.push(`<path id="${id}" d="${d}"/><clipPath id="${id}-c"><use href="#${id}"/></clipPath>`
      + M(`${id}-s`, -sx, -sy) + (rw ? M(`${id}-r`, -rw, 0.4) : '') + (hw ? M(`${id}-h`, hw, hw) : ''));
    return `<g opacity="${op}"><use href="#${id}" fill="${fill}"/><g clip-path="url(#${id}-c)">`
      + (sh ? `${R} fill="${sh}" mask="url(#${id}-s)"/>` : '')
      + (rw ? `${R} fill="${rimC}" mask="url(#${id}-r)"/>` : '')
      + (hw ? `${R} fill="${hi}" opacity="${ho}" mask="url(#${id}-h)"/>` : '')
      + `</g>` + (w ? `<use href="#${id}" fill="none" stroke="${OL}" stroke-width="${w}" stroke-linejoin="round"/>` : '') + '</g>';
  };
  return { cel, defs: () => defs.join('') };
}

// bl = quầng; sb = bóng mềm; rim = viền tối mảnh + quầng neon màu chủ quanh bóng dáng (đọc được trên nền cyan của bàn).
const filters = (c) => `<filter id="bl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.6"/></filter>
<filter id="sb" x="-40%" y="-200%" width="180%" height="500%"><feGaussianBlur stdDeviation="3"/></filter>
<filter id="rim" x="-25%" y="-25%" width="150%" height="150%"><feMorphology in="SourceAlpha" operator="dilate" radius="3" result="d"/><feFlood flood-color="${c}"/><feComposite in2="d" operator="in" result="o"/><feGaussianBlur in="o" stdDeviation="3" result="ob"/><feMorphology in="SourceAlpha" operator="dilate" radius="1.3" result="k"/><feFlood flood-color="${OL}"/><feComposite in2="k" operator="in" result="ko"/><feMerge><feMergeNode in="ob"/><feMergeNode in="ob"/><feMergeNode in="ko"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

// ================================================================ phần chung của chân dung (hệ 220, đầu quay 3/4 sang phải)
const HEAD = 'M86 80 C85 58 97 44 113 44 C131 45 141 59 140 79 C139 97 133 111 121 119 C115 123 107 123 101 119 C91 111 86 97 86 80Z';
const EAR = 'M89 80 C81 76 78 90 84 96 C86 98 89 98 90 96Z';
const NECK = 'M100 106 L99 142 L125 142 L124 106Z';
// mắt anime: lòng trắng + mống mắt gradient + đồng tử + highlight + mi trên dày
function eye(cx, y, w, iris, kind = 'round') {
  const sc = `M${cx - w} ${y + 1} Q${cx - w * 0.2} ${y - 5.5} ${cx + w} ${y - 1} L${cx + w * 0.8} ${y + 4.5} Q${cx} ${y + 7.5} ${cx - w * 0.85} ${y + 4}Z`;
  let s = `<path d="${sc}" fill="#f4f6ff"/>`;
  const rx = Math.min(4, w * 0.5);
  s += `<ellipse cx="${cx + 0.6}" cy="${y + 2}" rx="${rx}" ry="4.7" fill="url(#${iris})"/>`;
  if (kind === 'diamond') { // mắt kim cương: mặt cắt thay đồng tử
    s += `<path d="M${cx + 0.6} ${y - 2} L${cx + 0.6 + rx * 0.8} ${y + 2} L${cx + 0.6} ${y + 6} L${cx + 0.6 - rx * 0.8} ${y + 2}Z" fill="#fff" opacity=".55"/>`
      + line(`M${cx + 0.6 - rx * 0.8} ${y + 2} L${cx + 0.6 + rx * 0.8} ${y + 2} M${cx + 0.6} ${y - 2} L${cx + 0.6} ${y + 6}`, '#fff', 0.5, 0.9);
    s += `<path d="M${cx + 3} ${y - 3.5} l0.8 2 l2 0.8 l-2 0.8 l-0.8 2 l-0.8 -2 l-2 -0.8 l2 -0.8Z" fill="#fff"/>`;
  } else {
    s += `<ellipse cx="${cx + 0.6}" cy="${y + 2.4}" rx="${rx * 0.45}" ry="2.6" fill="${OL}"/>`;
    s += `<circle cx="${cx - 0.8}" cy="${y}" r="1.4" fill="#fff"/><circle cx="${cx + 2}" cy="${y + 4}" r="0.6" fill="#fff" opacity=".8"/>`;
  }
  s += `<path d="M${cx - w - 1.5} ${y + 2} Q${cx - w * 0.2} ${y - 6.8} ${cx + w + 1} ${y - 1.6} L${cx + w} ${y} Q${cx - w * 0.2} ${y - 4.4} ${cx - w} ${y + 1.6}Z" fill="${OL}"/>`;
  s += line(`M${cx - w * 0.6} ${y + 6.4} Q${cx} ${y + 7.6} ${cx + w * 0.6} ${y + 5.6}`, '#5a3a4a', 0.7, 0.6);
  return s;
}
const brow = (d, col = '#2a1c22') => line(d, col, 2, 1);
const NOSE = (col) => line('M116 90 L114 98 L117 99', col, 1.1, 0.8);
// nền avatar: quầng màu chủ + đường chân trời neon mờ phía sau
const avatarBg = (c) => `<rect width="220" height="220" fill="url(#ag)"/>`
  + `<g opacity=".35">${[[8, 120, 26], [40, 96, 18], [62, 132, 22], [150, 104, 20], [176, 82, 30], [200, 124, 18]].map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="${220 - y}" fill="#0a0f22"/><rect x="${x + 3}" y="${y + 6}" width="${w - 6}" height="1.6" fill="${c}" opacity=".7"/>`).join('')}</g>`;

// ================================================================ 1. Vance "Midas" Sterling (Cyber Gold)
function vanceAvatar(c) {
  const { cel, defs } = makeCel(c);
  const SK = '#f0c7a6', SKS = '#c08c74', suit = '#16161c', suitS = '#060609', hair = '#1d1a1f', hairS = '#0a080b';
  const gd = rg('iris', [[0, '#e9d7a8'], [0.5, '#7a5a2a'], [1, '#2e2010']], 0.5, 0.4, 0.7)
    + lg('gold', [[0, shade(c, 1.45)], [0.45, c], [0.55, shade(c, 0.55)], [1, shade(c, 1.1)]], 0, 0, 1, 1)
    + rg('lens', [[0, shade(c, 1.6), 0.55], [1, c, 0.2]], 0.4, 0.4, 0.7);
  let b = '';
  // thân vest đen, vai rộng
  b += cel('M24 222 C26 180 48 158 86 148 L100 138 L124 138 L142 148 C176 158 196 180 198 222Z', { fill: suit, sh: suitS, sx: 8, sy: 6, rw: 3 });
  // sơ mi trắng + cà vạt đen chỉ vàng
  b += cel('M98 140 L110 182 L124 140Z', { fill: '#eef0f6', sh: '#a8acbe', sx: 3, sy: 2, rw: 1 });
  b += cel('M107 150 L113 150 L116 184 L110 192 L104 184Z', { fill: '#101014', sh: '#000', sx: 2, sy: 2, rw: 1.4 });
  b += line('M110 152 L110 188', c, 0.8, 0.8);
  // ve áo + đường viền vàng phát sáng mảnh
  b += cel('M86 148 L98 140 L110 196 L96 222 L74 222 C76 196 82 170 86 148Z', { fill: '#1d1d25', sh: suitS, sx: 4, sy: 3 });
  b += cel('M134 148 L124 140 L110 196 L124 222 L146 222 C144 196 140 170 134 148Z', { fill: '#1d1d25', sh: suitS, sx: 4, sy: 3 });
  b += glow('M98 140 L86 148 C82 170 76 196 74 222', c, 1.3) + glow('M124 140 L134 148 C140 170 144 196 146 222', c, 1.3);
  b += glow('M156 158 C176 166 190 184 194 220', c, 1, true, 0.4);
  b += `<path d="M150 176 l10 -2" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`; // khăn cài túi
  // vai + cánh tay phải (bên trái ảnh): tay máy đen-vàng, nâng bàn tay trước ngực
  b += cel('M24 222 C24 192 34 168 56 158 C70 154 82 160 84 172 C86 190 74 206 62 222Z', { fill: '#0e0e13', sh: '#000', sx: 5, sy: 4, rw: 2 });
  b += cel('M44 180 C52 168 70 168 76 178 L72 196 C64 204 48 200 44 190Z', { fill: 'url(#gold)', sh: shade(c, 0.4), sx: 3, sy: 3, rw: 0, hw: 1.6, ho: 0.8 });
  b += cel('M62 202 C70 186 86 178 98 184 L100 196 C90 200 80 208 74 222 L58 222Z', { fill: '#111117', sh: '#000', sx: 3, sy: 3 });
  b += line('M66 206 C74 196 84 190 96 190', c, 1.1, 0.9);
  b += line('M50 186 C56 180 64 178 72 182 M48 194 C56 190 64 190 70 194', OL, 1.2, 0.9) + line('M34 214 C40 196 48 184 58 176', c, 1, 0.7) + halo(62, 172, 3, c, 0.8);
  // bàn tay máy: các đốt ngón vàng
  b += cel('M92 178 C98 170 108 172 110 180 C112 188 104 196 96 196 C90 194 88 184 92 178Z', { fill: '#16161c', sh: '#000', sx: 2, sy: 2, rw: 1.6 });
  b += `<g fill="url(#gold)" stroke="${OL}" stroke-width="0.9">${[[94, 168, -14], [100, 165, -6], [106, 166, 4], [111, 171, 16]].map(([x, y, r]) => `<rect x="${x - 2.4}" y="${y - 6}" width="4.8" height="12" rx="2.4" transform="rotate(${r} ${x} ${y})"/>`).join('')}</g>`;
  b += halo(101, 186, 3, c, 0.9) + `<circle cx="101" cy="186" r="1.6" fill="#fff8e0"/>`;
  // cổ + đầu
  b += cel(NECK, { fill: SK, sh: SKS, sx: 6, sy: 0, rw: 0, hw: 0, w: 1.2 });
  b += cel('M96 128 L110 146 L126 128 L124 140 L110 152 L98 140Z', { fill: '#eef0f6', sh: '#a8acbe', sx: 2, sy: 2, rw: 0 });
  b += cel(EAR, { fill: SK, sh: SKS, sx: 2, sy: 2, rw: 0, hw: 0 });
  b += cel(HEAD, { fill: SK, sh: SKS, sx: 6, sy: 3, rw: 1.8, hw: 1.2, ho: 0.4 });
  b += eye(101, 82, 8, 'iris') + eye(126, 81, 6.5, 'iris');
  b += brow('M90 72 Q100 67 109 70') + brow('M119 69 Q127 66 135 70');
  b += NOSE(SKS) + line('M104 108 Q111 110 118 106', '#8a4a44', 1.2) + line('M112 107 L117 104', '#8a4a44', 0.8, 0.6);
  // kính AR một mắt (mắt trái nhân vật = bên phải ảnh) + biểu đồ chứng khoán
  b += `<circle cx="126" cy="83" r="10.5" fill="url(#lens)"/>` + glow('M126 72.5 A10.5 10.5 0 1 1 125.9 72.5', c, 1.6, true, 0.6);
  b += line('M119 88 L122 85 L124 87 L128 81 L130 83 L133 78', '#fff3c4', 0.9) + line('M119 90 L133 90', c, 0.6, 0.7);
  b += line('M136 85 C142 90 142 100 138 108', c, 0.8, 0.8) + `<rect x="116" y="69" width="7" height="3" fill="${c}" opacity=".7"/>`;
  // tóc vuốt ngược, rẽ ngôi, vài sợi rơi
  b += cel('M84 76 C80 52 96 34 116 34 C136 34 146 48 143 70 C140 62 134 54 124 52 C114 50 104 52 98 56 C92 62 88 68 87 80Z', { fill: hair, sh: hairS, sx: 4, sy: 4, rw: 2, hw: 1.4 });
  b += cel('M98 56 C104 48 118 46 128 50 C120 50 110 54 104 62Z', { fill: '#2e2a33', sh: hairS, sx: 2, sy: 2, rw: 0 });
  b += line('M112 54 C108 60 106 66 107 72', hair, 1.6) + shine('M96 44 Q108 36 122 37', 1.4, 0.55);
  return { defs: gd + defs(), body: b };
}
function vanceToken(c) {
  const { cel, defs } = makeCel(c);
  const gd = lg('gold', [[0, shade(c, 1.55)], [0.4, c], [0.6, shade(c, 0.6)], [1, shade(c, 1.15)]], 0, 0, 0.4, 1)
    + lg('goldS', [[0, shade(c, 0.75)], [1, shade(c, 0.32)]], 0, 0, 0, 1)
    + lg('glass', [[0, '#3a3f56'], [0.5, '#090b14'], [1, '#1a1508']], 0, 0, 1, 1)
    + `<radialGradient id="th" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6d0"/><stop offset=".4" stop-color="${c}" stop-opacity=".8"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  let b = '';
  // lực đẩy phản trọng lực dưới gầm
  b += `<ellipse cx="80" cy="186" rx="18" ry="6" fill="url(#th)"/><ellipse cx="146" cy="182" rx="18" ry="6" fill="url(#th)"/>`;
  // sườn xe (thân dưới), mũi hướng phải-trước
  b += cel('M40 146 C40 164 64 178 106 180 C146 182 182 170 188 150 C186 160 162 168 120 168 C80 168 46 160 40 146Z', { fill: 'url(#goldS)', sh: shade(c, 0.25), sx: 0, sy: -4, rw: 2 });
  // mặt trên khí động học
  b += cel('M40 146 C42 130 76 118 118 118 C156 118 186 128 188 148 C186 160 162 168 120 168 C80 168 44 160 40 146Z', { fill: 'url(#gold)', sh: shade(c, 0.5), sx: 6, sy: 5, rw: 2.6, hw: 2, ho: 0.7 });
  // cánh đuôi
  b += cel('M44 140 C40 128 46 120 56 120 L76 124 C70 130 62 138 58 146Z', { fill: 'url(#gold)', sh: shade(c, 0.45), sx: 2, sy: 3, rw: 1.6 });
  // buồng lái kính đen
  b += cel('M86 140 C90 124 120 116 146 122 C160 126 162 140 150 148 C130 156 100 154 86 140Z', { fill: 'url(#glass)', sh: '#000', sx: 3, sy: 3, rw: 1.8, hw: 0 });
  b += shine('M96 134 C106 124 124 121 140 123', 1.4, 0.8) + line('M108 144 C120 148 136 146 148 140', c, 0.9, 0.6);
  // đường viền vàng phát sáng + đèn pha / đèn hậu
  b += glow('M44 150 C60 164 100 172 136 170 C160 168 178 162 186 152', '#fff3c0', 1.2, false, 0.6);
  b += glow('M182 142 L188 147', '#ffffff', 2.4) + halo(186, 146, 6, '#fff6d8', 0.8);
  b += glow('M42 144 L48 150', '#ff5a3c', 1.8, false, 0.8);
  b += line('M118 120 C116 130 114 140 110 152', shade(c, 0.5), 0.9, 0.7) + line('M70 150 L84 158', shade(c, 0.45), 1, 0.7);
  return { defs: gd + defs(), body: shadow(56, 9, 0.45) + `<g filter="url(#rim)">${b}</g>` };
}

// ================================================================ 2. Nyx "Zero-Day" (Electric Cyan)
function nyxAvatar(c) {
  const { cel, defs } = makeCel(c);
  const SK = '#f6d7c8', SKS = '#c99a90', jk = '#1b2236', jkS = '#0a0e1a';
  const hair = '#e4f4ff', hairS = '#8fb7d6';
  const gd = rg('iris', [[0, '#e8fdff'], [0.45, c], [1, '#063a5a']], 0.5, 0.4, 0.7)
    + rg('scr', [[0, '#d8fbff'], [0.5, c, 0.85], [1, '#0a3a5a']], 0.4, 0.3, 0.9)
    + rg('bub', [[0, '#ffffff', 0.9], [0.5, '#9ff2ff', 0.6], [1, c, 0.35]], 0.35, 0.3, 0.7);
  let b = '';
  // áo bomber techwear, vai phồng
  b += cel('M26 222 C24 186 42 160 78 150 L98 140 L124 140 L146 150 C180 160 198 186 196 222Z', { fill: jk, sh: jkS, sx: 8, sy: 6, rw: 3 });
  b += line('M44 176 C52 168 62 164 72 162 M150 162 C162 166 172 172 178 182', '#2c3654', 2, 0.9);
  b += cel('M96 152 L110 222 L124 152Z', { fill: '#0c0f19', sh: '#000', sx: 2, sy: 2, rw: 1 }); // áo trong tối, cổ kín
  b += line('M104 158 L110 160 L116 158', c, 0.9, 0.7);
  b += line('M70 190 L84 196 M136 196 L152 190', c, 1, 0.5);
  // cổ áo cao + dải LED
  b += cel('M88 138 L96 158 L110 164 L126 158 L134 138 C122 132 100 132 88 138Z', { fill: '#252e48', sh: jkS, sx: 3, sy: 3 });
  b += glow('M92 146 C102 154 120 154 130 146', c, 2);
  // cyberdeck cầm tay (đáy khung)
  b += cel('M118 196 L176 184 L184 210 L126 222Z', { fill: '#262c40', sh: '#0b0e18', sx: 3, sy: 3, rw: 1.8 });
  b += `<path d="M124 199 L172 189 L177 204 L129 214Z" fill="url(#scr)" stroke="${OL}" stroke-width="1"/>`;
  b += line('M130 204 L146 201 M132 208 L158 202 M150 196 L168 192', '#eaffff', 0.9, 0.9);
  b += cel('M112 206 C110 198 120 194 126 198 C130 204 124 212 118 212Z', { fill: SK, sh: SKS, sx: 2, sy: 2, rw: 1.2, hw: 0 });
  // cổ + đầu
  b += cel(NECK, { fill: SK, sh: SKS, sx: 6, sy: 0, rw: 0, hw: 0, w: 1.2 });
  b += cel(HEAD, { fill: SK, sh: SKS, sx: 6, sy: 3, rw: 1.8, hw: 1.2, ho: 0.4 });
  b += eye(101, 83, 8, 'iris') + eye(126, 82, 6.5, 'iris');
  b += brow('M91 74 Q100 70 108 73', '#7d98b0') + brow('M119 71 Q127 69 134 73', '#7d98b0');
  b += line('M126 92 L128 94 M129 91 L131 93', c, 0.8, 0.8); // hình xăm mạch nhỏ dưới mắt
  b += NOSE(SKS) + line('M105 108 Q110 110 116 107', '#9a4f5c', 1.2);
  // bong bóng kẹo cao su phát sáng
  b += `<circle cx="119" cy="110" r="6" fill="url(#bub)" stroke="${shade(c, 0.6)}" stroke-width=".8"/>` + halo(119, 110, 6, c, 0.35) + `<circle cx="117" cy="108" r="1.3" fill="#fff"/>`;
  // tóc ngắn bất đối xứng: bên trái cắt sát, mái dài lệch phủ phải
  b += cel('M84 82 C78 56 92 36 114 35 C134 34 148 48 146 72 C146 86 142 96 140 104 C138 92 136 82 130 74 C126 66 118 62 110 62 C104 66 98 70 92 70 C90 74 88 78 88 86Z', { fill: hair, sh: hairS, sx: 4, sy: 4, rw: 2.2, hw: 1.2 });
  b += cel('M118 50 C132 52 142 64 140 84 C138 76 134 70 128 66Z', { fill: shade(c, 1.25), sh: shade(c, 0.6), sx: 2, sy: 2, rw: 0, hw: 0, w: 1 });
  b += line('M98 46 C110 40 124 42 134 50', '#ffffff', 1.4, 0.7) + line('M106 52 C114 50 120 54 124 62', hairS, 1.2, 0.8);
  // tai nghe chụp tai + tai mèo cơ khí phát sáng
  b += line('M86 66 C88 34 140 28 146 62', OL, 6) + line('M86 66 C88 34 140 28 146 62', '#2c3554', 3.6);
  b += cel('M78 70 C78 62 92 62 94 70 L94 92 C94 100 78 100 78 92Z', { fill: '#2a3150', sh: '#0e1222', sx: 3, sy: 3, rw: 1.8 });
  b += glow('M82 74 L82 90', c, 1.6);
  b += cel('M140 64 C140 58 150 58 151 64 L151 84 C151 90 140 90 140 84Z', { fill: '#2a3150', sh: '#0e1222', sx: 2, sy: 2, rw: 1.6 });
  b += cel('M88 46 L84 22 L104 38Z', { fill: '#2a3150', sh: '#0e1222', sx: 2, sy: 2, rw: 1.6 });
  b += cel('M126 36 L142 18 L144 44Z', { fill: '#2a3150', sh: '#0e1222', sx: 2, sy: 2, rw: 1.6 });
  b += `<path d="M90 42 L87 28 L99 38Z M130 36 L140 24 L141 41Z" fill="${c}"/>` + halo(92, 36, 5, c, 0.7) + halo(137, 32, 5, c, 0.7);
  b += line('M89.5 39 L88.5 31 M134 34 L138 28', '#fff', 0.8, 0.9);
  return { defs: gd + defs(), body: b };
}
function nyxToken(c) {
  const { cel, defs } = makeCel(c);
  const metal = '#3a4462', metalS = '#151a2c';
  const gd = rg('dome', [[0, '#7e8bb0'], [0.5, '#2d3552'], [1, '#0f1324']], 0.38, 0.3, 0.8)
    + rg('lens', [[0, '#f0feff'], [0.35, c], [1, '#04223a']], 0.42, 0.4, 0.7);
  let b = '';
  // chân: (khớp hông trên thân -> gối nhô cao -> mũi chân)
  const leg = (hip, knee, foot) => {
    const d = `M${hip[0]} ${hip[1]} Q${knee[0] - (foot[0] - hip[0]) * 0.1} ${knee[1] - 8} ${knee[0]} ${knee[1]} L${foot[0]} ${foot[1]}`;
    return line(d, OL, 8.5) + line(d, metal, 5.4) + line(d, '#8a96bc', 1.2, 0.6)
      + `<circle cx="${knee[0]}" cy="${knee[1]}" r="4.6" fill="${metalS}" stroke="${OL}" stroke-width="1.2"/>` + halo(knee[0], knee[1], 2.6, c, 0.9) + `<circle cx="${knee[0]}" cy="${knee[1]}" r="1.5" fill="#e8fdff"/>`
      + `<path d="M${foot[0] - 3} ${foot[1]} L${foot[0] + 3} ${foot[1]} L${foot[0]} ${foot[1] + 5}Z" fill="${c}" stroke="${OL}" stroke-width="1"/>`;
  };
  // hai chân sau (xa camera) trước, rồi thân, rồi hai chân trước
  b += leg([94, 150], [56, 128], [46, 172]) + leg([126, 150], [164, 128], [176, 172]);
  // thân: bụng dưới + vòm mai
  b += cel('M74 160 C74 176 92 186 110 186 C128 186 146 176 146 160 C140 170 126 174 110 174 C94 174 80 170 74 160Z', { fill: metalS, sh: '#05070e', sx: 0, sy: -3, rw: 1.8 });
  b += cel('M74 158 C72 136 90 122 110 122 C130 122 148 136 146 158 C144 170 128 176 110 176 C92 176 76 170 74 158Z', { fill: 'url(#dome)', sh: metalS, sx: 6, sy: 5, rw: 2.6, hw: 2, ho: 0.6 });
  // các tấm giáp + dải LED cyan
  b += line('M84 146 C94 138 126 138 136 146', c, 1.4) + line('M110 124 L110 140', metalS, 1.2) + glow('M88 164 C98 170 122 170 132 164', c, 1.2, false, 0.6);
  b += shine('M86 136 C92 128 100 125 108 124', 1.6, 0.85);
  // ăng-ten
  b += line('M126 126 L136 108', OL, 2.6) + line('M126 126 L136 108', '#8a96bc', 1.2) + halo(136, 108, 3.4, c, 0.9) + `<circle cx="136" cy="108" r="1.6" fill="#fff"/>`;
  // cụm mắt cảm biến phía trước
  b += `<ellipse cx="110" cy="166" rx="16" ry="7" fill="#070a14" stroke="${OL}" stroke-width="1.2"/>`;
  b += halo(110, 166, 8, c, 0.65) + `<circle cx="110" cy="166" r="5.4" fill="url(#lens)" stroke="${OL}" stroke-width="1"/><circle cx="108.4" cy="164.4" r="1.5" fill="#fff"/>`;
  b += `<circle cx="99" cy="166" r="2" fill="${c}"/><circle cx="121" cy="166" r="2" fill="${c}"/>`;
  b += leg([88, 168], [54, 176], [64, 200]) + leg([132, 168], [166, 176], [156, 200]);
  return { defs: gd + defs(), body: shadow(52, 9, 0.45) + `<g filter="url(#rim)">${b}</g>` };
}

// ================================================================ 3. Seraphina Vane (Hot Magenta) — thanh lịch, kín đáo
function seraAvatar(c) {
  const { cel, defs } = makeCel(c);
  const SK = '#c98f6e', SKS = '#9a6450', hair = '#2a1236', hairS = '#12061a';
  const gd = rg('iris', [[0, '#ffffff'], [0.4, '#ffc2f2'], [0.75, c], [1, '#5a0a4a']], 0.5, 0.4, 0.7)
    + lg('gown', [[0, '#7a2cff'], [0.5, '#c22cff'], [1, c]], 0, 0, 1, 1)
    + lg('fur', [[0, '#fff0fb'], [0.6, '#ffc0ee'], [1, shade(c, 0.85)]], 0, 0, 0.6, 1)
    + `<linearGradient id="smk" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${c}" stop-opacity=".8"/><stop offset="1" stop-color="#b56bff" stop-opacity="0"/></linearGradient>`;
  let b = '';
  // tóc dài phía sau
  b += cel('M84 70 C72 100 70 150 62 196 C80 200 92 190 96 176 L96 100Z', { fill: hair, sh: hairS, sx: 4, sy: 4, rw: 2 });
  // đầm sợi quang (cổ yếm cao, kín), sợi sáng chạy dọc
  b += cel('M30 222 C34 186 56 164 88 154 L98 130 L124 130 L134 154 C166 164 188 186 192 222Z', { fill: 'url(#gown)', sh: '#3a0a52', sx: 8, sy: 6, rw: 3, hw: 1.6, ho: 0.35 });
  for (const [x, o] of [[70, 0.7], [90, 0.9], [110, 1], [130, 0.9], [150, 0.7]]) b += glow(`M${x + (x - 110) * 0.1} 160 C${x} 182 ${x + (x - 110) * 0.3} 200 ${x + (x - 110) * 0.5} 222`, '#ffd6f6', 0.7, false, o * 0.5);
  b += halo(96, 190, 2, '#fff', 0.9) + halo(128, 200, 1.6, '#fff', 0.9) + halo(144, 176, 1.4, '#fff', 0.9);
  // khăn lông nhân tạo phát sáng quàng vai
  const fluff = (pts) => 'M' + pts.map(([x, y], i) => (i ? `Q${(x + pts[i - 1][0]) / 2 + 3} ${(y + pts[i - 1][1]) / 2 - 5} ${x} ${y}` : `${x} ${y}`)).join(' ');
  b += cel(fluff([[22, 200], [30, 182], [44, 170], [60, 162], [76, 160], [90, 166], [96, 180], [92, 196], [78, 204], [60, 210], [40, 214], [22, 214]]) + 'Z', { fill: 'url(#fur)', sh: shade(c, 0.6), sx: 4, sy: 4, rw: 2, hw: 1.6, ho: 0.6 });
  b += cel(fluff([[132, 166], [146, 160], [162, 162], [178, 170], [190, 182], [198, 200], [198, 214], [180, 212], [160, 206], [142, 198], [130, 186]]) + 'Z', { fill: 'url(#fur)', sh: shade(c, 0.6), sx: 4, sy: 4, rw: 2, hw: 1.6, ho: 0.6 });
  b += halo(60, 190, 16, c, 0.25) + halo(166, 188, 16, c, 0.25);
  // cổ yếm + vòng cổ đá
  b += cel(NECK, { fill: SK, sh: SKS, sx: 6, sy: 0, rw: 0, hw: 0, w: 1.2 });
  b += cel('M96 124 C104 132 118 132 128 124 L128 134 C118 140 104 140 96 134Z', { fill: '#2a0e3a', sh: '#12061a', sx: 2, sy: 2, rw: 1.4 });
  b += [100, 106, 112, 118, 124].map((x, i) => `<circle cx="${x}" cy="${133 + (i === 2 ? 2 : i % 4 ? 1 : 0)}" r="1.4" fill="#fff"/>`).join('') + halo(112, 135, 3, c, 0.8);
  // tay cầm tẩu điện tử dài, làn khói hồng tím
  b += cel('M140 214 C146 196 156 184 166 180 L176 186 C168 194 160 206 158 222Z', { fill: 'url(#gown)', sh: '#3a0a52', sx: 3, sy: 3, rw: 1.8 });
  b += cel('M162 182 C162 174 172 170 178 174 C182 178 180 186 174 188 C168 190 162 188 162 182Z', { fill: SK, sh: SKS, sx: 2, sy: 2, rw: 1.4, hw: 0 });
  b += line('M170 176 L196 128', OL, 3.4) + line('M170 176 L196 128', '#1a1020', 2) + line('M186 146 L196 128', c, 1.4);
  b += halo(196, 128, 4, c, 1) + `<circle cx="196" cy="128" r="1.6" fill="#fff"/>`;
  b += `<path d="M196 124 C188 112 202 104 194 92 C188 82 198 74 192 62 C200 70 204 80 200 90 C208 100 200 110 204 120Z" fill="url(#smk)" filter="url(#bl)"/>`;
  b += line('M196 122 C190 112 200 104 194 94 C190 86 196 78 192 68', '#ffc8f4', 0.9, 0.6);
  // đầu
  b += cel(HEAD, { fill: SK, sh: SKS, sx: 6, sy: 3, rw: 1.8, hw: 1.2, ho: 0.35 });
  b += eye(101, 83, 8, 'iris', 'diamond') + eye(126, 82, 6.5, 'iris', 'diamond');
  b += line('M90 80 L87 77 M92 77 L90 74', OL, 1, 0.9) + line('M134 78 L137 75', OL, 1, 0.9); // mi dài
  b += brow('M91 72 Q100 67 108 70', hair) + brow('M119 69 Q127 66 134 70', hair);
  b += NOSE(SKS) + `<path d="M104 107 Q110 104 117 106 Q111 112 104 107Z" fill="${shade(c, 0.7)}" stroke="${OL}" stroke-width=".6"/>`;
  b += `<path d="M135 92 l1 2.2 l2.2 1 l-2.2 1 l-1 2.2 l-1 -2.2 l-2.2 -1 l2.2 -1Z" fill="#fff"/>` + halo(136, 95, 2.4, c, 0.8);
  // tóc búi cao thanh lịch + lọn rủ mặt
  b += cel('M84 80 C78 56 92 40 112 40 C134 40 146 54 144 76 C138 64 128 56 114 56 C102 58 94 64 90 74 C88 78 87 82 86 90Z', { fill: hair, sh: hairS, sx: 4, sy: 4, rw: 2.2, hw: 1.4 });
  b += cel('M94 44 C92 26 112 16 128 24 C140 30 140 46 128 50 C118 44 104 42 94 44Z', { fill: hair, sh: hairS, sx: 3, sy: 3, rw: 2 });
  b += cel('M140 64 C148 80 148 100 140 116 C142 100 140 84 134 72Z', { fill: hair, sh: hairS, sx: 2, sy: 2, rw: 1.6 });
  b += glow('M100 30 C110 22 126 22 134 30', c, 1, false, 0.5) + shine('M96 48 Q108 42 122 44', 1.2, 0.5);
  b += halo(130, 28, 3, '#fff', 0.8) + `<path d="M127 30 L130 22 L133 30 L130 34Z" fill="#fff" stroke="${c}" stroke-width=".6"/>`; // trâm cài
  return { defs: gd + defs(), body: b };
}
function seraToken(c) {
  // hồ ly origami ngồi: các mặt gấp tam giác, giấy neon hồng mờ, nếp gấp phát sáng
  const L = shade(c, 1.45), M = c, D = shade(c, 0.6), K = shade(c, 0.38);
  const F = (d, fill, o = 0.92) => `<path d="${d}" fill="${fill}" fill-opacity="${o}" stroke="${OL}" stroke-width="1.4" stroke-linejoin="round"/>`;
  let b = '';
  // đuôi cong quanh chân (sau thân)
  b += F('M80 196 L44 178 L52 150 L70 172Z', D) + F('M52 150 L36 128 L70 140Z', M) + F('M52 150 L70 140 L70 172Z', L);
  b += F('M36 128 L44 116 L56 134Z', '#ffe6f9');
  // thân ngồi
  b += F('M86 128 L70 196 L108 200Z', D) + F('M86 128 L108 200 L120 140Z', M) + F('M120 140 L108 200 L146 196Z', L) + F('M120 140 L146 196 L136 150Z', D);
  // chân trước
  b += F('M104 160 L100 200 L114 200Z', L) + F('M126 160 L122 200 L136 198Z', M);
  // đầu: mõm nhọn hướng phải-trước
  b += F('M96 92 L120 84 L118 116Z', M) + F('M120 84 L146 100 L118 116Z', L) + F('M96 92 L118 116 L92 120Z', D) + F('M118 116 L146 100 L156 120Z', D) + F('M118 116 L156 120 L126 130Z', K);
  b += F('M92 120 L118 116 L126 130 L104 134Z', M);
  // tai
  b += F('M98 92 L96 58 L114 86Z', L) + F('M96 58 L110 72 L114 86Z', D) + F('M126 88 L138 56 L144 96Z', L) + F('M138 56 L136 80 L144 96Z', M);
  // nếp gấp phát sáng + mắt
  b += glow('M96 58 L98 92 L118 116 L146 100 L138 56', '#fff', 0.8, false, 0.7) + glow('M86 128 L108 200 M120 140 L146 196 M52 150 L36 128', '#ffd6f6', 0.7, false, 0.6);
  b += `<path d="M126 104 L136 102 L131 107Z" fill="#fff"/>` + halo(131, 104, 4, '#fff', 0.7);
  b += `<circle cx="156" cy="120" r="2.2" fill="${OL}"/>`;
  b += halo(110, 150, 26, c, 0.18);
  return { defs: '', body: shadow(46, 8, 0.45) + `<g filter="url(#rim)">${b}</g>` };
}

// ================================================================ 4. K-9000 "JACKPOT" (Acid Green)
function kAvatar(c) {
  const { cel, defs } = makeCel(c);
  const vel = '#3a1652', velS = '#1a0626', metal = '#a8b0c4', metalS = '#4a5266';
  const gd = lg('vel', [[0, '#5a2680'], [0.5, vel], [1, '#22093a']], 0, 0, 1, 1)
    + lg('case', [[0, '#e9e4d6'], [0.6, '#bdb6a2'], [1, '#7a7464']], 0, 0, 1, 1)
    + rg('scr', [[0, '#1c3a1a'], [0.7, '#081408'], [1, '#020602']], 0.45, 0.45, 0.75)
    + lg('chr', [[0, '#ffffff'], [0.4, metal], [0.6, metalS], [1, '#d8dde8']], 0, 0, 1, 1);
  let b = '';
  // vest nhung tím than, ve rộng
  b += cel('M26 222 C28 184 46 160 82 150 L98 142 L124 142 L140 150 C176 160 194 184 196 222Z', { fill: 'url(#vel)', sh: velS, sx: 8, sy: 6, rw: 3, hw: 2, ho: 0.35 });
  // sơ mi phanh cổ (sơ mi lụa xám nhạt) để lộ ngực kim loại
  b += cel('M94 144 L110 206 L128 144Z', { fill: 'url(#chr)', sh: metalS, sx: 3, sy: 2, rw: 1.4 });
  b += line('M102 160 L118 160 M104 172 L116 172 M106 184 L114 184', metalS, 1.2) + halo(110, 166, 5, c, 0.8) + `<circle cx="110" cy="166" r="2.6" fill="#eaffcc"/>`;
  b += cel('M92 142 L84 156 L104 186 L100 160Z', { fill: '#e2dcf0', sh: '#9a92b0', sx: 2, sy: 2, rw: 1 });
  b += cel('M130 142 L138 156 L116 186 L120 160Z', { fill: '#e2dcf0', sh: '#9a92b0', sx: 2, sy: 2, rw: 1 });
  b += cel('M82 150 L92 144 L104 196 L94 222 L70 222 C72 196 78 172 82 150Z', { fill: '#4a1e6a', sh: velS, sx: 4, sy: 3, hw: 1.6, ho: 0.5 });
  b += cel('M140 150 L130 144 L116 196 L126 222 L150 222 C148 196 144 172 140 150Z', { fill: '#4a1e6a', sh: velS, sx: 4, sy: 3, hw: 1.6, ho: 0.5 });
  b += glow('M152 172 L162 168', c, 1.6) + glow('M70 210 C76 200 80 196 86 194', c, 0.8, false, 0.5);
  // cổ máy mảnh
  b += cel('M102 112 L100 146 L120 146 L118 112Z', { fill: 'url(#chr)', sh: metalS, sx: 4, sy: 0, rw: 1.2 });
  b += line('M101 124 L119 124 M101 134 L119 134', metalS, 1.2);
  // đầu màn hình CRT cong cổ điển: vỏ kem + vát sau
  b += cel('M66 60 C66 44 78 34 96 34 L140 34 C158 34 168 46 168 62 L166 100 C164 114 154 122 138 122 L94 122 C78 122 68 112 68 98Z', { fill: 'url(#case)', sh: '#6e6858', sx: 7, sy: 6, rw: 2.6, hw: 2, ho: 0.6 });
  b += cel('M78 62 C78 52 86 46 98 46 L136 46 C148 46 156 52 156 62 L154 94 C154 104 146 110 134 110 L98 110 C86 110 80 104 80 94Z', { fill: 'url(#scr)', sh: '#000', sx: 0, sy: -3, rw: 1.6, hw: 0 });
  b += `<g opacity=".25">${[52, 58, 64, 70, 76, 82, 88, 94, 100, 106].map((y) => `<rect x="80" y="${y}" width="76" height="1" fill="${c}"/>`).join('')}</g>`;
  // mắt số xanh lục (khối điểm ảnh, liếc nhẹ)
  const px = (x0, y0, map) => map.map((row, j) => [...row].map((ch, i) => (ch === '#' ? `<rect x="${x0 + i * 4}" y="${y0 + j * 4}" width="3.6" height="3.6" fill="${c}"/>` : '')).join('')).join('');
  b += `<g filter="url(#rim)">${px(92, 64, ['.##.', '####', '####', '.##.'])}${px(124, 64, ['.##.', '####', '####', '.##.'])}</g>`;
  b += `<rect x="94" y="66" width="3" height="3" fill="#f0ffe0"/><rect x="126" y="66" width="3" height="3" fill="#f0ffe0"/>`;
  b += px(102, 92, ['#........#', '.########.']).replace(/fill="[^"]+"/g, `fill="${c}" opacity=".85"`);
  b += shine('M84 52 C90 48 98 48 106 48', 1.6, 0.35);
  // núm vặn + ăng-ten
  b += `<circle cx="160" cy="78" r="3" fill="#6e6858" stroke="${OL}" stroke-width="1"/><circle cx="160" cy="90" r="3" fill="#6e6858" stroke="${OL}" stroke-width="1"/>`;
  b += line('M132 34 L148 12', OL, 2.6) + line('M132 34 L148 12', '#c8cede', 1.2) + halo(148, 12, 4, c, 0.9) + `<circle cx="148" cy="12" r="2" fill="#f0ffe0"/>`;
  return { defs: gd + defs(), body: b };
}
function kToken(c) {
  const { cel, defs } = makeCel(c);
  const body = '#3a1652', bodyS = '#1a0626', top = '#5a2680';
  const gd = lg('chr', [[0, '#ffffff'], [0.4, '#a8b0c4'], [0.6, '#4a5266'], [1, '#d8dde8']], 0, 0, 1, 1)
    + rg('reel', [[0, '#ffffff'], [0.7, '#e6eadf'], [1, '#9aa090']], 0.5, 0.5, 0.7)
    + rg('ball', [[0, '#fbffe8'], [0.4, c], [1, shade(c, 0.4)]], 0.35, 0.3, 0.8);
  let b = '';
  // hộp máy 3/4 nhìn từ trên: mặt trước (trái), mặt bên (phải), nóc
  b += cel('M66 110 L128 120 L128 200 L66 190Z', { fill: body, sh: bodyS, sx: 0, sy: 0, rw: 0, hw: 1.6, ho: 0.25 });
  b += cel('M128 120 L160 104 L160 182 L128 200Z', { fill: bodyS, sh: '#0e0216', sx: 0, sy: 0, rw: 2.4, hw: 0 });
  b += cel('M66 110 L98 94 L160 104 L128 120Z', { fill: top, sh: body, sx: 0, sy: 0, rw: 1.6, hw: 1.6, ho: 0.5 });
  // đèn đỉnh (còi xoay) trên nóc
  b += cel('M104 104 C104 92 122 92 122 104 C122 110 104 110 104 104Z', { fill: 'url(#ball)', sh: shade(c, 0.45), sx: 2, sy: 2, rw: 0, hw: 1.2, ho: 0.8, w: 1.2 });
  b += halo(113, 100, 8, c, 0.6);
  // viền chrome + màn 3 cuộn quay "777"
  b += `<path d="M70 122 L124 131 L124 160 L70 151Z" fill="url(#chr)" stroke="${OL}" stroke-width="1.3"/>`;
  const seven = (x, y) => `<path d="M${x - 4} ${y - 5} L${x + 4} ${y - 3.6} L${x - 0.6} ${y + 6}" fill="none" stroke="${shade(c, 0.55)}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  for (const [i, x] of [74, 91, 108].entries()) {
    const y = 126 + i * 2.8;
    b += `<path d="M${x} ${y} L${x + 14} ${y + 2.4} L${x + 14} ${y + 26} L${x} ${y + 23.6}Z" fill="url(#reel)" stroke="${OL}" stroke-width="1"/>` + seven(x + 7, y + 13);
  }
  b += glow('M70 151 L124 160', c, 1.2, false, 0.7) + glow('M70 122 L124 131', c, 1.2, false, 0.7);
  // khe xu + máng trả thưởng + vài đồng xu
  b += `<path d="M78 168 L118 175 L118 186 L78 179Z" fill="#0b0212" stroke="${OL}" stroke-width="1.2"/>` + glow('M80 172 L116 178', c, 1, false, 0.6);
  b += `<ellipse cx="92" cy="180" rx="4.5" ry="2.4" fill="#ffd34a" stroke="${OL}" stroke-width=".8"/><ellipse cx="102" cy="182" rx="4.5" ry="2.4" fill="#ffe27a" stroke="${OL}" stroke-width=".8"/>`;
  b += `<rect x="132" y="138" width="22" height="4" rx="2" fill="${c}" opacity=".85" transform="skewY(-26) translate(0 66)"/>`;
  // tay gạt ở mặt bên phải
  b += cel('M156 150 L168 144 L170 158 L158 164Z', { fill: 'url(#chr)', sh: '#4a5266', sx: 1, sy: 1, rw: 0, hw: 0, w: 1.2 });
  b += line('M164 152 L174 104', OL, 5) + line('M164 152 L174 104', '#d8dde8', 2.6) + line('M165 148 L172 112', '#fff', 0.8, 0.8);
  b += `<circle cx="175" cy="100" r="7" fill="url(#ball)" stroke="${OL}" stroke-width="1.3"/><circle cx="172.6" cy="97.4" r="2" fill="#fff"/>`;
  b += shine('M70 112 L98 97', 1.2, 0.6);
  return { defs: gd + defs(), body: shadow(52, 9, 0.45) + `<g filter="url(#rim)">${b}</g>` };
}

const DRAW = {
  'neon-vance': [vanceAvatar, vanceToken],
  'neon-nyx': [nyxAvatar, nyxToken],
  'neon-seraphina': [seraAvatar, seraToken],
  'neon-k9000': [kAvatar, kToken],
};

const svg = (c, d, inner, extraDefs = '') => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 220 220" width="220" height="220"><defs>${filters(c)}${d.defs}${extraDefs}</defs>${inner(d.body)}</svg>\n`;
const token = (p) => svg(p.c, DRAW[p.id][1](p.c), (b) => b);
const avatar = (p) => svg(p.c, DRAW[p.id][0](p.c),
  (b) => `<g clip-path="url(#av)">${avatarBg(p.c)}${b}</g><rect x="3" y="3" width="214" height="214" rx="32" fill="none" stroke="${p.c}" stroke-width="3" opacity=".9"/>`,
  `<radialGradient id="ag" cx="50%" cy="40%" r="65%"><stop offset="0" stop-color="${p.c}" stop-opacity=".55"/><stop offset=".55" stop-color="#141a33"/><stop offset="1" stop-color="#0b0f1c"/></radialGradient><clipPath id="av"><rect x="3" y="3" width="214" height="214" rx="32"/></clipPath>`);

for (const p of CAST) {
  fs.writeFileSync(path.join(OUT, `${p.id}-token.svg`), token(p));
  await sharp(Buffer.from(avatar(p)), { density: 384 }).resize(512, 512).png({ compressionLevel: 9 }).toFile(path.join(OUT, `${p.id}-avatar.png`));
}

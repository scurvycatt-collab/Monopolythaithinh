// T25 (vòng 5, thêm chi tiết; vòng 4 là bộ gốc): sinh 4 nhân vật Lumina-01 theo spec chủ sản phẩm (docs/maps/neon-concept.md, "Thiết Kế Nhân Vật").
// Chạy: node public/maps/neon/assets/pets/build-pets.mjs
// Vẽ bằng code (SVG), không asset ngoài. Nhân vật gốc, không dựa vào nhân vật / logo / thương hiệu nào.
// Phong cách: anime trưởng thành, cel-shading 3 lớp tự động (bóng cứng dưới-phải, rim light màu chủ mép phải,
// highlight mép trên-trái), viền tối mảnh. Quân cờ có viền tối + quầng màu chủ để tách khỏi nền (kể cả cyan của bàn).
// Mỗi nhân vật -> <id>-avatar.png (512x512, chân dung bán thân, nền tối + quầng màu chủ; PNG vì test maps yêu cầu)
//              (quân cờ <id>-token.svg: xem build-tokens.mjs — bản vẽ phẳng cũ chỉ còn qua cờ --svg-tokens, ra *-token-flat.svg)
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
  b += `<path d="M150 176 l3 -6 l3 5 l3 -6 l1 5Z" fill="${shade(c, 1.2)}" stroke="${OL}" stroke-width=".6"/>`;
  // sọc chìm trên vest + ghim cài ve hình thoi (logo Aethelgard giả tưởng)
  b += `<g opacity=".22">${[160, 168, 176, 184].map((x) => line(`M${x} ${150 + (x - 150) * 0.4} C${x + 6} 180 ${x + 10} 200 ${x + 12} 222`, '#8a8aa0', 0.6)).join('')}</g>`;
  b += `<path d="M138 166 l4 -5 l4 5 l-4 5Z" fill="url(#gold)" stroke="${OL}" stroke-width=".8"/>` + halo(142, 166, 2.5, c, 0.7);
  b += `<rect x="104" y="166" width="12" height="2.4" rx="1" fill="url(#gold)" stroke="${OL}" stroke-width=".5"/>`; // kẹp cà vạt
  // vai + cánh tay phải (bên trái ảnh): tay máy đen-vàng, nâng bàn tay trước ngực
  b += cel('M24 222 C24 192 34 168 56 158 C70 154 82 160 84 172 C86 190 74 206 62 222Z', { fill: '#0e0e13', sh: '#000', sx: 5, sy: 4, rw: 2 });
  b += cel('M44 180 C52 168 70 168 76 178 L72 196 C64 204 48 200 44 190Z', { fill: 'url(#gold)', sh: shade(c, 0.4), sx: 3, sy: 3, rw: 0, hw: 1.6, ho: 0.8 });
  b += cel('M62 202 C70 186 86 178 98 184 L100 196 C90 200 80 208 74 222 L58 222Z', { fill: '#111117', sh: '#000', sx: 3, sy: 3 });
  b += line('M66 206 C74 196 84 190 96 190', c, 1.1, 0.9);
  b += line('M50 186 C56 180 64 178 72 182 M48 194 C56 190 64 190 70 194', OL, 1.2, 0.9) + line('M34 214 C40 196 48 184 58 176', c, 1, 0.7) + halo(62, 172, 3, c, 0.8);
  // khớp vai: đinh tán + lõi phát sáng; cẳng tay: tấm giáp đen, piston vàng, đường viền vàng
  b += [[50, 182], [58, 177], [67, 177], [73, 182]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" fill="${shade(c, 1.5)}" stroke="${OL}" stroke-width=".4"/>`).join('');
  b += `<circle cx="60" cy="190" r="4.2" fill="#0b0b10" stroke="${OL}" stroke-width="1"/>` + halo(60, 190, 3, c, 0.9) + `<circle cx="60" cy="190" r="1.6" fill="#fff6d8"/>`;
  b += line('M68 214 C74 204 82 198 90 196', shade(c, 0.45), 2.6) + line('M68 214 C74 204 82 198 90 196', 'url(#gold)', 1.4) + line('M76 206 L78 210 M84 200 L86 204', OL, 1);
  b += glow('M62 216 C70 202 82 192 94 188', c, 0.7, false, 0.5);
  b += [[66, 212, 34], [74, 203, 40], [84, 195, 52]].map(([x, y, r]) => `<rect x="${x - 1.4}" y="${y - 6}" width="2.8" height="12" rx="1" fill="url(#gold)" stroke="${OL}" stroke-width=".6" transform="rotate(${r} ${x} ${y})"/>`).join('');
  // bàn tay máy: các đốt ngón vàng
  b += cel('M92 178 C98 170 108 172 110 180 C112 188 104 196 96 196 C90 194 88 184 92 178Z', { fill: '#16161c', sh: '#000', sx: 2, sy: 2, rw: 1.6 });
  b += `<g fill="url(#gold)" stroke="${OL}" stroke-width="0.9">${[[94, 168, -14], [100, 165, -6], [106, 166, 4], [111, 171, 16]].map(([x, y, r]) => `<rect x="${x - 2.4}" y="${y - 6}" width="4.8" height="12" rx="2.4" transform="rotate(${r} ${x} ${y})"/>`).join('')}</g>`;
  b += halo(101, 186, 3, c, 0.9) + `<circle cx="101" cy="186" r="1.6" fill="#fff8e0"/>`;
  b += [[94, 168, -14], [100, 165, -6], [106, 166, 4], [111, 171, 16]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="${OL}"/>`).join('');
  // vòng hologram cổ tay + bảng holo nhỏ: cột tiền và hai xúc xắc vàng
  b += `<ellipse cx="92" cy="194" rx="7" ry="2.4" transform="rotate(-30 92 194)" fill="none" stroke="${c}" stroke-width="1" opacity=".9"/>`;
  b += `<path d="M58 140 L86 134 L90 156 L62 162Z" fill="${c}" fill-opacity=".12" stroke="${c}" stroke-width=".8" opacity=".9"/>`;
  b += [[64, 6], [69, 9], [74, 7], [79, 12]].map(([x, h], i) => `<rect x="${x}" y="${156 - h - i * 1.2}" width="3" height="${h}" fill="${c}" opacity=".75"/>`).join('');
  b += `<rect x="70" y="122" width="7" height="7" rx="1.4" fill="url(#gold)" stroke="${OL}" stroke-width=".7" transform="rotate(-14 73 125)"/><rect x="80" y="118" width="6" height="6" rx="1.2" fill="url(#gold)" stroke="${OL}" stroke-width=".7" transform="rotate(18 83 121)"/>`;
  b += `<circle cx="72.5" cy="125" r=".8" fill="${OL}"/><circle cx="82" cy="120" r=".7" fill="${OL}"/><circle cx="84" cy="122.5" r=".7" fill="${OL}"/>` + line('M88 160 L96 186', c, 0.5, 0.5);
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
  b += line('M118 79 L134 79 M118 84 L134 84 M122 74 L122 92 M128 74 L128 92', c, 0.35, 0.5);
  b += [[120, 86, 3, 1], [123, 84, 3, 0], [126, 85, 4, 1], [129, 80, 4, 1], [132, 78, 3, 1]].map(([x, y, h, up]) => `<rect x="${x - 0.7}" y="${y}" width="1.4" height="${h}" fill="${up ? '#fff3c4' : '#ff5a3c'}"/>`).join('');
  b += line('M119 88 L122 85 L124 87 L128 81 L130 83 L133 78', '#fff3c4', 0.9) + line('M119 90 L133 90', c, 0.6, 0.7) + `<path d="M133 76 l2 3 l-4 0Z" fill="#fff3c4"/>`;
  // bảng AR nổi cạnh kính: mã cổ phiếu + vạch số
  b += `<path d="M140 64 L160 60 L160 78 L140 82Z" fill="${c}" fill-opacity=".1" stroke="${c}" stroke-width=".6" opacity=".9"/>`;
  b += line('M143 67 L151 65.5 M143 71 L156 68.5 M143 75 L149 73.8', c, 0.9, 0.85) + line('M152 74 L155 70 L157 72', '#fff3c4', 0.7);
  b += line('M136 85 C142 90 142 100 138 108', c, 0.8, 0.8) + `<rect x="116" y="69" width="7" height="3" fill="${c}" opacity=".7"/>`;
  // tóc vuốt ngược, rẽ ngôi, vài sợi rơi
  b += cel('M84 76 C80 52 96 34 116 34 C136 34 146 48 143 70 C140 62 134 54 124 52 C114 50 104 52 98 56 C92 62 88 68 87 80Z', { fill: hair, sh: hairS, sx: 4, sy: 4, rw: 2, hw: 1.4 });
  b += cel('M98 56 C104 48 118 46 128 50 C120 50 110 54 104 62Z', { fill: '#2e2a33', sh: hairS, sx: 2, sy: 2, rw: 0 });
  b += line('M112 54 C108 60 106 66 107 72', hair, 1.6) + shine('M96 44 Q108 36 122 37', 1.4, 0.55);
  b += line('M90 58 C96 46 108 40 120 40 M126 42 C134 46 140 54 141 64', '#3a3540', 0.8, 0.8) + line('M100 46 C112 41 126 41 134 48', '#4a4450', 0.6, 0.7);
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
  // đường gân thân khí động học + hốc gió sườn có lưới vàng
  b += line('M50 138 C70 130 92 128 104 130 M150 124 C166 128 178 136 184 144', shade(c, 0.5), 0.8, 0.8) + shine('M56 132 C72 124 92 121 108 121', 1, 0.6);
  b += `<path d="M62 154 C70 160 82 163 92 164 L90 170 C78 169 66 165 58 159Z" fill="#120d04" stroke="${OL}" stroke-width="1"/>`;
  b += line('M66 158 L64 163 M71 160 L69 165 M76 161.5 L74 166.5 M81 162.5 L79 167.5 M86 163.5 L84 168.5', c, 0.8, 0.9);
  // khung kính (trụ A) + viền vàng quanh buồng lái
  b += line('M88 140 C90 128 112 120 134 121', shade(c, 1.3), 0.9, 0.8) + line('M128 122 L120 150', OL, 1.3) + line('M128 122 L120 150', shade(c, 0.8), 0.6);
  // biểu tượng chữ V trên nắp capo + mũi chia gió
  b += `<path d="M160 134 L166 140 L172 133 L170 133 L166 137 L162 134Z" fill="#fff6d8" stroke="${OL}" stroke-width=".6"/>`;
  b += cel('M168 158 L192 150 L190 156 L170 164Z', { fill: '#1a1406', sh: '#000', sx: 1, sy: 1, rw: 1.2, hw: 0, w: 1.1 });
  // vây đuôi đôi + ống phản lực sau với lửa vàng
  b += cel('M52 128 L44 104 L60 112 L68 126Z', { fill: 'url(#gold)', sh: shade(c, 0.45), sx: 2, sy: 2, rw: 1.4, hw: 1.2, ho: 0.6 });
  b += line('M47 110 L60 124', '#fff3c0', 0.8, 0.7);
  for (const [x, y] of [[40, 150], [44, 160]]) b += halo(x - 6, y, 6, c, 0.85) + `<ellipse cx="${x}" cy="${y}" rx="3.4" ry="4.2" fill="#140f04" stroke="${OL}" stroke-width="1"/><ellipse cx="${x - 0.6}" cy="${y}" rx="1.8" ry="2.6" fill="#fff6d0"/>`;
  b += line('M26 150 L14 150 M28 160 L18 161', c, 1.2, 0.5) + line('M30 140 L20 139', c, 0.8, 0.35);
  // vòng đệm từ trường dưới gầm
  b += `<ellipse cx="80" cy="186" rx="13" ry="3.4" fill="none" stroke="#fff6d0" stroke-width=".8" opacity=".8"/><ellipse cx="146" cy="182" rx="13" ry="3.4" fill="none" stroke="#fff6d0" stroke-width=".8" opacity=".8"/>`;
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
  // nền: mảnh nhiễu glitch cyan
  b += `<g opacity=".55">${[[16, 40, 14, 3], [24, 44, 6, 2], [176, 30, 18, 3], [186, 35, 8, 2], [20, 138, 10, 2], [190, 120, 12, 3], [160, 52, 6, 2]].map(([x, y, w, h], i) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${i % 3 ? c : '#ff4fd8'}"/>`).join('')}</g>`;
  // áo bomber techwear, vai phồng
  b += cel('M26 222 C24 186 42 160 78 150 L98 140 L124 140 L146 150 C180 160 198 186 196 222Z', { fill: jk, sh: jkS, sx: 8, sy: 6, rw: 3 });
  b += line('M44 176 C52 168 62 164 72 162 M150 162 C162 166 172 172 178 182', '#2c3654', 2, 0.9);
  b += cel('M96 152 L110 222 L124 152Z', { fill: '#0c0f19', sh: '#000', sx: 2, sy: 2, rw: 1 }); // áo trong tối, cổ kín
  b += line('M104 158 L110 160 L116 158', c, 0.9, 0.7);
  b += line('M70 190 L84 196 M136 196 L152 190', c, 1, 0.5);
  // đường may trần bông kiểu bomber + dải LED dọc vai áo
  b += line('M34 200 C46 192 60 188 76 188 M30 214 C44 206 60 202 78 204 M146 188 C162 188 176 194 188 204 M144 204 C162 204 178 210 192 218', '#2c3654', 1.4, 0.9);
  b += glow('M36 190 C44 172 58 160 80 152', c, 1.1, true, 0.5) + glow('M186 190 C178 172 164 160 142 152', c, 1.1, true, 0.5);
  // miếng vá đầu lâu 8-bit trên ngực trái + túi khóa kéo tay áo
  const sk = ['.###.', '#####', '#.#.#', '#####', '.#.#.'];
  b += `<rect x="56" y="196" width="16" height="15" rx="2" fill="#0c111f" stroke="${c}" stroke-width=".8" transform="rotate(-10 64 203)"/>`;
  b += `<g transform="rotate(-10 64 203)">${sk.map((r, j) => [...r].map((ch, i) => (ch === '#' ? `<rect x="${59 + i * 2}" y="${198 + j * 2}" width="1.8" height="1.8" fill="${c}"/>` : '')).join('')).join('')}</g>`;
  b += line('M156 170 L170 176', '#5a6a8e', 1.2) + `<rect x="168" y="174" width="3" height="5" rx="1" fill="#b8c6e0" stroke="${OL}" stroke-width=".5"/>`;
  // áo crop-top bó trong: viền cổ cyan + chữ chạy dữ liệu
  b += line('M101 170 L119 170', c, 0.6, 0.5) + line('M102 176 L106 176 M108 176 L111 176 M113 176 L118 176', '#6fe6ff', 0.8, 0.6);
  // cổ áo cao + dải LED
  b += cel('M88 138 L96 158 L110 164 L126 158 L134 138 C122 132 100 132 88 138Z', { fill: '#252e48', sh: jkS, sx: 3, sy: 3 });
  b += glow('M92 146 C102 154 120 154 130 146', c, 2);
  b += [96, 103, 110, 117, 124].map((x, i) => `<circle cx="${x}" cy="${149.5 + (i === 2 ? 2.6 : i % 4 ? 1.8 : 0)}" r=".9" fill="#fff"/>`).join('');
  b += line('M89 140 C100 136 122 136 133 140', '#3a4668', 1, 0.9);
  // khóa kéo cổ áo với móc kéo LED
  b += line('M110 156 L110 164', '#8fa0c4', 1.2) + `<rect x="108" y="163" width="4" height="7" rx="1.5" fill="#1a2238" stroke="${OL}" stroke-width=".6"/>` + halo(110, 167, 2, c, 0.9);
  // cyberdeck cầm tay (đáy khung)
  b += cel('M118 196 L176 184 L184 210 L126 222Z', { fill: '#262c40', sh: '#0b0e18', sx: 3, sy: 3, rw: 1.8 });
  b += `<path d="M124 199 L172 189 L177 204 L129 214Z" fill="url(#scr)" stroke="${OL}" stroke-width="1"/>`;
  b += line('M130 204 L146 201 M132 208 L158 202 M150 196 L168 192', '#eaffff', 0.9, 0.9);
  // màn deck: biểu tượng đầu lâu nhỏ + thanh tiến trình; hàng phím dưới màn; ăng-ten + dây cáp lên tai nghe
  b += [[160, 200, '###'], [160, 202, '#.#'], [160, 204, '###']].map(([x, y, r]) => [...r].map((ch, i) => (ch === '#' ? `<rect x="${x + i * 1.6}" y="${y - i * 0.3}" width="1.4" height="1.4" fill="#eaffff"/>` : '')).join('')).join('');
  b += `<path d="M130 216 L180 205 L181.5 209 L131.5 220Z" fill="#141a2a" stroke="${OL}" stroke-width=".6"/>`;
  b += Array.from({ length: 10 }, (_, i) => { const x = 133 + i * 4.8, y = 216.9 - (x - 130) * 0.22; return `<path d="M${x} ${y} l3.6 -.8 l.4 1.8 l-3.6 .8Z" fill="${i === 4 ? c : '#4a5678'}"/>`; }).join('');
  b += line('M178 186 L188 168', OL, 2.4) + line('M178 186 L188 168', '#8a96bc', 1) + halo(188, 168, 2.6, c, 0.9);
  b += `<circle cx="182" cy="198" r="1" fill="${c}"/><circle cx="183" cy="202" r="1" fill="#ff4fd8"/>`;
  b += line('M120 214 C104 214 90 206 88 196 C86 184 88 172 86 160', OL, 2.4, 0.9) + line('M120 214 C104 214 90 206 88 196 C86 184 88 172 86 160', '#3a4668', 1.2);
  b += cel('M112 206 C110 198 120 194 126 198 C130 204 124 212 118 212Z', { fill: SK, sh: SKS, sx: 2, sy: 2, rw: 1.2, hw: 0 });
  // cổ + đầu
  b += cel(NECK, { fill: SK, sh: SKS, sx: 6, sy: 0, rw: 0, hw: 0, w: 1.2 });
  b += cel(HEAD, { fill: SK, sh: SKS, sx: 6, sy: 3, rw: 1.8, hw: 1.2, ho: 0.4 });
  b += eye(101, 83, 8, 'iris') + eye(126, 82, 6.5, 'iris');
  b += brow('M91 74 Q100 70 108 73', '#7d98b0') + brow('M119 71 Q127 69 134 73', '#7d98b0');
  b += line('M126 92 L128 94 M129 91 L131 93', c, 0.8, 0.8); // hình xăm mạch nhỏ dưới mắt
  b += NOSE(SKS) + line('M105 108 Q110 110 116 107', '#9a4f5c', 1.2);
  // bong bóng kẹo cao su phát sáng
  b += halo(120, 110, 9, c, 0.5) + `<circle cx="120" cy="110" r="7.2" fill="url(#bub)" stroke="${shade(c, 0.6)}" stroke-width=".8"/>` + `<circle cx="117.6" cy="107.4" r="1.6" fill="#fff"/><path d="M122 114 A4.5 4.5 0 0 0 125 110" fill="none" stroke="#fff" stroke-width=".6" opacity=".8"/>`;
  b += `<circle cx="132" cy="101" r=".8" fill="#9ff2ff"/><circle cx="135" cy="98" r=".6" fill="#9ff2ff"/>`;
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
  // khớp bản lề tai mèo + vạch mạch trên vỏ; vòng LED trên chụp tai phải; mút đệm
  b += `<circle cx="95" cy="44" r="1.4" fill="#8a96bc" stroke="${OL}" stroke-width=".5"/><circle cx="133" cy="40" r="1.4" fill="#8a96bc" stroke="${OL}" stroke-width=".5"/>`;
  b += line('M86 26 L90 36 L96 38 M141 22 L139 32 L136 34', '#4a5a86', 0.7, 0.9);
  b += `<ellipse cx="145.5" cy="74" rx="3" ry="7" fill="none" stroke="${c}" stroke-width="1"/>` + halo(145.5, 74, 3, c, 0.5);
  b += line('M80 70 L92 70 M80 92 L92 92', '#151a2c', 1.2, 0.9) + `<circle cx="86" cy="82" r="2.4" fill="#151a2c" stroke="${c}" stroke-width=".8"/>`;
  b += line('M123 58 C130 66 134 76 136 88', '#fff', 0.7, 0.5) + line('M128 56 C134 62 138 72 139 80', shade(c, 0.6), 0.8, 0.8);
  return { defs: gd + defs(), body: b };
}
function nyxToken(c) {
  const { cel, defs } = makeCel(c);
  const metal = '#3a4462', metalS = '#151a2c';
  const gd = rg('dome', [[0, '#7e8bb0'], [0.5, '#2d3552'], [1, '#0f1324']], 0.38, 0.3, 0.8)
    + rg('lens', [[0, '#f0feff'], [0.35, c], [1, '#04223a']], 0.42, 0.4, 0.7);
  let b = '';
  // chân: (khớp hông trên thân -> gối nhô cao -> mũi chân)
  // chân 3 đốt: đùi (có piston thủy lực song song) -> gối -> cẳng -> cổ chân -> móng kẹp hai ngạnh
  const leg = (hip, knee, foot) => {
    const ank = [knee[0] + (foot[0] - knee[0]) * 0.62, knee[1] + (foot[1] - knee[1]) * 0.62];
    const d = `M${hip[0]} ${hip[1]} Q${knee[0] - (foot[0] - hip[0]) * 0.1} ${knee[1] - 8} ${knee[0]} ${knee[1]}`;
    const d2 = `M${knee[0]} ${knee[1]} L${ank[0]} ${ank[1]}`, d3 = `M${ank[0]} ${ank[1]} L${foot[0]} ${foot[1]}`;
    const pa = [hip[0] + (knee[0] - hip[0]) * 0.25, hip[1] + (knee[1] - hip[1]) * 0.25 + 5], pb = [hip[0] + (knee[0] - hip[0]) * 0.8, hip[1] + (knee[1] - hip[1]) * 0.8 + 5];
    const pm = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
    const sd = Math.sign(foot[0] - hip[0]) || 1;
    return line(d, OL, 9) + line(d, metal, 5.8) + line(d, '#8a96bc', 1.2, 0.6)
      + line(`M${pa[0]} ${pa[1]} L${pb[0]} ${pb[1]}`, OL, 3.4) + line(`M${pa[0]} ${pa[1]} L${pm[0]} ${pm[1]}`, '#c8d2ec', 1.6) + line(`M${pm[0]} ${pm[1]} L${pb[0]} ${pb[1]}`, c, 1.2)
      + line(d2, OL, 7) + line(d2, metal, 4.2) + line(d2, '#8a96bc', 1, 0.6) + line(d3, OL, 5.4) + line(d3, metalS, 3) + line(d3, c, 0.8, 0.8)
      + `<circle cx="${ank[0]}" cy="${ank[1]}" r="2.6" fill="${metal}" stroke="${OL}" stroke-width="1"/>`
      + `<circle cx="${knee[0]}" cy="${knee[1]}" r="4.8" fill="${metalS}" stroke="${OL}" stroke-width="1.2"/>` + halo(knee[0], knee[1], 2.6, c, 0.9) + `<circle cx="${knee[0]}" cy="${knee[1]}" r="1.5" fill="#e8fdff"/>`
      + line(`M${foot[0]} ${foot[1]} l${-3 * sd} 4 M${foot[0]} ${foot[1]} l${2.6 * sd} 4.4`, OL, 3) + line(`M${foot[0]} ${foot[1]} l${-3 * sd} 4 M${foot[0]} ${foot[1]} l${2.6 * sd} 4.4`, c, 1.4);
  };
  // hai chân sau (xa camera) trước, rồi thân, rồi hai chân trước
  b += leg([94, 150], [56, 128], [46, 172]) + leg([126, 150], [164, 128], [176, 172]);
  // thân: bụng dưới + vòm mai
  b += cel('M74 160 C74 176 92 186 110 186 C128 186 146 176 146 160 C140 170 126 174 110 174 C94 174 80 170 74 160Z', { fill: metalS, sh: '#05070e', sx: 0, sy: -3, rw: 1.8 });
  b += cel('M74 158 C72 136 90 122 110 122 C130 122 148 136 146 158 C144 170 128 176 110 176 C92 176 76 170 74 158Z', { fill: 'url(#dome)', sh: metalS, sx: 6, sy: 5, rw: 2.6, hw: 2, ho: 0.6 });
  // các tấm giáp + dải LED cyan
  b += line('M84 146 C94 138 126 138 136 146', c, 1.4) + line('M110 124 L110 140', metalS, 1.2) + glow('M88 164 C98 170 122 170 132 164', c, 1.2, false, 0.6);
  b += shine('M86 136 C92 128 100 125 108 124', 1.6, 0.85);
  // tấm giáp lục giác trên mai + khe tản nhiệt + chốt vít
  b += `<path d="M102 130 L118 130 L124 138 L118 146 L102 146 L96 138Z" fill="#2a3150" stroke="${OL}" stroke-width="1"/>` + line('M103 134 L117 134 M101 138 L119 138 M103 142 L117 142', metalS, 0.9);
  b += halo(110, 138, 3, c, 0.7) + `<circle cx="110" cy="138" r="1.4" fill="#e8fdff"/>`;
  b += line('M82 152 L88 150 M83 156 L89 154 M138 150 L132 152 M137 154 L131 156', '#05070e', 1.2) + [[90, 130], [130, 130], [80, 150], [140, 150]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" fill="#9aa6cc" stroke="${OL}" stroke-width=".4"/>`).join('');
  b += `<path d="M98 122 L94 114 L102 116Z" fill="${metal}" stroke="${OL}" stroke-width=".8"/>` + line('M96 116 L91 108', '#8a96bc', 0.8) + `<ellipse cx="90.5" cy="107" rx="3.4" ry="1.6" fill="${metalS}" stroke="${OL}" stroke-width=".7"/>`;
  // ăng-ten
  b += line('M126 126 L136 108', OL, 2.6) + line('M126 126 L136 108', '#8a96bc', 1.2) + halo(136, 108, 3.4, c, 0.9) + `<circle cx="136" cy="108" r="1.6" fill="#fff"/>`;
  // cụm mắt cảm biến phía trước
  b += `<ellipse cx="110" cy="166" rx="16" ry="7" fill="#070a14" stroke="${OL}" stroke-width="1.2"/>`;
  b += halo(110, 166, 8, c, 0.65) + `<circle cx="110" cy="166" r="5.4" fill="url(#lens)" stroke="${OL}" stroke-width="1"/><circle cx="108.4" cy="164.4" r="1.5" fill="#fff"/>`;
  b += `<circle cx="99" cy="166" r="2.4" fill="${c}" stroke="${OL}" stroke-width=".5"/><circle cx="121" cy="166" r="2.4" fill="${c}" stroke="${OL}" stroke-width=".5"/>`;
  b += `<circle cx="93" cy="163.5" r="1.3" fill="#9ff2ff"/><circle cx="127" cy="163.5" r="1.3" fill="#9ff2ff"/><circle cx="104" cy="161" r="1.1" fill="#9ff2ff"/><circle cx="116" cy="161" r="1.1" fill="#9ff2ff"/>`;
  b += line('M101 172 L119 172', OL, 1.6) + line('M104 172 l3 0 M109 172 l2 0 M113 172 l3 0', c, 0.9);
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
  // sợi quang mảnh đan chéo + điểm sáng đầu sợi (đổi màu tím -> hồng theo chiều dọc)
  for (const [x, o] of [[80, 0.5], [100, 0.6], [120, 0.6], [140, 0.5]]) b += line(`M${x} 158 C${x + 4} 180 ${x - 2} 200 ${x + (x - 110) * 0.4} 222`, '#e9b8ff', 0.5, o);
  b += [[84, 170, '#d8a8ff'], [104, 182, '#ffc8f4'], [118, 166, '#e0b0ff'], [136, 186, '#fff'], [92, 208, '#ffb0ee'], [114, 212, '#fff'], [152, 210, '#ffb0ee'], [76, 214, '#fff']].map(([x, y, col]) => `<circle cx="${x}" cy="${y}" r=".9" fill="${col}"/>`).join('');
  // khăn lông nhân tạo phát sáng quàng vai
  const fluff = (pts) => 'M' + pts.map(([x, y], i) => (i ? `Q${(x + pts[i - 1][0]) / 2 + 3} ${(y + pts[i - 1][1]) / 2 - 5} ${x} ${y}` : `${x} ${y}`)).join(' ');
  b += cel(fluff([[22, 200], [30, 182], [44, 170], [60, 162], [76, 160], [90, 166], [96, 180], [92, 196], [78, 204], [60, 210], [40, 214], [22, 214]]) + 'Z', { fill: 'url(#fur)', sh: shade(c, 0.6), sx: 4, sy: 4, rw: 2, hw: 1.6, ho: 0.6 });
  b += cel(fluff([[132, 166], [146, 160], [162, 162], [178, 170], [190, 182], [198, 200], [198, 214], [180, 212], [160, 206], [142, 198], [130, 186]]) + 'Z', { fill: 'url(#fur)', sh: shade(c, 0.6), sx: 4, sy: 4, rw: 2, hw: 1.6, ho: 0.6 });
  b += halo(60, 190, 16, c, 0.25) + halo(166, 188, 16, c, 0.25);
  // lông tơ: nét cong ngắn + đầu lông phát sáng
  const tufts = [[34, 196], [42, 184], [52, 176], [64, 170], [78, 168], [88, 178], [40, 206], [56, 200], [72, 194], [84, 190], [140, 176], [152, 170], [166, 172], [178, 180], [186, 192], [150, 190], [166, 196], [182, 204], [158, 182], [174, 190]];
  b += tufts.map(([x, y], i) => line(`M${x} ${y} q${i % 2 ? 3 : -3} -3 ${i % 2 ? 1 : -1} -6`, i % 3 ? '#ffffff' : shade(c, 0.75), 0.8, 0.75)).join('');
  b += tufts.filter((_, i) => i % 3 === 0).map(([x, y], i) => `<circle cx="${x + (i % 2 ? 1 : -1)}" cy="${y - 6}" r="1" fill="#fff"/>` + halo(x, y - 6, 2, c, 0.6)).join('');
  // cổ yếm + vòng cổ đá
  b += cel(NECK, { fill: SK, sh: SKS, sx: 6, sy: 0, rw: 0, hw: 0, w: 1.2 });
  b += cel('M96 124 C104 132 118 132 128 124 L128 134 C118 140 104 140 96 134Z', { fill: '#2a0e3a', sh: '#12061a', sx: 2, sy: 2, rw: 1.4 });
  b += [100, 106, 112, 118, 124].map((x, i) => `<circle cx="${x}" cy="${133 + (i === 2 ? 2 : i % 4 ? 1 : 0)}" r="1.4" fill="#fff"/>`).join('') + halo(112, 135, 3, c, 0.8);
  // tay cầm tẩu điện tử dài, làn khói hồng tím
  b += cel('M140 214 C146 196 156 184 166 180 L176 186 C168 194 160 206 158 222Z', { fill: 'url(#gown)', sh: '#3a0a52', sx: 3, sy: 3, rw: 1.8 });
  b += cel('M162 182 C162 174 172 170 178 174 C182 178 180 186 174 188 C168 190 162 188 162 182Z', { fill: SK, sh: SKS, sx: 2, sy: 2, rw: 1.4, hw: 0 });
  b += line('M170 176 L196 128', OL, 3.4) + line('M170 176 L196 128', '#1a1020', 2) + line('M186 146 L196 128', c, 1.4);
  // vòng kim loại trên tẩu + đầu ngậm
  b += [[176, 165], [181, 156], [190, 139]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.6" ry="1.4" transform="rotate(-61 ${x} ${y})" fill="#f2d7ff" stroke="${OL}" stroke-width=".6"/>`).join('');
  b += halo(196, 128, 4, c, 1) + `<circle cx="196" cy="128" r="1.6" fill="#fff"/>`;
  b += `<path d="M196 124 C188 112 202 104 194 92 C188 82 198 74 192 62 C200 70 204 80 200 90 C208 100 200 110 204 120Z" fill="url(#smk)" filter="url(#bl)"/>`;
  b += `<path d="M194 92 C184 84 176 88 172 78 C168 68 178 60 172 50 C182 56 184 66 180 74 C186 82 192 84 194 92Z" fill="url(#smk)" opacity=".8" filter="url(#bl)"/>`;
  b += line('M196 122 C190 112 200 104 194 94 C190 86 196 78 192 68', '#ffc8f4', 0.9, 0.6) + line('M193 90 C184 84 176 84 174 76 C172 68 178 62 175 54', '#d9a8ff', 0.8, 0.55);
  b += `<ellipse cx="190" cy="54" rx="6" ry="3" fill="none" stroke="#ffb8f0" stroke-width="1.4" opacity=".55" filter="url(#bl)"/><ellipse cx="190" cy="54" rx="6" ry="3" fill="none" stroke="#ffd6f6" stroke-width=".6" opacity=".7"/>`;
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
  b += line('M131 30 L146 20', '#f2d7ff', 1) + `<circle cx="146" cy="20" r="1.6" fill="#fff"/>` + halo(146, 20, 2.4, c, 0.7);
  // hoa tai giọt kim cương
  b += line('M88 98 L88 104', '#f2d7ff', 0.7) + `<path d="M88 104 L91 109 L88 115 L85 109Z" fill="#fff" stroke="${c}" stroke-width=".7"/>` + line('M85 109 L91 109 M88 104 L88 115', '#ffc8f4', 0.4) + halo(88, 110, 4, c, 0.6);
  // sợi tóc + ánh trên búi
  b += line('M98 60 C108 54 122 54 132 62 M92 70 C96 62 104 58 112 58', '#4a2a5e', 0.7, 0.9) + line('M102 30 C108 26 118 26 124 30', '#5a3672', 0.7, 0.8);
  b += `<path d="M78 46 l.8 2 l2 .8 l-2 .8 l-.8 2 l-.8 -2 l-2 -.8 l2 -.8Z" fill="#fff"/><path d="M160 108 l.6 1.6 l1.6 .6 l-1.6 .6 l-.6 1.6 l-.6 -1.6 l-1.6 -.6 l1.6 -.6Z" fill="#fff"/>`;
  return { defs: gd + defs(), body: b };
}
function seraToken(c) {
  // hồ ly origami ngồi: nhiều mặt gấp tam giác (4 tông sáng tối), giấy neon hồng mờ, nếp gấp phát sáng, đuôi 3 khúc gấp
  const W = '#ffe6f9', L = shade(c, 1.45), M = c, D = shade(c, 0.6), K = shade(c, 0.38);
  const F = (d, fill, o = 0.92) => `<path d="${d}" fill="${fill}" fill-opacity="${o}" stroke="${OL}" stroke-width="1.3" stroke-linejoin="round"/>`;
  let b = '';
  // đuôi: gốc -> khúc giữa -> khúc trên -> chóp trắng (sau thân)
  b += F('M80 196 L48 184 L62 166Z', D) + F('M62 166 L48 184 L44 160Z', K) + F('M80 196 L62 166 L76 170Z', M);
  b += F('M44 160 L62 166 L56 138Z', L) + F('M44 160 L56 138 L36 136Z', M) + F('M56 138 L62 166 L70 150Z', D);
  b += F('M36 136 L56 138 L40 116Z', L) + F('M36 136 L40 116 L28 120Z', D);
  b += F('M40 116 L28 120 L30 100Z', W) + F('M40 116 L30 100 L44 106Z', '#fff');
  // thân ngồi: lưng, sườn, ức
  b += F('M86 128 L70 196 L92 170Z', D) + F('M92 170 L70 196 L108 200Z', K) + F('M86 128 L92 170 L104 140Z', M) + F('M104 140 L92 170 L108 200Z', L);
  b += F('M104 140 L108 200 L122 170Z', M) + F('M120 140 L104 140 L122 170Z', D);
  b += F('M120 140 L122 170 L146 196Z', L) + F('M122 170 L108 200 L146 196Z', M) + F('M120 140 L146 196 L136 150Z', D);
  // ức trắng (yếm) dưới mõm
  b += F('M104 134 L126 130 L116 154Z', W) + F('M104 134 L116 154 L104 140Z', L);
  // chân trước: đùi + bàn chân gấp
  b += F('M104 160 L100 200 L108 200Z', L) + F('M104 160 L108 200 L114 198Z', M) + F('M98 200 L114 198 L112 204 L98 204Z', W, 0.95);
  b += F('M126 160 L122 200 L130 199Z', M) + F('M126 160 L130 199 L136 196Z', D) + F('M120 200 L136 196 L136 202 L121 205Z', L, 0.95);
  // đầu: trán chia 4 mặt, má, mõm nhọn hướng phải-trước
  b += F('M96 92 L120 84 L118 100Z', L) + F('M120 84 L146 100 L118 100Z', W, 0.9) + F('M96 92 L118 100 L118 116Z', M) + F('M118 100 L146 100 L118 116Z', L);
  b += F('M96 92 L118 116 L92 120Z', D) + F('M118 116 L146 100 L156 120Z', D) + F('M118 116 L156 120 L138 122Z', M) + F('M118 116 L138 122 L126 130Z', K) + F('M138 122 L156 120 L126 130Z', D);
  b += F('M92 120 L118 116 L104 134Z', M) + F('M104 134 L118 116 L126 130Z', D);
  // tai: hai mặt ngoài + lòng tai sáng
  b += F('M98 92 L96 58 L114 86Z', L) + F('M96 58 L110 72 L114 86Z', D) + F('M100 86 L98 66 L108 80Z', W, 0.85);
  b += F('M126 88 L138 56 L144 96Z', L) + F('M138 56 L136 80 L144 96Z', M) + F('M130 88 L138 64 L140 90Z', W, 0.85);
  // nếp gấp phát sáng + mắt + mũi
  b += glow('M96 58 L98 92 L118 116 L146 100 L138 56', '#fff', 0.8, false, 0.7) + glow('M86 128 L104 140 L108 200 M120 140 L146 196 M44 160 L56 138 L40 116', '#ffd6f6', 0.7, false, 0.6);
  b += line('M118 100 L118 116 M96 92 L146 100 M92 170 L108 200 M122 170 L108 200 M62 166 L48 184', '#fff', 0.5, 0.55);
  b += `<path d="M124 104 L136 101 L131 107Z" fill="#fff"/>` + halo(130, 104, 4, '#fff', 0.7) + `<circle cx="131.5" cy="103.6" r="1" fill="${K}"/>`;
  b += `<path d="M153 118 L158 120 L154 123Z" fill="${OL}"/>`;
  b += [[70, 120], [158, 150], [40, 92]].map(([x, y]) => `<path d="M${x} ${y - 3} l1 2 l2 1 l-2 1 l-1 2 l-1 -2 l-2 -1 l2 -1Z" fill="#fff"/>`).join('');
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
  // ánh nhung (vệt sáng mềm theo nếp) + đường viền ve lime + khăn túi + ghim xúc xắc
  b += `<path d="M40 200 C46 180 60 168 76 162" fill="none" stroke="#9a5ad0" stroke-width="6" opacity=".25" filter="url(#bl)"/><path d="M182 200 C176 182 164 170 150 164" fill="none" stroke="#9a5ad0" stroke-width="5" opacity=".2" filter="url(#bl)"/>`;
  b += glow('M92 144 L82 150 C78 172 72 196 70 222', c, 0.7, false, 0.5) + glow('M130 144 L140 150 C144 172 148 196 150 222', c, 0.7, false, 0.5);
  b += `<path d="M152 172 l2 -7 l3 5 l3 -7 l2 6Z" fill="${c}" stroke="${OL}" stroke-width=".6"/>`;
  b += `<rect x="73" y="168" width="7" height="7" rx="1.5" fill="#f4f6ff" stroke="${OL}" stroke-width=".8" transform="rotate(-12 76.5 171.5)"/><circle cx="75" cy="170" r=".8" fill="${OL}"/><circle cx="78" cy="173" r=".8" fill="${OL}"/>`;
  // dây chuyền vàng mặt "$" trên ngực kim loại
  b += line('M98 146 C100 164 106 176 110 180 C114 176 120 164 122 146', '#ffd34a', 1.2) + line('M98 146 C100 164 106 176 110 180 C114 176 120 164 122 146', '#fff3b0', 0.4, 0.8);
  b += `<circle cx="110" cy="186" r="5" fill="#ffd34a" stroke="${OL}" stroke-width="1"/><text x="110" y="189" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" font-size="7.5" fill="#6a4a00">$</text>`;
  // nút sơ mi + đinh tán ngực
  b += [[90, 160], [130, 160]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" fill="#fff" stroke="${OL}" stroke-width=".4"/>`).join('') + [[103, 154], [117, 154], [104, 178], [116, 178]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="#d8dde8" stroke="${OL}" stroke-width=".4"/>`).join('');
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
  // độ cong mặt kính CRT: vệt phản chiếu + tối góc; chữ chạy góc màn
  b += `<path d="M84 54 C86 50 92 49 100 49 L104 49 C96 52 90 56 86 64Z" fill="#fff" opacity=".18"/>` + shine('M150 70 C152 80 152 90 150 98', 1.2, 0.25);
  b += `<text x="84" y="106" font-family="DejaVu Sans Mono, monospace" font-size="5" fill="${c}" opacity=".7">$$$ 777</text><text x="134" y="56" font-family="DejaVu Sans Mono, monospace" font-size="4.6" fill="${c}" opacity=".6">RDY</text>`;
  // ốc vít viền, khe tản nhiệt trên nóc, nhãn tên, đèn nguồn
  b += [[72, 50], [162, 50], [74, 114], [160, 114]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#8a8470" stroke="${OL}" stroke-width=".6"/>` + line(`M${x - 1} ${y} L${x + 1} ${y}`, OL, 0.5)).join('');
  b += line('M96 39 L96 43 M102 39 L102 43 M108 39 L108 43 M114 39 L114 43 M120 39 L120 43', '#6e6858', 1.4);
  b += `<rect x="98" y="113" width="24" height="6" rx="1.5" fill="#2a2620" stroke="${OL}" stroke-width=".6"/><text x="110" y="117.8" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" font-size="4.6" fill="${c}">K-9000</text>`;
  b += halo(150, 116, 2, c, 0.9) + `<circle cx="150" cy="116" r="1.1" fill="#f0ffe0"/>`;
  b += line('M160 66 L163 66 M160 70 L163 70', '#6e6858', 1);
  // núm vặn + ăng-ten
  b += `<circle cx="160" cy="78" r="3" fill="#6e6858" stroke="${OL}" stroke-width="1"/><circle cx="160" cy="90" r="3" fill="#6e6858" stroke="${OL}" stroke-width="1"/>`;
  b += line('M132 34 L148 12', OL, 2.6) + line('M132 34 L148 12', '#c8cede', 1.2) + halo(148, 12, 4, c, 0.9) + `<circle cx="148" cy="12" r="2" fill="#f0ffe0"/>`;
  b += line('M96 34 L88 20', OL, 2) + line('M96 34 L88 20', '#c8cede', 0.9) + `<circle cx="88" cy="19" r="1.6" fill="#c8cede" stroke="${OL}" stroke-width=".6"/>`;
  // tia điện tóe nhẹ (sự cố quá tải)
  b += glow('M170 40 L176 36 L174 42 L182 38', c, 0.7, false, 0.6) + glow('M56 52 L50 48 L53 54 L46 52', c, 0.7, false, 0.6);
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
    // mép ký hiệu khác ló ra trên / dưới (cuộn đang quay): quả anh đào + thanh BAR
    b += `<circle cx="${x + 5}" cy="${y + 2.8}" r="1.6" fill="#ff4f6a"/><circle cx="${x + 9}" cy="${y + 3.4}" r="1.6" fill="#ff4f6a"/>`;
    b += `<path d="M${x + 3} ${y + 21.6} l8 1.4 l0 1.6 l-8 -1.4Z" fill="#3a1652"/>`;
    b += `<path d="M${x} ${y} L${x + 14} ${y + 2.4} L${x + 14} ${y + 6} L${x} ${y + 3.6}Z M${x} ${y + 20} L${x + 14} ${y + 22.4} L${x + 14} ${y + 26} L${x} ${y + 23.6}Z" fill="#000" opacity=".22"/>`;
  }
  b += line('M71 137.5 L123 146.5', '#ff4f6a', 0.7, 0.8);
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
  // chuỗi bóng đèn quanh mặt trước (xen lime / trắng)
  for (let i = 0; i <= 6; i++) { const x = 68 + i * 9.6, y = 112 + i * 1.6; b += `<circle cx="${x}" cy="${y}" r="1.4" fill="${i % 2 ? '#fff' : c}" stroke="${OL}" stroke-width=".4"/>`; }
  for (let j = 1; j <= 7; j++) { const y = 112 + j * 10; b += `<circle cx="68" cy="${y}" r="1.4" fill="${j % 2 ? '#fff' : c}" stroke="${OL}" stroke-width=".4"/><circle cx="126" cy="${y + 9.6}" r="1.4" fill="${j % 2 ? c : '#fff'}" stroke="${OL}" stroke-width=".4"/>`; }
  b += halo(68, 132, 3, c, 0.5) + halo(126, 152, 3, c, 0.5);
  // hàng nút bấm dưới cửa sổ cuộn
  b += [[76, 160.8], [90, 163.2], [104, 165.6]].map(([x, y], i) => `<path d="M${x} ${y} l10 1.7 l0 3.4 l-10 -1.7Z" fill="${i === 2 ? '#ff4f6a' : c}" stroke="${OL}" stroke-width=".8"/>`).join('');
  // sọc trang trí + khe tản nhiệt mặt bên
  b += line('M132 128 L156 116 M132 134 L156 122', c, 1, 0.6) + line('M134 160 L154 150 M134 165 L154 155 M134 170 L154 160', '#0e0216', 1.4);
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
  // T25 v6: quân cờ (<id>-token.svg) giờ do build-tokens.mjs dựng 3D cơ khí; file này chỉ sinh avatar.
  if (process.argv.includes('--svg-tokens')) fs.writeFileSync(path.join(OUT, `${p.id}-token-flat.svg`), token(p));
  await sharp(Buffer.from(avatar(p)), { density: 384 }).resize(512, 512).png({ compressionLevel: 9 }).toFile(path.join(OUT, `${p.id}-avatar.png`));
}

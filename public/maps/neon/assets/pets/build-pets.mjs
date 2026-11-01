// T25 (vòng 3): sinh 4 nhân vật Lumina-01 (SVG, vẽ bằng code, không asset ngoài).
// Chạy: node public/maps/neon/assets/pets/build-pets.mjs
// Phong cách: anime cyberpunk trưởng thành (tỷ lệ người lớn ~7 đầu, không chibi, không voxel),
// hình khối mềm bằng đường cong, cel-shading 3 lớp tự động cho mỗi mảng (bóng cứng dưới-phải,
// rim light màu chủ ở mép phải, highlight sắc mép trên-trái), viền tối mảnh, quầng neon màu chủ
// quanh cả bóng dáng để đọc được từ camera 3/4 ở ~40 px.
// Nhân vật gốc, không dựa vào nhân vật / logo của tác phẩm nào.
// Mỗi nhân vật -> <id>-token.svg (nền trong, 220x220, chân/bóng ở giữa đáy y≈204 như vòng 1-2)
//              -> <id>-avatar.png (512x512, nền tối + quầng màu chủ, khung cận nửa người; PNG vì test maps yêu cầu).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const OUT = path.dirname(fileURLToPath(import.meta.url));

export const CAST = [
  { id: 'neon-runner', n: 'Hacker', c: '#ff2fa0' },
  { id: 'neon-courier', n: 'Shipper', c: '#3d7bff' },
  { id: 'neon-cat', n: 'Mèo Chrome', c: '#9dff2e' },
  { id: 'neon-drone', n: 'Drone', c: '#ff9f1a' },
];

const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// f < 1 tối đi, f > 1 sáng lên (pha trắng)
const shade = (h, f) => '#' + hx(h).map((v) => Math.max(0, Math.min(255, Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f))).toString(16).padStart(2, '0')).join('');

const OL = '#070914';   // viền tối
const CY = '#27e6ff';   // cyan dữ liệu
const SK = '#f3c9ad';   // da
const SKS = '#c98f78';  // da vùng bóng

const lg = (id, a, b, x1 = 0.2, y1 = 0, x2 = 0.7, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const rg = (id, stops, cx = 0.35, cy = 0.3, r = 0.8) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`;
// nét phát sáng: quầng mờ + nét màu + lõi trắng
const glow = (d, col, w = 3, core = true, o = 0.55) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w + 4}" stroke-linecap="round" stroke-linejoin="round" opacity="${o}" filter="url(#bl)"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>${core ? `<path d="${d}" fill="none" stroke="#fff" stroke-width="${(w * 0.38).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>` : ''}`;
const halo = (cx, cy, r, col, o = 0.6) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}" opacity="${o}" filter="url(#bl)"/>`;
const shadow = (rx = 30, ry = 8) => `<ellipse cx="110" cy="204" rx="${rx}" ry="${ry}" fill="#000" opacity=".45"/>`;
// nét highlight sắc (vệt sáng cel)
const shine = (d, w = 1.4, o = 0.85) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" opacity="${o}"/>`;

// ---- cel-shading tự động: mỗi mảng = nền + bóng cứng (dưới-phải) + rim màu chủ (mép phải) + highlight (mép trên-trái)
function makeCel(rim) {
  let n = 0;
  const defs = [];
  const M = (id, dx, dy) => `<mask id="${id}" maskUnits="userSpaceOnUse" x="-60" y="-60" width="340" height="340"><rect x="-60" y="-60" width="340" height="340" fill="#fff"/><use href="#${id.split('-')[0]}" transform="translate(${dx} ${dy})" fill="#000"/></mask>`;
  const R = '<rect x="-60" y="-60" width="340" height="340"';
  // o: { fill, sh (màu bóng), sx, sy (độ dày bóng), rw (độ dày rim, 0 = không), hw (highlight), ho, w (viền), rimC }
  const cel = (d, o) => {
    const id = 'p' + (n++);
    const { fill, sh, sx = 5, sy = 4, rw = 2.2, hw = 1.6, ho = 0.55, w = 1.7, rimC = rim, hi = '#ffffff' } = o;
    defs.push(`<path id="${id}" d="${d}"/><clipPath id="${id}-c"><use href="#${id}"/></clipPath>`
      + M(`${id}-s`, -sx, -sy) + (rw ? M(`${id}-r`, -rw, 0.4) : '') + (hw ? M(`${id}-h`, hw, hw) : ''));
    return `<use href="#${id}" fill="${fill}"/><g clip-path="url(#${id}-c)">`
      + (sh ? `${R} fill="${sh}" mask="url(#${id}-s)"/>` : '')
      + (rw ? `${R} fill="${rimC}" mask="url(#${id}-r)"/>` : '')
      + (hw ? `${R} fill="${hi}" opacity="${ho}" mask="url(#${id}-h)"/>` : '')
      + `</g>` + (w ? `<use href="#${id}" fill="none" stroke="${OL}" stroke-width="${w}" stroke-linejoin="round"/>` : '');
  };
  return { cel, defs: () => defs.join('') };
}

// Bộ lọc chung: bl = quầng; rim = quầng neon màu chủ mỏng quanh bóng dáng (dilate alpha + blur).
const filters = (c) => `<filter id="bl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.6"/></filter>
<filter id="rim" x="-25%" y="-25%" width="150%" height="150%"><feMorphology in="SourceAlpha" operator="dilate" radius="2" result="d"/><feFlood flood-color="${c}"/><feComposite in2="d" operator="in" result="o"/><feGaussianBlur in="o" stdDeviation="3" result="ob"/><feMerge><feMergeNode in="ob"/><feMergeNode in="ob"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

// ---------------------------------------------------------------- Hacker: netrunner, áo khoác dài, visor, cáp dữ liệu
function runner(c) {
  const { cel, defs } = makeCel(c);
  const coat = '#2a2440', coatS = '#14111f', suit = '#1b1d2e', suitS = '#0c0d16', hair = '#2b1f3d', hairS = '#130c1d';
  const gd = lg('lin', shade(c, 1.2), shade(c, 0.6)) + lg('vis', '#9ff6ff', '#1aa9d6', 0, 0, 1, 0.3);
  let b = '';
  // cáp dữ liệu từ cổng gáy rủ xuống đất (sau lưng)
  b += glow('M101 66 C80 80 72 112 76 142 C80 170 70 190 56 199', c, 2.2);
  b += glow('M104 70 C90 92 86 128 92 156 C96 176 88 192 80 200', CY, 1.6, true, 0.45);
  b += halo(56, 199, 4, c, 0.9) + halo(80, 200, 3, CY, 0.9);
  // vạt áo khoác sau, bay về sau
  b += cel('M98 104 C94 132 84 162 64 186 C78 190 96 184 106 174 L110 120Z', { fill: coatS, sh: '#0a0812', rw: 0, hw: 0 });
  // chân: quần bó + bốt cao
  b += cel('M103 146 C101 164 99 182 98 196 L108 196 C109 182 111 164 113 148Z', { fill: suit, sh: suitS });
  b += cel('M113 146 C117 164 121 180 124 196 L133 195 C131 178 126 160 122 144Z', { fill: suit, sh: suitS });
  b += cel('M97 178 L109 178 L110 198 C110 202 106 203 100 203 C95 203 93 200 95 196Z', { fill: '#24273c', sh: '#0d0e18', sx: 3, sy: 2 });
  b += cel('M122 176 L133 175 L136 196 C138 200 140 202 136 203 L126 203 C122 202 122 198 122 194Z', { fill: '#24273c', sh: '#0d0e18', sx: 3, sy: 2 });
  b += glow('M99 186 L108 186', c, 1.2, false) + glow('M124 185 L134 184', c, 1.2, false);
  // thân bodysuit
  b += cel('M97 72 C93 90 96 104 101 114 C99 126 100 140 102 152 L123 152 C125 140 125 124 121 114 C127 102 130 88 127 72 C119 66 105 66 97 72Z', { fill: suit, sh: suitS });
  b += glow('M112 74 L112 150', c, 1.3, true, 0.4);
  // tay trái (buông, sau vạt áo)
  b += cel('M98 72 C90 76 88 92 88 110 C88 122 90 130 92 138 L99 137 C98 124 98 110 100 96Z', { fill: coat, sh: coatS });
  b += cel('M91 136 C90 142 92 147 96 147 C99 146 100 141 99 136Z', { fill: SK, sh: SKS, sx: 2, sy: 1.5, rw: 1.2, hw: 0 });
  // áo khoác dài mở, lót màu chủ
  b += cel('M97 70 C88 74 86 92 90 110 C92 130 88 152 83 174 C93 178 101 174 104 168 L104 112 C102 96 104 80 104 72Z', { fill: coat, sh: coatS });
  b += cel('M127 70 C135 74 137 92 134 110 C132 130 136 150 139 170 C131 174 123 172 120 166 L120 112 C122 96 120 80 120 72Z', { fill: coat, sh: coatS });
  b += `<path d="M104 112 L104 168 M120 112 L120 166" stroke="url(#lin)" stroke-width="2.4"/>`;
  b += glow('M84 172 C92 176 100 173 104 168', c, 1.4, false) + glow('M120 166 C126 172 134 172 139 169', c, 1.4, false);
  // cổ áo cao
  b += cel('M100 60 L96 72 L105 79 L112 70 L119 79 L128 72 L124 60 Q112 56 100 60Z', { fill: '#332c4e', sh: coatS, sx: 3, sy: 3 });
  // tay phải đưa ra trước, bàn tay mở + vòng hologram
  b += cel('M123 72 C133 74 139 86 139 98 C145 94 149 88 151 83 L157 87 C152 98 146 106 138 109 C131 109 127 97 123 85Z', { fill: coat, sh: coatS });
  b += cel('M151 80 C154 76 160 77 160 82 C160 86 156 89 153 88Z', { fill: SK, sh: SKS, sx: 2, sy: 1.5, rw: 1.2, hw: 0 });
  b += `<ellipse cx="160" cy="72" rx="13" ry="4.5" fill="none" stroke="${CY}" stroke-width="1.4" opacity=".9" filter="url(#bl)"/><ellipse cx="160" cy="72" rx="13" ry="4.5" fill="${CY}" fill-opacity=".12" stroke="${CY}" stroke-width="1"/>`;
  b += `<path d="M152 66 L168 62 L168 52 L152 56Z" fill="${c}" fill-opacity=".22" stroke="${c}" stroke-width="1"/><path d="M155 59 l9 -2 M155 62 l6 -1.5" stroke="#ffe6f4" stroke-width="1" stroke-linecap="round"/>`;
  // cổ + đầu (mặt 3/4 nhìn phải)
  b += cel('M108 56 L108 66 L118 66 L118 56Z', { fill: SK, sh: SKS, sx: 4, sy: 0, rw: 0, hw: 0, w: 0 });
  b += cel('M104 40 C104 32 111 28 119 29 C126 31 129 39 128 47 C127 55 123 61 116 62 C110 62 105 57 104 50Z', { fill: SK, sh: SKS, sx: 4, sy: 2, rw: 1.4, hw: 1 });
  b += `<path d="M119 55 Q123 56 125 54" fill="none" stroke="#8a4a4a" stroke-width="1" stroke-linecap="round"/>`;
  // visor ôm mắt
  b += `<path d="M105 41 Q117 37 130 39 L129 46 Q117 45 105 48Z" fill="${CY}" opacity=".6" filter="url(#bl)"/>`;
  b += cel('M105 41 Q117 37 130 39 L129 46 Q117 45 105 48Z', { fill: 'url(#vis)', sh: '#1584b0', sx: 0, sy: -2, rw: 0, hw: 1, ho: 0.9, w: 1.3 });
  b += shine('M110 41.5 Q117 39.5 124 40', 1, 1);
  // tóc: undercut, mái dài lệch phủ bên phải + một lọn màu chủ
  b += cel('M101 46 C98 31 108 22 120 23 C131 25 135 34 133 45 C131 41 129 38 126 37 C128 46 127 54 124 59 C121 50 118 42 112 37 C108 41 104 46 103 54 C101 52 101 49 101 46Z', { fill: hair, sh: hairS, sx: 3, sy: 3 });
  b += glow('M114 26 C124 27 130 33 128 44', c, 1.3, true, 0.5);
  b += shine('M106 31 Q112 26 119 26', 1.2, 0.6);
  // cổng gáy
  b += `<circle cx="104" cy="56" r="2" fill="${c}"/>`;
  return { defs: gd + defs(), body: shadow(32, 8) + `<g filter="url(#rim)">${b}</g>` };
}

// ---------------------------------------------------------------- Shipper: courier trên ván bay, áo gió, ba lô giao hàng
function courier(c) {
  const { cel, defs } = makeCel(c);
  const jk = shade(c, 1.05), jkS = shade(c, 0.5), pants = '#23283f', pantsS = '#0e1120', hair = '#1e1a24';
  const gd = lg('brd', '#3a4366', '#0f1324') + lg('vis', '#e0fbff', CY, 0, 0, 1, 0.4)
    + `<linearGradient id="jet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".9"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>`;
  let b = '';
  // luồng phản lực dưới ván
  b += `<path d="M78 194 L72 206 L92 206 L88 194Z M132 192 L128 205 L148 205 L144 192Z" fill="url(#jet)" filter="url(#bl)"/>`;
  // ván bay
  b += cel('M60 186 C68 179 150 177 163 183 C168 189 158 196 141 197 L80 198 C65 197 56 192 60 186Z', { fill: 'url(#brd)', sh: '#090c18', sx: 0, sy: -3 });
  b += glow('M64 191 C80 196 140 196 160 188', c, 1.6);
  b += halo(84, 198, 5, c, 0.9) + halo(138, 196, 5, c, 0.9);
  // chân: tư thế lướt, gối khuỵu
  b += cel('M98 130 C92 148 85 164 81 184 L93 184 C97 168 104 154 111 140Z', { fill: pants, sh: pantsS });
  b += cel('M110 130 C121 139 131 150 135 160 C138 168 140 176 142 184 L131 184 C129 176 127 168 123 162 C117 154 109 146 104 140Z', { fill: pants, sh: pantsS });
  b += cel('M79 179 L95 179 C98 182 98 186 95 188 L77 188 C75 185 76 181 79 179Z', { fill: '#e8ecf6', sh: '#8890a8', sx: 2, sy: 2, rw: 1.2 });
  b += cel('M129 179 L143 178 C149 180 151 185 148 188 L130 188 C127 185 127 181 129 179Z', { fill: '#e8ecf6', sh: '#8890a8', sx: 2, sy: 2, rw: 1.2 });
  // tay sau (vươn ra sau giữ thăng bằng)
  b += cel('M98 82 C90 92 82 104 74 112 L78 118 C88 112 98 102 104 92Z', { fill: jkS, sh: '#10183a', rw: 0 });
  // ba lô giao hàng bo tròn
  b += cel('M70 76 C70 70 74 66 80 66 L98 66 C102 66 104 70 104 76 L104 116 C104 122 100 125 95 125 L79 125 C73 125 70 121 70 115Z', { fill: '#2b3150', sh: '#121629', sx: 6, sy: 4 });
  b += glow('M74 82 L74 112', c, 1.6) + `<path d="M84 90 l7 -6 l7 6 M91 84 v16" fill="none" stroke="${CY}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>`;
  // thân áo gió, nghiêng về trước, vạt bay sau
  b += cel('M96 126 C89 133 82 137 74 139 C80 130 86 123 91 117Z', { fill: jkS, sh: '#10183a', rw: 0, sx: 2, sy: 2 });
  b += cel('M97 74 C91 92 92 116 96 134 C108 140 120 139 127 132 C131 114 130 92 125 73 C115 67 104 69 97 74Z', { fill: jk, sh: jkS });
  b += glow('M98 110 C108 114 120 113 128 109', '#e6f0ff', 1.3, false, 0.4) + `<path d="M112 72 L113 134" stroke="${jkS}" stroke-width="1.2"/>`;
  // quai ba lô
  b += `<path d="M100 72 C106 86 110 100 108 118" fill="none" stroke="${OL}" stroke-width="4.2" stroke-linecap="round"/><path d="M100 72 C106 86 110 100 108 118" fill="none" stroke="#3a4266" stroke-width="2.4" stroke-linecap="round"/>`;
  // tay trước vươn ra
  b += cel('M120 78 C130 85 141 95 151 99 L152 106 C140 107 128 101 117 92Z', { fill: jk, sh: jkS });
  b += cel('M151 98 C156 96 160 100 158 105 C156 108 152 107 151 105Z', { fill: SK, sh: SKS, sx: 2, sy: 1.5, rw: 1.2, hw: 0 });
  // cổ áo + cổ + đầu
  b += cel('M108 58 L108 68 L118 68 L118 58Z', { fill: SK, sh: SKS, sx: 4, sy: 0, rw: 0, hw: 0, w: 0 });
  b += cel('M104 44 C104 35 111 31 119 32 C126 33 130 41 129 49 C128 57 124 63 117 64 C110 64 105 59 104 52Z', { fill: SK, sh: SKS, sx: 4, sy: 2, rw: 1.4, hw: 1 });
  b += cel('M101 66 C106 60 120 60 127 66 L124 74 C116 70 108 70 102 74Z', { fill: shade(c, 0.75), sh: jkS, sx: 2, sy: 2 });
  b += `<path d="M122 50 L126 50" stroke="${OL}" stroke-width="1.6" stroke-linecap="round"/><path d="M116 50 L119 50" stroke="${OL}" stroke-width="1.4" stroke-linecap="round"/><path d="M118 57 Q122 58 124 56" fill="none" stroke="#8a4a4a" stroke-width="1" stroke-linecap="round"/>`;
  // tóc ngắn vuốt ngược + kính bảo hộ đẩy lên trán
  b += cel('M102 46 C99 34 108 26 119 26 C129 27 134 34 132 42 C126 38 116 37 108 40 C105 42 104 45 104 50Z', { fill: hair, sh: '#0a080e', sx: 3, sy: 3 });
  b += cel('M104 40 Q117 34 131 37 L131 43 Q117 40 105 46Z', { fill: 'url(#vis)', sh: '#178fb8', sx: 0, sy: -2, rw: 0, hw: 0, w: 1.3 });
  b += shine('M110 40 Q117 37.5 124 38', 1, 1);
  // tai nghe + mic
  b += cel('M103 46 C103 42 109 42 109 46 L109 52 C109 56 103 56 103 52Z', { fill: '#2b3150', sh: '#121629', sx: 2, sy: 1, rw: 1.2, hw: 0, w: 1.2 });
  b += `<path d="M107 54 Q112 62 120 60" fill="none" stroke="${OL}" stroke-width="1.4"/>` + halo(120, 60, 2, c, 1);
  return { defs: gd + defs(), body: shadow(42, 8) + `<g filter="url(#rim)">${b}</g>` };
}

// ---------------------------------------------------------------- Mèo Chrome: mèo máy chrome thon, ngồi thẳng, đuôi chữ S
function cat(c) {
  const { cel, defs } = makeCel(c);
  const chrome = (id, x2 = 0.75, y2 = 1) => `<linearGradient id="${id}" x1="0.1" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#cdd6ea"/><stop offset=".46" stop-color="#7d88a6"/><stop offset=".52" stop-color="#eef3fc"/><stop offset=".8" stop-color="#a3aec8"/><stop offset="1" stop-color="#5a6482"/></linearGradient>`;
  const gd = chrome('ch') + chrome('ch2', 0.3, 1) + rg('eye', [[0, '#ffffff'], [0.35, shade(c, 1.2)], [1, shade(c, 0.5)]], 0.5, 0.45, 0.7);
  const S = '#3a4260';
  const o = { fill: 'url(#ch)', sh: S, ho: 0.8 };
  let b = '';
  // đuôi chữ S dựng sau lưng, chóp LED
  const tail = 'M88 188 C62 186 54 160 64 138 C72 120 70 104 60 94';
  b += `<path d="${tail}" fill="none" stroke="${OL}" stroke-width="10.5" stroke-linecap="round"/><path d="${tail}" fill="none" stroke="url(#ch2)" stroke-width="7" stroke-linecap="round"/>`;
  b += `<path d="M86 186 C64 182 60 160 68 140" fill="none" stroke="${S}" stroke-width="2.6" stroke-linecap="round" opacity=".8"/>`;
  b += glow('M64 100 C66 96 63 92 60 94', c, 3.2);
  // thân ngồi: lưng cong, ngực thẳng
  b += cel('M110 80 C98 96 88 118 85 142 C79 164 78 184 88 196 C98 202 124 202 138 196 C144 184 145 166 143 148 C143 126 141 104 137 86Z', o);
  // đùi sau
  b += cel('M83 170 C81 150 95 140 110 146 C121 152 123 176 115 192 C104 199 87 193 83 170Z', { ...o, sx: 4, sy: 4 });
  // hai chân trước thon
  b += cel('M120 128 C126 146 124 172 119 195 L130 195 C134 176 137 150 134 128Z', o);
  b += cel('M131 126 C138 146 138 174 135 195 L145 195 C148 172 148 146 143 124Z', o);
  b += cel('M117 194 C117 190 131 190 131 194 C131 199 117 199 117 194Z M133 194 C133 190 147 190 147 194 C147 199 133 199 133 194Z', { ...o, sx: 2, sy: 2, rw: 1.4 });
  // khớp nối phát sáng
  b += glow('M92 160 C96 150 104 146 110 147', c, 1.3, true, 0.4) + glow('M120 112 C126 120 130 130 132 140', c, 1.3, true, 0.4);
  // vòng cổ LED
  b += glow('M112 90 Q122 98 134 92', c, 2.4);
  // tai nhọn cao + lòng tai phát sáng
  b += cel('M111 62 L106 33 L125 54Z', { ...o, sx: 3, sy: 2 });
  b += cel('M128 54 L141 30 L147 61Z', { ...o, sx: 3, sy: 2 });
  b += `<path d="M112 56 L109 40 L120 53Z M131 53 L140 37 L143 58Z" fill="${c}" opacity=".85"/>` + halo(140, 46, 4, c, 0.6);
  // đầu thon, mõm nhô phải
  b += cel('M107 70 C107 58 115 51 126 51 C138 51 147 59 147 69 C147 74 151 76 151 80 C150 85 144 87 138 86 C134 90 126 91 120 89 C112 86 107 80 107 74Z', { ...o, sx: 4, sy: 3 });
  // mắt LED hạnh nhân, đồng tử dọc
  b += `<path d="M127 67 Q133 61 140 66 Q134 71 127 67Z" fill="url(#eye)" stroke="${OL}" stroke-width="1"/><path d="M134 63.5 L134 69.5" stroke="${OL}" stroke-width="1.6" stroke-linecap="round"/>` + halo(134, 66, 4.5, c, 0.65);
  b += `<path d="M113 66 Q117 62 121 65 Q117 69 113 66Z" fill="url(#eye)" stroke="${OL}" stroke-width="1"/>` + halo(117, 65.5, 3.5, c, 0.5);
  b += `<path d="M148.5 77 L151 79 L148 80Z" fill="#20263f"/>`;
  // ria sợi quang
  for (const d of ['M144 81 L166 77', 'M144 83 L167 85', 'M142 84 L162 92']) b += glow(d, '#ffffff', 0.7, false, 0.6);
  // vệt highlight sắc chrome
  b += shine('M95 120 C99 110 104 102 110 94', 1.6, 0.9) + shine('M112 58 Q118 54 124 54', 1.2, 0.9);
  return { defs: gd + defs(), body: shadow(38, 8) + `<g filter="url(#rim)">${b}</g>` };
}

// ---------------------------------------------------------------- Drone: drone tuần tra / sửa chữa, vỏ bo tròn, 2 quạt ống
function drone(c) {
  const { cel, defs } = makeCel(c);
  const hull = shade(c, 1.05), hullS = shade(c, 0.5);
  const gd = rg('lens', [[0, '#d6fbff'], [0.3, CY], [0.7, '#0a5a8a'], [1, '#04121f']], 0.42, 0.4, 0.7)
    + `<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".45"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>`
    + rg('fan', [[0, '#9ff6ff', 0.5], [0.7, CY, 0.15], [1, CY, 0]], 0.5, 0.5, 0.5);
  let b = '';
  // tia quét xuống đất
  b += `<path d="M98 150 L78 203 Q110 211 142 203 L122 150Z" fill="url(#beam)"/>`;
  b += `<ellipse cx="110" cy="203" rx="26" ry="6" fill="none" stroke="${c}" stroke-width="1.6" opacity=".8" filter="url(#bl)"/>`;
  // tay sửa chữa gập dưới thân
  b += `<path d="M98 136 C94 148 96 156 102 160 M122 136 C128 146 128 154 122 162" fill="none" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M98 136 C94 148 96 156 102 160 M122 136 C128 146 128 154 122 162" fill="none" stroke="#4a5476" stroke-width="2.6" stroke-linecap="round"/>`;
  b += glow('M102 160 l3 3', CY, 1.4) + glow('M122 162 l-2 4', '#fff7d0', 1.4) + halo(120, 167, 3.5, '#ffe08a', 0.9);
  // quạt ống hai bên (vỏ + quạt mờ)
  const duct = (cx) => cel(`M${cx - 20} 110 C${cx - 20} 102 ${cx + 20} 102 ${cx + 20} 110 L${cx + 18} 122 C${cx + 16} 128 ${cx - 16} 128 ${cx - 18} 122Z`, { fill: '#2c3352', sh: '#121629', sx: 3, sy: 3, rw: 1.8 })
    + `<ellipse cx="${cx}" cy="108" rx="16" ry="4.5" fill="#05070f" stroke="${OL}" stroke-width="1"/><ellipse cx="${cx}" cy="108" rx="14" ry="3.6" fill="url(#fan)"/>`
    + glow(`M${cx - 17} 122 C${cx - 8} 126 ${cx + 8} 126 ${cx + 17} 122`, c, 1.3, false);
  b += cel('M80 112 L70 114 L70 120 L82 120Z M140 112 L150 114 L150 120 L138 120Z', { fill: '#3a4266', sh: '#141a30', sx: 1, sy: 2, rw: 0, hw: 0, w: 1.2 });
  b += duct(54) + duct(166);
  // thân vỏ bo tròn (giọt nước nằm)
  b += cel('M76 106 C76 84 92 70 110 70 C128 70 144 84 144 106 C144 126 130 142 110 144 C90 142 76 126 76 106Z', { fill: hull, sh: hullS, sx: 7, sy: 6, rw: 2.6, hw: 2, ho: 0.6 });
  // vạt bụng tối
  b += cel('M82 120 C92 134 128 134 138 120 C134 134 124 143 110 144 C96 143 86 134 82 120Z', { fill: '#2c3352', sh: '#121629', sx: 3, sy: 3, rw: 1.6, hw: 0 });
  // dải cảm biến + mắt kính
  b += cel('M80 98 C92 92 128 92 140 98 L139 112 C126 107 94 107 81 112Z', { fill: '#0b0f1e', sh: '#04060c', sx: 0, sy: -2, rw: 1.4, hw: 1, ho: 0.35 });
  b += glow('M86 104 L100 102', CY, 1.2, false, 0.4) + glow('M120 102 L134 104', CY, 1.2, false, 0.4);
  b += halo(110, 102, 9, CY, 0.7) + `<circle cx="110" cy="102" r="7" fill="url(#lens)" stroke="${OL}" stroke-width="1.3"/><circle cx="107.5" cy="99.5" r="2" fill="#fff"/>`;
  // đường ghép vỏ + highlight sắc
  b += `<path d="M110 72 L110 92" stroke="${hullS}" stroke-width="1.2"/>` + shine('M86 88 C92 79 100 75 108 74', 1.8, 0.95) + shine('M128 78 C132 80 135 83 137 86', 1.1, 0.6);
  // vây ăng-ten trên đỉnh + đèn hiệu
  b += cel('M104 72 C106 64 110 58 116 56 C116 62 116 68 114 72Z', { fill: hull, sh: hullS, sx: 2, sy: 2, rw: 1.4, w: 1.4 });
  b += halo(116, 56, 4, '#ff3b4e', 0.9) + `<circle cx="116" cy="56" r="2" fill="#ffd0d4"/>`;
  b += halo(36, 114, 3.5, '#ff3b4e', 0.9) + halo(184, 114, 3.5, '#4dff8a', 0.9) + `<circle cx="36" cy="114" r="1.6" fill="#fff"/><circle cx="184" cy="114" r="1.6" fill="#fff"/>`;
  return { defs: gd + defs(), body: shadow(30, 7) + `<g filter="url(#rim)">${b}</g>` };
}
const DRAW = { 'neon-runner': runner, 'neon-courier': courier, 'neon-cat': cat, 'neon-drone': drone };
// khung cận cho avatar: tâm (x, y) trong hệ 220 và hệ số phóng
const AV = { 'neon-runner': [116, 98, 1.5], 'neon-courier': [112, 104, 1.4], 'neon-cat': [124, 100, 1.45], 'neon-drone': [110, 112, 1.12] };

const svg = (p, inner, extraDefs = '') => {
  const d = DRAW[p.id](p.c);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 220 220" width="220" height="220"><defs>${filters(p.c)}${d.defs}${extraDefs}</defs>${inner(d.body)}</svg>\n`;
};
const token = (p) => svg(p, (b) => b);
const avatar = (p) => {
  const [x, y, s] = AV[p.id];
  return svg(p, (b) => `<rect width="220" height="220" rx="34" fill="url(#ag)"/><g clip-path="url(#av)"><g transform="translate(110 112) scale(${s}) translate(${-x} ${-y})">${b}</g></g><rect x="3" y="3" width="214" height="214" rx="32" fill="none" stroke="${p.c}" stroke-width="3" opacity=".9"/>`,
    `<radialGradient id="ag" cx="50%" cy="42%" r="62%"><stop offset="0" stop-color="${p.c}" stop-opacity=".5"/><stop offset=".55" stop-color="#141a33"/><stop offset="1" stop-color="#0b0f1c"/></radialGradient><clipPath id="av"><rect x="3" y="3" width="214" height="214" rx="32"/></clipPath>`);
};

for (const p of CAST) {
  fs.writeFileSync(path.join(OUT, `${p.id}-token.svg`), token(p));
  await sharp(Buffer.from(avatar(p)), { density: 384 }).resize(512, 512).png({ compressionLevel: 9 }).toFile(path.join(OUT, `${p.id}-avatar.png`));
}

// T25 (vòng 2): sinh 4 nhân vật Lumina-01 (SVG, vẽ bằng code, không asset ngoài).
// Chạy: node public/maps/neon/assets/pets/build-pets.mjs
// Phong cách: chibi mềm (đầu ~45% chiều cao), khối tròn + gradient, viền tối sạch,
// viền neon màu chủ quanh cả bóng dáng (đọc được ở ~40 px), mắt phát sáng.
// Mỗi nhân vật -> <id>-token.svg (nền trong, 220x220, chân/bóng ở giữa đáy y≈204 như vòng 1)
//              -> <id>-avatar.png (512x512, nền tối + quầng màu chủ; PNG vì test maps yêu cầu).
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

const OL = '#0a0c18';   // viền tối
const CY = '#27e6ff';   // cyan dữ liệu
const SK = '#ffd9bf';   // da
const owf = (w = 2.4) => `stroke="${OL}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const ow = owf();

// gradient tuyến tính (sáng trên-trái -> tối dưới-phải), id riêng trong file
const lg = (id, a, b, x2 = 0.6, y2 = 1) => `<linearGradient id="${id}" x1="0.2" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const rg = (id, stops, cx = 0.35, cy = 0.3, r = 0.8) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`;
// nét phát sáng: quầng mờ + nét màu + lõi trắng
const glow = (d, col, w = 3, core = true) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w + 5}" stroke-linecap="round" stroke-linejoin="round" opacity=".5" filter="url(#bl)"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>${core ? `<path d="${d}" fill="none" stroke="#fff" stroke-width="${(w * 0.35).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>` : ''}`;
const halo = (cx, cy, r, col, o = 0.6) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}" opacity="${o}" filter="url(#bl)"/>`;
const shadow = (rx = 32, ry = 9) => `<ellipse cx="110" cy="204" rx="${rx}" ry="${ry}" fill="#000" opacity=".4"/>`;
// điểm sáng bóng (specular) mềm
const spec = (cx, cy, rx, ry, rot = -30, o = 0.55) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="#fff" opacity="${o}"/>`;

// Bộ lọc chung: bl = quầng; rim = viền neon màu chủ quanh bóng dáng (dilate alpha + blur).
const filters = (c) => `<filter id="bl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3.2"/></filter>
<filter id="rim" x="-20%" y="-20%" width="140%" height="140%"><feMorphology in="SourceAlpha" operator="dilate" radius="3.2" result="d"/><feFlood flood-color="${c}"/><feComposite in2="d" operator="in" result="o"/><feGaussianBlur in="o" stdDeviation="3.5" result="ob"/><feMerge><feMergeNode in="ob"/><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

// ---------------------------------------------------------------- Hacker
function runner(c) {
  const defs = lg('hood', shade(c, 1.35), shade(c, 0.55)) + lg('coat', '#3b2a5c', '#16112a') + lg('leg', '#2b3152', '#12152a')
    + rg('face', [[0, '#fff1e6'], [0.7, SK], [1, '#e9b597']], 0.4, 0.35, 0.75)
    + lg('visor', '#0d1430', '#05070f', 1, 0.2) + rg('hin', [[0, '#2a1838'], [1, '#0c0814']], 0.55, 0.55, 0.7);
  let b = '';
  // cáp dữ liệu: từ gáy mũ trùm vòng ra sau, xuống đất, đầu cắm sáng
  const cable = 'M78 96 C52 112 50 150 62 176 C70 192 86 196 84 186';
  b += `<path d="${cable}" fill="none" stroke="${OL}" stroke-width="7" stroke-linecap="round"/>` + glow(cable, c, 3.4);
  b += `<rect x="78" y="180" width="12" height="9" rx="3" fill="#20263f" ${ow} transform="rotate(-25 84 184)"/>` + halo(84, 186, 4, c, 0.9);
  // chân
  b += `<rect x="94" y="168" width="14" height="32" rx="7" fill="url(#leg)" ${ow}/><rect x="114" y="170" width="14" height="32" rx="7" fill="url(#leg)" ${ow}/>`;
  b += `<path d="M92 196 q8 -6 18 0 v4 q-9 4 -18 0z" fill="#11142a" ${ow}/><path d="M112 198 q8 -6 18 0 v4 q-9 4 -18 0z" fill="#11142a" ${ow}/>`;
  b += glow('M95 199 h12', c, 1.6, false) + glow('M115 201 h12', c, 1.6, false);
  // tay sau
  b += `<path d="M86 134 C76 146 76 160 84 166" fill="none" stroke="${OL}" stroke-width="13" stroke-linecap="round"/><path d="M86 134 C76 146 76 160 84 166" fill="none" stroke="#2c2048" stroke-width="8" stroke-linecap="round"/>`;
  // áo khoác hoodie (thân nhỏ, phình đáy)
  b += `<path d="M88 128 C86 150 84 168 88 178 Q110 186 134 178 C138 166 136 148 132 128 Q110 118 88 128Z" fill="url(#coat)" ${ow}/>`;
  b += `<path d="M90 172 Q110 180 132 172" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
  b += glow('M112 132 L113 176', c, 2.2);   // khoá kéo sáng
  b += `<path d="M118 154 q8 0 10 6" fill="none" stroke="#5b4a86" stroke-width="2"/>`;
  // tay trước + máy tính bảng hologram
  b += `<path d="M130 134 C142 142 146 152 140 160" fill="none" stroke="${OL}" stroke-width="13" stroke-linecap="round"/><path d="M130 134 C142 142 146 152 140 160" fill="none" stroke="#3b2a5c" stroke-width="8" stroke-linecap="round"/>`;
  b += `<path d="M128 150 L156 142 L160 162 L132 170Z" fill="${CY}" opacity=".28" stroke="${CY}" stroke-width="1.6" filter="url(#bl)"/><path d="M128 150 L156 142 L160 162 L132 170Z" fill="${CY}" fill-opacity=".25" stroke="${CY}" stroke-width="1.6" stroke-linejoin="round"/>`;
  b += `<path d="M133 155 l18 -5 M134 160 l12 -3 M135 165 l16 -4" stroke="#e6fdff" stroke-width="1.4" stroke-linecap="round" opacity=".9"/>`;
  b += `<circle cx="139" cy="160" r="5" fill="${SK}" ${ow}/>`;
  // ĐẦU: mũ trùm lớn có chóp ngả sau
  b += `<path d="M66 104 C62 72 82 50 108 48 C120 40 132 36 140 38 C134 44 136 50 140 54 C156 66 160 90 154 112 C148 132 128 140 108 140 C86 140 70 128 66 104Z" fill="url(#hood)" ${ow}/>`;
  b += spec(92, 66, 14, 6, -35, 0.45);
  // lòng mũ tối + mặt
  b += `<path d="M84 104 C82 82 98 70 118 70 C140 70 152 86 150 104 C148 124 134 134 116 134 C98 134 86 124 84 104Z" fill="url(#hin)"/>`;
  b += `<path d="M90 108 C90 90 102 80 119 80 C136 80 146 92 145 108 C144 124 132 132 118 132 C102 132 90 124 90 108Z" fill="url(#face)"/>`;
  // tóc mái
  b += `<path d="M90 100 C92 84 104 76 120 77 C134 78 144 86 146 98 C138 90 128 88 122 92 C114 86 102 88 90 100Z" fill="#2a1a3e"/>`;
  // visor phát sáng + mắt
  b += `<path d="M86 98 Q118 88 152 96 L150 112 Q118 106 88 114Z" fill="url(#visor)" ${ow}/>`;
  b += glow('M90 112 Q118 104 149 110', CY, 1.6, false);
  b += halo(106, 103, 7, CY, 0.8) + halo(133, 102, 7, CY, 0.8);
  b += `<path d="M99 104 Q106 98 113 103 Q106 106 99 104Z" fill="${CY}"/><path d="M126 102 Q133 96 140 101 Q133 105 126 102Z" fill="${CY}"/>`;
  b += `<path d="M101 103 Q106 100 111 102" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><path d="M128 101 Q133 98 138 100" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`;
  b += `<path d="M112 122 Q120 126 128 120" fill="none" stroke="#8a3a52" stroke-width="2.4" stroke-linecap="round"/>`;
  b += `<ellipse cx="100" cy="118" rx="5" ry="3" fill="${c}" opacity=".35"/><ellipse cx="140" cy="117" rx="5" ry="3" fill="${c}" opacity=".35"/>`;
  // tai nghe / antenna bên mũ
  b += `<circle cx="74" cy="104" r="7" fill="#1b1f36" ${ow}/>` + halo(74, 104, 3, c, 0.9) + `<circle cx="74" cy="104" r="2.6" fill="#fff"/>`;
  b += glow('M140 40 L148 30', c, 1.6) + halo(149, 29, 3, c, 1) + `<circle cx="149" cy="29" r="2" fill="#fff"/>`;
  return { defs, body: shadow(34, 9) + `<g filter="url(#rim)">${b}</g>` };
}

// ---------------------------------------------------------------- Shipper
function courier(c) {
  const defs = lg('jk', shade(c, 1.3), shade(c, 0.5)) + lg('cap', shade(c, 1.45), shade(c, 0.6)) + lg('leg', '#2b3152', '#12152a')
    + rg('face', [[0, '#fff1e6'], [0.7, SK], [1, '#e9b597']], 0.4, 0.35, 0.75)
    + lg('box', '#ffe2b0', '#c9884a') + lg('box2', '#d99a5a', '#8e5428') + lg('brd', '#2a3358', '#0c1022', 0.5, 1)
    + rg('eye', [[0, '#4ab7ff'], [0.6, '#123a8a'], [1, '#0a1640']], 0.5, 0.65, 0.7);
  let b = '';
  // ván bay: thân + mép sáng + phản lực dưới
  b += halo(110, 200, 24, c, 0.55) + `<ellipse cx="110" cy="200" rx="30" ry="6" fill="${CY}" opacity=".5" filter="url(#bl)"/>`;
  b += `<path d="M66 186 C66 178 82 174 110 174 C140 174 156 178 156 186 C156 194 140 198 110 198 C80 198 66 194 66 186Z" fill="url(#brd)" ${ow}/>`;
  b += glow('M70 189 C76 195 92 197 110 197 C130 197 146 195 152 189', c, 2.4);
  b += `<ellipse cx="110" cy="182" rx="38" ry="5" fill="#3a4672" opacity=".7"/>`;
  b += halo(84, 196, 4, CY, 1) + halo(136, 196, 4, CY, 1);
  // thùng hàng lớn sau lưng (khối bo tròn)
  b += `<path d="M58 104 L92 92 L112 102 L112 146 L78 158 L58 148Z" fill="url(#box2)" ${ow}/>`;
  b += `<path d="M58 104 L92 92 L112 102 L78 114Z" fill="url(#box)" ${ow}/>`;
  b += `<path d="M78 114 L78 158" stroke="${OL}" stroke-width="2"/>`;
  b += `<path d="M66 108 L100 96" stroke="${c}" stroke-width="5" stroke-linecap="round"/><path d="M66 108 L66 150" stroke="${c}" stroke-width="5" opacity=".9"/>`;
  b += `<rect x="84" y="124" width="18" height="12" rx="2" fill="#fff" opacity=".9" transform="skewY(-25)" transform-origin="93 130"/>`;
  // chân
  b += `<rect x="96" y="158" width="13" height="22" rx="6.5" fill="url(#leg)" ${ow}/><rect x="114" y="160" width="13" height="22" rx="6.5" fill="url(#leg)" ${ow}/>`;
  b += `<path d="M93 178 q9 -7 19 0 v3 q-10 4 -19 0z" fill="#f2f5ff" ${ow}/><path d="M111 180 q9 -7 19 0 v3 q-10 4 -19 0z" fill="#f2f5ff" ${ow}/>`;
  // thân áo khoác + dải phản quang
  b += `<path d="M90 124 C88 140 88 156 92 166 Q112 172 132 164 C136 152 134 138 130 124 Q110 116 90 124Z" fill="url(#jk)" ${ow}/>`;
  b += `<path d="M90 146 Q112 152 133 144" fill="none" stroke="#f4f8ff" stroke-width="4"/>` + glow('M90 146 Q112 152 133 144', '#ffffff', 1, false);
  b += `<path d="M96 124 L108 160" stroke="#151a33" stroke-width="3" opacity=".7"/>`; // quai đeo thùng
  // tay vẫy
  b += `<path d="M130 130 C142 124 148 112 146 102" fill="none" stroke="${OL}" stroke-width="13" stroke-linecap="round"/><path d="M130 130 C142 124 148 112 146 102" fill="none" stroke="${shade(c, 0.85)}" stroke-width="8" stroke-linecap="round"/>`;
  b += `<circle cx="146" cy="98" r="6.5" fill="${SK}" ${ow}/>`;
  // ĐẦU tròn
  b += `<circle cx="112" cy="94" r="31" fill="url(#face)" ${ow}/>`;
  b += `<path d="M82 92 C80 104 84 112 88 116 C86 104 90 96 96 92Z" fill="#3a2418"/>`;   // tóc mai
  // mũ lưỡi trai
  b += `<path d="M80 90 C78 66 96 54 114 54 C134 54 146 68 144 86 Q112 78 80 90Z" fill="url(#cap)" ${ow}/>`;
  b += `<path d="M124 82 C138 76 156 80 160 88 C154 94 140 94 128 92Z" fill="${shade(c, 0.5)}" ${ow}/>`;
  b += spec(98, 66, 10, 5, -30, 0.5);
  b += `<path d="M104 70 l6 -6 l-1 5 l6 0 l-7 7 l1 -5z" fill="#fff"/>`;   // ký hiệu tia chớp giao nhanh
  b += `<circle cx="114" cy="55" r="3" fill="${shade(c, 0.6)}" ${ow}/>`;
  // mắt to bóng + miệng cười
  b += `<ellipse cx="104" cy="100" rx="6" ry="8" fill="url(#eye)" ${ow}/><ellipse cx="128" cy="99" rx="6" ry="8" fill="url(#eye)" ${ow}/>`;
  b += `<circle cx="102" cy="97" r="2.6" fill="#fff"/><circle cx="126" cy="96" r="2.6" fill="#fff"/><circle cx="106" cy="103" r="1.2" fill="${CY}"/><circle cx="130" cy="102" r="1.2" fill="${CY}"/>`;
  b += `<path d="M110 112 Q117 120 124 111 Z" fill="#7a2a36" ${owf(1.6)}/>`;
  b += `<ellipse cx="96" cy="111" rx="5" ry="3" fill="#ff7a8a" opacity=".45"/><ellipse cx="136" cy="110" rx="5" ry="3" fill="#ff7a8a" opacity=".45"/>`;
  // tai nghe + mic
  b += `<path d="M84 98 Q86 114 100 118" fill="none" stroke="#151a33" stroke-width="2.4"/>` + halo(101, 118, 2.5, CY, 1);
  return { defs, body: shadow(40, 9) + `<g filter="url(#rim)">${b}</g>` };
}

// ---------------------------------------------------------------- Mèo Chrome
function cat(c) {
  const chrome = (id, x2 = 0.7, y2 = 1) => `<linearGradient id="${id}" x1="0.1" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="#ffffff"/><stop offset=".28" stop-color="#c9d3e6"/><stop offset=".48" stop-color="#6c7896"/><stop offset=".56" stop-color="#e8eefa"/><stop offset=".8" stop-color="#9aa6c0"/><stop offset="1" stop-color="#4a5470"/></linearGradient>`;
  const defs = chrome('ch') + chrome('ch2', 0.3, 1) + rg('eye', [[0, '#ffffff'], [0.3, shade(c, 1.3)], [1, shade(c, 0.55)]], 0.5, 0.45, 0.7)
    + lg('tl', '#dfe6f4', '#59637e', 1, 0.3);
  let b = '';
  // đuôi cong chữ S phía sau, đầu đuôi LED
  const tail = 'M134 186 C164 184 172 160 160 140 C152 126 158 112 170 108';
  b += `<path d="${tail}" fill="none" stroke="${OL}" stroke-width="14" stroke-linecap="round"/><path d="${tail}" fill="none" stroke="url(#tl)" stroke-width="9" stroke-linecap="round"/>`;
  b += `<path d="M160 140 C152 126 158 112 170 108" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/>`;
  b += halo(171, 107, 9, c, 0.9) + `<circle cx="171" cy="107" r="5.5" fill="${c}" ${owf(1.8)}/><circle cx="170" cy="106" r="2.2" fill="#fff"/>`;
  // thân ngồi hình quả lê
  b += `<path d="M84 196 C74 186 76 160 88 144 C94 134 126 134 132 144 C146 162 148 186 136 196 Q110 204 84 196Z" fill="url(#ch)" ${ow}/>`;
  b += `<path d="M124 150 C138 162 140 182 132 194" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
  // đùi sau
  b += `<path d="M120 172 C134 168 144 180 140 194 Q130 200 118 196 C114 188 114 178 120 172Z" fill="url(#ch2)" ${ow}/>`;
  // hai chân trước
  b += `<path d="M96 160 C94 176 94 190 96 198" fill="none" stroke="${OL}" stroke-width="13" stroke-linecap="round"/><path d="M96 160 C94 176 94 190 96 198" fill="none" stroke="#d3dbeb" stroke-width="8.5" stroke-linecap="round"/>`;
  b += `<path d="M110 162 C110 178 110 190 111 199" fill="none" stroke="${OL}" stroke-width="13" stroke-linecap="round"/><path d="M110 162 C110 178 110 190 111 199" fill="none" stroke="#eef2fa" stroke-width="8.5" stroke-linecap="round"/>`;
  b += `<path d="M93 199 h6 M108 200 h6" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`;
  // vòng cổ LED + thẻ
  b += `<path d="M88 142 Q110 154 132 140" fill="none" stroke="${OL}" stroke-width="7" stroke-linecap="round"/>` + glow('M88 142 Q110 154 132 140', c, 3.2);
  b += `<path d="M106 148 l5 0 l3 6 l-5.5 4 l-5.5 -4z" fill="${CY}" ${owf(1.5)}/>` + halo(109, 152, 3, CY, 0.9);
  // tai (nhọn, đầu bo) + lòng tai phát sáng
  b += `<path d="M72 84 C68 62 70 46 76 40 C86 46 96 56 102 66Z" fill="url(#ch)" ${ow}/><path d="M78 76 C76 62 77 54 79 50 C85 55 90 60 94 66Z" fill="${c}" opacity=".9"/>`;
  b += `<path d="M126 64 C134 52 146 42 156 40 C160 50 158 66 152 82Z" fill="url(#ch)" ${ow}/><path d="M132 64 C138 56 145 50 151 48 C153 56 152 64 149 72Z" fill="${c}" opacity=".9"/>`;
  b += halo(84, 62, 7, c, 0.5) + halo(146, 58, 7, c, 0.5);
  // ĐẦU tròn bầu, má phính
  b += `<path d="M68 100 C66 76 86 60 112 60 C140 60 158 76 156 100 C155 116 146 128 130 134 Q112 140 94 134 C78 128 68 116 68 100Z" fill="url(#ch)" ${ow}/>`;
  b += spec(92, 72, 14, 6, -25, 0.75) + spec(140, 72, 6, 3, 25, 0.5);
  b += `<path d="M112 62 L112 74 M104 63 L106 72 M120 63 L118 72" stroke="#7f8aa6" stroke-width="2" stroke-linecap="round" opacity=".6"/>`; // vằn chrome
  // mắt LED hạnh nhân, đồng tử dọc
  b += halo(96, 98, 10, c, 0.75) + halo(130, 98, 10, c, 0.75);
  b += `<path d="M84 99 Q95 85 107 97 Q96 108 84 99Z" fill="url(#eye)" ${ow}/><path d="M119 97 Q131 85 142 99 Q130 108 119 97Z" fill="url(#eye)" ${ow}/>`;
  b += `<ellipse cx="96" cy="98" rx="2" ry="6" fill="${OL}"/><ellipse cx="130" cy="98" rx="2" ry="6" fill="${OL}"/>`;
  b += `<circle cx="93" cy="94" r="2" fill="#fff"/><circle cx="127" cy="94" r="2" fill="#fff"/>`;
  // mũi + miệng "w"
  b += `<path d="M109 108 h7 l-3.5 4z" fill="#ff6fa8" ${owf(1.4)}/>`;
  b += `<path d="M104 116 Q108 120 112.5 115 Q117 120 121 116" fill="none" stroke="${OL}" stroke-width="2" stroke-linecap="round"/>`;
  b += `<ellipse cx="86" cy="113" rx="5" ry="3" fill="${c}" opacity=".35"/><ellipse cx="138" cy="113" rx="5" ry="3" fill="${c}" opacity=".35"/>`;
  // ria sợi quang
  for (const d of ['M90 110 L58 104', 'M90 114 L56 116', 'M91 118 L60 128', 'M134 110 L166 104', 'M134 114 L168 116', 'M133 118 L164 128']) b += glow(d, '#ffffff', 1.2, false);
  return { defs, body: shadow(38, 9) + `<g filter="url(#rim)">${b}</g>` };
}

// ---------------------------------------------------------------- Drone
function drone(c) {
  const defs = rg('sh', [[0, shade(c, 1.55)], [0.45, c], [1, shade(c, 0.42)]], 0.32, 0.28, 0.85)
    + rg('lens', [[0, '#bff8ff'], [0.25, CY], [0.65, '#0a5a8a'], [1, '#04121f']], 0.42, 0.4, 0.7)
    + lg('arm', '#3a4266', '#141a30') + rg('sir', [[0, '#ffd0d4'], [0.4, '#ff3b4e'], [1, '#8a0f1c']], 0.35, 0.3, 0.8)
    + `<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>`;
  const rotor = (x, y) => `<path d="M${x} ${y + 2} v-8" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M${x} ${y + 2} v-8" stroke="#3a4266" stroke-width="2.4" stroke-linecap="round"/>`
    + `<ellipse cx="${x}" cy="${y - 7}" rx="21" ry="6.5" fill="${CY}" opacity=".18" stroke="${OL}" stroke-width="2"/>`
    + `<ellipse cx="${x}" cy="${y - 7}" rx="19" ry="5.5" fill="none" stroke="${CY}" stroke-width="1.6" opacity=".85"/>`
    + `<path d="M${x - 17} ${y - 5} L${x + 17} ${y - 9}" stroke="#e6ecf8" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>`
    + `<circle cx="${x}" cy="${y - 7}" r="3" fill="#1d2440" ${owf(1.5)}/>`;
  const arm = (x, y, sx = 110, sy = 112) => `<path d="M${sx} ${sy} L${x} ${y}" stroke="${OL}" stroke-width="9" stroke-linecap="round"/><path d="M${sx} ${sy} L${x} ${y}" stroke="url(#arm)" stroke-width="5" stroke-linecap="round"/>`;
  let b = '';
  // tia quét xuống đất
  b += `<path d="M96 140 L74 202 Q110 212 146 202 L124 140Z" fill="url(#beam)"/>`;
  b += `<ellipse cx="110" cy="203" rx="28" ry="7" fill="none" stroke="${c}" stroke-width="2" opacity=".8" filter="url(#bl)"/>`;
  // rotor phía sau (vẽ trước thân)
  b += arm(66, 92) + arm(154, 92) + rotor(66, 92) + rotor(154, 92);
  // thân cầu
  b += `<circle cx="110" cy="110" r="36" fill="url(#sh)" ${ow}/>`;
  b += `<path d="M76 116 Q110 134 144 116" fill="none" stroke="${OL}" stroke-width="2" opacity=".55"/>`;   // đường ghép vỏ
  b += `<path d="M80 122 Q110 140 140 122 Q138 140 110 146 Q82 140 80 122Z" fill="#1a1f38" opacity=".85"/>`;
  b += glow('M86 132 Q110 142 134 132', c, 1.6, false);
  b += spec(94, 88, 12, 6, -35, 0.6);
  // còi hiệu trên đỉnh
  b += `<path d="M100 78 Q110 72 120 78 L118 82 Q110 79 102 82Z" fill="#2a3150" ${ow}/>`;
  b += halo(110, 66, 11, '#ff3b4e', 0.75) + `<path d="M102 77 C102 62 118 62 118 77Z" fill="url(#sir)" ${ow}/><ellipse cx="107" cy="68" rx="2.4" ry="3.4" fill="#fff" opacity=".85"/>`;
  // mắt kính lớn duy nhất, mí cười
  b += `<circle cx="116" cy="110" r="19" fill="#1a1f38" ${ow}/>`;
  b += halo(116, 110, 13, CY, 0.7) + `<circle cx="116" cy="110" r="14" fill="url(#lens)"/>`;
  b += `<circle cx="116" cy="110" r="6" fill="#04121f"/><circle cx="116" cy="110" r="3" fill="${CY}"/>`;
  b += `<circle cx="110" cy="104" r="4" fill="#fff" opacity=".95"/><circle cx="122" cy="115" r="1.8" fill="#fff" opacity=".8"/>`;
  b += `<path d="M98 98 Q116 88 134 98" fill="none" stroke="${OL}" stroke-width="3" stroke-linecap="round"/>`;  // mí trên
  b += `<path d="M100 124 Q116 134 132 124" fill="none" stroke="${shade(c, 1.5)}" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>`; // má cười
  // rotor phía trước
  b += arm(76, 140, 90, 132) + arm(144, 140, 130, 132) + rotor(76, 140) + rotor(144, 140);
  // đèn hiệu đầu cánh
  b += halo(66, 92, 3, c, 1) + halo(154, 92, 3, c, 1);
  return { defs, body: shadow(30, 8) + `<g filter="url(#rim)">${b}</g>` };
}
const DRAW = { 'neon-runner': runner, 'neon-courier': courier, 'neon-cat': cat, 'neon-drone': drone };

const svg = (p, inner, extraDefs = '') => {
  const d = DRAW[p.id](p.c);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="220" height="220"><defs>${filters(p.c)}${d.defs}${extraDefs}</defs>${inner(d.body)}</svg>\n`;
};
const token = (p) => svg(p, (b) => b);
const avatar = (p) => svg(p, (b) => `<rect width="220" height="220" rx="34" fill="url(#ag)"/><rect x="3" y="3" width="214" height="214" rx="32" fill="none" stroke="${p.c}" stroke-width="3" opacity=".9"/><g transform="translate(110 120) scale(1.18) translate(-110 -124)">${b}</g>`,
  `<radialGradient id="ag" cx="50%" cy="48%" r="62%"><stop offset="0" stop-color="${p.c}" stop-opacity=".55"/><stop offset="1" stop-color="#0b0f1c"/></radialGradient>`);

for (const p of CAST) {
  fs.writeFileSync(path.join(OUT, `${p.id}-token.svg`), token(p));
  await sharp(Buffer.from(avatar(p)), { density: 384 }).resize(512, 512).png({ compressionLevel: 9 }).toFile(path.join(OUT, `${p.id}-avatar.png`));
}
console.log('đã sinh', CAST.length * 2, 'file (token SVG + avatar PNG) ở', OUT);

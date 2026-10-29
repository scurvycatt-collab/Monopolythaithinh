import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUTS = [
  { id: 'ben-10', variant: 'ground', petPrefix: 'ben10-', dir: path.join(ROOT, 'public', 'maps', 'ben-10', 'assets', 'buildings') },
  { id: 'ben-10-02', variant: 'space', petPrefix: 'ben10-02-', dir: path.join(ROOT, 'public', 'maps', 'ben-10-02', 'assets', 'buildings') },
];
const PETS = [
  { id: 'ben10-ben', name: 'Ben', color: '#70c83d', secondary: '#b9ff59' },
  { id: 'ben10-gwen', name: 'Gwen', color: '#4c8ee8', secondary: '#e66fe8' },
  { id: 'ben10-kevin', name: 'Kevin', color: '#6f668c', secondary: '#b7c0c5' },
  { id: 'ben10-max', name: 'Ông Max', color: '#df5a3f', secondary: '#9df3d2' },
];
const LEVELS = ['Cọc sở hữu', 'Cấp 1', 'Cấp 2', 'Cấp 3', 'Khách sạn'];
const expected = PETS.flatMap((pet) => LEVELS.map((_, level) => `${pet.id}-${level}.png`));
const petIdFor = (output, pet) => output.variant === 'space' && pet.id === 'ben10-max' ? `${output.petPrefix}rook` : pet.id.replace(/^ben10-/, output.petPrefix);
const petNameFor = (output, pet) => output.variant === 'space' && pet.id === 'ben10-max' ? 'Rook' : pet.name;
const expectedFor = (output) => PETS.flatMap((pet) => LEVELS.map((_, level) => `${petIdFor(output, pet)}-${level}.png`));
const sourceHash = () => crypto.createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex');
let activeVariant = 'ground';

const wrap = (body, color) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<defs><filter id="s" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="12"/></filter><filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><linearGradient id="m" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f0f5f2"/><stop offset="1" stop-color="#7f918a"/></linearGradient><linearGradient id="d" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#52645d"/><stop offset="1" stop-color="#18231f"/></linearGradient></defs>
<ellipse cx="256" cy="420" rx="142" ry="35" fill="#102019" opacity=".3" filter="url(#s)"/>
<path d="M92 381 256 300l164 81-164 82Z" fill="${activeVariant === 'space' ? '#06140f' : '#17241f'}" stroke="${activeVariant === 'space' ? '#3cff78' : color}" stroke-width="8" ${activeVariant === 'space' ? 'filter="url(#g)"' : ''}/>
${activeVariant === 'space' ? '<path d="M130 381 256 319l126 62-126 62Z" fill="none" stroke="#1f8e55" stroke-width="5" stroke-dasharray="18 12"/><circle cx="256" cy="381" r="13" fill="#63ff92" filter="url(#g)"/>' : ''}
<g ${activeVariant === 'space' ? 'filter="url(#g)"' : ''}>${body}</g></svg>`;
const ring = (color, y = 346, r = 66) => `<ellipse cx="256" cy="${y}" rx="${r}" ry="${Math.round(r * .48)}" fill="#111a17" stroke="${color}" stroke-width="14"/><ellipse cx="256" cy="${y}" rx="${Math.round(r * .55)}" ry="${Math.round(r * .25)}" fill="${color}" opacity=".9"/>`;
const box = (x, y, w, h, color, top = '#eff4f1') => `<path d="M${x} ${y} ${x + w / 2} ${y - 28} ${x + w} ${y} ${x + w / 2} ${y + 28}Z" fill="${top}"/><path d="M${x} ${y}v${h}l${w / 2} 28v-${h}Z" fill="${color}"/><path d="M${x + w} ${y}v${h}l-${w / 2} 28v-${h}Z" fill="#596a64"/>`;

function ben(level, p) {
  if (!level) return wrap(`${ring(p.color)}<path d="m214 338 42-25 42 25-42 25Z" fill="#b9ff59"/><path d="m234 325 22 13-22 13Zm44 0-22 13 22 13Z" fill="#101914"/><path d="M150 370v-116" stroke="#d9e4de" stroke-width="12"/><path d="m156 258 66 22-66 24Z" fill="${p.color}"/>`, p.color);
  const h = 56 + level * 36, y = 356 - h;
  let body = `${box(178, y + 58, 156, h - 25, '#263a34')}<ellipse cx="256" cy="${y + 58}" rx="78" ry="38" fill="${p.color}" stroke="#14201b" stroke-width="8"/>${ring('#b9ff59', y + 54, 38 + level * 4)}`;
  for (let i = 0; i < level; i++) { const x = 190 + i * (132 / Math.max(1, level - 1)); body += `<rect x="${x - 9}" y="${y + 70}" width="18" height="${h - 45}" rx="9" fill="${i % 2 ? p.color : '#dce6e1'}"/>`; }
  if (level >= 2) body += `<rect x="205" y="${y + 105}" width="102" height="18" rx="8" fill="#b9ff59"/><rect x="220" y="${y + 108}" width="12" height="12" fill="#17241f"/><rect x="244" y="${y + 108}" width="12" height="12" fill="#17241f"/><rect x="268" y="${y + 108}" width="12" height="12" fill="#17241f"/>`;
  if (level >= 3) body += `<rect x="245" y="${y - 28}" width="22" height="62" rx="10" fill="#1c2924"/><circle cx="256" cy="${y - 34}" r="22" fill="#b9ff59" stroke="#17241f" stroke-width="8"/>`;
  if (level === 4) body += `<path d="M145 ${y + 90} 186 ${y - 28}M367 ${y + 90} 326 ${y - 28}" stroke="${p.color}" stroke-width="18"/><ellipse cx="256" cy="${y - 34}" rx="112" ry="34" fill="#111a17" stroke="#b9ff59" stroke-width="10"/>`;
  return wrap(body, p.color);
}

function gwen(level, p) {
  if (!level) return wrap(`${ring('#4c8ee8')}<path d="M256 258 216 370h80Z" fill="#75e9ff" stroke="#eafcff" stroke-width="8"/><g fill="#e66fe8">${[0, 60, 120, 180, 240, 300].map((a) => `<circle cx="${256 + Math.cos(a * Math.PI / 180) * 82}" cy="${346 + Math.sin(a * Math.PI / 180) * 38}" r="10"/>`).join('')}</g>`, p.color);
  const y = 330 - level * 20, r = 70 + level * 8;
  let body = `<ellipse cx="256" cy="${y + 55}" rx="${r}" ry="${Math.round(r * .48)}" fill="url(#m)"/><path d="M${256 - r} ${y + 55}v45q${r} 60 ${r * 2} 0v-45q-${r} 50-${r * 2} 0Z" fill="#dce6ea"/><ellipse cx="256" cy="${y + 55}" rx="${r - 8}" ry="${Math.round(r * .38)}" fill="#252841" stroke="${p.color}" stroke-width="8"/>`;
  const n = 3 + level; for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n, x = 256 + Math.cos(a) * r * .78, yy = y + 55 + Math.sin(a) * r * .28; body += `<rect x="${x - 7}" y="${yy - 52}" width="14" height="58" rx="7" fill="${i % 2 ? p.color : p.secondary}"/><circle cx="${x}" cy="${yy - 56}" r="12" fill="#8ff5ff"/>`; }
  body += `<path d="M256 ${y - 40} 218 ${y + 68}h76Z" fill="#75e9ff" stroke="#eafcff" stroke-width="7"/>`;
  if (level >= 2) body += `<path d="M${256 - r} ${y + 30} 256 ${y - 58} ${256 + r} ${y + 30}" fill="none" stroke="${p.secondary}" stroke-width="12"/><circle cx="256" cy="${y - 58}" r="18" fill="#f09cff"/>`;
  if (level === 4) body += `<ellipse cx="256" cy="${y - 72}" rx="118" ry="42" fill="none" stroke="#85f2ff" stroke-width="14" stroke-dasharray="18 12"/>`;
  return wrap(body, p.color);
}

function kevin(level, p) {
  if (!level) return wrap(`${box(178, 330, 156, 45, '#343945', '#59616a')}<path d="M180 350 330 408M330 350 180 408" stroke="#b7c0c5" stroke-width="12"/><rect x="238" y="292" width="36" height="72" rx="8" fill="${p.color}"/>`, p.color);
  const w = 168 + level * 18, h = 55 + level * 28, x = 256 - w / 2, y = 350 - h;
  let body = `${box(x, y + 55, w, h, '#49515a', '#7a838b')}<path d="M${x + 25} ${y + 90}h${w - 50}v${h - 70}H${x + 25}Z" fill="#20252b"/><path d="M${x} ${y + 72}h${w}" stroke="${p.color}" stroke-width="14"/>`;
  for (let i = 0; i < level; i++) { const xx = x + 25 + i * ((w - 50) / Math.max(1, level - 1)); body += `<rect x="${xx - 9}" y="${y + 5 - i * 8}" width="18" height="70" rx="8" fill="${i % 2 ? '#b7c0c5' : p.color}"/>`; }
  if (level >= 2) body += `<path d="M${x + w * .7} ${y + 50}v-${58 + level * 10}h58" fill="none" stroke="#b7c0c5" stroke-width="12"/><circle cx="${x + w * .7 + 58}" cy="${y - 18 - level * 10}" r="18" fill="${p.color}"/>`;
  if (level >= 3) body += `<path d="M${x + 18} ${y + 18} 256 ${y - 38} ${x + w - 18} ${y + 18}" fill="#2c3239" stroke="${p.color}" stroke-width="9"/>`;
  if (level === 4) body += `<rect x="126" y="${y - 42}" width="260" height="54" rx="10" fill="#242a30" stroke="${p.color}" stroke-width="9"/><path d="M160 ${y - 16}h192" stroke="#d7dce0" stroke-width="10" stroke-dasharray="22 12"/>`;
  return wrap(body, p.color);
}

function max(level, p) {
  if (!level) return wrap(`${box(176, 334, 160, 42, '#8fa09a')}<rect x="246" y="258" width="20" height="106" rx="10" fill="#263a35"/><circle cx="256" cy="250" r="26" fill="${p.color}" stroke="#fff4d6" stroke-width="9"/>`, p.color);
  const w = 160 + level * 18, h = 58 + level * 28, x = 256 - w / 2, y = 354 - h;
  let body = `${box(x, y + 55, w, h, '#9aacA5')}<path d="M${x + 25} ${y + 84}h${w - 50}" stroke="#9df3d2" stroke-width="16" stroke-dasharray="24 10"/><path d="M${x} ${y + 64}v${h - 12}M${x + w} ${y + 64}v${h - 12}" stroke="${p.color}" stroke-width="16"/>`;
  if (level >= 2) body += `<rect x="${x + 34}" y="${y - 18}" width="18" height="82" rx="8" fill="#61736c"/><circle cx="${x + 43}" cy="${y - 22}" r="18" fill="${p.color}"/>`;
  if (level >= 3) body += `<path d="M${x + w - 52} ${y + 55}v-88" stroke="#3c4e47" stroke-width="12"/><ellipse cx="${x + w - 52}" cy="${y - 34}" rx="42" ry="17" fill="#edf3ef" stroke="#61736c" stroke-width="8"/>`;
  if (level === 4) body += `<rect x="112" y="${y - 55}" width="288" height="58" rx="12" fill="${p.color}"/><path d="M148 ${y - 26}h216" stroke="#fff" stroke-width="10" stroke-dasharray="18 10"/><path d="M134 ${y + 20}v-120M378 ${y + 20}v-120" stroke="#dce6e1" stroke-width="10"/>`;
  return wrap(body, p.color);
}

const render = (pet, level) => pet.id === 'ben10-gwen' ? gwen(level, pet) : pet.id === 'ben10-kevin' ? kevin(level, pet) : pet.id === 'ben10-max' ? max(level, pet) : ben(level, pet);

function renderSpace(pet, level) {
  const role = pet.id.replace('ben10-', '');
  if (!level) {
    const beacon = `<ellipse cx="256" cy="365" rx="66" ry="31" fill="#07140f" stroke="#4dff83" stroke-width="10"/><ellipse cx="256" cy="357" rx="42" ry="20" fill="${pet.color}"/><rect x="247" y="278" width="18" height="82" rx="9" fill="#e8f2ef"/><circle cx="256" cy="272" r="22" fill="#65ff92" stroke="#12201a" stroke-width="8"/>`;
    return wrap(beacon, pet.color);
  }
  const h = 62 + level * 33, y = 360 - h;
  let body = '';
  if (role === 'ben') {
    body = `<ellipse cx="256" cy="360" rx="92" ry="42" fill="#111f1a"/><rect x="188" y="${y + 36}" width="136" height="${h}" rx="30" fill="#233a34" stroke="#4dff78" stroke-width="9"/><ellipse cx="256" cy="${y + 37}" rx="68" ry="31" fill="#5aff7e"/><ellipse cx="256" cy="${y + 37}" rx="35" ry="17" fill="#07130e"/><path d="M231 ${y + 23} 256 ${y + 37} 231 ${y + 51}m50-28-25 14 25 14" fill="#65ff8b" stroke="#65ff8b" stroke-width="6"/>`;
    if (level >= 3) body += `<circle cx="256" cy="${y - 5}" r="18" fill="#74ff96"/><rect x="248" y="${y - 2}" width="16" height="42" fill="#dae6e2"/>`;
    if (level === 4) body += `<ellipse cx="256" cy="${y - 20}" rx="112" ry="35" fill="none" stroke="#61ff89" stroke-width="13"/>`;
  } else if (role === 'gwen') {
    body = `<ellipse cx="256" cy="363" rx="98" ry="44" fill="#15203a" stroke="#55eaff" stroke-width="9"/><path d="M256 ${y - 14} 199 356h114Z" fill="#78efff" stroke="#f36fe7" stroke-width="9"/><circle cx="256" cy="${y - 18}" r="20" fill="#ff83ea"/>`;
    const n = 3 + level; for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n, x = 256 + Math.cos(a) * 78, yy = 355 + Math.sin(a) * 29; body += `<rect x="${x - 6}" y="${yy - h * .62}" width="12" height="${h * .62}" rx="6" fill="${i % 2 ? '#55eaff' : '#f36fe7'}"/><circle cx="${x}" cy="${yy - h * .64}" r="9" fill="#eaffff"/>`; }
    if (level === 4) body += `<ellipse cx="256" cy="${y - 34}" rx="112" ry="36" fill="none" stroke="#67efff" stroke-width="12" stroke-dasharray="18 11"/>`;
  } else if (role === 'kevin') {
    const w = 150 + level * 25;
    body = `<path d="M${256 - w / 2} ${y + 54} 256 ${y + 18} ${256 + w / 2} ${y + 54} 256 ${y + 90}Z" fill="#626879"/><rect x="${256 - w / 2}" y="${y + 54}" width="${w}" height="${h - 12}" fill="#252a34" stroke="#8f70ca" stroke-width="9"/><rect x="${256 - w * .34}" y="${y + 84}" width="${w * .68}" height="${Math.max(24, h - 58)}" fill="#0b0d12"/><path d="M${256 - w / 2} ${y + 76}h${w}" stroke="#b093e8" stroke-width="13"/>`;
    if (level >= 3) body += `<path d="M${256 - w * .35} ${y + 36} 256 ${y - 18} ${256 + w * .35} ${y + 36}" fill="#303641" stroke="#9b7bd8" stroke-width="9"/>`;
    if (level === 4) body += `<rect x="118" y="${y - 45}" width="276" height="53" rx="12" fill="#242a34" stroke="#a98ee1" stroke-width="9"/>`;
  } else {
    const w = 142 + level * 24;
    body = `<path d="M${256 - w / 2} ${y + 54} 256 ${y + 18} ${256 + w / 2} ${y + 54} 256 ${y + 90}Z" fill="#e7eef4"/><rect x="${256 - w / 2}" y="${y + 54}" width="${w}" height="${h - 10}" fill="#173b57" stroke="#4cddff" stroke-width="9"/><rect x="${256 - w * .32}" y="${y + 83}" width="${w * .64}" height="18" rx="8" fill="#5ce9ff"/>`;
    if (level >= 2) body += `<rect x="247" y="${y - 25}" width="18" height="70" rx="8" fill="#e5edf2"/><ellipse cx="256" cy="${y - 30}" rx="42" ry="17" fill="#54e5ff"/>`;
    if (level === 4) body += `<rect x="118" y="${y - 56}" width="276" height="58" rx="12" fill="#163b57" stroke="#57e8ff" stroke-width="9"/><path d="M150 ${y - 27}h212" stroke="#fff" stroke-width="9" stroke-dasharray="18 10"/>`;
  }
  return wrap(body, pet.color);
}

async function generate() {
  for (const output of OUTPUTS) {
    activeVariant = output.variant;
    fs.mkdirSync(output.dir, { recursive: true });
    const wanted = new Set(expectedFor(output));
    for (const file of fs.readdirSync(output.dir)) {
      if (file.endsWith('.png') && !wanted.has(file)) fs.unlinkSync(path.join(output.dir, file));
    }
    for (const pet of PETS) for (let level = 0; level < LEVELS.length; level++) {
      const petId = petIdFor(output, pet);
      const svg = output.variant === 'space' ? renderSpace(pet, level) : render(pet, level);
      await sharp(Buffer.from(svg)).png({ palette: true, quality: 92 }).toFile(path.join(output.dir, `${petId}-${level}.png`));
    }
    const pets = PETS.map((pet) => ({ ...pet, id: petIdFor(output, pet), name: petNameFor(output, pet) }));
    fs.writeFileSync(path.join(output.dir, 'manifest.json'), JSON.stringify({ version: 1, mapId: output.id, variant: output.variant, sourceHash: sourceHash(), width: 512, height: 512, pets, levels: LEVELS, files: expectedFor(output) }, null, 2) + '\n');
  }
  console.log(`Đã tạo ${expected.length * OUTPUTS.length} thumbnail công trình cho ${OUTPUTS.length} skin Ben 10`);
}

async function check() {
  for (const output of OUTPUTS) {
    const manifestPath = path.join(output.dir, 'manifest.json');
    assert.ok(fs.existsSync(manifestPath), `Thiếu manifest thumbnail ${output.id}. Chạy: npm run ben10:buildings`);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.sourceHash, sourceHash(), `Thumbnail ${output.id} đã cũ. Chạy: npm run ben10:buildings`);
    assert.equal(manifest.variant, output.variant, `Variant thumbnail ${output.id} không khớp`);
    assert.deepEqual(manifest.files, expectedFor(output), `Danh sách thumbnail ${output.id} không khớp`);
    for (const file of expectedFor(output)) {
      const full = path.join(output.dir, file); assert.ok(fs.existsSync(full) && fs.statSync(full).size > 1000, `Thiếu thumbnail hợp lệ: ${output.id}/${file}`);
      const meta = await sharp(full).metadata(); assert.equal(meta.width, 512, `${output.id}/${file} sai chiều rộng`); assert.equal(meta.height, 512, `${output.id}/${file} sai chiều cao`); assert.ok(meta.hasAlpha, `${output.id}/${file} thiếu alpha`);
    }
  }
  console.log(`OK ${expected.length * OUTPUTS.length} thumbnail công trình Ben 10`);
}

async function review() {
  const reviewDir = path.join(ROOT, 'docs', 'reviews');
  fs.mkdirSync(reviewDir, { recursive: true });
  for (const output of OUTPUTS) {
    const width = 980, height = 860, cellW = 176, cellH = 178, left = 92, top = 90;
    const items = [];
    for (let row = 0; row < PETS.length; row++) for (let col = 0; col < LEVELS.length; col++) {
      const petId = petIdFor(output, PETS[row]);
      const file = path.join(output.dir, `${petId}-${col}.png`);
      items.push({ input: await sharp(file).resize(152, 152, { fit: 'contain' }).png().toBuffer(), left: left + col * cellW + 12, top: top + row * cellH + 20 });
    }
    const labels = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><style>.t{font:700 25px Arial;fill:#effff5}.s{font:700 16px Arial;fill:#9dffba}.r{font:700 17px Arial;fill:#fff}</style><text class="t" x="32" y="45">${output.id.toUpperCase()} · 4 CHỦ × 5 CẤP CÔNG TRÌNH</text>${LEVELS.map((name, col) => `<text class="s" text-anchor="middle" x="${left + col * cellW + 88}" y="78">${name}</text>`).join('')}${PETS.map((pet, row) => `<text class="r" text-anchor="middle" transform="translate(30 ${top + row * cellH + 102}) rotate(-90)">${petNameFor(output, pet)}</text>`).join('')}</svg>`;
    const target = path.join(reviewDir, `${output.id}-buildings.png`);
    await sharp({ create: { width, height, channels: 4, background: output.variant === 'space' ? '#020711' : '#10251d' } }).composite([...items, { input: Buffer.from(labels), left: 0, top: 0 }]).png().toFile(target);
    console.log(`Review: ${path.relative(ROOT, target)}`);
  }
}

if (process.argv.includes('--check')) await check();
else {
  await generate();
  await check();
  if (process.argv.includes('--review')) await review();
}

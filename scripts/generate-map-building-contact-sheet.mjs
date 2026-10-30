import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [mapId, owner, prefix = mapId === 'ben-10-02' ? 'm4' : 'm3'] = process.argv.slice(2);
if (!mapId || !owner) throw new Error('Usage: node scripts/generate-map-building-contact-sheet.mjs <mapId> <owner> [prefix]');

const outputDir = path.join('docs', 'reviews', 'map34', mapId, prefix === 'm4' ? 'M4-C' : 'M3-C');
fs.mkdirSync(outputDir, { recursive: true });
const items = [];
for (let level = 0; level < 5; level++) {
  const file = path.join('public', 'maps', mapId, 'assets', 'v2', 'buildings', `${prefix}-building-${owner}-${level}.webp`);
  items.push({
    input: await sharp(file).resize(210, 280, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
    left: 30 + level * 234,
    top: 85,
  });
}

const labels = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="420">
  <rect width="1200" height="420" fill="#020711"/>
  <text x="32" y="48" fill="#effff5" font-family="Arial" font-size="28" font-weight="700">${mapId.toUpperCase()} · ${owner.toUpperCase()} · 5 PROPERTY LEVELS</text>
  ${[0, 1, 2, 3, 4].map((level) => `<text x="${135 + level * 234}" y="395" text-anchor="middle" fill="#73ff9b" font-family="Arial" font-size="20" font-weight="700">LEVEL ${level}</text>`).join('')}
</svg>`;

const target = path.join(outputDir, `${owner}-contact-sheet.webp`);
await sharp({ create: { width: 1200, height: 420, channels: 4, background: '#020711' } })
  .composite([{ input: Buffer.from(labels), left: 0, top: 0 }, ...items])
  .webp({ quality: 90 })
  .toFile(target);
console.log(target);

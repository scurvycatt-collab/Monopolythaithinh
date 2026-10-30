import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';

const [output, ...inputs] = process.argv.slice(2);
if (!output || !inputs.length) {
  console.error('Dùng: node scripts/create-map-contact-sheet.mjs <output.webp> <asset...>');
  process.exit(2);
}

const cellW = 520;
const cellH = 420;
const labelH = 56;
const columns = Math.min(3, inputs.length);
const rows = Math.ceil(inputs.length / columns);
const composites = [];
for (let i = 0; i < inputs.length; i++) {
  const input = inputs[i];
  const image = await sharp(input).resize({ width: cellW - 36, height: cellH - labelH - 28, fit: 'contain' }).png().toBuffer();
  const meta = await sharp(image).metadata();
  const x = (i % columns) * cellW;
  const y = Math.floor(i / columns) * cellH;
  composites.push({ input: image, left: x + Math.round((cellW - meta.width) / 2), top: y + 12 });
  const label = path.basename(input).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  composites.push({ input: Buffer.from(`<svg width="${cellW}" height="${labelH}"><rect width="100%" height="100%" fill="#13201b"/><text x="50%" y="36" fill="#eaffdf" font-size="22" font-family="Arial" text-anchor="middle">${label}</text></svg>`), left: x, top: y + cellH - labelH });
}
await fs.mkdir(path.dirname(output), { recursive: true });
await sharp({ create: { width: columns * cellW, height: rows * cellH, channels: 4, background: '#09120fff' } })
  .composite(composites)
  .webp({ quality: 88 })
  .toFile(output);
console.log(path.resolve(output));

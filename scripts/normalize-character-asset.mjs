import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const [mode, input, output] = process.argv.slice(2);
if (!['token', 'avatar'].includes(mode) || !input || !output) {
  console.error('Dùng: node scripts/normalize-character-asset.mjs <token|avatar> <input> <output>');
  process.exit(2);
}

const spec = mode === 'token'
  ? { canvas: 1024, maxWidth: 720, maxHeight: 900, bottom: 32, format: 'webp' }
  : { canvas: 512, maxWidth: 468, maxHeight: 468, bottom: 20, format: 'png' };
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const trimmed = await sharp(input).trim({ background: transparent }).png().toBuffer();
const resized = await sharp(trimmed).resize({
  width: spec.maxWidth,
  height: spec.maxHeight,
  fit: 'inside',
  withoutEnlargement: false,
}).png().toBuffer();
const meta = await sharp(resized).metadata();
const left = Math.round((spec.canvas - meta.width) / 2);
const top = spec.canvas - spec.bottom - meta.height;
if (left < 20 || top < 20) throw new Error(`Asset vượt safe margin: left=${left}, top=${top}`);
const image = sharp(resized).extend({
  top,
  bottom: spec.bottom,
  left,
  right: spec.canvas - left - meta.width,
  background: transparent,
});
await fs.mkdir(path.dirname(output), { recursive: true });
if (spec.format === 'webp') await image.webp({ quality: 84, alphaQuality: 100, smartSubsample: true }).toFile(output);
else await image.png({ compressionLevel: 9, palette: true, quality: 92 }).toFile(output);
console.log(JSON.stringify({ mode, canvas: [spec.canvas, spec.canvas], content: [left, top, meta.width, meta.height], footAnchor: [0.5, (top + meta.height) / spec.canvas] }));

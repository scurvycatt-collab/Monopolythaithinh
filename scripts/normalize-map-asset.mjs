import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const [input, output, maxWidthArg = '900', maxHeightArg = '880', bottomArg = '64', qualityArg = '88'] = process.argv.slice(2);
if (!input || !output) {
  console.error('Dùng: node scripts/normalize-map-asset.mjs <input> <output> [maxWidth] [maxHeight] [bottomMargin]');
  process.exit(2);
}

const canvas = 1024;
const maxWidth = Number(maxWidthArg);
const maxHeight = Number(maxHeightArg);
const bottom = Number(bottomArg);
const quality = Number(qualityArg);
const trimmed = await sharp(input).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
const resized = await sharp(trimmed).resize({ width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: false }).png().toBuffer();
const meta = await sharp(resized).metadata();
const left = Math.round((canvas - meta.width) / 2);
const top = canvas - bottom - meta.height;
if (left < 32 || top < 32) throw new Error(`Asset vượt safe margin: left=${left}, top=${top}`);
await fs.mkdir(path.dirname(output), { recursive: true });
await sharp(resized)
  .extend({ top, bottom, left, right: canvas - left - meta.width, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .webp({ quality, alphaQuality: 100, smartSubsample: true })
  .toFile(output);
console.log(JSON.stringify({ canvas: [canvas, canvas], content: [left, top, meta.width, meta.height], anchor: [0.5, (top + meta.height) / canvas] }));

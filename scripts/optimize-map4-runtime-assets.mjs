import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const base = path.join(root, 'public/maps/ben-10-02/assets/v2');
const groups = [
  ['board', 68],
  ['special', 68],
  ['decor', 72],
  ['resorts', 76],
  ['characters', 78],
];

let before = 0;
let after = 0;
for (const [folder, quality] of groups) {
  const dir = path.join(base, folder);
  for (const name of await fs.readdir(dir)) {
    if (!name.endsWith('.webp')) continue;
    const file = path.join(dir, name);
    const input = await fs.readFile(file);
    const output = await sharp(input).webp({ quality, alphaQuality: 88, effort: 6 }).toBuffer();
    before += input.length;
    after += output.length;
    await fs.writeFile(file, output);
  }
}

console.log(JSON.stringify({ before, after, saved: before - after }, null, 2));

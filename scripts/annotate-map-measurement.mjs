import sharp from 'sharp';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Dùng: node scripts/annotate-map-measurement.mjs <input> <output>');

const board = { x: 31, y: 181, w: 1537, h: 780 };
const center = { x: 685, y: 451, w: 230, h: 153 };
const ratio = (center.w / board.w * 100).toFixed(2);
const svg = Buffer.from(`<svg width="1600" height="1000">
  <rect x="${board.x}" y="${board.y}" width="${board.w}" height="${board.h}" fill="none" stroke="#36d6ff" stroke-width="4"/>
  <text x="45" y="215" fill="#36d6ff" font-size="26" font-family="Arial" font-weight="bold">BOARD WIDTH = ${board.w} px</text>
  <rect x="${center.x}" y="${center.y}" width="${center.w}" height="${center.h}" fill="none" stroke="#ffd23a" stroke-width="4"/>
  <text x="690" y="440" fill="#ffd23a" font-size="25" font-family="Arial" font-weight="bold">CENTER = ${center.w} px = ${ratio}%</text>
</svg>`);
await sharp(input).composite([{ input: svg }]).png().toFile(output);
console.log(JSON.stringify({ board, center, ratio: Number(ratio) }));

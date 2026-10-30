import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const reviewDir = path.join(root, 'docs/reviews/map34/ben-10-02/M4-E');
const assetDir = path.join(root, 'public/maps/ben-10-02/assets/v2/ui');
const boardPath = path.join(reviewDir, 'decor-integration.png');
const avatarPath = path.join(root, 'public/maps/ben-10-02/assets/characters/ben.png');
const buildingPath = path.join(root, 'public/maps/ben-10-02/assets/buildings/ben10-02-ben-2.png');
await fs.mkdir(assetDir, { recursive: true });

const svg = (width, height, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs>
  <radialGradient id="space"><stop stop-color="#12352b"/><stop offset=".45" stop-color="#061712"/><stop offset="1" stop-color="#01040b"/></radialGradient>
  <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#172d28"/><stop offset="1" stop-color="#07120f"/></linearGradient>
  <filter id="shadow"><feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#000" flood-opacity=".55"/></filter>
</defs>${body}</svg>`);

const board = await sharp(boardPath).ensureAlpha().trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
const bgBoard = await sharp(board).resize({ width: 1260, height: 960, fit: 'inside' }).png().toBuffer();
await sharp(svg(1920, 1080, `<rect width="1920" height="1080" fill="url(#space)"/><g fill="#baffcd" opacity=".32">${Array.from({length:90},(_,i)=>`<circle cx="${(i*223)%1920}" cy="${(i*137)%1080}" r="${i%4===0?2:1}"/>`).join('')}</g><circle cx="520" cy="520" r="410" fill="none" stroke="#45ff7c" stroke-width="5" opacity=".16"/><rect x="1150" width="770" height="1080" fill="#01040b" opacity=".34"/>`))
  .composite([{ input: bgBoard, left: -25, top: 85 }]).flatten({ background: '#01040b' }).webp({ quality: 82 }).toFile(path.join(assetDir, 'm4-home-background.webp'));

const preview = await sharp(board).resize({ width: 600, height: 330, fit: 'inside' }).png().toBuffer();
await sharp(svg(640, 360, `<rect width="640" height="360" rx="22" fill="url(#space)"/><rect x="8" y="8" width="624" height="344" rx="18" fill="none" stroke="#45ff7c" stroke-width="4" opacity=".9"/>`))
  .composite([{ input: preview, left: 20, top: 15 }]).flatten({ background: '#01040b' }).webp({ quality: 88 }).toFile(path.join(assetDir, 'm4-map-preview.webp'));

const avatar = await sharp(avatarPath).resize(190, 190, { fit: 'contain' }).png().toBuffer();
await sharp(svg(720, 240, `<rect x="10" y="10" width="700" height="220" rx="28" fill="url(#panel)" stroke="#45ff7c" stroke-width="5" filter="url(#shadow)"/><rect x="22" y="22" width="196" height="196" rx="24" fill="#07120f" stroke="#45ff7c" stroke-width="4"/><path d="M230 24H694V92H250Z" fill="#174f31"/><text x="268" y="70" font-family="Arial" font-size="34" font-weight="900" fill="#75ff98">BEN</text><text x="252" y="132" font-family="Arial" font-size="36" font-weight="900" fill="#effff3">2.000.000</text><text x="252" y="170" font-family="Arial" font-size="22" font-weight="700" fill="#a8c8b5">0 HANH TINH</text>`))
  .composite([{ input: avatar, left: 25, top: 25 }]).flatten({ background: '#01040b' }).webp({ quality: 88 }).toFile(path.join(assetDir, 'm4-player-card-master.webp'));

const building = await sharp(buildingPath).resize(290, 290, { fit: 'contain' }).png().toBuffer();
await sharp(svg(900, 700, `<rect width="900" height="700" fill="#01040b"/><rect x="45" y="35" width="810" height="630" rx="34" fill="#f7f7f1" filter="url(#shadow)"/><path d="M45 35H855V150H45Z" fill="#174f31"/><text x="450" y="94" text-anchor="middle" font-family="Arial" font-size="48" font-weight="900" fill="#75ff98">BELLWOOD ORBIT</text><rect x="85" y="185" width="340" height="315" rx="24" fill="#eaf4ec" stroke="#45ff7c" stroke-width="4"/><text x="475" y="275" font-family="Arial" font-size="26" font-weight="700" fill="#61716a">TIEN THUE</text><text x="475" y="335" font-family="Arial" font-size="48" font-weight="900" fill="#13271e">240.000</text><rect x="90" y="545" width="265" height="74" rx="37" fill="#e8ece9"/><text x="222" y="592" text-anchor="middle" font-family="Arial" font-size="22" font-weight="900" fill="#31443c">KHONG MUA</text><rect x="380" y="545" width="430" height="74" rx="37" fill="#17864a"/><text x="595" y="592" text-anchor="middle" font-family="Arial" font-size="25" font-weight="900" fill="white">MUA 540.000</text>`))
  .composite([{ input: building, left: 110, top: 195 }]).webp({ quality: 88 }).toFile(path.join(assetDir, 'm4-popup-master.webp'));

const resultBoard = await sharp(board).resize({ width: 960, height: 600, fit: 'inside' }).modulate({ brightness: .52, saturation: .7 }).png().toBuffer();
await sharp(svg(1100, 760, `<rect width="1100" height="760" fill="url(#space)"/><rect x="190" y="125" width="720" height="510" rx="32" fill="#f7f7f1" filter="url(#shadow)"/><path d="M190 125H910V230H190Z" fill="#174f31"/><text x="550" y="185" text-anchor="middle" font-family="Arial" font-size="44" font-weight="900" fill="#75ff98">BEN THANG!</text><text x="245" y="305" font-family="Arial" font-size="22" font-weight="900" fill="#5c6d65">NGUOI CHOI</text><text x="620" y="305" font-family="Arial" font-size="22" font-weight="900" fill="#5c6d65">TONG TAI SAN</text><text x="245" y="380" font-family="Arial" font-size="28" font-weight="900" fill="#20332b">1   Ben</text><text x="620" y="380" font-family="Arial" font-size="28" font-weight="900" fill="#20332b">9.380.000</text><rect x="285" y="525" width="250" height="70" rx="35" fill="#2e97ef"/><text x="410" y="570" text-anchor="middle" font-family="Arial" font-size="22" font-weight="900" fill="white">CHOI VAN MOI</text><rect x="560" y="525" width="250" height="70" rx="35" fill="#ed4e78"/><text x="685" y="570" text-anchor="middle" font-family="Arial" font-size="22" font-weight="900" fill="white">THOAT PHONG</text>`))
  .composite([{ input: resultBoard, left: 70, top: 80, blend: 'screen', opacity: .22 }]).webp({ quality: 88 }).toFile(path.join(assetDir, 'm4-result-state-review.webp'));

console.log(assetDir);

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const reviewDir = path.join(root, 'docs/reviews/map34/ben-10/M3-E');
const assetDir = path.join(root, 'public/maps/ben-10/assets/v2/ui');
const boardPath = path.join(reviewDir, 'decor-integration.png');
const avatarPath = path.join(root, 'public/maps/ben-10/assets/characters/ben.png');
const buildingPath = path.join(root, 'public/maps/ben-10/assets/buildings/ben10-ben-2.png');

await fs.mkdir(assetDir, { recursive: true });

const svg = (width, height, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="space" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#06110d"/><stop offset=".55" stop-color="#102d20"/><stop offset="1" stop-color="#07130f"/></linearGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#223b31"/><stop offset="1" stop-color="#101d18"/></linearGradient>
    <linearGradient id="lime" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#77d63d"/><stop offset="1" stop-color="#b6ff50"/></linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="12" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="shadow"><feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#000" flood-opacity=".5"/></filter>
  </defs>${body}</svg>`);

async function knockOutCaptureBlack(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    if (max < 10) data[i + 3] = 0;
  }
  return sharp(data, { raw: info }).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
}

const board = await knockOutCaptureBlack(boardPath);

// Trang chủ: bàn cờ thật nằm bên trái, vùng phải tối/sạch dành cho form tạo phòng.
const bgBoard = await sharp(board).resize({ width: 1240, height: 930, fit: 'inside' }).png().toBuffer();
await sharp(svg(1920, 1080, `<rect width="1920" height="1080" fill="url(#space)"/><circle cx="530" cy="500" r="390" fill="#72d13b" opacity=".13" filter="url(#glow)"/><path d="M0 930L930 0M280 1080L1280 0M650 1080L1650 0" stroke="#7be342" stroke-width="2" opacity=".08"/><rect x="1160" width="760" height="1080" fill="#06110d" opacity=".33"/>`))
  .composite([{ input: bgBoard, left: -40, top: 100 }])
  .webp({ quality: 82 })
  .toFile(path.join(assetDir, 'm3-home-background.webp'));

// Preview lựa chọn map: giữ nguyên silhouette và mọi asset live đã QA.
const previewBoard = await sharp(board).resize({ width: 590, height: 330, fit: 'inside' }).png().toBuffer();
await sharp(svg(640, 360, `<rect width="640" height="360" rx="22" fill="url(#space)"/><rect x="8" y="8" width="624" height="344" rx="18" fill="none" stroke="#8bea43" stroke-width="4" opacity=".8"/>`))
  .composite([{ input: previewBoard, left: 25, top: 15 }])
  .webp({ quality: 88 })
  .toFile(path.join(assetDir, 'm3-map-preview.webp'));

const avatar = await sharp(avatarPath).resize(190, 190, { fit: 'contain' }).png().toBuffer();
const miniBoard = await sharp(board).resize(310, 194, { fit: 'inside' }).png().toBuffer();
await sharp(svg(720, 240, `<rect x="10" y="10" width="700" height="220" rx="28" fill="url(#panel)" stroke="#77d63d" stroke-width="5" filter="url(#shadow)"/><rect x="22" y="22" width="196" height="196" rx="24" fill="#101b17" stroke="#9cff2e" stroke-width="4"/><path d="M230 24H694V92H250Z" fill="url(#lime)"/><text x="268" y="70" font-family="Arial" font-size="34" font-weight="900" fill="#102016">BEN</text><text x="252" y="132" font-family="Arial" font-size="36" font-weight="900" fill="#efffe8">2.000.000</text><text x="252" y="170" font-family="Arial" font-size="22" font-weight="700" fill="#a8c8b5">0 hành tinh · HERO</text>`))
  .composite([{ input: avatar, left: 25, top: 25 }, { input: miniBoard, left: 400, top: 38, blend: 'screen', opacity: 0.18 }])
  .webp({ quality: 88 })
  .toFile(path.join(assetDir, 'm3-player-card-master.webp'));

const building = await sharp(buildingPath).resize(290, 290, { fit: 'contain' }).png().toBuffer();
await sharp(svg(900, 700, `<rect width="900" height="700" fill="#06110d"/><rect x="45" y="35" width="810" height="630" rx="34" fill="#f8f6ee" filter="url(#shadow)"/><path d="M45 35H855V150H45Z" fill="#77d63d"/><text x="450" y="94" text-anchor="middle" font-family="Arial" font-size="48" font-weight="900" fill="white">BELLWOOD</text><text x="450" y="132" text-anchor="middle" font-family="Arial" font-size="24" font-weight="700" fill="#eaffdf">KHU OMNITRIX</text><rect x="85" y="185" width="340" height="315" rx="24" fill="#eaf4ec" stroke="#75d33d" stroke-width="4"/><text x="475" y="265" font-family="Arial" font-size="25" font-weight="700" fill="#61716a">Tiền thuê</text><text x="475" y="320" font-family="Arial" font-size="48" font-weight="900" fill="#20332b">240.000</text><text x="475" y="390" font-family="Arial" font-size="25" font-weight="700" fill="#61716a">Bạn có</text><text x="475" y="445" font-family="Arial" font-size="48" font-weight="900" fill="#20332b">2.000.000</text><rect x="90" y="545" width="265" height="74" rx="37" fill="#e8ece9"/><text x="222" y="592" text-anchor="middle" font-family="Arial" font-size="25" font-weight="900" fill="#31443c">KHÔNG MUA</text><rect x="380" y="545" width="430" height="74" rx="37" fill="#2e97ef"/><text x="595" y="592" text-anchor="middle" font-family="Arial" font-size="25" font-weight="900" fill="white">MUA VỚI GIÁ 540.000</text>`))
  .composite([{ input: building, left: 110, top: 195 }])
  .webp({ quality: 88 })
  .toFile(path.join(assetDir, 'm3-popup-master.webp'));

const resultBoard = await sharp(board).resize({ width: 960, height: 600, fit: 'inside' }).modulate({ brightness: .55, saturation: .7 }).png().toBuffer();
await sharp(svg(1100, 760, `<rect width="1100" height="760" fill="url(#space)"/><rect x="190" y="125" width="720" height="510" rx="32" fill="#f8f6ee" filter="url(#shadow)"/><path d="M190 125H910V230H190Z" fill="#77a91f"/><text x="550" y="178" text-anchor="middle" font-family="Arial" font-size="44" font-weight="900" fill="white">BEN THẮNG!</text><text x="550" y="213" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#efffdc">ĐỘC QUYỀN 3 VÙNG</text><text x="245" y="285" font-family="Arial" font-size="22" font-weight="900" fill="#5c6d65">NGƯỜI CHƠI</text><text x="620" y="285" font-family="Arial" font-size="22" font-weight="900" fill="#5c6d65">TỔNG TÀI SẢN</text><path d="M225 310H875" stroke="#cad3cd" stroke-width="3"/><text x="245" y="360" font-family="Arial" font-size="28" font-weight="900" fill="#20332b">1   Ben</text><text x="620" y="360" font-family="Arial" font-size="28" font-weight="900" fill="#20332b">9.380.000</text><text x="245" y="415" font-family="Arial" font-size="25" font-weight="700" fill="#5c6d65">2   Gwen</text><text x="620" y="415" font-family="Arial" font-size="25" font-weight="700" fill="#5c6d65">Phá sản</text><rect x="285" y="525" width="250" height="70" rx="35" fill="#2e97ef"/><text x="410" y="570" text-anchor="middle" font-family="Arial" font-size="24" font-weight="900" fill="white">CHƠI VÁN MỚI</text><rect x="560" y="525" width="250" height="70" rx="35" fill="#ed4e78"/><text x="685" y="570" text-anchor="middle" font-family="Arial" font-size="24" font-weight="900" fill="white">THOÁT PHÒNG</text>`))
  .composite([{ input: resultBoard, left: 70, top: 80, blend: 'screen', opacity: .23 }])
  .webp({ quality: 88 })
  .toFile(path.join(assetDir, 'm3-result-state-review.webp'));

console.log(assetDir);

// T25 v6: sinh 4 quân cờ (board token) Lumina-01 bằng three.js, render offline trong Chromium headless.
// Chạy: node public/maps/neon/assets/pets/build-tokens.mjs [--sheet <file.png>]
// Cần: playwright (npm i -g playwright hoặc devDependency tạm) + Chromium; WebGL qua SwiftShader cũng được.
//   PLAYWRIGHT_MODULE=/đường/dẫn/playwright/index.mjs nếu playwright không import được theo tên.
// Cảnh dựng ở token-scene.js (cơ khí: kim loại, đường ghép tấm, bu-lông, khớp, ống xả/động cơ đẩy, dải phát sáng màu chủ).
// Model nguồn: Kenney Space Kit (CC0) ở public/assets/shared/kenney-space-kit/ (craft_racer, turret_single, rover).
// Đầu ra: <id>-token.svg (220x220, nền trong, PNG 440x440 nhúng base64; điểm neo giữa đáy y≈204 như bộ cũ).
// Avatar (<id>-avatar.png) vẫn do build-pets.mjs sinh, file này không đụng.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const OUT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(OUT, '../../../..');
const CAST = [
  { id: 'neon-vance', c: '#ffb81f' },
  { id: 'neon-nyx', c: '#1fd8ff' },
  { id: 'neon-seraphina', c: '#ff2fd2' },
  { id: 'neon-k9000', c: '#a4ff1c' },
];
const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];
const sheetIdx = process.argv.indexOf('--sheet');
const sheet = sheetIdx > 0 ? process.argv[sheetIdx + 1] : '';

async function loadPlaywright() {
  const tries = [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/npm-tools/node_modules/playwright/index.mjs'].filter(Boolean);
  for (const t of tries) { try { return await import(t); } catch { /* thử tiếp */ } }
  throw new Error('Không tìm thấy playwright. Cài: npm i -g playwright && npx playwright install chromium, hoặc đặt PLAYWRIGHT_MODULE.');
}

const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.html': 'text/html' };
const PAGE = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#333">
<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js"}}</script>
<script type="module">import { renderToken } from '/maps/neon/assets/pets/token-scene.js'; window.renderToken = renderToken; window.ready = true; window.DEBUG = !!new URLSearchParams(location.search).get('debug');</script>`;
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (u === '/__tokens.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  const f = path.join(PUBLIC, u);
  if (!f.startsWith(PUBLIC) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  page.on('console', (m) => { if (m.type() === 'error' || process.env.DEBUG) console.error('[trang]', m.text()); });
  page.on('pageerror', (e) => console.error('[trang]', e.message));
  await page.goto(`http://127.0.0.1:${port}/__tokens.html?debug=${process.env.DEBUG || ''}`);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
  const pngs = [];
  for (const p of CAST) {
    if (only && !p.id.includes(only)) continue;
    const url = await page.evaluate(([id, c]) => window.renderToken(id, c), [p.id, p.c]);
    // nén PNG bảng màu (alpha giữ nguyên) để SVG nhẹ
    const raw = Buffer.from(url.split(',')[1], 'base64');
    const png = await sharp(raw).png({ palette: true, quality: 92, effort: 10, dither: 0.6 }).toBuffer();
    const b64 = png.toString('base64');
    pngs.push(png);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 220 220" width="220" height="220">`
      + `<image width="220" height="220" xlink:href="data:image/png;base64,${b64}" href="data:image/png;base64,${b64}"/></svg>\n`;
    fs.writeFileSync(path.join(OUT, `${p.id}-token.svg`), svg);
    console.log(`${p.id}-token.svg`, (svg.length / 1024).toFixed(0), 'KB');
  }
  if (sheet) {
    const tiles = await Promise.all(pngs.map((b) => sharp(b).resize(440, 440).toBuffer()));
    const bgs = ['#0b1024', '#1a3a4a'];
    const comps = [];
    tiles.forEach((t, i) => bgs.forEach((bg, r) => comps.push({ input: t, left: i * 440, top: r * 440 })));
    const rows = await Promise.all(bgs.map((bg) => sharp({ create: { width: 440 * tiles.length, height: 440, channels: 4, background: bg } }).png().toBuffer()));
    await sharp({ create: { width: 440 * tiles.length, height: 880, channels: 4, background: '#000' } })
      .composite([...rows.map((input, r) => ({ input, left: 0, top: r * 440 })), ...comps]).png().toFile(sheet);
    console.log('contact sheet ->', sheet);
  }
} finally {
  await browser.close();
  server.close();
}

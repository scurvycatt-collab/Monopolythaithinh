import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const OUT = path.join(PUBLIC, 'thumbnails', 'property');
const STATIC_OUT = path.join(PUBLIC, 'thumbnails', 'static');
const MANIFEST = path.join(OUT, 'manifest.json');
const STATIC_MANIFEST = path.join(STATIC_OUT, 'manifest.json');
const VERSION_MODULE = path.join(OUT, 'version.js');
const G = require(path.join(PUBLIC, 'game.js'));
const COLORS = [...new Set([...G.PETS.map((pet) => pet.c.toLowerCase()), '#9aa4b1'])];
const CITY_LEVELS = G.LEVEL_NAMES.map((_, level) => level);
const RESORT_LEVELS = G.CFG.RESORT_TOLL.map((_, level) => level).filter(Boolean);
const colorId = (color) => color.replace('#', '').toLowerCase();
const expected = COLORS.flatMap((color) => [
  ...CITY_LEVELS.map((level) => `city-${colorId(color)}-${level}.png`),
  ...RESORT_LEVELS.map((level) => `resort-${colorId(color)}-${level}.png`),
]).sort();
const PLAYER_COLORS = G.PETS.map((pet) => colorId(pet.c));
const MODEL_COLORS = [...new Set([...PLAYER_COLORS, 'ef5a3c', '8a63e8', 'f7a21b', '2fb5a3', '9aa4b1'])];
const MODEL_TEXTURES = ['suburban', 'commercial'].flatMap((kit) => ['colormap', 'variation-a'].flatMap((source) => MODEL_COLORS.map((color) => `model-${kit}-${source}-${color}.png`)));
const DECOR_TEXTURES = [
  'sign-start-e2557f.png',
  ...PLAYER_COLORS.flatMap((color) => [
    `sign-hotel-${color}.png`, `sign-resort-${color}.png`, `stripe-${color}.png`,
  ]),
];
const staticExpected = [
  ...G.PETS.map((pet) => `pet-${pet.id}.png`),
  ...[1, 2, 3, 4, 5, 6].map((value) => `dice-${value}.png`),
  ...Object.keys(G.GROUPS).map((group) => `ground-pattern-${group}.png`),
  ...MODEL_TEXTURES,
  ...DECOR_TEXTURES,
  'firework-dot.png', 'chance-card.png', `festival-banner-${G.CFG.BONUS_MULT}.png`, 'championship-plaque-near.png', 'championship-plaque-far.png',
  'world-ground.png', 'water-horizontal.png', 'water-vertical.png',
  'balloon-ef5a3c-ffd23a.png', 'balloon-2c8ff0-ffffff.png', 'balloon-8a63e8-7fe3d2.png',
].sort();
const sourceFiles = [
  'public/js/houses.js', 'public/js/specials.js', 'public/js/world.js', 'public/models/bundle.json',
  ...Object.values(G.GROUPS).map((group) => `public/patterns/pattern_${group.pattern}.png`),
  ...['suburban', 'commercial'].flatMap((kit) => ['colormap', 'variation-a'].map((name) => `public/models/${kit}/Textures/${name}.png`)),
];
const sourceHash = () => {
  const hash = crypto.createHash('sha256');
  // Chuẩn hoá CRLF → LF cho file văn bản để hash giống nhau trên Windows (autocrlf) và CI.
  const read = (file) => { const buf = fs.readFileSync(path.join(ROOT, file)); return /\.(js|json)$/.test(file) ? Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n')) : buf; };
  sourceFiles.forEach((file) => hash.update(file).update(read(file)));
  hash.update(JSON.stringify({ colors: COLORS, cityLevels: CITY_LEVELS, resortLevels: RESORT_LEVELS }));
  return hash.digest('hex');
};

function check() {
  assert.ok(fs.existsSync(MANIFEST), 'Thiếu thumbnail manifest. Chạy: npm run thumbnails');
  assert.ok(fs.existsSync(STATIC_MANIFEST), 'Thiếu manifest asset tĩnh. Chạy: npm run thumbnails');
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const staticManifest = JSON.parse(fs.readFileSync(STATIC_MANIFEST, 'utf8'));
  assert.equal(manifest.sourceHash, sourceHash(), 'Model/màu/cấp nhà đã đổi. Chạy lại: npm run thumbnails');
  assert.deepEqual(manifest.files, expected, 'Danh sách thumbnail không khớp màu/cấp công trình hiện tại');
  assert.equal(staticManifest.sourceHash, sourceHash(), 'Asset tĩnh đã cũ. Chạy lại: npm run thumbnails');
  assert.deepEqual(staticManifest.files, staticExpected, 'Danh sách asset tĩnh không còn khớp cấu hình hiện tại');
  assert.equal(fs.readFileSync(VERSION_MODULE, 'utf8'), `export const PROPERTY_THUMBNAIL_VERSION = '${manifest.sourceHash}';\n`, 'Phiên bản cache thumbnail bị thiếu hoặc đã cũ. Chạy lại: npm run thumbnails');
  expected.forEach((file) => assert.ok(fs.existsSync(path.join(OUT, file)) && fs.statSync(path.join(OUT, file)).size > 500, `Thiếu thumbnail hợp lệ: ${file}`));
  staticExpected.forEach((file) => assert.ok(fs.existsSync(path.join(STATIC_OUT, file)) && fs.statSync(path.join(STATIC_OUT, file)).size > 100, `Thiếu asset tĩnh hợp lệ: ${file}`));
  console.log(`OK ${expected.length} thumbnail công trình và ${staticExpected.length} asset tĩnh đã được tạo sẵn`);
}

const generatorHtml = `<!doctype html><meta charset="utf-8">
<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/vendor/three/addons/"}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadKit, building } from '/js/houses.js';
import { beachHouse, fireworkDotCanvas, chanceCardCanvas, festivalBannerCanvas, festivalPlaqueCanvas } from '/js/specials.js';
import { worldGroundCanvas, worldWaterCanvas, balloonStripeCanvas } from '/js/world.js';
const bundle = await (await fetch('/models/bundle.json')).json();
await loadKit('/models', null, bundle, false);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(220, 220); renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight(0xffffff, 0xb0c0d0, 1.5));
const light = new THREE.DirectionalLight(0xffffff, 1.4); light.position.set(3, 5, 4); scene.add(light);
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
function capture(obj) {
  scene.add(obj); obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) * 0.78;
  Object.assign(camera, { left: -radius, right: radius, top: radius, bottom: -radius });
  camera.position.set(center.x + 6, center.y + 4.5, center.z + 6); camera.lookAt(center); camera.updateProjectionMatrix();
  renderer.clear(); renderer.render(scene, camera);
  const data = renderer.domElement.toDataURL('image/png').split(',')[1]; scene.remove(obj); return data;
}
const canvasData = (canvas) => canvas.toDataURL('image/png').split(',')[1];
const loadImage = (src) => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });
function recolorImage(image, hex) {
  const cv = document.createElement('canvas'); cv.width = image.width; cv.height = image.height;
  const c = cv.getContext('2d'); c.drawImage(image, 0, 0); const d = c.getImageData(0, 0, cv.width, cv.height), px = d.data;
  const tgt = new THREE.Color(hex), th = {}; tgt.getHSL(th); const col = new THREE.Color(), hsl = {};
  for (let p = 0; p < px.length; p += 4) {
    col.setRGB(px[p] / 255, px[p + 1] / 255, px[p + 2] / 255); col.getHSL(hsl);
    const green = hsl.s > 0.25 && hsl.h > 0.3 && hsl.h < 0.55, orange = hsl.s > 0.35 && hsl.h > 0.02 && hsl.h < 0.14;
    if (hsl.s < 0.3 && hsl.l > 0.78) { px[p] = px[p + 1] = px[p + 2] = 255; continue; }
    if (green || orange) { const l = Math.min(0.8, hsl.l * 0.5 + th.l * 0.55); col.setHSL(th.h, Math.min(1, th.s * 0.92), l); px[p] = col.r * 255; px[p + 1] = col.g * 255; px[p + 2] = col.b * 255; }
  }
  c.putImageData(d, 0, 0); return cv;
}
function diceCanvas(value) {
  const pips = ${JSON.stringify({ 1: [[.5, .5]], 2: [[.27, .27], [.73, .73]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]], 5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]], 6: [[.28, .22], [.72, .22], [.28, .5], [.72, .5], [.28, .78], [.72, .78]] })};
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, 128, 128);
  pips[value].forEach(([x, y]) => { c.fillStyle = value === 1 ? '#ec3f78' : '#26364a'; c.beginPath(); c.arc(x * 128, y * 128, value === 1 ? 17 : 12, 0, 7); c.fill(); }); return cv;
}
function signCanvas(text, bg, ratio) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.round(512 * ratio); const c = cv.getContext('2d');
  c.fillStyle = bg; c.fillRect(0, 0, cv.width, cv.height); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = Math.max(4, cv.height * .05); c.strokeRect(c.lineWidth, c.lineWidth, cv.width - 2 * c.lineWidth, cv.height - 2 * c.lineWidth);
  let fs = cv.height * .66; c.font = '900 ' + fs + "px Rubik, 'Be Vietnam Pro', sans-serif"; while (c.measureText(text).width > cv.width * .84 && fs > 10) { fs -= 2; c.font = '900 ' + fs + "px Rubik, 'Be Vietnam Pro', sans-serif"; }
  c.fillStyle = 'rgba(0,0,0,.22)'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, cv.width / 2 + 3, cv.height / 2 + 5); c.fillStyle = '#fff'; c.fillText(text, cv.width / 2, cv.height / 2 + 2); return cv;
}
function stripeCanvas(hex) { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 8; const c = cv.getContext('2d'); for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? '#fff8ee' : hex; c.fillRect(k * 16, 0, 16, 8); } return cv; }
async function petModel(id) {
  const gltf = await new Promise((resolve, reject) => new GLTFLoader().parse(Uint8Array.from(atob(bundle['pets/' + id]), (c) => c.charCodeAt(0)).buffer, '/models/pets/', resolve, reject));
  const obj = gltf.scene, box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), scale = 1 / Math.max(size.x, size.z);
  obj.scale.setScalar(scale); const fitted = new THREE.Box3().setFromObject(obj), center = fitted.getCenter(new THREE.Vector3()); obj.position.set(-center.x, -fitted.min.y, -center.z); const wrap = new THREE.Group(); wrap.add(obj); return wrap;
}
async function staticAssets() {
  const result = [];
  for (const pet of ${JSON.stringify(G.PETS)}) result.push({ file: 'pet-' + pet.id + '.png', data: capture(await petModel(pet.id)) });
  for (let value = 1; value <= 6; value++) result.push({ file: 'dice-' + value + '.png', data: canvasData(diceCanvas(value)) });
  for (const [group, cfg] of Object.entries(${JSON.stringify(G.GROUPS)})) {
    const image = await loadImage('/patterns/pattern_' + cfg.pattern + '.png'), cv = document.createElement('canvas'); cv.width = cv.height = image.width; const c = cv.getContext('2d');
    c.drawImage(image, 0, 0); const d = c.getImageData(0, 0, cv.width, cv.height), px = d.data; let sum = 0; for (let k = 0; k < px.length; k += 4) sum += px[k]; const inv = sum / (px.length / 4) < 128;
    const n = parseInt(cfg.ground.slice(1), 16), light = [n >> 16, (n >> 8) & 255, n & 255], dark = light.map((v) => Math.round(v * .86));
    for (let k = 0; k < px.length; k += 4) { let t = px[k] / 255; if (inv) t = 1 - t; for (let j = 0; j < 3; j++) px[k + j] = Math.round(dark[j] + (light[j] - dark[j]) * t); px[k + 3] = 255; }
    c.putImageData(d, 0, 0); result.push({ file: 'ground-pattern-' + group + '.png', data: canvasData(cv) });
  }
  for (const kit of ['suburban', 'commercial']) for (const source of ['colormap', 'variation-a']) {
    const image = await loadImage('/models/' + kit + '/Textures/' + source + '.png');
    for (const color of ${JSON.stringify(MODEL_COLORS.map((color) => '#' + color))}) result.push({ file: 'model-' + kit + '-' + source + '-' + color.slice(1).toLowerCase() + '.png', data: canvasData(recolorImage(image, color)) });
  }
  result.push({ file: 'sign-start-e2557f.png', data: canvasData(signCanvas('START', '#e2557f', .2 / .8)) });
  for (const color of ${JSON.stringify(G.PETS.map((pet) => pet.c))}) {
    const id = color.slice(1).toLowerCase();
    result.push({ file: 'sign-hotel-' + id + '.png', data: canvasData(signCanvas('HOTEL', color, .36 / 1.1)) });
    result.push({ file: 'sign-resort-' + id + '.png', data: canvasData(signCanvas('RESORT', color, .16 / .62)) });
    result.push({ file: 'stripe-' + id + '.png', data: canvasData(stripeCanvas(color)) });
  }
  result.push({ file: 'firework-dot.png', data: canvasData(fireworkDotCanvas()) });
  result.push({ file: 'chance-card.png', data: canvasData(chanceCardCanvas()) });
  result.push({ file: 'festival-banner-${G.CFG.BONUS_MULT}.png', data: canvasData(festivalBannerCanvas(${G.CFG.BONUS_MULT})) });
  result.push({ file: 'championship-plaque-near.png', data: canvasData(festivalPlaqueCanvas(1.56, .44)) });
  result.push({ file: 'championship-plaque-far.png', data: canvasData(festivalPlaqueCanvas(1.56, .28)) });
  result.push({ file: 'world-ground.png', data: canvasData(worldGroundCanvas()) });
  result.push({ file: 'water-horizontal.png', data: canvasData(worldWaterCanvas(false)) }, { file: 'water-vertical.png', data: canvasData(worldWaterCanvas(true)) });
  for (const [a, b] of [['#ef5a3c', '#ffd23a'], ['#2c8ff0', '#ffffff'], ['#8a63e8', '#7fe3d2']]) result.push({ file: 'balloon-' + a.slice(1) + '-' + b.slice(1) + '.png', data: canvasData(balloonStripeCanvas(a, b)) });
  return result;
}
window.__generatePropertyThumbnails = async () => {
  const colors = ${JSON.stringify(COLORS)}, cityLevels = ${JSON.stringify(CITY_LEVELS)}, resortLevels = ${JSON.stringify(RESORT_LEVELS)}, result = [], statics = await staticAssets();
  for (const color of colors) {
    const id = color.slice(1).toLowerCase();
    for (const level of cityLevels) result.push({ file: 'city-' + id + '-' + level + '.png', data: capture(building('suburb', level, color)) });
    for (const level of resortLevels) result.push({ file: 'resort-' + id + '-' + level + '.png', data: capture(beachHouse(level, color)) });
  }
  renderer.dispose(); renderer.forceContextLoss(); return { properties: result, statics };
};
window.__thumbReady = true;
</script>`;

const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/__thumbgen') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(generatorHtml); }
    const file = path.resolve(PUBLIC, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(PUBLIC + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(test, message, tries = 150) {
  for (let i = 0; i < tries; i++) { const value = await test().catch(() => null); if (value) return value; await sleep(100); }
  throw new Error(message);
}
function chromePath() {
  const candidates = [process.env.CHROME_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'];
  const found = candidates.find((file) => file && fs.existsSync(file));
  if (!found) throw new Error('Không tìm thấy Chrome. Đặt biến CHROME_PATH rồi chạy lại.');
  return found;
}

async function generate() {
  if (typeof WebSocket === 'undefined') throw new Error('Lệnh tạo thumbnail cần Node.js 22 trở lên.');
  const server = await startServer();
  const address = server.address();
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ttm-thumbnails-'));
  const chrome = spawn(chromePath(), ['--headless=new', '--no-first-run', '--no-default-browser-check', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--remote-debugging-port=0', `--user-data-dir=${temp}`, `http://127.0.0.1:${address.port}/__thumbgen`], { stdio: 'ignore', windowsHide: true });
  let socket;
  try {
    const activePort = path.join(temp, 'DevToolsActivePort');
    const port = await waitFor(async () => fs.existsSync(activePort) && Number(fs.readFileSync(activePort, 'utf8').split(/\r?\n/)[0]), 'Chrome không mở cổng điều khiển');
    const page = await waitFor(async () => (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((item) => item.type === 'page' && item.url.includes('/__thumbgen')), 'Không tìm thấy trang tạo thumbnail');
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    let seq = 0; const pending = new Map();
    socket.addEventListener('message', (event) => { const msg = JSON.parse(event.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result); } });
    const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
    await send('Runtime.enable');
    await waitFor(async () => (await send('Runtime.evaluate', { expression: 'window.__thumbReady === true', returnByValue: true })).result.value, 'Model 3D tải quá lâu', 300);
    const evaluated = await send('Runtime.evaluate', { expression: 'window.__generatePropertyThumbnails()', awaitPromise: true, returnByValue: true });
    if (evaluated.exceptionDetails) throw new Error(evaluated.exceptionDetails.text || 'Trang tạo thumbnail bị lỗi');
    const images = evaluated.result.value;
    assert.equal(images.properties.length, expected.length, 'Số thumbnail trình duyệt tạo ra không đúng');
    assert.equal(images.statics.length, staticExpected.length, 'Số asset tĩnh trình duyệt tạo ra không đúng');
    fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(STATIC_OUT, { recursive: true });
    images.properties.forEach(({ file, data }) => { assert.ok(expected.includes(file)); fs.writeFileSync(path.join(OUT, file), Buffer.from(data, 'base64')); });
    images.statics.forEach(({ file, data }) => { assert.ok(staticExpected.includes(file)); fs.writeFileSync(path.join(STATIC_OUT, file), Buffer.from(data, 'base64')); });
    const runtimeCheck = await send('Runtime.evaluate', {
      expression: `(async () => { try { const m = await import('/js/houses.js'), s = await import('/js/specials.js'); const b = await (await fetch('/models/bundle.json')).json(); await m.loadKit('/models', null, b, true); await s.preloadSpecialAssets(${G.CFG.BONUS_MULT}); return m.building('suburb', 4, '#2c8ff0').children.length > 0 && s.chanceBox().children.length > 0 && s.festivalFlag(${G.CFG.BONUS_MULT}).children.length > 0 && s.festivalPlaque(1.56, .44).children.length > 0; } catch (e) { return { error: String(e), src: e && e.target && e.target.src }; } })()`,
      awaitPromise: true, returnByValue: true,
    });
    assert.equal(runtimeCheck.result.value, true, `Texture sinh sẵn không chạy được ở runtime: ${JSON.stringify(runtimeCheck.result.value)}`);
    const generatedHash = sourceHash();
    fs.writeFileSync(MANIFEST, JSON.stringify({ version: 1, sourceHash: generatedHash, sources: sourceFiles, colors: COLORS, cityLevels: CITY_LEVELS, resortLevels: RESORT_LEVELS, files: expected }, null, 2) + '\n');
    fs.writeFileSync(STATIC_MANIFEST, JSON.stringify({ version: 1, sourceHash: generatedHash, sources: sourceFiles, files: staticExpected }, null, 2) + '\n');
    fs.writeFileSync(VERSION_MODULE, `export const PROPERTY_THUMBNAIL_VERSION = '${generatedHash}';\n`);
    console.log(`Đã tạo ${images.properties.length} thumbnail công trình và ${images.statics.length} asset tĩnh`);
  } finally {
    try { socket?.close(); } catch { /* noop */ }
    if (chrome.exitCode === null) {
      const exited = new Promise((resolve) => chrome.once('exit', resolve));
      chrome.kill(); await Promise.race([exited, sleep(2000)]);
    }
    await new Promise((resolve) => server.close(resolve));
    const safeTemp = path.resolve(temp), tempRoot = path.resolve(os.tmpdir()) + path.sep;
    if (safeTemp.startsWith(tempRoot)) try { fs.rmSync(safeTemp, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch (e) { console.warn(`Không dọn được Chrome temp ${safeTemp}: ${e.message}`); }
  }
  check();
}

if (process.argv.includes('--check')) check();
else await generate();

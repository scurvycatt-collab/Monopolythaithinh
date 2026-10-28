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
const MANIFEST = path.join(OUT, 'manifest.json');
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
const sourceFiles = ['public/js/houses.js', 'public/js/specials.js', 'public/models/bundle.json'];
const sourceHash = () => {
  const hash = crypto.createHash('sha256');
  sourceFiles.forEach((file) => hash.update(file).update(fs.readFileSync(path.join(ROOT, file))));
  hash.update(JSON.stringify({ colors: COLORS, cityLevels: CITY_LEVELS, resortLevels: RESORT_LEVELS }));
  return hash.digest('hex');
};

function check() {
  assert.ok(fs.existsSync(MANIFEST), 'Thiếu thumbnail manifest. Chạy: npm run thumbnails');
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  assert.equal(manifest.sourceHash, sourceHash(), 'Model/màu/cấp nhà đã đổi. Chạy lại: npm run thumbnails');
  assert.deepEqual(manifest.files, expected, 'Danh sách thumbnail không khớp màu/cấp công trình hiện tại');
  assert.equal(fs.readFileSync(VERSION_MODULE, 'utf8'), `export const PROPERTY_THUMBNAIL_VERSION = '${manifest.sourceHash}';\n`, 'Phiên bản cache thumbnail bị thiếu hoặc đã cũ. Chạy lại: npm run thumbnails');
  expected.forEach((file) => assert.ok(fs.existsSync(path.join(OUT, file)) && fs.statSync(path.join(OUT, file)).size > 500, `Thiếu thumbnail hợp lệ: ${file}`));
  console.log(`OK ${expected.length} thumbnail công trình đã được tạo sẵn và còn đồng bộ`);
}

const generatorHtml = `<!doctype html><meta charset="utf-8">
<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/vendor/three/addons/"}}</script>
<script type="module">
import * as THREE from 'three';
import { loadKit, building } from '/js/houses.js';
import { beachHouse } from '/js/specials.js';
const bundle = await (await fetch('/models/bundle.json')).json();
await loadKit('/models', null, bundle);
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
window.__generatePropertyThumbnails = async () => {
  const colors = ${JSON.stringify(COLORS)}, cityLevels = ${JSON.stringify(CITY_LEVELS)}, resortLevels = ${JSON.stringify(RESORT_LEVELS)}, result = [];
  for (const color of colors) {
    const id = color.slice(1).toLowerCase();
    for (const level of cityLevels) result.push({ file: 'city-' + id + '-' + level + '.png', data: capture(building('suburb', level, color)) });
    for (const level of resortLevels) result.push({ file: 'resort-' + id + '-' + level + '.png', data: capture(beachHouse(level, color)) });
  }
  renderer.dispose(); renderer.forceContextLoss(); return result;
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
    assert.equal(images.length, expected.length, 'Số thumbnail trình duyệt tạo ra không đúng');
    fs.mkdirSync(OUT, { recursive: true });
    images.forEach(({ file, data }) => { assert.ok(expected.includes(file)); fs.writeFileSync(path.join(OUT, file), Buffer.from(data, 'base64')); });
    const generatedHash = sourceHash();
    fs.writeFileSync(MANIFEST, JSON.stringify({ version: 1, sourceHash: generatedHash, sources: sourceFiles, colors: COLORS, cityLevels: CITY_LEVELS, resortLevels: RESORT_LEVELS, files: expected }, null, 2) + '\n');
    fs.writeFileSync(VERSION_MODULE, `export const PROPERTY_THUMBNAIL_VERSION = '${generatedHash}';\n`);
    console.log(`Đã tạo ${images.length} thumbnail công trình tại ${path.relative(ROOT, OUT)}`);
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

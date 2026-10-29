import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const [url, target] = process.argv.slice(2);
const checkRoll = process.argv.includes('--roll');
const canvasOnly = process.argv.includes('--canvas');
if (!url || !target) throw new Error('Dùng: node scripts/capture-map-review.mjs <url> <file.png>');
const browser = process.env.BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9329;
const profile = path.resolve(`.qa-cdp-profile-${process.pid}`);
const proc = spawn(browser, [`--remote-debugging-port=${port}`, '--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${profile}`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function endpoint() {
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) return r.json(); } catch { /* chờ browser */ }
    await delay(250);
  }
  throw new Error('Không mở được CDP browser');
}

try {
  await endpoint();
  const created = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }).then((r) => r.json());
  const ws = new WebSocket(created.webSocketDebuggerUrl); await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0; const pending = new Map();
  ws.onmessage = ({ data }) => { const msg = JSON.parse(data); if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result); } };
  const call = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })); });
  await call('Page.enable'); await call('Runtime.enable'); await call('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url }); await delay(3500);
  const beforeRoom = await call('Runtime.evaluate', { expression: `({screen:document.body.dataset.screen,count:performance.getEntriesByType('resource').filter((e)=>e.name.includes('/thumbnails/property/')||e.name.includes('/maps/ben-10/assets/buildings/')||e.name.includes('/maps/ben-10-02/assets/buildings/')).length})`, returnByValue: true });
  await call('Runtime.evaluate', { expression: `document.querySelector('#lwatch')?.click()` });
  await delay(2500);
  // Link xem có thể mở qua hai lớp: chọn phòng rồi xác nhận "Chỉ xem" ở lobby.
  await call('Runtime.evaluate', { expression: `document.querySelector('#lwatch')?.click()` });
  await delay(3000);
  let rollMs = null;
  if (checkRoll) {
    const rolled = await call('Runtime.evaluate', { expression: `(async()=>{const t=performance.now();await window.__TT.board.rollDice(2,5);return Math.round(performance.now()-t)})()`, awaitPromise: true, returnByValue: true });
    rollMs = rolled.result.value;
  }
  const errors = await call('Runtime.evaluate', { expression: `({screen:document.body.dataset.screen,map:document.body.dataset.map,loading:!document.querySelector('#loading').classList.contains('hidden'),perf:window.__TT&&window.__TT.perf,thumbnailAssets:performance.getEntriesByType('resource').filter((e)=>e.name.includes('/thumbnails/property/')||e.name.includes('/maps/ben-10/assets/buildings/')||e.name.includes('/maps/ben-10-02/assets/buildings/')).length})`, returnByValue: true });
  let shot;
  if (canvasOnly) {
    const rendered = await call('Runtime.evaluate', { expression: `document.querySelector('#stage canvas')?.toDataURL('image/png').split(',')[1] || ''`, returnByValue: true });
    shot = { data: rendered.result.value };
  } else shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  if (!shot.data) throw new Error('Không lấy được ảnh canvas bản đồ.');
  fs.mkdirSync(path.dirname(path.resolve(target)), { recursive: true }); fs.writeFileSync(target, Buffer.from(shot.data, 'base64'));
  const homeThumbnailAssets = beforeRoom.result.value && beforeRoom.result.value.screen === 'gate' ? beforeRoom.result.value.count : null;
  console.log(JSON.stringify({ ...errors.result.value, homeThumbnailAssets, rollMs })); console.log(path.resolve(target)); ws.close();
} finally {
  proc.kill();
}

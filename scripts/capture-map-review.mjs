import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import WebSocket from 'ws';

const [url, target] = process.argv.slice(2);
const checkRoll = process.argv.includes('--roll');
const canvasOnly = process.argv.includes('--canvas');
const roomCode = (process.argv.find((arg) => arg.startsWith('--room=')) || '').split('=')[1] || 'qa-room';
if (!url || !target) throw new Error('Dùng: node scripts/capture-map-review.mjs <url> <file.png>');

const browser = process.env.BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
let port = 0;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ttm-map-review-'));
const proc = spawn(browser, ['--remote-debugging-port=0', '--remote-allow-origins=*', '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--no-first-run', `--user-data-dir=${profile}`, '--window-size=1600,1000', url], { stdio: 'ignore' });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function stopBrowserAndCleanProfile() {
  if (proc.exitCode === null) {
    proc.kill();
    await Promise.race([new Promise((resolve) => proc.once('exit', resolve)), delay(3000)]);
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 2, retryDelay: 150 });
      return;
    } catch (error) {
      if (attempt === 7) throw error;
      await delay(250);
    }
  }
}

async function endpoint() {
  const active = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 80; i++) {
    try {
      if (!port && fs.existsSync(active)) port = Number(fs.readFileSync(active, 'utf8').split(/\r?\n/)[0]);
      if (port) {
        const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        const page = pages.find((item) => item.type === 'page');
        if (page) return page;
      }
    } catch { /* chờ browser */ }
    await delay(250);
  }
  throw new Error('Không mở được CDP browser');
}

try {
  const created = await endpoint();
  const ws = new WebSocket(created.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  let id = 0;
  const pending = new Map();
  const notices = [];
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.method === 'Runtime.exceptionThrown') notices.push(msg.params?.exceptionDetails?.exception?.description || msg.params?.exceptionDetails?.text);
    if (msg.id && pending.has(msg.id)) {
      const item = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? item.reject(new Error(`${item.method}: ${msg.error.message}`)) : item.resolve(msg.result);
    }
  });
  ws.on('close', () => { for (const item of pending.values()) item.reject(new Error(`CDP WebSocket đóng khi gọi ${item.method}`)); pending.clear(); });
  ws.on('error', () => { for (const item of pending.values()) item.reject(new Error(`Lỗi CDP WebSocket khi gọi ${item.method}`)); pending.clear(); });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id; pending.set(requestId, { resolve, reject, method });
    ws.send(JSON.stringify({ id: requestId, method, params }));
  });

  await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable');
  await call('Network.setBlockedURLs', { urls: ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*'] });
  await call('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url }); await delay(5000);
  const beforeRoom = await call('Runtime.evaluate', { expression: `({screen:document.body.dataset.screen,count:performance.getEntriesByType('resource').filter((e)=>e.name.includes('/thumbnails/property/')).length})`, returnByValue: true });
  await call('Runtime.evaluate', { expression: `(()=>{const n=document.querySelector('#gname'),r=document.querySelector('#groom');if(n)n.value='QA Viewer';if(r)r.value=${JSON.stringify(roomCode)};document.querySelector('#gwatch')?.click()})()` });
  await delay(2500);
  await call('Runtime.evaluate', { expression: `document.querySelector('#lwatch')?.click()` });
  await delay(3000);

  let rollMs = null;
  if (checkRoll) {
    const rolled = await call('Runtime.evaluate', { expression: `(async()=>{const t=performance.now();await window.__TT.board.rollDice(2,5);return Math.round(performance.now()-t)})()`, awaitPromise: true, returnByValue: true });
    rollMs = rolled.result.value;
  }
  const status = await call('Runtime.evaluate', { expression: `({screen:document.body.dataset.screen,map:document.body.dataset.map,ready:document.readyState,tt:!!window.__TT,loading:!document.querySelector('#loading').classList.contains('hidden'),loadmsg:document.querySelector('#loadmsg')?.textContent,perf:window.__TT&&window.__TT.perf,resources:performance.getEntriesByType('resource').map((e)=>e.name).filter((n)=>/app\.js|rules\.js|game\.js/.test(n)),thumbnailAssets:performance.getEntriesByType('resource').filter((e)=>e.name.includes('/thumbnails/property/')).length})`, returnByValue: true });
  let shot;
  if (canvasOnly) {
    const rendered = await call('Runtime.evaluate', { expression: `document.querySelector('#stage canvas')?.toDataURL('image/png').split(',')[1] || ''`, returnByValue: true });
    shot = { data: rendered.result.value };
  } else {
    shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  }
  if (!shot.data) throw new Error(`Không lấy được ảnh canvas bản đồ: ${JSON.stringify(status.result.value)}; ${notices.join(' | ')}`);
  fs.mkdirSync(path.dirname(path.resolve(target)), { recursive: true });
  fs.writeFileSync(target, Buffer.from(shot.data, 'base64'));
  const homeThumbnailAssets = beforeRoom.result.value?.screen === 'gate' ? beforeRoom.result.value.count : null;
  console.log(JSON.stringify({ ...status.result.value, homeThumbnailAssets, rollMs }));
  console.log(path.resolve(target));
  ws.close();
} finally {
  await stopBrowserAndCleanProfile();
}

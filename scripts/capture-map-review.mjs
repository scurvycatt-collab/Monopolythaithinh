import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import WebSocket from 'ws';

const [url, target] = process.argv.slice(2);
const checkRoll = process.argv.includes('--roll');
const canvasOnly = process.argv.includes('--canvas');
const checkStateAssets = process.argv.includes('--state-assets');
const buildingSet = (process.argv.find((arg) => arg.startsWith('--building-set=')) || '').split('=')[1] || '';
const roomCode = (process.argv.find((arg) => arg.startsWith('--room=')) || '').split('=')[1] || 'qa-room';
const resortLevelArg = (process.argv.find((arg) => arg.startsWith('--resort-level=')) || '').split('=')[1];
const resortLevel = resortLevelArg === undefined ? null : Math.max(0, Math.min(4, Number(resortLevelArg) || 0));
const checkTokenSet = process.argv.includes('--token-set');
if (!url || !target) throw new Error('Dùng: node scripts/capture-map-review.mjs <url> <file.png>');
const browser = process.env.BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
// Chrome tự cấp cổng CDP và ghi vào profile riêng; tránh xung đột khi nhiều batch QA chạy song song.
let port = 0;
// Profile trình duyệt là dữ liệu QA tạm, không phải asset của dự án. Luôn đặt nó
// trong temp của hệ điều hành và xoá khi kết thúc để không làm bẩn workspace.
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ttm-map-review-'));
const proc = spawn(browser, ['--remote-debugging-port=0', '--remote-allow-origins=*', '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--no-first-run', `--user-data-dir=${profile}`, '--window-size=1600,1000', url], { stdio: 'ignore' });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function stopBrowserAndCleanProfile() {
  if (proc.exitCode === null) {
    proc.kill();
    await Promise.race([
      new Promise((resolve) => proc.once('exit', resolve)),
      delay(3000),
    ]);
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
      if (port) { const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const page = pages.find((item) => item.type === 'page'); if (page) return page; }
    } catch { /* chờ browser */ }
    await delay(250);
  }
  throw new Error('Không mở được CDP browser');
}

try {
  const created = await endpoint();
  const ws = new WebSocket(created.webSocketDebuggerUrl); await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  let id = 0; const pending = new Map(), notices = [];
  ws.on('message', (data) => { const msg = JSON.parse(data.toString()); if (msg.method === 'Runtime.exceptionThrown') notices.push(msg.params?.exceptionDetails?.exception?.description || msg.params?.exceptionDetails?.text); if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.reject(new Error(`${p.method}: ${msg.error.message}`)) : p.resolve(msg.result); } });
  ws.on('close', () => { for (const p of pending.values()) p.reject(new Error(`CDP WebSocket đóng khi gọi ${p.method}`)); pending.clear(); });
  ws.on('error', () => { for (const p of pending.values()) p.reject(new Error(`Lỗi CDP WebSocket khi gọi ${p.method}`)); pending.clear(); });
  const call = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject, method }); ws.send(JSON.stringify({ id: n, method, params })); });
  await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable');
  await call('Network.setBlockedURLs', { urls: ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*'] });
  await call('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url }); await delay(5000);
  const beforeRoom = await call('Runtime.evaluate', { expression: `({screen:document.body.dataset.screen,count:performance.getEntriesByType('resource').filter((e)=>e.name.includes('/thumbnails/property/')||e.name.includes('/maps/ben-10/assets/buildings/')||e.name.includes('/maps/ben-10-02/assets/buildings/')).length})`, returnByValue: true });
  await call('Runtime.evaluate', { expression: `(()=>{const n=document.querySelector('#gname'),r=document.querySelector('#groom');if(n)n.value='QA Viewer';if(r)r.value=${JSON.stringify(roomCode)};document.querySelector('#gwatch')?.click()})()` });
  await delay(2500);
  // Link xem có thể mở qua hai lớp: chọn phòng rồi xác nhận "Chỉ xem" ở lobby.
  await call('Runtime.evaluate', { expression: `document.querySelector('#lwatch')?.click()` });
  await delay(3000);
  let stateAssetLoad = null;
  if (checkStateAssets) {
    const loaded = await call('Runtime.evaluate', { expression: `(async()=>{const match=(e)=>/m[34]-special-(festival|outage)\\.webp/.test(e.name);const before=performance.getEntriesByType('resource').filter(match).map((e)=>e.name);const v=structuredClone(window.__TT.S);v.bonus=[1];v.outage={...(v.outage||{}),2:Number(v.round||0)+2};await window.__TT.board.sync(v);await new Promise((r)=>setTimeout(r,500));const after=performance.getEntriesByType('resource').filter(match).map((e)=>e.name);return {before,after};})()`, awaitPromise: true, returnByValue: true });
    stateAssetLoad = loaded.result.value;
  }
  let buildingAssetLoad = null;
  if (buildingSet) {
    const loaded = await call('Runtime.evaluate', { expression: `(async()=>{const match=(e)=>/m[34]-building-/.test(e.name);const before=performance.getEntriesByType('resource').filter(match).map((e)=>e.name);const v=structuredClone(window.__TT.S);const p=(v.players&&v.players[0])||{id:'qa-owner',name:'QA Owner',money:5000000};p.pet=${JSON.stringify(buildingSet)};v.players=[p,...(v.players||[]).filter((x)=>x.id!==p.id)];v.props={...(v.props||{})};[1,2,3,5,6].forEach((tile,level)=>{v.props[tile]={owner:p.id,level};});await window.__TT.board.sync(v);await new Promise((r)=>setTimeout(r,500));const after=performance.getEntriesByType('resource').filter(match).map((e)=>e.name);return {before,after};})()`, awaitPromise: true, returnByValue: true });
    buildingAssetLoad = loaded.result.value;
  }
  let resortAssetLoad = null;
  if (resortLevel !== null) {
    const loaded = await call('Runtime.evaluate', { expression: `(async()=>{const match=(e)=>/m[34]-resort-/.test(e.name);const before=performance.getEntriesByType('resource').filter(match).map((e)=>e.name);const v=structuredClone(window.__TT.S);const isM4=v.settings?.mapId==='ben-10-02';const p=(v.players&&v.players[0])||{id:'qa-resort-owner',name:'QA Resort Owner',money:5000000,pet:isM4?'ben10-02-ben':'ben10-ben'};p.pet=isM4?'ben10-02-ben':'ben10-ben';v.players=[p,...(v.players||[]).filter((x)=>x.id!==p.id)];v.props={...(v.props||{})};[4,14,18,25].forEach((tile,index)=>{if(index<${resortLevel})v.props[tile]={owner:p.id,level:0};else delete v.props[tile];});await window.__TT.board.sync(v);await new Promise((r)=>setTimeout(r,500));const after=performance.getEntriesByType('resource').filter(match).map((e)=>e.name);return {before,after};})()`, awaitPromise: true, returnByValue: true });
    resortAssetLoad = loaded.result.value;
  }
  let tokenAssetLoad = null;
  if (checkTokenSet) {
    const loaded = await call('Runtime.evaluate', { expression: `(async()=>{const match=(e)=>/m[34]-token-(ben|gwen|kevin|max|rook)\.webp/.test(e.name);const before=performance.getEntriesByType('resource').filter(match).map((e)=>e.name);const v=structuredClone(window.__TT.S);const m4=v.settings?.mapId==='ben-10-02';v.players=m4?[{id:'qa-ben',name:'Ben QA',pet:'ben10-02-ben',color:'#62e642',pos:0,money:2000000},{id:'qa-gwen',name:'Gwen QA',pet:'ben10-02-gwen',color:'#42b8ef',pos:8,money:2000000},{id:'qa-kevin',name:'Kevin QA',pet:'ben10-02-kevin',color:'#8b64d8',pos:16,money:2000000},{id:'qa-rook',name:'Rook QA',pet:'ben10-02-rook',color:'#38d79b',pos:24,money:2000000}]:[{id:'qa-ben',name:'Ben QA',pet:'ben10-ben',color:'#70c83d',pos:0,money:2000000},{id:'qa-gwen',name:'Gwen QA',pet:'ben10-gwen',color:'#e653a2',pos:8,money:2000000},{id:'qa-kevin',name:'Kevin QA',pet:'ben10-kevin',color:'#f27a24',pos:16,money:2000000},{id:'qa-max',name:'Max QA',pet:'ben10-max',color:'#27c8e8',pos:24,money:2000000}];v.turn=0;await window.__TT.board.sync(v);await new Promise((r)=>setTimeout(r,700));const after=performance.getEntriesByType('resource').filter(match).map((e)=>e.name);return {before,after};})()`, awaitPromise: true, returnByValue: true });
    tokenAssetLoad = loaded.result.value;
  }
  let rollMs = null;
  if (checkRoll) {
    const rolled = await call('Runtime.evaluate', { expression: `(async()=>{const t=performance.now();await window.__TT.board.rollDice(2,5);return Math.round(performance.now()-t)})()`, awaitPromise: true, returnByValue: true });
    rollMs = rolled.result.value;
  }
  const errors = await call('Runtime.evaluate', { expression: `({screen:document.body.dataset.screen,map:document.body.dataset.map,ready:document.readyState,tt:!!window.__TT,loading:!document.querySelector('#loading').classList.contains('hidden'),loadmsg:document.querySelector('#loadmsg')?.textContent,perf:window.__TT&&window.__TT.perf,resources:performance.getEntriesByType('resource').map((e)=>e.name).filter((n)=>/app\.js|rules\.js|game\.js/.test(n)),thumbnailAssets:performance.getEntriesByType('resource').filter((e)=>e.name.includes('/thumbnails/property/')||e.name.includes('/maps/ben-10/assets/buildings/')||e.name.includes('/maps/ben-10-02/assets/buildings/')).length})`, returnByValue: true });
  let shot;
  if (canvasOnly) {
    const rendered = await call('Runtime.evaluate', { expression: `document.querySelector('#stage canvas')?.toDataURL('image/png').split(',')[1] || ''`, returnByValue: true });
    shot = { data: rendered.result.value };
  } else shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  if (!shot.data) throw new Error(`Không lấy được ảnh canvas bản đồ: ${JSON.stringify(errors.result.value)}; ${notices.join(' | ')}`);
  fs.mkdirSync(path.dirname(path.resolve(target)), { recursive: true }); fs.writeFileSync(target, Buffer.from(shot.data, 'base64'));
  const homeThumbnailAssets = beforeRoom.result.value && beforeRoom.result.value.screen === 'gate' ? beforeRoom.result.value.count : null;
  console.log(JSON.stringify({ ...errors.result.value, homeThumbnailAssets, stateAssetLoad, buildingAssetLoad, resortAssetLoad, tokenAssetLoad, rollMs })); console.log(path.resolve(target)); ws.close();
} finally {
  await stopBrowserAndCleanProfile();
}

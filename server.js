#!/usr/bin/env node
/* Thái Thịnh Monopoly — server làm trọng tài cho ván chơi.
   Chạy trên máy nhà (Tailscale/LAN) hoặc trên cloud. Chỉ cần Node.js 18+, không cần thư viện ngoài.
   - Luật chơi (public/game.js) chỉ chạy ở đây; trình duyệt gửi hành động, nhận trạng thái qua SSE.
   - Lưu ván sau mỗi nước đi vào data/game.json; khởi động lại vẫn chơi tiếp.
   - Mỗi người giữ một token trong trình duyệt để vào lại đúng ghế; người mất kết nối được đi hộ. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const crypto = require('crypto');
const { exec, execFile } = require('child_process');
const G = require('./public/game.js');

// Bản đóng gói .exe (build/entry.js) gắn sẵn danh sách file giao diện nhúng trong file chạy
const EMBED = globalThis.__TTM_ASSETS || null;
const PACKED = !!EMBED;

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUB = path.join(__dirname, 'public');
// bản .exe lưu ván vào thư mục data cạnh file .exe
const DATA_DIR = process.env.DATA_DIR || path.join(PACKED ? path.dirname(process.execPath) : __dirname, 'data');
const SAVE = path.join(DATA_DIR, 'game.json');
const MANUAL_PROXY_SEC = G.RULES.CONFIG.PROXY_SEC; // người chơi mất kết nối bao lâu thì người khác được bấm "Đi hộ" (bộ luật)
const EMPTY_ROOM_TTL_MS = 2 * 60 * 1000;

fs.mkdirSync(DATA_DIR, { recursive: true });

/* ---------- lưu & khôi phục ván ---------- */
function load() {
  try {
    const s = JSON.parse(fs.readFileSync(SAVE, 'utf8'));
    const base = G.createState();
    const st = Object.assign(base, s, { settings: Object.assign(base.settings, s.settings || {}) });
    console.log(`↺ Đã khôi phục ván đã lưu (${st.players.length} người, trạng thái: ${st.phase})`);
    return st;
  } catch (e) {
    if (e.code !== 'ENOENT') console.warn('Không đọc được file lưu, tạo phòng mới:', e.message);
    return G.createState();
  }
}
let state = load();
G.ensureHost(state); // nâng cấp file lưu cũ chưa có hostId
function save() {
  const tmp = SAVE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state));
  fs.renameSync(tmp, SAVE);
}

/* ---------- kết nối thời gian thực (Server-Sent Events) ---------- */
const clients = new Set();
const conns = new Map();        // id người chơi -> số kết nối đang mở
const offlineSince = new Map(); // id người chơi -> thời điểm mất kết nối
state.players.forEach((p) => offlineSince.set(p.id, Date.now()));

const isOnline = (id) => (conns.get(id) || 0) > 0;
const hasOnlinePlayers = () => state.players.some((p) => isOnline(p.id));
const offlineSec = (id) => (isOnline(id) ? 0 : (Date.now() - (offlineSince.get(id) || Date.now())) / 1000);
function presence() {
  const o = {};
  for (const p of state.players) o[p.id] = { on: !!p.bot || isOnline(p.id), bot: !!p.bot, since: p.bot || isOnline(p.id) ? 0 : (offlineSince.get(p.id) || Date.now()) };
  return o;
}
const viewers = () => [...new Set([...clients].filter((c) => !c.pid && c.viewer).map((c) => c.viewer))];
const payload = () => `data: ${JSON.stringify({ state: G.publicView(state), presence: presence(), viewers: viewers(), now: Date.now(), proxySec: MANUAL_PROXY_SEC })}\n\n`;
function broadcast() { const msg = payload(); for (const c of clients) c.res.write(msg); }
let emptyTimer = null;
function deleteEmptyRoom() {
  if (hasOnlinePlayers()) return;
  state = G.createState(); offlineSince.clear(); conns.clear(); save(); broadcast();
}
function scheduleEmptyCleanup() {
  clearTimeout(emptyTimer); emptyTimer = null;
  if (!state.players.length) return;
  if (!hasOnlinePlayers()) emptyTimer = setTimeout(deleteEmptyRoom, EMPTY_ROOM_TTL_MS);
}
function commit() { state.version++; save(); broadcast(); scheduleEmptyCleanup(); scheduleBot(); }
scheduleEmptyCleanup();

setInterval(() => { const msg = `event: ping\ndata: ${Date.now()}\n\n`; for (const c of clients) c.res.write(msg); }, 15000);

// mỗi giây: hết thời lượng ván → dừng, xếp hạng theo tổng tài sản; hết thời gian một bước → tự đi một bước an toàn
setInterval(() => {
  try {
    if (!hasOnlinePlayers()) return;
    if (G.checkTime(state, Date.now())) return commit();
    if (G.checkTurn(state, Date.now())) commit();
  } catch (e) { console.error('Lỗi kiểm tra giờ:', e); }
}, 1000);

/* ---------- đi hộ người mất kết nối: chỉ đổ xúc xắc, trả tiền, bán đất khi nợ; không mua/xây ---------- */
function runAuto(reason) {
  if (state.phase !== 'play') return;
  const p = G.cur(state);
  state.log.push({ n: ++state.seq, t: `🤖 ${reason} cho ${p.name}` });
  for (let n = 0; n < 80 && state.phase === 'play' && G.cur(state).id === p.id; n++) {
    const [t, d] = G.autoAction(state);
    G.act(state, p.id, t, d);
  }
  commit();
}
let botTimer = null;
function scheduleBot() {
  clearTimeout(botTimer); botTimer = null;
  const p = state.phase === 'play' && G.cur(state);
  if (!p || !p.bot || !hasOnlinePlayers()) return;
  botTimer = setTimeout(runBotTurn, 650);
}
function runBotTurn() {
  botTimer = null;
  if (state.phase !== 'play' || !hasOnlinePlayers()) return;
  const p = G.cur(state); if (!p || !p.bot) return;
  state.log.push({ n: ++state.seq, t: `🤖 ${p.name} đang đi` });
  try {
    for (let n = 0; n < 80 && state.phase === 'play' && G.cur(state).id === p.id; n++) {
      const [t, d] = G.botAction(state); G.act(state, p.id, t, d);
    }
    commit();
  } catch (e) { console.error('Lỗi bot:', e); }
}
setInterval(() => {
  const sec = state.settings.autoSec;
  if (state.phase !== 'play' || !sec || !hasOnlinePlayers()) return;
  const p = G.cur(state);
  if (p && offlineSec(p.id) >= sec) { try { runAuto('Tự động đi hộ'); } catch (e) { console.error('Lỗi đi hộ:', e); } }
}, 3000);

/* ---------- HTTP ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const COMPRESS = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg']);

function sendJSON(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = '';
    req.on('data', (c) => { b += c; if (b.length > 20000) { reject(new Error('Quá lớn')); req.destroy(); } });
    req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch (e) { reject(new Error('JSON lỗi')); } });
    req.on('error', reject);
  });
}
const byToken = (t) => (t ? state.players.find((p) => p.token === t) : null);

function handleEvents(req, res, url) {
  const p = byToken(url.searchParams.get('token'));
  const viewer = p ? '' : String(url.searchParams.get('viewer') || '').replace(/\s+/g, ' ').trim().slice(0, 16);
  if (viewer && !state.players.length) return sendJSON(res, 404, { error: 'Phòng không tồn tại hoặc đã bị xoá' });
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write('retry: 1500\n\n');
  req.socket.setKeepAlive(true, 10000); req.socket.setNoDelay(true);
  const c = { res, pid: p ? p.id : null, viewer };
  clients.add(c);
  if (p) { conns.set(p.id, (conns.get(p.id) || 0) + 1); clearTimeout(emptyTimer); emptyTimer = null; scheduleBot(); }
  broadcast();
  req.on('close', () => {
    clients.delete(c);
    if (!c.pid) return;
    const n = Math.max(0, (conns.get(c.pid) || 1) - 1);
    conns.set(c.pid, n);
    if (n === 0) offlineSince.set(c.pid, Date.now());
    broadcast();
    scheduleEmptyCleanup();
  });
}

async function handleApi(req, res, url) {
  let body;
  try { body = await readBody(req); } catch (e) { return sendJSON(res, 400, { error: e.message }); }
  try {
    if (url.pathname === '/api/join') {
      const existing = G.byName(state, body.name);
      if (existing) {
        if (existing.bot) return sendJSON(res, 409, { error: 'Tên này đang được bot sử dụng' });
        if (isOnline(existing.id)) return sendJSON(res, 409, { error: `${existing.name} đang online trên một thiết bị khác` });
        offlineSince.set(existing.id, Date.now());
        scheduleEmptyCleanup();
        return sendJSON(res, 200, { id: existing.id, token: existing.token, rejoined: true });
      }
      const wasEmpty = state.players.length === 0;
      const id = 'p' + crypto.randomBytes(4).toString('hex');
      const token = crypto.randomBytes(18).toString('hex');
      G.addPlayer(state, { id, token, name: body.name, pet: body.pet });
      if (wasEmpty && body.mapId) G.setSettings(state, { mapId: body.mapId });
      offlineSince.set(id, Date.now());
      commit();
      return sendJSON(res, 200, { id, token });
    }
    if (url.pathname === '/api/claim') { // nhận lại ghế từ thiết bị khác khi ghế đó đang mất kết nối
      const p = G.byId(state, body.id);
      if (!p) return sendJSON(res, 404, { error: 'Không tìm thấy người chơi' });
      if (isOnline(p.id)) return sendJSON(res, 409, { error: `${p.name} đang online trên một thiết bị khác` });
      scheduleEmptyCleanup();
      return sendJSON(res, 200, { id: p.id, token: p.token });
    }
    if (url.pathname === '/api/act') {
      const p = byToken(body.token);
      if (!p) return sendJSON(res, 401, { error: 'Bạn chưa vào phòng (hoặc phiên đã hết hạn)' });
      if (['start', 'reset', 'kick', 'settings', 'addBot', 'removeBot'].includes(body.type) && !G.isHost(state, p.id)) {
        return sendJSON(res, 403, { error: 'Chỉ host mới được thay đổi cấu hình phòng' });
      }
      const d = body.data || {};
      switch (body.type) {
        case 'start': G.startGame(state); break;
        case 'reset': if (state.phase === 'lobby') throw new G.GameError('Đang ở phòng chờ rồi'); G.resetGame(state); break;
        case 'leave': G.removePlayer(state, p.id); break;
        case 'kick': { // host có quyền mời người chơi khác ra cả khi họ đang online
          const target = G.byId(state, d.id);
          if (!target || target.bot || target.id === p.id) throw new G.GameError('Không thể kích người chơi này');
          G.removePlayer(state, target.id); break;
        }
        case 'pet': G.setPet(state, p.id, d.pet); break;
        case 'ready': G.setReady(state, p.id, d.ready); break;
        case 'rename': G.renamePlayer(state, p.id, d.name); break;
        case 'settings': { const { mapId: _fixedAtCreation, ...roomSettings } = d; G.setSettings(state, roomSettings); break; }
        case 'addBot': G.addBot(state, { id: 'bot' + crypto.randomBytes(4).toString('hex') }); break;
        case 'removeBot': G.removeBot(state, d.id); break;
        case 'proxy': {
          if (state.phase !== 'play') throw new G.GameError('Ván không diễn ra');
          const c = G.cur(state);
          if (c.id === p.id) throw new G.GameError('Đang là lượt của bạn');
          if (offlineSec(c.id) < MANUAL_PROXY_SEC) throw new G.GameError(`${c.name} vẫn đang online`);
          runAuto(`${p.name} đi hộ`);
          break;
        }
        default: G.act(state, p.id, body.type, d);
      }
      commit();
      return sendJSON(res, 200, { ok: true, v: state.version, state: G.publicView(state) });
    }
    sendJSON(res, 404, { error: 'Không có API này' });
  } catch (e) {
    if (e instanceof G.GameError) return sendJSON(res, 400, { error: e.message });
    console.error(e);
    sendJSON(res, 500, { error: 'Lỗi máy chủ: ' + e.message });
  }
}

// file tĩnh: đọc từ thư mục public (hoặc từ file nhúng trong .exe), nén gzip một lần rồi giữ trong bộ nhớ
const gzCache = new Map();
function readAsset(rel) {
  if (EMBED) {
    const p = EMBED[rel];
    return p ? Bun.file(p).arrayBuffer().then((ab) => ({ buf: Buffer.from(ab), key: rel })) : Promise.resolve(null);
  }
  const file = path.normalize(path.join(PUB, rel));
  if (!file.startsWith(PUB + path.sep)) return Promise.resolve(null);
  return fs.promises.stat(file).then((st) => (st.isFile() ? fs.promises.readFile(file).then((buf) => ({ buf, key: file + ':' + st.mtimeMs })) : null), () => null);
}
async function handleStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const a = await readAsset(rel);
  if (!a) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Không tìm thấy'); }
  const ext = path.extname(rel);
  const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': rel.startsWith('/models/') || rel.startsWith('/vendor/') ? 'public, max-age=86400' : 'no-cache' };
  if (!COMPRESS.has(ext) || !/\bgzip\b/.test(req.headers['accept-encoding'] || '')) { res.writeHead(200, headers); return res.end(a.buf); }
  if (!gzCache.has(a.key)) gzCache.set(a.key, zlib.gzipSync(a.buf));
  res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' }); res.end(gzCache.get(a.key));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/events') return handleEvents(req, res, url);
  if (req.method === 'POST' && url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  if (req.method === 'GET' && url.pathname === '/api/info') return sendJSON(res, 200, { links: links() });
  if (req.method === 'GET' && url.pathname === '/api/watch') {
    if (!state.players.length) return sendJSON(res, 404, { error: 'Phòng không tồn tại hoặc đã bị xoá' });
    return sendJSON(res, 200, { exists: true });
  }
  if (req.method === 'GET' && url.pathname === '/health') return sendJSON(res, 200, { app: 'thai-thinh-monopoly', phase: state.phase, version: state.version });
  if (req.method === 'GET') return handleStatic(req, res, url);
  res.writeHead(405); res.end();
});
server.keepAliveTimeout = 65000;
server.requestTimeout = 0; // SSE giữ kết nối lâu

function addresses() {
  const out = { ts: [], lan: [] };
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      const [x, y] = a.address.split('.').map(Number);
      const isTs = /tailscale|utun/i.test(name) || (x === 100 && y >= 64 && y <= 127);
      (isTs ? out.ts : out.lan).push(a.address);
    }
  }
  return out;
}
let magicDNS = '';
execFile('tailscale', ['status', '--json'], { timeout: 4000, windowsHide: true }, (err, out) => {
  if (err) return;
  try { magicDNS = (JSON.parse(out).Self.DNSName || '').replace(/\.$/, ''); } catch (e) { /* bỏ qua */ }
});
// link mời người chơi, ưu tiên Tailscale
function links() {
  const a = addresses(), u = (h) => `http://${h}:${PORT}`;
  return [...(magicDNS ? [{ kind: 'Tailscale', url: u(magicDNS) }] : []), ...a.ts.map((ip) => ({ kind: 'Tailscale', url: u(ip) })), ...a.lan.map((ip) => ({ kind: 'Mạng LAN', url: u(ip) }))];
}
function openBrowser(url) {
  const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, { windowsHide: true }, () => {});
}
const OPEN = PACKED ? process.env.OPEN !== '0' : process.env.OPEN === '1';

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') { // game đang chạy rồi: chỉ mở trình duyệt
    console.log(`Cổng ${PORT} đang được dùng — có thể game đã chạy sẵn. Mở trình duyệt tới http://localhost:${PORT}`);
    if (OPEN) openBrowser(`http://localhost:${PORT}`);
    setTimeout(() => process.exit(0), 1500);
    return;
  }
  throw e;
});
server.listen(PORT, HOST, () => {
  console.log('\n🎲  THÁI THỊNH MONOPOLY đang chạy\n');
  console.log(`   Máy này:    http://localhost:${PORT}`);
  setTimeout(() => {
    links().forEach((l) => console.log(`   ${(l.kind + ':').padEnd(11)} ${l.url}${l.kind === 'Tailscale' ? '   ← gửi link này cho cả nhà' : ''}`));
    if (!links().some((l) => l.kind === 'Tailscale')) console.log('   (Chưa thấy Tailscale trên máy này — cả nhà phải cùng wifi, hoặc bật Tailscale)');
    console.log(`\n   Ván được lưu liên tục vào ${SAVE}`);
    console.log(PACKED ? '   Đóng cửa sổ này để tắt game.\n' : '   Nhấn Ctrl+C để dừng.\n');
  }, 600);
  if (OPEN) setTimeout(() => openBrowser(`http://localhost:${PORT}`), 400);
});

function shutdown() {
  try { save(); } catch (e) { /* bỏ qua */ }
  console.log('\nĐã lưu ván. Tạm biệt!');
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

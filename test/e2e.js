// Kiểm thử đầu-cuối qua HTTP: phòng chờ, bắt đầu ván, đi nước, sai lượt, khôi phục sau khi khởi động lại, nhận lại ghế.
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

// TTM_URL=http://127.0.0.1:8787/ node test/e2e.js  → thử một server đang chạy sẵn (vd. bản Cloudflare: npx wrangler dev)
const REMOTE = process.env.TTM_URL ? process.env.TTM_URL.replace(/\/?$/, '/') : null;
const PORT = 3900 + Math.floor(Math.random() * 90);
const DATA = REMOTE ? null : fs.mkdtempSync(path.join(os.tmpdir(), 'ttm-'));
const BASE = REMOTE || `http://127.0.0.1:${PORT}/`;
let srv;

function start() {
  if (REMOTE) return waitUp();
  // TTM_BIN=dist/ThaiThinhMonopoly-linux node test/e2e.js  → thử luôn bản đã đóng gói
  const bin = process.env.TTM_BIN ? [path.resolve(process.env.TTM_BIN), []] : [process.execPath, [path.join(__dirname, '..', 'server.js')]];
  srv = spawn(bin[0], bin[1], { env: { ...process.env, PORT, HOST: '127.0.0.1', DATA_DIR: DATA, OPEN: '0' }, stdio: 'ignore' });
  return waitUp();
}
async function waitUp() {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + 'health')).ok) return; } catch (e) { /* chưa lên */ } await new Promise((r) => setTimeout(r, 100)); }
  throw new Error('Server không khởi động');
}
const stop = () => (REMOTE ? Promise.resolve() : new Promise((r) => { srv.once('exit', r); srv.kill('SIGTERM'); }));
async function post(p, body) {
  const r = await fetch(BASE + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
}
// đọc một bản trạng thái từ luồng SSE rồi ngắt
async function snapshot(token, viewer) {
  const ac = new AbortController();
  const params = new URLSearchParams(); if (token) params.set('token', token); if (viewer) params.set('viewer', viewer);
  const r = await fetch(BASE + 'events' + (params.size ? '?' + params : ''), { signal: ac.signal });
  const rd = r.body.getReader(); let buf = '';
  for (;;) {
    const { value } = await rd.read(); buf += Buffer.from(value).toString();
    const m = buf.match(/^data: (.+)$/m);
    if (m) { ac.abort(); return JSON.parse(m[1]); }
  }
}

(async () => {
  await start();
  const ok = (r) => { assert.strictEqual(r.status, 200, JSON.stringify(r.body)); return r.body; };
  const emptyWatch = await fetch(BASE + 'api/watch');
  assert.strictEqual(emptyWatch.status, 404, 'không được vào xem một phòng chưa tồn tại hoặc đã bị xoá');
  const a = ok(await post('api/join', { name: 'Bố', pet: 'animal-dog', mapId: 'map-1' }));
  assert.strictEqual((await fetch(BASE + 'api/watch')).status, 200, 'phòng có người chơi phải cho phép vào xem');
  const watched = await snapshot(null, 'Ông xem');
  assert.deepStrictEqual(watched.viewers, ['Ông xem'], 'khán giả phải có username nhưng không chiếm ghế');
  assert.strictEqual(watched.state.players.length, 1, 'vào xem không được tạo người chơi');
  const aAgain = ok(await post('api/join', { name: '  Bố  ', pet: 'animal-panda' }));
  assert.deepStrictEqual([aAgain.id, aAgain.token, aAgain.rejoined], [a.id, a.token, true], 'username cũ + room cũ phải vào lại đúng ghế');
  assert.strictEqual((await post('api/join', { name: 'Mẹ', pet: 'animal-dog' })).status, 400, 'trùng nhân vật phải bị từ chối');
  const b = ok(await post('api/join', { name: 'Mẹ', pet: 'animal-cat' }));
  ok(await post('api/act', { token: b.token, type: 'pet', data: { pet: 'animal-fox' } }));
  const c0 = ok(await post('api/join', { name: 'Khách', pet: 'animal-panda' }));
  assert.strictEqual((await post('api/act', { token: b.token, type: 'settings', data: { timeLimitMin: 120 } })).status, 403, 'khách không được đổi cấu hình');
  assert.strictEqual((await post('api/act', { token: b.token, type: 'kick', data: { id: c0.id } })).status, 403, 'khách không được mời người khác ra');
  assert.strictEqual((await post('api/act', { token: b.token, type: 'addBot' })).status, 403, 'chỉ host được thêm bot');
  assert.strictEqual((await post('api/act', { token: b.token, type: 'start' })).status, 403, 'khách không được bắt đầu');
  ok(await post('api/act', { token: a.token, type: 'kick', data: { id: c0.id } })); // mời ra ghế mất kết nối
  const withBot = ok(await post('api/act', { token: a.token, type: 'addBot' }));
  const bot = withBot.state.players.find((p) => p.bot);
  assert.ok(bot && /^Bot \d+$/.test(bot.name), 'host phải thêm được bot có tên tự động');
  assert.strictEqual((await post('api/act', { token: b.token, type: 'removeBot', data: { id: bot.id } })).status, 403, 'khách không được xóa bot');
  ok(await post('api/act', { token: a.token, type: 'removeBot', data: { id: bot.id } }));
  ok(await post('api/act', { token: a.token, type: 'settings', data: { mapId: 'map-1', timeLimitMin: 90 } }));
  let d = await snapshot();
  assert.strictEqual(d.state.hostId, a.id, 'người đầu tiên phải là host');
  assert.strictEqual(d.state.settings.mapId, 'map-1', 'Map 1 phải là map mặc định');
  assert.deepStrictEqual(d.state.players.map((p) => p.pet), ['animal-dog', 'animal-fox']);
  assert.ok(d.state.players.every((p) => !p.token), 'token không được lộ ra ngoài');
  const startResult = ok(await post('api/act', { token: a.token, type: 'start' }));
  assert.strictEqual(startResult.state.phase, 'play', 'phản hồi hành động phải mang state mới để UI không phải chờ SSE');
  assert.ok(startResult.state.players.every((p) => !p.token), 'state trong phản hồi hành động không được lộ token');
  d = await snapshot();
  assert.strictEqual(d.state.phase, 'play');
  assert.ok(d.state.endsAt - d.state.startedAt === 90 * 60000, 'thời lượng 90 phút');
  const cur = d.state.players[d.state.turn].id, curTok = cur === a.id ? a.token : b.token, other = cur === a.id ? b.token : a.token;
  assert.strictEqual((await post('api/act', { token: other, type: 'roll' })).status, 400, 'sai lượt phải bị từ chối');
  const rollResult = ok(await post('api/act', { token: curTok, type: 'roll' }));
  assert.ok(rollResult.state.dice && rollResult.state.moves.length, 'phản hồi roll phải có ngay kết quả mới');
  const v1 = (await snapshot()).state;
  assert.ok(v1.dice && v1.moves.length, 'đã đổ xúc xắc');

  // khởi động lại server: ván còn nguyên
  await stop(); await start();
  const v2 = (await snapshot()).state;
  assert.strictEqual(v2.version, v1.version); assert.strictEqual(v2.phase, 'play');
  assert.deepStrictEqual(v2.players.map((p) => [p.pos, p.money]), v1.players.map((p) => [p.pos, p.money]));

  // máy khác nhập username cũ + room cũ trong lúc ván đang chạy → nhận lại đúng ghế
  const aDuringPlay = ok(await post('api/join', { name: 'Bố', pet: 'animal-panda' }));
  assert.deepStrictEqual([aDuringPlay.id, aDuringPlay.token, aDuringPlay.rejoined], [a.id, a.token, true]);

  // nhận lại ghế từ thiết bị khác khi ghế đó đang offline
  const c = ok(await post('api/claim', { id: a.id }));
  assert.strictEqual(c.token, a.token);
  await stop();
  if (DATA) fs.rmSync(DATA, { recursive: true, force: true });
  // file giao diện phục vụ được (kể cả khi nhúng trong file chạy)
  for (const f of ['', 'game.js', 'js/app.js', 'vendor/qrcode.mjs', 'vendor/three/three.module.js', 'models/bundle.json']) {
    await start(); const r = await fetch(BASE + f); assert.strictEqual(r.status, 200, f); await r.arrayBuffer(); await stop();
  }
  console.log('OK e2e: phòng chờ, nhân vật, bắt đầu, sai lượt, khôi phục sau khởi động lại, nhận lại ghế');
})().catch(async (e) => { console.error('LỖI e2e:', e.message); try { await stop(); } catch (x) { /* bỏ qua */ } process.exit(1); });

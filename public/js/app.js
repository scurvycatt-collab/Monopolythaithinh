import qrcode from '../vendor/qrcode.mjs';
import { normalizeRoom, roomEndpoint, selectRoomCode, validRoom } from './room-session.mjs';
import { PROPERTY_THUMBNAIL_VERSION } from '../thumbnails/property/version.js';

const G = window.Game;
const { TILES, GROUPS, CFG, MAPS } = G;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const GRAPHICS_KEY = 'tt-monopoly-graphics-v1';
const GRAPHICS_LEVELS = ['low', 'medium', 'high']; // FPS / bóng / độ chi tiết từng mức do renderer của map quyết định
let graphicsLevel = 'high';
try {
  const saved = localStorage.getItem(GRAPHICS_KEY);
  if (GRAPHICS_LEVELS.includes(saved)) graphicsLevel = saved;
  else {
    const memory = Number(navigator.deviceMemory || 8), cores = Number(navigator.hardwareConcurrency || 8), mobile = matchMedia('(pointer:coarse)').matches;
    graphicsLevel = memory <= 2 || cores <= 2 ? 'low' : (memory <= 4 || cores <= 4 || mobile ? 'medium' : 'high');
  }
} catch (e) { /* dùng mặc định */ }
if (/[?&]low\b/.test(location.search)) graphicsLevel = 'low'; // tương thích link ?low cũ
const money = (n) => Math.round(n * 1000).toLocaleString('vi-VN');
const shortK = (n) => (n >= 1000 ? (n / 1000).toFixed(n % 1000 ? 1 : 0).replace('.', ',') + 'M' : n + 'K');
const outageRounds = (i) => Math.max(0, Number(S.outage && S.outage[i] || 0) - Number(S.round || 0));

/* ---------------- âm thanh ---------------- */
const SOUND_KEY = 'tt-monopoly-sound-v1';
const soundPrefs = { music: true, musicVolume: 20, turn: true, turnVolume: 75 };
try { Object.assign(soundPrefs, JSON.parse(localStorage.getItem(SOUND_KEY) || '{}')); } catch (e) { /* dùng mặc định */ }
let audioCtx = null, musicTimer = null, musicStep = 0;
const musicNotes = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23];
function saveSoundPrefs() { try { localStorage.setItem(SOUND_KEY, JSON.stringify(soundPrefs)); } catch (e) { /* trình duyệt chặn lưu */ } }
function tone(freq, duration, volume, type = 'sine', at = audioCtx && audioCtx.currentTime) {
  if (!audioCtx || audioCtx.state !== 'running' || !volume) return;
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0.0001, at); gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), at + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(gain).connect(audioCtx.destination); osc.start(at); osc.stop(at + duration + 0.04);
}
function playMusicStep() {
  if (!soundPrefs.music || document.hidden || document.body.dataset.screen !== 'game') return;
  const volume = soundPrefs.musicVolume / 100 * 0.09, note = musicNotes[musicStep % musicNotes.length];
  tone(note, 0.48, volume, 'triangle');
  if (musicStep % 4 === 0) tone(note / 2, 0.8, volume * 0.52, 'sine');
  musicStep++;
}
function syncMusic() {
  const shouldPlay = !!audioCtx && audioCtx.state === 'running' && soundPrefs.music && !document.hidden && document.body.dataset.screen === 'game';
  if (!shouldPlay) { if (musicTimer) clearInterval(musicTimer); musicTimer = null; return; }
  if (!musicTimer) { playMusicStep(); musicTimer = setInterval(playMusicStep, 620); }
}
function unlockAudio() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  if (!audioCtx) audioCtx = new Audio();
  audioCtx.resume().then(syncMusic).catch(() => {});
}
function playTurnSound() {
  if (!soundPrefs.turn || !audioCtx || audioCtx.state !== 'running') return;
  const volume = soundPrefs.turnVolume / 100 * 0.30, at = audioCtx.currentTime;
  tone(523.25, 0.2, volume, 'sine', at); tone(659.25, 0.24, volume * 0.88, 'sine', at + 0.12); tone(783.99, 0.38, volume * 0.82, 'sine', at + 0.25);
}
let timeWarningKey = '';
function playTimeWarning() {
  if (!soundPrefs.turn || !audioCtx || audioCtx.state !== 'running' || S.phase !== 'play' || !myTurn()) return;
  const left = G.stepLeft(S, now());
  if (left === null || left <= 0 || left > 5000) return;
  const second = Math.ceil(left / 1000), key = `${S.stepAt}:${second}`;
  if (key === timeWarningKey) return;
  timeWarningKey = key;
  const volume = soundPrefs.turnVolume / 100 * 0.23;
  tone(second <= 2 ? 880 : 659.25, second <= 2 ? 0.18 : 0.11, volume, second <= 2 ? 'square' : 'sine');
}
function renderSoundSettings() {
  $('#music-enabled').checked = !!soundPrefs.music; $('#music-volume').value = soundPrefs.musicVolume;
  $('#turn-enabled').checked = !!soundPrefs.turn; $('#turn-volume').value = soundPrefs.turnVolume;
  $('#music-volume').disabled = !soundPrefs.music; $('#turn-volume').disabled = !soundPrefs.turn;
  $('#graphics-level').value = graphicsLevel;
  $('#settings-leave').classList.toggle('show', MODE === 'net' && ROOM_GATE && !!ROOM);
}
function updateSoundPref(key, value) { soundPrefs[key] = value; saveSoundPrefs(); renderSoundSettings(); syncMusic(); }
$('#soundbtn').onclick = () => { unlockAudio(); renderSoundSettings(); $('#soundpanel').classList.toggle('show'); };
$('#soundclose').onclick = () => $('#soundpanel').classList.remove('show');
$('#music-enabled').onchange = (e) => updateSoundPref('music', e.target.checked);
$('#music-volume').oninput = (e) => updateSoundPref('musicVolume', Number(e.target.value));
$('#turn-enabled').onchange = (e) => { updateSoundPref('turn', e.target.checked); if (e.target.checked) playTurnSound(); };
$('#turn-volume').oninput = (e) => { updateSoundPref('turnVolume', Number(e.target.value)); };
$('#graphics-level').onchange = (e) => setGraphicsLevel(e.target.value);
function showRulebook() {
  const sections = G.RULES.RULEBOOK || [];
  const el = $('#rulebook');
  el.innerHTML = `<article class="rulebook-card"><header><h2 id="rulebook-title">LUẬT CHƠI</h2><button type="button" id="rulebook-close" aria-label="Đóng">×</button></header><div class="rulebook-scroll">${sections.map((section) => `<section><h3>${esc(section.title)}</h3><ol>${section.items.map((item) => `<li>${esc(item)}</li>`).join('')}</ol></section>`).join('')}</div></article>`;
  el.classList.add('show');
  $('#soundpanel').classList.remove('show');
  $('#rulebook-close').onclick = hideRulebook;
  $('#rulebook-close').focus();
}
function hideRulebook() { $('#rulebook').classList.remove('show'); }
$('#settings-rules').onclick = showRulebook;
$('#rulebook').addEventListener('click', (e) => { if (e.target.id === 'rulebook') hideRulebook(); });
$('#settings-leave').onclick = async () => {
  if (MODE !== 'net' || !ROOM_GATE || !ROOM) return;
  const button = $('#settings-leave'); button.disabled = true;
  try {
    if (me && S.phase === 'lobby') await api('api/act', { token: me.token, type: 'leave' });
    exitRoom();
  } catch (e) { toast(e.message); button.disabled = false; }
};
addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
document.addEventListener('visibilitychange', () => {
  syncMusic();
  if (!board) return;
  if (document.hidden) board.stop(); else if (document.body.dataset.screen === 'game') board.start();
});

/* ---------------- chế độ chơi ----------------
   'net'  : có server (máy nhà qua Tailscale/LAN, hoặc cloud). Server giữ ván và luật; trình duyệt hiển thị và gửi hành động.
   'local': không có server (artifact, GitHub Pages). Chơi chung một máy, ván lưu trong trình duyệt. */
const CORNERS = ['tl', 'tr', 'br', 'bl'];
let MODE = 'local';
let S = G.createState();  // trạng thái ván (bản công khai từ server, hoặc bản trong máy)
let seatOf = {};          // id -> { color, pet, corner }
let me = null;            // chế độ mạng: { id, token } của mình
let presence = {}, viewers = [], skew = 0, proxySec = 15;
let ROOM = '', ROOM_GATE = false, WATCH_MODE = false, pendingJoinName = '', pendingRoomMap = '', joiningRoom = false;
let boardReadyPromise = null;
const now = () => Date.now() + skew;   // giờ theo server
function seatSetup() {
  seatOf = {};
  S.players.forEach((p, k) => { const pet = p.pet || G.PETS[k % G.PETS.length].id, def = G.PETS.find((x) => x.id === pet); p.color = def ? def.c : p.color; seatOf[p.id] = { color: p.color, pet, corner: CORNERS[k % 4] }; });
}
const curP = () => (S.phase === 'play' ? S.players[S.turn] : null);
const isMe = (pid) => MODE === 'local' || (!!me && me.id === pid);
const myTurn = () => !!curP() && isMe(curP().id);
const online = (pid) => MODE === 'local' || !!(G.byId(S, pid) || {}).bot || !presence[pid] || presence[pid].on;

/* ---------------- bàn cờ: renderer của map (docs/contracts/map-renderer.md) ---------------- */
// app.js không chạm three.js: mọi thứ vẽ trên bàn đi qua `board` do public/maps/<id>/renderer.js trả về.
const DEFAULT_RENDERER = 'maps/map-1/renderer.js';
let board = null, boardMapId = '';
// Thông số hiển thị do renderer của map khai báo (board.meta); giá trị dưới chỉ là dự phòng khi map chưa tải.
const RESORT_COLOR = '#7fd3dd'; // màu thẻ thông tin ô resort (UI, không phụ thuộc map)
const META_DEFAULT = { buildMs: 2400, resortLevels: ['Cấp 1', 'Cấp 2', 'Cấp 3', 'Cấp 4'] };
const boardMeta = () => Object.assign({}, META_DEFAULT, board && board.meta);
const beachLevel = (owner) => Math.min(4, G.ownedBy(S, owner).filter((j) => TILES[j].type === 'resort').length);
const mapEntry = (id) => MAPS.find((map) => map.id === id) || MAPS.find((map) => map.id === 'map-1') || MAPS[0];
async function createBoard(entry) {
  const path = entry.renderer || DEFAULT_RENDERER;
  const mod = await import(new URL(path, document.baseURI).href);
  const canvas = document.createElement('canvas');
  $('#stage').replaceChildren(canvas);
  try {
    return await mod.default({
      canvas, rules: G.RULES, game: G, base: path.replace(/[^/]*$/, ''), quality: graphicsLevel,
      onProgress: (done, total) => { $('#loadmsg').textContent = `Tải mô hình 3D ${done}/${total}`; },
    });
  } catch (e) { $('#stage').replaceChildren(); throw e; }
}
// tải renderer theo map của phòng; lỗi hoặc thiếu ⇒ rơi về map-1 và báo toast
async function loadBoard(mapId) {
  const entry = mapEntry(mapId);
  if (board && boardMapId === entry.id) return;
  if (board) { board.destroy(); board = null; boardMapId = ''; $('#stage').replaceChildren(); }
  try { board = await createBoard(entry); boardMapId = entry.id; }
  catch (e) {
    if (entry.id === 'map-1') throw e;
    console.error(e); toast(`Không tải được bản đồ ${entry.name}, dùng Map 1`);
    board = await createBoard(mapEntry('map-1')); boardMapId = 'map-1';
  }
  board.resize();
}
function setGraphicsLevel(level) {
  if (!GRAPHICS_LEVELS.includes(level)) return;
  graphicsLevel = level;
  try { localStorage.setItem(GRAPHICS_KEY, level); } catch (e) { /* trình duyệt chặn lưu */ }
  if (board) board.setQuality(level);
  renderSoundSettings();
}
// quân có viền sáng: chế độ mạng là quân của mình, một máy là quân đang tới lượt; mũi tên luôn trên quân đang tới lượt
function syncActive() {
  if (!board) return;
  const cur = curP(), glow = S.players.find((p) => !p.bankrupt && (MODE === 'net' ? isMe(p.id) : (!!curP() && curP().id === p.id)));
  board.setActive(cur && !cur.bankrupt ? cur.id : null, cur ? (seatOf[cur.id] && seatOf[cur.id].color) || cur.color : '', glow ? glow.id : null);
}
// hiện tổng xúc xắc: bật ở chính giữa màn hình rồi tắt nhanh (~1 giây)
function showDiceSum(n, dbl) {
  const el = $('#dicesum');
  el.innerHTML = `${n}${dbl ? '<small>ĐÔI</small>' : ''}`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(showDiceSum.t); showDiceSum.t = setTimeout(() => el.classList.remove('show'), 1000);
}

// Thumbnail công trình được sinh sẵn khi build và phục vụ như asset tĩnh. Không dựng
// WebGL/toDataURL mỗi lần vào game; browser/CDN có thể cache trực tiếp các PNG này.
const propertyThumbnail = (kind, level, color) => `thumbnails/property/${kind}-${String(color || '#9aa4b1').replace('#', '').toLowerCase()}-${level}.png?v=${PROPERTY_THUMBNAIL_VERSION.slice(0, 12)}`;

/* ---------------- zoom, kéo & chạm chọn ô ---------------- */
// Renderer tự lo kéo / cuộn / chụm; app chỉ nhận ra một lần chạm (không kéo) để hỏi ô nào.
$('#zin').onclick = () => board && board.zoomBy(1.25);
$('#zout').onclick = () => board && board.zoomBy(0.8);
$('#zfit').onclick = () => board && board.fit();
const taps = new Map();
let tapMoved = 0;
$('#stage').addEventListener('pointerdown', (e) => { if (!taps.size) tapMoved = 0; taps.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (taps.size > 1) tapMoved = 99; });
$('#stage').addEventListener('pointermove', (e) => { const q = taps.get(e.pointerId); if (!q) return; tapMoved += Math.abs(e.clientX - q.x) + Math.abs(e.clientY - q.y); taps.set(e.pointerId, { x: e.clientX, y: e.clientY }); });
const endTap = (e) => { if (!taps.has(e.pointerId)) return; taps.delete(e.pointerId); if (e.type === 'pointerup' && tapMoved < 6 && taps.size === 0) pickAt(e.clientX, e.clientY); };
$('#stage').addEventListener('pointerup', endTap); $('#stage').addEventListener('pointercancel', endTap);
let pickable = null;
function pickAt(cx, cy) {
  const i = board ? board.pick(cx, cy) : null;
  if (i === null || i === undefined) return;
  if (pickable) { if (pickable.set.has(i)) pickable.cb(i); return; }
  if (!$('#modal').classList.contains('show')) showInfo(i);
}

/* lớp DOM trên bàn (đồng hồ ván, thanh thời gian lượt, nhãn giá bán đất): 10 lần/giây, không theo FPS của bàn */
function updateOverlays() {
  if (document.hidden || document.body.dataset.screen !== 'game' || !board) return;
  if (sell) placeSellTags();
  const bc = $('#bigclock');
  bc.classList.toggle('show', S.phase === 'play' && !!S.endsAt);
  const bar = document.querySelector('.pcard.cur .tbar i'), left = G.stepLeft(S, now());
  if (bar) { const tot = S.settings.turnSec * 1000, v = left === null ? 1 : Math.max(0, Math.min(1, left / tot)); bar.style.transform = `scaleX(${v})`; bar.parentNode.classList.toggle('low', v < 0.3); bar.parentNode.style.visibility = left === null ? 'hidden' : ''; }
}
setInterval(updateOverlays, 100);

/* ---------------- giao diện ---------------- */
let busy = false;
// Tiền bị trừ chạy nhanh để không làm chậm nhịp chơi; tiền nhận vẫn đồng bộ với hoạt ảnh xây nhà.
const moneyMs = () => (REDUCED ? 900 : boardMeta().buildMs);
const MONEY_DEBIT_MS = REDUCED ? 400 : 700;
const target = {}, shown = {};      // số tiền đích / số đang hiển thị của mỗi người
const fmtDelta = (d) => { const a = Math.abs(d), v = a >= 1000 ? (a / 1000).toFixed(2).replace(/\.?0+$/, '') + 'M' : (Math.round(a * 10) / 10) + 'K'; return (d > 0 ? '+$' : '-$') + v; };
function moneyEl(pid) { return $(`#cards [data-p="${pid}"] .num`); }
function floatDelta(pid, d) {
  const el = moneyEl(pid); if (!el || !d) return;
  const r = el.getBoundingClientRect(), f = document.createElement('div');
  f.className = 'delta ' + (d > 0 ? 'up' : 'down'); f.textContent = fmtDelta(d);
  const duration = d < 0 ? 900 : Math.max(1600, moneyMs());
  f.style.left = r.left + r.width / 2 + 'px'; f.style.top = r.top - 4 + 'px'; f.style.animationDuration = duration + 'ms';
  document.body.appendChild(f); setTimeout(() => f.remove(), duration + 100);
}
const reactionTimers = {};
function showHappyReaction(pid) {
  const card = $(`#cards [data-p="${pid}"]`); if (!card) return;
  const av = card.querySelector('.av'); let face = av.querySelector('.happy-face');
  if (!face) { face = document.createElement('span'); face.className = 'happy-face'; face.textContent = '😄'; av.appendChild(face); }
  clearTimeout(reactionTimers[pid]); card.classList.remove('reacting'); void card.offsetWidth; card.classList.add('reacting'); face.classList.add('show');
  reactionTimers[pid] = setTimeout(() => { face.classList.remove('show'); card.classList.remove('reacting'); }, REDUCED ? 900 : 1700);
}
const tweens = {};
function tweenMoney(pid, to, delay = 0) {
  const from = shown[pid] ?? to; cancelAnimationFrame(tweens[pid]);
  const duration = to < from ? MONEY_DEBIT_MS : moneyMs();
  const t0 = performance.now() + delay;
  const step = (now) => {
    const k = Math.max(0, Math.min(1, (now - t0) / duration)), e = 1 - Math.pow(1 - k, 3);
    shown[pid] = from + (to - from) * e;
    const el = moneyEl(pid); if (el) { el.textContent = money(Math.max(0, shown[pid])); el.classList.toggle('neg', to < from && k < 1); el.classList.toggle('pos', to > from && k < 1); }
    if (k < 1) tweens[pid] = requestAnimationFrame(step); else shown[pid] = to;
  };
  tweens[pid] = requestAnimationFrame(step);
}
// tiền thay đổi ngay giữa lúc đi (qua Start nhận lương)
function bumpMoney(pid, d) { target[pid] = (target[pid] ?? 0) + d; floatDelta(pid, d); tweenMoney(pid, target[pid]); }
function renderCards(delay = 0) {
  const el = $('#cards');
  const key = S.players.map((p) => p.id + p.pet + p.name).join();
  if (el.dataset.ids !== key) {
    el.dataset.ids = key;
    el.innerHTML = S.players.map((p) => { const st = seatOf[p.id]; return `<div class="pcard ${st.corner}" style="--c:${st.color}" data-p="${p.id}">
      <div class="av"><img alt="" src="${petImg(st.pet)}"></div>
      <div class="info"><div class="nm">${esc(p.name)}${p.bot ? ' <em>(BOT)</em>' : MODE === 'net' && isMe(p.id) ? ' <em>(bạn)</em>' : ''}</div><div class="mo"><span class="num"></span><small></small><div class="power"></div></div><div class="tbar"><i></i></div></div></div>`; }).join('');
  }
  S.players.forEach((p, idx) => {
    const card = el.querySelector(`[data-p="${p.id}"]`), cur = S.phase === 'play' && idx === S.turn;
    card.classList.toggle('cur', cur); card.classList.toggle('bk', p.bankrupt);
    card.classList.toggle('dim', S.phase === 'play' && !cur && !p.bankrupt);   // đến lượt ai thì người đó sáng, người khác tối đi
    card.classList.toggle('off', !online(p.id));
    const av = card.querySelector('.av'); if (p.bankrupt && !av.querySelector('.stamp')) av.insertAdjacentHTML('beforeend', '<span class="stamp">PHÁ SẢN</span>');
    if (!p.bankrupt) av.querySelector('.stamp')?.remove();
    const n = G.ownedBy(S, p.id).length, tags = [`${n} thành phố`];
    if (!online(p.id)) tags.unshift('⚠ mất kết nối');
    if (p.island) tags.push('kẹt đảo'); if (p.tourPending) tags.push('sắp bay'); if (p.shields) tags.push(`🛡️ VIP${p.shields > 1 ? ' ×' + p.shields : ''}`); if (p.escapeCards) tags.push(`🛟 Thoát đảo${p.escapeCards > 1 ? ' ×' + p.escapeCards : ''}`);
    card.querySelector('small').textContent = tags.join(' · ');
    const powerCuts = G.ownedBy(S, p.id).filter((i) => G.outaged(S, i));
    const power = card.querySelector('.power');
    power.textContent = powerCuts.length ? `⚡ Mất điện · ${powerCuts.map((i) => `${TILES[i].name}: ${outageRounds(i)} vòng`).join(' · ')}` : '';
    power.classList.toggle('show', powerCuts.length > 0);
    if (target[p.id] === undefined) { target[p.id] = shown[p.id] = p.money; moneyEl(p.id).textContent = money(Math.max(0, p.money)); return; }
    if (Math.abs(target[p.id] - p.money) > 1e-6) {
      const d = p.money - target[p.id]; target[p.id] = p.money;
      setTimeout(() => floatDelta(p.id, d), delay);
      tweenMoney(p.id, p.money, delay);
    }
  });
}
function setPick(kind, set, cb, label, skip) {
  pickable = { set, cb };
  if (board) board.highlight([...set], kind);
  const b = $('#banner'); b.innerHTML = `<span>${label}</span>${skip ? `<button class="pill ghost" type="button" id="pickskip" style="font-size:16px;padding:9px 16px">${skip}</button>` : ''}`; b.classList.add('show');
  if (skip) $('#pickskip').onclick = () => { clearPick(); act('skip'); };
}
function clearPick() { pickable = null; if (board) board.highlight([]); $('#banner').classList.remove('show'); }

/* đồng hồ ván */
const clockText = () => {
  if (!S.endsAt) return '';
  const left = Math.max(0, S.endsAt - now()), h = Math.floor(left / 3600000), m = Math.floor(left / 60000) % 60, sec = Math.floor(left / 1000) % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};
function renderClock() {
  const el = $('#bigclock'); if (!el) return;
  el.textContent = clockText();
  el.classList.toggle('low', !!S.endsAt && S.endsAt - now() < 5 * 60000);
}
setInterval(() => {
  if (!S || S.phase !== 'play') return;
  renderClock();
  playTimeWarning();
  if (MODE === 'local' && !busy && G.checkTime(S, Date.now())) { save(); renderCards(); renderHub(); }
  else if (MODE === 'local' && !busy && !sending && G.checkTurn(S, Date.now())) playOut(); // hết giờ bước → tự đi
  if (MODE === 'net' && !busy && !myTurn() && !online(curP().id)) renderHub(); // để hiện nút "Đi hộ" khi đủ thời gian
}, 1000);

const CARD_LABEL = {
  POWER_OUTAGE: 'chọn thành phố của đối thủ để cắt điện 3 vòng',
  EARTHQUAKE: 'chọn thành phố của đối thủ để hạ 1 cấp',
  FORCED_SWAP: ['chọn thành phố của bạn mang đi đổi', 'chọn thành phố của đối thủ để đổi lấy'],
};
function renderHub() {
  const hub = $('#hub');
  clearPick(); endSell(); syncActive();
  if (S.phase !== 'play') { hub.innerHTML = ''; renderModal(); return; }
  const p = S.players[S.turn], st = S.step;
  let h = `<div class="round">Vòng ${S.round}</div>`;
  if (busy) { hub.innerHTML = h; renderClock(); return; }
  if (!myTurn()) { // chế độ mạng, chưa tới lượt mình: chỉ xem; người tới lượt mất kết nối thì cho đi hộ
    const off = !online(p.id), sec = off && presence[p.id] ? (now() - presence[p.id].since) / 1000 : 0;
    h += `<div class="say"><i style="background:${p.color}"></i>${off ? `${esc(p.name)} đang mất kết nối` : `Đang chờ ${esc(p.name)}…`}</div>`;
    if (off && me && sec >= proxySec) h += '<button class="pill ghost" type="button" id="proxy">Đi hộ lượt này</button>';
    hub.innerHTML = h; renderClock();
    if ($('#proxy')) $('#proxy').onclick = () => api('api/act', { token: me.token, type: 'proxy' }).catch((e) => toast(e.message));
    renderModal(); return;
  }
  if (st.kind === 'roll') h += `<button class="pill big" type="button" data-a="roll">Đổ xúc xắc<small>Lượt của ${esc(p.name)}${st.again ? ' · được đổ thêm' : ''}</small></button>`;
  else if (st.kind === 'island') {
    h += `<div class="say">${esc(p.name)} kẹt ở Lost Island, còn ${p.island} lượt</div>
      <button class="pill big" type="button" data-a="roll">Đổ đôi để thoát</button>
      <button class="pill ghost" type="button" data-a="payIsland" ${p.money < CFG.ISLAND_FEE ? 'disabled' : ''}>Trả ${money(CFG.ISLAND_FEE)}</button>
      ${p.escapeCards ? '<button class="pill ghost" type="button" data-a="useCard">Dùng thẻ thoát đảo</button>' : ''}`;
  }
  hub.innerHTML = h; renderClock();
  hub.querySelectorAll('[data-a]').forEach((b) => { b.onclick = () => act(b.dataset.a, null, b); });
  if (st.kind === 'tour') {
    const ok = p.money >= CFG.TOUR_FEE;
    const targets = G.tourTargets(S, p), hasFreeCity = TILES.some((t) => t.type === 'city' && !S.props[t.i]);
    setPick('tour', new Set(ok ? targets : []), (i) => { clearPick(); act('tour', { tile: i }); },
      ok ? `${esc(p.name)}: ${hasFreeCity ? 'chọn thành phố chưa có chủ' : 'đã hết thành phố trống, chọn ô của bạn'} (vé ${shortK(CFG.TOUR_FEE)})` : `${esc(p.name)} không đủ ${shortK(CFG.TOUR_FEE)} mua vé`, 'Không bay');
  }
  if (st.kind === 'festival') {
    const next = CFG.FEST_MULT[Math.min(CFG.FEST_MULT.length - 1, (S.festLevel || 0) + 1)];
    const targets = G.festivalTargets(S, p).filter((i) => S.festival === i || p.money >= CFG.CHAMP_MOVE_FEE);
    setPick('festival', new Set(targets), (i) => { clearPick(); act('festival', { tile: i }); }, `${esc(p.name)}: chọn ô đang tổ chức để tăng hệ số, hoặc trả ${shortK(CFG.CHAMP_MOVE_FEE)} chuyển sang ô của bạn (x${next})`, 'Bỏ qua');
  }
  if (st.kind === 'debt') startSell(p);
  if (st.kind === 'card') {
    const lb = CARD_LABEL[st.card], label = Array.isArray(lb) ? lb[st.stage - 1] : lb;
    setPick('card', new Set(st.tiles), (i) => { clearPick(); act('card', { tile: i }); }, `${esc(p.name)}: ${label}${st.stage === 2 ? ` (${esc(TILES[st.mine].name)})` : ''}`, 'Bỏ qua');
  }
  renderModal();
}

function sheet(color, title, sub, body, acts) {
  return `<div class="sheet" style="--rc:${color}"><div class="ribbon">${title}${sub ? `<small>${sub}</small>` : ''}</div><div class="body">${body}</div><div class="acts">${acts}</div></div>`;
}
let pickLevel = 0;
function renderModal() {
  const m = $('#modal');
  if ($('#lobby').classList.contains('show')) return;
  if (S.phase === 'over') {
    const rank = S.players.slice().sort((a, b) => (a.bankrupt - b.bankrupt) || G.networth(S, b) - G.networth(S, a));
    const w = G.byId(S, S.winner), timeUp = /hết/.test(S.winReason);
    const resultActions = `${MODE === 'local' || me ? '<button class="pill" type="button" id="again">Chơi ván mới</button>' : ''}${MODE === 'net' && ROOM_GATE ? '<button class="pill red" type="button" id="result-exit">Thoát phòng</button>' : ''}`;
    m.innerHTML = sheet('#86a81f', timeUp ? `Hết giờ! ${esc(w.name)} thắng` : `${esc(w.name)} thắng!`, esc(S.winReason),
      `<table class="rank"><thead><tr><th></th><th>NGƯỜI CHƠI</th><th>TIỀN MẶT</th><th>TỔNG TÀI SẢN</th></tr></thead><tbody>${rank.map((p, k) => `<tr><td>${k + 1}</td><td>${esc(p.name)}</td><td>${p.bankrupt ? '—' : money(p.money)}</td><td>${p.bankrupt ? 'Phá sản' : money(G.networth(S, p))}</td></tr>`).join('')}</tbody></table>
`,
      resultActions);
    m.classList.add('show');
    if ($('#again')) $('#again').onclick = newGameFlow;
    if ($('#result-exit')) $('#result-exit').onclick = exitRoom;
    return;
  }
  const st = S.step, p = S.players[S.turn];
  if (!myTurn()) { m.classList.remove('show'); m.innerHTML = ''; return; }
  if (!busy && st && st.kind === 'flight') {
    const card = G.CARDS.find((x) => x.id === 'FLIGHT_TICKET');
    m.innerHTML = sheet('#f5a20a', esc(card.title), 'Chance', `<div class="chance"><p>${esc(card.text)}</p></div>`, '<button class="pill" type="button" id="ok">OK</button>');
    m.classList.remove('peek'); m.classList.add('show'); $('#ok').onclick = (e) => act('flight', null, e.currentTarget); return;
  }
  if (busy || !st || !['buy', 'upgrade', 'takeover'].includes(st.kind)) { m.classList.remove('show'); m.innerHTML = ''; return; }
  const col = seatOf[p.id].color;
  if (st.kind === 'buy' || st.kind === 'upgrade') {
    const i = st.kind === 'buy' ? p.pos : st.tile, t = TILES[i];
    const cur = st.kind === 'upgrade' ? S.props[i].level : -1;
    const resort = t.type === 'resort';
    // mua mới: Ô đất → Nhà 3; nâng cấp: cấp đã có thì khoá; đã có Nhà 3 thì chỉ còn Khách sạn
    let shown, choosable;
    const cap = G.maxBuild(p); // vòng 1 tối đa Nhà 1, vòng 2 Nhà 2, từ vòng 3 Nhà 3
    if (resort) { shown = [0]; choosable = [0]; }
    else if (st.kind === 'buy') { shown = [0, 1, 2, 3]; choosable = [0, 1, 2, 3].filter((l) => l <= cap); }
    else if (cur < 3) { shown = [0, 1, 2, 3]; choosable = [1, 2, 3].filter((l) => l > cur && l <= cap); }
    else { shown = [4]; choosable = [4]; }
    const costOf = (l) => (st.kind === 'buy' ? G.value(i, l) : G.upgradeCost(i, cur, l));
    const can = (l) => choosable.includes(l) && p.money >= costOf(l);
    if (!choosable.includes(pickLevel) || !can(pickLevel)) pickLevel = choosable.filter(can).pop() ?? choosable[0];
    const NAMES = G.LEVEL_NAMES;
    const bl = resort ? Math.min(4, beachLevel(p.id) + 1) : 0;
    const imageUrl = (l) => propertyThumbnail(resort ? 'resort' : 'city', resort ? bl : l, col);
    const rentAt = (l) => (resort ? CFG.RESORT_TOLL[bl] : G.toll(i, l));
    const card = (l) => {
      const built = st.kind === 'upgrade' && l <= cur, on = built || (l <= pickLevel && (choosable.includes(l) || l === 0 || (st.kind === 'buy'))), lock = built || !can(l);
      const lapLock = !built && l <= 3 && l > cap;
      const note = built ? 'Đã xây' : lapLock ? `🔒 Vòng ${CFG.LAP_CAP.indexOf(l) + 1}` : choosable.includes(l) ? money(costOf(l)) : '';
      return `<button type="button" data-l="${l}" class="${on ? 'on' : ''}" ${lock ? 'disabled' : ''} style="${!built && !can(l) ? 'opacity:.45' : ''}">
        <img alt="" src="${imageUrl(l)}"><b>${resort ? boardMeta().resortLevels[bl - 1] : NAMES[l]}</b><span>${note}</span><i class="tick${on ? ' y' : ''}" aria-hidden="true"></i></button>`;
    };
    const price = costOf(pickLevel);
    const body = `<div class="lv" style="--n:${shown.length}">${shown.map(card).join('')}</div>
      <div class="sum"><div>Tiền thuê<strong>${money(rentAt(pickLevel))}</strong></div><div style="text-align:right">Bạn có<strong>${money(p.money)}</strong></div></div>
      ${resort || pickLevel >= CFG.LANDMARK ? '' : `<div class="kv"><span>Giá mua lại</span><b>${money(G.value(i, pickLevel) * CFG.BUYOUT_MULT)}</b></div>`}`;
    const verb = st.kind === 'buy' ? 'Mua với giá' : cur === 3 ? 'Xây khách sạn ·' : 'Nâng cấp ·';
    m.innerHTML = sheet(t.group ? GROUPS[t.group].color : RESORT_COLOR, esc(t.name), esc(t.group ? GROUPS[t.group].name : 'Bãi biển'), body,
      `<button class="pill ghost" type="button" id="no">${st.kind === 'buy' ? 'Không mua' : 'Để sau'}</button><button class="pill" type="button" id="yes" ${can(pickLevel) ? '' : 'disabled'}>${verb} ${money(price)}</button>`);
    m.querySelectorAll('[data-l]').forEach((b) => { b.onclick = () => { const l = Number(b.dataset.l); if (can(l)) { pickLevel = l; renderModal(); } }; });
    $('#no').onclick = (e) => act('skip', null, e.currentTarget);
    $('#yes').onclick = (e) => act(st.kind, { level: pickLevel }, e.currentTarget);
  } else if (st.kind === 'takeover') {
    const pr = S.props[st.tile], owner = G.byId(S, pr.owner);
    const imageUrl = propertyThumbnail('city', pr.level, col);
    m.innerHTML = sheet('#f5a20a', 'Mua lại?', `${esc(TILES[st.tile].name)} của ${esc(owner.name)}`, `<div class="tinfo"><div class="pic"><img alt="" src="${imageUrl}"></div><div>
      <p style="margin:2px 0 6px">Nhận luôn <b>${G.LEVEL_NAMES[pr.level]}</b></p>
      <div class="kv"><span>Giá mua lại</span><b>${money(st.price)}</b></div><div class="kv"><span>Bạn có</span><b>${money(p.money)}</b></div>
      </div></div>`,
      `<button class="pill ghost" type="button" id="no">Thôi</button><button class="pill" type="button" id="yes">Mua lại</button>`);
    $('#no').onclick = (e) => act('skip', null, e.currentTarget); $('#yes').onclick = (e) => act('takeover', null, e.currentTarget);
  }
  m.classList.add('show');
}
async function showCard(card) {
  const m = $('#modal'), mine = isMe(card.pid), who = G.byId(S, card.pid);
  // chỉ người rút thẻ có nút OK; người khác xem rồi popup tự tắt
  m.innerHTML = sheet('#f5a20a', esc(card.title), mine ? 'Chance' : `Chance · ${esc(who ? who.name : '')}`, `<div class="chance"><p>${esc(card.text)}</p></div>`, mine ? '<button class="pill" type="button" id="ok">OK</button>' : '');
  m.classList.add('show'); m.classList.toggle('peek', !mine);
  await new Promise((res) => { const t = setTimeout(res, mine ? 3200 : 2600); if (mine) $('#ok').onclick = () => { clearTimeout(t); res(); }; });
  m.classList.remove('show', 'peek');
}
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }

/* ---------------- thông báo toàn màn hình ---------------- */
// mine: thông báo cho chính người đó; người khác thấy kèm tên
const NOTICE = {
  cantPay: (mine, n) => (mine ? 'Bạn không có đủ tiền thanh toán' : `${n} không có đủ tiền thanh toán`),
  noTakeover: (mine, n) => (mine ? 'Bạn không có đủ tiền mua tài sản này' : `${n} không có đủ tiền mua tài sản này`),
  tour: (mine, n) => (mine ? `World Tour! Lượt sau bạn được bay tới ${G.RULES.RULE_TEXT.TOUR_DESTINATION}` : `${n} tới World Tour — lượt sau được bay tới ${G.RULES.RULE_TEXT.TOUR_DESTINATION}`),
  festival: (mine, n, x) => `Lễ hội ở ${TILES[x.tile].name}! Tiền thuê x${x.mult}`,
  vipUsed: (mine, n, x) => `${mine ? 'Bạn đã' : `${n} đã`} sử dụng thẻ miễn tiền thuê tại ${TILES[x.tile].name} — miễn ${money(x.amount)}`,
  escapeUsed: (mine, n) => `${mine ? 'Bạn đã' : `${n} đã`} sử dụng thẻ Thoát đảo`,
};
async function showStatus(text, ms = 1900) {
  const el = $('#status'); el.innerHTML = `<p>${esc(text)}</p>`;
  el.classList.add('show'); await sleep(REDUCED ? 1200 : ms); el.classList.remove('show'); await sleep(260);
}
async function showAchievement(event) {
  const el = $('#achievement'), p = G.byId(S, event.pid), who = isMe(event.pid) ? 'Bạn' : (p ? p.name : 'Một người chơi');
  const missing = (event.missing || []).map((i) => TILES[i] && TILES[i].name).filter(Boolean).join(', ');
  let icon = '🏆', title = 'MONOPOLY!', detail = `${who} đã hoàn thành một Monopoly.`;
  if (event.kind === 'monopoly') detail = `${who} hoàn thành độc quyền ${GROUPS[event.group] ? GROUPS[event.group].name : 'một vùng'}.`;
  if (event.kind === 'tripleReady') { icon = '⚠️'; title = 'SẮP THẮNG!'; detail = `${who} đã có 2/3 Monopoly — chỉ còn một vùng để thắng Triple Monopoly.`; }
  if (event.kind === 'lineReady') { icon = '⚠️'; title = 'LINE MONOPOLY'; detail = `${who} chỉ còn thiếu ${missing} để độc quyền ${event.sideName || 'một cạnh bàn cờ'}.`; }
  if (event.kind === 'resortReady') { icon = '⚠️'; title = 'RESORT MONOPOLY'; detail = `${who} đã có 3/4 bãi biển — chỉ còn ${missing} để thắng.`; }
  const warn = event.kind !== 'monopoly';
  el.innerHTML = `<div class="achievement-card${warn ? ' warn' : ''}"><div class="achievement-icon">${icon}</div><h2>${esc(title)}</h2><p>${esc(detail)}</p></div>`;
  el.classList.add('show');
  await sleep(REDUCED ? 1400 : 2400);
  el.classList.remove('show');
  await sleep(220);
}
let turnNoticeKey = '';
async function showTurnNotice() {
  if (S.phase !== 'play' || !curP()) return;
  const p = curP(), key = `${S.startedAt}:${S.round}:${p.id}`;
  if (MODE === 'net' && !isMe(p.id)) return;
  if (key === turnNoticeKey) return;
  turnNoticeKey = key;
  playTurnSound();
  const text = MODE === 'net' ? 'Đến lượt bạn!' : `Đến lượt ${p.name}!`;
  await showStatus(text, 1500);
}

/* ---------------- bán đất khi thiếu tiền (kiểu Business Tour) ---------------- */
let sell = null; // { pid, picked:Set }
function startSell(p) {
  if (!sell || sell.pid !== p.id) sell = { pid: p.id, picked: new Set() };
  const own = G.ownedBy(S, p.id);
  board.highlight(own, 'sell');
  pickable = { set: new Set(own), cb: (i) => { sell.picked.has(i) ? sell.picked.delete(i) : sell.picked.add(i); drawSell(); } };
  $('#selltags').innerHTML = own.map((i) => `<div class="stag" data-i="${i}"><i></i>${shortK(G.sellValue(S, i))}</div>`).join('');
  $('#selltags').querySelectorAll('.stag').forEach((el) => { el.onclick = () => pickable && pickable.cb(Number(el.dataset.i)); });
  drawSell(); placeSellTags();
}
function drawSell() {
  if (!sell) return;
  const p = G.byId(S, sell.pid), d = S.pending || { amount: 0, why: '' }, need = Math.max(0, d.amount - p.money), got = [...sell.picked].reduce((a, i) => a + G.sellValue(S, i), 0);
  const left = p.money + got - d.amount;
  $('#selltags').querySelectorAll('.stag').forEach((el) => el.classList.toggle('on', sell.picked.has(Number(el.dataset.i))));
  const b = $('#sellbox');
  b.innerHTML = `<h3>Chọn thành phố để bán</h3>
    <div class="ln">Số tiền cần: <b>${money(need)}</b></div>
    <div class="ln">Tiền còn lại sau khi bán: <b class="${left >= 0 ? 'ok' : 'bad'}">${left < 0 ? '−' : ''}${money(Math.abs(left))}</b></div>
    <div class="msg">${esc(p.name)} cần trả ${money(d.amount)} ${esc(d.why)} nhưng chỉ có ${money(p.money)}. Hãy bán tài sản.</div>
    <div class="btns"><button class="pill red" type="button" id="sbk">Phá sản</button><button class="pill ghost" type="button" id="sauto">Bán tự động</button><button class="pill" type="button" id="sgo" ${sell.picked.size ? '' : 'disabled'}>Bán</button></div>`;
  b.classList.add('show');
  $('#sbk').onclick = () => { endSell(); act('bankrupt'); };
  $('#sauto').onclick = () => { sell.picked = autoPick(p); drawSell(); doSell(true); };
  $('#sgo').onclick = () => doSell(false);
}
// chọn ít đất nhất đủ trả nợ: một ô rẻ nhất đủ tiền, nếu không thì gom từ ô đắt nhất
function autoPick(p) {
  const need = (S.pending ? S.pending.amount : 0) - p.money, own = G.ownedBy(S, p.id).sort((a, b) => G.sellValue(S, a) - G.sellValue(S, b));
  const one = own.find((i) => G.sellValue(S, i) >= need);
  if (one !== undefined) return new Set([one]);
  const pick = new Set(); let sum = 0;
  for (const i of own.slice().reverse()) { if (sum >= need) break; pick.add(i); sum += G.sellValue(S, i); }
  return pick;
}
async function doSell(autoBankrupt = false) {
  if (!sell || busy) return;
  const p = G.byId(S, sell.pid), debt = S.pending ? S.pending.amount : 0;
  const list = [...sell.picked].sort((a, b) => G.sellValue(S, a) - G.sellValue(S, b));
  const mustBankrupt = autoBankrupt && p.money + list.reduce((sum, i) => sum + G.sellValue(S, i), 0) < debt;
  endSell();
  for (const i of list) { if (!S.step || S.step.kind !== 'debt') break; await act('sell', { tile: i }); }
  if (mustBankrupt) await act('bankrupt');
}
function endSell() { sell = null; $('#sellbox').classList.remove('show'); $('#selltags').innerHTML = ''; }
function placeSellTags() {
  if (!sell) return;
  $('#selltags').querySelectorAll('.stag').forEach((el) => {
    const i = Number(el.dataset.i), q = board.tileScreen(i, i % 2 ? 1.75 : 1.0); // so le để nhãn ô cạnh nhau không chồng
    el.style.left = q.x + 'px'; el.style.top = q.y + 'px';
  });
}

/* ---------------- thẻ thông tin ô (bấm vào ô) ---------------- */
const NEUTRAL = '#9aa4b1';
const xBtn = '<button class="x" type="button" id="infox" aria-label="Đóng">×</button>';
function showInfo(i) {
  const t = TILES[i], pr = S.props[i], owner = pr && G.byId(S, pr.owner), hex = owner ? seatOf[owner.id].color : NEUTRAL;
  const flag = (S.bonus || []).includes(i);
  const p = S.players[S.turn];
  let color, sub, body;
  const notes = [];
  if (flag) notes.push(`🎏 Ô cắm cờ lễ hội: tiền thuê x${CFG.BONUS_MULT} suốt ván`);
  if (S.festival === i) notes.push(`🎉 Đang tổ chức lễ hội: tiền thuê x${G.festMult(S)}`);
  if (pr && G.outaged(S, i)) notes.push(`⚡ Mất điện tới hết vòng ${S.outage[i] - 1}: không thu tiền thuê`);
  if (t.type === 'city') {
    color = GROUPS[t.group].color; sub = `${GROUPS[t.group].name} · ${owner ? 'của ' + esc(owner.name) : 'chưa có chủ'}`;
    const lv = pr ? pr.level : -1;
    const rows = [0, 1, 2, 3, 4].map((l) => `<tr class="${l === lv ? 'cur' : ''}"><td><span class="ck">${l <= lv ? '✓' : ''}</span>${G.LEVEL_NAMES[l]}</td>
      <td>${money(G.value(i, l))}</td><td>${money(G.toll(i, l))}</td><td>${money(G.value(i, l) * CFG.SELL_MULT)}</td></tr>`).join('');
    if (pr && G.ownsGroup(S, pr.owner, t.group)) notes.push(`Độc quyền nhóm ${GROUPS[t.group].name}: tiền thuê x${CFG.MONOPOLY_MULT}`);
    const citySnapshot = propertyThumbnail('city', Math.max(0, lv), hex);
    body = `<div class="tinfo"><div class="pic"><img alt="" src="${citySnapshot}"></div><div>
      <table class="lvl"><thead><tr><th>Công trình</th><th>Giá theo cấp</th><th>Tiền thuê</th><th>Bán ngân hàng</th></tr></thead><tbody>${rows}</tbody></table>
      ${pr ? `<div class="kv"><span>Tiền thuê hiện tại</span><b>${money(G.rentOf(S, i))}</b></div>
        <div class="kv"><span>Giá mua lại</span><b>${G.canTakeover(S, i) ? money(G.takeoverPrice(S, i)) : 'Không thể mua lại'}</b></div>` : ''}
    </div></div>`;
  } else if (t.type === 'resort') {
    color = RESORT_COLOR; sub = `Bãi biển · ${owner ? 'của ' + esc(owner.name) : 'chưa có chủ'}`;
    const n = pr ? beachLevel(pr.owner) : 0;
    const rows = [1, 2, 3, 4].map((k) => `<tr class="${k === n ? 'cur' : ''}"><td><span class="ck">${k <= n ? '✓' : ''}</span>${k} bãi biển · ${boardMeta().resortLevels[k - 1]}</td><td>${money(CFG.RESORT_TOLL[k])}</td></tr>`).join('');
    const resortSnapshot = propertyThumbnail('resort', Math.max(1, n), hex);
    body = `<div class="tinfo"><div class="pic"><img alt="" src="${resortSnapshot}"></div><div>
      <table class="lvl"><thead><tr><th>Số bãi cùng chủ</th><th>Tiền thuê</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="kv"><span>Giá mua</span><b>${money(t.price)}</b></div>
      <div class="kv"><span>Bán ngân hàng</span><b>${money(t.price * CFG.SELL_MULT)}</b></div>
      ${pr ? `<div class="kv"><span>Tiền thuê hiện tại</span><b>${money(G.rentOf(S, i))}</b></div>` : ''}
    </div></div>`;
  } else {
    const fest = S.festival !== null && S.festival !== undefined ? `Hiện đang có lễ hội x${G.festMult(S)} ở ${esc(TILES[S.festival].name)}.` : 'Hiện chưa có lễ hội nào.';
    const nextMult = CFG.FEST_MULT[Math.min(CFG.FEST_MULT.length - 1, (S.festLevel || 0) + 1)];
    const taxNow = p ? Math.max(CFG.TAX_MIN, Math.round(G.taxBase(S, p) * CFG.TAX_RATE / 10) * 10) : 0;
    const info = G.RULES.TILE_INFO[t.type];
    const vars = {
      salary: money(CFG.SALARY), maxDoubles: CFG.MAX_DOUBLES, islandTurns: CFG.ISLAND_TURNS,
      islandFee: money(CFG.ISLAND_FEE), champMoveFee: money(CFG.CHAMP_MOVE_FEE),
      maxRentMult: CFG.MAX_RENT_MULT, nextFestivalMult: nextMult, currentFestival: fest,
      tourFee: money(CFG.TOUR_FEE), taxRate: Math.round(CFG.TAX_RATE * 100),
      taxPreview: p ? `Nếu ${esc(p.name)} dừng ở đây lúc này sẽ nộp <b>${money(taxNow)}</b>.` : '',
    };
    const fill = (line) => line.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
    const lines = info.items.flatMap((line) => line === '{chanceCards}'
      ? G.CARDS.map((c) => `<b>${esc(c.title)}</b>: ${esc(c.text)}`)
      : [fill(line)]).filter(Boolean);
    color = info.color; sub = info.subtitle;
    body = `<ul class="rules">${lines.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  }
  const el = $('#info');
  el.innerHTML = `<div class="sheet" style="--rc:${color}"><div class="ribbon">${esc(t.type === 'chance' ? 'CHANCE' : t.name.toUpperCase())}<small>${sub}</small></div>${xBtn}
    <div class="body">${body}${notes.length ? `<div style="margin-top:10px">${notes.map((n) => `<p class="note" style="margin:4px 0">${n}</p>`).join('')}</div>` : ''}</div></div>`;
  el.classList.add('show');
  $('#infox').onclick = hideInfo; $('#infox').focus();
}
function hideInfo() { $('#info').classList.remove('show'); }
$('#info').addEventListener('click', (e) => { if (e.target.id === 'info') hideInfo(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') { hideInfo(); hideRulebook(); $('#soundpanel').classList.remove('show'); } });

/* ---------------- hành động & hoạt ảnh ---------------- */
const seen = { dice: null, move: -1, card: null, notice: null, reaction: null, achievement: -1 };
function markSeen() { seen.dice = S.dice && S.dice.seq; seen.move = S.moves.reduce((a, m) => Math.max(a, m.seq), -1); seen.card = S.lastCard && S.lastCard.seq; seen.notice = S.notice && S.notice.seq; seen.reaction = S.reaction && S.reaction.seq; seen.achievement = (S.achievements || []).reduce((a, x) => Math.max(a, x.seq), -1); }
let sending = false;
async function act(type, data, sourceButton = null) {
  if (busy || sending) return;
  if (MODE === 'net') { // gửi server; phản hồi mang state mới, SSE vẫn là kênh đồng bộ dự phòng
    sending = true;
    const oldButtonHtml = sourceButton && sourceButton.innerHTML;
    if (sourceButton) { sourceButton.disabled = true; sourceButton.classList.add('pending'); sourceButton.textContent = 'Đang xử lý…'; }
    try {
      const result = await api('api/act', { token: me && me.token, type, data: data || {} });
      // Không phụ thuộc hoàn toàn vào SSE: phản hồi hành động mang luôn state mới để
      // nút Mua/Nâng cấp đóng ngay cả khi luồng sự kiện trên mạng di động tới chậm.
      if (result.state) onState(result.state);
      else if (sourceButton && sourceButton.isConnected) { sourceButton.disabled = false; sourceButton.classList.remove('pending'); sourceButton.innerHTML = oldButtonHtml; }
    } catch (e) {
      toast(e.message);
      if (sourceButton && sourceButton.isConnected) { sourceButton.disabled = false; sourceButton.classList.remove('pending'); sourceButton.innerHTML = oldButtonHtml; }
    } finally { sending = false; }
    return;
  }
  const p = S.players[S.turn];
  try { G.act(S, p.id, type, data || {}); } catch (e) { toast(e.message); return; }
  await playOut();
}
// chạy hoạt ảnh cho mọi thay đổi kể từ lần xem trước: xúc xắc, di chuyển, thẻ, xây nhà, tiền, thông báo
async function playOut() {
  busy = true; hideInfo(); $('#modal').classList.remove('show'); renderHub();
  const diceNew = S.dice && S.dice.seq !== seen.dice ? S.dice : null;
  const moves = S.moves.filter((m) => m.seq > seen.move).sort((a, b) => a.seq - b.seq);
  const card = S.lastCard && S.lastCard.seq !== seen.card ? S.lastCard : null;
  const notice = S.notice && S.notice.seq !== seen.notice ? S.notice : null;
  const reaction = S.reaction && S.reaction.seq !== seen.reaction ? S.reaction : null;
  // Khi ván đã có người thắng, ưu tiên duy nhất màn kết quả; không phát lại các mốc "sắp thắng" vừa sinh cùng hành động cuối.
  const achievements = S.phase === 'over' ? [] : (S.achievements || []).filter((x) => x.seq > seen.achievement).sort((a, b) => a.seq - b.seq);
  markSeen();
  if (diceNew) { await board.rollDice(diceNew.a, diceNew.b); showDiceSum(diceNew.a + diceNew.b, diceNew.a === diceNew.b); await sleep(200); }
  for (const mv of moves) {
    if (!S.players.some((p) => p.id === mv.pid)) continue;
    if (mv.jump) {
      await board.moveToken(mv.pid, mv.path, { jump: true, view: S }); await sleep(300);
    } else {
      const forward = (mv.path[0] - mv.from + 32) % 32 === 1;
      await board.moveToken(mv.pid, mv.path, { view: S, onStep: (pos) => { if (forward && pos === 0) bumpMoney(mv.pid, CFG.SALARY); } });
    }
    await sleep(120);
  }
  // Người rút Vé máy bay xác nhận bằng modal trạng thái `flight`; sau OK server mới tạo bước di chuyển.
  if (card && !(card.id === 'FLIGHT_TICKET' && isMe(card.pid))) await showCard(card);
  const wait = await board.sync(S); renderCards(wait);
  if (reaction && reaction.kind === 'happyRent') showHappyReaction(reaction.pid);
  for (const achievement of achievements) await showAchievement(achievement);
  if (notice && S.phase === 'play') {
    const who = G.byId(S, notice.pid);
    await sleep(Math.min(moneyMs(), 900));
    if (notice.kind === 'festival') board.effect('confetti', notice.tile);
    await showStatus(NOTICE[notice.kind](isMe(notice.pid), who ? who.name : '', notice));
  }
  busy = false; pickLevel = 0;
  if (MODE === 'local') { G.checkTime(S, Date.now()); save(); }
  await showTurnNotice();
  renderHub();
}
// dựng lại toàn bộ bàn theo trạng thái hiện tại, không hoạt ảnh (ván mới, vào giữa ván, đổi người chơi)
function resetView() {
  seatSetup(); markSeen(); endSell(); clearPick();
  board.reset(S);
  for (const k in target) delete target[k];
  for (const k in shown) delete shown[k];
  renderCards(); renderHub(); renderLobby();
  void showTurnNotice();
}

/* ---------------- chế độ mạng: API + SSE ---------------- */
async function api(path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const r = await fetch(roomEndpoint(location.href, path, ROOM), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), signal: controller.signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Mất kết nối tới server');
    return j;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Mạng phản hồi quá chậm, hãy bấm lại');
    throw e;
  } finally { clearTimeout(timeout); }
}
const ME_KEY = 'tt-monopoly-me';
const NAME_KEY = 'tt-monopoly-name';
const meKey = () => `${ME_KEY}:${ROOM || 'main'}`;
function loadMe() { try { return JSON.parse(localStorage.getItem(meKey()) || 'null'); } catch (e) { return null; } }
function setMe(m, reconnect = true) { me = m; try { m ? localStorage.setItem(meKey(), JSON.stringify(m)) : localStorage.removeItem(meKey()); } catch (e) { /* bỏ qua */ } if (reconnect) connect(); }
let es = null, connectionEpoch = 0;
function connect() {
  const epoch = ++connectionEpoch;
  if (es) es.close();
  const source = new EventSource(roomEndpoint(location.href, 'events', ROOM, me ? { token: me.token } : (WATCH_MODE ? { viewer: lobbyDraftName } : {})));
  es = source;
  source.onopen = () => { if (epoch === connectionEpoch) $('#conn').classList.remove('show'); };
  source.onerror = () => { if (epoch === connectionEpoch) $('#conn').classList.add('show'); };
  source.onmessage = (e) => {
    if (epoch !== connectionEpoch) return;
    const d = JSON.parse(e.data); presence = d.presence || {}; viewers = d.viewers || []; proxySec = d.proxySec || 15; skew = d.now - Date.now(); renderWatchBadge(); onState(d.state, epoch);
    if (ROOM_GATE) autoJoinRoom(d.state);
  };
}
async function autoJoinRoom(state) {
  if (!pendingJoinName || me || joiningRoom) return;
  const cleanPending = pendingJoinName.replace(/\s+/g, ' ').trim().toLowerCase();
  const existing = state.players.find((p) => p.name.toLowerCase() === cleanPending);
  if (state.phase !== 'lobby' && !existing) { lobbyDraftName = pendingJoinName; pendingJoinName = ''; return; }
  if (state.players.length >= CFG.MAX_PLAYERS && !existing) { lobbyDraftName = pendingJoinName; pendingJoinName = ''; return; }
  const pet = (G.PETS.find((x) => !state.players.some((p) => p.pet === x.id)) || {}).id;
  const name = pendingJoinName, mapId = pendingRoomMap;
  joiningRoom = true;
  try {
    acceptSession(await api('api/join', { name, pet, mapId }));
    pendingJoinName = '';
    pendingRoomMap = '';
  } catch (e) {
    pendingJoinName = '';
    pendingRoomMap = '';
    lobbyDraftName = name;
    toast(e.message);
    renderLobby();
  } finally { joiningRoom = false; }
}
function acceptSession(session) {
  if (session.rejoined) toast('Đã vào lại ghế cũ');
  WATCH_MODE = false;
  setMe({ id: session.id, token: session.token });
}
const queue = []; let draining = false;
function onState(ns, epoch = connectionEpoch) {
  if (epoch !== connectionEpoch) return;
  const newest = queue.length ? queue[queue.length - 1].state : S;
  if (newest && ns.version < newest.version) return;
  queue.push({ state: ns, epoch }); if (!draining) drain();
}
async function drain() {
  draining = true;
  while (queue.length) {
    const item = queue.length > 4 ? queue.splice(0).pop() : queue.shift(); // tụt lại quá xa thì nhảy thẳng tới bản mới nhất
    if (item.epoch !== connectionEpoch) continue;
    const ns = item.state;
    if (ns.version < S.version) continue; // không cho gói SSE cũ kéo giao diện lùi trạng thái
    const ids = (x) => x.players.map((p) => p.id).join();
    const fresh = ns.phase === 'lobby' || ns.startedAt !== S.startedAt || ids(ns) !== ids(S);
    const same = ns.version === S.version && !fresh;
    S = ns;
    if (me && !S.players.some((p) => p.id === me.id)) setMe(null); // ghế của mình không còn (rời phòng)
    seatSetup();
    if (same) { renderCards(); renderHub(); renderLobby(); continue; } // chỉ đổi trạng thái online
    if (fresh) {
      if (mapEntry(S.settings && S.settings.mapId).id !== boardMapId) { await prepareBoard(S.settings.mapId); if (item.epoch !== connectionEpoch) continue; }
      resetView(); continue;
    }
    await playOut();
    if (item.epoch !== connectionEpoch) continue;
    renderLobby();
  }
  draining = false;
}

/* ---------------- phòng chờ: chọn tên, nhân vật, thời lượng ---------------- */
// link mời + mã QR (server trả về link Tailscale/LAN của máy chủ)
let invite = [];
async function loadInvite() { try { const r = await fetch(roomEndpoint(location.href, 'api/info', ROOM), { cache: 'no-store' }); invite = (await r.json()).links || []; renderLobby(); } catch (e) { /* bỏ qua */ } }
function inviteBox() {
  if (!invite.length) return '';
  const q = qrcode(0, 'M'); q.addData(invite[0].url); q.make();
  return `<div class="invite"><div class="qr">${q.createSvgTag({ cellSize: 4, margin: 2, scalable: true })}</div><div class="inv">
    <b>Mời cả nhà${ROOM ? ` · Phòng ${esc(ROOM)}` : ''}</b><span>Quét mã hoặc mở link trên điện thoại, máy tính:</span>
    ${invite.map((l, k) => `<a href="${esc(l.url)}" target="_blank" rel="noopener"${k ? ' class="sub"' : ''}>${esc(l.url)}</a>${k ? '' : `<em>${esc(l.kind)}</em>`}`).join('')}</div></div>`;
}
const timeLabel = (m) => (m % 60 ? `${Math.floor(m / 60)} giờ ${m % 60}` : `${m / 60} giờ`);
const petImg = (id) => `thumbnails/static/pet-${id}.png?v=${PROPERTY_THUMBNAIL_VERSION.slice(0, 12)}`;
let localDraft = null;   // chế độ một máy: [{ name, pet }]
let lobbyOpen = false;   // chế độ một máy: đang mở phòng chờ
let lobbyDraftName = ''; // chế độ mạng: tên đang gõ dở khi đổi nhân vật
function renderLobby() {
  const el = $('#lobby');
  const show = MODE === 'net' ? (!WATCH_MODE && (S.phase === 'lobby' || (S.phase === 'play' && !me))) : lobbyOpen;
  el.classList.toggle('show', show);
  if (!show) return;
  if (MODE === 'local') return lobbyLocal(el);
  if (S.phase === 'play') return lobbyClaim(el);
  return lobbyNet(el);
}
function renderWatchBadge() {
  const el = $('#watchbadge');
  const names = viewers.length ? viewers : (WATCH_MODE && lobbyDraftName ? [lobbyDraftName] : []);
  el.innerHTML = names.map((name) => `<div class="watcher-card${WATCH_MODE && name === lobbyDraftName ? ' me' : ''}"><span class="watcher-eye" aria-hidden="true">👁</span><span><b>${esc(name)}</b><small>Đang theo dõi${WATCH_MODE && name === lobbyDraftName ? ' · bạn' : ''}</small></span></div>`).join('');
  el.classList.toggle('show', names.length > 0);
}
const petGrid = (sel, taken, attr) => `<div class="pets">${G.PETS.map((x) => `<button type="button" class="pet${x.id === sel ? ' on' : ''}" ${attr}="${x.id}" ${taken.has(x.id) && x.id !== sel ? 'disabled' : ''} style="--c:${x.c}"><img alt="" src="${petImg(x.id)}"><span>${x.n}</span></button>`).join('')}</div>`;
const timeRow = (cur, attr) => `<div class="times">${CFG.TIME_OPTIONS.map((m) => `<button type="button" class="pill ${m === cur ? '' : 'ghost'}" ${attr}="${m}">${timeLabel(m)}</button>`).join('')}</div>`;
const turnRow = (cur, attr) => `<div class="times">${CFG.TURN_OPTIONS.map((v) => `<button type="button" class="pill ${v === cur ? '' : 'ghost'}" ${attr}="${v}">${v} giây</button>`).join('')}</div>`;
const mapRow = (cur) => `<div class="map-options">${MAPS.map((map) => `<button type="button" class="map-option${map.id === cur ? ' on' : ''}" data-map="${map.id}"><span class="map-thumb"><img alt="Xem trước ${esc(map.name)}" src="${esc(map.preview)}"></span><span><b>${esc(map.name)}</b><small>${esc(map.description)}${map.default ? ' · Mặc định' : ''}</small></span></button>`).join('')}</div>`;
function renderGateMapPreview() {
  const map = MAPS.find((item) => item.id === $('#gmap').value) || MAPS[0];
  $('#gmap-preview').innerHTML = `<img src="${esc(map.preview)}" alt="Ảnh xem trước ${esc(map.name)}"><span><b>${esc(map.name)}${map.default ? ' (Mặc định)' : ''}</b><small>${esc(map.description)}</small></span>`;
}
function lobbyNet(el) {
  const mine = me && G.byId(S, me.id), amHost = !!mine && S.hostId === mine.id, taken = new Set(S.players.map((p) => p.pet));
  const currentMap = MAPS.find((map) => map.id === S.settings.mapId) || MAPS[0];
  const list = S.players.map((p) => {
    const on = !!p.bot || !!(presence[p.id] && presence[p.id].on);
    const remove = amHost && p.bot ? `<button type="button" class="kick" data-remove-bot="${p.id}" aria-label="Xóa ${esc(p.name)}">×</button>`
      : amHost && !isMe(p.id) && !on ? `<button type="button" class="kick" data-kick="${p.id}" aria-label="Mời ${esc(p.name)} ra khỏi phòng">×</button>` : '';
    return `<li style="--c:${p.color}"><img alt="" src="${petImg(p.pet)}"><b>${esc(p.name)}</b>${p.id === S.hostId ? '<em class="host">HOST</em>' : ''}${p.bot ? '<em class="bot">BOT</em>' : isMe(p.id) ? '<em>bạn</em>' : ''}<i class="dot${on ? ' on' : ''}" title="${p.bot ? 'Bot tự động' : on ? 'Đang online' : 'Mất kết nối'}"></i>${remove}</li>`;
  }).join('');
  if (!mine) {
    const pet = (S.players.length < CFG.MAX_PLAYERS) && (lobbyNet.pick && !taken.has(lobbyNet.pick) ? lobbyNet.pick : (G.PETS.find((x) => !taken.has(x.id)) || {}).id);
    lobbyNet.pick = pet;
    el.innerHTML = sheet('#2c8ff0', 'Thái Thịnh Monopoly', 'Phòng chờ', S.players.length >= CFG.MAX_PLAYERS ? `<p class="center">Phòng đã đủ ${CFG.MAX_PLAYERS} người.</p><ul class="who">${list}</ul>` :
      `<label class="fld">Tên của bạn<input id="lname" maxlength="16" autocomplete="nickname" value="${esc(lobbyDraftName || '')}" placeholder="Ví dụ: Bố"></label>
       <div class="fld">Chọn nhân vật</div>${petGrid(pet, taken, 'data-pet')}
       ${S.players.length ? `<div class="fld">Đang trong phòng</div><ul class="who">${list}</ul>` : ''}${inviteBox()}`,
      S.players.length >= CFG.MAX_PLAYERS ? '' : '<button class="pill big" type="button" id="ljoin">Vào phòng</button>');
    el.querySelectorAll('[data-pet]').forEach((b) => { b.onclick = () => { lobbyDraftName = $('#lname').value; lobbyNet.pick = b.dataset.pet; renderLobby(); }; });
    const join = async () => {
      const name = $('#lname').value.trim(); if (!name) { toast('Hãy nhập tên'); return $('#lname').focus(); }
      try { acceptSession(await api('api/join', { name, pet: lobbyNet.pick })); } catch (e) { toast(e.message); }
    };
    if ($('#ljoin')) { $('#ljoin').onclick = join; $('#lname').onkeydown = (e) => { if (e.key === 'Enter') join(); }; }
    return;
  }
  el.innerHTML = sheet('#2c8ff0', 'Thái Thịnh Monopoly', 'Phòng chờ', `<ul class="who">${list}</ul>
    <div class="fld">Đổi nhân vật</div>${petGrid(mine.pet, taken, 'data-pet')}
    ${amHost ? `${S.players.length < CFG.MAX_PLAYERS ? '<button class="add-bot" type="button" id="lbot">🤖 + Thêm bot</button>' : ''}<div class="fld">Bản đồ</div>${mapRow(S.settings.mapId || MAPS[0].id)}
    <div class="fld">Thời lượng ván</div>${timeRow(S.settings.timeLimitMin, 'data-t')}
    <div class="fld">Thời gian mỗi lượt</div>${turnRow(S.settings.turnSec || CFG.TURN_SEC, 'data-ts')}` : `<div class="room-readonly"><b>Host đang cài đặt phòng</b><span>${esc(currentMap.name)} · ${timeLabel(S.settings.timeLimitMin)} · ${S.settings.turnSec || CFG.TURN_SEC} giây/lượt</span></div>`}
    ${inviteBox()}`,
    `<button class="pill ghost" type="button" id="lleave">Rời phòng</button>${amHost ? `<button class="pill big" type="button" id="lstart" ${S.players.length < 2 ? 'disabled' : ''}>Bắt đầu</button>` : '<span class="host-wait">Chờ host bắt đầu…</span>'}`);
  const send = (type, data) => api('api/act', { token: me.token, type, data }).then((result) => { if (result.state) onState(result.state); return result; }).catch((e) => { toast(e.message); return null; });
  el.querySelectorAll('[data-pet]').forEach((b) => { b.onclick = () => send('pet', { pet: b.dataset.pet }); });
  el.querySelectorAll('[data-kick]').forEach((b) => { b.onclick = () => send('kick', { id: b.dataset.kick }); });
  el.querySelectorAll('[data-remove-bot]').forEach((b) => { b.onclick = () => send('removeBot', { id: b.dataset.removeBot }); });
  el.querySelectorAll('[data-map]').forEach((b) => { b.onclick = () => send('settings', { mapId: b.dataset.map }); });
  el.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => send('settings', { timeLimitMin: Number(b.dataset.t) }); });
  el.querySelectorAll('[data-ts]').forEach((b) => { b.onclick = () => send('settings', { turnSec: Number(b.dataset.ts) }); });
  $('#lleave').onclick = () => send('leave').then((result) => { if (result) exitRoom(); });
  if ($('#lbot')) $('#lbot').onclick = () => send('addBot');
  if ($('#lstart')) $('#lstart').onclick = () => send('start');
}
// vào giữa ván từ thiết bị khác: nhận lại ghế đang mất kết nối, hoặc chỉ xem
function lobbyClaim(el) {
  const off = S.players.filter((p) => !p.bot && !p.bankrupt && !(presence[p.id] && presence[p.id].on));
  el.innerHTML = sheet('#2c8ff0', 'Ván đang diễn ra', 'Bạn là ai?', off.length ? `<div class="pets">${off.map((p) => `<button type="button" class="pet" data-id="${p.id}" style="--c:${p.color}"><img alt="" src="${petImg(p.pet)}"><span>${esc(p.name)}</span></button>`).join('')}</div>` : '<p class="center">Mọi người chơi đều đang online.</p>',
    '<button class="pill ghost" type="button" id="lwatch">Chỉ xem</button>');
  el.querySelectorAll('[data-id]').forEach((b) => { b.onclick = async () => { try { setMe(await api('api/claim', { id: b.dataset.id })); } catch (e) { toast(e.message); } }; });
  $('#lwatch').onclick = () => { el.classList.remove('show'); WATCH_MODE = true; };
  if (WATCH_MODE) el.classList.remove('show');
}
// chơi chung một máy: tự thêm 2–4 người
function lobbyLocal(el) {
  if (!localDraft) localDraft = (S.players.length ? S.players.map((p) => ({ name: p.name, pet: p.pet })) : [{ name: '', pet: G.PETS[0].id }, { name: '', pet: G.PETS[1].id }]);
  lobbyLocal.time = lobbyLocal.time || S.settings.timeLimitMin || 60;
  lobbyLocal.turn = lobbyLocal.turn || S.settings.turnSec || CFG.TURN_SEC;
  const rows = localDraft.map((d, k) => {
    const taken = new Set(localDraft.filter((_, j) => j !== k).map((x) => x.pet));
    return `<div class="lrow"><input data-n="${k}" maxlength="16" placeholder="Người chơi ${k + 1}" value="${esc(d.name)}">
      <div class="mini">${G.PETS.map((x) => `<button type="button" class="${x.id === d.pet ? 'on' : ''}" data-k="${k}" data-p="${x.id}" ${taken.has(x.id) ? 'disabled' : ''} title="${x.n}" style="--c:${x.c}"><img alt="${x.n}" src="${petImg(x.id)}"></button>`).join('')}</div>
      ${localDraft.length > 2 ? `<button type="button" class="rm" data-rm="${k}" aria-label="Bỏ người chơi">×</button>` : ''}</div>`;
  }).join('');
  el.innerHTML = sheet('#2c8ff0', 'Thái Thịnh Monopoly', 'Chơi chung một máy', `${rows}
    ${localDraft.length < CFG.MAX_PLAYERS ? '<button type="button" class="pill ghost add" id="ladd">+ Thêm người chơi</button>' : ''}
    <div class="fld">Thời lượng ván</div>${timeRow(lobbyLocal.time, 'data-t')}
    <div class="fld">Thời gian mỗi lượt</div>${turnRow(lobbyLocal.turn, 'data-ts')}`,
    `${S.phase === 'play' ? '<button class="pill ghost" type="button" id="lcancel">Chơi tiếp ván cũ</button>' : ''}<button class="pill big" type="button" id="lstart">Bắt đầu</button>`);
  const keep = () => el.querySelectorAll('[data-n]').forEach((i) => { localDraft[Number(i.dataset.n)].name = i.value; });
  el.querySelectorAll('[data-p]').forEach((b) => { b.onclick = () => { keep(); localDraft[Number(b.dataset.k)].pet = b.dataset.p; renderLobby(); }; });
  el.querySelectorAll('[data-rm]').forEach((b) => { b.onclick = () => { keep(); localDraft.splice(Number(b.dataset.rm), 1); renderLobby(); }; });
  el.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => { keep(); lobbyLocal.time = Number(b.dataset.t); renderLobby(); }; });
  el.querySelectorAll('[data-ts]').forEach((b) => { b.onclick = () => { keep(); lobbyLocal.turn = Number(b.dataset.ts); renderLobby(); }; });
  if ($('#ladd')) $('#ladd').onclick = () => { keep(); const used = new Set(localDraft.map((x) => x.pet)); localDraft.push({ name: '', pet: G.PETS.find((x) => !used.has(x.id)).id }); renderLobby(); };
  if ($('#lcancel')) $('#lcancel').onclick = () => { lobbyOpen = false; localDraft = null; renderLobby(); renderHub(); };
  $('#lstart').onclick = () => {
    keep();
    const ns = G.createState(); ns.settings.timeLimitMin = lobbyLocal.time; ns.settings.turnSec = lobbyLocal.turn;
    try {
      localDraft.forEach((d, k) => G.addPlayer(ns, { id: 'p' + k, token: 't' + k, name: d.name.trim() || `Người chơi ${k + 1}`, pet: d.pet }));
      G.startGame(ns);
    } catch (e) { return toast(e.message); }
    S = ns; lobbyOpen = false; localDraft = null; resetView(); save();
  };
}

/* ---------------- chế độ một máy: lưu ván ---------------- */
const SAVE_KEY = 'tt-monopoly-v11';
function save() { if (MODE !== 'local') return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* trình duyệt chặn lưu: bỏ qua */ } }
function loadSaved() {
  try { const o = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (o && o.phase === 'play' && o.players && o.players.every((p) => p.pet)) return o; } catch (e) { /* bỏ qua */ }
  return null;
}
function newGameFlow() {
  if (busy) return;
  if (MODE === 'local') { lobbyOpen = true; localDraft = null; renderLobby(); return; }
  if (S.phase === 'over' && me) api('api/act', { token: me.token, type: 'reset' }).catch((e) => toast(e.message));
}
function showRoomGate() {
  if (!ROOM_GATE) return;
  if (board) board.stop();
  connectionEpoch++;
  if (es) es.close();
  es = null;
  queue.length = 0;
  $('#conn').classList.remove('show');
  $('#lobby').classList.remove('show');
  const params = new URLSearchParams(location.search);
  let savedName = '';
  try { savedName = localStorage.getItem(NAME_KEY) || ''; } catch (e) { /* bỏ qua */ }
  $('#gname').value = savedName || lobbyDraftName || '';
  $('#groom').value = normalizeRoom(params.get('room') || ROOM);
  const selectedMap = MAPS.some((map) => map.id === $('#gmap').value) ? $('#gmap').value : MAPS[0].id;
  $('#gmap').innerHTML = MAPS.map((map) => `<option value="${esc(map.id)}">${esc(map.name)}${map.default ? ' (Mặc định)' : ''}</option>`).join('');
  $('#gmap').value = selectedMap;
  renderGateMapPreview();
  document.body.dataset.screen = 'gate';
  syncMusic();
  $('#loading').classList.add('hidden');
  $('#gate').classList.add('show');
  setTimeout(() => ($('#groom').value ? $('#gname') : $('#groom')).focus(), 0);
}
async function enterRoom(create, watch = false) {
  if (enterRoom.busy) return;
  const name = $('#gname').value.replace(/\s+/g, ' ').trim().slice(0, 16);
  if (!name) { toast('Hãy nhập username'); return $('#gname').focus(); }
  const room = selectRoomCode($('#groom').value, create);
  if (!validRoom(room)) { toast('Mã phòng cần 3–24 ký tự'); return $('#groom').focus(); }
  const mapId = $('#gmap').value;
  if (create && !MAPS.some((map) => map.id === mapId)) { toast('Hãy chọn bản đồ'); return $('#gmap').focus(); }
  ROOM = room;
  WATCH_MODE = watch;
  lobbyDraftName = name;
  pendingJoinName = watch ? '' : name;
  pendingRoomMap = create ? mapId : '';
  try { localStorage.setItem(NAME_KEY, name); } catch (e) { /* bỏ qua */ }
  const url = new URL(location.href); url.searchParams.set('room', ROOM); history.replaceState(null, '', url);
  $('#gate').classList.remove('show');
  document.body.dataset.screen = 'loading';
  $('#loadmsg').textContent = 'Tải bàn cờ và mô hình 3D';
  $('#loading').classList.remove('hidden');
  enterRoom.busy = true;
  $('#gcreate').disabled = true; $('#gjoin').disabled = true; $('#gwatch').disabled = true;
  try {
    await prepareBoard(pendingRoomMap || undefined);
    me = watch ? null : loadMe();
    invite = [];
    connect();
    loadInvite();
  } catch (e) {
    $('#loadmsg').textContent = 'Không tải được bàn cờ: ' + e.message;
    console.error(e);
  } finally {
    enterRoom.busy = false;
    $('#gcreate').disabled = false; $('#gjoin').disabled = false; $('#gwatch').disabled = false;
  }
}
function exitRoom() {
  setMe(null, false);
  WATCH_MODE = false;
  pendingJoinName = '';
  pendingRoomMap = '';
  presence = {};
  viewers = [];
  renderWatchBadge();
  S = G.createState();
  showRoomGate();
}
$('#gcreate').onclick = () => enterRoom(true);
$('#gjoin').onclick = () => enterRoom(false);
$('#gwatch').onclick = () => enterRoom(false, true);
$('#gmap').onchange = renderGateMapPreview;
$('#gname').onkeydown = (e) => { if (e.key === 'Enter') enterRoom(false); };
$('#groom').onkeydown = (e) => { if (e.key === 'Enter') enterRoom(false); };
$('#newgame').onclick = newGameFlow;
addEventListener('resize', () => board && board.resize());
window.__TT = {
  get S() { return S; }, get mode() { return MODE; }, get me() { return me; }, get busy() { return busy; },
  get perf() { return board && board.stats ? board.stats() : { graphicsLevel }; }, get board() { return board; }, get mapId() { return boardMapId; },
  act, scr: (i) => board.tileScreen(i), sync() { resetView(); },
}; // cho script kiểm thử và đo hiệu năng runtime

/* ---------------- khởi động ---------------- */
async function detectServer() {
  if (location.protocol === 'file:') return null;
  try { const r = await fetch('health', { cache: 'no-store' }); const info = await r.json(); return r.ok && info.app === 'thai-thinh-monopoly' ? info : null; } catch (e) { return null; }
}
async function prepareBoard(mapId = S.settings && S.settings.mapId) {
  const want = mapEntry(mapId).id;
  if (!boardReadyPromise || (boardMapId && boardMapId !== want)) boardReadyPromise = (async () => {
    seatSetup(); markSeen();
    await loadBoard(want);
  })();
  try { await boardReadyPromise; } catch (e) { boardReadyPromise = null; throw e; }
  document.body.dataset.screen = 'game';
  $('#loading').classList.add('hidden');
  syncMusic();
  board.start();
}
(async () => {
  try {
    const server = await detectServer();
    MODE = server ? 'net' : 'local';
    ROOM_GATE = !!(server && server.rooms);
    document.body.dataset.mode = MODE;
    const saved = MODE === 'local' ? loadSaved() : null;
    if (saved) S = saved;
    if (MODE === 'net' && ROOM_GATE) { showRoomGate(); return; }
    await prepareBoard();
    if (MODE === 'net') { me = loadMe(); connect(); loadInvite(); }
    else { lobbyOpen = !saved; resetView(); }
  } catch (e) {
    $('#loadmsg').textContent = 'Không tải được bàn cờ: ' + e.message;
    console.error(e);
  }
})();

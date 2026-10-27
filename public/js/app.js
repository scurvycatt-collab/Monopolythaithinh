import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { loadKit, building as houseBuilding } from './houses.js';
import { colosseum, worldTour, lostIsland, startGate, chanceBox, beachHouse, festivalFlag, festivalPlaque, BEACH_LEVELS } from './specials.js';
import { centerWorld } from './world.js';
import qrcode from '../vendor/qrcode.mjs';
import { normalizeRoom, roomEndpoint, selectRoomCode, validRoom } from './room-session.mjs';
const HK = { loadKit, building: houseBuilding, colosseum, worldTour, lostIsland, startGate, chanceBox, beachHouse, festivalFlag, festivalPlaque, BEACH_LEVELS };

const G = window.Game;
const { TILES, GROUPS, CFG, MAPS } = G;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const GRAPHICS_KEY = 'tt-monopoly-graphics-v1';
const GRAPHICS = { low: { ratio: 1, shadows: false, shadowSize: 512 }, medium: { ratio: 1.5, shadows: true, shadowSize: 1024 }, high: { ratio: 2, shadows: true, shadowSize: 4096 } };
let graphicsLevel = 'high';
try { const saved = localStorage.getItem(GRAPHICS_KEY); if (GRAPHICS[saved]) graphicsLevel = saved; } catch (e) { /* dùng mặc định */ }
if (/[?&]low\b/.test(location.search)) graphicsLevel = 'low'; // tương thích link ?low cũ
const money = (n) => Math.round(n * 1000).toLocaleString('vi-VN');
const shortK = (n) => (n >= 1000 ? (n / 1000).toFixed(n % 1000 ? 1 : 0).replace('.', ',') + 'M' : n + 'K');
const outageRounds = (i) => Math.max(0, Number(S.outage && S.outage[i] || 0) - Number(S.round || 0));

/* ---------------- âm thanh ---------------- */
const SOUND_KEY = 'tt-monopoly-sound-v1';
const soundPrefs = { music: true, musicVolume: 20, turn: true, turnVolume: 55 };
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
  const volume = soundPrefs.turnVolume / 100 * 0.16, at = audioCtx.currentTime;
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
  const volume = soundPrefs.turnVolume / 100 * 0.12;
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
$('#settings-leave').onclick = async () => {
  if (MODE !== 'net' || !ROOM_GATE || !ROOM) return;
  const button = $('#settings-leave'); button.disabled = true;
  try {
    if (me && S.phase === 'lobby') await api('api/act', { token: me.token, type: 'leave' });
    exitRoom();
  } catch (e) { toast(e.message); button.disabled = false; }
};
addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
document.addEventListener('visibilitychange', syncMusic);

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
let boardReady = false, boardReadyPromise = null, frameRunning = false;
const now = () => Date.now() + skew;   // giờ theo server
function seatSetup() { seatOf = {}; S.players.forEach((p, k) => { const pet = p.pet || G.PETS[k % G.PETS.length].id, def = G.PETS.find((x) => x.id === pet); p.color = def ? def.c : p.color; seatOf[p.id] = { color: p.color, pet, corner: CORNERS[k % 4] }; }); }
const curP = () => (S.phase === 'play' ? S.players[S.turn] : null);
const isMe = (pid) => MODE === 'local' || (!!me && me.id === pid);
const myTurn = () => !!curP() && isMe(curP().id);
const online = (pid) => MODE === 'local' || !presence[pid] || presence[pid].on;

/* ---------------- three.js: cảnh ---------------- */
const stage = $('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, GRAPHICS[graphicsLevel].ratio));
renderer.shadowMap.enabled = GRAPHICS[graphicsLevel].shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
camera.position.set(20, 16.5, 20);
camera.lookAt(0, 0, 0);
const hemi = new THREE.HemisphereLight(0xffffff, 0xc4d2de, 1.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff8ee, 1.35);
sun.position.set(10, 18, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(GRAPHICS[graphicsLevel].shadowSize, GRAPHICS[graphicsLevel].shadowSize);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
sun.shadow.bias = -0.0008;
sun.shadow.normalBias = 0.02;
scene.add(sun);
function setGraphicsLevel(level) {
  if (!GRAPHICS[level]) return;
  graphicsLevel = level;
  try { localStorage.setItem(GRAPHICS_KEY, level); } catch (e) { /* trình duyệt chặn lưu */ }
  const profile = GRAPHICS[level];
  renderer.setPixelRatio(Math.min(devicePixelRatio, profile.ratio));
  renderer.shadowMap.enabled = profile.shadows;
  if (sun.shadow.mapSize.x !== profile.shadowSize) {
    sun.shadow.mapSize.set(profile.shadowSize, profile.shadowSize);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  }
  renderer.shadowMap.needsUpdate = true;
  resize();
  renderSoundSettings();
}

/* kích thước bàn */
const C = 3.1, W = 1.7, D = 3.1;
const L = 2 * C + 7 * W;           // 18.1
const H2 = L / 2;
const TOPY = 0.34;                 // mặt trên ô cờ
const GRASS = 0.76;
const WORLD_DROP = 0.24;            // mặt giữa bàn thấp hơn ô cờ → các hàng ô nổi lên như bậc
const DIE_Y = 0.8 - WORLD_DROP;     // tâm xúc xắc khi nằm trên mặt giữa bàn                // phần cỏ chiếm 76%, dải xám 24%
function tileFrame(i) {
  const side = Math.floor(i / 8), k = i % 8;
  if (k === 0) {
    const h = H2 - C / 2;
    const pos = [[h, h], [-h, h], [-h, -h], [h, -h]][side];
    return { x: pos[0], z: pos[1], rot: 0, corner: true, side, w: C, d: C };
  }
  const a = H2 - C - (k - 0.5) * W, h = H2 - D / 2;
  const P = [[a, h, 0], [-h, a, -Math.PI / 2], [-a, -h, Math.PI], [h, -a, Math.PI / 2]][side];
  return { x: P[0], z: P[1], rot: P[2], corner: false, side, w: W, d: D };
}
const tmpV = new THREE.Vector3();
function local(i, lx, lz) {
  const f = tileFrame(i);
  const c = Math.cos(f.rot), s = Math.sin(f.rot);
  return new THREE.Vector3(f.x + lx * c + lz * s, 0, f.z - lx * s + lz * c);
}
// Hai cạnh xa (trên màn hình): dải xám nằm phía trong, gần người nhìn; nhà ở phía ngoài.
const FAR = (side) => side === 1 || side === 2;
function lay(i) {
  const f = tileFrame(i), g = D * GRASS, st = D - g;
  if (!FAR(f.side)) return { grassZ: -D / 2 + g * 0.38, stripZ: D / 2 - st / 2, tokZ: D / 2 - st - 0.42 };
  return { grassZ: D / 2 - g * 0.38, stripZ: -D / 2 + st / 2, tokZ: -D / 2 + st + 0.42 };
}

/* đế bàn */
const board = new THREE.Group();
scene.add(board);
{
  const base = new THREE.Mesh(new THREE.BoxGeometry(L + 0.7, 0.7, L + 0.7), [
    new THREE.MeshStandardMaterial({ color: 0x8195ad, roughness: .9 }), new THREE.MeshStandardMaterial({ color: 0x8195ad, roughness: .9 }),
    new THREE.MeshStandardMaterial({ color: 0xe6ebf1, roughness: .9 }), new THREE.MeshStandardMaterial({ color: 0x5b6d84 }),
    new THREE.MeshStandardMaterial({ color: 0x95a8be, roughness: .9 }), new THREE.MeshStandardMaterial({ color: 0x95a8be, roughness: .9 })]);
  base.position.y = -0.35; base.receiveShadow = true; board.add(base);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(L + 0.9, 0.18, L + 0.9), new THREE.MeshStandardMaterial({ color: 0xe2c79a, roughness: .8 }));
  lip.position.y = -0.62; board.add(lip);
}

/* ---------------- canvas texture cho ô cờ ---------------- */
const PX = 160; // px mỗi đơn vị
function fitText(ctx, str, maxW, size, weight, fam) {
  let s = size;
  do { ctx.font = `${weight} ${s}px ${fam}`; s -= 2; } while (ctx.measureText(str).width > maxW && s > 10);
}
const KIND = {
  start: { label: 'START' }, island: { label: 'LOST ISLAND' }, festival: { label: 'CHAMPIONSHIPS' }, tour: { label: 'WORLD TOUR' },
  chance: { label: 'CHANCE' }, tax: { label: 'TAX' },
};
const RESORT_COLOR = '#7fd3dd';
const BEACH_SAND = 0.62; // phần cát của ô bãi biển (còn lại là nước)
const INK = '#4a5668';
const rng0 = (seed) => { let a = seed * 9301 + 49297; return () => ((a = (a * 9301 + 49297) % 233280) / 233280); };
function paintGrass(ctx, x, y, w, h, seed) {
  ctx.fillStyle = '#a6dc8c'; ctx.fillRect(x, y, w, h);
  const r = rng0(seed + 3);
  for (let n = 0; n < 20; n++) {
    ctx.fillStyle = r() < 0.5 ? 'rgba(140,204,118,.55)' : 'rgba(190,232,160,.6)';
    ctx.beginPath(); ctx.ellipse(x + r() * w, y + r() * h, 8 + r() * 24, 5 + r() * 12, r() * 3, 0, 7); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(110,170,90,.35)'; ctx.lineWidth = 4; ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
}
function paintBeach(ctx, x, y, w, h, seed, waterAtTop) {
  // cát, vỏ sò, sóng vỗ ở mép nước
  ctx.fillStyle = '#f7e2b5'; ctx.fillRect(x, y, w, h);
  const r = rng0(seed + 11);
  for (let n = 0; n < 70; n++) { ctx.fillStyle = r() < 0.5 ? 'rgba(226,196,140,.6)' : 'rgba(255,245,220,.8)'; ctx.beginPath(); ctx.arc(x + r() * w, y + r() * h, 1.5 + r() * 4, 0, 7); ctx.fill(); }
  const wy = waterAtTop ? y : y + h * BEACH_SAND, wh = h * (1 - BEACH_SAND);
  const grd = ctx.createLinearGradient(0, waterAtTop ? wy : wy + wh, 0, waterAtTop ? wy + wh : wy);
  grd.addColorStop(0, '#8fd6ef'); grd.addColorStop(1, '#bfe9f6');
  ctx.fillStyle = grd;
  ctx.beginPath();
  const edge = waterAtTop ? wy + wh : wy;
  ctx.moveTo(x, waterAtTop ? wy : wy + wh);
  for (let px = 0; px <= w; px += 8) ctx.lineTo(x + px, edge + Math.sin(px / 18 + seed) * 7);
  ctx.lineTo(x + w, waterAtTop ? wy : wy + wh); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 6; ctx.beginPath();
  for (let px = 0; px <= w; px += 8) ctx.lineTo(x + px, edge + Math.sin(px / 18 + seed) * 7);
  ctx.stroke();
  for (let n = 0; n < 3; n++) { // vỏ sò
    const sx = x + 20 + r() * (w - 40), sy = waterAtTop ? y + wh + 20 + r() * (h - wh - 40) : y + 20 + r() * (h * 0.5);
    ctx.fillStyle = r() < .5 ? '#f6b6a8' : '#fbd38d'; ctx.beginPath(); ctx.arc(sx, sy, 7, Math.PI, 0); ctx.fill();
  }
}
// pha màu nhóm với trắng: k = phần màu nhóm (0..1)
function tintHex(hex, k) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, m = (v) => Math.round(255 + (v - 255) * k);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
// nền ô đất theo nhóm (kiểu Business Tour): màu nhóm pha nhạt + hoa văn lát gạch / lát ô
// hoa văn lát nền theo nhóm (Kenney Pattern Pack, CC0): ảnh đen trắng → pha hai sắc của màu nền nhóm.
// Phần chiếm diện tích lớn luôn lấy màu sáng, đường ron lấy màu đậm hơn ~14% để chữ trên ô vẫn dễ đọc.
const GROUND_PATTERN_ALPHA = 0.45; // độ đậm của hoa văn phủ lên màu nền
const groundImg = {}, groundCv = {};
function loadGroundPatterns() {
  return Promise.all(Object.entries(GROUPS).map(([g, x]) => new Promise((res) => {
    const im = new Image(); im.onload = () => { groundImg[g] = im; res(); }; im.onerror = () => res(); im.src = `patterns/pattern_${x.pattern}.png`;
  })));
}
function groundTile(g) {
  if (groundCv[g] !== undefined) return groundCv[g];
  const im = groundImg[g]; if (!im) return (groundCv[g] = null);
  const N = im.width, cv = document.createElement('canvas'); cv.width = cv.height = N; const c = cv.getContext('2d');
  c.drawImage(im, 0, 0); const d = c.getImageData(0, 0, N, N), px = d.data;
  let sum = 0; for (let k = 0; k < px.length; k += 4) sum += px[k]; const inv = sum / (px.length / 4) < 128;
  const hex = GROUPS[g].ground, n = parseInt(hex.slice(1), 16), L = [n >> 16, (n >> 8) & 255, n & 255], Dk = L.map((v) => Math.round(v * 0.86));
  for (let k = 0; k < px.length; k += 4) { let t = px[k] / 255; if (inv) t = 1 - t; for (let j = 0; j < 3; j++) px[k + j] = Math.round(Dk[j] + (L[j] - Dk[j]) * t); px[k + 3] = 255; }
  c.putImageData(d, 0, 0); return (groundCv[g] = cv);
}
function paintGround(ctx, x, y, w, h, group) {
  ctx.fillStyle = GROUPS[group].ground; ctx.fillRect(x, y, w, h);
  const tile = groundTile(group);
  if (tile) {
    const pat = ctx.createPattern(tile, 'repeat'); pat.setTransform(new DOMMatrix().translate(x, y).scale(0.5));
    ctx.save(); ctx.globalAlpha = GROUND_PATTERN_ALPHA; ctx.fillStyle = pat; ctx.fillRect(x, y, w, h); ctx.restore();
  }
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 4; ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
}
function paintPaving(ctx, x, y, w, h, col) {
  ctx.fillStyle = col; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = col === '#ffffff' ? 'rgba(0,0,0,.04)' : 'rgba(0,0,0,.06)'; ctx.lineWidth = 3;
  for (let gx = x + w / 3; gx < x + w - 4; gx += w / 3) { ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
}
function paintWater(ctx, w, h) {
  ctx.fillStyle = '#9fdcf2'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 4;
  for (let y = 26; y < h; y += 46) { ctx.beginPath(); for (let x = 0; x <= w; x += 10) ctx.lineTo(x, y + Math.sin(x / 24 + y) * 6); ctx.stroke(); }
}
// tranh thuế vẽ tay: tờ khai TAX đóng dấu PAID + túi tiền
function paintTax(ctx, x, y, w, h) {
  ctx.fillStyle = '#a7dfe2'; ctx.fillRect(x, y, w, h);
  ctx.save(); ctx.translate(x + w * 0.44, y + h * 0.58); ctx.rotate(-0.16);
  const pw = w * 0.62, ph = h * 0.58;
  ctx.fillStyle = 'rgba(40,80,90,.18)'; ctx.fillRect(-pw / 2 + 6, -ph / 2 + 8, pw, ph);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
  ctx.fillStyle = '#6b7685'; ctx.font = `800 ${Math.round(pw * 0.3)}px "Baloo 2"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('TAX', 0, -ph * 0.28);
  ctx.fillStyle = '#c7cdd6'; for (let k = 0; k < 4; k++) ctx.fillRect(-pw * 0.38, -ph * 0.06 + k * ph * 0.12, pw * 0.76, ph * 0.045);
  ctx.save(); ctx.translate(0, ph * 0.3); ctx.rotate(-0.12);
  ctx.strokeStyle = '#e0505b'; ctx.lineWidth = 4; ctx.strokeRect(-pw * 0.26, -ph * 0.08, pw * 0.52, ph * 0.16);
  ctx.fillStyle = '#e0505b'; ctx.font = `800 ${Math.round(pw * 0.14)}px "Baloo 2"`; ctx.fillText('PAID', 0, 1);
  ctx.restore(); ctx.restore();
  // túi tiền
  const bx = x + w * 0.74, by = y + h * 0.36, br = w * 0.17;
  ctx.fillStyle = '#3f8f5a'; ctx.beginPath(); ctx.ellipse(bx, by + br * 0.25, br, br * 1.05, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(bx - br * 0.45, by - br * 0.75); ctx.lineTo(bx - br * 0.7, by - br * 1.25); ctx.lineTo(bx, by - br * 1.05); ctx.lineTo(bx + br * 0.7, by - br * 1.25); ctx.lineTo(bx + br * 0.45, by - br * 0.75); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2f6e45'; ctx.fillRect(bx - br * 0.5, by - br * 0.8, br, br * 0.16);
  ctx.fillStyle = '#ffd25a'; ctx.font = `800 ${Math.round(br * 1.2)}px "Baloo 2"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', bx, by + br * 0.3);
}
// Nhãn ô góc nằm trên đường chéo hướng về người nhìn (+x,+z), chữ chạy song song mép màn hình
// nên tâm chữ luôn trùng trục dọc của ô trên màn hình.
const LABEL_D = 0.68;
function cornerLabel(ctx, str, cw, ch) {
  const d = LABEL_D * PX, x = cw / 2 + d, y = ch / 2 + d, maxW = 2 * (cw / 2 - d) - 34;
  ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 4);
  fitText(ctx, str, maxW, 44, 900, 'Rubik');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(52,72,84,.55)'; ctx.fillText(str, 0, 3);
  ctx.fillStyle = '#ffffff'; ctx.fillText(str, 0, 0); ctx.restore();
}
function drawTile(i) {
  const t = TILES[i], f = tileFrame(i);
  const cw = Math.round(f.w * PX), ch = Math.round(f.d * PX);
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  const far = FAR(f.side);
  // chữ kiểu Business Tour: Rubik đậm, chữ trắng có bóng đổ tối phía dưới
  const text = (str, x, y, size, weight, fam, color, maxW, rot, shadow) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate((rot || 0) + (far && !f.corner ? Math.PI : 0));
    fitText(ctx, str, maxW || cw - 24, size, weight, fam);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (shadow === 'outline') { ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(5, size * 0.16); ctx.strokeStyle = '#ffffff'; ctx.strokeText(str, 0, 0); }
    else if (shadow) { ctx.fillStyle = shadow; ctx.fillText(str, 0, Math.max(2, size * 0.07)); }
    ctx.fillStyle = color; ctx.fillText(str, 0, 0); ctx.restore();
  };
  const SH = 'rgba(52,72,84,.55)';
  if (f.corner) {
    const k = KIND[t.type];
    if (t.type === 'island' || t.type === 'tour') paintWater(ctx, cw, ch);
    else paintGrass(ctx, 0, 0, cw, ch, i);
    const R = -Math.PI / 4;
    if (t.type === 'start') text('START', cw * 0.5, ch * 0.5, 120, 900, 'Rubik', '#ffffff', cw * 0.92, R, SH);
    else if (t.type !== 'tour') cornerLabel(ctx, k.label, cw, ch);
    return cv;
  }
  const gH = Math.round(ch * GRASS), sH = ch - gH;
  // vùng trong (cỏ/cát) và dải xám; ở hai cạnh xa thì dải xám ở trên (phía trong bàn)
  const gY = far ? sH : 0, sY = far ? 0 : gH;
  if (t.type === 'resort') paintBeach(ctx, 0, gY, cw, gH, i, !far);
  else if (t.type === 'tax') paintTax(ctx, 0, gY, cw, gH);
  else if (t.type === 'chance') paintPaving(ctx, 0, gY, cw, gH, '#fff1d8');
  else if (t.group) paintGround(ctx, 0, gY, cw, gH, t.group, i);   // mỗi nhóm một màu nền riêng
  else paintGrass(ctx, 0, gY, cw, gH, i);
  paintPaving(ctx, 0, sY, cw, sH, '#ffffff');                        // dải giá màu trắng, không còn vạch màu nhóm
  const BAR = 0;
  // tên trong vùng xanh, sát dải xám; vùng xám chỉ hiện số
  // tên: sát dải xám; riêng bãi biển đặt giữa bãi cát
  const nameY = t.type === 'resort' ? gY + gH * (far ? BEACH_SAND / 2 : 1 - BEACH_SAND / 2) : (far ? sH + BAR + 34 : gH - BAR - 34);
  if (t.price) {
    const own = S.props[i];
    text(t.name.toUpperCase(), cw / 2, nameY, 50, 700, 'Fredoka', '#111111', cw - 22, 0);
    const out = own && G.outaged(S, i);
    if (own) text(out ? '⚡ 0K' : shortK(G.rentOf(S, i)), cw / 2, sY + sH / 2 + 4, 84, 600, 'Fredoka', out ? '#8a94a3' : '#000000', cw - 20); // chưa có chủ: để trống
    if (out) text(`⚡ CÒN ${outageRounds(i)} VÒNG`, cw / 2, far ? ch - 44 : 44, 31, 900, 'Rubik', '#f2b632', cw - 20, 0, SH);
  } else {
    text(KIND[t.type].label, cw / 2, sY + sH / 2 + 4, 56, 600, 'Fredoka', '#000000', cw - 20);
  }
  return cv;
}

const tileMeshes = [], tileTex = [], glows = [];
let tourTex = null;
const dirtMat = new THREE.MeshStandardMaterial({ color: 0xc89d7b, roughness: .95 });
const dirtDark = new THREE.MeshStandardMaterial({ color: 0xa47c5d, roughness: .95 });
const waterSide = new THREE.MeshStandardMaterial({ color: 0x7cc3e0, roughness: .6 });
function buildTiles() {
  for (let i = 0; i < 32; i++) {
    const f = tileFrame(i), t = TILES[i];
    const g = new THREE.Group(); g.position.set(f.x, 0, f.z); g.rotation.y = f.rot;
    const side = (t.type === 'island' || t.type === 'tour') ? waterSide : dirtMat;
    const body = new THREE.Mesh(new THREE.BoxGeometry(f.w - 0.06, TOPY, f.d - 0.06), [side, side, dirtMat, dirtDark, side, side]);
    body.position.y = TOPY / 2; body.receiveShadow = true; body.castShadow = true; g.add(body);
    const tex = new THREE.CanvasTexture(drawTile(i));
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const top = new THREE.Mesh(new THREE.PlaneGeometry(f.w - 0.06, f.d - 0.06), new THREE.MeshStandardMaterial({ map: tex, roughness: .9 }));
    top.rotation.x = -Math.PI / 2; top.position.y = TOPY + 0.001; top.receiveShadow = true; top.userData.tile = i; g.add(top);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(f.w - 0.06, f.d - 0.06), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = TOPY + 0.004; glow.userData.tile = i; g.add(glow);
    if (t.type === 'tour') {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tourTex = tex;
      const cv = document.createElement('canvas'); cv.width = Math.round(f.w * PX); cv.height = Math.round(f.d * PX);
      cornerLabel(cv.getContext('2d'), KIND.tour.label, cv.width, cv.height);
      const lt = new THREE.CanvasTexture(cv); lt.colorSpace = THREE.SRGBColorSpace; lt.anisotropy = 8;
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(f.w - 0.06, f.d - 0.06), new THREE.MeshStandardMaterial({ map: lt, transparent: true, depthWrite: false, roughness: .9 }));
      lab.rotation.x = -Math.PI / 2; lab.position.y = TOPY + 0.003; g.add(lab);
    }
    board.add(g); tileMeshes.push(top); tileTex.push(tex); glows.push(glow);
  }
}
function refreshTile(i) { tileTex[i].image = drawTile(i); tileTex[i].needsUpdate = true; }

function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------------- mô hình Kenney ---------------- */
const MODEL_LIST = {
  'animal-dog': 'pets/animal-dog', 'animal-cat': 'pets/animal-cat', 'animal-fox': 'pets/animal-fox', 'animal-panda': 'pets/animal-panda',
};
const MODELS = {};
async function loadModels() {
  const loader = new GLTFLoader();
  const keys = Object.keys(MODEL_LIST);
  let done = 0;
  const bundle = await (await fetch('models/bundle.json')).json();
  const parse = (path) => {
    const bin = Uint8Array.from(atob(bundle[path]), (ch) => ch.charCodeAt(0)).buffer;
    return new Promise((res, rej) => loader.parse(bin, `models/${path.split('/')[0]}/`, res, rej));
  };
  await Promise.all(keys.map((k) => parse(MODEL_LIST[k]).then((g) => {
    g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { if ('metalness' in m) { m.metalness = 0; m.roughness = Math.max(m.roughness ?? 1, 0.55); } }); } });
    MODELS[k] = g.scene; done++; $('#loadmsg').textContent = `Tải mô hình 3D ${done}/${keys.length}`;
  })));
}
// đặt mô hình: thu theo bề ngang `fit`, đáy ở y=0, tâm ở gốc
function place(key, fit, opts = {}) {
  const o = MODELS[key].clone(true);
  const box = new THREE.Box3().setFromObject(o), size = box.getSize(new THREE.Vector3());
  let s = (opts.byHeight ? fit / size.y : fit / Math.max(size.x, size.z));
  if (opts.maxH && size.y * s > opts.maxH) s = opts.maxH / size.y;
  o.scale.setScalar(s);
  const b2 = new THREE.Box3().setFromObject(o), c2 = b2.getCenter(new THREE.Vector3());
  o.position.set(-c2.x, -b2.min.y, -c2.z);
  const wrap = new THREE.Group(); wrap.add(o);
  if (opts.material) o.traverse((m) => { if (m.isMesh) m.material = opts.material(m.material); });
  wrap.userData.height = b2.max.y - b2.min.y;
  wrap.userData.size = b2.getSize(new THREE.Vector3());
  return wrap;
}
/* vật thể trên ô góc / ô đặc biệt + thế giới giữa bàn; mỗi vật có userData.update(t, dt) */
const specials = [];
function decorate() {
  const atCorner = (obj, i, ox = 0, oz = 0) => { const f = tileFrame(i); obj.position.set(f.x + ox, TOPY, f.z + oz); board.add(obj); specials.push(obj); return obj; };
  atCorner(HK.startGate(), 0);
  atCorner(HK.lostIsland(), 8);
  atCorner(HK.colosseum(), 16);
  atCorner(HK.worldTour(), 24, 0.2, 0.2);
  // rương Chance ở tâm phần sân; hai cạnh xa (trên màn hình) quay mặt về dải xám như nhà, tức là về phía người nhìn
  TILES.forEach((t, i) => {
    if (t.type !== 'chance') return;
    const cb = HK.chanceBox(), p = local(i, 0, lay(i).grassZ), f = tileFrame(i), off = specials.length * 1.3;
    cb.position.set(p.x, TOPY, p.z); cb.rotation.y = f.rot + (FAR(f.side) ? Math.PI : 0);
    const up = cb.userData.update; cb.userData.update = (tt, dt) => up(tt + off, dt);
    board.add(cb); specials.push(cb);
  });
  const w = centerWorld(); w.position.y = TOPY - WORLD_DROP; board.add(w); specials.push(w);
}

/* băng rôn lễ hội: mỗi ván 3 ô ngẫu nhiên (S.bonus), căng giữa hai cọc dọc cạnh sau của phần sân */
function festivalBannerSpot(i) {
  const f = tileFrame(i), lz = FAR(f.side) ? D / 2 - 0.16 : -D / 2 + 0.16;
  return local(i, 0, lz);
}
const bonusFlags = [];
// bảng lễ hội gắn phẳng lên mặt đất nâu ngay dưới dải giá (mặt hướng về người nhìn), vừa khít khoảng nâu
let festBanner = null, festSig = '';
function syncFestival() {
  const sig = S.festival === null || S.festival === undefined || !S.props[S.festival] ? '' : `${S.festival}:${G.festMult(S)}`;
  if (sig === festSig) return; festSig = sig;
  if (festBanner) { board.remove(festBanner); festBanner = null; }
  if (!sig) return;
  const i = S.festival, f = tileFrame(i), far = FAR(f.side);
  // hai cạnh gần: mặt ngoài lộ cả chiều cao ô; hai cạnh xa: mặt trong chỉ lộ phần trên mặt giữa bàn (đã hạ WORLD_DROP)
  const top = TOPY - 0.03, bottom = far ? TOPY - WORLD_DROP + 0.02 : 0.03, w = f.w - 0.26;
  festBanner = HK.festivalPlaque(G.festMult(S), w, top - bottom);
  const p = local(i, 0, (far ? -1 : 1) * ((f.d - 0.06) / 2 + 0.014));
  festBanner.position.set(p.x, bottom, p.z); festBanner.rotation.y = f.rot + (far ? Math.PI : 0); board.add(festBanner);
  festBanner.userData.t0 = syncFestival.first ? -1 : performance.now(); // dựng ván lần đầu thì không chạy hoạt ảnh
}
function syncBonus() {
  bonusFlags.splice(0).forEach((o) => board.remove(o));
  for (const i of S.bonus || []) {
    const f = tileFrame(i), best = festivalBannerSpot(i);
    const flag = HK.festivalFlag(CFG.BONUS_MULT); flag.position.set(best.x, TOPY, best.z); flag.scale.setScalar(1.12); flag.rotation.y = f.rot + (FAR(f.side) ? Math.PI : 0);
    board.add(flag); bonusFlags.push(flag);
  }
}

/* công trình theo chủ sở hữu (ô cờ giữ nguyên màu gốc)
   Xây: từng bộ phận rơi từ trên xuống, thấp trước cao sau. Bán: đảo ngược, bộ phận cao nhất bốc lên trước rồi biến mất.
   Mua lại / nâng cấp: chạy hoạt ảnh bán nhà cũ xong mới xây nhà mới. */
const buildObjs = {}, tileSigs = {};
const BUILD_SPREAD = 1650, BUILD_DUR = 760, BUILD_MS = BUILD_SPREAD + BUILD_DUR; // ≈ 2,4 s (trước đây ≈ 1,4 s)
const anims = [];
const beachLevel = (owner) => Math.min(4, G.ownedBy(S, owner).filter((j) => TILES[j].type === 'resort').length);
function makeBuilding(i) {
  const pr = S.props[i], t = TILES[i], hex = seatOf[pr.owner].color, far = FAR(tileFrame(i).side);
  const grp = new THREE.Group();
  let p;
  if (t.type === 'resort') {
    // nhà biển lùi về phía nước để chừa chỗ cho tên bãi biển ở giữa bãi cát
    const h = HK.beachHouse(Math.max(1, beachLevel(pr.owner)), hex); h.scale.multiplyScalar(0.94); grp.add(h);
    p = local(i, 0, far ? 0.81 : -0.81);
  } else { grp.add(HK.building('suburb', pr.level, hex)); p = local(i, 0, lay(i).grassZ); }
  // mặt tiền luôn hướng về dải xám (phía người nhìn)
  grp.position.set(p.x, TOPY, p.z); grp.rotation.y = tileFrame(i).rot + (far ? Math.PI : 0);
  return grp;
}
function partsOf(obj) {
  obj.updateMatrixWorld(true);
  const list = [];
  obj.traverse((o) => {
    if (!o.isMesh) return;
    for (let q = o.parent; q && q !== obj; q = q.parent) if (q.isMesh) return;
    list.push(o);
  });
  const wp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  return list.map((o) => {
    o.getWorldPosition(wp);
    const bb = new THREE.Box3().setFromObject(o);
    const a0 = o.parent.worldToLocal(wp.clone()), a1 = o.parent.worldToLocal(wp.clone().add(up));
    return { o, pos: o.position.clone(), sc: o.scale.clone(), up: a1.sub(a0), y: bb.min.y, h: bb.max.y, x: wp.x + wp.z };
  });
}
function animate(obj, mode, delay, onDone) {
  const parts = partsOf(obj).sort((p, q) => (p.y - q.y) || (p.h - q.h) || (q.x - p.x));
  if (mode === 'sell') parts.reverse();
  const motionScale = REDUCED ? 0.55 : 1;
  const n = parts.length, spread = (mode === 'build' ? (n > 1 ? BUILD_SPREAD : 0) : Math.min(700, n * 70)) * motionScale;
  const dur = (mode === 'build' ? (n > 1 ? BUILD_DUR : BUILD_MS) : 360) * motionScale;
  parts.forEach((p, k) => { p.at = n > 1 ? Math.pow(k / (n - 1), 0.85) * spread : 0; });
  const an = { obj, mode, parts, t0: performance.now() + (delay || 0), dur, total: spread + dur, onDone };
  stepAnim(an, performance.now()); anims.push(an);
  return an.total + (delay || 0);
}
function stepAnim(an, now) {
  const t = now - an.t0;
  for (const p of an.parts) {
    const k = Math.max(0, Math.min(1, (t - p.at) / an.dur));
    if (an.mode === 'build') {
      if (t < p.at) { p.o.scale.setScalar(1e-4); continue; }
      const e = 1 - Math.pow(1 - k, 3);                       // rơi nhanh rồi đáp nhẹ
      const land = k > 0.82 ? Math.sin((k - 0.82) / 0.18 * Math.PI) * 0.06 : 0; // nảy rất nhẹ khi chạm đất
      p.o.position.copy(p.pos).addScaledVector(p.up, (1 - e) * 2.4);
      p.o.scale.copy(p.sc).multiplyScalar(0.6 + 0.4 * e);
      if (land) p.o.scale.y *= 1 - land;
    } else {
      const e = k * k * (3 - 2 * k);                          // bốc lên, nhỏ dần, biến mất
      p.o.position.copy(p.pos).addScaledVector(p.up, e * 1.8);
      p.o.scale.copy(p.sc).multiplyScalar(Math.max(1e-4, 1 - e));
    }
  }
  if (t < an.total) return false;
  for (const p of an.parts) { if (an.mode === 'build') { p.o.position.copy(p.pos); p.o.scale.copy(p.sc); } }
  return true;
}
function stepAnims(now) {
  for (let k = anims.length - 1; k >= 0; k--) {
    const an = anims[k];
    if (stepAnim(an, now)) { anims.splice(k, 1); an.onDone && an.onDone(); }
  }
}
function clearBuildings() {
  anims.length = 0;
  Object.values(buildObjs).forEach((b) => board.remove(b.obj)); for (const k in buildObjs) delete buildObjs[k];
  for (const o of dyingObjs) board.remove(o); dyingObjs.clear();
  for (const k in tileSigs) delete tileSigs[k];
}
const dyingObjs = new Set();
// trả về thời điểm (ms) nhà mới bắt đầu xây, để tiền chạy cùng lúc
function syncBuildings(instant) {
  let startAt = 0;
  for (let i = 0; i < 32; i++) {
    const pr = S.props[i], t = TILES[i];
    const tsig = pr ? `${pr.owner}:${pr.level}:${S.festival === i}:${S.festLevel}:${outageRounds(i)}:${G.rentOf(S, i)}` : '';
    if (tileSigs[i] !== tsig) { tileSigs[i] = tsig; refreshTile(i); }
    const msig = pr ? `${pr.owner}:${t.type === 'resort' ? 'b' + beachLevel(pr.owner) : pr.level}` : '';
    if ((buildObjs[i] ? buildObjs[i].sig : '') === msig) continue;
    let wait = 0;
    if (buildObjs[i] && instant) { board.remove(buildObjs[i].obj); delete buildObjs[i]; }
    if (buildObjs[i]) { // bán / bị mua lại / đổi cấp: nhà cũ bốc lên biến mất trước
      const old = buildObjs[i].obj; delete buildObjs[i];
      dyingObjs.add(old);
      wait = animate(old, 'sell', 0, () => { board.remove(old); dyingObjs.delete(old); });
      if (wait) wait += 120;
    }
    if (!pr) continue;
    const grp = makeBuilding(i);
    board.add(grp);
    if (!instant) { animate(grp, 'build', wait); startAt = Math.max(startAt, wait); }
    buildObjs[i] = { obj: grp, sig: msig };
  }
  syncFestival();
  return startAt;
}

/* quân cờ: thú khối */
const FACE_CAM = Math.PI / 4; // quay mặt về phía người nhìn
// Mọi nhân vật dùng cùng chiều cao hiển thị; 1.08 = kích thước cũ xấp xỉ 0.9, tăng 20%.
const TOKEN_HEIGHT = 1.08;
const tokens = {};
function tokenSpot(pid, pos) {
  const here = S.players.filter((p) => !p.bankrupt && (dispPos[p.id] ?? p.pos) === pos);
  const k = Math.max(0, here.findIndex((p) => p.id === pid)), n = Math.max(1, here.length);
  const f = tileFrame(pos);
  if (f.corner) { // ô Start: hàng phía trước chữ START; các góc khác: hai bên nhãn
    const g = pos === 0 ? [[0.79, 1.11], [1.11, 0.79], [0.48, 1.42], [1.42, 0.48]][k % 4] : [[1.0, -0.2], [-0.2, 1.0], [1.3, -0.62], [-0.62, 1.3]][k % 4];
    return local(pos, g[0], g[1]);
  }
  const off = (k - (n - 1) / 2) * 0.42;
  return local(pos, off, lay(pos).tokZ + (k % 2 ? (FAR(f.side) ? 0.16 : -0.16) : 0));
}
const dispPos = {};
function buildTokens() {
  Object.values(tokens).forEach((t) => scene.remove(t));
  for (const p of S.players) {
    const t = place(seatOf[p.id].pet, TOKEN_HEIGHT, { byHeight: true });
    const glowMat = new THREE.MeshBasicMaterial({ color: seatOf[p.id].color, side: THREE.BackSide, transparent: true, opacity: 0.7, depthWrite: false });
    const controlGlow = place(seatOf[p.id].pet, TOKEN_HEIGHT, { byHeight: true, material: () => glowMat });
    controlGlow.position.y = 0.05; controlGlow.scale.setScalar(1.075); controlGlow.visible = false;
    controlGlow.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.renderOrder = -1; } });
    t.add(controlGlow); t.userData.controlGlow = controlGlow; t.userData.glowMaterial = glowMat;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 28), new THREE.MeshStandardMaterial({ color: seatOf[p.id].color, roughness: .6 }));
    ring.position.y = 0.025; ring.receiveShadow = true; t.add(ring);
    t.children[0].position.y += 0.05;
    scene.add(t); tokens[p.id] = t;
  }
  syncTokens(true);
}
function syncTokens(snap) {
  for (const p of S.players) {
    const t = tokens[p.id];
    t.visible = !p.bankrupt;
    const controlled = MODE === 'net' ? isMe(p.id) : (!!curP() && curP().id === p.id);
    if (t.userData.controlGlow) t.userData.controlGlow.visible = !p.bankrupt && controlled;
    if (dispPos[p.id] !== undefined) continue;
    const v = tokenSpot(p.id, p.pos);
    if (snap) t.position.set(v.x, TOPY, v.z);
    t.userData.to = v;
    t.rotation.y = FACE_CAM;
  }
}
async function hop(pid, path, onTile) {
  const t = tokens[pid];
  t.userData.to = null;
  for (const pos of path) {
    const from = t.position.clone(); dispPos[pid] = pos;
    const to = tokenSpot(pid, pos); to.y = TOPY;
    t.rotation.y = FACE_CAM;
    const dur = REDUCED ? (path.length > 10 ? 90 : 120) : (path.length > 10 ? 120 : 190);
    const t0 = performance.now();
    await new Promise((res) => {
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / dur);
        t.position.lerpVectors(from, to, k); t.position.y = TOPY + Math.sin(k * Math.PI) * 0.6;
        if (k < 1) requestAnimationFrame(step); else res();
      };
      step();
    });
    onTile && onTile(pos);
  }
  t.userData.to = tokenSpot(pid, path[path.length - 1]);
  delete dispPos[pid];
  t.rotation.y = FACE_CAM;
}

/* xúc xắc 3D */
const PIPS = { 1: [[.5, .5]], 2: [[.27, .27], [.73, .73]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]], 5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]], 6: [[.28, .22], [.72, .22], [.28, .5], [.72, .5], [.28, .78], [.72, .78]] };
function dieFace(v) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 128);
  PIPS[v].forEach(([x, y]) => { c.fillStyle = v === 1 ? '#ec3f78' : '#26364a'; c.beginPath(); c.arc(x * 128, y * 128, v === 1 ? 17 : 12, 0, 7); c.fill(); });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, roughness: .45 });
}
const FACE_VALUES = [3, 4, 1, 6, 2, 5]; // +x -x +y -y +z -z
const FACE_UP = { 1: new THREE.Euler(0, 0, 0), 6: new THREE.Euler(Math.PI, 0, 0), 3: new THREE.Euler(0, 0, Math.PI / 2), 4: new THREE.Euler(0, 0, -Math.PI / 2), 2: new THREE.Euler(-Math.PI / 2, 0, 0), 5: new THREE.Euler(Math.PI / 2, 0, 0) };
const dice = [0, 1].map(() => {
  const m = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.8, 0.8, 4, 0.13), FACE_VALUES.map(dieFace));
  m.castShadow = true; m.position.set(0, 0.8, 0); scene.add(m); return m;
});
dice[0].position.set(-0.4, DIE_Y, 1.9); dice[1].position.set(0.9, DIE_Y, 2.3);
async function rollDice(a, b) {
  const land = [new THREE.Vector3(-0.4, DIE_Y, 1.9), new THREE.Vector3(0.9, DIE_Y, 2.3)];
  const startP = [new THREE.Vector3(-3.2, 4.5, -2.4), new THREE.Vector3(-2.4, 5, -3.1)];
  const finalQ = [a, b].map((v, k) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (k ? 0.5 : -0.3) + Math.random() * 0.6).multiply(new THREE.Quaternion().setFromEuler(FACE_UP[v])));
  const axes = [0, 1].map(() => new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize());
  const dur = REDUCED ? 650 : 1150, t0 = performance.now();
  await new Promise((res) => {
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      dice.forEach((d, n) => {
        const e = 1 - Math.pow(1 - k, 3);
        d.position.lerpVectors(startP[n], land[n], e);
        d.position.y = DIE_Y + (k < 0.55 ? (1 - k / 0.55) * 4.3 : Math.abs(Math.sin((k - 0.55) / 0.45 * Math.PI * 2)) * (1 - k) * 1.2);
        const spin = new THREE.Quaternion().setFromAxisAngle(axes[n], Math.pow(1 - k, 2) * Math.PI * 7);
        d.quaternion.copy(finalQ[n]).multiply(spin);
      });
      if (k < 1) requestAnimationFrame(step); else res();
    };
    step();
  });
  showDiceSum(a + b, a === b);
}
// tổng xúc xắc: bật ở chính giữa màn hình rồi tắt nhanh (~1 giây)
function showDiceSum(n, dbl) {
  const el = $('#dicesum');
  el.innerHTML = `${n}${dbl ? '<small>ĐÔI</small>' : ''}`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(showDiceSum.t); showDiceSum.t = setTimeout(() => el.classList.remove('show'), 1000);
}

/* ảnh chụp mô hình cho avatar & hộp thoại */
const snapR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
snapR.setSize(220, 220); snapR.outputColorSpace = THREE.SRGBColorSpace;
const snapScene = new THREE.Scene();
snapScene.add(new THREE.HemisphereLight(0xffffff, 0xb0c0d0, 1.5));
const sl = new THREE.DirectionalLight(0xffffff, 1.4); sl.position.set(3, 5, 4); snapScene.add(sl);
const snapCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
const snapCache = {};
function snapshot(key, obj) {
  if (snapCache[key]) return snapCache[key];
  snapScene.add(obj);
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  const r = Math.max(size.x, size.y, size.z) * 0.78;
  Object.assign(snapCam, { left: -r, right: r, top: r, bottom: -r });
  snapCam.position.set(ctr.x + 6, ctr.y + 4.5, ctr.z + 6); snapCam.lookAt(ctr); snapCam.updateProjectionMatrix();
  snapR.render(snapScene, snapCam);
  const url = snapR.domElement.toDataURL('image/png');
  snapScene.remove(obj);
  return (snapCache[key] = url);
}

/* ---------------- khung hình, zoom & kéo ---------------- */
const CAM_OFF = new THREE.Vector3(20, 16.5, 20);
const view = { zoom: 1, tx: 0, tz: 0 };
let baseVH = 20;
function applyView() {
  const lim = H2 * 0.9;
  view.tx = Math.max(-lim, Math.min(lim, view.tx)); view.tz = Math.max(-lim, Math.min(lim, view.tz));
  view.zoom = Math.max(0.75, Math.min(3, view.zoom));
  camera.position.set(view.tx + CAM_OFF.x, CAM_OFF.y, view.tz + CAM_OFF.z);
  camera.lookAt(view.tx, 0, view.tz);
  camera.zoom = view.zoom; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
}
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h);
  const aspect = w / h, needW = L * 1.5 + 1.2, needH = L * 0.9;
  baseVH = Math.max(needH, needW / aspect);
  camera.top = baseVH / 2 + 0.5; camera.bottom = -baseVH / 2 + 0.5; camera.left = -baseVH * aspect / 2; camera.right = baseVH * aspect / 2;
  applyView();
}
function screenOf(v) { camera.updateMatrixWorld(); tmpV.copy(v).project(camera); return { x: (tmpV.x + 1) / 2 * innerWidth, y: (1 - tmpV.y) / 2 * innerHeight }; }

function zoomBy(f) { view.zoom *= f; applyView(); }
$('#zin').onclick = () => zoomBy(1.25);
$('#zout').onclick = () => zoomBy(0.8);
$('#zfit').onclick = () => { view.zoom = 1; view.tx = 0; view.tz = 0; applyView(); };
// kéo để di chuyển, cuộn / chụm hai ngón để zoom, chạm để chọn ô
const ptrs = new Map();
let drag = null, pinch0 = null;
const cvs = renderer.domElement;
cvs.addEventListener('pointerdown', (e) => { cvs.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); drag = { x: e.clientX, y: e.clientY, moved: 0 }; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), z: view.zoom }; } });
cvs.addEventListener('pointermove', (e) => {
  if (!ptrs.has(e.pointerId)) return;
  const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2 && pinch0) { const [a, b] = [...ptrs.values()]; view.zoom = pinch0.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch0.d; applyView(); drag.moved = 99; return; }
  const dx = e.clientX - prev.x, dy = e.clientY - prev.y; drag.moved += Math.abs(dx) + Math.abs(dy);
  const upp = (camera.right - camera.left) / (view.zoom * innerWidth);
  const sinE = CAM_OFF.y / CAM_OFF.length();
  // màn hình phải = (1,0,-1)/√2 ; màn hình lên (trên mặt đất) = (-1,0,-1)/√2 / sinE
  const r = -dx * upp / Math.SQRT2, u = dy * upp / Math.SQRT2 / sinE;
  view.tx += r - u; view.tz += -r - u; applyView();
});
const endPtr = (e) => {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = null;
  if (drag && drag.moved < 6 && ptrs.size === 0) pickAt(e.clientX, e.clientY);
};
cvs.addEventListener('pointerup', endPtr); cvs.addEventListener('pointercancel', endPtr);
cvs.addEventListener('wheel', (e) => { e.preventDefault(); zoomBy(Math.exp(-e.deltaY * 0.0015)); }, { passive: false });

/* chọn ô bằng chạm */
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
let pickable = null;
function pickAt(cx, cy) {
  mouse.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects(tileMeshes)[0];
  if (!hit) return;
  const i = hit.object.userData.tile;
  if (pickable) { if (pickable.set.has(i)) pickable.cb(i); return; }
  if (!$('#modal').classList.contains('show')) showInfo(i);
}

/* mũi tên nhấp nhô trên đầu quân đang tới lượt, cùng màu với người chơi */
const turnArrow = (() => {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.4 });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.36, 4), m); cone.rotation.x = Math.PI; cone.castShadow = true; g.add(cone);
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.12), m); stem.position.y = 0.26; g.add(stem);
  g.userData.material = m; g.userData.playerColor = '';
  g.scale.setScalar(1.7); g.visible = false; scene.add(g); return g;
})();
// pháo giấy rơi quanh một ô (tổ chức lễ hội)
const confetti = [];
function burstConfetti(i) {
  const f = tileFrame(i), cols = ['#ff6fa0', '#ffc23a', '#5cc6e8', '#7fd6a0', '#a98af0', '#ffffff'];
  for (let n = 0; n < 70; n++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.05), new THREE.MeshBasicMaterial({ color: cols[n % cols.length], side: THREE.DoubleSide, transparent: true }));
    m.position.set(f.x + (Math.random() - 0.5) * 0.6, TOPY + 1.4, f.z + (Math.random() - 0.5) * 0.6); scene.add(m);
    confetti.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 2.4, 2 + Math.random() * 2.2, (Math.random() - 0.5) * 2.4), spin: Math.random() * 10, t0: performance.now() });
  }
}
function stepConfetti(now, dt) {
  for (let k = confetti.length - 1; k >= 0; k--) {
    const c = confetti[k], age = (now - c.t0) / 1000;
    c.v.y -= 4.5 * dt; c.v.multiplyScalar(Math.pow(0.985, dt * 60)); c.m.position.addScaledVector(c.v, dt); c.m.rotation.set(age * c.spin, age * c.spin * 0.7, 0);
    if (c.m.position.y < TOPY) c.m.position.y = TOPY, c.v.set(0, 0, 0);
    c.m.material.opacity = Math.max(0, 1 - Math.max(0, age - 2) / 0.8);
    if (age > 2.8) { scene.remove(c.m); confetti.splice(k, 1); }
  }
}
function placeOverlays() {
  const p = curP(), arrowOn = !!p && !!tokens[p.id] && !p.bankrupt;
  turnArrow.visible = arrowOn;
  if (arrowOn) {
    const color = (seatOf[p.id] && seatOf[p.id].color) || p.color;
    if (turnArrow.userData.playerColor !== color) {
      turnArrow.userData.playerColor = color;
      turnArrow.userData.material.color.set(color);
      turnArrow.userData.material.emissive.set(color);
    }
    const t = tokens[p.id].position; turnArrow.position.set(t.x, t.y + 1.45 + Math.sin(clockT * 4) * 0.14, t.z); turnArrow.rotation.y = clockT * 1.5;
  }
  const bc = $('#bigclock');
  bc.classList.toggle('show', S.phase === 'play' && !!S.endsAt);
  const bar = document.querySelector('.pcard.cur .tbar i'), left = G.stepLeft(S, now());
  if (bar) { const tot = S.settings.turnSec * 1000, v = left === null ? 1 : Math.max(0, Math.min(1, left / tot)); bar.style.transform = `scaleX(${v})`; bar.parentNode.classList.toggle('low', v < 0.3); bar.parentNode.style.visibility = left === null ? 'hidden' : ''; }
}

/* vòng lặp vẽ */
let clockT = 0;
function frame(now) {
  if (!frameRunning) return;
  clockT = now / 1000;
  const dt = Math.min(0.05, Math.max(0, clockT - (frame.last || clockT))); frame.last = clockT;
  stepAnims(now);
  if (!REDUCED) { specials.forEach((o) => o.userData.update && o.userData.update(clockT, dt)); bonusFlags.forEach((o, k) => o.userData.update(clockT + k * 0.7));  if (tourTex) tourTex.offset.set((-clockT * 0.035) % 1, (-clockT * 0.035) % 1); }
  const followAlpha = 1 - Math.pow(1 - 0.25, dt * 60);
  for (const p of S ? S.players : []) { const t = tokens[p.id]; if (t && t.userData.to && dispPos[p.id] === undefined) { t.position.lerp(new THREE.Vector3(t.userData.to.x, TOPY, t.userData.to.z), followAlpha); } }
  Object.values(tokens).forEach((t) => { const g = t.userData.controlGlow; if (g && g.visible) { const pulse = 1.075 + Math.sin(clockT * 4.5) * 0.012; g.scale.setScalar(pulse); t.userData.glowMaterial.opacity = 0.58 + Math.sin(clockT * 4.5) * 0.12; } });
  placeSellTags(); placeOverlays(); stepConfetti(now, dt);
  if (festBanner) { // bảng lễ hội bật ra rồi đứng yên
    const festDuration = REDUCED ? 300 : 650;
    const k = festBanner.userData.t0 < 0 ? 1 : Math.min(1, (now - festBanner.userData.t0) / festDuration);
    const e = k < 1 ? 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2) : 1;
    festBanner.scale.set(Math.max(0.001, e), Math.max(0.001, e), 1);
  }
  glows.forEach((g) => { if (g.userData.on) g.material.opacity = 0.12 + Math.sin(clockT * 5) * 0.1; else g.material.opacity = 0; });
  renderer.render(scene, camera);
  if (frameRunning) requestAnimationFrame(frame);
}
function startFrame() {
  if (frameRunning) return;
  frameRunning = true;
  frame.last = 0;
  requestAnimationFrame(frame);
}

/* ---------------- giao diện ---------------- */
let busy = false;
// Tiền bị trừ chạy nhanh để không làm chậm nhịp chơi; tiền nhận vẫn đồng bộ với hoạt ảnh xây nhà.
const MONEY_MS = REDUCED ? 900 : BUILD_MS;
const MONEY_DEBIT_MS = REDUCED ? 400 : 700;
const target = {}, shown = {};      // số tiền đích / số đang hiển thị của mỗi người
const fmtDelta = (d) => { const a = Math.abs(d), v = a >= 1000 ? (a / 1000).toFixed(2).replace(/\.?0+$/, '') + 'M' : (Math.round(a * 10) / 10) + 'K'; return (d > 0 ? '+$' : '-$') + v; };
function moneyEl(pid) { return $(`#cards [data-p="${pid}"] .num`); }
function floatDelta(pid, d) {
  const el = moneyEl(pid); if (!el || !d) return;
  const r = el.getBoundingClientRect(), f = document.createElement('div');
  f.className = 'delta ' + (d > 0 ? 'up' : 'down'); f.textContent = fmtDelta(d);
  const duration = d < 0 ? 900 : Math.max(1600, MONEY_MS);
  f.style.left = r.left + r.width / 2 + 'px'; f.style.top = r.top - 4 + 'px'; f.style.animationDuration = duration + 'ms';
  document.body.appendChild(f); setTimeout(() => f.remove(), duration + 100);
}
const tweens = {};
function tweenMoney(pid, to, delay = 0) {
  const from = shown[pid] ?? to; cancelAnimationFrame(tweens[pid]);
  const duration = to < from ? MONEY_DEBIT_MS : MONEY_MS;
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
      <div class="av"><img alt="" src="${snapshot('pet-' + st.pet, place(st.pet, 1))}"></div>
      <div class="info"><div class="nm">${esc(p.name)}${MODE === 'net' && isMe(p.id) ? ' <em>(bạn)</em>' : ''}</div><div class="mo"><span class="num"></span><small></small><div class="power"></div></div><div class="tbar"><i></i></div></div></div>`; }).join('');
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
function setDim(set) {
  const on = !!set;
  hemi.intensity = on ? 0.55 : 1.6; sun.intensity = on ? 0.45 : 1.35;
  tileMeshes.forEach((m, i) => {
    const lit = on && set.has(i);
    m.material.emissive = new THREE.Color(lit ? 0xffffff : 0x000000);
    m.material.emissiveMap = lit ? m.material.map : null;
    m.material.emissiveIntensity = lit ? 0.75 : 0;
    m.material.needsUpdate = true;
  });
  glows.forEach((g, i) => { g.userData.on = on && set.has(i); });
}
function setPick(kind, set, cb, label, skip) {
  pickable = { set, cb };
  setDim(set);
  const b = $('#banner'); b.innerHTML = `<span>${label}</span>${skip ? `<button class="pill ghost" type="button" id="pickskip" style="font-size:16px;padding:9px 16px">${skip}</button>` : ''}`; b.classList.add('show');
  if (skip) $('#pickskip').onclick = () => { clearPick(); act('skip'); };
}
function clearPick() { pickable = null; setDim(null); $('#banner').classList.remove('show'); }

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
  clearPick(); endSell();
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
  hub.querySelectorAll('[data-a]').forEach((b) => { b.onclick = () => act(b.dataset.a); });
  if (st.kind === 'tour') {
    const ok = p.money >= CFG.TOUR_FEE;
    setPick('tour', new Set(ok ? TILES.map((t) => t.i).filter((i) => i !== p.pos) : []), (i) => { clearPick(); act('tour', { tile: i }); },
      ok ? `${esc(p.name)}: chọn ô muốn bay tới (vé ${shortK(CFG.TOUR_FEE)})` : `${esc(p.name)} không đủ ${shortK(CFG.TOUR_FEE)} mua vé`, 'Không bay');
  }
  if (st.kind === 'festival') {
    const next = CFG.FEST_MULT[Math.min(CFG.FEST_MULT.length - 1, (S.festLevel || 0) + 1)];
    setPick('festival', new Set(G.ownedBy(S, p.id)), (i) => { clearPick(); act('festival', { tile: i }); }, `${esc(p.name)}: chọn ô tổ chức lễ hội (thuê x${next})`, 'Bỏ qua');
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
    m.innerHTML = sheet('#86a81f', timeUp ? `Hết giờ! ${esc(w.name)} thắng` : `${esc(w.name)} thắng!`, esc(S.winReason),
      `<table class="rank"><thead><tr><th></th><th>NGƯỜI CHƠI</th><th>TIỀN MẶT</th><th>TỔNG TÀI SẢN</th></tr></thead><tbody>${rank.map((p, k) => `<tr><td>${k + 1}</td><td>${esc(p.name)}</td><td>${p.bankrupt ? '—' : money(p.money)}</td><td>${p.bankrupt ? 'Phá sản' : money(G.networth(S, p))}</td></tr>`).join('')}</tbody></table>
`,
      MODE === 'local' || me ? '<button class="pill" type="button" id="again">Chơi ván mới</button>' : '');
    m.classList.add('show'); if ($('#again')) $('#again').onclick = newGameFlow; return;
  }
  const st = S.step, p = S.players[S.turn];
  if (!myTurn()) { m.classList.remove('show'); m.innerHTML = ''; return; }
  if (!busy && st && st.kind === 'flight') {
    const card = G.CARDS.find((x) => x.id === 'FLIGHT_TICKET');
    m.innerHTML = sheet('#f5a20a', esc(card.title), 'Chance', `<div class="chance"><p>${esc(card.text)}</p></div>`, '<button class="pill" type="button" id="ok">OK</button>');
    m.classList.remove('peek'); m.classList.add('show'); $('#ok').onclick = () => act('flight'); return;
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
    const img = (l) => snapshot(resort ? `hb${bl}${col}` : `h${t.type}${l}${col}`, resort ? HK.beachHouse(bl, col) : HK.building('suburb', l, col));
    const rentAt = (l) => (resort ? CFG.RESORT_TOLL[bl] : G.toll(i, l));
    const card = (l) => {
      const built = st.kind === 'upgrade' && l <= cur, on = built || (l <= pickLevel && (choosable.includes(l) || l === 0 || (st.kind === 'buy'))), lock = built || !can(l);
      const lapLock = !built && l <= 3 && l > cap;
      const note = built ? 'Đã xây' : lapLock ? `🔒 Vòng ${CFG.LAP_CAP.indexOf(l) + 1}` : choosable.includes(l) ? money(costOf(l)) : '';
      return `<button type="button" data-l="${l}" class="${on ? 'on' : ''}" ${lock ? 'disabled' : ''} style="${!built && !can(l) ? 'opacity:.45' : ''}">
        <img alt="" src="${img(l)}"><b>${resort ? HK.BEACH_LEVELS[bl - 1] : NAMES[l]}</b><span>${note}</span><i class="tick${on ? ' y' : ''}" aria-hidden="true"></i></button>`;
    };
    const price = costOf(pickLevel);
    const body = `<div class="lv" style="--n:${shown.length}">${shown.map(card).join('')}</div>
      <div class="sum"><div>Tiền thuê<strong>${money(rentAt(pickLevel))}</strong></div><div style="text-align:right">Bạn có<strong>${money(p.money)}</strong></div></div>
      ${resort || pickLevel >= CFG.LANDMARK ? '' : `<div class="kv"><span>Giá mua lại</span><b>${money(G.value(i, pickLevel) * CFG.BUYOUT_MULT)}</b></div>`}`;
    const verb = st.kind === 'buy' ? 'Mua với giá' : cur === 3 ? 'Xây khách sạn ·' : 'Nâng cấp ·';
    m.innerHTML = sheet(t.group ? GROUPS[t.group].color : RESORT_COLOR, esc(t.name), esc(t.group ? GROUPS[t.group].name : 'Bãi biển'), body,
      `<button class="pill ghost" type="button" id="no">${st.kind === 'buy' ? 'Không mua' : 'Để sau'}</button><button class="pill" type="button" id="yes" ${can(pickLevel) ? '' : 'disabled'}>${verb} ${money(price)}</button>`);
    m.querySelectorAll('[data-l]').forEach((b) => { b.onclick = () => { const l = Number(b.dataset.l); if (can(l)) { pickLevel = l; renderModal(); } }; });
    $('#no').onclick = () => act('skip');
    $('#yes').onclick = () => act(st.kind, { level: pickLevel });
  } else if (st.kind === 'takeover') {
    const pr = S.props[st.tile], owner = G.byId(S, pr.owner);
    const img = snapshot(`h${pr.level}${col}`, HK.building('suburb', pr.level, col));
    m.innerHTML = sheet('#f5a20a', 'Mua lại?', `${esc(TILES[st.tile].name)} của ${esc(owner.name)}`, `<div class="tinfo"><div class="pic"><img alt="" src="${img}"></div><div>
      <p style="margin:2px 0 6px">Nhận luôn <b>${G.LEVEL_NAMES[pr.level]}</b></p>
      <div class="kv"><span>Giá mua lại</span><b>${money(st.price)}</b></div><div class="kv"><span>Bạn có</span><b>${money(p.money)}</b></div>
      </div></div>`,
      `<button class="pill ghost" type="button" id="no">Thôi</button><button class="pill" type="button" id="yes">Mua lại</button>`);
    $('#no').onclick = () => act('skip'); $('#yes').onclick = () => act('takeover');
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
  tour: (mine, n) => (mine ? 'World Tour! Lượt sau bạn được bay tới bất kỳ ô nào' : `${n} tới World Tour — lượt sau được bay`),
  festival: (mine, n, x) => `Lễ hội ở ${TILES[x.tile].name}! Tiền thuê x${x.mult}`,
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
  setDim(new Set(own));
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
    const i = Number(el.dataset.i), f = tileFrame(i), q = screenOf(new THREE.Vector3(f.x, TOPY + (i % 2 ? 1.75 : 1.0), f.z)); // so le để nhãn ô cạnh nhau không chồng
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
      <td>${money(l === 0 ? G.value(i, 0) : G.upgradeCost(i, l - 1, l))}</td><td>${money(G.toll(i, l))}</td><td>${money(G.value(i, l) * CFG.SELL_MULT)}</td></tr>`).join('');
    if (pr && G.ownsGroup(S, pr.owner, t.group)) notes.push(`Độc quyền nhóm ${GROUPS[t.group].name}: tiền thuê x${CFG.MONOPOLY_MULT}`);
    body = `<div class="tinfo"><div class="pic"><img alt="" src="${snapshot(`h${Math.max(0, lv)}${hex}`, HK.building('suburb', Math.max(0, lv), hex))}"></div><div>
      <table class="lvl"><thead><tr><th>Công trình</th><th>Giá xây</th><th>Tiền thuê</th><th>Bán ngân hàng</th></tr></thead><tbody>${rows}</tbody></table>
      ${pr ? `<div class="kv"><span>Tiền thuê hiện tại</span><b>${money(G.rentOf(S, i))}</b></div>
        <div class="kv"><span>Giá mua lại</span><b>${G.canTakeover(S, i) ? money(G.takeoverPrice(S, i)) : 'Không thể mua lại'}</b></div>` : ''}
    </div></div>`;
  } else if (t.type === 'resort') {
    color = RESORT_COLOR; sub = `Bãi biển · ${owner ? 'của ' + esc(owner.name) : 'chưa có chủ'}`;
    const n = pr ? beachLevel(pr.owner) : 0;
    const rows = [1, 2, 3, 4].map((k) => `<tr class="${k === n ? 'cur' : ''}"><td><span class="ck">${k <= n ? '✓' : ''}</span>${k} bãi biển · ${HK.BEACH_LEVELS[k - 1]}</td><td>${money(CFG.RESORT_TOLL[k])}</td></tr>`).join('');
    body = `<div class="tinfo"><div class="pic"><img alt="" src="${snapshot(`hb${Math.max(1, n)}${hex}`, HK.beachHouse(Math.max(1, n), hex))}"></div><div>
      <table class="lvl"><thead><tr><th>Số bãi cùng chủ</th><th>Tiền thuê</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="kv"><span>Giá mua</span><b>${money(t.price)}</b></div>
      <div class="kv"><span>Bán ngân hàng</span><b>${money(t.price * CFG.SELL_MULT)}</b></div>
      ${pr ? `<div class="kv"><span>Tiền thuê hiện tại</span><b>${money(G.rentOf(S, i))}</b></div>` : ''}
    </div></div>`;
  } else {
    const fest = S.festival !== null && S.festival !== undefined ? `Hiện đang có lễ hội x${G.festMult(S)} ở ${esc(TILES[S.festival].name)}.` : 'Hiện chưa có lễ hội nào.';
    const nextMult = CFG.FEST_MULT[Math.min(CFG.FEST_MULT.length - 1, (S.festLevel || 0) + 1)];
    const taxNow = p ? Math.max(CFG.TAX_MIN, Math.round(G.taxBase(S, p) * CFG.TAX_RATE / 10) * 10) : 0;
    const R = {
      start: ['#e2557f', 'Điểm xuất phát', [
        `Mỗi lần đi qua hoặc dừng ở Start nhận lương <b>${money(CFG.SALARY)}</b>, kể cả khi bay World Tour qua Start.`,
        'Vòng đầu xây tối đa Nhà 2. Qua Start lần đầu mở khoá Nhà 3.',
        'Khách sạn xây được khi quay lại ô đã có Nhà 3.']],
      island: ['#3aa0f0', 'Đảo hoang', [
        `Dừng ở đây hoặc đổ đôi ${CFG.MAX_DOUBLES} lần liên tiếp thì bị kẹt tối đa ${CFG.ISLAND_TURNS} lượt.`,
        `Mỗi lượt trên đảo chọn: đổ xúc xắc (ra đôi thì thoát và đi luôn), trả <b>${money(CFG.ISLAND_FEE)}</b> để rời đảo ngay, hoặc dùng thẻ Thoát đảo.`,
        `Hết ${CFG.ISLAND_TURNS} lượt thì tự rời đảo. Trong lúc kẹt vẫn thu tiền thuê bình thường.`]],
      festival: ['#f5a20a', 'Lễ hội', [
        'Dừng ở đây được chọn 1 ô đất hoặc bãi biển của mình để tổ chức lễ hội.',
        `Mỗi lần tổ chức hệ số tăng dần: ${CFG.FEST_MULT.slice(1).map((m) => 'x' + m).join(' → ')}. Lần tổ chức tới sẽ là x${nextMult}.`,
        'Cả bàn chỉ có một lễ hội; tổ chức ở ô mới thì lễ hội chuyển sang ô đó. Thẻ Cúp điện làm mất lễ hội.', fest]],
      tour: ['#2c8ff0', 'Du lịch thế giới', [
        `Dừng ở đây thì lượt sau được bay tới bất kỳ ô nào, vé <b>${money(CFG.TOUR_FEE)}</b>; có thể không bay để đổ xúc xắc như thường.`,
        'Bay qua Start vẫn nhận lương. Tới ô nào thì xử lý như dừng ở ô đó: mua đất, nâng cấp, trả tiền thuê, mua lại…']],
      tax: ['#6b7685', 'Thuế', [
        `Dừng ở đây nộp <b>${Math.round(CFG.TAX_RATE * 100)}%</b> tổng tài sản (tiền mặt + giá trị đất và nhà), tối thiểu ${money(CFG.TAX_MIN)}.`,
        p ? `Nếu ${esc(p.name)} dừng ở đây lúc này sẽ nộp <b>${money(taxNow)}</b>.` : '']],
      chance: ['#f2a33c', 'Cơ hội', [
        'Dừng ở đây rút một thẻ ngẫu nhiên:',
        ...G.CARDS.map((c) => `<b>${esc(c.title)}</b>: ${esc(c.text)}`)]],
    }[t.type];
    color = R[0]; sub = R[1];
    body = `<ul class="rules">${R[2].filter(Boolean).map((x) => `<li>${x}</li>`).join('')}</ul>`;
  }
  const el = $('#info');
  el.innerHTML = `<div class="sheet" style="--rc:${color}"><div class="ribbon">${esc(t.type === 'chance' ? 'CHANCE' : t.name.toUpperCase())}<small>${sub}</small></div>${xBtn}
    <div class="body">${body}${notes.length ? `<div style="margin-top:10px">${notes.map((n) => `<p class="note" style="margin:4px 0">${n}</p>`).join('')}</div>` : ''}</div></div>`;
  el.classList.add('show');
  $('#infox').onclick = hideInfo; $('#infox').focus();
}
function hideInfo() { $('#info').classList.remove('show'); }
$('#info').addEventListener('click', (e) => { if (e.target.id === 'info') hideInfo(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') { hideInfo(); $('#soundpanel').classList.remove('show'); } });

/* ---------------- hành động & hoạt ảnh ---------------- */
const seen = { dice: null, move: -1, card: null, notice: null, achievement: -1 };
function markSeen() { seen.dice = S.dice && S.dice.seq; seen.move = S.moves.reduce((a, m) => Math.max(a, m.seq), -1); seen.card = S.lastCard && S.lastCard.seq; seen.notice = S.notice && S.notice.seq; seen.achievement = (S.achievements || []).reduce((a, x) => Math.max(a, x.seq), -1); }
let sending = false;
async function act(type, data) {
  if (busy || sending) return;
  if (MODE === 'net') { // gửi lên server; trạng thái mới tới qua SSE rồi mới chạy hoạt ảnh
    sending = true;
    try { await api('api/act', { token: me && me.token, type, data: data || {} }); } catch (e) { toast(e.message); } finally { sending = false; }
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
  // Khi ván đã có người thắng, ưu tiên duy nhất màn kết quả; không phát lại các mốc "sắp thắng" vừa sinh cùng hành động cuối.
  const achievements = S.phase === 'over' ? [] : (S.achievements || []).filter((x) => x.seq > seen.achievement).sort((a, b) => a.seq - b.seq);
  markSeen();
  if (diceNew) { await rollDice(diceNew.a, diceNew.b); await sleep(200); }
  for (const mv of moves) {
    if (!tokens[mv.pid]) continue;
    const last = mv.path[mv.path.length - 1];
    if (mv.jump) {
      dispPos[mv.pid] = last; const v = tokenSpot(mv.pid, last); tokens[mv.pid].position.set(v.x, TOPY, v.z); tokens[mv.pid].userData.to = v; delete dispPos[mv.pid]; await sleep(300);
    } else {
      const forward = (mv.path[0] - mv.from + 32) % 32 === 1;
      await hop(mv.pid, mv.path, (pos) => { if (forward && pos === 0) bumpMoney(mv.pid, CFG.SALARY); });
    }
    await sleep(120);
  }
  // Người rút Vé máy bay xác nhận bằng modal trạng thái `flight`; sau OK server mới tạo bước di chuyển.
  if (card && !(card.id === 'FLIGHT_TICKET' && isMe(card.pid))) await showCard(card);
  const wait = syncBuildings(); syncTokens(false); renderCards(wait);
  for (const achievement of achievements) await showAchievement(achievement);
  if (notice && S.phase === 'play') {
    const who = G.byId(S, notice.pid);
    await sleep(Math.min(MONEY_MS, 900));
    if (notice.kind === 'festival') burstConfetti(notice.tile);
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
  clearBuildings();
  for (const k in target) delete target[k];
  for (const k in shown) delete shown[k];
  festSig = 'x';
  for (const k in dispPos) delete dispPos[k]; // quân đang bay dở của trạng thái cũ
  syncFestival.first = true;
  syncBonus(); buildTokens(); syncBuildings(true); renderCards(); renderHub(); renderLobby();
  syncFestival.first = false;
  void showTurnNotice();
}

/* ---------------- chế độ mạng: API + SSE ---------------- */
async function api(path, body) {
  const r = await fetch(roomEndpoint(location.href, path, ROOM), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Mất kết nối tới server');
  return j;
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
    if (fresh) { resetView(); continue; }
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
const petImg = (id) => snapshot('pet-' + id, place(id, 1));
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
  el.innerHTML = WATCH_MODE ? `👁 Đang xem: ${esc(lobbyDraftName)} · ${viewers.length || 1} khán giả` : '';
  el.classList.toggle('show', WATCH_MODE);
}
const petGrid = (sel, taken, attr) => `<div class="pets">${G.PETS.map((x) => `<button type="button" class="pet${x.id === sel ? ' on' : ''}" ${attr}="${x.id}" ${taken.has(x.id) && x.id !== sel ? 'disabled' : ''} style="--c:${x.c}"><img alt="" src="${petImg(x.id)}"><span>${x.n}</span></button>`).join('')}</div>`;
const timeRow = (cur, attr) => `<div class="times">${CFG.TIME_OPTIONS.map((m) => `<button type="button" class="pill ${m === cur ? '' : 'ghost'}" ${attr}="${m}">${timeLabel(m)}</button>`).join('')}</div>`;
const turnRow = (cur, attr) => `<div class="times">${CFG.TURN_OPTIONS.map((v) => `<button type="button" class="pill ${v === cur ? '' : 'ghost'}" ${attr}="${v}">${v} giây</button>`).join('')}</div>`;
const mapRow = (cur) => `<div class="map-options">${MAPS.map((map, index) => `<button type="button" class="map-option${map.id === cur ? ' on' : ''}" data-map="${map.id}"><span class="map-thumb"><i>${index + 1}</i></span><span><b>${esc(map.name)}</b><small>${esc(map.description)}${map.default ? ' · Mặc định' : ''}</small></span></button>`).join('')}</div>`;
function lobbyNet(el) {
  const mine = me && G.byId(S, me.id), amHost = !!mine && S.hostId === mine.id, taken = new Set(S.players.map((p) => p.pet));
  const currentMap = MAPS.find((map) => map.id === S.settings.mapId) || MAPS[0];
  const list = S.players.map((p) => `<li style="--c:${p.color}"><img alt="" src="${petImg(p.pet)}"><b>${esc(p.name)}</b>${p.id === S.hostId ? '<em class="host">HOST</em>' : ''}${isMe(p.id) ? '<em>bạn</em>' : ''}<i class="dot${presence[p.id] && presence[p.id].on ? ' on' : ''}" title="${presence[p.id] && presence[p.id].on ? 'Đang online' : 'Mất kết nối'}"></i>${amHost && !isMe(p.id) && !(presence[p.id] && presence[p.id].on) ? `<button type="button" class="kick" data-kick="${p.id}" aria-label="Mời ${esc(p.name)} ra khỏi phòng">×</button>` : ''}</li>`).join('');
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
    ${amHost ? `<div class="fld">Bản đồ</div>${mapRow(S.settings.mapId || MAPS[0].id)}
    <div class="fld">Thời lượng ván</div>${timeRow(S.settings.timeLimitMin, 'data-t')}
    <div class="fld">Thời gian mỗi lượt</div>${turnRow(S.settings.turnSec || CFG.TURN_SEC, 'data-ts')}` : `<div class="room-readonly"><b>Host đang cài đặt phòng</b><span>${esc(currentMap.name)} · ${timeLabel(S.settings.timeLimitMin)} · ${S.settings.turnSec || CFG.TURN_SEC} giây/lượt</span></div>`}
    ${inviteBox()}`,
    `<button class="pill ghost" type="button" id="lleave">Rời phòng</button>${amHost ? `<button class="pill big" type="button" id="lstart" ${S.players.length < 2 ? 'disabled' : ''}>Bắt đầu</button>` : '<span class="host-wait">Chờ host bắt đầu…</span>'}`);
  const send = (type, data) => api('api/act', { token: me.token, type, data }).catch((e) => toast(e.message));
  el.querySelectorAll('[data-pet]').forEach((b) => { b.onclick = () => send('pet', { pet: b.dataset.pet }); });
  el.querySelectorAll('[data-kick]').forEach((b) => { b.onclick = () => send('kick', { id: b.dataset.kick }); });
  el.querySelectorAll('[data-map]').forEach((b) => { b.onclick = () => send('settings', { mapId: b.dataset.map }); });
  el.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => send('settings', { timeLimitMin: Number(b.dataset.t) }); });
  el.querySelectorAll('[data-ts]').forEach((b) => { b.onclick = () => send('settings', { turnSec: Number(b.dataset.ts) }); });
  $('#lleave').onclick = () => send('leave').then(exitRoom);
  if ($('#lstart')) $('#lstart').onclick = () => send('start');
}
// vào giữa ván từ thiết bị khác: nhận lại ghế đang mất kết nối, hoặc chỉ xem
function lobbyClaim(el) {
  const off = S.players.filter((p) => !p.bankrupt && !(presence[p.id] && presence[p.id].on));
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
  frameRunning = false;
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
    await prepareBoard();
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
$('#gname').onkeydown = (e) => { if (e.key === 'Enter') enterRoom(false); };
$('#groom').onkeydown = (e) => { if (e.key === 'Enter') enterRoom(false); };
$('#newgame').onclick = newGameFlow;
addEventListener('resize', resize);
window.__TT = { get S() { return S; }, get mode() { return MODE; }, get me() { return me; }, get busy() { return busy; }, act, tokens, scr: (i) => { const f = tileFrame(i); return screenOf(new THREE.Vector3(f.x, TOPY, f.z)); }, sync() { resetView(); } }; // cho script kiểm thử

/* ---------------- khởi động ---------------- */
async function detectServer() {
  if (location.protocol === 'file:') return null;
  try { const r = await fetch('health', { cache: 'no-store' }); const info = await r.json(); return r.ok && info.app === 'thai-thinh-monopoly' ? info : null; } catch (e) { return null; }
}
async function prepareBoard() {
  if (!boardReadyPromise) boardReadyPromise = (async () => {
    await Promise.all([document.fonts.load('800 40px "Baloo 2"'), document.fonts.load('800 40px "Be Vietnam Pro"'), document.fonts.load('900 40px Rubik'), document.fonts.load('700 40px Fredoka'), document.fonts.load('600 40px Fredoka')]).catch(() => {});
    seatSetup(); markSeen();
    await loadModels();
    await HK.loadKit('models', (d, n) => { $('#loadmsg').textContent = `Tải mô hình 3D ${d}/${n}`; });
    await loadGroundPatterns();
    buildTiles(); decorate();
    resize();
    boardReady = true;
  })();
  await boardReadyPromise;
  document.body.dataset.screen = 'game';
  $('#loading').classList.add('hidden');
  syncMusic();
  startFrame();
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

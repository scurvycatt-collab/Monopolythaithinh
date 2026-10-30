/* Khung xương 2D — tải asset dùng chung (public/assets/shared/<pack>/) và tô màu lại.
   kenney-iso-buildings: 24 mảnh khối nhà; điểm ảnh đỏ → màu chủ, tường → màu tường (tuỳ chọn tuyết trên mái).
   kenney-nature: sprite Nature Kit, tô lại tán lá theo mùa. Mọi ảnh đã tô được cache theo (tên, màu, tuỳ chọn). */
import { Pen, rgb, mix, canvas } from './pen.js';
import { PIECES } from './packs.js';

const SHARED = new URL('../../../assets/shared/', import.meta.url);
export const KIT = {}, NAT = {}, NATMETA = {}, OWN = {}, OWNMETA = {};
const OWNSRC = {}, OWNLOAD = {};
let NATPX = 150;
const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Không tải được ảnh ' + src)); im.src = src; });

// tải các pack skin khai báo + sprite riêng của map (đường dẫn tương đối ctx.base); báo tiến độ
export async function loadAssets(skin, base, progress = () => {}) {
  const jobs = [];
  if (skin.packs.includes('kenney-iso-buildings')) for (const n of PIECES) if (!KIT[n]) jobs.push(() => loadImg(new URL(`kenney-iso-buildings/${n}.png`, SHARED)).then((im) => (KIT[n] = im)));
  if (skin.packs.includes('kenney-nature') && !Object.keys(NATMETA).length) {
    const meta = await (await fetch(new URL('kenney-nature/meta.json', SHARED))).json();
    NATPX = meta.px || 150; Object.assign(NATMETA, meta.sprites);
  }
  if (skin.packs.includes('kenney-nature')) for (const n of Object.keys(NATMETA)) if (!NAT[n]) jobs.push(() => loadImg(new URL(`kenney-nature/${n}.png`, SHARED)).then((im) => (NAT[n] = im)));
  for (const [n, p] of Object.entries(skin.sprites || {})) {
    OWNSRC[n] = new URL(p, new URL(base, document.baseURI));
    OWNMETA[n] = skin.spriteMeta && skin.spriteMeta[n] ? skin.spriteMeta[n] : null;
    if (!OWNMETA[n]?.lazy) jobs.push(() => ensureAsset(n));
  }
  let done = 0; progress(0, jobs.length);
  await Promise.all(jobs.map((j) => j().then(() => progress(++done, jobs.length))));
  if (document.fonts) await document.fonts.load('900 40px Rubik').catch(() => {});
}

export function ensureAsset(name) {
  if (OWN[name]) return Promise.resolve(OWN[name]);
  if (!OWNSRC[name]) return Promise.reject(new Error(`Sprite riêng không tồn tại: "${name}"`));
  if (!OWNLOAD[name]) OWNLOAD[name] = loadImg(OWNSRC[name]).then((im) => (OWN[name] = im)).finally(() => delete OWNLOAD[name]);
  return OWNLOAD[name];
}

export async function ensureAssets(names) {
  await Promise.all([...new Set(names || [])].map(ensureAsset));
}

/* ---------- khối nhà Kenney ---------- */
const WALL_BRIGHT = 0.8, KIT_PX = 97.2, kitCache = new Map();
const isRed = (r, g, b) => r === Math.max(r, g, b) && r - Math.min(g, b) > 60 && g < r * 0.62 && b < r * 0.62;
const isGlass = (r, g, b) => b > r + 25 && b >= g - 6;
const lum = (r, g, b) => (0.3 * r + 0.59 * g + 0.11 * b) / 255;
const sat = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };
export function recolorKit(n, hex, opt = {}) {
  const wall = opt.wall || '#ffffff', key = n + hex + wall + (opt.snow ? 's' : '');
  if (kitCache.has(key)) return kitCache.get(key);
  const im = KIT[n]; if (!im) throw new Error(`Thiếu mảnh khối "${n}" (pack kenney-iso-buildings chưa khai báo trong skin.packs?)`);
  const c = canvas(im.width, im.height), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data, [tr, tg, tb] = rgb(hex), [wr, wg, wb] = rgb(wall), W = c.width;
  const Ls = []; for (let i = 0; i < p.length; i += 4) { const r = p[i], g = p[i + 1], b = p[i + 2]; if (p[i + 3] > 200 && !isRed(r, g, b) && !isGlass(r, g, b) && sat(r, g, b) >= 0.15) Ls.push(lum(r, g, b)); }
  Ls.sort((a, b) => a - b); const wallRef = Ls.length ? Ls[Math.floor(Ls.length * 0.9)] : 0.53;
  const top = new Array(W).fill(1e9), bot = new Array(W).fill(-1);   // biên vùng mái đỏ theo cột, để phủ tuyết nửa trên
  if (opt.snow) for (let i = 0; i < p.length; i += 4) if (p[i + 3] > 200 && isRed(p[i], p[i + 1], p[i + 2])) { const px = (i / 4) % W, py = Math.floor(i / 4 / W); top[px] = Math.min(top[px], py); bot[px] = Math.max(bot[px], py); }
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue; const r = p[i], g = p[i + 1], b = p[i + 2], L = lum(r, g, b);
    if (isRed(r, g, b)) {
      const f = Math.min(1.25, L / 0.48), px = (i / 4) % W, py = Math.floor(i / 4 / W);
      if (opt.snow && bot[px] > top[px] && py < top[px] + (bot[px] - top[px]) * (0.5 + 0.08 * Math.sin(px * 0.35))) { const o = 255 * Math.min(1, 0.78 + f * 0.2); p[i] = o - 6; p[i + 1] = o - 2; p[i + 2] = 255; continue; }
      p[i] = tr * f; p[i + 1] = tg * f; p[i + 2] = tb * f; continue;
    }
    if (isGlass(r, g, b)) { p[i] = Math.min(255, r * 1.12); p[i + 1] = Math.min(255, g * 1.1); p[i + 2] = Math.min(255, b * 1.08); continue; }
    if (L < 0.24) continue;                                                   // cửa, chi tiết tối giữ nguyên
    const v = sat(r, g, b) >= 0.15 ? Math.min(1, L / wallRef) * 0.95 : Math.min(1, L / 0.82), o = (0.56 + 0.44 * v) * WALL_BRIGHT;
    p[i] = wr * o; p[i + 1] = wg * o; p[i + 2] = Math.min(255, wb * o + 2);
  }
  x.putImageData(d, 0, 0); kitCache.set(key, c); return c;
}
// ghép chồng khối [gx, gz, [tầng dưới → trên], mái?] rồi lật gương (nắng từ phải) và thu về tỉ lệ k; neo tại gốc mặt đất
export function composeKit(stacks, hex, k, opt = {}) {
  if (opt.axis === 'z') stacks = stacks.map(([gx, gz, ...r]) => [gz, gx, ...r]);
  const cv = canvas(420, 520), c = cv.getContext('2d'), ox = 210, oy = 430;
  const mx = stacks.reduce((s, t) => s + t[0], 0) / stacks.length, mz = stacks.reduce((s, t) => s + t[1], 0) / stacks.length;
  const order = stacks.map((s) => ({ s, kx: s[1] - mz, kz: s[0] - mx })).sort((a, b) => a.kx + a.kz - (b.kx + b.kz));
  for (const { s, kx, kz } of order) {
    const [, , floors, roof] = s, cx = ox + (kx - kz) * 49.5, cy = oy + (kx + kz) * 24.75; let topY = 0;
    floors.forEach((n, f) => { const im = recolorKit(n, hex, opt), y = cy - (im.height - 24.75) - f * 35.5; c.drawImage(im, cx - 49.5, y); topY = y; });
    if (roof) { const im = recolorKit(roof, hex, opt); c.drawImage(im, cx - 49.5, topY + 24.75 - (im.height - 24.75)); }
  }
  const sc = k / KIT_PX, out = canvas(420 * sc, 520 * sc), o = out.getContext('2d');
  o.translate(ox * sc, oy * sc); o.scale(-sc, sc); o.drawImage(cv, -ox, -oy);
  return { canvas: out, ax: ox * sc, ay: oy * sc, k };
}

/* ---------- Nature Kit: lật gương, tô tán lá theo mùa ---------- */
export const LEAF = {
  spring: { broad: ['#d4699a', '#ffd6e5'], pine: ['#3d9448', '#a9df74'], bush: ['#4ea24a', '#b0e47e'] },
  summer: { broad: ['#2d8a3c', '#93d66c'], pine: ['#2a7444', '#78c05a'], bush: ['#378c3c', '#8fd06a'] },
  autumn: { broad: ['#c2461f', '#ffb24a'], pine: ['#2b6447', '#6b9e58'], bush: ['#a86424', '#f2b54a'] },
  autumnRed: { broad: ['#9c2a26', '#f0603e'], pine: ['#2b6447', '#6b9e58'], bush: ['#8f2f22', '#e65a3a'] },
  winter: { broad: ['#a7b9cb', '#ffffff'], pine: 'snow', bush: ['#b7c7d7', '#ffffff'] },
};
const natCache = new Map();
function hsv(r, g, b) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, mx ? d / mx : 0, mx / 255]; }
export function natCv(name, mode = 'none') {
  const key = name + mode; if (natCache.has(key)) return natCache.get(key);
  const im = NAT[name]; if (!im) throw new Error(`Sprite Nature Kit không tồn tại: "${name}"`);
  const c = canvas(im.width, im.height), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
  if (LEAF[mode]) {
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data, kind = /pine/.test(name) ? 'pine' : /tree/.test(name) ? 'broad' : 'bush', fall = /_fall/.test(name), pal = LEAF[mode][kind];
    for (let i = 0; i < p.length; i += 4) {
      if (p[i + 3] < 10) continue; const [h, s, v] = hsv(p[i], p[i + 1], p[i + 2]); let col = null;
      if (h >= 140 && h <= 215 && s > 0.25) { const t = Math.max(0, Math.min(1, (v - 0.4) / 0.55)); col = pal === 'snow' ? (t > 0.55 ? mix('#dbe6f0', '#ffffff', (t - 0.55) / 0.45) : mix('#1f4f3b', '#3c7655', t / 0.55)) : mix(pal[0], pal[1], t); }
      else if (fall && h >= 18 && h <= 45 && s > 0.45 && mode !== 'autumn') col = mix(pal[0], pal[1], Math.max(0, Math.min(1, (v - 0.5) / 0.5)));
      else if (h >= 10 && h <= 25 && s > 0.4 && !/pumpkin/.test(name)) col = mix('#5a3b27', '#b27c50', Math.max(0, Math.min(1, (v - 0.35) / 0.65)));
      if (col) { const [r, g, b] = rgb(col); p[i] = r; p[i + 1] = g; p[i + 2] = b; }
    }
    x.putImageData(d, 0, 0);
  }
  natCache.set(key, c); return c;
}
// pen.nat(tên, x, z, cỡ, tô màu, bóng): đặt sprite Nature Kit chạm đất tại (x, z)
Pen.prototype.nat = function (name, x, z, s = 1, mode = 'none', shadow = true) {
  const m = NATMETA[name]; if (!m) throw new Error(`Sprite Nature Kit không tồn tại: "${name}"`);
  const cv = natCv(name, mode), [sx, sy] = this.p(x, 0, z), sc = (this.k / NATPX) * s, c = this.ctx;
  if (shadow) this.ellipseShadow(x, z, (m[0] / NATPX) * s * 0.32, 0.14);
  c.save(); c.translate(sx, sy); c.scale(-sc, sc); c.drawImage(cv, -m[2], -m[3]); c.restore();
};
// pen.img(tên sprite riêng, x, z, cỡ): ảnh trong skin.sprites; mặc định đáy giữa chạm đất.
// spriteMeta.<tên>.anchor = [x,y] cho phép asset vuông có safe margin mà vẫn neo chính xác.
Pen.prototype.img = function (name, x, z, h = 1, y = 0) {
  const im = OWN[name]; if (!im) throw new Error(`Sprite riêng không tồn tại: "${name}"`);
  const meta = OWNMETA[name] || {}, anchor = meta.anchor || [0.5, 1];
  const [sx, sy] = this.p(x, y, z), H = h * this.k, W = (im.width / im.height) * H;
  this.ctx.drawImage(im, sx - W * anchor[0], sy - H * anchor[1], W, H);
};

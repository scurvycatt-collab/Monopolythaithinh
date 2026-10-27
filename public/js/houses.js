/* Thái Thịnh Monopoly — bộ nhà 5 cấp (bản Ngoại ô đã chốt).
   Cấp: 0 Ô đất · 1 Nhà 1 · 2 Nhà 2 · 3 Nhà 3 · 4 Khách sạn
   Bản 'suburb' : City Kit Suburban + Commercial (Kenney, CC0), mái xanh đổi sang màu người chơi
   Mọi mô hình trả về: đáy y=0, tâm (0,0), mặt tiền nhìn về +z, nằm gọn trong ô vuông FOOT×FOOT. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const LEVELS = ['Ô đất', 'Nhà 1', 'Nhà 2', 'Nhà 3', 'Khách sạn'];
export const FOOT = 1.46;                       // khớp FOOT trên bàn cờ hiện tại
const MAXH = [0.75, 0.9, 1.15, 1.45, 1.95];      // trần chiều cao từng cấp

const FILES = {
  suburban: ['building-type-h', 'building-type-c', 'building-type-t', 'fence-low', 'fence-1x3', 'path-stones-long', 'planter', 'tree-small', 'tree-large'],
  commercial: ['building-l', 'detail-parasol-a', 'detail-awning-wide'],
  platformer: ['flag', 'sign', 'hedge', 'hedge-corner', 'flowers', 'flowers-tall', 'tree', 'plant', 'coin-gold', 'star', 'chest', 'barrel', 'crate', 'jewel', 'arrow'],
  watercraft: ['ship-ocean-liner', 'buoy-flag', 'boat-row-small', 'boat-speed-a', 'boat-sail-a', 'gate-finish', 'boat-tug-a', 'boat-fishing-small', 'boat-speed-c'],
  nature: ['tree_palmTall', 'tree_palmBend', 'tree_palmShort', 'tree_palmDetailedTall', 'campfire_stones', 'campfire_logs', 'log_stack', 'rock_smallA', 'rock_largeA', 'stone_tallA', 'stone_largeA', 'tent_smallOpen', 'sign', 'tree_pineDefaultA', 'tree_pineTallA', 'tree_oak', 'tree_default', 'tree_fat', 'bridge_woodRound'],
  space: ['craft_speederA', 'craft_cargoA', 'rocket_baseA', 'rocket_fuelA', 'rocket_sidesA', 'rocket_topA', 'satelliteDish_large'],
  industrial: ['windmill'],
};
const RAW = {};
function decodeBase64(encoded) {
  const raw = atob(encoded), bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}
export async function loadKit(base = 'models', onProgress, suppliedBundle = null) {
  const loader = new GLTFLoader();
  const jobs = [];
  for (const [kit, list] of Object.entries(FILES)) for (const n of list) jobs.push([kit, n]);
  let done = 0;
  // các .glb gói base64 trong bundle.json; bảng màu png đọc từ models/<kit>/Textures/
  const bundle = suppliedBundle || await (await fetch(`${base}/bundle.json`)).json();
  const parse = (kit, n) => new Promise((res, rej) => {
    const bin = decodeBase64(bundle[kit + '/' + n]);
    loader.parse(bin, `${base}/${kit}/`, res, rej);
  });
  await Promise.all(jobs.map(([kit, n]) => parse(kit, n).then((g) => {
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      const m = o.material; if ('metalness' in m) { m.metalness = 0; m.roughness = Math.max(m.roughness ?? 1, 0.6); }
    });
    RAW[kit + '/' + n] = g.scene; onProgress && onProgress(++done, jobs.length);
  })));
}

/* ---------- đổi màu bảng màu (colormap) theo người chơi ---------- */
const texCache = new Map();
function recolor(baseMat, hex, rule) {
  const key = baseMat.uuid + hex + rule;
  if (texCache.has(key)) return texCache.get(key);
  const img = baseMat.map.image;
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const c = cv.getContext('2d'); c.drawImage(img, 0, 0);
  const d = c.getImageData(0, 0, cv.width, cv.height), px = d.data;
  const tgt = new THREE.Color(hex), th = {}; tgt.getHSL(th);
  const col = new THREE.Color(), hsl = {};
  for (let p = 0; p < px.length; p += 4) {
    col.setRGB(px[p] / 255, px[p + 1] / 255, px[p + 2] / 255); col.getHSL(hsl);
    const green = hsl.s > 0.25 && hsl.h > 0.3 && hsl.h < 0.55;
    // Một số model dùng mái cam thay vì mái xanh trong cùng bảng màu nguồn.
    // Cả hai dải đều là màu nhận diện chủ sở hữu và phải đi theo màu người chơi.
    const orange = hsl.s > 0.35 && hsl.h > 0.02 && hsl.h < 0.14;
    const dark = rule === 'darkgreen' && hsl.l < 0.3 && hsl.s < 0.3;
    const red = rule === 'red' && hsl.s > 0.4 && (hsl.h < 0.035 || hsl.h > 0.95);
    // tường: các ô xám tím rất nhạt trong bảng màu → trắng tinh #FFFFFF (giữ nguyên mọi chi tiết khác)
    if (hsl.s < 0.3 && hsl.l > 0.78) { px[p] = px[p + 1] = px[p + 2] = 255; continue; }
    if ((rule !== 'red' && (green || orange)) || dark || red) {
      const l = dark ? Math.min(0.6, th.l * 0.62 + hsl.l * 0.9) : Math.min(0.8, hsl.l * 0.5 + th.l * 0.55);
      col.setHSL(th.h, Math.min(1, th.s * 0.92), l);
      px[p] = col.r * 255; px[p + 1] = col.g * 255; px[p + 2] = col.b * 255;
    }
  }
  c.putImageData(d, 0, 0);
  const tex = new THREE.CanvasTexture(cv); tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
  const m = baseMat.clone(); m.map = tex; texCache.set(key, m); return m;
}
// lấy một mô hình gốc, tuỳ chọn tô màu, đặt tâm về gốc toạ độ
function get(key, hex, rule = 'green', { center = true } = {}) {
  const o = RAW[key].clone(true);
  if (hex) o.traverse((m) => { if (m.isMesh) m.material = recolor(m.material, hex, rule); });
  if (center) {
    const b = new THREE.Box3().setFromObject(o), c = b.getCenter(new THREE.Vector3());
    o.position.set(-c.x, -b.min.y, -c.z);
  }
  const g = new THREE.Group(); g.add(o); return g;
}
const at = (o, x, y, z, ry = 0, s = 1) => { o.position.set(x, y, z); o.rotation.y = ry; o.scale.setScalar(s); return o; };
// thu nhỏ cả nhóm cho vừa ô và trần chiều cao
function fit(g, lv, foot = FOOT) {
  const b = new THREE.Box3().setFromObject(g), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  let k = foot / Math.max(s.x, s.z); if (s.y * k > MAXH[lv]) k = MAXH[lv] / s.y;
  const w = new THREE.Group(); g.position.set(-c.x, -b.min.y, -c.z); w.add(g); w.scale.setScalar(k);
  return w;
}

/* ---------- vật liệu & khối dựng tay ---------- */
const matCache = new Map();
function mat(hex, opt = {}) {
  const key = hex + JSON.stringify(opt);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.75, metalness: 0, flatShading: true, ...opt }));
  return matCache.get(key);
}
function box(w, h, d, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'string' ? mat(m) : m);
  o.position.y = h / 2; o.castShadow = true; o.receiveShadow = true;
  const g = new THREE.Group(); g.add(o); g.position.set(x, y, z); return g;
}
function cyl(r, h, m, x = 0, y = 0, z = 0, seg = 12) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), typeof m === 'string' ? mat(m) : m);
  o.position.y = h / 2; o.castShadow = true; o.receiveShadow = true;
  const g = new THREE.Group(); g.add(o); g.position.set(x, y, z); return g;
}
const shade = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
const tint = (hex, k) => '#' + new THREE.Color('#ffffff').lerp(new THREE.Color(hex), k).getHexString();

// biển chữ (HOTEL…) vẽ bằng canvas
const signCache = new Map();
function signMat(text, bg, fg = '#ffffff', w = 512, h = 128) {
  const key = text + bg + fg + w + h;
  if (signCache.has(key)) return signCache.get(key);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d');
  c.fillStyle = bg; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = Math.max(4, h * 0.05); c.strokeRect(c.lineWidth, c.lineWidth, w - 2 * c.lineWidth, h - 2 * c.lineWidth);
  let fs = h * 0.66; c.font = `900 ${fs}px Rubik, 'Be Vietnam Pro', sans-serif`;
  while (c.measureText(text).width > w * 0.84 && fs > 10) { fs -= 2; c.font = `900 ${fs}px Rubik, 'Be Vietnam Pro', sans-serif`; }
  c.fillStyle = 'rgba(0,0,0,.22)'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2 + 3, h / 2 + 5);
  c.fillStyle = fg; c.fillText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.25 });
  signCache.set(key, m); return m;
}
function sign(text, hex, w, h, depth = 0.04, vertical = false) {
  const g = new THREE.Group();
  const face = vertical ? signMat(text.split('').join('\n'), hex) : signMat(text, hex, '#fff', 512, Math.round(512 * h / w));
  const side = mat(shade(hex, 0.8));
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), [side, side, side, side, face, face]);
  o.castShadow = true; g.add(o); return g;
}
// mái hiên sọc (trắng / màu người chơi)
const stripeCache = new Map();
function stripeMat(hex) {
  if (stripeCache.has(hex)) return stripeCache.get(hex);
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 8; const c = cv.getContext('2d');
  for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? '#fff8ee' : hex; c.fillRect(k * 16, 0, 16, 8); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, flatShading: true }); stripeCache.set(hex, m); return m;
}
function awning(w, hex, depth = 0.16) {
  const g = new THREE.Group();
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(depth, -depth * 0.55); sh.lineTo(depth, -depth * 0.8); sh.lineTo(0, -depth * 0.25); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false }); geo.translate(0, 0, -w / 2); geo.rotateY(-Math.PI / 2);
  // UV theo bề ngang để ra sọc
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w * (w / 0.12) / 8, 0.5);
  const o = new THREE.Mesh(geo, stripeMat(hex)); o.castShadow = true; g.add(o); return g;
}
// cờ đất (cột + lá cờ màu người chơi)
function pennant(hex, h = 0.62) {
  const g = new THREE.Group();
  g.add(cyl(0.018, h, '#eef0f3', 0, 0, 0, 8));
  g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), mat('#ffc23a')), 0, h + 0.02, 0));
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.3, -0.07); sh.lineTo(0, -0.18); sh.closePath();
  const cloth = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false }), mat(hex));
  // Phóng to riêng phần vải để màu chủ đất dễ nhận ra; giữ nguyên cột và chóp cờ.
  cloth.scale.set(2.9, 2.9, 1);
  cloth.position.set(0.012, h - 0.02, -0.006); cloth.castShadow = true; g.add(cloth);
  return g;
}

/* ================= BẢN 1 — NGOẠI Ô ================= */
function suburb(lv, hex) {
  const g = new THREE.Group();
  if (lv === 0) {
    // lô đất rào gỗ thấp, lối đá, biển "đã mua" và cờ màu chủ
    g.add(at(get('suburban/fence-1x3'), 0, 0, -0.05, 0, 1.0));
    g.add(at(get('suburban/path-stones-long'), 0, 0, 0.38, 0, 1.4));
    const s = get('platformer/sign'); g.add(at(s, -0.38, 0, 0.42, 0.35, 0.6));
    g.add(at(pennant(hex, 0.95), 0.1, 0, -0.1, 0, 1.25));
    g.add(at(get('platformer/flowers-tall'), 0.42, 0, 0.4, 0, 0.42));
    g.add(at(get('suburban/tree-small'), -0.45, 0, -0.42, 0, 1));
    g.add(at(get('platformer/plant'), 0.4, 0, -0.38, 0.6, 0.6));
    return fit(g, lv);
  }
  if (lv === 1) {
    g.add(at(get('suburban/building-type-h', hex), 0, 0, -0.08));
    g.add(at(get('suburban/path-stones-long'), -0.2, 0, 0.55, 0, 1));
    g.add(at(get('suburban/planter'), 0.36, 0, 0.55, 0, 0.9));
    g.add(at(get('suburban/tree-small'), -0.6, 0, 0.5));
    g.add(at(get('platformer/flowers'), 0.05, 0, 0.62, 0, 0.3));
  }
  if (lv === 2) {
    g.add(at(get('suburban/building-type-c', hex), 0, 0, -0.1));
    g.add(at(get('suburban/fence-low'), 0, 0, 0.62, 0, 1));
    g.add(at(get('suburban/tree-large'), -0.6, 0, -0.5));
    g.add(at(get('suburban/tree-small'), 0.62, 0, 0.45));
    g.add(at(get('platformer/flowers-tall'), -0.45, 0, 0.5, 0, 0.35));
  }
  if (lv === 3) {
    g.add(at(get('suburban/building-type-t', hex), 0, 0, -0.08));
    g.add(at(get('suburban/planter'), -0.5, 0, 0.64, 0, 0.9));
    g.add(at(get('suburban/planter'), 0.5, 0, 0.64, 0, 0.9));
    g.add(at(get('suburban/tree-large'), 0.7, 0, -0.55));
    g.add(at(get('suburban/tree-large'), -0.7, 0, -0.5, 0, 0.85));
  }
  if (lv === 4) {
    // khách sạn: toà Commercial "building-n" + mái màu chủ + biển HOTEL + ô dù trước sảnh
    const h = get('commercial/building-l', hex); g.add(at(h, 0, 0, 0, Math.PI));
    const H = 2.27;
    const sg = sign('HOTEL', hex, 1.1, 0.36, 0.06); g.add(at(sg, 0, H + 0.36, 0.3));
    g.add(at(box(0.05, 0.2, 0.05, '#5b6676'), -0.4, H, 0.3)); g.add(at(box(0.05, 0.2, 0.05, '#5b6676'), 0.4, H, 0.3));
    for (const [x, z] of [[-0.95, 0.95], [0.95, 0.95]]) g.add(at(pennant(hex, 1.2), x, 0, z));
    g.add(at(get('commercial/detail-awning-wide', hex), 0, 0.42, 0.78, 0, 1.2));
    for (const x of [-0.55, 0.55]) g.add(at(get('commercial/detail-parasol-a', hex), x, 0, 1.2, 0, 1.1));
    g.add(at(get('suburban/planter'), 0, 0, 1.25, 0, 1));
  }
  return fit(g, lv);
}

export const STYLES = {
  suburb: { name: 'Ngoại ô', build: suburb },
};
export function building(style, lv, hex) { return STYLES[style].build(lv, hex); }

// dùng chung cho các ô đặc biệt (specials.js)
export { get, at, fit, mat, box, cyl, sign, pennant, stripeMat, shade, tint, recolor };

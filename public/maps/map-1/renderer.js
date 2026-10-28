// Renderer 3D (three.js) của map-1 — hiện thực docs/contracts/map-renderer.md.
// Model nhà / ô đặc biệt / thế giới giữa bàn vẫn nằm ở public/js/{houses,specials,world}.js
// (script sinh thumbnail băm theo đường dẫn đó), renderer chỉ import và dựng cảnh.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { loadKit, building as houseBuilding } from '../../js/houses.js';
import { colosseum, worldTour, lostIsland, startGate, chanceBox, beachHouse, festivalFlag, festivalPlaque, preloadSpecialAssets, BEACH_LEVELS } from '../../js/specials.js';
import { centerWorld, preloadWorldAssets } from '../../js/world.js';
import { PROPERTY_THUMBNAIL_VERSION } from '../../thumbnails/property/version.js';
const HK = { loadKit, building: houseBuilding, colosseum, worldTour, lostIsland, startGate, chanceBox, beachHouse, festivalFlag, festivalPlaque, preloadSpecialAssets, BEACH_LEVELS };

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const GRAPHICS = {
  low: { ratio: 1, shadows: false, shadowSize: 512, fps: 30, idleFps: 30, motionFps: 30, worldMotion: false, confetti: 30 },
  medium: { ratio: 1.5, shadows: true, shadowSize: 1024, fps: 40, idleFps: 40, motionFps: 40, worldMotion: true, confetti: 50 },
  high: { ratio: 2, shadows: true, shadowSize: 2048, fps: 60, idleFps: 60, motionFps: 60, worldMotion: true, confetti: 70 },
};
const shortK = (n) => (n >= 1000 ? (n / 1000).toFixed(n % 1000 ? 1 : 0).replace('.', ',') + 'M' : n + 'K');

export default async function createRenderer(ctx) {
  const RULES = ctx.rules, G = ctx.game || window.Game;
  const { TILES, GROUPS } = RULES, CFG = RULES.CONFIG, PETS = RULES.PETS;
  const progress = (d, n, label) => { if (ctx.onProgress) ctx.onProgress(d, n, label); };
  let graphicsLevel = GRAPHICS[ctx.quality] ? ctx.quality : 'high';
  let S = null;            // view hiện tại (publicView) do app truyền qua reset / sync
  let seatOf = {};         // id -> { color, pet }
  let arrowPid = null, arrowColor = '', glowPid = null;
  const outageRounds = (i) => (S ? Math.max(0, Number(S.outage && S.outage[i] || 0) - Number(S.round || 0)) : 0);
  function seatSetup() {
    seatOf = {};
    (S ? S.players : []).forEach((p, k) => { const pet = p.pet || PETS[k % PETS.length].id, def = PETS.find((x) => x.id === pet); seatOf[p.id] = { color: def ? def.c : p.color, pet }; });
  }

  /* ---------------- three.js: cảnh ---------------- */
  let frameRunning = false, destroyed = false;
  function createMainRenderer(antialias, canvas) {
    const next = new THREE.WebGLRenderer({ canvas, antialias, alpha: true });
    next.setPixelRatio(Math.min(devicePixelRatio, GRAPHICS[graphicsLevel].ratio));
    next.shadowMap.enabled = GRAPHICS[graphicsLevel].shadows;
    next.shadowMap.type = THREE.PCFSoftShadowMap;
    next.shadowMap.autoUpdate = false;
    next.outputColorSpace = THREE.SRGBColorSpace;
    return next;
  }
  let renderer = createMainRenderer(graphicsLevel !== 'low', ctx.canvas), cvs = renderer.domElement;
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
  let shadowDirty = true;
  function requestShadowUpdate() { shadowDirty = true; if (frameRunning) requestActiveRender(250); }
  function replaceMainRenderer(antialias) {
    // Không đổi được antialias của context đang có: thay canvas của chính renderer bằng canvas mới.
    const old = renderer, oldCanvas = cvs, next = createMainRenderer(antialias, document.createElement('canvas'));
    unbindCanvas(oldCanvas);
    oldCanvas.replaceWith(next.domElement); renderer = next; cvs = next.domElement;
    bindCanvas(cvs);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    old.dispose(); old.forceContextLoss();
    requestShadowUpdate();
  }
  function setGraphicsLevel(level) {
    if (!GRAPHICS[level]) return;
    graphicsLevel = level;
    const profile = GRAPHICS[level];
    const wantsAntialias = level !== 'low', hasAntialias = !!renderer.getContext().getContextAttributes().antialias;
    if (wantsAntialias !== hasAntialias) replaceMainRenderer(wantsAntialias);
    renderer.setPixelRatio(Math.min(devicePixelRatio, profile.ratio));
    renderer.shadowMap.enabled = profile.shadows;
    if (sun.shadow.mapSize.x !== profile.shadowSize) {
      sun.shadow.mapSize.set(profile.shadowSize, profile.shadowSize);
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    }
    requestShadowUpdate();
    requestActiveRender(1200);
    applySceneQuality(level);
    if (S) syncBuildings(true);
    resize();
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
  // nền ô đất theo nhóm (kiểu Business Tour): màu nhóm pha nhạt + hoa văn lát gạch / lát ô
  // hoa văn lát nền theo nhóm (Kenney Pattern Pack, CC0): ảnh đen trắng → pha hai sắc của màu nền nhóm.
  // Phần chiếm diện tích lớn luôn lấy màu sáng, đường ron lấy màu đậm hơn ~14% để chữ trên ô vẫn dễ đọc.
  const GROUND_PATTERN_ALPHA = 0.45; // độ đậm của hoa văn phủ lên màu nền
  const groundImg = {}, groundCv = {};
  function loadGroundPatterns() {
    return Promise.all(Object.entries(GROUPS).map(([g, x]) => new Promise((res) => {
      const im = new Image(); im.onload = () => { groundImg[g] = im; res(); }; im.onerror = () => res(); im.src = `thumbnails/static/ground-pattern-${g}.png?v=${PROPERTY_THUMBNAIL_VERSION.slice(0, 12)}`;
    })));
  }
  function groundTile(g) {
    if (groundCv[g] !== undefined) return groundCv[g];
    const im = groundImg[g]; if (!im) return (groundCv[g] = null);
    return (groundCv[g] = im);
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
      const own = S && S.props[i];
      text(t.name.toUpperCase(), cw / 2, nameY, 50, 700, 'Fredoka', '#111111', cw - 22, 0);
      const out = own && G.outaged(S, i);
      if (own) text(out ? `${outageRounds(i)} ⚡` : shortK(G.rentOf(S, i)), cw / 2, sY + sH / 2 + 4, 84, out ? 900 : 600, out ? 'Rubik' : 'Fredoka', out ? '#d18b00' : '#000000', cw - 20); // số lượt còn lại + sét trên dải giá luôn lộ
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
      // Mặt trên đã có plane texture riêng, đáy không nhìn thấy: một material đủ và giảm 5 draw calls mỗi ô.
      const body = new THREE.Mesh(new THREE.BoxGeometry(f.w - 0.06, TOPY, f.d - 0.06), side);
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
  // làm tối cảnh, chỉ sáng các ô được chọn (bán đất, World Tour, thẻ Chance…); set = null để tắt
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
  function refreshTile(i) { tileTex[i].image = drawTile(i); tileTex[i].needsUpdate = true; }


  /* ---------------- mô hình Kenney ---------------- */
  const MODEL_LIST = {
    'animal-dog': 'pets/animal-dog', 'animal-cat': 'pets/animal-cat', 'animal-fox': 'pets/animal-fox', 'animal-panda': 'pets/animal-panda',
  };
  const MODELS = {};
  function decodeBase64(encoded) {
    const raw = atob(encoded), bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes.buffer;
  }
  async function loadModels(bundle) {
    const loader = new GLTFLoader();
    const keys = Object.keys(MODEL_LIST);
    let done = 0;
    const parse = (path) => {
      const bin = decodeBase64(bundle[path]);
      return new Promise((res, rej) => loader.parse(bin, `models/${path.split('/')[0]}/`, res, rej));
    };
    await Promise.all(keys.map((k) => parse(MODEL_LIST[k]).then((g) => {
      g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { if ('metalness' in m) { m.metalness = 0; m.roughness = Math.max(m.roughness ?? 1, 0.55); } }); } });
      MODELS[k] = g.scene; done++; progress(done, keys.length, 'models');
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
  let centerWorldObj = null;
  function applySceneQuality(level) {
    specials.forEach((obj) => { if (obj.userData.hideOnLow) obj.visible = level !== 'low'; });
    if (centerWorldObj && centerWorldObj.userData.setQuality) centerWorldObj.userData.setQuality(level);
  }
  function decorate() {
    const atCorner = (obj, i, ox = 0, oz = 0) => { const f = tileFrame(i); obj.position.set(f.x + ox, TOPY, f.z + oz); obj.userData.hideOnLow = true; board.add(obj); specials.push(obj); return obj; };
    atCorner(HK.startGate(), 0);
    atCorner(HK.lostIsland(), 8);
    atCorner(HK.colosseum(), 16);
    atCorner(HK.worldTour(), 24, 0.2, 0.2);
    // rương Chance ở tâm phần sân; hai cạnh xa (trên màn hình) quay mặt về dải xám như nhà, tức là về phía người nhìn
    TILES.forEach((t, i) => {
      if (t.type !== 'chance') return;
      const cb = HK.chanceBox(), p = local(i, 0, lay(i).grassZ), f = tileFrame(i), off = specials.length * 1.3;
      cb.position.set(p.x, TOPY, p.z); cb.rotation.y = f.rot + (FAR(f.side) ? Math.PI : 0);
      cb.userData.hideOnLow = true;
      const up = cb.userData.update; cb.userData.update = (tt, dt) => up(tt + off, dt);
      board.add(cb); specials.push(cb);
    });
    const w = centerWorld(); w.position.y = TOPY - WORLD_DROP; w.userData.setQuality && w.userData.setQuality(graphicsLevel); board.add(w); specials.push(w); centerWorldObj = w;
    applySceneQuality(graphicsLevel);
  }

  /* băng rôn lễ hội: mỗi ván 3 ô ngẫu nhiên (S.bonus), căng giữa hai cọc dọc cạnh sau của phần sân */
  function festivalBannerSpot(i) {
    const f = tileFrame(i), lz = FAR(f.side) ? D / 2 - 0.16 : -D / 2 + 0.16;
    return local(i, 0, lz);
  }
  const bonusFlags = [];
  // Bảng Championships vàng nổi ngay dưới dải giá, đủ lớn để đọc ở mọi cạnh bàn.
  const CHAMPIONSHIP_PLAQUE_WIDTH = 1.56;
  const CHAMPIONSHIP_PLAQUE_HEIGHT = 0.44;
  const CHAMPIONSHIP_PLAQUE_FAR_HEIGHT = 0.28;
  let festBanner = null, festSig = '';
  function disposeOwnedObject(obj) { if (obj && obj.userData && obj.userData.dispose) obj.userData.dispose(); }
  function syncFestival() {
    const sig = S.festival === null || S.festival === undefined || !S.props[S.festival] ? '' : `${S.festival}:${G.festMult(S)}`;
    if (sig === festSig) return; festSig = sig;
    if (festBanner) { board.remove(festBanner); disposeOwnedObject(festBanner); festBanner = null; requestShadowUpdate(); }
    if (!sig) return;
    const i = S.festival, f = tileFrame(i), far = FAR(f.side);
    // Cạnh xa có mặt giữa bàn cao hơn đáy ô: nâng bảng lên để toàn bộ cúp/chữ không bị che.
    const height = far ? CHAMPIONSHIP_PLAQUE_FAR_HEIGHT : CHAMPIONSHIP_PLAQUE_HEIGHT;
    const bottom = far ? TOPY - WORLD_DROP + 0.02 : TOPY - 0.025 - height;
    festBanner = HK.festivalPlaque(CHAMPIONSHIP_PLAQUE_WIDTH, height);
    const p = local(i, 0, (far ? -1 : 1) * ((f.d - 0.06) / 2 + 0.014));
    festBanner.position.set(p.x, bottom, p.z); festBanner.rotation.y = f.rot + (far ? Math.PI : 0); board.add(festBanner);
    festBanner.userData.t0 = syncFestival.first ? -1 : performance.now(); // dựng ván lần đầu thì không chạy hoạt ảnh
    requestShadowUpdate();
  }
  function syncBonus() {
    bonusFlags.splice(0).forEach((o) => { board.remove(o); disposeOwnedObject(o); });
    for (const i of S.bonus || []) {
      const f = tileFrame(i), best = festivalBannerSpot(i);
      const flag = HK.festivalFlag(CFG.BONUS_MULT); flag.position.set(best.x, TOPY, best.z); flag.scale.setScalar(1.12); flag.rotation.y = f.rot + (FAR(f.side) ? Math.PI : 0);
      board.add(flag); bonusFlags.push(flag);
    }
    requestShadowUpdate();
  }

  /* công trình theo chủ sở hữu (ô cờ giữ nguyên màu gốc)
     Xây: từng bộ phận rơi từ trên xuống, thấp trước cao sau. Bán: đảo ngược, bộ phận cao nhất bốc lên trước rồi biến mất.
     Mua lại / nâng cấp: chạy hoạt ảnh bán nhà cũ xong mới xây nhà mới. */
  const buildObjs = {}, tileSigs = {};
  const BUILD_SPREAD = 1650, BUILD_DUR = 760, BUILD_MS = BUILD_SPREAD + BUILD_DUR; // ≈ 2,4 s (trước đây ≈ 1,4 s)
  const anims = [];
  const beachLevel = (owner) => Math.min(4, G.ownedBy(S, owner).filter((j) => TILES[j].type === 'resort').length);
  const lowBuildingCache = new Map();
  function lowDetailBuilding(level, hex, resort = false) {
    const key = `${resort ? 'r' : 'c'}:${level}:${hex}`;
    if (!lowBuildingCache.has(key)) {
      const root = new THREE.Group(), wall = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), accent = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.72 });
      const addBlock = (x, z, w, h, d) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall); mesh.position.set(x, h / 2, z); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh); const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.62, Math.min(0.24, h * 0.32), 4), accent); roof.position.set(x, h + Math.min(0.12, h * 0.16), z); roof.rotation.y = Math.PI / 4; roof.castShadow = true; root.add(roof); };
      if (level <= 0) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.58, 6), accent); pole.position.y = 0.29; root.add(pole);
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.18), accent); flag.position.set(0.18, 0.48, 0); flag.rotation.y = Math.PI / 2; root.add(flag);
      } else if (resort) addBlock(0, 0, 0.62 + level * 0.08, 0.36 + level * 0.12, 0.56 + level * 0.06);
      else if (level === CFG.LANDMARK) addBlock(0, 0, 0.72, 1.25, 0.66);
      else {
        const count = Math.min(3, level);
        for (let n = 0; n < count; n++) addBlock((n - (count - 1) / 2) * 0.5, (n % 2 ? 0.15 : -0.1), 0.42, 0.38 + n * 0.08, 0.4);
      }
      lowBuildingCache.set(key, root);
    }
    return lowBuildingCache.get(key).clone(true);
  }
  function makeBuilding(i) {
    const pr = S.props[i], t = TILES[i], hex = seatOf[pr.owner].color, far = FAR(tileFrame(i).side);
    const grp = new THREE.Group();
    let p;
    if (t.type === 'resort') {
      // nhà biển lùi về phía nước để chừa chỗ cho tên bãi biển ở giữa bãi cát
      const beachLv = Math.max(1, beachLevel(pr.owner)), h = graphicsLevel === 'low' ? lowDetailBuilding(beachLv, hex, true) : HK.beachHouse(beachLv, hex); h.scale.multiplyScalar(0.94); grp.add(h);
      p = local(i, 0, far ? 0.81 : -0.81);
    } else { grp.add(graphicsLevel === 'low' ? lowDetailBuilding(pr.level, hex) : HK.building('suburb', pr.level, hex)); p = local(i, 0, lay(i).grassZ); }
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
    requestActiveRender(an.total + (delay || 0) + 250);
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
      if (stepAnim(an, now)) { anims.splice(k, 1); an.onDone && an.onDone(); requestShadowUpdate(); }
    }
  }
  function clearBuildings() {
    anims.length = 0;
    Object.values(buildObjs).forEach((b) => board.remove(b.obj)); for (const k in buildObjs) delete buildObjs[k];
    for (const o of dyingObjs) board.remove(o); dyingObjs.clear();
    for (const k in tileSigs) delete tileSigs[k];
    requestShadowUpdate();
  }
  const dyingObjs = new Set();
  // trả về thời điểm (ms) nhà mới bắt đầu xây, để tiền chạy cùng lúc
  function syncBuildings(instant) {
    let startAt = 0;
    let geometryChanged = false;
    for (let i = 0; i < 32; i++) {
      const pr = S.props[i], t = TILES[i];
      const tsig = pr ? `${pr.owner}:${pr.level}:${S.festival === i}:${S.festLevel}:${outageRounds(i)}:${G.rentOf(S, i)}` : '';
      if (tileSigs[i] !== tsig) { tileSigs[i] = tsig; refreshTile(i); }
      const msig = pr ? `${graphicsLevel}:${pr.owner}:${t.type === 'resort' ? 'b' + beachLevel(pr.owner) : pr.level}` : '';
      if ((buildObjs[i] ? buildObjs[i].sig : '') === msig) continue;
      let wait = 0;
      if (buildObjs[i] && instant) { board.remove(buildObjs[i].obj); delete buildObjs[i]; geometryChanged = true; }
      if (buildObjs[i]) { // bán / bị mua lại / đổi cấp: nhà cũ bốc lên biến mất trước
        const old = buildObjs[i].obj; delete buildObjs[i];
        dyingObjs.add(old);
        wait = animate(old, 'sell', 0, () => { board.remove(old); dyingObjs.delete(old); });
        geometryChanged = true;
        if (wait) wait += 120;
      }
      if (!pr) continue;
      const grp = makeBuilding(i);
      board.add(grp);
      geometryChanged = true;
      if (!instant) { animate(grp, 'build', wait); startAt = Math.max(startAt, wait); }
      buildObjs[i] = { obj: grp, sig: msig };
    }
    syncFestival();
    // Đổi tiền thuê/mất điện chỉ vẽ lại texture ô đất, không ảnh hưởng bóng.
    // Shadow map chỉ cần dựng lại nếu thực sự thêm, xoá hoặc đổi model công trình.
    if (geometryChanged) requestShadowUpdate();
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
    Object.values(tokens).forEach((t) => scene.remove(t)); for (const k in tokens) delete tokens[k];
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
    requestShadowUpdate();
  }
  function syncTokens(snap) {
    for (const p of S.players) {
      const t = tokens[p.id];
      t.visible = !p.bankrupt;
      if (t.userData.controlGlow) t.userData.controlGlow.visible = !p.bankrupt && p.id === glowPid;
      if (dispPos[p.id] !== undefined) continue;
      const v = tokenSpot(p.id, p.pos);
      if (snap) t.position.set(v.x, TOPY, v.z);
      t.userData.to = v;
      t.rotation.y = FACE_CAM;
    }
  }
  async function hop(pid, path, onTile) {
    const t = tokens[pid];
    requestActiveRender(path.length * 220 + 500);
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
    requestShadowUpdate();
  }

  /* xúc xắc 3D */
  const FACE_VALUES = [3, 4, 1, 6, 2, 5]; // +x -x +y -y +z -z
  const FACE_UP = { 1: new THREE.Euler(0, 0, 0), 6: new THREE.Euler(Math.PI, 0, 0), 3: new THREE.Euler(0, 0, Math.PI / 2), 4: new THREE.Euler(0, 0, -Math.PI / 2), 2: new THREE.Euler(-Math.PI / 2, 0, 0), 5: new THREE.Euler(Math.PI / 2, 0, 0) };
  const dice = [];
  async function loadDice() {
    const loader = new THREE.TextureLoader();
    const faces = await Promise.all(FACE_VALUES.map(async (v) => {
      const map = await loader.loadAsync(`thumbnails/static/dice-${v}.png?v=${PROPERTY_THUMBNAIL_VERSION.slice(0, 12)}`);
      map.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map, roughness: .45 });
    }));
    [0, 1].forEach((n) => {
      const m = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.8, 0.8, 4, 0.13), faces);
      m.castShadow = true; m.position.set(n ? 0.9 : -0.4, DIE_Y, n ? 2.3 : 1.9); scene.add(m); dice.push(m);
    });
  }
  async function rollDice(a, b) {
    const land = [new THREE.Vector3(-0.4, DIE_Y, 1.9), new THREE.Vector3(0.9, DIE_Y, 2.3)];
    const startP = [new THREE.Vector3(-3.2, 4.5, -2.4), new THREE.Vector3(-2.4, 5, -3.1)];
    const finalQ = [a, b].map((v, k) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (k ? 0.5 : -0.3) + Math.random() * 0.6).multiply(new THREE.Quaternion().setFromEuler(FACE_UP[v])));
    const axes = [0, 1].map(() => new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize());
    const dur = REDUCED ? 650 : 1150, t0 = performance.now();
    requestActiveRender(dur + 300);
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
    requestShadowUpdate();
  }
  // tổng xúc xắc: app.js hiện bằng DOM sau khi rollDice() resolve

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
    requestActiveRender(500);
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
  function fit() { view.zoom = 1; view.tx = 0; view.tz = 0; applyView(); }
  // kéo để di chuyển, cuộn / chụm hai ngón để zoom, chạm để chọn ô
  const ptrs = new Map();
  let drag = null, pinch0 = null;
  function canvasPointerDown(e) { cvs.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); drag = { x: e.clientX, y: e.clientY, moved: 0 }; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), z: view.zoom }; } }
  function canvasPointerMove(e) {
    if (!ptrs.has(e.pointerId)) return;
    const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2 && pinch0) { const [a, b] = [...ptrs.values()]; view.zoom = pinch0.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch0.d; applyView(); drag.moved = 99; return; }
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y; drag.moved += Math.abs(dx) + Math.abs(dy);
    const upp = (camera.right - camera.left) / (view.zoom * innerWidth);
    const sinE = CAM_OFF.y / CAM_OFF.length();
    // màn hình phải = (1,0,-1)/√2 ; màn hình lên (trên mặt đất) = (-1,0,-1)/√2 / sinE
    const r = -dx * upp / Math.SQRT2, u = dy * upp / Math.SQRT2 / sinE;
    view.tx += r - u; view.tz += -r - u; applyView();
  }
  const endPtr = (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = null;
  };
  function canvasWheel(e) { e.preventDefault(); zoomBy(Math.exp(-e.deltaY * 0.0015)); }
  function bindCanvas(canvas) {
    ptrs.clear(); drag = null; pinch0 = null;
    canvas.addEventListener('pointerdown', canvasPointerDown);
    canvas.addEventListener('pointermove', canvasPointerMove);
    canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
    canvas.addEventListener('wheel', canvasWheel, { passive: false });
  }
  function unbindCanvas(canvas) {
    canvas.removeEventListener('pointerdown', canvasPointerDown);
    canvas.removeEventListener('pointermove', canvasPointerMove);
    canvas.removeEventListener('pointerup', endPtr); canvas.removeEventListener('pointercancel', endPtr);
    canvas.removeEventListener('wheel', canvasWheel);
  }
  bindCanvas(cvs);

  /* chọn ô bằng chạm */
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  function pickAt(cx, cy) {
    mouse.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(tileMeshes)[0];
    return hit ? hit.object.userData.tile : null;
  }

  /* mũi tên nhấp nhô trên đầu quân đang tới lượt, cùng màu với người chơi */
  const turnArrow = (() => {
    const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.4 });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.36, 4), m); cone.rotation.x = Math.PI; cone.castShadow = true; g.add(cone);
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.12), m); stem.position.y = 0.26; g.add(stem);
    g.userData.material = m; g.userData.playerColor = '';
    g.scale.setScalar(1.7); g.visible = false; scene.add(g); return g;
  })();
  // Pháo giấy dùng pool + geometry dùng chung để không tạo/rò tài nguyên GPU sau mỗi lễ hội.
  const confetti = [], confettiPool = [];
  const confettiGeometry = new THREE.PlaneGeometry(0.09, 0.05);
  const CONFETTI_COLORS = ['#ff6fa0', '#ffc23a', '#5cc6e8', '#7fd6a0', '#a98af0', '#ffffff'];
  function takeConfetti(n) {
    const c = confettiPool.pop();
    if (c) { c.m.material.opacity = 1; return c; }
    const m = new THREE.Mesh(confettiGeometry, new THREE.MeshBasicMaterial({ color: CONFETTI_COLORS[n % CONFETTI_COLORS.length], side: THREE.DoubleSide, transparent: true, depthWrite: false }));
    return { m, v: new THREE.Vector3(), spin: 0, t0: 0 };
  }
  function burstConfetti(i) {
    const f = tileFrame(i), count = GRAPHICS[graphicsLevel].confetti;
    requestActiveRender(3100);
    for (let n = 0; n < count; n++) {
      const c = takeConfetti(n), { m } = c;
      m.material.color.set(CONFETTI_COLORS[n % CONFETTI_COLORS.length]);
      m.position.set(f.x + (Math.random() - 0.5) * 0.6, TOPY + 1.4, f.z + (Math.random() - 0.5) * 0.6);
      m.rotation.set(0, 0, 0); m.scale.setScalar(1); scene.add(m);
      c.v.set((Math.random() - 0.5) * 2.4, 2 + Math.random() * 2.2, (Math.random() - 0.5) * 2.4);
      c.spin = Math.random() * 10; c.t0 = performance.now(); confetti.push(c);
    }
  }
  function stepConfetti(now, dt) {
    for (let k = confetti.length - 1; k >= 0; k--) {
      const c = confetti[k], age = (now - c.t0) / 1000;
      c.v.y -= 4.5 * dt; c.v.multiplyScalar(Math.pow(0.985, dt * 60)); c.m.position.addScaledVector(c.v, dt); c.m.rotation.set(age * c.spin, age * c.spin * 0.7, 0);
      if (c.m.position.y < TOPY) c.m.position.y = TOPY, c.v.set(0, 0, 0);
      c.m.material.opacity = Math.max(0, 1 - Math.max(0, age - 2) / 0.8);
      if (age > 2.8) { scene.remove(c.m); confetti.splice(k, 1); confettiPool.push(c); }
    }
  }
  const followTarget = new THREE.Vector3();
  function placeOverlays() {
    const p = arrowPid && S ? S.players.find((x) => x.id === arrowPid) : null, arrowOn = !!p && !!tokens[p.id] && !p.bankrupt;
    turnArrow.visible = arrowOn;
    if (arrowOn) {
      const color = arrowColor || (seatOf[p.id] && seatOf[p.id].color) || p.color;
      if (turnArrow.userData.playerColor !== color) {
        turnArrow.userData.playerColor = color;
        turnArrow.userData.material.color.set(color);
        turnArrow.userData.material.emissive.set(color);
      }
      const t = tokens[p.id].position; turnArrow.position.set(t.x, t.y + 1.45 + Math.sin(clockT * 4) * 0.14, t.z); turnArrow.rotation.y = clockT * 1.5;
    }
  }

  /* vòng lặp vẽ */
  let clockT = 0, frameRequest = 0, frameTimer = 0, lastRenderedAt = 0;
  function requestActiveRender() {
    if (frameRunning && !document.hidden && frameTimer) { clearTimeout(frameTimer); frameTimer = 0; queueFrame(); }
  }
  function queueFrame(delay = 0) {
    if (!frameRunning || document.hidden || frameRequest || frameTimer) return;
    if (delay > 1) frameTimer = setTimeout(() => { frameTimer = 0; if (frameRunning && !document.hidden) frameRequest = requestAnimationFrame(frame); }, delay);
    else frameRequest = requestAnimationFrame(frame);
  }
  function frame(now) {
    frameRequest = 0;
    if (!frameRunning || document.hidden) return;
    const profile = GRAPHICS[graphicsLevel];
    // Giữ cùng FPS trước, trong và sau lượt; không đổi nhịp render khi bắt đầu roll.
    const targetFps = profile.fps;
    const frameInterval = 1000 / targetFps;
    if (lastRenderedAt && now - lastRenderedAt < frameInterval - 1) { queueFrame(frameInterval - (now - lastRenderedAt)); return; }
    clockT = now / 1000;
    // Cho phép bù đủ thời gian khi trình duyệt trễ một vài frame; cap 0,1 s vẫn chặn cú nhảy lớn sau khi tab vừa hiện lại.
    const dt = Math.min(0.1, Math.max(0, clockT - (frame.last || clockT))); frame.last = clockT;
    lastRenderedAt = lastRenderedAt ? lastRenderedAt + frameInterval * Math.max(1, Math.floor((now - lastRenderedAt) / frameInterval)) : now;
    stepAnims(now);
    if (!REDUCED && GRAPHICS[graphicsLevel].worldMotion) { specials.forEach((o) => o.userData.update && o.userData.update(clockT, dt)); bonusFlags.forEach((o, k) => o.userData.update(clockT + k * 0.7));  if (tourTex) tourTex.offset.set((-clockT * 0.035) % 1, (-clockT * 0.035) % 1); }
    const followAlpha = 1 - Math.pow(1 - 0.25, dt * 60);
    for (const p of S ? S.players : []) { const t = tokens[p.id]; if (t && t.userData.to && dispPos[p.id] === undefined) { followTarget.set(t.userData.to.x, TOPY, t.userData.to.z); t.position.lerp(followTarget, followAlpha); } }
    Object.values(tokens).forEach((t) => { const g = t.userData.controlGlow; if (g && g.visible) { const pulse = 1.075 + Math.sin(clockT * 4.5) * 0.012; g.scale.setScalar(pulse); t.userData.glowMaterial.opacity = 0.58 + Math.sin(clockT * 4.5) * 0.12; } });
    placeOverlays(); stepConfetti(now, dt);
    if (festBanner) { // bảng lễ hội bật ra rồi đứng yên
      const festDuration = REDUCED ? 300 : 650;
      const k = festBanner.userData.t0 < 0 ? 1 : Math.min(1, (now - festBanner.userData.t0) / festDuration);
      const e = k < 1 ? 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2) : 1;
      festBanner.scale.set(Math.max(0.001, e), Math.max(0.001, e), 1);
    }
    glows.forEach((g) => { if (g.userData.on) g.material.opacity = 0.12 + Math.sin(clockT * 5) * 0.1; else g.material.opacity = 0; });
    if (renderer.shadowMap.enabled && shadowDirty) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }
    renderer.render(scene, camera);
    const nextProfile = GRAPHICS[graphicsLevel], nextFps = nextProfile.fps;
    queueFrame(1000 / nextFps);
  }
  function startFrame() {
    if (frameRunning) return;
    frameRunning = true;
    frame.last = 0; lastRenderedAt = 0; requestActiveRender(1500);
    queueFrame();
  }
  function stopFrame() { frameRunning = false; if (frameRequest) cancelAnimationFrame(frameRequest); if (frameTimer) clearTimeout(frameTimer); frameRequest = 0; frameTimer = 0; }

  /* ---------------- tải asset & dựng bàn ---------------- */
  // chữ trên texture ô cờ vẽ bằng canvas: chờ font trước khi vẽ (font bị chặn thì dùng font dự phòng)
  await Promise.all([document.fonts.load('800 40px "Baloo 2"'), document.fonts.load('800 40px "Be Vietnam Pro"'), document.fonts.load('900 40px Rubik'), document.fonts.load('700 40px Fredoka'), document.fonts.load('600 40px Fredoka')]).catch(() => {});
  const modelBundle = await (await fetch('models/bundle.json')).json();
  await loadModels(modelBundle);
  await HK.loadKit('models', (d, n) => progress(d, n, 'models'), modelBundle);
  await Promise.all([loadGroundPatterns(), preloadWorldAssets(), HK.preloadSpecialAssets(CFG.BONUS_MULT), loadDice()]);
  buildTiles(); decorate();
  resize();

  function disposeScene() {
    const seen = new Set();
    scene.traverse((o) => {
      if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      ms.forEach((m) => { if (seen.has(m)) return; seen.add(m); if (m.map) m.map.dispose(); m.dispose(); });
    });
    tileTex.forEach((t) => t.dispose());
  }

  /* ---------------- Board (docs/contracts/map-renderer.md) ---------------- */
  return {
    reset(v) {
      S = v; seatSetup();
      clearBuildings();
      festSig = 'x';
      for (const k in dispPos) delete dispPos[k]; // quân đang bay dở của trạng thái cũ
      syncFestival.first = true;
      syncBonus(); buildTokens(); syncBuildings(true);
      syncFestival.first = false;
    },
    meta: { buildMs: BUILD_MS, resortLevels: BEACH_LEVELS },
    async sync(v) {
      S = v; seatSetup();
      const wait = syncBuildings(); syncTokens(false);
      return wait;
    },
    async moveToken(pid, path, opts = {}) {
      if (opts.view) { S = opts.view; seatSetup(); } // vị trí quân khác trên ô đích theo state mới nhất
      const t = tokens[pid];
      if (!t || !path || !path.length) return;
      if (opts.jump) {
        const last = path[path.length - 1];
        dispPos[pid] = last; const v = tokenSpot(pid, last); t.position.set(v.x, TOPY, v.z); t.userData.to = v; delete dispPos[pid];
        requestShadowUpdate();
        return;
      }
      await hop(pid, path, opts.onStep);
    },
    rollDice,
    tileScreen(i, lift = 0) { const f = tileFrame(i); return screenOf(new THREE.Vector3(f.x, TOPY + lift, f.z)); },
    pick(x, y) { return pickAt(x, y); },
    tokenScreen(pid) { const t = tokens[pid]; return t ? screenOf(t.position) : null; },
    setActive(pid, color, glow = pid) {
      arrowPid = pid || null; arrowColor = color || '';
      glowPid = glow || null;
      if (S) syncTokens(false);
      requestActiveRender();
    },
    effect(kind, tile) { if ((kind === 'confetti' || kind === 'festival') && tile !== null && tile !== undefined) burstConfetti(tile); },
    highlight(tiles) { setDim(tiles && tiles.length ? new Set(tiles) : null); requestActiveRender(); },
    setQuality: setGraphicsLevel,
    resize, zoomBy, fit,
    start: startFrame,
    stop: stopFrame,
    stats() { const p = GRAPHICS[graphicsLevel], r = renderer.info.render; return { graphicsLevel, activeFps: p.fps, motionFps: p.motionFps, idleFps: p.idleFps, antialias: !!renderer.getContext().getContextAttributes().antialias, frame: r.frame, calls: r.calls, triangles: r.triangles, points: r.points }; },
    destroy() {
      if (destroyed) return; destroyed = true;
      stopFrame(); unbindCanvas(cvs);
      disposeScene();
      if (sun.shadow.map) sun.shadow.map.dispose();
      renderer.dispose(); renderer.forceContextLoss();
    },
  };
}

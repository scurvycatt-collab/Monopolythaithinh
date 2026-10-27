/* Thái Thịnh Monopoly — thế giới thập cẩm phủ ô trống giữa bàn (11.9 × 11.9).
   centerWorld() trả về THREE.Group: mặt đất y = 0 (đặt ở TOPY của bàn), tâm ở gốc.
   group.userData.update(t, dt) chạy mọi chuyển động; t tính bằng giây.
   Bố cục theo camera bàn cờ (đặt ở +x +z):
     góc sau (−x −z)  : dãy núi tuyết, rừng thông, thác nước đổ ra sông
     góc phải (+x −z) : hồ, thuyền buồm, ca nô, tàu kéo
     góc trái (−x +z) : công viên: tàu lượn siêu tốc, đu quay
     góc trước (+x +z): làng, ruộng ô bàn cờ, cối xay gió
     cạnh phải        : bãi phóng tên lửa và chảo ăng-ten
     trên trời        : phi thuyền bay ngang, khinh khí cầu
     giữa, phía trước : đồng cỏ trống cho xúc xắc lăn (xúc xắc đè lên cũng không sao) */
import * as THREE from 'three';
import { get, at, mat, box, cyl, building } from './houses.js';

const S = 11.9, HALF = S / 2;
const C = {
  grass: '#a6dc8c', grass2: '#b8e6a0', snow: '#ffffff', rock: '#c9b8a0', rock2: '#b3a28a', slope: '#8fcf7a',
  water: '#7fd0ee', sand: '#f3dcaa', rail: '#ff5c8a', rail2: '#ffd23a', white: '#fbf8f1', wood: '#b98556',
};
const rng = (seed) => { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); };
const shadowAll = (g) => { g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; };

/* ---------- mặt đất: cỏ, ruộng ô bàn cờ, lối mòn (vẽ canvas) ---------- */
function ground() {
  const N = 1536, cv = document.createElement('canvas'); cv.width = cv.height = N; const c = cv.getContext('2d');
  const P = (x, z) => [((x + HALF) / S) * N, ((z + HALF) / S) * N];   // toạ độ thế giới → điểm ảnh
  const k = N / S;
  c.fillStyle = C.grass; c.fillRect(0, 0, N, N);
  const r = rng(4);
  for (let i = 0; i < 260; i++) { c.fillStyle = r() < .5 ? 'rgba(140,204,118,.5)' : 'rgba(194,234,166,.55)'; c.beginPath(); c.ellipse(r() * N, r() * N, 10 + r() * 40, 6 + r() * 20, r() * 3, 0, 7); c.fill(); }
  // ruộng ô bàn cờ ở góc trước, xoay theo lưới chéo
  const fields = [['#f2d27a', 'w'], ['#9fd27a', 'r'], ['#c9a27a', 'p'], ['#cdb6f0', 'r'], ['#f2d27a', 'r'], ['#e8b07a', 'p'], ['#9fd27a', 'w'], ['#f6e3a3', 'r'], ['#cdb6f0', 'w']];
  c.save(); const [fx, fz] = P(3.55, 3.55); c.translate(fx, fz); c.rotate(Math.PI / 4);
  const fs = 0.78 * k;
  fields.forEach(([col, kind], i) => {
    const gx = (i % 3) - 1, gz = Math.floor(i / 3) - 1, x = gx * fs * 1.06 - fs / 2, y = gz * fs * 1.06 - fs / 2;
    c.fillStyle = col; c.fillRect(x, y, fs, fs);
    c.strokeStyle = 'rgba(0,0,0,.08)'; c.lineWidth = 3;
    if (kind !== 'p') for (let j = 1; j < 7; j++) { c.beginPath(); if (kind === 'r') { c.moveTo(x + j * fs / 7, y); c.lineTo(x + j * fs / 7, y + fs); } else { c.moveTo(x, y + j * fs / 7); c.lineTo(x + fs, y + j * fs / 7); } c.stroke(); }
    else { for (let j = 0; j < 14; j++) { c.fillStyle = 'rgba(120,80,50,.18)'; c.fillRect(x + 6, y + j * fs / 14 + 3, fs - 12, 4); } }
  });
  c.restore();
  // lối mòn nối làng – công viên – bãi phóng
  c.strokeStyle = '#ead9b4'; c.lineWidth = 0.22 * k; c.lineCap = 'round'; c.lineJoin = 'round';
  const path = [[5.6, 1.2], [3.6, 1.0], [2.2, 2.3], [1.0, 4.0], [-1.0, 4.2], [-1.8, 3.0], [-1.7, 1.2], [-2.6, -0.3], [-1.6, -1.3], [-0.6, -1.6]];
  c.beginPath(); path.forEach(([x, z], i) => { const [px, pz] = P(x, z); i ? c.lineTo(px, pz) : c.moveTo(px, pz); }); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 0.06 * k; c.setLineDash([0.12 * k, 0.12 * k]); c.stroke(); c.setLineDash([]);
  // bãi phóng tên lửa: sân bê tông tròn
  { const [px, pz] = P(4.4, -0.35); c.fillStyle = '#d9dde3'; c.beginPath(); c.arc(px, pz, 0.85 * k, 0, 7); c.fill(); c.strokeStyle = '#f2b632'; c.lineWidth = 8; c.beginPath(); c.arc(px, pz, 0.62 * k, 0, 7); c.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshStandardMaterial({ map: t, roughness: .95 }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true; return m;
}

/* ---------- núi ---------- */
function mountain(h, r, seed, snowAt = 0.62) {
  const g = new THREE.Group(), rn = rng(seed);
  const geo = new THREE.ConeGeometry(r, h, 9, 4), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > h / 2 - 1e-4) continue; const f = 0.86 + rn() * 0.3; p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); p.setY(i, y + (rn() - 0.5) * h * 0.06); }
  geo.computeVertexNormals(); geo.translate(0, h / 2, 0);
  // tô màu theo độ cao: chân xanh, giữa đá, đỉnh tuyết
  const col = new Float32Array(p.count * 3), tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / h; tmp.set(y > snowAt ? C.snow : y > 0.28 ? (i % 2 ? C.rock : C.rock2) : C.slope); col.set([tmp.r, tmp.g, tmp.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(geo.toNonIndexed(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, flatShading: true }));
  g.add(m); return shadowAll(g);
}

/* ---------- dải nước theo đường cong (sông, thác) ---------- */
function waterTex(vertical) {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256; const c = cv.getContext('2d');
  c.fillStyle = vertical ? '#bfeaf8' : C.water; c.fillRect(0, 0, 64, 256);
  c.strokeStyle = vertical ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.55)'; c.lineWidth = vertical ? 5 : 3;
  const r = rng(vertical ? 3 : 8);
  for (let i = 0; i < (vertical ? 14 : 9); i++) { const x = 6 + r() * 52, y = r() * 256, l = vertical ? 30 + r() * 50 : 14 + r() * 18; c.beginPath(); c.moveTo(x, y); c.lineTo(vertical ? x : x + (r() - .5) * 8, y + l); c.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function ribbon(curve, width, y, matl, repeat, widthFn) {
  const n = 120, pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = curve.getPointAt(u), tg = curve.getTangentAt(u), side = new THREE.Vector3(-tg.z, 0, tg.x).normalize();
    const w = (widthFn ? widthFn(u) : 1) * width / 2;
    pos.push(p.x - side.x * w, y, p.z - side.z * w, p.x + side.x * w, y, p.z + side.z * w);
    uv.push(0, u * repeat, 1, u * repeat);
    if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, matl); m.receiveShadow = true; return m;
}

/* ---------- tàu lượn siêu tốc ---------- */
function coaster() {
  const g = new THREE.Group();
  // vòng ray kín: [góc, bán kính, độ cao]
  const spec = [[0, 1.0, 0.18], [0.5, 1.15, 0.18], [1.0, 1.35, 0.55], [1.4, 1.5, 1.05], [1.75, 1.45, 1.55], [2.05, 1.25, 1.62], [2.35, 1.0, 1.0], [2.65, 0.8, 0.4], [3.0, 0.75, 0.32], [3.5, 1.15, 0.85], [3.9, 1.5, 0.95], [4.3, 1.55, 0.55], [4.75, 1.3, 0.3], [5.2, 0.95, 0.62], [5.6, 0.85, 0.72], [5.95, 0.9, 0.35]];
  const pts = spec.map(([a, r, y]) => new THREE.Vector3(Math.cos(a) * r * 1.25, y * 0.72 + 0.2, Math.sin(a) * r));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const L = 340, up = new THREE.Vector3(0, 1, 0);
  const frame = (u) => { const p = curve.getPointAt(u), t = curve.getTangentAt(u), s = new THREE.Vector3().crossVectors(t, up).normalize(), n = new THREE.Vector3().crossVectors(s, t).normalize(); return { p, t, s, n }; };
  const railPts = [[], []];
  for (let i = 0; i < L; i++) { const { p, s } = frame(i / L); railPts[0].push(p.clone().addScaledVector(s, 0.07)); railPts[1].push(p.clone().addScaledVector(s, -0.07)); }
  railPts.forEach((rp) => { const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rp, true), 400, 0.022, 6, true), mat(C.rail)); tube.castShadow = true; g.add(tube); });
  const spine = new THREE.Mesh(new THREE.TubeGeometry(curve, 400, 0.03, 6, true), mat('#e8406f')); spine.position.y = -0.05; g.add(spine);
  // tà vẹt và cột chống
  for (let i = 0; i < L; i += 4) {
    const { p, t, n } = frame(i / L); const tie = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.014, 0.03), mat(C.white));
    tie.position.copy(p).addScaledVector(n, -0.02); tie.lookAt(p.clone().add(t)); tie.rotateY(Math.PI / 2); tie.rotation.y += 0; g.add(tie);
    if (i % 16 === 0 && p.y > 0.25) { const h = p.y - 0.06; const post = cyl(0.018, h, C.white, p.x, 0, p.z, 6); g.add(post); g.add(cyl(0.05, 0.03, '#d9dde3', p.x, 0, p.z, 8)); }
  }
  // ga xuất phát
  const st = frame(0.03); g.add(at(box(0.7, 0.18, 0.42, '#fff1d8'), st.p.x, 0, st.p.z + 0.02, -Math.atan2(st.t.z, st.t.x)));
  const roof = box(0.82, 0.05, 0.5, C.rail, 0, 0.55, 0); const sp = new THREE.Group(); sp.add(roof); for (const [x, z] of [[-0.35, -0.2], [0.35, -0.2], [-0.35, 0.2], [0.35, 0.2]]) sp.add(cyl(0.015, 0.55, C.white, x, 0, z, 6));
  g.add(at(sp, st.p.x, 0, st.p.z + 0.02, -Math.atan2(st.t.z, st.t.x)));
  // đoàn tàu 4 toa
  const cols = ['#ffd23a', '#2c8ff0', '#43a047', '#8e24aa'];
  const cars = cols.map((hex, i) => {
    const car = new THREE.Group();
    car.add(box(0.2, 0.08, 0.13, hex, 0, -0.01, 0)); car.add(box(0.05, 0.08, 0.13, hex, i === 0 ? 0.09 : -0.09, 0.05, 0));
    car.add(box(0.13, 0.03, 0.1, '#26364a', 0, 0.06, 0));
    if (i === 0) { const nose = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.1, 6), mat(hex)); nose.rotation.z = -Math.PI / 2; nose.position.set(0.14, 0.02, 0); car.add(nose); }
    for (const z of [-0.035, 0.035]) { const head = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mat(['#f6c9a8', '#8a5a3c', '#f1d1b0'][(i + (z > 0)) % 3])); head.position.set(-0.02, 0.1, z); car.add(head); }
    shadowAll(car); g.add(car); return car;
  });
  // đu quay nhỏ cạnh tàu lượn
  const wheel = new THREE.Group(); wheel.position.set(0.15, 0, 0.15);
  const R = 0.62, hub = 0.75;
  for (const z of [-0.12, 0.12]) { for (const s of [-1, 1]) { const leg = box(0.03, hub + 0.05, 0.03, C.white, 0, 0, 0); leg.position.set(s * 0.3, 0, z); leg.rotation.z = s * 0.38; leg.children[0].position.y = (hub + 0.05) / 2; wheel.add(leg); } }
  const rot = new THREE.Group(); rot.position.y = hub; wheel.add(rot);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.018, 6, 40), mat(C.rail2)); rot.add(rim);
  const rim2 = rim.clone(); rim2.scale.setScalar(0.55); rot.add(rim2);
  const gondolas = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2; const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, R, 4), mat(C.white)); spoke.position.set(Math.cos(a) * R / 2, Math.sin(a) * R / 2, 0); spoke.rotation.z = a - Math.PI / 2; rot.add(spoke);
    const gd = new THREE.Group(); gd.add(box(0.09, 0.07, 0.09, cols[i % 4], 0, -0.09, 0)); gd.add(box(0.11, 0.015, 0.11, C.white, 0, -0.025, 0)); gd.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); rot.add(gd); gondolas.push(gd);
  }
  shadowAll(wheel); g.add(wheel); wheel.position.set(1.95, 0, 1.25); wheel.rotation.y = -Math.PI / 4;
  // chuyển động: tốc độ theo năng lượng (cao chậm, thấp nhanh), đoạn kéo lên chạy đều
  const hMax = Math.max(...pts.map((p) => p.y));
  let u = 0;
  g.userData.update = (t, dt) => {
    const y = curve.getPointAt(u).y;
    const lift = u > 0.12 && u < 0.3;
    const v = lift ? 0.035 : Math.sqrt(0.0025 + 0.012 * Math.max(0, hMax - y)) * 1.2;
    u = (u + v * dt) % 1;
    cars.forEach((car, i) => {
      const uu = (u - i * 0.022 + 1) % 1; const { p, t: tg, n } = frame(uu);
      car.position.copy(p).addScaledVector(n, 0.05);
      const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), tg, n); car.quaternion.setFromRotationMatrix(m); car.rotateY(Math.PI / 2);
    });
    rot.rotation.z = t * 0.35; gondolas.forEach((gd) => (gd.rotation.z = -t * 0.35));
  };
  return g;
}

/* ---------- khinh khí cầu ---------- */
function balloon(c1, c2) {
  const g = new THREE.Group();
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 8; const x = cv.getContext('2d');
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? c1 : c2; x.fillRect(i * 16, 0, 16, 8); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const env = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), new THREE.MeshStandardMaterial({ map: t, roughness: .6, flatShading: true }));
  env.scale.y = 1.15; env.position.y = 0.55; g.add(env);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.07, 0.16, 12), new THREE.MeshStandardMaterial({ map: t, roughness: .6 })); neck.position.y = 0.2; g.add(neck);
  g.add(box(0.11, 0.08, 0.11, C.wood, 0, -0.02, 0));
  for (const [x2, z2] of [[-0.05, -0.05], [0.05, -0.05], [-0.05, 0.05], [0.05, 0.05]]) g.add(cyl(0.003, 0.1, '#5b4a3a', x2, 0.05, z2, 3));
  return shadowAll(g);
}

/* ---------- tên lửa ---------- */
function rocket() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  let y = 0;
  for (const [k, h] of [['rocket_baseA', 1.6], ['rocket_fuelA', 0.5], ['rocket_sidesA', 1.0], ['rocket_topA', 0.8]]) { const p = get('space/' + k); p.position.y = y; body.add(p); y += h; }
  body.scale.setScalar(0.33);
  // giàn phóng
  const tower = new THREE.Group(); tower.position.set(-0.42, 0, 0);
  for (let i = 0; i < 6; i++) tower.add(box(0.12, 0.22, 0.12, i % 2 ? '#f2b632' : '#e2557f', 0, i * 0.22, 0));
  tower.add(box(0.3, 0.03, 0.05, '#8f99a8', 0.15, 1.05, 0));
  g.add(shadowAll(tower));
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 8), new THREE.MeshStandardMaterial({ color: '#ffd84a', emissive: '#ff8a1a', emissiveIntensity: 1, transparent: true, opacity: 0.95 }));
  flame.rotation.x = Math.PI; flame.visible = false; body.add(flame); flame.scale.setScalar(3); flame.position.y = -0.6;
  const smoke = []; for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 1), new THREE.MeshStandardMaterial({ color: '#f1f3f6', transparent: true, opacity: 0, depthWrite: false, flatShading: true })); g.add(m); smoke.push({ m, a: (i / 18) * Math.PI * 2 }); }
  const P = 20;
  g.userData.update = (t) => {
    const u = (t + 6) % P;
    let h = 0, burn = 0;
    if (u > 3 && u < 9) { const a = u - 3; burn = 1; h = a < 1.2 ? 0 : 0.35 * (a - 1.2) ** 2.2; }
    body.position.y = h; body.visible = h < 14;
    flame.visible = burn > 0; flame.scale.set(3, 3 + Math.sin(t * 40) * 0.6, 3);
    smoke.forEach((s, i) => {
      const a = u - 3 - (i % 6) * 0.15; const on = a > 0 && a < 4.5;
      s.m.material.opacity = on ? 0.8 * (1 - a / 4.5) : 0;
      const r = on ? 0.15 + a * 0.22 : 0; s.m.position.set(Math.cos(s.a) * r, 0.08 + (on ? a * 0.05 : 0), Math.sin(s.a) * r); s.m.scale.setScalar(on ? 0.8 + a * 0.9 : 1);
    });
  };
  return g;
}

/* ---------- phi thuyền bay ngang trời ---------- */
function flyer(key, from, to, peak, period, offset, scale) {
  const g = new THREE.Group(); const craft = get('space/' + key); craft.scale.setScalar(scale); g.add(craft);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: '#7fe3ff', transparent: true, opacity: 0.9 })); glow.position.z = -0.42 * scale / 0.35; g.add(glow);
  const trail = []; for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: '#bff3ff', transparent: true, opacity: 0, depthWrite: false })); m.frustumCulled = false; trail.push(m); }
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), mid = a.clone().add(b).multiplyScalar(0.5); mid.y = peak;
  const path = new THREE.QuadraticBezierCurve3(a, mid, b);
  const hist = [];
  g.userData.trail = trail;
  g.userData.update = (t) => {
    const u = ((t + offset) % period) / period, on = u < 0.55, k = u / 0.55;
    g.visible = on; trail.forEach((m) => (m.visible = on));
    if (!on) { hist.length = 0; return; }
    const p = path.getPoint(k), q = path.getPoint(Math.min(1, k + 0.01));
    g.position.copy(p); g.lookAt(q); g.rotateZ(Math.sin(k * Math.PI * 2) * 0.35);
    hist.unshift(p.clone()); if (hist.length > 40) hist.pop();
    trail.forEach((m, i) => { const h = hist[i * 3]; if (!h) { m.material.opacity = 0; return; } m.position.copy(h); m.scale.setScalar(1 - i / 16); m.material.opacity = 0.6 * (1 - i / 14); });
  };
  return g;
}

/* ================= LẮP RÁP ================= */
export function centerWorld() {
  const W = new THREE.Group(), updates = [];
  W.add(ground());
  // --- núi + rừng + thác ---
  const mts = [[-4.05, -4.05, 1.4, 1.55, 1, 0.58], [-2.45, -4.6, 0.95, 1.0, 2], [-4.6, -2.45, 0.9, 0.95, 3], [-3.0, -3.1, 0.55, 0.75, 4, 0.9], [-1.4, -4.95, 0.45, 0.6, 5, 0.9]];
  mts.forEach(([x, z, h, r, s, sn]) => { const m = mountain(h, r, s, sn || 0.62); m.position.set(x, 0, z); W.add(m); });
  // sông: từ chân thác chảy qua giữa phía sau ra hồ góc phải
  const river = new THREE.CatmullRomCurve3([[-3.0, -2.75], [-2.0, -1.9], [-0.7, -2.5], [0.6, -1.85], [1.8, -2.6], [2.6, -3.3], [3.5, -3.8]].map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  const rtex = waterTex(false); rtex.repeat.set(1, 1);
  W.add(ribbon(river, 0.95, 0.008, mat(C.sand), 1, (u) => 1 + u * 0.4));
  const rMat = new THREE.MeshStandardMaterial({ map: rtex, roughness: .3 });
  W.add(ribbon(river, 0.62, 0.016, rMat, 12, (u) => 1 + u * 0.5));
  // hồ
  const lake = new THREE.Group(); lake.position.set(3.95, 0, -3.95); lake.rotation.y = Math.PI / 4; W.add(lake);
  const sandL = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.012, 40), mat(C.sand)); sandL.scale.set(1.85, 1, 1.45); lake.add(sandL);
  const ltex = waterTex(false); ltex.repeat.set(4, 1);
  const lakeW = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.02, 40), new THREE.MeshStandardMaterial({ map: ltex, roughness: .3 })); lakeW.scale.set(1.68, 1, 1.28); lakeW.receiveShadow = true; lake.add(lakeW);
  // rừng thông quanh chân núi, tránh núi và lòng sông
  const rr = rng(11), riverPts = river.getSpacedPoints(60);
  for (let i = 0, n = 0; i < 400 && n < 34; i++) {
    const x = -5.6 + rr() * 5.2, z = -5.6 + rr() * 5.2; if (x + z > -3.2) continue;
    if (mts.some(([mx, mz, , r]) => Math.hypot(x - mx, z - mz) < r * 0.95)) continue;
    if (riverPts.some((p) => Math.hypot(x - p.x, z - p.z) < 0.55)) continue;
    W.add(at(get('nature/' + (n % 3 ? 'tree_pineDefaultA' : 'tree_pineTallA')), x, 0, z, rr() * 6, 0.45 + rr() * 0.3)); n++;
  }
  // thác nước từ sườn núi
  const ftex = waterTex(true);
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.72), new THREE.MeshStandardMaterial({ map: ftex, roughness: .3, transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
  fall.position.set(-3.15, 0.36, -2.95); fall.rotation.y = Math.PI / 4; fall.rotation.x = -0.25; W.add(fall);
  const mist = []; for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 1), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .7, depthWrite: false })); W.add(m); mist.push(m); }
  // cầu gỗ qua sông
  [[0.25, 0.6], [0.62, 0.55]].forEach(([u]) => { const p = river.getPointAt(u), tg = river.getTangentAt(u); const br = get('nature/bridge_woodRound'); br.scale.setScalar(0.62); br.position.set(p.x, 0, p.z); br.rotation.y = Math.atan2(tg.x, tg.z) + Math.PI / 2; W.add(br); });
  // --- thuyền ---
  const sail = get('watercraft/boat-sail-a'); sail.scale.setScalar(0.14); W.add(sail);
  const speed = get('watercraft/boat-speed-c'); speed.scale.setScalar(0.11); W.add(speed);
  const tug = get('watercraft/boat-tug-a'); tug.scale.setScalar(0.1); W.add(tug);
  const fish = get('watercraft/boat-fishing-small'); fish.scale.setScalar(0.11); fish.position.set(4.6, 0.01, -4.3); fish.rotation.y = 0.8; W.add(fish);
  const speedWake = []; for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.05, 6), new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: .7, depthWrite: false })); m.rotation.x = -Math.PI / 2; W.add(m); speedWake.push(m); }
  const sHist = [];
  // --- công viên giải trí ---
  const park = coaster(); park.position.set(-3.05, 0, 2.95); park.rotation.y = -Math.PI / 4; W.add(park); updates.push(park.userData.update);
  // --- làng & ruộng & cối xay gió ---
  [[2.0, 5.0, 1, '#ef5a3c', 0.6], [1.2, 4.6, 2, '#2c8ff0', 3.6], [5.0, 2.0, 1, '#8a63e8', 0.9], [4.6, 1.15, 2, '#f7a21b', 2.2], [2.75, 4.05, 1, '#2fb5a3', 1.6]].forEach(([x, z, lv, hex, ry]) => {
    const b = building('suburb', lv, hex); b.scale.multiplyScalar(0.55); b.position.set(x, 0, z); b.rotation.y = ry; W.add(b);
  });
  const mill = get('industrial/windmill'); mill.scale.setScalar(0.62); mill.position.set(5.05, 0, 4.75); mill.rotation.y = -Math.PI * 0.75; W.add(mill);
  const blades = mill.getObjectByName('blades');
  for (const [x, z] of [[3.0, 2.0], [1.95, 3.15]]) W.add(at(get('nature/tree_oak'), x, 0, z, 0, 0.5));
  // --- bãi phóng ---
  const rk = rocket(); rk.position.set(4.4, 0, -0.35); W.add(rk); updates.push(rk.userData.update);
  W.add(at(get('space/satelliteDish_large'), 5.05, 0, 0.9, -2.2, 0.75));
  W.add(at(get('space/satelliteDish_large'), 3.55, 0, -1.35, -1.5, 0.55));
  // --- cây rải rác, đồng cỏ giữa để trống cho xúc xắc ---
  const spots = [[-1.2, -0.6, 'tree_oak'], [1.6, -0.6, 'tree_default'], [-0.6, 0.6, 'tree_fat'], [2.2, 0.4, 'tree_oak'], [-5.2, 1.0, 'tree_default'], [-5.0, -0.6, 'tree_oak'], [0.5, -4.6, 'tree_pineDefaultA'], [1.8, -4.9, 'tree_pineTallA'], [5.2, -2.0, 'tree_palmTall'], [2.6, -5.1, 'tree_palmShort'], [-2.3, 5.3, 'tree_default'], [-0.4, 5.4, 'tree_oak']];
  spots.forEach(([x, z, k], i) => { const sc = k.startsWith('tree_palm') ? 0.55 : 0.5 + (i % 3) * 0.08; W.add(at(get('nature/' + k), x, 0, z, i, sc)); });
  // --- trên trời ---
  const balloons = [balloon('#ef5a3c', '#ffd23a'), balloon('#2c8ff0', '#ffffff'), balloon('#8a63e8', '#7fe3d2')];
  balloons.forEach((b) => W.add(b));
  const ship1 = flyer('craft_speederA', [-9, 3.2, 7], [8, 4.4, -8], 5.4, 16, 0, 0.35);
  const ship2 = flyer('craft_cargoA', [9, 4.6, 4], [-8, 3.8, -7], 5.8, 22, 9, 0.3);
  [ship1, ship2].forEach((s) => { W.add(s); s.userData.trail.forEach((m) => W.add(m)); updates.push(s.userData.update); });

  W.userData.update = (t, dt = 1 / 60) => {
    updates.forEach((f) => f(t, dt));
    rtex.offset.y = -t * 0.18; ltex.offset.x = t * 0.01; ftex.offset.y = t * 0.9;
    mist.forEach((m, i) => { const u = (t * 0.6 + i / mist.length) % 1; m.position.set(-3.05 + Math.cos(i * 2.3) * u * 0.25, 0.03 + u * 0.25, -2.8 + Math.sin(i * 2.3) * u * 0.25); m.scale.setScalar(0.6 + u * 1.4); m.material.opacity = 0.6 * (1 - u); });
    if (blades) blades.rotation.x = t * 1.6;
    // thuyền buồm vòng quanh hồ, ca nô lượn số 8, tàu kéo đi lại trên sông
    { const a = t * 0.22, x = 3.95 + Math.cos(a) * 0.95 * 0.71 - Math.sin(a) * 0.7 * 0.71, z = -3.95 - Math.cos(a) * 0.95 * 0.71 - Math.sin(a) * 0.7 * 0.71; sail.position.set(x, 0.012 + Math.sin(t * 2) * 0.006, z); sail.rotation.y = -a + Math.PI * 0.25; sail.rotation.z = Math.sin(t * 1.3) * 0.06; }
    { const a = t * 0.55, x = 3.95 + Math.sin(a) * 1.05 * 0.71 + Math.sin(2 * a) * 0.4 * 0.71, z = -3.95 - Math.sin(a) * 1.05 * 0.71 + Math.sin(2 * a) * 0.4 * 0.71;
      const prev = speed.position.clone(); speed.position.set(x, 0.015, z); if (prev.distanceTo(speed.position) > 1e-4) speed.lookAt(prev.clone().multiplyScalar(-1).add(speed.position.clone().multiplyScalar(2)));
      sHist.unshift(speed.position.clone()); if (sHist.length > 36) sHist.pop();
      speedWake.forEach((m, i) => { const h = sHist[i * 3]; if (!h) return; m.position.set(h.x, 0.022, h.z); m.scale.setScalar(0.6 + i * 0.12); m.material.opacity = 0.7 * (1 - i / 12); }); }
    { const ph = (t * 0.035) % 2, u = 0.15 + (ph < 1 ? ph : 2 - ph) * 0.72, p = river.getPointAt(u), tg = river.getTangentAt(u); tug.position.set(p.x, 0.016, p.z); tug.rotation.y = Math.atan2(tg.x, tg.z) + (ph < 1 ? 0 : Math.PI); }
    balloons.forEach((b, i) => { const a = t * 0.06 + i * 2.1; b.position.set(Math.cos(a) * (2.2 + i * 0.6) + 0.3, 2.6 + i * 0.45 + Math.sin(t * 0.7 + i) * 0.12, Math.sin(a) * (2.0 + i * 0.5) - 0.6); b.rotation.y = t * 0.1; });
  };
  W.userData.update(0);
  return W;
}

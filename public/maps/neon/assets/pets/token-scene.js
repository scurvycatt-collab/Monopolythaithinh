// T25 v6: cảnh three.js dựng 4 quân cờ cơ khí Lumina-01 (chỉ dùng khi build offline, game không tải file này).
// Gọi từ build-tokens.mjs: renderToken(id, màuChủ) -> dataURL PNG 440x440 nền trong.
// Phong cách: hard-surface — kim loại phản chiếu, đường ghép tấm, bu-lông, khớp, ống xả / động cơ đẩy, dải phát sáng màu chủ.
import * as THREE from 'three';
import { GLTFLoader } from '/vendor/three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from '/vendor/three/addons/geometries/RoundedBoxGeometry.js';

const KIT = '/assets/shared/kenney-space-kit/';
const S = 440, SS = 2; // kích thước đầu ra, siêu lấy mẫu
const ANCHOR_Y = 394; // tâm chân đế (≈197/220; bộ token cũ ≈204, phần chân trước được phép thấp hơn tới ~216)
const EL = THREE.MathUtils.degToRad(33), AZ = THREE.MathUtils.degToRad(45);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(S * SS, S * SS);
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const gltf = new GLTFLoader();
const cache = {};
const kit = async (name) => {
  if (!cache[name]) cache[name] = await gltf.loadAsync(KIT + name + '.glb');
  // model Kenney có dịch gốc ở node cha: đặt lại tâm đáy về (0,0,0)
  const m = cache[name].scene.clone(true), wrap = new THREE.Group();
  wrap.add(m); m.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(m), ctr = bb.getCenter(new THREE.Vector3());
  m.position.sub(new THREE.Vector3(ctr.x, bb.min.y, ctr.z));
  return wrap;
};

// ---------- vật liệu
const C = (h) => new THREE.Color(h);
const metal = (col, rough = 0.3, met = 1, env = 1.6) => new THREE.MeshStandardMaterial({ color: C(col), metalness: met, roughness: rough, envMapIntensity: env });
const paint = (col, rough = 0.35) => new THREE.MeshStandardMaterial({ color: C(col), metalness: 0.55, roughness: rough });
const flat = (m) => { m.flatShading = true; return m; };
const glowMat = (col, k = 2.2) => {
  const m = new THREE.MeshStandardMaterial({ color: C('#000'), emissive: C(col), emissiveIntensity: k, roughness: 0.4 });
  m.userData.glow = col; return m;
};

// ---------- hình học
function put(o, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, parent) {
  o.position.set(x, y, z); o.rotation.set(rx, ry, rz);
  if (parent) parent.add(o);
  return o;
}
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const rbox = (w, h, d, r, m) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), m);
const cyl = (rt, rb, h, m, seg = 20) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
const sph = (r, m, ws = 24, hs = 16) => new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), m);
const UP = new THREE.Vector3(0, 1, 0);
// thanh nối 2 điểm (chân, ống, viền phát sáng)
function rod(a, b, r, m, seg = 10, r2 = r) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const mesh = cyl(r2, r, A.distanceTo(B), m, seg);
  mesh.position.copy(A).add(B).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, B.clone().sub(A).normalize());
  return mesh;
}
// bu-lông lục giác, trục theo pháp tuyến n
function bolt(g, p, n, r = 0.018, m) {
  const b = cyl(r, r, r * 0.8, m, 6);
  b.position.set(...p);
  b.quaternion.setFromUnitVectors(UP, new THREE.Vector3(...n).normalize());
  g.add(b);
  return b;
}
// viền phát sáng theo các cạnh sắc của một mesh (origami)
function edgeGlow(mesh, mat, r = 0.008, angle = 25) {
  mesh.updateMatrixWorld(true);
  const eg = new THREE.EdgesGeometry(mesh.geometry, angle);
  const p = eg.attributes.position, g = new THREE.Group();
  for (let i = 0; i < p.count; i += 2) {
    const a = new THREE.Vector3().fromBufferAttribute(p, i), b = new THREE.Vector3().fromBufferAttribute(p, i + 1);
    g.add(rod(a.toArray(), b.toArray(), r, mat, 5));
  }
  g.position.copy(mesh.position); g.quaternion.copy(mesh.quaternion); g.scale.copy(mesh.scale);
  return g;
}
// lưới tam giác phẳng từ danh sách đỉnh + mặt (tấm kim loại gấp)
function poly(verts, faces, m) {
  const pos = [];
  for (const f of faces) for (let i = 1; i + 1 < f.length; i++) for (const k of [f[0], f[i], f[i + 1]]) pos.push(...verts[k]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, m);
}
const mirrorX = (v) => v.map(([x, y, z]) => [-x, y, z]);

// ================================================================ 1. Vance — siêu xe bay mạ vàng
async function vance(c) {
  const g = new THREE.Group();
  const car = await kit('craft_racer');
  const gold = metal(new THREE.Color(c).lerp(C('#fff1c0'), 0.12).getStyle(), 0.24, 1, 2.1), goldD = metal(new THREE.Color(c).multiplyScalar(0.62).getStyle(), 0.3);
  const black = paint('#121318', 0.22), glass = new THREE.MeshStandardMaterial({ color: C('#05060a'), metalness: 0.9, roughness: 0.06 });
  car.traverse((o) => {
    if (!o.isMesh) return;
    const n = o.material.name;
    o.material = n === 'metalRed' ? gold : n === 'metal' ? black : n === 'metalDark' ? goldD : glass;
  });
  const lift = 0.2;
  put(car, 0, lift, 0, 0, 0, 0, g);
  const glow = glowMat(c, 2.6), white = glowMat('#fff3c8', 3);
  // dải viền vàng phát sáng dọc sườn + đèn pha / đèn hậu
  for (const s of [-1, 1]) {
    put(box(0.12, 0.03, 0.02, white), s * 0.36, lift + 0.2, -0.98, 0, 0, 0, g);
  }
  // dải sáng gầm xe hai bên (underglow) + đường ghép tấm tối dọc nắp
  for (const sx of [-1, 1]) g.add(rod([sx * 0.52, lift + 0.03, -0.72], [sx * 0.52, lift + 0.03, 0.72], 0.014, glow, 6));
  g.add(rod([0, lift + 0.752, -0.2], [0, lift + 0.752, 0.6], 0.006, black, 4));
  // đệm phản trọng lực dưới gầm: vòng kim loại + đĩa sáng
  for (const [x, z] of [[-0.42, 0.62], [0.42, 0.62], [-0.42, -0.62], [0.42, -0.62]]) {
    put(cyl(0.13, 0.15, 0.05, goldD, 24), x, lift - 0.02, z, 0, 0, 0, g);
    put(cyl(0.1, 0.1, 0.02, glow, 24), x, lift - 0.05, z, 0, 0, 0, g);
    const halo = new THREE.Mesh(new THREE.CircleGeometry(0.16, 32), new THREE.MeshBasicMaterial({ color: C(c), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.userData.glowOnly = true;
    put(halo, x, 0.005, z, -Math.PI / 2, 0, 0, g);
  }
  // động cơ đẩy sau: ống phụt + lõi lửa
  for (const s of [-1, 1]) {
    put(cyl(0.11, 0.085, 0.12, goldD, 16), s * 0.3, lift + 0.3, 0.97, Math.PI / 2, 0, 0, g);
    put(cyl(0.065, 0.065, 0.02, white, 16), s * 0.3, lift + 0.3, 1.035, Math.PI / 2, 0, 0, g);
    put(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 20), glow), s * 0.3, lift + 0.3, 1.03, 0, 0, 0, g);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.42, 16, 1, true), glowMat(c, 3));
    put(flame, s * 0.3, lift + 0.3, 1.26, Math.PI / 2, 0, 0, g);
  }
  // bu-lông nắp capo
  for (const s of [-1, 1]) for (const z of [-0.5, -0.3]) bolt(g, [s * 0.2, lift + 0.5, z], [0, 1, -0.3], 0.02, goldD);
  g.rotation.y = -1.75; // mũi xe (-z của model Kenney) hướng phải-trước
  return { g };
}

// ================================================================ 2. Nyx — drone nhện 4 chân
async function nyx(c) {
  const g = new THREE.Group();
  const shell = metal('#4a5466', 0.26), shellL = metal('#8b96aa', 0.22), dark = paint('#0d1018', 0.4), joint = metal('#c5ccd8', 0.18);
  const glow = glowMat(c, 2.6);
  const H = 0.5; // tâm thân
  // thân: bán cầu trên + đĩa giữa + bụng dưới (tiện, có rãnh)
  put(new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), shell), 0, H, 0, 0, 0, 0, g);
  put(cyl(0.36, 0.36, 0.07, shellL, 32), 0, H - 0.02, 0, 0, 0, 0, g);
  put(new THREE.Mesh(new THREE.TorusGeometry(0.362, 0.012, 8, 48), glow), 0, H - 0.02, 0, Math.PI / 2, 0, 0, g);
  put(cyl(0.3, 0.16, 0.16, dark, 24), 0, H - 0.13, 0, 0, 0, 0, g);
  put(cyl(0.1, 0.1, 0.04, glow, 16), 0, H - 0.22, 0, 0, 0, 0, g);
  // đường ghép tấm trên vỏ (rãnh tối) + dải sáng sống lưng
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.343, 0.004, 4, 24, Math.PI / 2), dark);
    put(arc, 0, H, 0, 0, a, 0, g).rotateX(0);
    arc.rotation.set(0, a, Math.PI / 2, 'YXZ');
  }
  // tháp cảm biến (Kenney turret_single) trên lưng
  const tur = await kit('turret_single');
  tur.traverse((o) => { if (o.isMesh) o.material = o.material.name === 'metalRed' ? shellL : o.material.name === 'dark' ? dark : o.material.name === 'metal' ? joint : shell; });
  put(tur, 0, H + 0.27, 0.0, 0, 0, 0, g).scale.setScalar(0.5);
  put(cyl(0.05, 0.05, 0.02, glow, 16), 0, H + 0.42, 0.18, Math.PI / 2, 0, 0, g);
  // cụm mắt trước: 3 thấu kính + 2 nhỏ
  const eyeRing = metal('#1a1f2a', 0.2);
  for (const [x, y, r] of [[0, 0.12, 0.06], [-0.13, 0.08, 0.04], [0.13, 0.08, 0.04], [-0.07, 0.2, 0.025], [0.07, 0.2, 0.025]]) {
    const z = Math.sqrt(Math.max(0, 0.34 * 0.34 - x * x - y * y)) - 0.005;
    const dir = new THREE.Vector3(x, y, z).normalize();
    const ring = cyl(r * 1.35, r * 1.35, 0.03, eyeRing, 20); ring.position.set(x, H + y, z); ring.quaternion.setFromUnitVectors(UP, dir); g.add(ring);
    const lens = sph(r, glow, 16, 12); lens.position.set(x + dir.x * 0.012, H + y + dir.y * 0.012, z + dir.z * 0.012); g.add(lens);
  }
  // bu-lông quanh vành
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + 0.26; bolt(g, [Math.cos(a) * 0.36, H + 0.015, Math.sin(a) * 0.36], [0, 1, 0], 0.016, joint); }
  // 4 chân: khớp hông -> đùi lên -> khớp gối -> cẳng xuống -> mũi chân phát sáng
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const dx = Math.cos(a), dz = Math.sin(a);
    const hip = [dx * 0.33, H - 0.03, dz * 0.33], knee = [dx * 0.52, H + 0.14, dz * 0.52], foot = [dx * 0.64, 0.02, dz * 0.64];
    put(cyl(0.075, 0.075, 0.1, shell, 16), ...hip, 0, 0, 0, g).rotation.set(0, -a, Math.PI / 2);
    put(sph(0.055, joint), ...hip, 0, 0, 0, g);
    g.add(rod(hip, knee, 0.06, shellL, 6));
    g.add(rod([hip[0], hip[1] - 0.05, hip[2]], [knee[0], knee[1] - 0.05, knee[2]], 0.016, dark, 8)); // piston
    put(sph(0.075, joint), ...knee, 0, 0, 0, g);
    put(new THREE.Mesh(new THREE.TorusGeometry(0.076, 0.012, 6, 20), glow), ...knee, 0, -a, 0, g);
    g.add(rod(knee, foot, 0.05, shell, 6, 0.026));
    const mid = knee.map((v, k) => v + (foot[k] - v) * 0.45);
    g.add(rod(knee, mid, 0.064, shellL, 6, 0.064));
    put(sph(0.035, glow), ...foot, 0, 0, 0, g);
  }
  g.rotation.y = 0.3;
  return { g };
}

// ================================================================ 3. Seraphina — hồ ly origami bằng tấm kim loại gấp
async function seraphina(c) {
  const g = new THREE.Group();
  const plate = flat(metal('#8a6a96', 0.24)), plateL = flat(metal('#eadff0', 0.16)), plateD = flat(metal('#2a1830', 0.3));
  const glow = glowMat(c, 2.8), joint = metal('#d8d0dc', 0.2);
  // hồ ly hướng +z (mũi), đuôi -z. Thân: khối bát diện kéo dài, 2 nửa gấp
  const bodyV = [
    [0, 0.78, 0.32], [0, 0.82, -0.3], // sống lưng
    [0.2, 0.6, 0.38], [0.22, 0.62, -0.3], // vai / hông phải
    [0, 0.44, 0.3], [0, 0.46, -0.28], // bụng
    [0, 0.66, 0.5], [0, 0.66, -0.46], // ngực / mông
  ];
  const bodyF = [[0, 1, 3, 2], [2, 3, 5, 4], [6, 0, 2], [6, 2, 4], [7, 3, 1], [7, 5, 3]];
  const bodyR = poly(bodyV, bodyF, plate);
  const bodyL = poly(mirrorX(bodyV), bodyF.map((f) => [...f].reverse()), plateL);
  g.add(bodyR, bodyL, edgeGlow(bodyR, glow, 0.007), edgeGlow(bodyL, glow, 0.007));
  // đầu: chóp tứ diện + mõm nhọn + 2 tai tam giác
  const headV = [[0, 1.02, 0.52], [0.15, 0.86, 0.48], [0, 0.78, 0.48], [0, 0.88, 0.86], [0, 0.95, 0.4]];
  const headF = [[0, 1, 3], [1, 2, 3], [4, 1, 0], [4, 2, 1]];
  const hR = poly(headV, headF, plateL), hL = poly(mirrorX(headV), headF.map((f) => [...f].reverse()), plate);
  g.add(hR, hL, edgeGlow(hR, glow, 0.006), edgeGlow(hL, glow, 0.006));
  for (const s of [-1, 1]) {
    const earV = [[s * 0.05, 0.99, 0.5], [s * 0.15, 0.9, 0.46], [s * 0.15, 1.2, 0.42], [s * 0.1, 0.97, 0.4]];
    const ear = poly(earV, s > 0 ? [[0, 1, 2], [1, 3, 2], [3, 0, 2]] : [[0, 2, 1], [1, 2, 3], [3, 2, 0]], plateD);
    g.add(ear, edgeGlow(ear, glow, 0.006));
    // mắt: khe sáng
    g.add(rod([s * 0.06, 0.92, 0.66], [s * 0.11, 0.9, 0.58], 0.012, glowMat('#ffffff', 2.5), 6));
  }
  put(sph(0.022, plateD), 0, 0.885, 0.87, 0, 0, 0, g);
  // cổ: ống bọc nhiều đốt nối đầu với ngực
  for (let i = 0; i < 3; i++) put(cyl(0.085 - i * 0.008, 0.09 - i * 0.008, 0.05, i % 2 ? plateD : joint, 8), 0, 0.74 + i * 0.05, 0.44 + i * 0.02, 0.35, 0, 0, g);
  // 4 chân cơ khí: khớp vai cầu, đùi tấm gấp, piston, bàn chân móng
  for (const [sx, z, back] of [[1, 0.3, 0], [-1, 0.3, 0], [1, -0.22, 1], [-1, -0.22, 1]]) {
    const x = sx * 0.14;
    put(sph(0.06, joint), x, 0.56, z, 0, 0, 0, g);
    const knee = [x + sx * 0.03, 0.3, z + (back ? -0.08 : 0.06)];
    const foot = [x + sx * 0.03, 0.03, z + (back ? 0.02 : 0.1)];
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.3, 4), plate); thigh.material = plate;
    const A = new THREE.Vector3(x, 0.56, z), K = new THREE.Vector3(...knee);
    thigh.position.copy(A).add(K).multiplyScalar(0.5); thigh.quaternion.setFromUnitVectors(UP, A.clone().sub(K).normalize()); g.add(thigh);
    g.add(edgeGlow(thigh, glow, 0.005, 20));
    put(sph(0.035, joint), ...knee, 0, 0, 0, g);
    g.add(rod(knee, foot, 0.022, plateL, 6));
    put(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.06, 4), plateD), foot[0], 0.03, foot[2] + 0.02, Math.PI / 2, 0, 0, g);
    put(sph(0.016, glow), foot[0], 0.03, foot[2] + 0.06, 0, 0, 0, g);
  }
  // đuôi lớn: chuỗi tấm gấp dạng quạt, cong lên trên-sau, mỗi đốt có khớp
  // đuôi: một khối tấm gấp liền (loft tiết diện thoi theo đường cong), dày ở giữa, nhọn ở chóp
  const path3 = [[0, 0.74, -0.42], [0, 0.8, -0.62], [0, 0.9, -0.84], [0, 1.04, -1.0], [0, 1.2, -1.06], [0, 1.32, -0.98]];
  const wid = [0.07, 0.15, 0.2, 0.19, 0.13, 0.0];
  const tv = [], tf = [];
  path3.forEach((p, i) => {
    const a = new THREE.Vector3(...path3[Math.max(0, i - 1)]), b = new THREE.Vector3(...path3[Math.min(path3.length - 1, i + 1)]);
    const ax = b.sub(a).normalize(), side = new THREE.Vector3(1, 0, 0), up = new THREE.Vector3().crossVectors(ax, side).normalize();
    const P = new THREE.Vector3(...p), w = wid[i];
    for (const d of [side.clone().multiplyScalar(w * 0.8), up.clone().multiplyScalar(w * 1.15), side.clone().multiplyScalar(-w * 0.8), up.clone().multiplyScalar(-w * 0.7)]) tv.push(P.clone().add(d).toArray());
  });
  for (let i = 0; i + 1 < path3.length; i++) for (let k = 0; k < 4; k++) {
    const a0 = i * 4 + k, a1 = i * 4 + ((k + 1) % 4), b0 = a0 + 4, b1 = a1 + 4;
    tf.push([a0, b0, b1, a1]);
  }
  tf.push([3, 2, 1, 0]);
  const tail = poly(tv, tf, plate);
  // tô xen kẽ hai tông bằng cách tách nửa trên sáng
  g.add(tail, edgeGlow(tail, glow, 0.006, 15));
  const prev = path3[path3.length - 1];
  put(new THREE.Mesh(new THREE.OctahedronGeometry(0.06), glow), prev[0], prev[1] + 0.06, prev[2], 0, 0, 0, g);
  // bu-lông dọc sống lưng
  for (const z of [0.2, 0, -0.18]) bolt(g, [0, 0.8 + (0.32 - z) * -0.06 + 0.005, z], [0, 1, 0], 0.016, joint);
  g.rotation.y = Math.PI / 2 - 0.35;
  return { g };
}

// ================================================================ 4. K-9000 — robot máy đánh bạc mini
function reelTexture(c) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
  const x = cv.getContext('2d');
  x.fillStyle = '#041004'; x.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 3; i++) {
    const gx = 12 + i * 80;
    const gr = x.createLinearGradient(0, 8, 0, 120);
    gr.addColorStop(0, '#1d3d08'); gr.addColorStop(0.5, '#e9ffd0'); gr.addColorStop(1, '#1d3d08');
    x.fillStyle = gr; x.fillRect(gx, 10, 72, 108);
    x.fillStyle = c; x.font = 'bold 86px monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = c; x.shadowBlur = 6;
    x.fillStyle = '#2b5200'; x.fillText('7', gx + 36, 68);
  }
  x.strokeStyle = c; x.lineWidth = 3; x.beginPath(); x.moveTo(4, 64); x.lineTo(252, 64); x.globalAlpha = 0.5; x.stroke();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
async function k9000(c) {
  const g = new THREE.Group();
  const body = metal('#3a4048', 0.3), bodyL = metal('#9aa3ad', 0.2), dark = paint('#0e1114', 0.4), chrome = metal('#e6eaef', 0.1);
  const glow = glowMat(c, 2.5);
  // khung gầm: Kenney rover (bánh xích/bánh xe), đổi màu
  const rov = await kit('rover');
  rov.traverse((o) => { if (o.isMesh) o.material = o.material.name === 'metalRed' ? bodyL : o.material.name === 'dark' ? dark : o.material.name === 'metal' ? body : chrome; });
  put(rov, 0, 0, 0, 0, 0, 0, g).scale.setScalar(1.8);
  const B = 0.54; // đáy thân máy
  // thân máy bo góc, mặt trước nghiêng
  put(rbox(0.56, 0.6, 0.42, 0.05, body), 0, B + 0.3, 0, 0, 0, 0, g);
  put(rbox(0.6, 0.06, 0.46, 0.02, bodyL), 0, B + 0.02, 0, 0, 0, 0, g);
  // nóc vòm + đèn báo jackpot
  put(rbox(0.5, 0.1, 0.36, 0.04, bodyL), 0, B + 0.64, 0, 0, 0, 0, g);
  put(cyl(0.07, 0.09, 0.05, chrome, 16), 0, B + 0.71, 0, 0, 0, 0, g);
  put(new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), glow), 0, B + 0.73, 0, 0, 0, 0, g);
  // màn hình 3 cuộn 777 trong hốc
  put(box(0.48, 0.24, 0.04, dark), 0, B + 0.4, 0.2, 0, 0, 0, g);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.2), new THREE.MeshStandardMaterial({ color: C('#000'), emissive: C('#ffffff'), emissiveMap: reelTexture(c), emissiveIntensity: 1.6 }));
  scr.material.userData.glow = c; scr.userData.glowMap = true;
  put(scr, 0, B + 0.4, 0.222, 0, 0, 0, g);
  for (const s of [-1, 1]) put(box(0.012, 0.2, 0.01, chrome), s * 0.07, B + 0.4, 0.224, 0, 0, 0, g);
  // viền màn hình phát sáng
  for (const [a, b] of [[[-0.235, 0.525, 0.225], [0.235, 0.525, 0.225]], [[-0.235, 0.275, 0.225], [0.235, 0.275, 0.225]], [[-0.235, 0.275, 0.225], [-0.235, 0.525, 0.225]], [[0.235, 0.275, 0.225], [0.235, 0.525, 0.225]]]) {
    g.add(rod([a[0], B + a[1] - 0.4 + 0.4, a[2]], [b[0], B + b[1] - 0.4 + 0.4, b[2]], 0.008, glow, 6));
  }
  // bảng điều khiển: khe xu, 3 nút, khay trả thưởng
  put(box(0.5, 0.04, 0.1, bodyL), 0, B + 0.22, 0.24, -0.4, 0, 0, g);
  for (const x of [-0.14, 0, 0.14]) put(cyl(0.025, 0.025, 0.02, x === 0 ? glow : glowMat('#ff3a3a', 2), 12), x, B + 0.245, 0.25, -0.4 + Math.PI / 2 - Math.PI / 2, 0, 0, g);
  put(box(0.08, 0.012, 0.01, dark), 0.18, B + 0.16, 0.215, 0, 0, 0, g);
  put(rbox(0.3, 0.08, 0.06, 0.015, dark), 0, B + 0.08, 0.22, 0, 0, 0, g);
  put(box(0.24, 0.02, 0.02, glow), 0, B + 0.11, 0.25, 0, 0, 0, g);
  // đường ghép tấm hai bên + bu-lông góc
  for (const s of [-1, 1]) {
    put(box(0.004, 0.5, 0.36, dark), s * 0.281, B + 0.32, 0, 0, 0, 0, g);
    g.add(rod([s * 0.282, B + 0.12, -0.15], [s * 0.282, B + 0.52, -0.15], 0.006, glow, 6));
    for (const [y, z] of [[0.08, 0.17], [0.08, -0.17], [0.56, 0.17], [0.56, -0.17]]) bolt(g, [s * 0.284, B + y, z], [s, 0, 0], 0.016, chrome);
  }
  for (const x of [-0.24, 0.24]) for (const y of [0.08, 0.56]) bolt(g, [x, B + y, 0.212], [0, 0, 1], 0.014, chrome);
  // cần gạt bên phải: trục + khớp + quả cầu
  put(cyl(0.05, 0.05, 0.06, bodyL, 16), 0.31, B + 0.35, 0, 0, 0, Math.PI / 2, g);
  put(cyl(0.035, 0.035, 0.03, chrome, 16), 0.35, B + 0.35, 0, 0, 0, Math.PI / 2, g);
  g.add(rod([0.36, B + 0.35, 0], [0.38, B + 0.72, 0.06], 0.017, chrome, 10));
  put(sph(0.055, glow), 0.38, B + 0.75, 0.065, 0, 0, 0, g);
  // ống xả sau + ăng-ten
  for (const s of [-1, 1]) {
    put(cyl(0.035, 0.04, 0.24, chrome, 14), s * 0.16, B + 0.62, -0.2, 0, 0, 0, g);
    put(cyl(0.028, 0.028, 0.01, dark, 14), s * 0.16, B + 0.745, -0.2, 0, 0, 0, g);
  }
  g.add(rod([-0.2, B + 0.68, 0.08], [-0.26, B + 0.92, 0.06], 0.008, chrome, 6));
  put(sph(0.022, glow), -0.26, B + 0.93, 0.06, 0, 0, 0, g);
  g.rotation.y = 0.35;
  return { g };
}

const BUILD = { 'neon-vance': vance, 'neon-nyx': nyx, 'neon-seraphina': seraphina, 'neon-k9000': k9000 };

// ---------- ánh sáng + môi trường phản chiếu
function envMap(c) {
  const sc = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial({ color: C('#2c3248'), side: THREE.BackSide }));
  sc.add(room);
  const panel = (col, k, w, h, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); sc.add(m); };
  panel('#ffffff', 6, 8, 4, -2, 9, 3);
  panel('#ffffff', 3, 3, 8, -9, 3, 6);
  panel('#fff4dc', 2.5, 8, 2, 6, 1, 8);
  panel(c, 3, 4, 10, 9, 2, -6);
  panel(c, 1, 10, 3, 0, -9, 0);
  panel('#8fb0ff', 2.5, 6, 6, 4, 4, 9);
  const pm = new THREE.PMREMGenerator(renderer);
  return pm.fromScene(sc, 0.03).texture;
}

export async function renderToken(id, color) {
  const scene = new THREE.Scene();
  scene.environment = envMap(color);
  const { g } = await BUILD[id](color);
  scene.add(g);
  scene.add(new THREE.HemisphereLight(0xb8c4ff, 0x10121a, 0.5));
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const D = 20;
  cam.position.set(D * Math.sin(AZ) * Math.cos(EL), D * Math.sin(EL), D * Math.cos(AZ) * Math.cos(EL));
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld(true);
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-4, 9, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(new THREE.Color(color), 2.2); rim.position.set(-7, 1.5, -8); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(new THREE.Color(color), 1.2); rim2.position.set(8, 3, -4); scene.add(rim2);

  // khung hình: điểm đáy (0,0,0) -> (220, ANCHOR_Y); vừa trong lề
  g.updateMatrixWorld(true);
  const inv = cam.matrixWorldInverse;
  let s = Infinity;
  const v = new THREE.Vector3();
  g.traverse((o) => {
    if (!o.isMesh || o.userData.glowOnly) return;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
      if (window.DEBUG && (Math.abs(v.x) > 1.2 || v.y > 1.6)) console.log('dinh xa', o.geometry.type, o.parent && o.parent.type, v.x.toFixed(2), v.y.toFixed(2));
      if (v.x > 1e-4) s = Math.min(s, (S / 2 - 18) / v.x);
      if (v.x < -1e-4) s = Math.min(s, (S / 2 - 18) / -v.x);
      if (v.y > 1e-4) s = Math.min(s, (ANCHOR_Y - 34) / v.y);
      if (v.y < -1e-4) s = Math.min(s, (S - ANCHOR_Y - 4) / -v.y);
    }
  });
  if (window.DEBUG) { const bb = new THREE.Box3(); g.traverse((o) => { if (o.isMesh && !o.userData.glowOnly) { const b = new THREE.Box3().setFromObject(o); if (b.max.length() > 3) console.log('xa', o.name, o.parent && o.parent.name, JSON.stringify(b)); } }); console.log('scale', s); }
  cam.left = -S / 2 / s; cam.right = S / 2 / s; cam.top = ANCHOR_Y / s; cam.bottom = -(S - ANCHOR_Y) / s;
  cam.updateProjectionMatrix();

  const grab = () => { const cv = document.createElement('canvas'); cv.width = cv.height = S; cv.getContext('2d').drawImage(renderer.domElement, 0, 0, S, S); return cv; };
  renderer.render(scene, cam);
  const main = grab();
  // lượt phát sáng: chỉ vật liệu emissive, phần còn lại đen để che khuất đúng
  const saved = new Map(), black = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const bg = scene.background; scene.background = null;
  g.traverse((o) => {
    if (!o.isMesh) return;
    saved.set(o, o.material);
    if (o.userData.glowOnly) return;
    if (o.userData.glowMap) o.material = new THREE.MeshBasicMaterial({ map: o.material.emissiveMap });
    else if (o.material.userData && o.material.userData.glow) o.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(o.material.userData.glow) });
    else o.material = black;
  });
  renderer.setClearColor(0x000000, 1);
  renderer.render(scene, cam);
  const glow = grab();
  { // nền đen -> trong suốt: alpha = độ sáng lớn nhất, màu chia lại
    const gx = glow.getContext('2d'), im = gx.getImageData(0, 0, S, S), d = im.data;
    for (let i = 0; i < d.length; i += 4) { const m = Math.max(d[i], d[i + 1], d[i + 2]); if (m) { d[i] = d[i] * 255 / m; d[i + 1] = d[i + 1] * 255 / m; d[i + 2] = d[i + 2] * 255 / m; } d[i + 3] = m; }
    gx.putImageData(im, 0, 0);
  }
  renderer.setClearColor(0x000000, 0);
  saved.forEach((m, o) => { o.material = m; });
  scene.background = bg;

  // ghép: bóng đổ, quầng màu chủ, viền tối, model, bloom
  const out = document.createElement('canvas'); out.width = out.height = S;
  const x = out.getContext('2d');
  const sh = x.createRadialGradient(S / 2, ANCHOR_Y, 0, S / 2, ANCHOR_Y, 1);
  sh.addColorStop(0, 'rgba(0,0,0,.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  x.save(); x.translate(S / 2, ANCHOR_Y); x.scale(150, 30); x.translate(-S / 2, -ANCHOR_Y); x.fillStyle = sh; x.fillRect(0, 0, S, S); x.restore();
  // quầng màu chủ quanh bóng (tách khỏi nền)
  const tint = document.createElement('canvas'); tint.width = tint.height = S;
  const t = tint.getContext('2d'); t.drawImage(main, 0, 0); t.globalCompositeOperation = 'source-in'; t.fillStyle = color; t.fillRect(0, 0, S, S);
  x.globalAlpha = 0.45; x.filter = 'blur(9px)'; x.drawImage(tint, 0, 0); x.filter = 'none'; x.globalAlpha = 1;
  x.globalCompositeOperation = 'lighter'; x.filter = 'blur(12px)'; x.globalAlpha = 0.8; x.drawImage(glow, 0, 0); x.filter = 'none'; x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.filter = 'drop-shadow(0 0 1.2px #04050b) drop-shadow(0 0 1.2px #04050b)'; x.drawImage(main, 0, 0); x.filter = 'none';
  x.globalCompositeOperation = 'lighter'; x.filter = 'blur(3px)'; x.globalAlpha = 0.6; x.drawImage(glow, 0, 0);
  x.filter = 'none'; x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  g.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
  return out.toDataURL('image/png');
}

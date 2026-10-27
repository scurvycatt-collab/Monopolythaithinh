/* Thái Thịnh Monopoly — mô hình cho các ô đặc biệt, cùng phong cách bản "Ngoại ô".
   colosseum()          : đấu trường cho ô Championships (góc), cờ bay + cúp xoay
   beachHouse(lv, hex)  : nhà bãi biển cấp 1..4 = số bãi biển cùng một chủ sở hữu
   worldTour()          : tàu du lịch cho ô World Tour (góc), nhấp nhô, khói, sóng đuôi tàu, hải âu
   Mỗi hàm trả về THREE.Group; nếu có chuyển động thì group.userData.update(t, dt) (t tính bằng giây).
   Quy ước như houses.js: đáy y=0, tâm (0,0), mặt chính nhìn về +z. */
import * as THREE from 'three';
import { get, at, mat, box, cyl, sign, shade } from './houses.js';

export const BEACH_LEVELS = ['Chòi dù', 'Bungalow', 'Villa biển', 'Resort'];
const STONE = '#f1e2c4', STONE2 = '#e3cfa8', STONE3 = '#cbb38a', SAND = '#f3dcaa', WOOD = '#b98556', WOOD2 = '#946541', WHITE = '#fbf8f1', GLASS = '#8fd0f0', POOL = '#5fcbe8';
const PLAYERS = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00acc1'];

// thu theo bề ngang + trần chiều cao (giống fit() trong houses.js nhưng tự chọn khung)
function fitTo(g, foot, maxH) {
  const b = new THREE.Box3().setFromObject(g), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  let k = foot / Math.max(s.x, s.z); if (maxH && s.y * k > maxH) k = maxH / s.y;
  const w = new THREE.Group(); g.position.set(-c.x, -b.min.y, -c.z); w.add(g); w.scale.setScalar(k);
  return w;
}
function shadowAll(g) { g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; }

/* lá cờ vẫy: mặt phẳng chia lưới, sóng chạy dọc theo chiều ngang */
function wavingFlag(hex, w = 0.26, h = 0.16) {
  const geo = new THREE.PlaneGeometry(w, h, 10, 3); geo.translate(w / 2, 0, 0);
  const base = geo.attributes.position.array.slice();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.7, side: THREE.DoubleSide, flatShading: true }));
  m.castShadow = true;
  m.userData.wave = (t, phase = 0) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], k = x / w;
      p.setZ(i, Math.sin(t * 6 + phase - x * 22) * 0.03 * k);
      p.setY(i, base[i * 3 + 1] - k * k * 0.02);
    }
    p.needsUpdate = true; geo.computeVertexNormals();
  };
  return m;
}

/* ===================== ĐẤU TRƯỜNG ===================== */
// một ô tường có vòm cửa: chữ nhật khoét lỗ vòm, đùn dày
function archPanel(w, h, depth, kind) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.closePath();
  if (kind === 'arch') {
    const aw = w * 0.56, ah = h * 0.78, r = aw / 2, hole = new THREE.Path();
    hole.moveTo(-r, h * 0.08); hole.lineTo(r, h * 0.08); hole.lineTo(r, ah - r); hole.absarc(0, ah - r, r, 0, Math.PI, false); hole.lineTo(-r, h * 0.08);
    s.holes.push(hole);
  } else if (kind === 'window') {
    const hole = new THREE.Path(), ww = w * 0.22, wh = h * 0.32, y = h * 0.42;
    hole.moveTo(-ww / 2, y); hole.lineTo(ww / 2, y); hole.lineTo(ww / 2, y + wh); hole.lineTo(-ww / 2, y + wh); hole.closePath(); s.holes.push(hole);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, -depth / 2);
  return g;
}
export function colosseum() {
  const g = new THREE.Group();
  const A = 1.25, B = 1.0, N = 36, TIER = 0.27, DEPTH = 0.08;
  const front = new THREE.Vector2(0, 1);                            // trục dài elip sẽ xoay 45° cho nằm ngang màn hình; +z cục bộ là phía người xem
  const pt = (th, k = 1) => new THREE.Vector3(A * k * Math.cos(th), 0, B * k * Math.sin(th));
  // nền đá
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.04, 0.06, 64), mat(STONE3)); plinth.scale.set(A + 0.12, 1, B + 0.12); plinth.position.y = 0.03; g.add(plinth);
  const plinth2 = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.03, 64), mat(STONE2)); plinth2.scale.set(A + 0.06, 1, B + 0.06); plinth2.position.y = 0.075; g.add(plinth2);
  const Y0 = 0.09;
  // khán đài bậc thang (tiện tròn rồi ép thành elip)
  const prof = []; const R0 = 0.5, R1 = 0.97, steps = 7;
  prof.push(new THREE.Vector2(0.001, 0.0), new THREE.Vector2(R0, 0.0));
  for (let k = 0; k < steps; k++) {
    const r = R0 + (R1 - R0) * (k / steps), r2 = R0 + (R1 - R0) * ((k + 1) / steps), y = 0.06 + k * 0.085;
    prof.push(new THREE.Vector2(r, y), new THREE.Vector2(r2, y));
  }
  prof.push(new THREE.Vector2(R1, 0.06 + steps * 0.085), new THREE.Vector2(R1 + 0.02, 0.0));
  const seats = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), new THREE.MeshStandardMaterial({ color: STONE2, roughness: 0.85, flatShading: true, side: THREE.DoubleSide }));
  seats.scale.set(A, 1, B); seats.position.y = Y0; g.add(seats);
  // các lối vào khán đài (vệt tối)
  for (let k = 0; k < 12; k++) {
    const th = (k / 12) * Math.PI * 2 + 0.13, p = pt(th, 0.78);
    const v = box(0.07, 0.11, 0.04, '#9c8462', p.x, Y0 + 0.3, p.z); v.rotation.y = -th + Math.PI / 2; v.lookAt(0, Y0 + 0.3, 0); g.add(v);
  }
  // sàn đấu
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.05, 48), mat(SAND)); floor.scale.set(A * R0, 1, B * R0); floor.position.y = Y0 + 0.025; g.add(floor);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 64), mat('#ffffff')); ring.rotation.x = Math.PI / 2; ring.scale.set(A * R0 * 0.62, B * R0 * 0.62, 1); ring.position.y = Y0 + 0.055; g.add(ring);
  // bục + cúp vàng xoay
  g.add(cyl(0.11, 0.08, STONE, 0, Y0 + 0.05, 0, 8));
  g.add(cyl(0.08, 0.05, '#e2557f', 0, Y0 + 0.13, 0, 8));
  const cupProf = [[0, 0], [0.07, 0], [0.07, 0.02], [0.025, 0.04], [0.02, 0.11], [0.09, 0.16], [0.11, 0.25], [0.1, 0.27], [0.085, 0.26], [0.001, 0.2]].map(([x, y]) => new THREE.Vector2(x, y));
  const gold = new THREE.MeshStandardMaterial({ color: '#ffc531', roughness: 0.3, metalness: 0.55, flatShading: true });
  const cup = new THREE.Group(); const cm = new THREE.Mesh(new THREE.LatheGeometry(cupProf, 16), gold); cm.castShadow = true; cup.add(cm);
  for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12, Math.PI), gold); h.position.set(sx * 0.1, 0.19, 0); h.rotation.z = sx > 0 ? -Math.PI / 2 : Math.PI / 2; cup.add(h); }
  cup.position.y = Y0 + 0.18; g.add(cup);

  // vòng tường ngoài: 4 tầng ở phía sau, phía trước sụp còn 1–2 tầng để nhìn vào trong (giống đấu trường thật)
  const flags = [];
  const FLAG_SEGS = [20, 23, 26, 27, 30, 33];   // đối xứng qua trục z (i ↔ 35 − i)
  const pts = []; for (let i = 0; i <= N; i++) pts.push(pt((i / N) * Math.PI * 2));
  for (let i = 0; i < N; i++) {
    const p0 = pts[i], p1 = pts[i + 1], mid = p0.clone().add(p1).multiplyScalar(0.5), len = p0.distanceTo(p1) + 0.012;
    const ang = Math.atan2(p1.x - p0.x, p1.z - p0.z) - Math.PI / 2;
    const facing = new THREE.Vector2(mid.x / A, mid.z / B).normalize().dot(front);
    const tiers = facing > 0.62 ? 1 : facing > 0.3 ? 2 : facing > 0.05 ? 3 : 4;
    const seg = new THREE.Group(); seg.position.set(mid.x, Y0, mid.z); seg.rotation.y = ang; g.add(seg);
    for (let t = 0; t < tiers; t++) {
      const kind = t === 3 ? 'window' : 'arch', col = t === 3 ? STONE2 : STONE;
      const m = new THREE.Mesh(archPanel(len, t === 3 ? TIER * 0.8 : TIER, DEPTH, kind), mat(col)); m.position.y = t * TIER; m.castShadow = true; m.receiveShadow = true; seg.add(m);
      // gờ ngang và cột áp giữa các vòm
      seg.add(box(len + 0.004, 0.025, DEPTH + 0.03, STONE3, 0, t * TIER - 0.004, 0));
      seg.add(box(0.025, t === 3 ? TIER * 0.8 : TIER, 0.03, STONE2, len / 2 - 0.006, t * TIER, DEPTH / 2 + 0.008));
    }
    const top = tiers === 4 ? 3 * TIER + TIER * 0.8 : tiers * TIER;
    seg.add(box(len + 0.004, 0.035, DEPTH + 0.035, STONE3, 0, top, 0));
    if (tiers < 4) { // mép gãy bậc thang, đối xứng hai bên
      const side = mid.x >= 0 ? 1 : -1;
      seg.add(box(len * 0.5, 0.08, DEPTH, STONE, -side * len * 0.22, top + 0.03, 0));
    }
    if (FLAG_SEGS.includes(i)) { // cột cờ trên đỉnh tường phía sau
      const pole = cyl(0.008, 0.3, '#eef0f3', 0, top + 0.03, 0, 6); seg.add(pole);
      const f = wavingFlag(PLAYERS[FLAG_SEGS.indexOf(i)], 0.17, 0.1); f.position.set(0.006, top + 0.28, 0); f.rotation.y = Math.PI * 0.2; seg.add(f);
      flags.push(f);
    }
  }
  const turn = new THREE.Group(); turn.rotation.y = Math.PI / 4; turn.add(g);
  const arena = fitTo(turn, 2.6, 1.5);
  // toàn bộ mô hình dựng theo toạ độ ô góc 3.1 × 3.1 (tâm ô ở gốc)
  const out = new THREE.Group();
  const CX = -0.3, CZ = -0.3;                                      // lùi nhẹ về phía sau để chừa chữ CHAMPIONSHIPS
  arena.position.set(CX, 0.02, CZ);
  // sân lát, vòng đường nhựa có vạch đứt, 4 đường nhánh ra mép ô
  const ell = (rx, rz, h, col, y) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, h, 64), mat(col)); m.scale.set(rx, 1, rz); m.position.set(CX, y + h / 2, CZ); m.rotation.y = Math.PI / 4; m.receiveShadow = true; return m; };
  const RX = 1.45, RZ = 1.1;                                         // bán trục vòng đường (theo hướng xoay 45°)
  out.add(ell(RX + 0.1, RZ + 0.1, 0.012, '#eef0f3', 0));              // bó vỉa ngoài
  out.add(ell(RX + 0.07, RZ + 0.07, 0.016, '#b9c2ce', 0));            // mặt đường
  out.add(ell(RX - 0.07, RZ - 0.07, 0.02, '#eef0f3', 0));             // bó vỉa trong
  out.add(ell(RX - 0.1, RZ - 0.1, 0.024, '#efe2c6', 0));              // sân lát quanh chân tường
  for (let k = 0; k < 40; k++) {                                      // vạch đứt giữa đường
    const a = (k / 40) * Math.PI * 2, lx = RX * Math.cos(a), lz = RZ * Math.sin(a);
    const c = Math.cos(Math.PI / 4), sn = Math.sin(Math.PI / 4);
    const d = box(0.05, 0.004, 0.012, '#ffffff', CX + lx * c + lz * sn, 0.016, CZ - lx * sn + lz * c);
    d.rotation.y = Math.PI / 4 - Math.atan2(RZ * Math.cos(a), -RX * Math.sin(a)) + Math.PI / 2; out.add(d);
  }
  const E = 1.52;
  const road = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    const r = new THREE.Group(); r.position.set(mx, 0, mz); r.rotation.y = ang; out.add(r);
    r.add(box(0.2, 0.012, len, '#eef0f3', 0, 0, 0));
    r.add(box(0.16, 0.016, len, '#b9c2ce', 0, 0, 0));
    for (let z = -len / 2 + 0.06; z < len / 2 - 0.04; z += 0.12) r.add(box(0.012, 0.004, 0.05, '#ffffff', 0, 0.016, z + 0.025));
  };
  const rEdge = (dx, dz) => { const t = 1 / Math.sqrt(((dx * Math.cos(Math.PI / 4) - dz * Math.sin(Math.PI / 4)) / RX) ** 2 + ((dx * Math.sin(Math.PI / 4) + dz * Math.cos(Math.PI / 4)) / RZ) ** 2); return t; };
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const r0 = rEdge(dx, dz) + 0.05, x0 = CX + dx * r0, z0 = CZ + dz * r0;
    road(x0, z0, dx ? Math.sign(dx) * E : CX, dz ? Math.sign(dz) * E : CZ);
  }
  // đèn đường hai bên mỗi nhánh
  const lamp = () => { const l = new THREE.Group(); l.add(cyl(0.012, 0.32, '#5b6676', 0, 0, 0, 6)); l.add(box(0.06, 0.012, 0.012, '#5b6676', 0.025, 0.31, 0)); const b = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6), new THREE.MeshStandardMaterial({ color: '#fff2b8', emissive: '#ffd86b', emissiveIntensity: 0.6 })); b.position.set(0.05, 0.29, 0); l.add(b); return l; };
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const s of [-1, 1]) {
    const r0 = rEdge(dx, dz) + 0.3; const x = CX + dx * r0 + (dz ? s * 0.16 : 0), z = CZ + dz * r0 + (dx ? s * 0.16 : 0);
    out.add(at(lamp(), x, 0, z, Math.atan2(-dx, -dz) + Math.PI / 2));
  }
  // cây: một cặp đối xứng hai bên và một hàng phía sau
  for (const [x, z, sc] of [[1.25, -1.25, 1.0], [-1.25, 1.25, 1.0], [-1.42, -1.42, 0.8], [1.38, -0.78, 0.75], [-0.78, 1.38, 0.75]]) out.add(at(get('suburban/tree-small'), x, 0, z, 0, sc));
  out.add(arena);
  const fw = fireworks([[CX - 0.6, CZ + 0.6], [CX + 0.6, CZ - 0.6], [CX - 0.2, CZ - 0.2], [CX - 0.95, CZ + 0.15], [CX + 0.15, CZ - 0.95]]);
  out.add(fw);
  out.userData.update = (t, dt) => {
    cup.rotation.y = t * 0.9;
    flags.forEach((f, k) => f.userData.wave(t, k * 1.7));
    fw.userData.update(t, dt);
  };
  out.userData.update(0);
  out.userData.fullTile = true;
  return out;
}

/* pháo hoa: mỗi quả bay lên kéo vệt rồi nổ thành chùm hạt rơi theo trọng lực */
let dotTex;
function dot() {
  if (dotTex) return dotTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); dotTex = new THREE.CanvasTexture(c); return dotTex;
}
function fireworks(spots) {
  const root = new THREE.Group(), N = 130, PAL = [...PLAYERS, '#ffc531', '#ff6fb5'];
  const shells = spots.map(([x, z], k) => {
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), dir = [];
    for (let i = 0; i < N; i++) { // hướng đều trên mặt cầu
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      dir.push(new THREE.Vector3(r * Math.cos(a), u, r * Math.sin(a)).multiplyScalar(0.75 + Math.random() * 0.25));
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const burst = new THREE.Points(geo, new THREE.PointsMaterial({ size: 7, sizeAttenuation: false, map: dot(), vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.01 }));
    burst.frustumCulled = false; root.add(burst);
    const tpos = new Float32Array(8 * 3), tgeo = new THREE.BufferGeometry(); tgeo.setAttribute('position', new THREE.BufferAttribute(tpos, 3));
    const trail = new THREE.Points(tgeo, new THREE.PointsMaterial({ size: 5, sizeAttenuation: false, map: dot(), color: '#ffe7a8', transparent: true, depthWrite: false }));
    trail.frustumCulled = false; root.add(trail);
    return { x, z, dir, geo, burst, trail, tgeo, period: 3.4 + k * 0.37, offset: k * 0.9, cycle: -1, h: 0, c1: new THREE.Color(), c2: new THREE.Color() };
  });
  const LAUNCH = 0.75, LIFE = 1.9, G = 0.55;
  root.userData.update = (t) => {
    for (const s of shells) {
      const tt = t + s.offset, cyc = Math.floor(tt / s.period), age = tt - cyc * s.period;
      if (cyc !== s.cycle) { // quả mới: đổi màu, độ cao
        s.cycle = cyc; s.h = 1.75 + ((cyc * 7 + s.offset * 13) % 5) * 0.12;
        s.c1.set(PAL[(cyc + Math.round(s.offset * 3)) % PAL.length]); s.c2.set(PAL[(cyc * 3 + 2) % PAL.length]);
        const col = s.geo.attributes.color; for (let i = 0; i < N; i++) { const c = i % 3 ? s.c1 : s.c2; col.setXYZ(i, c.r, c.g, c.b); } col.needsUpdate = true;
      }
      const tp = s.tgeo.attributes.position, bp = s.geo.attributes.position;
      if (age < LAUNCH) { // vệt bay lên
        const u = age / LAUNCH, y = s.h * (1 - (1 - u) ** 2);
        for (let k = 0; k < 8; k++) { const yy = Math.max(0.05, y - k * 0.06); tp.setXYZ(k, s.x, yy, s.z); }
        tp.needsUpdate = true; s.trail.visible = true; s.trail.material.opacity = 1; s.burst.visible = false;
      } else if (age < LAUNCH + LIFE) {
        const a = age - LAUNCH, u = a / LIFE, spread = 0.62 * (1 - Math.exp(-a * 3.2)) / (1 - Math.exp(-3.2 * LIFE));
        for (let i = 0; i < N; i++) { const d = s.dir[i]; bp.setXYZ(i, s.x + d.x * spread, s.h + d.y * spread - G * a * a * 0.5, s.z + d.z * spread); }
        bp.needsUpdate = true; s.burst.visible = true; s.trail.visible = false;
        s.burst.material.opacity = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3;
        s.burst.material.size = 9 * (1 - u * 0.45);
      } else { s.burst.visible = false; s.trail.visible = false; }
    }
  };
  return root;
}

/* ===================== NHÀ BÃI BIỂN ===================== */
function palm(kind = 'tree_palmTall', s = 1, ry = 0) { return at(get('nature/' + kind), 0, 0, 0, ry, s); }
function lounger(towel) {
  const g = new THREE.Group();
  g.add(box(0.1, 0.03, 0.22, WHITE, 0, 0.03, 0));
  const back = box(0.1, 0.02, 0.1, WHITE, 0, 0, 0); back.position.set(0, 0.05, -0.12); back.rotation.x = -0.7; g.add(back);
  g.add(box(0.085, 0.008, 0.16, towel, 0, 0.06, 0.02));
  for (const [x, z] of [[-0.04, 0.09], [0.04, 0.09], [-0.04, -0.07], [0.04, -0.07]]) g.add(box(0.012, 0.03, 0.012, '#c7cdd6', x, 0, z));
  return g;
}
function parasol(hex, s = 1) { return at(get('commercial/detail-parasol-a', hex), 0, 0, 0, 0, s); }
function surfboard(hex) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.22, 4, 10), mat(WHITE)); b.scale.set(1, 1, 0.25); b.position.y = 0.14; b.rotation.z = 0.25; b.castShadow = true; g.add(b);
  const st = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.24, 0.02), mat(hex)); st.position.set(0.0, 0.14, 0.004); st.rotation.z = 0.25; g.add(st);
  return g;
}
function gable(w, d, h, hex) {
  // mái hai dốc dạng lăng trụ, đỉnh chạy theo trục x
  const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }); geo.translate(0, 0, -w / 2); geo.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat(hex)); m.castShadow = true; return m;
}
function tikiHut(hex) {
  const g = new THREE.Group();
  g.add(cyl(0.26, 0.04, WOOD, 0, 0, 0, 10));
  g.add(cyl(0.17, 0.2, '#e9d3a4', 0, 0.04, 0, 10));
  g.add(box(0.09, 0.14, 0.02, WOOD2, 0, 0.04, 0.165));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.24, 10), mat(hex)); roof.position.y = 0.36; roof.castShadow = true; g.add(roof);
  const fringe = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.31, 0.04, 10, 1, true), mat('#e8c27a', { side: THREE.DoubleSide })); fringe.position.y = 0.23; g.add(fringe);
  g.add(cyl(0.012, 0.06, WOOD2, 0, 0.48, 0, 6));
  return g;
}
function bungalow(hex) {
  const g = new THREE.Group();
  // sàn gỗ trên cọc, thò ra phía biển (-z)
  for (const x of [-0.42, 0, 0.42]) for (const z of [-0.36, 0, 0.3]) g.add(cyl(0.022, 0.2, WOOD2, x, 0, z, 6));
  g.add(box(0.98, 0.04, 0.8, WOOD, 0, 0.2, -0.03));
  for (let k = -4; k <= 4; k++) g.add(box(0.004, 0.003, 0.8, WOOD2, k * 0.11, 0.24, -0.03));
  // lan can
  g.add(box(0.98, 0.012, 0.012, WHITE, 0, 0.33, 0.37)); g.add(box(0.012, 0.012, 0.8, WHITE, 0.49, 0.33, -0.03)); g.add(box(0.012, 0.012, 0.8, WHITE, -0.49, 0.33, -0.03));
  for (let k = -4; k <= 4; k++) if (k !== 0) g.add(box(0.01, 0.09, 0.01, WHITE, k * 0.12, 0.24, 0.37));
  // bậc xuống cát
  for (let k = 0; k < 3; k++) g.add(box(0.2, 0.025, 0.08, WOOD, 0, 0.16 - k * 0.07, 0.42 + k * 0.07));
  // nhà
  g.add(box(0.56, 0.3, 0.42, WHITE, -0.05, 0.24, -0.12));
  g.add(box(0.14, 0.2, 0.012, '#7fb6d9', -0.05, 0.24, 0.095));
  for (const x of [-0.25, 0.15]) g.add(box(0.1, 0.1, 0.012, GLASS, x, 0.36, 0.095));
  g.add(box(0.012, 0.1, 0.1, GLASS, 0.226, 0.36, -0.12));
  const r = gable(0.66, 0.54, 0.22, hex); r.position.set(-0.05, 0.54, -0.12); g.add(r);
  g.add(box(0.66, 0.02, 0.54, shade(hex, 0.85), -0.05, 0.53, -0.12));
  g.add(at(lounger(hex), 0.33, 0.24, 0.12, 0.3, 1.1));
  g.add(at(parasol(hex, 0.55), 0.36, 0.24, -0.3));
  return g;
}
function villa(hex) {
  const g = new THREE.Group();
  // sân gỗ và hồ bơi phía trước
  g.add(box(1.25, 0.04, 0.5, '#e9d9bd', 0, 0, 0.3));
  g.add(box(0.62, 0.02, 0.3, POOL, -0.22, 0.03, 0.3));
  g.add(box(0.66, 0.02, 0.02, WHITE, -0.22, 0.04, 0.15)); g.add(box(0.66, 0.02, 0.02, WHITE, -0.22, 0.04, 0.46));
  // tầng trệt kính, tầng trên đúc hẫng, mái phẳng màu chủ
  g.add(box(1.0, 0.3, 0.56, WHITE, 0, 0.04, -0.2));
  g.add(box(0.78, 0.22, 0.012, GLASS, -0.05, 0.08, 0.082));
  for (const x of [-0.31, 0.03]) g.add(box(0.012, 0.22, 0.014, WHITE, x, 0.08, 0.084));
  g.add(box(0.012, 0.18, 0.4, GLASS, 0.506, 0.1, -0.2));
  g.add(box(0.82, 0.28, 0.6, WHITE, 0.14, 0.34, -0.26));
  g.add(box(0.6, 0.16, 0.012, GLASS, 0.14, 0.4, 0.045));
  g.add(box(0.012, 0.16, 0.46, GLASS, 0.556, 0.4, -0.26));
  g.add(box(0.9, 0.05, 0.68, hex, 0.14, 0.62, -0.26));
  g.add(box(0.92, 0.012, 0.012, WHITE, 0.14, 0.4, 0.06));
  // ban công tầng trên lan can kính
  g.add(box(0.62, 0.08, 0.008, '#cdeefa', 0.14, 0.34, 0.072));
  g.add(at(lounger(hex), 0.3, 0.04, 0.32, 0.2, 1)); g.add(at(lounger(hex), 0.48, 0.04, 0.34, 0.2, 1));
  g.add(at(parasol(hex, 0.5), 0.42, 0.04, 0.16));
  return g;
}
function resort(hex) {
  const g = new THREE.Group();
  // khối khách sạn 4 tầng xếp bậc lùi về phía sau, ban công màu chủ
  const W = 1.25, FH = 0.2;
  const tiers = [[0, 0.62, 4], [0.14, 0.48, 3], [0.28, 0.34, 2], [0.42, 0.2, 1]]; // [lùi z, sâu, ...]
  tiers.forEach(([back, d], f) => {
    const y = f * FH, z = -0.28 - back / 2, w = W - f * 0.08;
    g.add(box(w, FH, d, WHITE, 0, y, z));
    const zf = z + d / 2;
    const n = 6 - f;
    for (let k = 0; k < n; k++) {
      const x = (k + 0.5) * (w / n) - w / 2;
      g.add(box(w / n - 0.05, FH * 0.62, 0.01, GLASS, x, y + 0.03, zf + 0.004));
    }
    g.add(box(w + 0.02, 0.025, 0.07, hex, 0, y + FH - 0.012, zf + 0.03));          // gờ ban công màu chủ
    g.add(box(w, 0.05, 0.006, '#d9f2fb', 0, y + FH + 0.013, zf + 0.064));             // lan can kính tầng trên
  });
  const roofY = 4 * FH;
  g.add(box(W - 0.24, 0.03, 0.2, shade(hex, 0.9), 0, roofY, -0.28 - 0.42 / 2));
  const sg = sign('RESORT', hex, 0.62, 0.16, 0.03); g.add(at(sg, 0, roofY + 0.12, -0.38));
  g.add(at(box(0.02, 0.05, 0.02, '#8a94a3'), -0.25, roofY, -0.38)); g.add(at(box(0.02, 0.05, 0.02, '#8a94a3'), 0.25, roofY, -0.38));
  // hồ bơi tự do trước sảnh
  const pool = new THREE.Shape(); pool.moveTo(-0.45, 0); pool.bezierCurveTo(-0.5, 0.2, -0.1, 0.26, 0.05, 0.16); pool.bezierCurveTo(0.2, 0.06, 0.45, 0.22, 0.48, 0.05); pool.bezierCurveTo(0.5, -0.1, -0.4, -0.12, -0.45, 0);
  const pg = new THREE.ExtrudeGeometry(pool, { depth: 0.02, bevelEnabled: false }); pg.rotateX(-Math.PI / 2);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.035, 0.5), mat('#ede0c8')); deck.position.set(0, 0.0175, 0.27); deck.receiveShadow = true; g.add(deck);
  const pm = new THREE.Mesh(pg, mat(POOL)); pm.position.set(0, 0.037, 0.36); g.add(pm);
  for (const x of [-0.5, -0.35, 0.36, 0.52]) g.add(at(lounger(hex), x, 0.035, 0.42, Math.PI, 0.9));
  g.add(at(parasol(hex, 0.5), -0.43, 0.035, 0.5)); g.add(at(parasol(hex, 0.5), 0.44, 0.035, 0.5));
  return g;
}
export function beachHouse(lv, hex) {
  // cây dừa đặt phía sau (−z) và hai bên để không che mặt nhà
  const g = new THREE.Group();
  if (lv === 1) {
    g.add(at(tikiHut(hex), -0.1, 0, -0.08));
    g.add(at(lounger(hex), 0.36, 0, 0.26, -0.3)); g.add(at(lounger(hex), 0.16, 0, 0.4, -0.3));
    g.add(at(parasol(hex, 0.6), 0.48, 0, 0.0));
    g.add(at(surfboard(hex), -0.5, 0, 0.3));
    g.add(at(palm('tree_palmShort', 0.42, 0.6), -0.52, 0, -0.45));
  }
  if (lv === 2) {
    g.add(bungalow(hex));
    g.add(at(get('watercraft/boat-row-small'), -0.66, 0.02, -0.55, 0.9, 0.08));
    g.add(at(palm('tree_palmTall', 0.42, 0.3), 0.62, 0, -0.55));
    g.add(at(surfboard(hex), -0.62, 0, 0.36));
  }
  if (lv === 3) {
    g.add(villa(hex));
    g.add(at(palm('tree_palmTall', 0.45, 0.2), -0.68, 0, -0.5));
    g.add(at(palm('tree_palmBend', 0.4, 2.1), 0.72, 0, -0.55));
  }
  if (lv === 4) {
    g.add(resort(hex));
    g.add(at(palm('tree_palmDetailedTall', 0.42, 0.2), -0.82, 0, -0.45));
    g.add(at(palm('tree_palmTall', 0.46, 1.3), 0.82, 0, -0.5));
    g.add(at(palm('tree_palmBend', 0.36, 2.6), -0.82, 0, 0.42));
  }
  return fitTo(g, 1.46, [0, 0.8, 0.95, 1.15, 1.4][lv]);
}

/* ===================== TÀU WORLD TOUR ===================== */
function iceberg(r, seed) {
  let sd = seed * 97 + 13; const rnd = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280);
  const g = new THREE.Group(), bob = new THREE.Group(); g.add(bob);
  const ice = new THREE.MeshStandardMaterial({ color: '#f4fbff', roughness: 0.55, flatShading: true });
  const blue = new THREE.MeshStandardMaterial({ color: '#bfe6f7', roughness: 0.5, flatShading: true });
  const lump = (rr, h, m, x, z) => {
    const geo = new THREE.IcosahedronGeometry(rr, 0), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 0.75 + rnd() * 0.5; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * h, p.getZ(i) * k); }
    geo.computeVertexNormals();
    const mm = new THREE.Mesh(geo, m); mm.position.set(x, rr * h * 0.15, z); mm.castShadow = true; return mm;
  };
  bob.add(lump(r, 1.3, ice, 0, 0));
  bob.add(lump(r * 0.6, 1.0, blue, r * 0.7, r * 0.3));
  if (r > 0.12) bob.add(lump(r * 0.5, 1.6, ice, -r * 0.5, -r * 0.4));
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * 1.05, r * 1.35, 14), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.006; g.add(ring);
  bob.userData = {}; g.userData.bob = bob; g.userData.ry = rnd() * Math.PI * 2; bob.rotation.y = g.userData.ry;
  return g;
}
export function worldTour() {
  const root = new THREE.Group();
  // thân tàu: mũi tàu (+z của mô hình) hướng về trái màn hình
  const ship = get('watercraft/ship-ocean-liner');
  const sb = new THREE.Box3().setFromObject(ship), sz = sb.getSize(new THREE.Vector3());
  const k = 2.35 / sz.z; ship.scale.setScalar(k);
  const L = sz.z * k, H = sz.y * k;
  const rig = new THREE.Group(); rig.add(ship); root.add(rig);
  const HEADING = -Math.PI * 0.25; rig.rotation.y = HEADING;
  // ống khói: tìm theo các đỉnh cao nhất trên mô hình
  const funnels = [];
  { const tops = []; const v = new THREE.Vector3();
    ship.updateMatrixWorld(true);
    ship.traverse((o) => { if (!o.isMesh) return; const p = o.geometry.attributes.position;
      for (let i = 0; i < p.count; i += 1) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); if (v.y > H * 0.8) tops.push(v.clone()); } });
    tops.sort((a, b) => a.z - b.z);
    let cur = null;
    for (const p of tops) { if (!cur || p.z - cur.z1 > L * 0.05) { cur = { z0: p.z, z1: p.z, x: 0, y: 0, n: 0 }; funnels.push(cur); } cur.z1 = p.z; cur.x += p.x; cur.y = Math.max(cur.y, p.y); cur.n++; }
    funnels.forEach((f) => { f.pos = new THREE.Vector3(f.x / f.n, f.y, (f.z0 + f.z1) / 2); });
  }
  // khói: quả cầu low-poly bay lên, trôi về đuôi tàu, to dần và mờ dần
  const smokeMat = () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0.9, flatShading: true, depthWrite: false });
  const puffs = [];
  for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 1), smokeMat()); m.visible = false; rig.add(m); puffs.push({ m, life: 0, f: i % Math.max(1, funnels.length), born: -i * 0.18 }); }
  // bọt sóng đuôi tàu và hai vệt sóng mũi
  const foamMat = () => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false });
  const foam = [];
  const sternZ = -L / 2, bowZ = L / 2;
  for (let i = 0; i < 34; i++) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.06, 7), foamMat()); m.rotation.x = -Math.PI / 2; m.position.y = 0.012; root.add(m); foam.push({ m, t0: -i * 0.093 }); }
  const bowWaves = [-1, 1].map((s) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.55), foamMat()); m.rotation.x = -Math.PI / 2; root.add(m); return { m, s };
  });
  // hải âu bay vòng
  const gulls = [0, 1, 2].map((i) => {
    const b = new THREE.Group(), wm = mat('#ffffff', { side: THREE.DoubleSide });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.05, 2, 6), mat('#ffffff')); body.rotation.x = Math.PI / 2; b.add(body);
    const wings = [-1, 1].map((s) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.035), wm); w.geometry.translate(0.05 * s, 0, 0); b.add(w); return { w, s }; });
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.02, 4), mat('#ffb02e')); tip.rotation.x = Math.PI / 2; tip.position.z = 0.04; b.add(tip);
    b.castShadow = true; root.add(b); return { b, wings, r: 0.75 + i * 0.22, h: H + 0.25 + i * 0.12, sp: 0.55 + i * 0.12, ph: i * 2.1 };
  });
  // phao cờ nhấp nhô
  const buoy = get('watercraft/buoy-flag'); const bk = 0.42 / new THREE.Box3().setFromObject(buoy).getSize(new THREE.Vector3()).y; buoy.scale.setScalar(bk);
  buoy.position.set(-1.25, 0, 0.2); root.add(buoy);
  // băng trôi nhỏ quanh tàu: khối đa diện méo, phần chìm khuất dưới mặt nước
  const bergs = [[-0.95, -0.85, 0.24, 1], [-0.35, -1.25, 0.14, 2], [-1.3, -0.3, 0.11, 3], [-1.05, 0.85, 0.15, 4], [0.75, -1.2, 0.12, 5], [1.3, -0.1, 0.09, 6]].map(([x, z, r, seed]) => {
    const b = iceberg(r, seed); b.position.set(x, 0, z); root.add(b); return b;
  });
  shadowAll(rig);

  const fwd = new THREE.Vector3(Math.sin(HEADING), 0, Math.cos(HEADING)); // hướng mũi tàu trên mặt nước
  const side = new THREE.Vector3(fwd.z, 0, -fwd.x);
  root.userData.update = (t, dt = 1 / 60) => {
    // nhấp nhô, lắc ngang, chúc mũi
    rig.position.y = 0.02 + Math.sin(t * 1.4) * 0.018;
    rig.rotation.z = Math.sin(t * 0.9) * 0.035;
    rig.rotation.x = Math.sin(t * 1.1 + 1) * 0.015;
    // khói
    for (const p of puffs) {
      const age = t - p.born;
      if (age > 2.6 || age < 0) { if (age > 2.6) p.born = t; continue; }
      const f = funnels[p.f % funnels.length]; if (!f) continue;
      const u = age / 2.6;
      p.m.visible = true;
      p.m.position.set(f.pos.x + Math.sin(age * 3 + p.f) * 0.01, f.pos.y + 0.02 + u * 0.38, f.pos.z - u * 0.5);
      p.m.scale.setScalar(0.5 + u * 1.5);
      p.m.material.opacity = 0.85 * (1 - u) * Math.min(1, age * 4);
    }
    // bọt sóng: sinh ở đuôi, trôi ra sau và tỏa sang hai bên
    for (const f of foam) {
      let age = (t - f.t0) % 3.1; if (age < 0) age += 3.1;
      const u = age / 3.1, spread = (f.t0 * 7.3 % 1) - 0.5;
      const p = fwd.clone().multiplyScalar(sternZ + 0.02 - u * 0.55).add(side.clone().multiplyScalar(spread * (0.1 + u * 0.5)));
      f.m.position.set(p.x, 0.012, p.z);
      f.m.scale.setScalar(0.7 + u * 2); f.m.material.opacity = 0.9 * (1 - u);
    }
    bowWaves.forEach(({ m, s }, i) => {
      const p = fwd.clone().multiplyScalar(bowZ * 0.62).add(side.clone().multiplyScalar(s * 0.17));
      m.position.set(p.x, 0.014, p.z);
      m.rotation.z = HEADING + s * 0.35 + Math.PI;
      m.material.opacity = 0.55 + Math.sin(t * 3 + i) * 0.25;
    });
    // hải âu
    for (const gl of gulls) {
      const a = t * gl.sp + gl.ph;
      gl.b.position.set(Math.cos(a) * gl.r, gl.h + Math.sin(t * 1.3 + gl.ph) * 0.05, Math.sin(a) * gl.r * 0.8);
      gl.b.rotation.y = -a; gl.b.rotation.z = 0.25;
      const flap = Math.sin(t * 9 + gl.ph) * 0.6;
      gl.wings.forEach(({ w, s }) => (w.rotation.z = s * flap));
    }
    buoy.position.y = Math.sin(t * 1.8 + 1) * 0.02; buoy.rotation.z = Math.sin(t * 1.2) * 0.12;
    bergs.forEach((b, k) => { b.userData.bob.position.y = Math.sin(t * 0.8 + k * 1.3) * 0.012; b.userData.bob.rotation.y = b.userData.ry + Math.sin(t * 0.3 + k) * 0.06; });
  };
  root.userData.update(0);
  return root;
}

/* ===================== LOST ISLAND ===================== */
// gò đất đa giác méo: trụ có các đỉnh quanh mép được đẩy ra/vào ngẫu nhiên
function blob(r, h, col, seed, seg = 16, taper = 1.12) {
  let sd = seed * 131 + 7; const rnd = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280);
  const geo = new THREE.CylinderGeometry(r, r * taper, h, seg, 1), p = geo.attributes.position;
  const k = []; for (let i = 0; i <= seg; i++) k.push(0.86 + rnd() * 0.24); k[seg] = k[0];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i); if (Math.hypot(x, z) < 1e-4) continue;
    let a = Math.atan2(z, x); if (a < 0) a += Math.PI * 2; const f = k[Math.round((a / (Math.PI * 2)) * seg) % seg];
    p.setX(i, x * f); p.setZ(i, z * f);
  }
  geo.computeVertexNormals(); geo.translate(0, h / 2, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, flatShading: true })); m.castShadow = true; m.receiveShadow = true;
  return m;
}
function sosStones() { // chữ SOS xếp bằng đá trên cát
  const g = new THREE.Group(), st = mat('#9aa4b1');
  const L = { S: [[1, 0], [2, 0], [0, 1], [1, 2], [2, 3], [0, 4], [1, 4]], O: [[1, 0], [0, 1], [2, 1], [0, 2], [2, 2], [0, 3], [2, 3], [1, 4]] };
  'SOS'.split('').forEach((ch, k) => L[ch].forEach(([x, y]) => {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.022, 0), st); s.position.set(k * 0.13 + x * 0.035, 0.012, y * 0.035); s.castShadow = true; g.add(s);
  }));
  return g;
}
function bottle() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.07, 4, 8), new THREE.MeshStandardMaterial({ color: '#7fd1a7', roughness: 0.2, transparent: true, opacity: 0.85 }));
  b.rotation.z = Math.PI / 2 - 0.35; g.add(b);
  const neck = cyl(0.011, 0.035, '#7fd1a7', 0.055, 0.0, 0, 8); neck.rotation.z = -Math.PI / 2 + 0.35; g.add(neck);
  const paper = box(0.05, 0.016, 0.016, '#fff5d6', -0.005, -0.008, 0); paper.rotation.z = 0.35; g.add(paper);
  return g;
}
function fin() {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.03, 0.09, 0.075, 0.13); s.quadraticCurveTo(0.08, 0.05, 0.12, 0); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false }); geo.translate(-0.06, 0, -0.006);
  const m = new THREE.Mesh(geo, mat('#6f7c8c')); m.castShadow = true; return m;
}
export function lostIsland() {
  const out = new THREE.Group();
  const CX = -0.3, CZ = -0.3;
  const isl = new THREE.Group(); isl.position.set(CX, 0, CZ); isl.rotation.y = Math.PI / 4; isl.scale.setScalar(1.12); out.add(isl);
  // lớp cát ướt, cát khô, bãi cỏ
  const wet = blob(1.18, 0.05, '#e7cf9a', 3, 18, 1.08); wet.scale.set(1, 1, 0.8); isl.add(wet);
  const sand = blob(1.04, 0.1, '#f6dfaa', 5, 16, 1.1); sand.scale.set(1, 1, 0.8); isl.add(sand);
  const grassTop = blob(0.62, 0.07, '#a6dc8c', 9, 12, 1.15); grassTop.scale.set(1, 1, 0.8); grassTop.position.set(-0.12, 0.1, -0.08); isl.add(grassTop);
  // vòng bọt sóng quanh đảo
  const foam = new THREE.Mesh(new THREE.RingGeometry(1.16, 1.32, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false }));
  foam.rotation.x = -Math.PI / 2; foam.scale.set(1, 0.8, 1); foam.position.y = 0.006; isl.add(foam);
  const T = 0.1, G2 = 0.17;            // mặt cát, mặt cỏ
  // vách đá phía sau và đá rải
  isl.add(at(get('nature/stone_tallA'), -0.55, G2 - 0.02, -0.42, 0.4, 0.65));
  isl.add(at(get('nature/rock_largeA'), 0.62, T - 0.02, -0.45, 1.2, 0.45));
  isl.add(at(get('nature/rock_smallA'), 0.85, T - 0.02, 0.05, 0.3, 0.55));
  isl.add(at(get('nature/rock_smallA'), -0.95, T - 0.02, 0.12, 2.0, 0.42));
  // dừa: mỗi cây đung đưa nhẹ
  const palms = [['tree_palmTall', -0.25, -0.35, 0.55, 0.2], ['tree_palmBend', 0.2, -0.38, 0.5, 2.4], ['tree_palmShort', -0.62, 0.08, 0.42, 1.1], ['tree_palmDetailedTall', 0.42, -0.08, 0.42, 0.9]]
    .map(([k, x, z, s, r]) => { const p = palm(k, s, r); p.position.set(x, G2 - 0.01, z); isl.add(p); return p; });
  // trại tạm: lều, đống lửa có lửa nhảy và khói, đống củi, biển gỗ
  isl.add(at(get('nature/tent_smallOpen'), -0.1, G2 - 0.01, 0.0, 0.5, 0.5));
  const fire = new THREE.Group(); fire.position.set(0.26, T, 0.3); isl.add(fire);
  fire.add(at(get('nature/campfire_stones'), 0, 0, 0, 0, 0.42)); fire.add(at(get('nature/campfire_logs'), 0, 0.005, 0, 0.6, 0.42));
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.13, 6), new THREE.MeshStandardMaterial({ color: '#ffb02e', emissive: '#ff7a1a', emissiveIntensity: 0.9, flatShading: true }));
  const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.08, 5), new THREE.MeshStandardMaterial({ color: '#fff1a0', emissive: '#ffd84a', emissiveIntensity: 1, flatShading: true }));
  flame.position.y = 0.07; flame2.position.y = 0.06; fire.add(flame, flame2);
  const smoke = []; for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 1), new THREE.MeshStandardMaterial({ color: '#eef1f4', transparent: true, opacity: 0.8, depthWrite: false })); fire.add(m); smoke.push(m); }
  isl.add(at(get('nature/log_stack'), 0.48, T, 0.42, 0.9, 0.38));
  isl.add(at(get('nature/sign'), -0.42, T, 0.42, -0.4, 0.55));
  const sos = sosStones(); sos.position.set(-0.28, T + 0.002, 0.42); sos.rotation.y = -0.12; isl.add(sos);
  // xác thuyền và hàng trôi dạt
  const wreck = at(get('watercraft/boat-row-small'), 0.95, 0.03, 0.42, 2.4, 0.13); wreck.rotation.z = 0.25; wreck.rotation.x = -0.12; isl.add(wreck);
  isl.add(at(get('platformer/crate'), 0.72, T - 0.01, 0.55, 0.5, 0.2));
  isl.add(at(get('platformer/barrel'), -0.86, T - 0.02, 0.46, 0, 0.2));
  const fallen = at(get('platformer/barrel'), -0.7, T + 0.03, 0.58, 0, 0.18); fallen.rotation.z = Math.PI / 2; isl.add(fallen);
  // chai thư trôi và vây cá mập lượn quanh
  const btl = bottle(); out.add(btl);
  const shark = new THREE.Group(); const f = fin(); shark.add(f);
  const wake = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.22), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false })); wake.rotation.x = -Math.PI / 2; wake.position.set(0, 0.006, -0.12); shark.add(wake);
  out.add(shark);
  out.userData.update = (t) => {
    palms.forEach((p, k) => { p.rotation.z = Math.sin(t * 1.1 + k * 1.7) * 0.035; p.rotation.x = Math.sin(t * 0.8 + k) * 0.02; });
    const fl = 1 + Math.sin(t * 17) * 0.12 + Math.sin(t * 7.3) * 0.1;
    flame.scale.set(1, fl, 1); flame2.scale.set(1, 2 - fl, 1); flame.rotation.y = t * 2;
    smoke.forEach((m, i) => { const u = ((t * 0.45 + i / smoke.length) % 1); m.position.set(Math.sin(u * 6 + i) * 0.03 - u * 0.08, 0.12 + u * 0.55, u * 0.05); m.scale.setScalar(0.6 + u * 1.8); m.material.opacity = 0.75 * (1 - u); });
    foam.scale.set(1 + Math.sin(t * 1.5) * 0.015, 0.8 + Math.sin(t * 1.5) * 0.012, 1); foam.material.opacity = 0.45 + Math.sin(t * 1.5) * 0.15;
    btl.position.set(0.95 + Math.sin(t * 0.25) * 0.1, Math.sin(t * 1.9) * 0.012 + 0.012, 0.65 + Math.cos(t * 0.25) * 0.05); btl.rotation.y = t * 0.3; btl.rotation.z = Math.sin(t * 1.6) * 0.25;
    const a = t * 0.38; shark.position.set(CX + Math.cos(a) * 1.4, Math.sin(t * 2) * 0.008, CZ + Math.sin(a) * 1.25); shark.rotation.y = -a;
  };
  out.userData.update(0);
  return out;
}

/* ===================== Ô CHANCE ===================== */
function questionMark(col = '#f2a33c') {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, emissive: col, emissiveIntensity: 0.15, flatShading: true });
  const curve = new THREE.CatmullRomCurve3([[-0.16, 0.52], [-0.12, 0.64], [0, 0.7], [0.13, 0.64], [0.15, 0.52], [0.06, 0.42], [0, 0.34], [0, 0.24]].map(([x, y]) => new THREE.Vector3(x, y, 0)));
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.05, 10), m); tube.castShadow = true; g.add(tube);
  for (const [x, y] of [[-0.16, 0.52], [0, 0.24]]) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), m); c.position.set(x, y, 0); g.add(c); }
  const dotM = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 10), m); dotM.position.y = 0.08; dotM.castShadow = true; g.add(dotM);
  return g;
}
let cardTex;
function chanceCardMat() {
  if (!cardTex) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 180; const x = c.getContext('2d');
    x.fillStyle = '#fff6e3'; x.fillRect(0, 0, 128, 180); x.strokeStyle = '#f2a33c'; x.lineWidth = 10; x.strokeRect(8, 8, 112, 164);
    x.fillStyle = '#f2a33c'; x.font = '900 110px Rubik, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', 64, 96);
    cardTex = new THREE.CanvasTexture(c); cardTex.colorSpace = THREE.SRGBColorSpace;
  }
  const face = new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.6 }), edge = mat('#f2a33c');
  return [edge, edge, edge, edge, face, face];
}
export function chanceBox() {
  const g = new THREE.Group();
  // bục tròn hai tầng
  g.add(cyl(0.42, 0.06, '#f4e6c8', 0, 0, 0, 20)); g.add(cyl(0.36, 0.06, '#fff6e3', 0, 0.06, 0, 20));
  g.add(cyl(0.365, 0.012, '#f2a33c', 0, 0.105, 0, 20));
  // rương Platformer Kit, nắp mở theo nhịp
  const chest = get('platformer/chest'); chest.scale.setScalar(0.85); chest.position.y = 0.12; g.add(chest);
  const lid = chest.getObjectByName('lid');
  // vầng sáng trong rương
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.06, 0.7, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe17a', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 0.12 + 0.35 + 0.3; g.add(beam);
  // lá bài Chance bay lên, xu và đá quý bật ra
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.25, 0.01), chanceCardMat()); card.castShadow = true; g.add(card);
  const pops = [];
  for (let i = 0; i < 6; i++) { const c = at(get(i === 3 ? 'platformer/jewel' : 'platformer/coin-gold'), 0, 0, 0, 0, i === 3 ? 0.22 : 0.26); g.add(c); pops.push({ c, a: (i / 6) * Math.PI * 2 + 0.3, v: 0.9 + (i % 3) * 0.12 }); }
  // dấu hỏi lơ lửng
  const q = questionMark(); q.scale.setScalar(0.85); g.add(q);
  const P = 4.2;
  g.userData.update = (t) => {
    const u = (t % P);
    const open = u < 0.4 ? 0 : u < 0.8 ? (u - 0.4) / 0.4 : u < 3.2 ? 1 : u < 3.6 ? 1 - (u - 3.2) / 0.4 : 0;
    const e = open * open * (3 - 2 * open);
    if (lid) lid.rotation.x = -1.9 * e;
    beam.material.opacity = 0.35 * e; beam.scale.set(1, 0.6 + 0.4 * e, 1);
    // lá bài: trồi lên, xoay, rồi chui lại
    const cu = u < 0.7 ? 0 : u < 1.6 ? (u - 0.7) / 0.9 : u < 2.8 ? 1 : u < 3.3 ? 1 - (u - 2.8) / 0.5 : 0;
    card.visible = cu > 0.01; card.position.set(0, 0.3 + cu * 0.42, 0.02); card.rotation.y = cu * Math.PI * 2 + (u > 1.6 && u < 2.8 ? Math.sin((u - 1.6) * 3) * 0.3 : 0); card.scale.setScalar(0.6 + 0.4 * cu);
    // xu bật lên theo đường parabol
    pops.forEach((p) => {
      const a = u - 0.85; const vis = a > 0 && a < 1.5; p.c.visible = vis; if (!vis) return;
      const r = a * 0.16, y = 0.32 + p.v * a - 1.2 * a * a;
      p.c.position.set(Math.cos(p.a) * r, Math.max(0.12, y), Math.sin(p.a) * r); p.c.rotation.y = a * 9;
    });
    q.position.set(0, 0.62 + Math.sin(t * 2) * 0.04 + (e * 0.12), 0); q.rotation.y = t * 1.2;
  };
  g.userData.update(0);
  // phóng to cho cân với nhà trên các ô bên cạnh
  const out = new THREE.Group(); g.scale.setScalar(1.5); out.add(g); out.userData.update = g.userData.update;
  return out;
}

/* ===================== Ô START ===================== */
function balloon(hex) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), new THREE.MeshStandardMaterial({ color: hex, roughness: 0.35, flatShading: true })); b.scale.y = 1.2; b.castShadow = true; g.add(b);
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.025, 6), mat(hex)); knot.position.y = -0.09; knot.rotation.x = Math.PI; g.add(knot);
  const str = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.4, 4), mat('#ffffff')); str.position.y = -0.3; g.add(str);
  return g;
}
export function startGate() {
  const out = new THREE.Group();
  // cổng xuất phát đặt giữa ô, lùi về phía sau theo đường chéo và quay mặt về người nhìn,
  // nên không lấn sang ô bên cạnh; chữ START nằm trước cổng
  const arch = new THREE.Group(); arch.position.set(-0.55, 0, -0.55); arch.rotation.y = Math.PI / 4; out.add(arch);
  const gate = get('watercraft/gate-finish');
  const gb = new THREE.Box3().setFromObject(gate).getSize(new THREE.Vector3());
  const k = 1.75 / gb.x; gate.scale.setScalar(k); arch.add(gate);
  const H = gb.y * k;
  const banner = sign('START', '#e2557f', 0.8, 0.2, 0.04); banner.position.set(0, H * 0.62, 0.1); arch.add(banner);
  // cột cờ hai bên cổng, cờ bay ra ngoài
  const flags = [];
  [-1.02, 1.02].forEach((x, i) => {
    arch.add(cyl(0.015, 0.95, '#eef0f3', x, 0, 0, 8));
    arch.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), mat('#ffc23a')), x, 0.97, 0));
    const f = wavingFlag(i ? '#1e88e5' : '#e53935', 0.3, 0.18); f.position.set(x, 0.88, 0); f.rotation.y = i ? 0 : Math.PI; arch.add(f); flags.push(f);
  });
  // chùm bóng bay buộc vào chân cổng
  const balloons = [];
  [-0.8, 0.8].forEach((x, j) => {
    PLAYERS.slice(j * 3, j * 3 + 3).forEach((hex, i) => {
      const b = balloon(hex); b.scale.setScalar(1.5); const base = new THREE.Vector3(x + (i - 1) * 0.12, 1.05 + (i % 2) * 0.16, 0.12 + (i - 1) * 0.05);
      b.position.copy(base); arch.add(b); balloons.push({ b, base, ph: i + j * 3 });
    });
  });
  // hai đống xu thưởng lương hai bên, xu nảy lên
  const coins = [];
  [[1.08, -1.2], [-1.2, 1.08]].forEach(([px, pz], j) => {
    const pile = new THREE.Group(); pile.position.set(px, 0, pz); out.add(pile);
    [[0, 0, 4], [0.14, 0.05, 3], [-0.05, 0.15, 2], [0.12, -0.12, 2]].forEach(([x, z, n]) => {
      for (let i = 0; i < n; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.018, 14), mat('#ffc531', { metalness: 0.3, roughness: 0.35 })); c.position.set(x, 0.01 + i * 0.02, z); c.castShadow = true; pile.add(c); }
    });
    for (let i = 0; i < 2; i++) { const c = at(get('platformer/coin-gold'), 0, 0, 0, 0, 0.32); pile.add(c); coins.push({ c, k: i + j * 2 }); }
  });
  out.userData.update = (t) => {
    flags.forEach((f, k2) => f.userData.wave(t, k2 * 2));
    balloons.forEach(({ b, base, ph }) => { b.position.set(base.x + Math.sin(t * 1.3 + ph) * 0.02, base.y + Math.sin(t * 1.7 + ph) * 0.03, base.z + Math.cos(t * 1.1 + ph) * 0.02); b.rotation.z = Math.sin(t * 1.2 + ph) * 0.12; });
    coins.forEach(({ c, k: i }) => { const u = (t * 0.8 + i * 0.25) % 1; c.position.set(Math.cos(i * 1.6) * 0.05, 0.12 + Math.sin(u * Math.PI) * 0.35, Math.sin(i * 1.6) * 0.05); c.rotation.y = t * 4 + i; });
  };
  out.userData.update(0);
  return out;
}

/* ===================== BĂNG RÔN CỜ LỄ HỘI ===================== */
// Một băng rôn đậm màu căng giữa hai cọc, đặt dọc cạnh sau của ô để không bị công trình che khuất.
export function festivalFlag(mult) {
  const g = new THREE.Group();
  const postX = 0.54, postH = 1.02;
  for (const x of [-postX, postX]) {
    g.add(cyl(0.055, 0.045, '#e9dcc0', x, 0, 0, 12));
    g.add(cyl(0.018, postH, '#fffaf0', x, 0.04, 0, 8));
    g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), mat('#ffc23a', { metalness: 0.3, roughness: 0.35 })), x, postH + 0.07, 0));
  }
  const bannerW = postX * 2 - 0.06, bannerH = 0.3;
  const geo = new THREE.PlaneGeometry(bannerW, bannerH, 16, 4);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / bannerW + 0.5;
    pos.setY(i, pos.getY(i) - Math.sin(u * Math.PI) * 0.055);
  }
  const base = pos.array.slice();
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 160; const c = cv.getContext('2d');
  const grad = c.createLinearGradient(0, 0, 0, cv.height); grad.addColorStop(0, '#ff9a3c'); grad.addColorStop(1, '#ec5f31');
  c.fillStyle = grad; c.fillRect(0, 0, cv.width, cv.height);
  c.strokeStyle = '#ffd45c'; c.lineWidth = 12; c.strokeRect(6, 6, cv.width - 12, cv.height - 12);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 72px Rubik, sans-serif';
  c.fillStyle = 'rgba(116,42,16,.32)'; c.fillText(`LỄ HỘI ×${mult}`, cv.width / 2, cv.height / 2 + 7);
  c.fillStyle = '#ffffff'; c.fillText(`LỄ HỘI ×${mult}`, cv.width / 2, cv.height / 2);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const banner = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, side: THREE.DoubleSide }));
  banner.position.y = 0.83; banner.position.z = 0.012; banner.castShadow = true; g.add(banner);
  // Dây ngang giúp hai đầu băng rôn đọc rõ là đang được căng giữa hai cọc.
  g.add(box(postX * 2, 0.012, 0.012, '#f6e7c8', 0, 0.99, 0));
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData.update = (t) => {
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], u = x / bannerW + 0.5;
      pos.setZ(i, base[i * 3 + 2] + Math.sin(t * 3.5 - x * 9) * 0.018 * Math.sin(u * Math.PI));
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
  };
  g.userData.update(0);
  return g;
}

/* ===================== BIỂU TƯỢNG CHAMPIONSHIPS ===================== */
// Huy hiệu cúp vàng, gắn phẳng lên mặt đất phía dưới dải giá của ô.
// w, h: kích thước mặt nâu còn trống (đơn vị bàn cờ); mặt bảng nhìn về +z, đáy ở y = 0.
export function festivalPlaque(w, h) {
  const PXU = 480, cw = Math.round(w * PXU), ch = Math.round(h * PXU);
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const c = cv.getContext('2d');
  const r = ch * 0.16;
  const bg = c.createLinearGradient(0, 0, 0, ch); bg.addColorStop(0, '#ffdd48'); bg.addColorStop(1, '#eeb512');
  c.fillStyle = bg; c.beginPath(); c.roundRect(0, 0, cw, ch, r); c.fill();
  c.strokeStyle = '#fff3a0'; c.lineWidth = Math.max(5, ch * 0.055); c.beginPath(); c.roundRect(ch * 0.055, ch * 0.055, cw - ch * 0.11, ch - ch * 0.11, r * 0.7); c.stroke();
  // Một cúp lớn ở giữa giống huy hiệu Championships trên cạnh ô trong mẫu.
  const th = ch * 0.78, tw = th * 0.94, tx = (cw - tw) / 2, ty = (ch - th) / 2;
  c.fillStyle = '#9b7900'; c.strokeStyle = '#795c00'; c.lineWidth = Math.max(3, ch * 0.025);
  c.beginPath(); c.moveTo(tx + tw * 0.2, ty); c.lineTo(tx + tw * 0.8, ty); c.quadraticCurveTo(tx + tw * 0.8, ty + th * 0.6, tx + tw / 2, ty + th * 0.64); c.quadraticCurveTo(tx + tw * 0.2, ty + th * 0.6, tx + tw * 0.2, ty); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = '#9b7900'; c.lineWidth = Math.max(4, ch * 0.055);
  c.beginPath(); c.arc(tx + tw * 0.18, ty + th * 0.2, th * 0.15, Math.PI * 0.5, Math.PI * 1.5); c.stroke();
  c.beginPath(); c.arc(tx + tw * 0.82, ty + th * 0.2, th * 0.15, -Math.PI * 0.5, Math.PI * 0.5); c.stroke();
  c.fillRect(tx + tw * 0.43, ty + th * 0.64, tw * 0.14, th * 0.18); c.fillRect(tx + tw * 0.25, ty + th * 0.82, tw * 0.5, th * 0.18);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const face = new THREE.MeshBasicMaterial({ map: tex }), edge = mat('#c68f08');
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), [edge, edge, edge, edge, face, edge]);
  m.position.y = h / 2; m.castShadow = true;
  const g = new THREE.Group(); g.add(m); return g;
}

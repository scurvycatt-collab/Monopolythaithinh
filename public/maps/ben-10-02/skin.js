import { defineSkin } from '../../js/render-common/board2d/skin.js';

const ZONES = [
  { id: 'pyron', ground: '#35180f', ground2: '#591d10', ground3: '#8e2d13', labelText: '#ffffff', particles: 'none' },
  { id: 'galvan', ground: '#132d39', ground2: '#17495d', ground3: '#25758a', labelText: '#ffffff', particles: 'none' },
  { id: 'ledgerdomain', ground: '#241236', ground2: '#3d1b59', ground3: '#65308d', labelText: '#ffffff', particles: 'none' },
  { id: 'terradino', ground: '#123823', ground2: '#195b30', ground3: '#2b7d42', labelText: '#ffffff', particles: 'leaves' },
];

const flat = (color) => (g, c) => { g.fillStyle = color; g.fillRect(0, 0, c.w, c.d); };
function gridPaint(g, c) {
  const grad = g.createLinearGradient(0, 0, c.w, c.d); grad.addColorStop(0, c.palette.ground2); grad.addColorStop(1, c.palette.ground3); g.fillStyle = grad; g.fillRect(0, 0, c.w, c.d);
  g.globalAlpha = .3; g.strokeStyle = '#67ff98'; g.lineWidth = Math.max(2, c.w * .009); const step = c.w / 7;
  for (let x = -c.d; x < c.w + c.d; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + c.d, c.d); g.stroke(); }
  g.globalAlpha = 1;
}

function spaceDeco(p, c) {
  const z = c.gz; p.cyl(-.42, 0, z - .2, .1, .34, '#293a41'); p.ball(-.42, .36, z - .2, .12, '#5cff8b');
  p.cyl(.42, 0, z + .12, .08, .24, '#293a41'); p.ball(.42, .25, z + .12, .09, '#69eaff');
}

function claimBeacon(p, c, color) {
  const z = c.gz; p.ellipseShadow(0, z, .35, .14); p.flatEllipse(0, .03, z, .34, .23, '#06120d'); p.flatEllipse(0, .07, z, .26, .18, color);
  p.cyl(0, .06, z, .055, .42, '#dce9e6'); p.ball(0, .5, z, .1, '#7dff9d');
}
function benStation(p, c) {
  const z = c.gz, lv = c.level, h = .38 + lv * .2; if (!lv) return claimBeacon(p, c, '#5aff78');
  p.ellipseShadow(0, z, .5, .18); p.cyl(0, 0, z, .42 + lv * .045, h, '#1f3430'); p.flatEllipse(0, h, z, .42 + lv * .045, .3, '#5aff78');
  p.flatEllipse(0, h + .025, z, .23, .16, '#07110d'); p.line3([[-.18, h + .04, z], [0, h + .04, z], [-.18, h + .04, z + .12]], '#6aff8d', .055); p.line3([ [.18, h + .04, z], [0, h + .04, z], [.18, h + .04, z + .12]], '#6aff8d', .055);
  for (let i = 0; i < lv + 1; i++) { const a = i * Math.PI * 2 / (lv + 1); p.cyl(Math.cos(a) * .35, .08, z + Math.sin(a) * .24, .045, h * .72, i % 2 ? '#dce9e6' : '#68ff91'); }
  if (lv === 4) { p.flatEllipse(0, h + .55, z, .72, .45, '#52ff7c'); p.flatEllipse(0, h + .57, z, .58, .34, '#06130d'); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; p.line3([[Math.cos(a) * .45, h, z + Math.sin(a) * .3], [Math.cos(a) * .62, h + .53, z + Math.sin(a) * .4]], '#62ff8b', .07); } }
}
function gwenNexus(p, c) {
  const z = c.gz, lv = c.level; if (!lv) return claimBeacon(p, c, '#60eaff'); const r = .42 + lv * .045, h = .3 + lv * .17;
  p.ellipseShadow(0, z, .5, .17); p.cyl(0, 0, z, r, .22, '#243148'); p.flatEllipse(0, .23, z, r, r * .64, '#7a4eda');
  p.cone(0, .18, z, .23 + lv * .025, h, '#7eefff'); p.ball(0, h + .2, z, .11, '#ff79e8');
  for (let i = 0; i < lv + 2; i++) { const a = i * Math.PI * 2 / (lv + 2); const x = Math.cos(a) * r * .8, zz = z + Math.sin(a) * r * .5; p.cyl(x, .18, zz, .035, h * .75, i % 2 ? '#ff70df' : '#62e9ff'); p.ball(x, h * .75 + .2, zz, .06, '#d7fcff'); }
  if (lv === 4) { p.flatEllipse(0, h + .5, z, .72, .42, '#6eefff'); p.flatEllipse(0, h + .52, z, .58, .31, '#291341'); }
}
function kevinForge(p, c) {
  const z = c.gz, lv = c.level; if (!lv) return claimBeacon(p, c, '#aa8cff'); const w = .72 + lv * .08, h = .34 + lv * .19;
  p.ellipseShadow(0, z, .52, .18); p.box(-w / 2, 0, z - .3, w, h, .6, '#252a33', { top: '#48505d', left: '#303640', right: '#1d222a' });
  p.box(-w * .32, h * .33, z + .305, w * .64, .12, .02, '#a985ff', { edge: null }); p.box(-w * .34, .02, z + .307, w * .68, h * .2, .02, '#0b0d11', { edge: null });
  for (let i = 0; i < lv; i++) { const x = -w * .34 + i * (w * .68 / Math.max(1, lv - 1)); p.cyl(x, h, z, .05, .28 + i * .08, '#69717c'); p.ball(x, h + .3 + i * .08, z, .07, '#bd9cff'); }
  if (lv >= 3) p.line3([[-w * .38, h + .08, z], [0, h + .45, z], [w * .38, h + .08, z]], '#8d69da', .08);
  if (lv === 4) { p.box(-.7, h + .48, z - .08, 1.4, .24, .16, '#1e242b', { top: '#58616c' }); p.line3([[-.52, h + .62, z + .09], [.52, h + .62, z + .09]], '#d2c1ff', .065); }
}
function rookCommand(p, c) {
  const z = c.gz, lv = c.level; if (!lv) return claimBeacon(p, c, '#54d9ff'); const w = .64 + lv * .08, h = .36 + lv * .2;
  p.ellipseShadow(0, z, .5, .17); p.box(-w / 2, 0, z - .27, w, h, .54, '#173a55', { top: '#e6edf4', left: '#244e6a', right: '#102a3e' });
  p.box(-w * .34, h * .45, z + .275, w * .68, .13, .02, '#57e7ff', { edge: null }); p.box(-w * .4, h * .72, z - .18, .08, .2, .36, '#d6e0e8'); p.box(w * .32, h * .72, z - .18, .08, .2, .36, '#d6e0e8');
  if (lv >= 2) { p.cyl(0, h, z, .055, .35 + lv * .08, '#dce7ed'); p.flatEllipse(0, h + .4 + lv * .08, z, .3, .18, '#54e3ff'); }
  if (lv === 4) { p.box(-.68, h + .53, z - .08, 1.36, .25, .16, '#12324a', { top: '#66eaff' }); p.line3([[-.5, h + .68, z + .09], [.5, h + .68, z + .09]], '#ffffff', .065); }
}
function spaceHouse(p, c) {
  if (c.pet === 'ben10-02-gwen') return gwenNexus(p, c);
  if (c.pet === 'ben10-02-kevin') return kevinForge(p, c);
  if (c.pet === 'ben10-02-rook') return rookCommand(p, c);
  return benStation(p, c);
}

function portalPad(p, c) { const z = c.gz; p.ellipseShadow(0, z, .48, .17); p.cyl(0, 0, z, .44, .18, '#102b38'); p.flatEllipse(0, .2, z, .38, .26, '#4ee7ff'); p.flatEllipse(0, .22, z, .24, .15, '#07151c'); }
function orbitalOutpost(p, c) { const z = c.gz, n = Math.max(1, c.level || 1); p.cyl(0, 0, z, .34 + n * .035, .28 + n * .11, '#1b4056'); p.flatEllipse(0, .3 + n * .11, z, .36 + n * .035, .24, '#5ce9ff'); for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n; p.ball(Math.cos(a) * .3, .22, z + Math.sin(a) * .2, .08, '#74ff9a'); } }
function startGate(p, c) { const z = c.gz; p.line3([[-.62, 0, z], [-.62, .8, z], [0, 1.18, z], [.62, .8, z], [.62, 0, z]], '#5aff81', .12); p.flatEllipse(0, 1.18, z, .28, .16, '#06120d'); p.textD('X', 0, 1.18, z + .01, .28, '#5aff81'); }
function nullVoid(p, c) { const z = c.gz; p.flatEllipse(0, .04, z, .64, .42, '#251035'); p.flatEllipse(0, .08, z, .48, .3, '#b64cff'); p.flatEllipse(0, .1, z, .32, .2, '#07020b'); for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; p.cone(Math.cos(a) * .5, 0, z + Math.sin(a) * .32, .09, .4, '#7f36aa'); } }
function championship(p) { p.flatEllipse(0, .02, 0, 1.04, .82, '#17231f'); p.flatEllipse(0, .06, 0, .78, .58, '#50ff7d'); for (let i = 0; i < 12; i++) { const a = i * Math.PI * 2 / 12; p.box(Math.cos(a) * .9 - .07, 0, Math.sin(a) * .68 - .07, .14, .38 + (i % 2) * .12, .14, '#35484b', { edge: null }); } p.textD('CUP', 0, .1, .05, .24, '#07110d'); }
function plumberShip(p) { p.ellipseShadow(0, 0, .82, .14); p.flatEllipse(0, .34, 0, .82, .52, '#d8e5ea'); p.flatEllipse(0, .5, 0, .5, .3, '#56e9ff'); p.cyl(0, .15, 0, .18, .28, '#21384b'); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; p.ball(Math.cos(a) * .65, .2, Math.sin(a) * .4, .09, '#5dff89'); } }
function chancePod(p, c) { const z = c.gz; p.cyl(0, 0, z, .25, .35, '#24343b'); p.ball(0, .47, z, .27, '#64ff91'); p.textD('?', 0, .49, z + .01, .34, '#07110d', '#ffffff'); }
function plumberTax(p, c) { const z = c.gz; p.box(-.38, 0, z - .28, .76, .58, .56, '#d7e3e8', { top: '#ffffff', left: '#91a9b5', right: '#b9c8d0' }); p.box(-.31, .36, z + .285, .62, .14, .025, '#17384d', { edge: null }); p.textZ('PLUMBER', 0, .42, z + .31, .095, '#58eaff'); }

function spaceGround(g, c) {
  const grad = g.createRadialGradient(g.canvas.width * .5, g.canvas.height * .46, 10, g.canvas.width * .5, g.canvas.height * .5, g.canvas.width * .72); grad.addColorStop(0, '#0c2d24'); grad.addColorStop(.42, '#071812'); grad.addColorStop(1, '#020711'); g.fillStyle = grad; g.fillRect(0, 0, g.canvas.width, g.canvas.height);
  let seed = 173; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280); for (let i = 0; i < 180; i++) { const x = rnd() * g.canvas.width, y = rnd() * g.canvas.height, r = .6 + rnd() * 1.7; g.globalAlpha = .3 + rnd() * .7; g.fillStyle = i % 7 ? '#dff7ff' : '#64ff9b'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = .42; g.strokeStyle = '#39ff75'; g.lineWidth = 4; const C = c.T(0, 0); for (let r = 1; r <= 4; r++) { g.beginPath(); g.arc(C[0], C[1], r * 64, 0, Math.PI * 2); g.stroke(); }
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, a0 = c.T(Math.cos(a) * 1.1, Math.sin(a) * 1.1), a1 = c.T(Math.cos(a) * 6.1, Math.sin(a) * 6.1); g.beginPath(); g.moveTo(...a0); g.lineTo(...a1); g.stroke(); } g.globalAlpha = 1;
}
function spaceBiomes(pen, c) {
  const add = (u, v, fn, d = 0) => { const [x, z] = c.toWorld(u, v); c.add(x, z, (p) => fn(p, x, z), d); };
  const landmark = (name, h) => (p, x, z) => p.img(name, x, z, h);
  if (c.zone.id === 'pyron') {
    add(-1.72, 3.5, landmark('volcanic', 3.8), .25);
    add(1.58, 4.65, landmark('forge', 3.0), .1);
  } else if (c.zone.id === 'galvan') {
    add(-1.72, 3.5, landmark('crystal', 3.8), .25);
    add(1.58, 4.65, landmark('metropolis', 3.0), .1);
  } else if (c.zone.id === 'ledgerdomain') {
    add(-1.72, 3.5, landmark('ledger', 3.8), .25);
    add(1.58, 4.65, landmark('neon', 3.0), .1);
  } else {
    add(-1.72, 3.5, landmark('jungle', 3.8), .25);
    add(1.58, 4.65, landmark('dome', 3.0), .1);
  }
}
function omnitrixCore(p) { p.ellipseShadow(0, 0, 1.45, .2); p.cyl(0, 0, 0, 1.28, .18, '#111a19'); p.flatEllipse(0, .18, 0, 1.15, .84, '#2cff6d'); p.cyl(0, .19, 0, .66, .42, '#3e4b49'); p.flatEllipse(0, .63, 0, .61, .45, '#5aff83'); p.flatEllipse(0, .66, 0, .42, .31, '#06120d'); p.poly([[-.36, .68, -.22], [0, .68, 0], [-.36, .68, .22]], '#62ff8c'); p.poly([[.36, .68, -.22], [0, .68, 0], [.36, .68, .22]], '#62ff8c'); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; p.line3([[Math.cos(a) * .75, .12, Math.sin(a) * .75], [Math.cos(a) * 2.1, .02, Math.sin(a) * 2.1]], '#2dff6d', .055); } }
function orbitFx(p, t) { for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + t * .28, r = 1.05 + .16 * Math.sin(t * 1.7 + i); p.disc(Math.cos(a) * r, .78 + .06 * Math.sin(t * 2.4 + i), Math.sin(a) * r, .03, i % 3 ? '#58ff89' : '#70edff', .85); } }

export default defineSkin({
  id: 'ben-10-02', packs: [], cityLabelBand: .18,
  sprites: {
    volcanic: 'assets/landmarks/volcanic.png', forge: 'assets/landmarks/forge.png',
    crystal: 'assets/landmarks/crystal.png', metropolis: 'assets/landmarks/metropolis.png',
    ledger: 'assets/landmarks/ledger.png', neon: 'assets/landmarks/neon.png',
    jungle: 'assets/landmarks/jungle.png', dome: 'assets/landmarks/dome.png',
  },
  palette: { groups: { A: '#ff7a24', B: '#ff3d62', C: '#f4df38', D: '#72e4e6', E: '#36b9ef', F: '#8359e8', G: '#ba3ee4', H: '#3ae46b' }, ground: '#101c1a', ground2: '#152825', ground3: '#1b3630', priceStrip: '#0a1714', priceText: '#baffcd', labelText: '#ffffff', labelShadow: '#020711', boardSide: '#16201f', boardSideDark: '#050a0b', boardTop: '#24322f', tileSide: '#273a36', tileSideDark: '#111d1a', water: '#173b59', sand: '#1d5b75', resortBand: '#45ff7c' },
  zones: ZONES,
  slots: {
    tile: { paint: gridPaint }, deco: { draw: spaceDeco }, house: { draw: spaceHouse }, resort: { paint: flat('#11384c'), draw: portalPad }, resortHouse: { draw: orbitalOutpost },
    start: { paint: flat('#0b4e29'), label: [.62, .65, 58, .82], draw: startGate }, island: { paint: flat('#35174d'), side: ['#29113b', '#15091f'], label: [.7, .8, 31, .56], draw: nullVoid },
    festival: { paint: flat('#133622'), draw: championship }, tour: { paint: flat('#17435a'), draw: plumberShip }, chance: { paint: flat('#d7e6db'), draw: chancePod }, tax: { paint: flat('#d7e6db'), draw: plumberTax },
    base: { draw: (p, c) => { const a = c.half + c.margin - .08, y = c.y + .002; p.line3([[-a, y, a], [a, y, a], [a, y, -a], [-a, y, -a], [-a, y, a]], '#42ff7b', .07); } }, center: { paint: spaceGround, draw: spaceBiomes, core: omnitrixCore },
  },
  ambient: { animate: { orbit: orbitFx } },
  labels: { start: 'OMNITRIX START', island: 'NULL VOID', festival: 'CHAMPIONSHIP', tour: 'PLUMBER TOUR', resortLevels: ['Cổng dịch chuyển', 'Vệ tinh', 'Trạm quỹ đạo', 'Pháo đài thiên hà'] },
});

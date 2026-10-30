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

function decorImageName(c) {
  const group = String(c.group || 'A').toUpperCase();
  return `m4Decor${/^[A-H]$/.test(group) ? group : 'A'}`;
}
function spaceDeco(p, c) {
  const x = c.seed % 2 ? -.32 : .32;
  p.img(decorImageName(c), x, c.gz - .32, 1.4);
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
  if (c.pet === 'ben10-02-ben') return p.img(`m4BuildingBen${c.level}`, 0, c.gz, 1.6);
  if (c.pet === 'ben10-02-gwen') return p.img(`m4BuildingGwen${c.level}`, 0, c.gz, 1.6);
  if (c.pet === 'ben10-02-kevin') return p.img(`m4BuildingKevin${c.level}`, 0, c.gz, 1.6);
  if (c.pet === 'ben10-02-rook') return p.img(`m4BuildingRook${c.level}`, 0, c.gz, 1.6);
  return benStation(p, c);
}

function resortImageName(c) { return `m4Resort${Math.max(0, Math.min(4, Number(c.level) || 0))}`; }
function resortImage(p, c) { p.img(resortImageName(c), 0, c.gz, 1.6); }
function startGate(p, c) { const z = c.gz; p.line3([[-.62, 0, z], [-.62, .8, z], [0, 1.18, z], [.62, .8, z], [.62, 0, z]], '#5aff81', .12); p.flatEllipse(0, 1.18, z, .28, .16, '#06120d'); p.textD('X', 0, 1.18, z + .01, .28, '#5aff81'); }
function nullVoid(p, c) { const z = c.gz; p.flatEllipse(0, .04, z, .64, .42, '#251035'); p.flatEllipse(0, .08, z, .48, .3, '#b64cff'); p.flatEllipse(0, .1, z, .32, .2, '#07020b'); for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; p.cone(Math.cos(a) * .5, 0, z + Math.sin(a) * .32, .09, .4, '#7f36aa'); } }
function championship(p) { p.flatEllipse(0, .02, 0, 1.04, .82, '#17231f'); p.flatEllipse(0, .06, 0, .78, .58, '#50ff7d'); for (let i = 0; i < 12; i++) { const a = i * Math.PI * 2 / 12; p.box(Math.cos(a) * .9 - .07, 0, Math.sin(a) * .68 - .07, .14, .38 + (i % 2) * .12, .14, '#35484b', { edge: null }); } p.textD('CUP', 0, .1, .05, .24, '#07110d'); }
function plumberShip(p) { p.ellipseShadow(0, 0, .82, .14); p.flatEllipse(0, .34, 0, .82, .52, '#d8e5ea'); p.flatEllipse(0, .5, 0, .5, .3, '#56e9ff'); p.cyl(0, .15, 0, .18, .28, '#21384b'); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; p.ball(Math.cos(a) * .65, .2, Math.sin(a) * .4, .09, '#5dff89'); } }
function chancePod(p, c) { const z = c.gz; p.cyl(0, 0, z, .25, .35, '#24343b'); p.ball(0, .47, z, .27, '#64ff91'); p.textD('?', 0, .49, z + .01, .34, '#07110d', '#ffffff'); }
function plumberTax(p, c) { const z = c.gz; p.box(-.38, 0, z - .28, .76, .58, .56, '#d7e3e8', { top: '#ffffff', left: '#91a9b5', right: '#b9c8d0' }); p.box(-.31, .36, z + .285, .62, .14, .025, '#17384d', { edge: null }); p.textZ('PLUMBER', 0, .42, z + .31, .095, '#58eaff'); }

const specialCorner = (name, scale) => (p) => p.img(name, 0, 0, scale);
function specialChance(p, c) {
  const name = c.tile === 20 ? 'm4SpecialChance2' : c.tile === 28 ? 'm4SpecialChance3' : 'm4SpecialChance1';
  p.img(name, 0, c.gz, name === 'm4SpecialChance1' ? 1.4 : name === 'm4SpecialChance2' ? 1.5 : 1.42);
}
function specialTax(p, c) { p.img('m4SpecialTax', 0, c.gz, 1.55); }
function specialFestival(p, c) {
  p.img('m4SpecialFestival', 0, c.gz, 1.7);
  p.textZ(`×${c.level || 2}`, 0, .74, c.gz + .05, .18, '#ffffff', 'rgba(0,0,0,.45)');
}
function specialOutage(p, c) {
  p.img('m4SpecialOutage', 0, c.gz, 1.45);
  p.textZ(String(c.level || 1), -.38, .9, c.gz + .06, .2, '#ffffff', 'rgba(0,0,0,.55)');
}

function spaceGround(g, c) {
  const grad = g.createRadialGradient(g.canvas.width * .5, g.canvas.height * .46, 10, g.canvas.width * .5, g.canvas.height * .5, g.canvas.width * .72); grad.addColorStop(0, '#0c2d24'); grad.addColorStop(.42, '#071812'); grad.addColorStop(1, '#020711'); g.fillStyle = grad; g.fillRect(0, 0, g.canvas.width, g.canvas.height);
  let seed = 173; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280); for (let i = 0; i < 180; i++) { const x = rnd() * g.canvas.width, y = rnd() * g.canvas.height, r = .6 + rnd() * 1.7; g.globalAlpha = .3 + rnd() * .7; g.fillStyle = i % 7 ? '#dff7ff' : '#64ff9b'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = .42; g.strokeStyle = '#39ff75'; g.lineWidth = 4; const C = c.T(0, 0); for (let r = 1; r <= 4; r++) { g.beginPath(); g.arc(C[0], C[1], r * 64, 0, Math.PI * 2); g.stroke(); }
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, a0 = c.T(Math.cos(a) * 1.1, Math.sin(a) * 1.1), a1 = c.T(Math.cos(a) * 6.1, Math.sin(a) * 6.1); g.beginPath(); g.moveTo(...a0); g.lineTo(...a1); g.stroke(); } g.globalAlpha = 1;
}
function spaceBiomes(pen, c) {
  const add = (u, v, fn, d = 0) => { const [x, z] = c.toWorld(u, v); c.add(x, z, (p) => fn(p, x, z), d); };
  const landmark = (name, h) => (p, x, z) => p.img(name, x, z, h);
  const outer = (farName, nearName, farScale = 2.8, nearScale = 2.45) => {
    add(-2.25, 5.5, landmark(farName, farScale), .25);
    add(2.25, 5.5, landmark(nearName, nearScale), .1);
  };
  if (c.zone.id === 'pyron') {
    // Reference lower/left arc: crystal city then jungle nearest Omnitrix Start.
    outer('m4CrystalCitadel', 'm4JungleDomain', 2.85, 2.6);
  } else if (c.zone.id === 'galvan') {
    // Reference left/upper-left arc: neon city above the lava world.
    outer('m4NeonCity', 'm4PyronVolcano', 2.55, 2.75);
  } else if (c.zone.id === 'ledgerdomain') {
    // Reference upper/right arc: technology metropolis then red desert fortress.
    outer('m4TechMetropolis', 'm4DesertFortress', 2.55, 2.55);
  } else {
    // Reference right/lower-right arc: blue domes then Null Void castle.
    outer('m4BlueDomes', 'm4PurpleCastle', 2.5, 2.7);
  }
}
function omnitrixCore(p) {
  p.img('m4MountRushmore', -2.85, -2.85, 3.05, .015);
  p.img('m4AlienRing', 0, -.1, 4.35, .02);
  p.img('m4CenterOmnitrix', 0, 0, 3.7, .04);
  p.img('m4CardPadCharge', -2.55, .3, 1.55, .03);
  p.img('m4CardPadPlumber', 2.55, .3, 1.55, .03);
  p.img('m4CenterProps', -.05, 2.3, 2.25, .025);
  p.img('m4DicePad', 2.55, 3.25, 1.8, .03);
}
function orbitFx(p, t) { for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + t * .28, r = 1.05 + .16 * Math.sin(t * 1.7 + i); p.disc(Math.cos(a) * r, .78 + .06 * Math.sin(t * 2.4 + i), Math.sin(a) * r, .03, i % 3 ? '#58ff89' : '#70edff', .85); } }

export default defineSkin({
  id: 'ben-10-02', packs: [], cityLabelBand: .18,
  sprites: {
    m4BoardBase: 'assets/v2/board/m4-board-base.webp',
    m4CenterOmnitrix: 'assets/v2/board/m4-center-omnitrix.webp',
    m4AlienRing: 'assets/v2/board/m4-alien-ring.webp',
    m4MountRushmore: 'assets/v2/board/m4-mount-rushmore.webp',
    m4PyronVolcano: 'assets/v2/board/m4-pyron-volcano.webp',
    m4NeonCity: 'assets/v2/board/m4-neon-city.webp',
    m4CrystalCitadel: 'assets/v2/board/m4-crystal-citadel.webp',
    m4TechMetropolis: 'assets/v2/board/m4-tech-metropolis.webp',
    m4DesertFortress: 'assets/v2/board/m4-desert-fortress.webp',
    m4BlueDomes: 'assets/v2/board/m4-blue-domes.webp',
    m4PurpleCastle: 'assets/v2/board/m4-purple-castle.webp',
    m4JungleDomain: 'assets/v2/board/m4-jungle-domain.webp',
    m4CardPadCharge: 'assets/v2/board/m4-card-pad-charge.webp',
    m4CardPadPlumber: 'assets/v2/board/m4-card-pad-plumber.webp',
    m4DicePad: 'assets/v2/board/m4-dice-pad.webp',
    m4CenterProps: 'assets/v2/board/m4-center-props.webp',
    m4SpecialStart: 'assets/v2/special/m4-special-start.webp',
    m4SpecialNullVoid: 'assets/v2/special/m4-special-null-void.webp',
    m4SpecialChampionship: 'assets/v2/special/m4-special-championship.webp',
    m4SpecialTour: 'assets/v2/special/m4-special-tour.webp',
    m4SpecialChance1: 'assets/v2/special/m4-special-chance-1.webp',
    m4SpecialChance2: 'assets/v2/special/m4-special-chance-2.webp',
    m4SpecialChance3: 'assets/v2/special/m4-special-chance-3.webp',
    m4SpecialTax: 'assets/v2/special/m4-special-tax.webp',
    m4SpecialFestival: 'assets/v2/special/m4-special-festival.webp',
    m4SpecialOutage: 'assets/v2/special/m4-special-outage.webp',
    m4BuildingBen0: 'assets/v2/buildings/m4-building-ben-0.webp',
    m4BuildingBen1: 'assets/v2/buildings/m4-building-ben-1.webp',
    m4BuildingBen2: 'assets/v2/buildings/m4-building-ben-2.webp',
    m4BuildingBen3: 'assets/v2/buildings/m4-building-ben-3.webp',
    m4BuildingBen4: 'assets/v2/buildings/m4-building-ben-4.webp',
    m4BuildingGwen0: 'assets/v2/buildings/m4-building-gwen-0.webp',
    m4BuildingGwen1: 'assets/v2/buildings/m4-building-gwen-1.webp',
    m4BuildingGwen2: 'assets/v2/buildings/m4-building-gwen-2.webp',
    m4BuildingGwen3: 'assets/v2/buildings/m4-building-gwen-3.webp',
    m4BuildingGwen4: 'assets/v2/buildings/m4-building-gwen-4.webp',
    m4BuildingKevin0: 'assets/v2/buildings/m4-building-kevin-0.webp',
    m4BuildingKevin1: 'assets/v2/buildings/m4-building-kevin-1.webp',
    m4BuildingKevin2: 'assets/v2/buildings/m4-building-kevin-2.webp',
    m4BuildingKevin3: 'assets/v2/buildings/m4-building-kevin-3.webp',
    m4BuildingKevin4: 'assets/v2/buildings/m4-building-kevin-4.webp',
    m4BuildingRook0: 'assets/v2/buildings/m4-building-rook-0.webp',
    m4BuildingRook1: 'assets/v2/buildings/m4-building-rook-1.webp',
    m4BuildingRook2: 'assets/v2/buildings/m4-building-rook-2.webp',
    m4BuildingRook3: 'assets/v2/buildings/m4-building-rook-3.webp',
    m4BuildingRook4: 'assets/v2/buildings/m4-building-rook-4.webp',
    m4Resort0: 'assets/v2/resorts/m4-resort-0.webp',
    m4Resort1: 'assets/v2/resorts/m4-resort-1.webp',
    m4Resort2: 'assets/v2/resorts/m4-resort-2.webp',
    m4Resort3: 'assets/v2/resorts/m4-resort-3.webp',
    m4Resort4: 'assets/v2/resorts/m4-resort-4.webp',
    m4DecorA: 'assets/v2/decor/m4-decor-a.webp',
    m4DecorB: 'assets/v2/decor/m4-decor-b.webp',
    m4DecorC: 'assets/v2/decor/m4-decor-c.webp',
    m4DecorD: 'assets/v2/decor/m4-decor-d.webp',
    m4DecorE: 'assets/v2/decor/m4-decor-e.webp',
    m4DecorF: 'assets/v2/decor/m4-decor-f.webp',
    m4DecorG: 'assets/v2/decor/m4-decor-g.webp',
    m4DecorH: 'assets/v2/decor/m4-decor-h.webp',
  },
  spriteMeta: {
    m4BoardBase: { anchor: [.5, .9375] }, m4CenterOmnitrix: { anchor: [.5, .9375] },
    m4AlienRing: { anchor: [.5, .9375] }, m4MountRushmore: { anchor: [.5, .9375] },
    m4PyronVolcano: { anchor: [.5, .9375] }, m4NeonCity: { anchor: [.5, .9375] },
    m4CrystalCitadel: { anchor: [.5, .9375] }, m4TechMetropolis: { anchor: [.5, .9375] },
    m4DesertFortress: { anchor: [.5, .9375] }, m4BlueDomes: { anchor: [.5, .9375] },
    m4PurpleCastle: { anchor: [.5, .9375] }, m4JungleDomain: { anchor: [.5, .9375] },
    m4CardPadCharge: { anchor: [.5, .9375] }, m4CardPadPlumber: { anchor: [.5, .9375] },
    m4DicePad: { anchor: [.5, .9375] }, m4CenterProps: { anchor: [.5, .9375] },
    m4SpecialStart: { anchor: [.5, .9375] }, m4SpecialNullVoid: { anchor: [.5, .9375] },
    m4SpecialChampionship: { anchor: [.5, .9375] }, m4SpecialTour: { anchor: [.5, .9375] },
    m4SpecialChance1: { anchor: [.5, .9375] }, m4SpecialChance2: { anchor: [.5, .9375] },
    m4SpecialChance3: { anchor: [.5, .9375] }, m4SpecialTax: { anchor: [.5, .9375] },
    m4SpecialFestival: { anchor: [.5, .9375], lazy: true }, m4SpecialOutage: { anchor: [.5, .9375], lazy: true },
    m4BuildingBen0: { anchor: [.5, .9375], lazy: true }, m4BuildingBen1: { anchor: [.5, .9375], lazy: true },
    m4BuildingBen2: { anchor: [.5, .9375], lazy: true }, m4BuildingBen3: { anchor: [.5, .9375], lazy: true },
    m4BuildingBen4: { anchor: [.5, .9375], lazy: true },
    m4BuildingGwen0: { anchor: [.5, .9375], lazy: true }, m4BuildingGwen1: { anchor: [.5, .9375], lazy: true },
    m4BuildingGwen2: { anchor: [.5, .9375], lazy: true }, m4BuildingGwen3: { anchor: [.5, .9375], lazy: true },
    m4BuildingGwen4: { anchor: [.5, .9375], lazy: true },
    m4BuildingKevin0: { anchor: [.5, .9375], lazy: true }, m4BuildingKevin1: { anchor: [.5, .9375], lazy: true },
    m4BuildingKevin2: { anchor: [.5, .9375], lazy: true }, m4BuildingKevin3: { anchor: [.5, .9375], lazy: true },
    m4BuildingKevin4: { anchor: [.5, .9375], lazy: true },
    m4BuildingRook0: { anchor: [.5, .9375], lazy: true }, m4BuildingRook1: { anchor: [.5, .9375], lazy: true },
    m4BuildingRook2: { anchor: [.5, .9375], lazy: true }, m4BuildingRook3: { anchor: [.5, .9375], lazy: true },
    m4BuildingRook4: { anchor: [.5, .9375], lazy: true },
    m4Resort0: { anchor: [.5, .9375] },
    m4Resort1: { anchor: [.5, .9375], lazy: true }, m4Resort2: { anchor: [.5, .9375], lazy: true },
    m4Resort3: { anchor: [.5, .9375], lazy: true }, m4Resort4: { anchor: [.5, .9375], lazy: true },
    m4DecorA: { anchor: [.5, .9375] }, m4DecorB: { anchor: [.5, .9375] },
    m4DecorC: { anchor: [.5, .9375] }, m4DecorD: { anchor: [.5, .9375] },
    m4DecorE: { anchor: [.5, .9375] }, m4DecorF: { anchor: [.5, .9375] },
    m4DecorG: { anchor: [.5, .9375] }, m4DecorH: { anchor: [.5, .9375] },
  },
  palette: { groups: { A: '#ff7a24', B: '#ff3d62', C: '#f4df38', D: '#72e4e6', E: '#36b9ef', F: '#8359e8', G: '#ba3ee4', H: '#3ae46b' }, ground: '#101c1a', ground2: '#152825', ground3: '#1b3630', priceStrip: '#0a1714', priceText: '#baffcd', labelText: '#ffffff', labelShadow: '#020711', boardSide: '#16201f', boardSideDark: '#050a0b', boardTop: '#24322f', tileSide: '#273a36', tileSideDark: '#111d1a', water: '#173b59', sand: '#1d5b75', resortBand: '#45ff7c' },
  zones: ZONES,
  slots: {
    tile: { paint: gridPaint }, deco: { draw: spaceDeco, assets: (c) => [decorImageName(c)] },
    house: { draw: spaceHouse, assets: (c) => c.pet === 'ben10-02-ben' ? [`m4BuildingBen${c.level}`] : c.pet === 'ben10-02-gwen' ? [`m4BuildingGwen${c.level}`] : c.pet === 'ben10-02-kevin' ? [`m4BuildingKevin${c.level}`] : c.pet === 'ben10-02-rook' ? [`m4BuildingRook${c.level}`] : [] },
    resort: { paint: flat('#11384c'), draw: resortImage, assets: () => ['m4Resort0'] },
    resortHouse: { draw: resortImage, assets: (c) => [resortImageName(c)] },
    start: { paint: flat('#0b4e29'), label: [.62, .65, 58, .82], draw: specialCorner('m4SpecialStart', 2.75) }, island: { paint: flat('#35174d'), side: ['#29113b', '#15091f'], label: [.7, .8, 31, .56], draw: specialCorner('m4SpecialNullVoid', 2.85) },
    festival: { paint: flat('#133622'), draw: specialCorner('m4SpecialChampionship', 2.95) }, tour: { paint: flat('#17435a'), draw: specialCorner('m4SpecialTour', 2.9) }, chance: { paint: flat('#d7e6db'), draw: specialChance }, tax: { paint: flat('#d7e6db'), draw: specialTax },
    bonus: { draw: specialFestival, assets: () => ['m4SpecialFestival'] },
    outage: { draw: specialOutage, assets: () => ['m4SpecialOutage'] },
    base: { draw: (p, c) => { const a = c.half + c.margin - .08; p.img('m4BoardBase', a, a, 19.45, c.y - .42); } }, center: { paint: spaceGround, draw: spaceBiomes, core: omnitrixCore },
  },
  ambient: { animate: { orbit: orbitFx } },
  labels: { start: 'OMNITRIX START', island: 'NULL VOID', festival: 'CHAMPIONSHIP', tour: 'PLUMBER TOUR', resortLevels: ['Cổng dịch chuyển', 'Vệ tinh', 'Trạm quỹ đạo', 'Pháo đài thiên hà'] },
});

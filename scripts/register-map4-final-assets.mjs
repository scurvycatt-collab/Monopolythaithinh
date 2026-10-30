import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const base = path.join(root, 'public/maps/ben-10-02/assets/v2');
const manifestPath = path.join(base, 'manifest.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const markQaPass = process.argv.includes('--qa-pass');

async function record(spec) {
  const previous = manifest.assets.find((entry) => entry.id === spec.id);
  const absolute = path.resolve(base, spec.path);
  const buffer = await fs.readFile(absolute);
  const meta = await sharp(buffer).metadata();
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left) {
    left = 0;
    top = 0;
    right = (meta.width || 1) - 1;
    bottom = (meta.height || 1) - 1;
  }
  const width = right - left + 1;
  const height = bottom - top + 1;
  return {
    id: spec.id, mapId: 'ben-10-02', batch: spec.batch, path: spec.path.replaceAll('\\', '/'),
    sourceRef: spec.sourceRef, prompt: spec.prompt,
    canvas: [meta.width, meta.height], contentBounds: spec.alpha === false ? [0, 0, meta.width, meta.height] : [left, top, width, height], alpha: spec.alpha !== false,
    footAnchor: spec.footAnchor, worldScale: spec.worldScale, depthOffset: spec.depthOffset || 0,
    tileIndexes: spec.tileIndexes || [], useCases: spec.useCases,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase(), bytes: buffer.length,
    qaStatus: markQaPass ? 'PASS' : (previous?.qaStatus || 'PENDING'), qaEvidence: spec.qaEvidence,
  };
}

const specs = [];
const resortPrompts = [
  'Unowned compact interplanetary teleport landing pad with green Omnitrix energy ring.',
  'Resort level 1 compact active teleport gateway with curved pylons.',
  'Resort level 2 satellite relay, control cabin and teleport pad.',
  'Resort level 3 orbital transfer station with docking arms and control tower.',
  'Resort level 4 grand interstellar Plumber fortress around a portal core.',
];
for (let level = 0; level <= 4; level++) specs.push({
  id: `m4-resort-${level}`, batch: 'M4-D-Resort', path: `resorts/m4-resort-${level}.webp`,
  sourceRef: `source/m4-resort-${level}.png`, prompt: resortPrompts[level], bottom: 64,
  footAnchor: [.5, .9375], worldScale: 1.6, tileIndexes: [4, 14, 18, 25],
  useCases: [level ? `resort-level-${level}` : 'resort-unowned'],
  qaEvidence: 'docs/reviews/map34/ben-10-02/M4-D/resort-qa.md',
});

for (const owner of ['ben', 'gwen', 'kevin', 'rook']) {
  specs.push({ id: `m4-token-${owner}`, batch: 'M4-D-Characters', path: `characters/m4-token-${owner}.webp`,
    sourceRef: `source/m4-character-${owner}-token.png`, prompt: `Full-body 3D ${owner} board token; transparent; no text.`,
    bottom: 32, footAnchor: [.5, .96875], worldScale: 1.08, useCases: [`token-${owner}`],
    qaEvidence: 'docs/reviews/map34/ben-10-02/M4-D/character-qa.md' });
  specs.push({ id: `m4-avatar-${owner}`, batch: 'M4-D-Characters', path: `../characters/${owner}.png`,
    sourceRef: `../characters/${owner}.png`, prompt: `Approved 3D bust avatar of ${owner}; transparent; no frame or text.`,
    bottom: 0, footAnchor: [.5, 1], worldScale: 1, useCases: [`avatar-${owner}`],
    qaEvidence: 'docs/reviews/map34/ben-10-02/M4-D/character-qa.md' });
}

const decorPrompts = {
  a: 'Bellwood Orbit and Plumber urban prop cluster.', b: 'Khoros Forge volcanic prop cluster.',
  c: 'Ledgerdomain neon-purple energy prop cluster.', d: 'Petropia cyan crystal and scanner cluster.',
  e: 'Silver-tech metropolis prop cluster.', f: 'Red desert monolith and alien relay cluster.',
  g: 'Bioluminescent alien jungle prop cluster.', h: 'Osmos industrial turbine and reactor cluster.',
};
for (const letter of Object.keys(decorPrompts)) specs.push({
  id: `m4-decor-${letter}`, batch: 'M4-E-Decor', path: `decor/m4-decor-${letter}.webp`,
  sourceRef: `source/m4-decor-${letter}.png`, prompt: decorPrompts[letter], bottom: 64,
  footAnchor: [.5, .9375], worldScale: 1.4, depthOffset: -.32,
  useCases: [`city-group-${letter.toUpperCase()}-decor`],
  qaEvidence: 'docs/reviews/map34/ben-10-02/M4-E/decor-qa.md',
});

for (const [name, canvas, useCase, sourceRef] of [
  ['home-background', [1920, 1080], 'home-background', 'docs/reviews/map34/ben-10-02/M4-E/decor-integration.png'],
  ['map-preview', [640, 360], 'map-selection-preview', 'docs/reviews/map34/ben-10-02/M4-E/decor-integration.png'],
  ['player-card-master', [720, 240], 'player-card-review-master', 'public/maps/ben-10-02/assets/characters/ben.png'],
  ['popup-master', [900, 700], 'popup-review-master', 'public/maps/ben-10-02/assets/buildings/ben10-02-ben-2.png'],
  ['result-state-review', [1100, 760], 'result-state-review-master', 'docs/reviews/map34/ben-10-02/M4-E/decor-integration.png'],
]) specs.push({ id: `m4-${name}`, batch: 'M4-E-UI', path: `ui/m4-${name}.webp`, sourceRef,
  prompt: `Derived Map 4 ${name} output from the approved live board and master assets.`, bottom: 0,
  footAnchor: null, worldScale: 1, alpha: false, useCases: [useCase],
  qaEvidence: 'docs/reviews/map34/ben-10-02/M4-E/ui-qa.md', expectedCanvas: canvas });

const generated = await Promise.all(specs.map(record));
const ids = new Set(generated.map((entry) => entry.id));
manifest.assets = [...manifest.assets.filter((entry) => !ids.has(entry.id)), ...generated];
for (const entry of manifest.assets) {
  const absolute = path.resolve(base, entry.path);
  const buffer = await fs.readFile(absolute);
  entry.sha256 = crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
  entry.bytes = buffer.length;
}
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ registered: generated.length, qaStatus: markQaPass ? 'PASS' : 'preserved' }, null, 2));

import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const assetRoot = path.join(root, 'public/maps/ben-10-02/assets/v2');
const output = path.join(root, 'docs/reviews/map34/ben-10-02/M4-E/runtime-request-list.json');
const names = async (folder) => (await fs.readdir(path.join(assetRoot, folder))).filter((name) => name.endsWith('.webp')).sort();
const cold = [
  ...(await names('board')).map((name) => `board/${name}`),
  ...(await names('special')).filter((name) => !/festival|outage/.test(name)).map((name) => `special/${name}`),
  ...(await names('decor')).map((name) => `decor/${name}`),
  'resorts/m4-resort-0.webp',
];
const lazy = [
  ...(await names('buildings')).map((name) => `buildings/${name}`),
  ...(await names('resorts')).filter((name) => name !== 'm4-resort-0.webp').map((name) => `resorts/${name}`),
  'special/m4-special-festival.webp',
  'special/m4-special-outage.webp',
];
const describe = async (relative) => ({
  path: relative,
  bytes: (await fs.stat(path.join(assetRoot, relative))).size,
});
const coldAssets = await Promise.all(cold.map(describe));
const lazyAssets = await Promise.all(lazy.map(describe));
const report = {
  generatedAt: new Date().toISOString(),
  coldBudgetBytes: 2.5 * 1024 * 1024,
  coldBytes: coldAssets.reduce((sum, asset) => sum + asset.bytes, 0),
  coldAssets,
  lazyAssets,
  sourceMastersExcludedFromDeploy: 'public/.assetsignore: maps/*/assets/v2/source/**',
};
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output, coldBytes: report.coldBytes, withinBudget: report.coldBytes <= report.coldBudgetBytes }, null, 2));

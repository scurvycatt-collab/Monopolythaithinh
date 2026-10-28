import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Tạo map tạm bằng scripts/map-new.mjs trong một BẢN SAO repo (không đụng working tree), chạy maps.test.mjs với map mới,
// kiểm tra các lỗi đầu vào, rồi --remove và xác nhận rules.js trở lại y nguyên.
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(path.join(os.tmpdir(), 'map-new-'));
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };
const run = (args, file = 'scripts/map-new.mjs') => spawnSync(process.execPath, [file, ...args], { cwd: tmp, env: { ...process.env, MAP_NEW_ROOT: tmp }, encoding: 'utf8' });

try {
  cpSync(path.join(ROOT, 'scripts'), path.join(tmp, 'scripts'), { recursive: true });
  cpSync(path.join(ROOT, 'test/maps.test.mjs'), path.join(tmp, 'test/maps.test.mjs'));
  cpSync(path.join(ROOT, 'docs/contracts'), path.join(tmp, 'docs/contracts'), { recursive: true });
  cpSync(path.join(ROOT, 'public'), path.join(tmp, 'public'), { recursive: true, filter: (s) => !/[\\/]public[\\/](thumbnails|audio|sounds)([\\/]|$)/.test(s) });
  const rulesPath = path.join(tmp, 'public/rules.js');
  const before = readFileSync(rulesPath, 'utf8');
  const ID = 'tmp-demo';

  let r = run([ID, '--dry-run']);
  check(r.status === 0 && !existsSync(path.join(tmp, 'public/maps', ID)) && readFileSync(rulesPath, 'utf8') === before, '--dry-run không được ghi gì.');

  r = run([ID, '--name', 'Map Thử']);
  check(r.status === 0, `tạo map lỗi: ${r.stderr}`);
  for (const f of ['renderer.js', 'skin.js', 'preview.svg', 'README.md', 'assets/.gitkeep']) check(existsSync(path.join(tmp, 'public/maps', ID, f)), `thiếu public/maps/${ID}/${f}`);
  const after = readFileSync(rulesPath, 'utf8');
  check(after.includes(`id: '${ID}', name: 'Map Thử'`), 'rules.js thiếu entry mới.');
  check((after.match(/default: true/g) || []).length === (before.match(/default: true/g) || []).length, 'không được đổi default.');

  r = run([], 'test/maps.test.mjs');
  check(r.status === 0, `maps.test.mjs không qua với map mới: ${r.stderr}`);

  for (const [args, re] of [[[ID], /đã tồn tại/], [['Bad_ID'], /không hợp lệ/], [['four-seasons'], /đã (tồn tại|có)/], [[], /thiếu id/]]) {
    const e = run(args);
    check(e.status !== 0 && re.test(e.stderr), `lỗi đầu vào ${JSON.stringify(args)} phải báo "${re}", nhận: ${e.stderr}`);
  }
  r = run(['--remove', 'map-1']);
  check(r.status !== 0, 'không được xoá map mặc định.');

  r = run(['--remove', ID]);
  check(r.status === 0, `--remove lỗi: ${r.stderr}`);
  check(!existsSync(path.join(tmp, 'public/maps', ID)), '--remove không xoá thư mục.');
  check(readFileSync(rulesPath, 'utf8') === before, '--remove phải trả rules.js về y nguyên.');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
if (errors.length) { console.error('Map-new tests FAILED:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('Map-new tests passed.');

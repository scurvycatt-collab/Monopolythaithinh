// Đóng gói thành một file chạy duy nhất (server + giao diện + mô hình) bằng Bun.
//   node scripts/build-exe.mjs            → dist/ThaiThinhMonopoly.exe (Windows x64)
//   node scripts/build-exe.mjs mac linux  → thêm bản macOS (Apple Silicon) / Linux
// Cần mạng để npx tải Bun lần đầu.
import { readdirSync, statSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUB = join(ROOT, 'public');
const BUN = 'bun@1.3.1';
const TARGETS = {
  win: { target: 'bun-windows-x64', out: 'ThaiThinhMonopoly.exe', extra: ['--windows-icon=assets/icon.ico', '--windows-title=Thái Thịnh Monopoly'] },
  mac: { target: 'bun-darwin-arm64', out: 'ThaiThinhMonopoly-mac', extra: [] },
  linux: { target: 'bun-linux-x64', out: 'ThaiThinhMonopoly-linux', extra: [] },
};

// 1) chép public → build/assets rồi nhúng bản chép (import kiểu file để Bun giữ nguyên nội dung).
//    Không nhúng thẳng public/ vì server còn require('./public/game.js') làm module.
const ASSETS = join(ROOT, 'build', 'assets');
rmSync(join(ROOT, 'build'), { recursive: true, force: true });
mkdirSync(ASSETS, { recursive: true });
cpSync(PUB, ASSETS, { recursive: true });
const files = [];
(function walk(dir) { for (const n of readdirSync(dir)) { const p = join(dir, n); statSync(p).isDirectory() ? walk(p) : files.push(p); } })(ASSETS);
const lines = files.map((f, k) => `import a${k} from './${relative(join(ROOT, 'build'), f).split(sep).join('/')}' with { type: 'file' };`);
const map = files.map((f, k) => `  '/${relative(ASSETS, f).split(sep).join('/')}': a${k},`);
writeFileSync(join(ROOT, 'build', 'entry.js'), `// Tự sinh bởi scripts/build-exe.mjs — đừng sửa tay\n${lines.join('\n')}\nglobalThis.__TTM_ASSETS = {\n${map.join('\n')}\n};\nawait import('../server.js');\n`);
console.log(`Nhúng ${files.length} file giao diện`);

// 2) dịch cho từng hệ điều hành
const want = process.argv.slice(2).length ? ['win', ...process.argv.slice(2)] : ['win'];
for (const k of [...new Set(want)]) {
  const t = TARGETS[k]; if (!t) { console.error('Không biết hệ', k); continue; }
  const args = ['--yes', BUN, 'build', '--compile', '--minify', `--target=${t.target}`, ...t.extra, 'build/entry.js', '--outfile', `dist/${t.out}`];
  try { execFileSync('npx', args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' }); }
  catch (e) {
    if (!t.extra.length) throw e;
    console.warn('Dịch kèm biểu tượng không được, dịch lại không biểu tượng…');
    execFileSync('npx', args.filter((a) => !t.extra.includes(a)), { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  }
  console.log('→ dist/' + t.out);
}

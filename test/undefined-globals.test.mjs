// Quét biến chưa khai báo trong JS phía client (public/) và server (server.js, cloudflare/).
// Parse bằng acorn rồi tự phân giải phạm vi: tên được dùng mà không có khai báo nào trong file,
// không phải global của môi trường (trình duyệt / Node / Worker / ES) và không có trong SHARED_GLOBALS
// thì báo lỗi kèm file:dòng. Thư viện bên thứ ba (public/vendor, public/assets) không quét.
// Lỗi kiểu RESORT_COLOR (dùng mà không định nghĩa) sẽ làm npm run verify đỏ.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { parse } from 'acorn';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Global chuẩn của JavaScript (ECMAScript), dùng ở mọi môi trường.
const ES_GLOBALS = `Object Function Array Number Boolean String Symbol BigInt Math JSON Date RegExp Error
  EvalError RangeError ReferenceError SyntaxError TypeError URIError AggregateError Map Set WeakMap WeakSet
  WeakRef FinalizationRegistry Promise Proxy Reflect ArrayBuffer SharedArrayBuffer DataView Atomics
  Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array
  Float64Array BigInt64Array BigUint64Array Intl globalThis undefined NaN Infinity isNaN isFinite parseInt
  parseFloat encodeURI encodeURIComponent decodeURI decodeURIComponent escape unescape eval`;

// Global của trình duyệt mà public/ đang dùng (thêm khi code mới dùng API mới).
const BROWSER_GLOBALS = `window self document navigator location history localStorage sessionStorage
  performance console alert confirm prompt fetch Request Response Headers URL URLSearchParams
  AbortController AbortSignal Event CustomEvent EventTarget Node NodeList Element HTMLElement
  HTMLCanvasElement HTMLImageElement HTMLVideoElement HTMLAudioElement HTMLInputElement HTMLSelectElement
  HTMLTextAreaElement HTMLButtonElement HTMLDivElement HTMLCollection HTMLFormElement DocumentFragment
  SVGElement SVGSVGElement Text Comment Image Audio AudioContext webkitAudioContext OfflineAudioContext
  AudioBuffer GainNode Blob File FileReader FormData WebSocket Worker SharedWorker MessageChannel
  MessageEvent BroadcastChannel EventSource KeyboardEvent MouseEvent PointerEvent TouchEvent WheelEvent
  UIEvent FocusEvent InputEvent ErrorEvent ProgressEvent PromiseRejectionEvent StorageEvent PopStateEvent
  HashChangeEvent TransitionEvent AnimationEvent ResizeObserver IntersectionObserver MutationObserver
  DOMMatrix DOMMatrixReadOnly DOMPoint DOMRect DOMParser XMLSerializer CanvasRenderingContext2D
  WebGLRenderingContext WebGL2RenderingContext Path2D ImageData ImageBitmap createImageBitmap
  OffscreenCanvas TextEncoder TextDecoder crypto btoa atob requestAnimationFrame cancelAnimationFrame
  requestIdleCallback cancelIdleCallback getComputedStyle matchMedia screen innerWidth innerHeight
  devicePixelRatio scrollTo scrollBy open close addEventListener removeEventListener dispatchEvent
  setTimeout clearTimeout setInterval clearInterval queueMicrotask structuredClone reportError
  Notification Storage Gamepad Clipboard ClipboardItem PerformanceObserver CSS CSSStyleSheet
  MediaStream MediaRecorder speechSynthesis caches indexedDB IDBKeyRange cache`;

// Global của Node (server.js, scripts/).
// Bun: server.js dùng Bun.file khi đóng gói .exe (scripts/build-exe.mjs).
const NODE_GLOBALS = `require module exports __dirname __filename process Buffer global Bun setImmediate
  clearImmediate console setTimeout clearTimeout setInterval clearInterval queueMicrotask structuredClone
  fetch Response Request Headers URL URLSearchParams AbortController TextEncoder TextDecoder performance
  crypto atob btoa`;

// Global của Cloudflare Worker (cloudflare/).
const WORKER_GLOBALS = `console fetch Response Request Headers URL URLSearchParams AbortController
  TextEncoder TextDecoder crypto atob btoa setTimeout clearTimeout caches WebSocketPair ReadableStream
  WritableStream TransformStream Blob FormData performance queueMicrotask structuredClone`;

// Biến cố ý dùng chung giữa các file (không khai báo trong file, nhưng có file khác gán hoặc đọc).
// Thêm tên vào đây khi có một file cố ý đặt window.X hoặc root.X; không tắt kiểm tra.
//   module, exports, require: nhánh UMD của public/rules.js và public/game.js khi chạy trong Node.
//   (rules.js và game.js gán window.RULES / window.Game; app.js đọc qua window.Game nên không cần ở đây.)
const SHARED_GLOBALS = `module exports require`;

const words = (s) => new Set(s.split(/\s+/).filter(Boolean));
const ES = words(ES_GLOBALS);
const ENV = {
  browser: new Set([...ES, ...words(BROWSER_GLOBALS)]),
  node: new Set([...ES, ...words(NODE_GLOBALS)]),
  worker: new Set([...ES, ...words(WORKER_GLOBALS)]),
};
const SHARED = words(SHARED_GLOBALS);

const SKIP_KEYS = new Set(['type', 'start', 'end', 'loc', 'range']);

class Scope {
  constructor(parent, isFunction) {
    this.parent = parent;
    this.isFunction = isFunction;
    this.names = new Set();
  }
}

// Trả về danh sách {name, line} cho các tên được dùng nhưng không khai báo trong src.
// Môi trường (env) chọn bộ global được phép; SHARED luôn được phép.
export function findUndeclared(src, env = 'browser') {
  let ast;
  try {
    ast = parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true, allowHashBang: true });
  } catch {
    ast = parse(src, { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowHashBang: true, allowReturnOutsideFunction: true });
  }

  const program = new Scope(null, true);
  const refs = [];

  const varScope = (scope) => {
    let s = scope;
    while (!s.isFunction) s = s.parent;
    return s;
  };

  const ref = (node, scope) => refs.push({ name: node.name, line: node.loc.start.line, scope });

  // Khai báo mẫu (biến, tham số, catch): gom tên vào declScope, phần mặc định/khóa tính trong scope.
  const bindPattern = (p, scope, declScope) => {
    if (!p) return;
    switch (p.type) {
      case 'Identifier': declScope.names.add(p.name); return;
      case 'ObjectPattern':
        for (const prop of p.properties) {
          if (prop.type === 'RestElement') bindPattern(prop.argument, scope, declScope);
          else {
            if (prop.computed) visit(prop.key, scope);
            bindPattern(prop.value, scope, declScope);
          }
        }
        return;
      case 'ArrayPattern': for (const el of p.elements) bindPattern(el, scope, declScope); return;
      case 'AssignmentPattern': bindPattern(p.left, scope, declScope); visit(p.right, scope); return;
      case 'RestElement': bindPattern(p.argument, scope, declScope); return;
      default: visit(p, scope); // vế trái của phép gán (a.b = ...) là biểu thức thường
    }
  };

  const visitFunction = (node, outer) => {
    const fs = new Scope(outer, true);
    if (node.type === 'FunctionExpression' && node.id) fs.names.add(node.id.name);
    if (node.type !== 'ArrowFunctionExpression') fs.names.add('arguments');
    for (const p of node.params) bindPattern(p, fs, fs);
    if (node.body.type === 'BlockStatement') for (const st of node.body.body) visit(st, fs);
    else visit(node.body, fs);
  };

  const visitClass = (node, outer) => {
    const cs = new Scope(outer, false);
    if (node.id) cs.names.add(node.id.name);
    if (node.superClass) visit(node.superClass, cs);
    visit(node.body, cs);
  };

  function visit(node, scope) {
    if (!node || typeof node.type !== 'string') return;
    switch (node.type) {
      case 'Identifier': ref(node, scope); return;
      case 'MemberExpression':
        visit(node.object, scope);
        if (node.computed) visit(node.property, scope);
        return;
      case 'Property':
      case 'PropertyDefinition':
      case 'MethodDefinition':
        if (node.computed) visit(node.key, scope);
        visit(node.value, scope);
        return;
      case 'LabeledStatement': visit(node.body, scope); return;
      case 'BreakStatement':
      case 'ContinueStatement':
      case 'MetaProperty':
        return;
      case 'UnaryExpression':
        if (node.operator === 'typeof' && node.argument.type === 'Identifier') return; // typeof X an toàn
        visit(node.argument, scope);
        return;
      case 'ImportDeclaration':
        for (const s of node.specifiers) program.names.add(s.local.name);
        return;
      case 'ExportNamedDeclaration':
        if (node.declaration) visit(node.declaration, scope);
        else if (!node.source) for (const s of node.specifiers) visit(s.local, scope);
        return;
      case 'ExportDefaultDeclaration': visit(node.declaration, scope); return;
      case 'ExportAllDeclaration': return;
      case 'VariableDeclaration': {
        const target = node.kind === 'var' ? varScope(scope) : scope;
        for (const d of node.declarations) {
          bindPattern(d.id, scope, target);
          visit(d.init, scope);
        }
        return;
      }
      case 'FunctionDeclaration':
        if (node.id) scope.names.add(node.id.name);
        visitFunction(node, scope);
        return;
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        visitFunction(node, scope);
        return;
      case 'ClassDeclaration':
        scope.names.add(node.id.name);
        visitClass(node, scope);
        return;
      case 'ClassExpression':
        visitClass(node, scope);
        return;
      case 'BlockStatement': {
        const bs = new Scope(scope, false);
        for (const st of node.body) visit(st, bs);
        return;
      }
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement': {
        const fs = new Scope(scope, false);
        visit(node.init || node.left, fs);
        for (const k of ['test', 'update', 'right', 'body']) visit(node[k], fs);
        return;
      }
      case 'SwitchStatement': {
        visit(node.discriminant, scope);
        const ss = new Scope(scope, false);
        for (const c of node.cases) {
          visit(c.test, ss);
          for (const st of c.consequent) visit(st, ss);
        }
        return;
      }
      case 'CatchClause': {
        const cs = new Scope(scope, false);
        bindPattern(node.param, cs, cs);
        visit(node.body, cs);
        return;
      }
      default:
        for (const key of Object.keys(node)) {
          if (SKIP_KEYS.has(key)) continue;
          const v = node[key];
          if (Array.isArray(v)) for (const c of v) visit(c, scope);
          else if (v && typeof v.type === 'string') visit(v, scope);
        }
    }
  }

  // Chương trình: khai báo cấp cao nhất nằm trong program scope (import, var, let, function, class).
  for (const st of ast.body) visit(st, program);

  const allowed = ENV[env];
  const undeclared = [];
  for (const r of refs) {
    let s = r.scope;
    let found = false;
    while (s) {
      if (s.names.has(r.name)) { found = true; break; }
      s = s.parent;
    }
    if (!found && !allowed.has(r.name) && !SHARED.has(r.name)) undeclared.push({ name: r.name, line: r.line });
  }
  return undeclared;
}

// Tự kiểm: checker phải bắt được ca sai và không báo nhầm ca đúng.
function selfTest() {
  const names = (src, env) => findUndeclared(src, env).map((u) => u.name);
  assert.deepEqual(names('function f() { return zzz; }'), ['zzz'], 'phải bắt biến không khai báo trong hàm');
  assert.deepEqual(names('var a = 1; console.log(a, typeof nope, { b: 2, c });'), ['c'], 'phải bắt tên trong shorthand, bỏ qua typeof');
  assert.deepEqual(names('h(); function h() { return q; } let q = 1;'), [], 'khai báo được hoisting, không báo nhầm');
  assert.deepEqual(names('try { x(); } catch (err) { err.message; }'), ['x'], 'biến catch phải khai báo đúng phạm vi');
  assert.deepEqual(names('obj.zzz; ({ key: 1 }); x.y = 1;'), ['obj', 'x'], 'thuộc tính không phải tham chiếu');
  assert.deepEqual(names('lbl: for (;;) { break lbl; }'), [], 'nhãn không phải tham chiếu');
  assert.deepEqual(names('class A extends B {}'), ['B'], 'lớp phải tham chiếu superclass');
  assert.deepEqual(names('const fn = (p, { d = dd } = {}) => p + d;'), ['dd'], 'giá trị mặc định trong tham số là tham chiếu');
  assert.deepEqual(names('for (const i of [1]) { i; } i;'), ['i'], 'let/const trong for không lọt ra ngoài');
  assert.deepEqual(names('if (typeof module !== "undefined" && module.exports) module.exports = 1;', 'browser'), [], 'nhánh UMD (module/exports) được phép');
  assert.deepEqual(names('process.exit(1);', 'browser'), ['process'], 'Node global không được phép trong môi trường trình duyệt');
  assert.deepEqual(names('const c = new AbortController(); new URLSearchParams(); new DOMMatrix();', 'browser'), [], 'global trình duyệt được phép');
}

// Danh sách file cần quét và môi trường của từng file.
function listFiles() {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (['vendor', 'assets', 'models', 'audio', 'patterns'].includes(name)) continue;
        walk(full);
      } else if (['.js', '.mjs'].includes(extname(name))) out.push(full);
    }
  };
  walk(join(ROOT, 'public'));
  for (const f of ['server.js']) out.push(join(ROOT, f));
  walk(join(ROOT, 'cloudflare'));
  return out.map((full) => {
    const rel = relative(ROOT, full).split('\\').join('/');
    const env = rel.startsWith('public/') ? 'browser' : rel.startsWith('cloudflare/') ? 'worker' : 'node';
    return { full, rel, env };
  });
}

selfTest();

const files = listFiles();
const problems = [];
for (const { full, rel, env } of files) {
  let found;
  try {
    found = findUndeclared(readFileSync(full, 'utf8'), env);
  } catch (err) {
    problems.push(`${rel}: không phân tích được cú pháp (${err.message})`);
    continue;
  }
  for (const u of found) {
    problems.push(`${rel}:${u.line} biến "${u.name}" được dùng nhưng chưa khai báo (thêm khai báo, hoặc thêm vào SHARED_GLOBALS nếu cố ý dùng chung)`);
  }
}

if (problems.length) {
  console.error(`Có ${problems.length} lỗi biến chưa khai báo:`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`Quét biến chưa khai báo: ${files.length} file, 0 lỗi ... tests passed.`);

import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../public/js/app.js', import.meta.url), 'utf8');

assert.match(html, /<body data-screen="boot">/);
assert.match(html, /class="gate-layout"/);
assert.match(html, /class="gate-brand"/);
assert.match(html, /class="gate-card"/);
assert.match(css, /body\[data-screen="gate"\][^{]*:is\([^)]*#stage/);
assert.match(css, /#gate\{[^}]*box-sizing:border-box/);

const gateFirst = app.indexOf("if (MODE === 'net' && ROOM_GATE) { showRoomGate(); return; }");
const prepareAfterGate = app.indexOf('await prepareBoard();', gateFirst);
assert.ok(gateFirst >= 0 && prepareAfterGate > gateFirst, 'cloud home must return before preparing the 3D board');
assert.match(app, /const TOKEN_HEIGHT = 1\.08;/, 'all characters must share the enlarged token height');
assert.match(app, /place\(seatOf\[p\.id\]\.pet, TOKEN_HEIGHT, \{ byHeight: true \}\)/, 'tokens must be normalized by height');
assert.match(app, /Đến lượt bạn!/);
assert.match(app, /`Đến lượt \$\{p\.name\}!`/);
assert.match(app, /const MONEY_DEBIT_MS = REDUCED \? 1 : 700;/, 'debit animation must use the shorter duration');
assert.match(app, /const duration = to < from \? MONEY_DEBIT_MS : MONEY_MS;/, 'only money deductions should use the faster animation');

console.log('Home screen lazy-map tests passed.');

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

const gateFirst = app.indexOf("if (MODE === 'net' && ROOM_GATE) { showRoomGate(); return; }");
const prepareAfterGate = app.indexOf('await prepareBoard();', gateFirst);
assert.ok(gateFirst >= 0 && prepareAfterGate > gateFirst, 'cloud home must return before preparing the 3D board');

console.log('Home screen lazy-map tests passed.');

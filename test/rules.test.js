// Chạy từng dòng BẢNG QUYẾT ĐỊNH trong public/rules.js trên engine thật.
// Dòng nào lệch là engine không đúng bộ luật chính → không được commit/deploy.
'use strict';
const R = require('../public/rules.js');
const G = require('../public/game.js');

// giá trị rnd cho ra đúng mặt xúc xắc / đúng thẻ (theo trọng số trong rules.js)
const dieR = (v) => (v - 0.5) / 6;
function cardR(id) {
  const total = R.CARDS.reduce((a, c) => a + c.w, 0); let acc = 0;
  for (const c of R.CARDS) { if (c.id === id) return (acc + c.w / 2) / total; acc += c.w; }
  throw new Error('Không có thẻ ' + id);
}

function build(setup) {
  const s = G.createState(); s.settings.timeLimitMin = 0; s.settings.turnSec = 0;
  G.addPlayer(s, { id: 'me', token: 't1', name: 'Me' }); G.addPlayer(s, { id: 'op', token: 't2', name: 'Op' });
  G.setRng(() => 0.99); G.startGame(s);
  s.turn = s.players.findIndex((p) => p.id === 'me');
  const me = G.byId(s, 'me');
  Object.assign(me, { money: setup.money ?? R.CONFIG.START_MONEY, pos: setup.pos ?? 0, laps: setup.laps ?? 0, doubles: setup.doubles ?? 0,
    island: setup.island ?? 0, shields: setup.shields ?? 0, escapeCards: setup.escapeCards ?? 0, tourPending: !!setup.tourPending });
  s.bonus = setup.bonus || [];
  s.props = {};
  for (const [i, [who, level]] of Object.entries(setup.props || {})) s.props[i] = { owner: who, level };
  if (setup.festival !== undefined) { s.festival = setup.festival; s.festLevel = setup.festLevel || 1; }
  if (setup.outage) s.outage = { ...setup.outage };
  s.step = { kind: setup.step || (me.tourPending ? 'tour' : me.island ? 'island' : 'roll') };
  const q = [];
  if (setup.dice) q.push(dieR(setup.dice[0]), dieR(setup.dice[1]));
  if (setup.card) q.push(cardR(setup.card));
  G.setRng(() => (q.length ? q.shift() : 0.99));
  if (setup.timeUp) { s.endsAt = Date.now() - 1000; s.settings.timeLimitMin = 60; }
  return s;
}

function check(row) {
  const s = build(row.setup), me = G.byId(s, 'me'), op = G.byId(s, 'op'), e = row.expect, bad = [];
  let err = null;
  try { for (const [t, d] of row.do) G.act(s, 'me', t, d); if (row.setup.timeUp) G.checkTime(s, Date.now()); } catch (x) { err = x; }
  if (e.error) { if (!err) bad.push('đáng lẽ bị từ chối'); return bad; }
  if (err) return ['lỗi: ' + err.message];
  const eq = (name, got, want) => { if (Math.abs((got ?? 0) - want) > 1e-6 && got !== want) bad.push(`${name}: được ${got}, cần ${want}`); };
  if ('me' in e) eq('tiền me', me.money, e.me);
  if ('op' in e) eq('tiền op', op.money, e.op);
  if ('pos' in e) eq('vị trí', me.pos, e.pos);
  if ('laps' in e) eq('số vòng', me.laps, e.laps);
  if ('island' in e) eq('lượt kẹt đảo', me.island, e.island);
  if ('shields' in e) eq('thẻ VIP', me.shields, e.shields);
  if ('tourPending' in e && me.tourPending !== e.tourPending) bad.push('vé World Tour sai');
  if ('festival' in e) eq('ô lễ hội', s.festival, e.festival);
  if ('festLevel' in e) eq('bậc lễ hội', s.festLevel, e.festLevel);
  if ('outage' in e && !(s.outage && s.outage[e.outage])) bad.push('ô chưa bị mất điện');
  if ('pending' in e) eq('khoản treo', s.pending ? s.pending.amount : 0, e.pending);
  if ('notice' in e && !(s.notice && s.notice.kind === e.notice && s.notice.pid === 'me')) bad.push(`thiếu thông báo ${e.notice}`);
  if ('owner' in e) { const [i, who] = e.owner; const got = s.props[i] ? s.props[i].owner : null; if (got !== who) bad.push(`chủ ô ${i}: ${got}, cần ${who}`); }
  if ('level' in e) { const [i, lv] = e.level; eq(`cấp ô ${i}`, s.props[i] && s.props[i].level, lv); }
  if ('phase' in e && s.phase !== e.phase) bad.push(`phase ${s.phase}, cần ${e.phase}`);
  if ('winner' in e && s.winner !== e.winner) bad.push(`người thắng ${s.winner}, cần ${e.winner}`);
  if ('step' in e) {
    const cur = G.cur(s);
    if (e.step === 'next') { if (s.phase === 'play' && cur.id === 'me') bad.push(`chưa sang người kế (bước ${s.step && s.step.kind})`); }
    else if (!s.step || s.step.kind !== e.step) bad.push(`bước ${s.step && s.step.kind}, cần ${e.step}`);
  }
  if ('turn' in e && G.cur(s).id !== e.turn) bad.push(`lượt của ${G.cur(s).id}, cần ${e.turn}`);
  if (s.players.some((p) => p.money < 0)) bad.push('có người âm tiền');
  return bad;
}

// sơ đồ trạng thái: mọi bước engine sinh ra phải có trong STATES (kiểm qua giả lập ở test/sim.js), ở đây kiểm cấu trúc
for (const [k, v] of Object.entries(R.STATES)) if (!v.actions || !Object.keys(v.actions).length) { console.error('Bước không có hành động:', k); process.exit(1); }

let fail = 0;
for (const row of R.DECISIONS) {
  const bad = check(row);
  if (bad.length) { fail++; console.error(`✗ ${row.id} [${row.table}] ${row.when} → ${row.then}\n    ${bad.join('\n    ')}`); }
}
if (fail) { console.error(`\nLỆCH LUẬT: ${fail}/${R.DECISIONS.length} dòng bảng quyết định không khớp engine.`); process.exit(1); }
console.log(`OK luật v${R.VERSION}: ${R.DECISIONS.length}/${R.DECISIONS.length} dòng bảng quyết định khớp engine`);

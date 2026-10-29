// Chạy từng dòng BẢNG QUYẾT ĐỊNH trong public/rules.js trên engine thật.
// Dòng nào lệch là engine không đúng bộ luật chính → không được commit/deploy.
'use strict';
const assert = require('node:assert/strict');
const R = require('../public/rules.js');
const G = require('../public/game.js');

const granada = R.TILES.find((tile) => tile.name === 'Granada');
assert.deepEqual(granada.values, [60, 110, 160, 210, 360], 'bảng giá Granada phải khớp ảnh tham chiếu');
assert.deepEqual(granada.values.map((_, level) => G.value(granada.i, level)), granada.values, 'engine phải dùng bảng giá tuyệt đối của Granada');
const seville = R.TILES.find((tile) => tile.name === 'Seville');
assert.deepEqual(seville.values, [60, 110, 160, 210, 360], 'bảng giá Seville phải khớp ảnh tham chiếu');
assert.deepEqual(seville.values.map((_, level) => G.value(seville.i, level)), seville.values, 'engine phải dùng bảng giá tuyệt đối của Seville');
const madrid = R.TILES.find((tile) => tile.name === 'Madrid');
assert.deepEqual(madrid.values, [60, 110, 160, 210, 360], 'bảng giá Madrid phải khớp ảnh tham chiếu');
assert.deepEqual(madrid.values.map((_, level) => G.value(madrid.i, level)), madrid.values, 'engine phải dùng bảng giá tuyệt đối của Madrid');
const hongKong = R.TILES.find((tile) => tile.name === 'Hong Kong');
assert.deepEqual(hongKong.values, [100, 150, 200, 250, 400], 'bảng giá Hong Kong phải khớp ảnh tham chiếu');
assert.deepEqual(hongKong.values.map((_, level) => G.value(hongKong.i, level)), hongKong.values, 'engine phải dùng bảng giá tuyệt đối của Hong Kong');
const beijing = R.TILES.find((tile) => tile.name === 'Beijing');
assert.deepEqual(beijing.values, [100, 150, 200, 250, 400], 'bảng giá Beijing phải khớp ảnh tham chiếu');
assert.deepEqual(beijing.values.map((_, level) => G.value(beijing.i, level)), beijing.values, 'engine phải dùng bảng giá tuyệt đối của Beijing');
const shanghai = R.TILES.find((tile) => tile.name === 'Shanghai');
assert.deepEqual(shanghai.values, [120, 170, 220, 270, 420], 'bảng giá Shanghai phải khớp ảnh tham chiếu');
assert.deepEqual(shanghai.values.map((_, level) => G.value(shanghai.i, level)), shanghai.values, 'engine phải dùng bảng giá tuyệt đối của Shanghai');
const venice = R.TILES.find((tile) => tile.name === 'Venice');
assert.deepEqual(venice.values, [140, 240, 340, 440, 690], 'bảng giá Venice phải khớp ảnh tham chiếu');
assert.deepEqual(venice.values.map((_, level) => G.value(venice.i, level)), venice.values, 'engine phải dùng bảng giá tuyệt đối của Venice');
const milan = R.TILES.find((tile) => tile.name === 'Milan');
assert.deepEqual(milan.values, [140, 240, 340, 440, 690], 'bảng giá Milan phải khớp ảnh tham chiếu');
assert.deepEqual(milan.values.map((_, level) => G.value(milan.i, level)), milan.values, 'engine phải dùng bảng giá tuyệt đối của Milan');
const rome = R.TILES.find((tile) => tile.name === 'Rome');
assert.deepEqual(rome.values, [160, 260, 360, 460, 710], 'bảng giá Rome phải khớp ảnh tham chiếu');
assert.deepEqual(rome.values.map((_, level) => G.value(rome.i, level)), rome.values, 'engine phải dùng bảng giá tuyệt đối của Rome');
const hamburg = R.TILES.find((tile) => tile.name === 'Hamburg');
assert.deepEqual(hamburg.values, [180, 280, 380, 480, 730], 'bảng giá Hamburg phải khớp ảnh tham chiếu');
assert.deepEqual(hamburg.values.map((_, level) => G.value(hamburg.i, level)), hamburg.values, 'engine phải dùng bảng giá tuyệt đối của Hamburg');
const berlin = R.TILES.find((tile) => tile.name === 'Berlin');
assert.deepEqual(berlin.values, [200, 300, 400, 500, 750], 'bảng giá Berlin phải khớp ảnh tham chiếu');
assert.deepEqual(berlin.values.map((_, level) => G.value(berlin.i, level)), berlin.values, 'engine phải dùng bảng giá tuyệt đối của Berlin');
assert.deepEqual(berlin.rents, [16, 90, 180, 270, 495], 'bảng thuê Berlin phải khớp ảnh và công thức Business Tour');
assert.deepEqual(berlin.rents.map((_, level) => G.toll(berlin.i, level)), berlin.rents, 'engine phải dùng bảng thuê tuyệt đối của Berlin');
const london = R.TILES.find((tile) => tile.name === 'London');
assert.deepEqual(london.values, [220, 370, 520, 670, 1045], 'bảng giá London phải khớp ảnh tham chiếu');
assert.deepEqual(london.values.map((_, level) => G.value(london.i, level)), london.values, 'engine phải dùng bảng giá tuyệt đối của London');
const sydney = R.TILES.find((tile) => tile.name === 'Sydney');
assert.deepEqual(sydney.values, [240, 390, 540, 690, 1065], 'bảng giá Sydney phải khớp ảnh tham chiếu');
assert.deepEqual(sydney.values.map((_, level) => G.value(sydney.i, level)), sydney.values, 'engine phải dùng bảng giá tuyệt đối của Sydney');
assert.deepEqual(sydney.rents, [20, 120, 240, 360, 660], 'bảng thuê Sydney phải khớp ảnh và công thức Business Tour');
assert.deepEqual(sydney.rents.map((_, level) => G.toll(sydney.i, level)), sydney.rents, 'engine phải dùng bảng thuê tuyệt đối của Sydney');
const chicago = R.TILES.find((tile) => tile.name === 'Chicago');
assert.deepEqual(chicago.values, [260, 410, 560, 710, 1085], 'bảng giá Chicago phải khớp ảnh tham chiếu');
assert.deepEqual(chicago.values.map((_, level) => G.value(chicago.i, level)), chicago.values, 'engine phải dùng bảng giá tuyệt đối của Chicago');
const lasVegas = R.TILES.find((tile) => tile.name === 'Las Vegas');
assert.deepEqual(lasVegas.values, [260, 410, 560, 710, 1085], 'bảng giá Las Vegas phải khớp ảnh tham chiếu');
assert.deepEqual(lasVegas.values.map((_, level) => G.value(lasVegas.i, level)), lasVegas.values, 'engine phải dùng bảng giá tuyệt đối của Las Vegas');
const newYork = R.TILES.find((tile) => tile.name === 'New York');
assert.deepEqual(newYork.values, [280, 430, 580, 730, 1105], 'bảng giá New York phải khớp ảnh tham chiếu');
assert.deepEqual(newYork.values.map((_, level) => G.value(newYork.i, level)), newYork.values, 'engine phải dùng bảng giá tuyệt đối của New York');
const lyon = R.TILES.find((tile) => tile.name === 'Lyon');
assert.deepEqual(lyon.values, [300, 500, 700, 900, 1400], 'bảng giá Lyon phải khớp ảnh tham chiếu');
assert.deepEqual(lyon.values.map((_, level) => G.value(lyon.i, level)), lyon.values, 'engine phải dùng bảng giá tuyệt đối của Lyon');
const paris = R.TILES.find((tile) => tile.name === 'Paris');
assert.deepEqual(paris.values, [320, 520, 720, 920, 1420], 'bảng giá Paris phải khớp ảnh tham chiếu');
assert.deepEqual(paris.values.map((_, level) => G.value(paris.i, level)), paris.values, 'engine phải dùng bảng giá tuyệt đối của Paris');
const osaka = R.TILES.find((tile) => tile.name === 'Osaka');
assert.deepEqual(osaka.values, [350, 550, 750, 950, 1450], 'bảng giá Osaka phải khớp ảnh tham chiếu');
assert.deepEqual(osaka.values.map((_, level) => G.value(osaka.i, level)), osaka.values, 'engine phải dùng bảng giá tuyệt đối của Osaka');
const tokyo = R.TILES.find((tile) => tile.name === 'Tokyo');
assert.deepEqual(tokyo.values, [400, 600, 800, 1000, 1500], 'bảng giá Tokyo phải khớp ảnh tham chiếu');
assert.deepEqual(tokyo.values.map((_, level) => G.value(tokyo.i, level)), tokyo.values, 'engine phải dùng bảng giá tuyệt đối của Tokyo');
assert.equal(R.CONFIG.RESORT_PRICE, 200, 'giá đất resort phải là 200K');
assert.deepEqual(R.CONFIG.RESORT_TOLL, [0, 25, 50, 100, 200], 'tiền thuê theo 1–4 resort phải khớp bảng Bali');
assert.equal(R.CONFIG.BONUS_MULT, 2, 'ba ô lễ hội đầu ván phải nhân đôi tiền thuê');
assert.equal(R.CONFIG.MAX_RENT_MULT, 10, 'hệ số thuê tổng phải bị chặn ở ×10');
assert.equal(R.CONFIG.CHAMP_MOVE_FEE, 50, 'chuyển Championships sang ô khác phải tốn 50K');

// giá trị rnd cho ra đúng mặt xúc xắc / đúng thẻ (theo trọng số trong rules.js)
const expectedCityRents = {
  Granada: [2, 25, 50, 75, 150],
  Seville: [2, 28, 55, 83, 165],
  Madrid: [4, 30, 60, 90, 180],
  'Hong Kong': [6, 33, 65, 98, 195],
  Beijing: [6, 35, 75, 105, 210],
  Shanghai: [8, 38, 75, 113, 225],
  Venice: [10, 70, 140, 210, 385],
  Milan: [10, 75, 150, 225, 413],
  Rome: [12, 80, 160, 240, 440],
  Hamburg: [14, 85, 170, 255, 468],
  Berlin: [16, 90, 180, 270, 495],
  London: [18, 113, 225, 338, 619],
  Sydney: [20, 120, 240, 360, 660],
  Chicago: [22, 128, 255, 383, 701],
  'Las Vegas': [22, 135, 270, 405, 743],
  'New York': [24, 143, 285, 428, 784],
  Lyon: [26, 170, 340, 510, 935],
  Paris: [28, 180, 360, 540, 990],
  Osaka: [35, 190, 380, 570, 1045],
  Tokyo: [50, 200, 400, 600, 1100],
};
for (const [name, expectedRents] of Object.entries(expectedCityRents)) {
  const tile = R.TILES.find((candidate) => candidate.name === name);
  assert.deepEqual(tile.rents, expectedRents, `rent table for ${name} must match Business Tour`);
  assert.deepEqual(
    tile.rents.map((_, level) => G.toll(tile.i, level)),
    expectedRents,
    `engine must use the absolute rent table for ${name}`,
  );
}

const dieR = (v) => (v - 0.5) / 6;
function cardR(id) {
  const total = R.CARDS.reduce((a, c) => a + c.w, 0); let acc = 0;
  for (const c of R.CARDS) { if (c.id === id) return (acc + c.w / 2) / total; acc += c.w; }
  throw new Error('Không có thẻ ' + id);
}

function build(setup) {
  const s = G.createState(); s.settings.timeLimitMin = 0; s.settings.turnSec = 0;
  G.addPlayer(s, { id: 'me', token: 't1', name: 'Me' }); G.addPlayer(s, { id: 'op', token: 't2', name: 'Op' });
  s.players.forEach((p) => { p.ready = true; });
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

{
  const s = build({ bonus: [3], festival: 3, festLevel: 9, props: { 1: ['op', 0], 2: ['op', 0], 3: ['op', 1] } });
  assert.equal(G.rentMultiplier(s, 3), 10, 'lễ hội + monopoly + Championships không được vượt ×10');
  assert.equal(G.rentOf(s, 3), G.toll(3, 1) * 10, 'engine phải áp dụng hệ số thuê đã chặn');
}

{
  const s = build({ props: { 1: ['op', 0], 2: ['op', 0], 3: ['op', 0] } });
  const original = R.CONFIG.MONOPOLY_MULT;
  try {
    R.CONFIG.MONOPOLY_MULT = 3;
    assert.equal(G.rentMultiplier(s, 3), 3, 'engine phải đọc hệ số monopoly từ rules.js, không cộng cứng +1');
  } finally { R.CONFIG.MONOPOLY_MULT = original; }
}

{
  const s = build({ step: 'tour' }), p = G.byId(s, 'me');
  s.props[3] = { owner: 'me', level: 1 };
  assert.ok(G.tourTargets(s, p).includes(3), 'World Tour phải cho bay tới thành phố của mình dù vẫn còn thành phố trống');
  assert.ok(G.tourTargets(s, p).every((i) => R.TILES[i].type === 'city' && (!s.props[i] || s.props[i].owner === p.id)), 'World Tour chỉ nhận thành phố trống hoặc thành phố của mình');
  const before = p.money;
  G.act(s, p.id, 'tour', { tile: 3 });
  assert.equal(p.pos, 3, 'World Tour phải thực sự di chuyển vào thành phố của mình');
  assert.equal(p.money, before - R.CONFIG.TOUR_FEE, 'bay về thành phố của mình vẫn phải trả vé World Tour');
  assert.equal(s.step.kind, 'upgrade', 'bay về thành phố của mình phải giải quyết ô và cho nâng cấp như khi dừng bình thường');
  for (const tile of R.TILES.filter((t) => t.type === 'city')) s.props[tile.i] = { owner: tile.i === 3 ? 'me' : 'op', level: 0 };
  assert.deepEqual(G.tourTargets(s, p), [3], 'World Tour không được bay tới thành phố của người khác');
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
  if ('escapeCards' in e) eq('thẻ Thoát đảo', me.escapeCards, e.escapeCards);
  if ('tourPending' in e && me.tourPending !== e.tourPending) bad.push('vé World Tour sai');
  if ('festival' in e) eq('ô lễ hội', s.festival, e.festival);
  if ('festLevel' in e) eq('bậc lễ hội', s.festLevel, e.festLevel);
  if ('outage' in e && !(s.outage && s.outage[e.outage])) bad.push('ô chưa bị mất điện');
  if ('pending' in e) eq('khoản treo', s.pending ? s.pending.amount : 0, e.pending);
  if ('notice' in e && !(s.notice && s.notice.kind === e.notice && s.notice.pid === 'me')) bad.push(`thiếu thông báo ${e.notice}`);
  if ('reaction' in e) { const [pid, kind] = e.reaction; if (!(s.reaction && s.reaction.pid === pid && s.reaction.kind === kind)) bad.push(`thiếu phản ứng ${kind} của ${pid}`); }
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

// Ca hồi quy đúng ví dụ 3M nợ, 1M tiền mặt, thanh lý toàn bộ được thêm 1M:
// phá sản ngay và bán hết rồi phá sản phải chuyển cùng 2M cho chủ nợ.
{
  const assets = [[1, 0], [2, 0], [3, 0], [5, 4], [27, 4]]; // 30 + 30 + 30 + 200 + 710 = 1.000K
  const scenario = (sellFirst) => {
    const s = build({ step: 'debt' }), me = G.byId(s, 'me'), op = G.byId(s, 'op');
    me.money = 1000; op.money = 0; s.props = {};
    for (const [tile, level] of assets) s.props[tile] = { owner: 'me', level };
    assert.equal(assets.reduce((sum, [tile]) => sum + G.sellValue(s, tile), 0), 1000, 'tài sản mẫu phải thanh lý được đúng 1M');
    s.pending = { from: 'me', to: 'op', amount: 3000, why: 'tiền thuê kiểm thử' };
    s.step = { kind: 'debt' };
    if (sellFirst) for (const [tile] of assets) G.act(s, 'me', 'sell', { tile });
    G.act(s, 'me', 'bankrupt');
    return { received: op.money, cash: me.money, properties: G.ownedBy(s, 'me').length };
  };
  const direct = scenario(false), afterAutoSell = scenario(true);
  assert.deepEqual(direct, { received: 2000, cash: 0, properties: 0 }, 'phá sản ngay phải thanh lý tài sản và trả 2M');
  assert.deepEqual(afterAutoSell, direct, 'bán tự động rồi phá sản phải trả đúng bằng phá sản ngay');
}
if (fail) { console.error(`\nLỆCH LUẬT: ${fail}/${R.DECISIONS.length} dòng bảng quyết định không khớp engine.`); process.exit(1); }
console.log(`OK luật v${R.VERSION}: ${R.DECISIONS.length}/${R.DECISIONS.length} dòng bảng quyết định khớp engine`);

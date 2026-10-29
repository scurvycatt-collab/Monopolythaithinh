const assert = require('node:assert/strict');
const G = require('../public/game.js');

function fresh(mapId) {
  const s = G.createState();
  G.setSettings(s, { mapId, timeLimitMin: 60, turnSec: 30 });
  const pets = G.petsForMap(mapId);
  pets.forEach((pet, i) => G.addPlayer(s, { id: `p${i}`, token: `t${i}`, name: `${mapId}-${i}`, pet: pet.id }));
  s.players.slice(1).forEach((p) => G.setReady(s, p.id, true));
  G.setRng(() => 0);
  G.startGame(s);
  const p = G.byId(s, 'p0');
  s.turn = s.players.findIndex((x) => x.id === p.id);
  s.moves = []; s.lastCard = null; s.notice = null; s.seq = 0;
  return { s, p };
}

function drawMovementCard(mapId, cardIndex, confirmAction, destination) {
  const { s, p } = fresh(mapId);
  p.pos = 10; s.step = { kind: 'roll' };
  const random = [0, 0, (cardIndex + 0.1) / G.RULES.CARDS.length];
  G.setRng(() => random.shift() ?? 0);
  G.act(s, p.id, 'roll');
  assert.equal(p.pos, 12, `${mapId}: phải dừng ở Chance trước`);
  assert.equal(s.step.kind, confirmAction, `${mapId}: phải chờ xác nhận thẻ`);
  assert.ok(s.lastCard, `${mapId}: phải lưu thẻ vừa rút để UI hiển thị`);
  const chanceMove = s.moves.at(-1);
  assert.equal(chanceMove.path.at(-1), 12, `${mapId}: movement đầu phải kết thúc tại Chance`);
  assert.ok(chanceMove.seq < s.lastCard.seq, `${mapId}: tới Chance phải đứng trước popup thẻ trong timeline`);
  const cardSeq = s.lastCard.seq;
  G.act(s, p.id, confirmAction);
  const destinationMove = s.moves.at(-1);
  assert.equal(p.pos, destination, `${mapId}: xác nhận xong mới tới ô đích`);
  assert.equal(destinationMove.path.at(-1), destination, `${mapId}: movement sau xác nhận phải đúng đích`);
  assert.ok(cardSeq < destinationMove.seq, `${mapId}: popup thẻ phải đứng trước movement tới đích`);
}

for (const map of G.MAPS) {
  drawMovementCard(map.id, 5, 'hostFestival', G.RULES.CONFIG.FESTIVAL_IDX);
  drawMovementCard(map.id, 6, 'flight', G.RULES.CONFIG.TOUR_IDX);

  {
    const { s, p } = fresh(map.id);
    p.island = 2; p.escapeCards = 2; s.step = { kind: 'island' };
    G.act(s, p.id, 'useCard');
    assert.equal(p.escapeCards, 1, `${map.id}: dùng đúng một thẻ thoát đảo`);
    assert.equal(s.notice && s.notice.kind, 'escapeUsed', `${map.id}: dùng thẻ phải tạo thông báo chung`);
  }

  {
    const { s, p } = fresh(map.id);
    const other = s.players.find((x) => x.id !== p.id);
    for (const tile of G.RULES.TILES.filter((x) => x.type === 'city')) s.props[tile.i] = { owner: other.id, level: 0 };
    s.props[1] = { owner: p.id, level: 0 };
    p.pos = G.RULES.CONFIG.TOUR_IDX; p.tourPending = true; p.money = 2000; s.step = { kind: 'tour' };
    assert.ok(G.tourTargets(s, p).includes(1), `${map.id}: World Tour phải cho chọn đất của chính mình`);
    G.act(s, p.id, 'tour', { tile: 1 });
    assert.equal(p.pos, 1, `${map.id}: World Tour phải bay được vào đất của chính mình`);
  }
}

G.setRng(Math.random);
console.log(`Map parity engine tests passed for ${G.MAPS.length} maps.`);

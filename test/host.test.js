'use strict';
const assert = require('assert');
const G = require('../public/game.js');

const s = G.createState();
G.addPlayer(s, { id: 'host', token: 't1', name: 'Host' });
G.addPlayer(s, { id: 'guest', token: 't2', name: 'Guest' });
assert.strictEqual(s.hostId, 'host', 'người đầu tiên phải là host');
assert.strictEqual(G.isHost(s, 'guest'), false, 'người vào sau không phải host');
assert.strictEqual(G.byName(s, '  HOST  ').id, 'host', 'username cũ phải tìm đúng ghế không phân biệt hoa thường');
const panda = G.PETS.find((pet) => pet.id === 'animal-panda');
assert.strictEqual(panda.c, '#f4c430', 'màu sở hữu của Gấu trúc phải là vàng');
s.players[0].pet = panda.id; s.players[0].color = '#f5a20a';
G.ensureHost(s);
assert.strictEqual(s.players[0].color, panda.c, 'room cũ phải được nâng cấp từ cam sang vàng');
assert.ok(G.CARDS.every((card) => card.w === G.CARDS[0].w), 'mọi thẻ Chance phải có tỷ lệ bằng nhau');
assert.strictEqual(s.settings.mapId, 'map-1', 'Map 1 phải là map mặc định');
G.setSettings(s, { mapId: 'map-1' });
assert.strictEqual(s.settings.mapId, 'map-1');
G.setSettings(s, { mapId: 'map-khong-ton-tai' });
assert.strictEqual(s.settings.mapId, 'map-1', 'map không hợp lệ phải bị bỏ qua');
{
  const h = G.createState();
  ['a', 'b', 'c'].forEach((id) => G.addPlayer(h, { id, token: 't' + id, name: id.toUpperCase() }));
  const online = new Set(['b', 'c']);
  const on = (id) => online.has(id);
  assert.strictEqual(G.handoverHost(h, on, () => G.CFG.HOST_HANDOVER_SEC - 1), false, 'host offline chưa đủ 60 giây thì giữ quyền');
  assert.strictEqual(G.handoverHost(h, on, () => G.CFG.HOST_HANDOVER_SEC), true, 'host offline đủ 60 giây thì chuyển quyền');
  assert.strictEqual(h.hostId, 'b', 'quyền host sang người online kế tiếp');
  online.clear();
  assert.strictEqual(G.handoverHost(h, on, () => 999), false, 'không ai online thì không chuyển');
  online.add('a');
  assert.strictEqual(G.handoverHost(h, on, () => 999), true);
  assert.strictEqual(h.hostId, 'a', 'vòng lại đầu danh sách khi người phía sau đều offline');
}
G.removePlayer(s, 'host');
assert.strictEqual(s.hostId, 'guest', 'host rời lobby phải chuyển quyền cho người kế tiếp');
G.removePlayer(s, 'guest');
assert.strictEqual(s.hostId, null, 'room trống không có host');

function achievementState() {
  const state = G.createState();
  G.addPlayer(state, { id: 'p1', token: 'ta', name: 'An' });
  G.addPlayer(state, { id: 'p2', token: 'tb', name: 'Bình' });
  return state;
}
function own(state, indexes, pid = 'p1') {
  indexes.forEach((i) => { state.props[i] = { owner: pid, level: 0 }; });
}

const mono = achievementState();
const groupIds = Object.keys(G.GROUPS);
const groupTiles = (group) => G.TILES.filter((tile) => tile.group === group).map((tile) => tile.i);
own(mono, groupTiles(groupIds[0]));
G.checkWin(mono, mono.players[0]);
assert.ok(mono.achievements.some((x) => x.kind === 'monopoly' && x.group === groupIds[0]), 'hoàn thành một vùng phải tạo màn chúc mừng Monopoly');
own(mono, groupTiles(groupIds[1]));
G.checkWin(mono, mono.players[0]);
assert.ok(mono.achievements.some((x) => x.kind === 'tripleReady'), 'có 2/3 vùng phải cảnh báo sắp thắng Triple Monopoly');
const tripleCount = mono.achievements.filter((x) => x.kind === 'tripleReady').length;
G.checkWin(mono, mono.players[0]);
assert.strictEqual(mono.achievements.filter((x) => x.kind === 'tripleReady').length, tripleCount, 'mỗi cảnh báo Triple chỉ được phát một lần');

const line = achievementState();
own(line, G.SIDES[0].slice(0, -1));
G.checkWin(line, line.players[0]);
const lineReady = line.achievements.find((x) => x.kind === 'lineReady' && x.side === 0);
assert.deepStrictEqual(lineReady.missing, G.SIDES[0].slice(-1), 'cảnh báo Line phải nêu đúng ô còn thiếu');
assert.ok(lineReady.sideName, 'cảnh báo Line phải có tên cạnh bàn cờ');

const resort = achievementState();
own(resort, G.RESORTS.slice(0, -1));
G.checkWin(resort, resort.players[0]);
const resortReady = resort.achievements.find((x) => x.kind === 'resortReady');
assert.deepStrictEqual(resortReady.missing, G.RESORTS.slice(-1), 'cảnh báo Resort phải nêu đúng bãi biển còn thiếu');

console.log('Host ownership tests passed.');

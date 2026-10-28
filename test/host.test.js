'use strict';
const assert = require('assert');
const G = require('../public/game.js');

const s = G.createState();
G.addPlayer(s, { id: 'host', token: 't1', name: 'Host' });
G.addPlayer(s, { id: 'guest', token: 't2', name: 'Guest' });
assert.strictEqual(s.hostId, 'host', 'người đầu tiên phải là host');
assert.strictEqual(s.players.every((p) => !p.ready), true, 'khách thật bắt đầu ở trạng thái chưa sẵn sàng');
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
const bot = G.addBot(s, { id: 'bot1' });
assert.strictEqual(bot.bot, true, 'bot phải được đánh dấu riêng trong state');
assert.strictEqual(bot.ready, true, 'bot phải luôn sẵn sàng trong phòng chờ');
assert.strictEqual(bot.token, null, 'bot không được có token đăng nhập');
assert.strictEqual(s.hostId, 'host', 'thêm bot không được thay đổi host');
assert.ok(!Object.prototype.hasOwnProperty.call(G.publicView(s).players.find((p) => p.id === bot.id), 'token'), 'public state của bot không được lộ trường token');
G.removeBot(s, bot.id);
G.removePlayer(s, 'host');
assert.strictEqual(s.hostId, 'guest', 'host rời lobby phải chuyển quyền cho người kế tiếp');
G.removePlayer(s, 'guest');
assert.strictEqual(s.hostId, null, 'room trống không có host');

const readyRoom = G.createState();
G.addPlayer(readyRoom, { id: 'r1', token: 'r1', name: 'Một' });
G.addPlayer(readyRoom, { id: 'r2', token: 'r2', name: 'Hai' });
assert.throws(() => G.startGame(readyRoom), /sẵn sàng/, 'không được bắt đầu khi còn khách chưa sẵn sàng');
assert.throws(() => G.setReady(readyRoom, 'r1', true), /Host không cần/, 'host không có trạng thái sẵn sàng');
G.setReady(readyRoom, 'r2', true);
G.startGame(readyRoom);
assert.strictEqual(readyRoom.phase, 'play', 'đủ người sẵn sàng thì được bắt đầu');

const botTurn = G.createState();
G.addPlayer(botTurn, { id: 'human', token: 'h', name: 'Người' });
const buyerBot = G.addBot(botTurn, { id: 'buyer-bot' });
botTurn.phase = 'play'; botTurn.turn = 1; botTurn.step = { kind: 'buy' };
buyerBot.pos = G.TILES.find((tile) => tile.type === 'city').i; buyerBot.laps = 3;
const [botType, botData] = G.botAction(botTurn);
assert.strictEqual(botType, 'buy', 'bot phải biết mua thành phố thay vì luôn bỏ qua như chế độ đi hộ');
assert.ok(botData.level >= 0 && botData.level <= 3, 'bot phải chọn cấp xây hợp lệ');

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

const botGame = G.createState();
for (let i = 0; i < 4; i++) G.addBot(botGame, { id: `sim-bot-${i}` });
G.setSettings(botGame, { roundLimit: 15, turnSec: 0 });
let seed = 17; G.setRng(() => ((seed = (seed * 48271) % 2147483647) - 1) / 2147483646);
G.startGame(botGame);
let botActions = 0, botOwned = false;
while (botGame.phase === 'play' && botActions++ < 10000) {
  const p = G.cur(botGame), [type, data] = G.botAction(botGame);
  G.act(botGame, p.id, type, data);
  if (Object.keys(botGame.props).length) botOwned = true;
}
assert.strictEqual(botGame.phase, 'over', 'một ván toàn bot phải tự chạy tới kết thúc mà không kẹt state');
assert.ok(botOwned, 'bot phải thực sự mua tài sản trong ván mô phỏng');

console.log('Host ownership tests passed.');

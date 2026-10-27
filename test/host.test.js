'use strict';
const assert = require('assert');
const G = require('../public/game.js');

const s = G.createState();
G.addPlayer(s, { id: 'host', token: 't1', name: 'Host' });
G.addPlayer(s, { id: 'guest', token: 't2', name: 'Guest' });
assert.strictEqual(s.hostId, 'host', 'người đầu tiên phải là host');
assert.strictEqual(G.isHost(s, 'guest'), false, 'người vào sau không phải host');
assert.strictEqual(G.byName(s, '  HOST  ').id, 'host', 'username cũ phải tìm đúng ghế không phân biệt hoa thường');
assert.strictEqual(s.settings.mapId, 'map-1', 'Map 1 phải là map mặc định');
G.setSettings(s, { mapId: 'map-1' });
assert.strictEqual(s.settings.mapId, 'map-1');
G.setSettings(s, { mapId: 'map-khong-ton-tai' });
assert.strictEqual(s.settings.mapId, 'map-1', 'map không hợp lệ phải bị bỏ qua');
G.removePlayer(s, 'host');
assert.strictEqual(s.hostId, 'guest', 'host rời lobby phải chuyển quyền cho người kế tiếp');
G.removePlayer(s, 'guest');
assert.strictEqual(s.hostId, null, 'room trống không có host');

console.log('Host ownership tests passed.');

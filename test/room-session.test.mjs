import assert from 'node:assert/strict';
import { createRoomCode, normalizeRoom, roomEndpoint, selectRoomCode, validRoom } from '../public/js/room-session.mjs';

assert.equal(normalizeRoom('  Gia Đình Thái Thịnh  '), 'gia-dinh-thai-thinh');
assert.equal(normalizeRoom('../ABC___123'), 'abc-123');
assert.equal(validRoom('abc'), true);
assert.equal(validRoom('ab'), false);
assert.equal(validRoom('ABC'), false);

const room = createRoomCode({ getRandomValues(bytes) { bytes.set([0, 1, 2, 3, 4, 5]); return bytes; } });
assert.equal(room, 'abcdef');
assert.equal(validRoom(room), true);
assert.equal(selectRoomCode('Phong Gia Dinh', true), 'phong-gia-dinh');
assert.equal(selectRoomCode('Phong Gia Dinh', false), 'phong-gia-dinh');
assert.equal(selectRoomCode('', true, { getRandomValues(bytes) { bytes.set([0, 1, 2, 3, 4, 5]); return bytes; } }), 'abcdef');
assert.equal(
  roomEndpoint('https://game.nauagency.asia/monopolyThaithinh/?low', 'events', 'gia-dinh', { token: 'abc' }),
  'https://game.nauagency.asia/monopolyThaithinh/events?room=gia-dinh&token=abc',
);

console.log('Room session tests passed.');

import assert from 'node:assert/strict';
import { BASE_PATH, resolveAppPath, validRoomKey } from '../cloudflare/pathing.mjs';

assert.equal(BASE_PATH, '/monopolyThaithinh');
assert.deepEqual(resolveAppPath('/monopolyThaithinh'), {
  basePath: BASE_PATH,
  pathname: '/',
  redirectPath: '/monopolyThaithinh/',
});
assert.deepEqual(resolveAppPath('/monopolyThaithinh/api/info'), {
  basePath: BASE_PATH,
  pathname: '/api/info',
  redirectPath: null,
});
assert.deepEqual(resolveAppPath('/monopolyThaithinh/models/bundle.json'), {
  basePath: BASE_PATH,
  pathname: '/models/bundle.json',
  redirectPath: null,
});
assert.deepEqual(resolveAppPath('/health'), {
  basePath: '',
  pathname: '/health',
  redirectPath: null,
});
assert.deepEqual(resolveAppPath('/monopolyThaithinh-other'), {
  basePath: '',
  pathname: '/monopolyThaithinh-other',
  redirectPath: null,
});
assert.equal(validRoomKey('gia-dinh'), true);
assert.equal(validRoomKey('abc'), true);
assert.equal(validRoomKey('ab'), false);
assert.equal(validRoomKey('PhOng'), false);
assert.equal(validRoomKey('../main'), false);

console.log('Cloudflare base-path tests passed.');

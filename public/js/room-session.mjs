const ROOM_MAX = 24;

export function normalizeRoom(value) {
  return String(value || '')
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .slice(0, ROOM_MAX)
    .replace(/-+$/g, '');
}

export function validRoom(value) {
  return /^[a-z0-9][a-z0-9-]{2,23}$/.test(value);
}

export function createRoomCode(random = crypto) {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(6);
  random.getRandomValues(bytes);
  return [...bytes].map((n) => alphabet[n % alphabet.length]).join('');
}

export function roomEndpoint(baseHref, path, room, params = {}) {
  const url = new URL(path, baseHref);
  if (room) url.searchParams.set('room', room);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') url.searchParams.set(key, value);
  }
  return url.toString();
}

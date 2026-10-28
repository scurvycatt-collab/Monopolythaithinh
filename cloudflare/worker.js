/* Thái Thịnh Monopoly — bản chạy trên Cloudflare Workers.
   - Giao diện (thư mục public/) do Workers Static Assets phục vụ.
   - Ván chơi nằm trong một Durable Object (GameRoom): luật chơi, lưu ván, SSE, đi hộ, hết giờ.
   - Cùng API với server.js (/events, /api/join, /api/claim, /api/act, /api/info, /health) nên client không cần sửa.
   - Luật chơi dùng chung đúng 2 file public/rules.js + public/game.js (nguồn sự thật duy nhất). */
import { DurableObject } from 'cloudflare:workers';
import Game from '../public/game.js'; // wrangler đóng gói cả rules.js mà game.js require
import { resolveAppPath, validRoomKey } from './pathing.mjs';

const G = Game;
const C = G.RULES.CONFIG;
const EMPTY_ROOM_TTL_MS = 2 * 60 * 1000;
const enc = new TextEncoder();
const json = (code, obj) => new Response(JSON.stringify(obj), { status: code, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const hex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const route = resolveAppPath(url.pathname);
    if (route.redirectPath) {
      url.pathname = route.redirectPath;
      return Response.redirect(url.toString(), 308);
    }

    url.pathname = route.pathname;
    const routedReq = new Request(url.toString(), req);
    if (route.basePath) routedReq.headers.set('X-Thai-Thinh-Base-Path', route.basePath);

    // Health check không chạm Durable Object: mở trang chờ không làm phòng game thức dậy.
    if (url.pathname === '/health') return json(200, { app: 'thai-thinh-monopoly', host: 'cloudflare', rooms: true });
    if (url.pathname === '/events' || url.pathname.startsWith('/api/')) {
      // Mỗi room code ánh xạ tới một Durable Object tách biệt.
      const room = url.searchParams.get('room') || 'main';
      if (room !== 'main' && !validRoomKey(room)) return json(400, { error: 'Mã phòng không hợp lệ' });
      return env.ROOM.get(env.ROOM.idFromName(room)).fetch(routedReq);
    }
    return env.ASSETS.fetch(routedReq);
  },
};

export class GameRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.state = null;
    this.clients = new Set();          // { writer, pid }
    this.conns = new Map();            // id người chơi -> số kết nối đang mở
    this.offlineSince = new Map();     // id người chơi -> thời điểm mất kết nối
    this.emptySince = null;
    ctx.blockConcurrencyWhile(async () => {
      const [saved, emptySince] = await Promise.all([ctx.storage.get('state'), ctx.storage.get('emptySince')]);
      const base = G.createState();
      this.state = saved ? Object.assign(base, saved, { settings: Object.assign(base.settings, saved.settings || {}) }) : base;
      G.ensureHost(this.state); // nâng cấp room cũ chưa có hostId
      const now = Date.now();
      this.state.players.forEach((p) => this.offlineSince.set(p.id, now));
      if (this.state.players.length) {
        this.emptySince = Number(emptySince) || now;
        if (!emptySince) await ctx.storage.put('emptySince', this.emptySince);
        await this.schedule();
      }
    });
  }

  /* ---------- trạng thái & phát sóng ---------- */
  isOnline(id) { return (this.conns.get(id) || 0) > 0; }
  hasOnlinePlayers() { return this.state.players.some((p) => this.isOnline(p.id)); }
  offlineSec(id) { return this.isOnline(id) ? 0 : (Date.now() - (this.offlineSince.get(id) || Date.now())) / 1000; }
  presence() {
    const o = {};
    for (const p of this.state.players) o[p.id] = { on: !!p.bot || this.isOnline(p.id), bot: !!p.bot, since: p.bot || this.isOnline(p.id) ? 0 : (this.offlineSince.get(p.id) || Date.now()) };
    return o;
  }
  viewers() { return [...new Set([...this.clients].filter((c) => !c.pid && c.viewer).map((c) => c.viewer))]; }
  payload() { return `data: ${JSON.stringify({ state: G.publicView(this.state), presence: this.presence(), viewers: this.viewers(), now: Date.now(), proxySec: C.PROXY_SEC })}\n\n`; }
  send(c, text) { c.writer.write(enc.encode(text)).catch(() => this.drop(c)); }
  broadcast() { const msg = this.payload(); for (const c of this.clients) this.send(c, msg); }
  async commit() {
    this.state.version++;
    await this.ctx.storage.put('state', this.state);
    this.broadcast();
    await this.schedule();
  }
  async startEmptyGrace() {
    if (!this.state.players.length || this.hasOnlinePlayers()) return;
    this.emptySince = Date.now();
    await this.ctx.storage.put('emptySince', this.emptySince);
    await this.schedule();
  }
  async markOccupied() {
    if (this.emptySince === null) return;
    this.emptySince = null;
    await this.ctx.storage.delete('emptySince');
  }
  async deleteRoom() {
    this.state = G.createState();
    this.conns.clear(); this.offlineSince.clear(); this.emptySince = null;
    await this.ctx.storage.deleteAll();
    await this.ctx.storage.deleteAlarm();
    this.broadcast();
  }
  // đồng hồ của phòng: chỉ hẹn giờ đúng lúc có việc (hết ván, hết giờ bước, người mất kết nối tới hạn đi hộ,
  // hoặc ping 14 giây giữ kết nối) để tiết kiệm lượt gọi trên gói miễn phí của Cloudflare
  nextDeadline() {
    const s = this.state, now = Date.now(), t = [];
    if (this.clients.size) t.push((this.lastPing || now) + 14000);
    if (s.players.length && !this.hasOnlinePlayers()) {
      if (this.emptySince !== null) t.push(this.emptySince + EMPTY_ROOM_TTL_MS);
      return t.length ? Math.max(now + 250, Math.min(...t)) : null;
    }
    if (s.phase === 'play') {
      const current = G.cur(s);
      if (current && current.bot) t.push(now + 650);
      if (s.endsAt) t.push(s.endsAt);
      const left = G.stepLeft(s, now); if (left !== null) t.push(now + left);
      const p = G.cur(s), sec = s.settings.autoSec;
      if (p && sec && !this.isOnline(p.id)) t.push((this.offlineSince.get(p.id) || now) + sec * 1000);
    }
    return t.length ? Math.max(now + 250, Math.min(...t)) : null;
  }
  async schedule() {
    const cur = await this.ctx.storage.getAlarm();
    const at = this.nextDeadline();
    if (at === null) { if (cur) await this.ctx.storage.deleteAlarm(); return; }
    if (!cur || cur > at + 500) await this.ctx.storage.setAlarm(at);
  }
  async alarm() {
    const s = this.state;
    if (s.players.length && !this.hasOnlinePlayers() && this.emptySince !== null && Date.now() >= this.emptySince + EMPTY_ROOM_TTL_MS) {
      await this.deleteRoom(); return;
    }
    if (s.phase === 'play' && this.hasOnlinePlayers()) try {
      const now = Date.now();
      if (G.cur(s) && G.cur(s).bot) { this.runBot(); await this.commit(); }
      else if (G.checkTime(s, now)) await this.commit();
      else if (G.checkTurn(s, now)) await this.commit();
      else {
        const p = G.cur(s), sec = s.settings.autoSec;
        if (p && sec && this.offlineSec(p.id) >= sec) { this.runAuto('Tự động đi hộ'); await this.commit(); }
      }
    } catch (e) { console.error('Lỗi đồng hồ phòng:', e); }
    // ping giữ kết nối SSE sống qua proxy; ghi lỗi thì kết nối đó đã đóng → coi là mất kết nối
    if (!this.lastPing || Date.now() - this.lastPing >= 13500) { this.lastPing = Date.now(); for (const c of this.clients) this.send(c, `event: ping\ndata: ${Date.now()}\n\n`); }
    await this.schedule();
  }
  runAuto(reason) {
    const s = this.state, p = G.cur(s);
    s.log.push({ n: ++s.seq, t: `🤖 ${reason} cho ${p.name}` });
    for (let n = 0; n < 80 && s.phase === 'play' && G.cur(s).id === p.id; n++) { const [t, d] = G.autoAction(s); G.act(s, p.id, t, d); }
  }
  runBot() {
    const s = this.state, p = G.cur(s);
    if (!p || !p.bot) return;
    s.log.push({ n: ++s.seq, t: `🤖 ${p.name} đang đi` });
    for (let n = 0; n < 80 && s.phase === 'play' && G.cur(s).id === p.id; n++) { const [t, d] = G.botAction(s); G.act(s, p.id, t, d); }
  }

  /* ---------- HTTP ---------- */
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/health') return json(200, { app: 'thai-thinh-monopoly', phase: this.state.phase, version: this.state.version, host: 'cloudflare' });
    if (url.pathname === '/api/info' && req.method === 'GET') {
      const basePath = req.headers.get('X-Thai-Thinh-Base-Path') || '';
      const invite = new URL(`${url.origin}${basePath}/`);
      const room = url.searchParams.get('room');
      if (room) invite.searchParams.set('room', room);
      return json(200, { links: [{ kind: 'Web', url: invite.toString() }] });
    }
    if (url.pathname === '/api/watch' && req.method === 'GET') {
      if (!this.state.players.length) return json(404, { error: 'Phòng không tồn tại hoặc đã bị xoá' });
      return json(200, { exists: true });
    }
    if (url.pathname === '/events' && req.method === 'GET') return this.events(url);
    if (req.method === 'POST' && url.pathname.startsWith('/api/')) return this.api(url, req);
    return json(404, { error: 'Không có API này' });
  }

  async events(url) {
    const p = this.byToken(url.searchParams.get('token'));
    const viewer = p ? '' : String(url.searchParams.get('viewer') || '').replace(/\s+/g, ' ').trim().slice(0, 16);
    if (viewer && !this.state.players.length) return json(404, { error: 'Phòng không tồn tại hoặc đã bị xoá' });
    const { readable, writable } = new TransformStream();
    const c = { writer: writable.getWriter(), pid: p ? p.id : null, viewer };
    c.writer.closed.catch(() => this.drop(c)); // trình duyệt đóng kết nối → mất kết nối ngay
    this.clients.add(c);
    if (p) { this.conns.set(p.id, (this.conns.get(p.id) || 0) + 1); await this.markOccupied(); }
    this.send(c, 'retry: 1500\n\n');
    this.broadcast();
    this.schedule();
    return new Response(readable, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' } });
  }
  async drop(c) {
    if (!this.clients.delete(c)) return;
    try { c.writer.close(); } catch (e) { /* đã đóng */ }
    if (c.pid) {
      const n = Math.max(0, (this.conns.get(c.pid) || 1) - 1);
      this.conns.set(c.pid, n);
      if (n === 0) this.offlineSince.set(c.pid, Date.now());
      if (!this.hasOnlinePlayers()) await this.startEmptyGrace();
    }
    this.broadcast();
    await this.schedule();
  }
  byToken(t) { return t ? this.state.players.find((p) => p.token === t) : null; }

  async api(url, req) {
    let body;
    try { const text = await req.text(); if (text.length > 20000) throw new Error('Quá lớn'); body = text ? JSON.parse(text) : {}; } catch (e) { return json(400, { error: e.message === 'Quá lớn' ? e.message : 'JSON lỗi' }); }
    const s = this.state;
    try {
      if (url.pathname === '/api/join') {
        const existing = G.byName(s, body.name);
        if (existing) {
          if (existing.bot) return json(409, { error: 'Tên này đang được bot sử dụng' });
          if (this.isOnline(existing.id)) return json(409, { error: `${existing.name} đang online trên một thiết bị khác` });
          this.offlineSince.set(existing.id, Date.now());
          await this.startEmptyGrace();
          return json(200, { id: existing.id, token: existing.token, rejoined: true });
        }
        const wasEmpty = s.players.length === 0;
        const id = 'p' + hex(4), token = hex(18);
        G.addPlayer(s, { id, token, name: body.name, pet: body.pet });
        if (wasEmpty && body.mapId) G.setSettings(s, { mapId: body.mapId });
        this.offlineSince.set(id, Date.now());
        this.emptySince = Date.now();
        await this.ctx.storage.put('emptySince', this.emptySince);
        await this.commit();
        return json(200, { id, token });
      }
      if (url.pathname === '/api/claim') { // nhận lại ghế từ thiết bị khác khi ghế đó đang mất kết nối
        const p = G.byId(s, body.id);
        if (!p) return json(404, { error: 'Không tìm thấy người chơi' });
        if (this.isOnline(p.id)) return json(409, { error: `${p.name} đang online trên một thiết bị khác` });
        await this.startEmptyGrace();
        return json(200, { id: p.id, token: p.token });
      }
      if (url.pathname === '/api/act') {
        const p = this.byToken(body.token);
        if (!p) return json(401, { error: 'Bạn chưa vào phòng (hoặc phiên đã hết hạn)' });
        if (['start', 'reset', 'kick', 'settings', 'addBot', 'removeBot'].includes(body.type) && !G.isHost(s, p.id)) {
          return json(403, { error: 'Chỉ host mới được thay đổi cấu hình phòng' });
        }
        const d = body.data || {};
        switch (body.type) {
          case 'start': G.startGame(s); break;
          case 'reset': if (s.phase === 'lobby') throw new G.GameError('Đang ở phòng chờ rồi'); G.resetGame(s); break;
          case 'leave': G.removePlayer(s, p.id); break;
          case 'kick': // phòng chờ: mời ra người đã mất kết nối (ghế bỏ trống)
            if (this.isOnline(d.id)) throw new G.GameError('Người này đang online');
            G.removePlayer(s, d.id); break;
          case 'pet': G.setPet(s, p.id, d.pet); break;
          case 'rename': G.renamePlayer(s, p.id, d.name); break;
          case 'settings': G.setSettings(s, d); break;
          case 'addBot': G.addBot(s, { id: 'bot' + hex(4) }); break;
          case 'removeBot': G.removeBot(s, d.id); break;
          case 'proxy': {
            if (s.phase !== 'play') throw new G.GameError('Ván không diễn ra');
            const c = G.cur(s);
            if (c.id === p.id) throw new G.GameError('Đang là lượt của bạn');
            if (this.offlineSec(c.id) < C.PROXY_SEC) throw new G.GameError(`${c.name} vẫn đang online`);
            this.runAuto(`${p.name} đi hộ`);
            break;
          }
          default: G.act(s, p.id, body.type, d);
        }
        await this.commit();
        return json(200, { ok: true, v: s.version, state: G.publicView(s) });
      }
      return json(404, { error: 'Không có API này' });
    } catch (e) {
      if (e instanceof G.GameError) return json(400, { error: e.message });
      console.error(e);
      return json(500, { error: 'Lỗi máy chủ: ' + e.message });
    }
  }
}

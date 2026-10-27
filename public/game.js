/* Thái Thịnh Monopoly — engine luật chơi (dùng chung server và trình duyệt).
   Mọi thông số, sơ đồ trạng thái và bảng quyết định nằm ở rules.js — đây chỉ là phần thực thi.
   Đổi luật: sửa rules.js trước, rồi `npm run verify` để biết engine có lệch không. */
(function (root) {
  'use strict';
  const R = typeof module !== 'undefined' && module.exports ? require('./rules.js') : root.RULES;
  const { CONFIG: CFG, GROUPS, TILES, CARDS, PETS, MAPS, LEVEL_NAMES, STATES } = R;
  const COLORS = PETS.map((x) => ({ c: x.c, n: x.n }));

  const isBuyable = (t) => t.type === 'city' || t.type === 'resort';
  const RESORTS = TILES.filter((t) => t.type === 'resort').map((t) => t.i);
  const SIDES = [[1, 7], [9, 15], [17, 23], [25, 31]].map(([a, b]) => TILES.slice(a, b + 1).filter(isBuyable).map((t) => t.i));
  const SIDE_NAMES = ['cạnh dưới', 'cạnh trái', 'cạnh trên', 'cạnh phải'];

  let rnd = Math.random;
  const setRng = (f) => { rnd = f; };
  const die = () => 1 + Math.floor(rnd() * 6);

  class GameError extends Error {}
  const fail = (m) => { throw new GameError(m); };
  const r2 = (n) => Math.round(n * 100) / 100;
  const k = (n) => (Math.round(n * 1000)).toLocaleString('vi-VN');

  /* ---------- giá ---------- */
  // giá trị đã đầu tư (cộng dồn) của ô ở một cấp
  function value(i, level) {
    const t = TILES[i];
    if (t.type === 'resort') return t.price;
    return r2(t.values[level]);
  }
  const invested = value;
  function upgradeCost(i, from, to) { return r2(value(i, to) - value(i, from)); }
  function toll(i, level) { return r2(TILES[i].rents[level]); }
  function ownsGroup(s, pid, g) {
    return TILES.every((t, i) => t.group !== g || (s.props[i] && s.props[i].owner === pid));
  }
  const outaged = (s, i) => !!(s.outage && s.outage[i] && s.outage[i] > s.round);
  const festMult = (s) => CFG.FEST_MULT[Math.min(s.festLevel || 0, CFG.FEST_MULT.length - 1)];
  function rentOf(s, i) {
    const pr = s.props[i];
    if (!pr || outaged(s, i)) return 0;
    const t = TILES[i];
    let r;
    if (t.type === 'resort') {
      const n = RESORTS.filter((j) => s.props[j] && s.props[j].owner === pr.owner).length;
      r = CFG.RESORT_TOLL[n];
    } else {
      r = toll(i, pr.level);
      if (ownsGroup(s, pr.owner, t.group)) r *= CFG.MONOPOLY_MULT;
    }
    if (s.festival === i) r *= festMult(s);
    if (s.bonus && s.bonus.includes(i)) r *= CFG.BONUS_MULT;
    return Math.round(r * 2) / 2;                       // làm tròn 0,5K
  }
  const canTakeover = (s, i) => TILES[i].type === 'city' && s.props[i] && s.props[i].level < CFG.LANDMARK;
  function takeoverPrice(s, i) { return r2(value(i, s.props[i].level) * CFG.BUYOUT_MULT); }
  function sellValue(s, i) { return r2(value(i, s.props[i].level) * CFG.SELL_MULT); }
  function ownedBy(s, pid) {
    return Object.keys(s.props).map(Number).filter((i) => s.props[i].owner === pid).sort((a, b) => a - b);
  }
  function networth(s, p) {
    return r2(p.money + ownedBy(s, p.id).reduce((a, i) => a + value(i, s.props[i].level), 0));
  }
  const taxBase = (s, p) => Math.max(0, networth(s, p));
  // vòng đầu: tối đa Nhà 2 · đã qua Start: Nhà 3 · Khách sạn khi quay lại ô đã có Nhà 3
  function maxBuild(p) { return CFG.LAP_CAP[Math.min(p.laps || 0, CFG.LAP_CAP.length - 1)]; }
  function villaLocked(p) { return maxBuild(p) < 3; }
  function nextLevel(pr) { return pr.level + 1; }
  function canUpgrade(s, p, i) {
    const t = TILES[i], pr = s.props[i];
    if (!pr || pr.owner !== p.id || t.type !== 'city' || pr.level >= CFG.LANDMARK) return false;
    if (pr.level < 3 && pr.level >= maxBuild(p)) return false;
    return p.money >= upgradeCost(i, pr.level, pr.level + 1);
  }

  /* ---------- trạng thái ---------- */
  function createState() {
    return {
      version: 0, phase: 'lobby', hostId: null, players: [], props: {}, festival: null, festLevel: 0, outage: {}, bonus: [], turn: 0, step: null,
      dice: null, moves: [], lastCard: null, log: [], round: 1, seq: 0, again: false,
      pending: null, winner: null, winReason: null, achievements: [], milestones: {}, reaction: null, startedAt: null, endsAt: null, stepAt: null,
      settings: { mapId: MAPS[0].id, roundLimit: 0, timeLimitMin: CFG.TIME_OPTIONS[0], turnSec: CFG.TURN_SEC, autoSec: CFG.AUTO_OFFLINE_SEC },
    };
  }
  const nextSeq = (s) => ++s.seq;
  function log(s, t) {
    s.log.push({ n: nextSeq(s), t });
    if (s.log.length > 120) s.log.splice(0, s.log.length - 120);
  }
  const cur = (s) => s.players[s.turn];
  const byId = (s, id) => s.players.find((p) => p.id === id);
  const alive = (s) => s.players.filter((p) => !p.bankrupt);
  function ensureHost(s) {
    // Đồng bộ màu theo nhân vật để các room/file lưu từ phiên bản cũ cũng nhận bảng màu mới.
    s.players.forEach((p) => { const pet = PETS.find((x) => x.id === p.pet); if (pet) p.color = pet.c; });
    if (!s.hostId || !byId(s, s.hostId)) s.hostId = s.players.length ? s.players[0].id : null;
    return s.hostId;
  }
  const isHost = (s, id) => ensureHost(s) === id;

  function publicView(s) {
    const o = Object.assign({}, s);
    o.players = s.players.map((p) => { const q = Object.assign({}, p); delete q.token; return q; });
    return o;
  }

  /* ---------- phòng chờ ---------- */
  function cleanName(name) {
    name = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 16);
    if (!name) fail('Hãy nhập tên');
    return name;
  }
  function byName(s, name) {
    name = cleanName(name);
    return s.players.find((p) => p.name.toLowerCase() === name.toLowerCase()) || null;
  }
  function freePet(s, want) {
    const used = new Set(s.players.map((p) => p.pet));
    if (want && PETS.some((x) => x.id === want) && !used.has(want)) return want;
    const f = PETS.find((x) => !used.has(x.id)); return f && f.id;
  }
  function addPlayer(s, { id, token, name, pet }) {
    if (s.phase !== 'lobby') fail('Ván đang diễn ra, không thể vào thêm');
    if (s.players.length >= CFG.MAX_PLAYERS) fail('Phòng đã đủ người');
    name = cleanName(name);
    if (s.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) fail('Tên này đã có người dùng');
    if (pet && s.players.some((p) => p.pet === pet)) fail('Nhân vật này đã có người chọn');
    pet = freePet(s, pet);
    const p = { id, token, name, pet, color: PETS.find((x) => x.id === pet).c };
    resetPlayer(p);
    s.players.push(p);
    ensureHost(s);
    log(s, `${name} đã vào phòng`);
    return p;
  }
  function resetPlayer(p) {
    Object.assign(p, { money: CFG.START_MONEY, laps: 0, pos: 0, island: 0, escapeCards: 0, shields: 0, bankrupt: false, doubles: 0, tourPending: false });
  }
  function removePlayer(s, id) {
    if (s.phase !== 'lobby') fail('Chỉ rời phòng được khi chưa bắt đầu');
    const p = byId(s, id);
    s.players = s.players.filter((x) => x.id !== id);
    ensureHost(s);
    if (p) log(s, `${p.name} đã rời phòng`);
  }
  function setPet(s, id, pet) {
    if (s.phase !== 'lobby') fail('Chỉ đổi nhân vật khi chưa bắt đầu');
    const x = PETS.find((q) => q.id === pet); if (!x) fail('Nhân vật không hợp lệ');
    if (s.players.some((p) => p.id !== id && p.pet === pet)) fail('Nhân vật này đã có người chọn');
    Object.assign(byId(s, id), { pet, color: x.c });
  }
  function renamePlayer(s, id, name) {
    if (s.phase !== 'lobby') fail('Chỉ đổi tên khi chưa bắt đầu');
    name = cleanName(name);
    if (s.players.some((p) => p.id !== id && p.name.toLowerCase() === name.toLowerCase())) fail('Tên này đã có người dùng');
    byId(s, id).name = name;
  }
  function setSettings(s, o) {
    if (s.phase !== 'lobby') fail('Chỉ chỉnh khi chưa bắt đầu');
    const rl = Number(o.roundLimit), as = Number(o.autoSec), tl = Number(o.timeLimitMin), ts = Number(o.turnSec);
    if (MAPS.some((map) => map.id === o.mapId)) s.settings.mapId = o.mapId;
    if ([0, ...CFG.TURN_OPTIONS].includes(ts)) s.settings.turnSec = ts;
    if ([0, 15, 20, 30, 40].includes(rl)) s.settings.roundLimit = rl;
    if ([0, 30, 60, 120].includes(as)) s.settings.autoSec = as;
    if ([0, ...CFG.TIME_OPTIONS].includes(tl)) s.settings.timeLimitMin = tl;
  }
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function startGame(s, now) {
    if (s.phase !== 'lobby') fail('Ván đã bắt đầu');
    if (s.players.length < 2) fail('Cần ít nhất 2 người chơi');
    shuffle(s.players);
    s.players.forEach(resetPlayer);
    now = now || Date.now();
    Object.assign(s, {
      phase: 'play', props: {}, festival: null, festLevel: 0, outage: {}, turn: 0, step: null, dice: null, moves: [], lastCard: null,
      log: [], round: 1, again: false, pending: null, winner: null, winReason: null, achievements: [], milestones: {}, reaction: null,
      startedAt: now, stepAt: now, endsAt: s.settings.timeLimitMin ? now + s.settings.timeLimitMin * 60000 : null,
      bonus: shuffle(TILES.filter(isBuyable).map((t) => t.i)).slice(0, CFG.BONUS_TILES).sort((a, b) => a - b),
    });
    log(s, `Ván mới bắt đầu! Thứ tự: ${s.players.map((p) => p.name).join(' → ')}`);
    beginTurn(s);
  }
  function resetGame(s) {
    s.players.forEach(resetPlayer);
    Object.assign(s, { phase: 'lobby', props: {}, festival: null, festLevel: 0, outage: {}, bonus: [], turn: 0, step: null, dice: null, moves: [], lastCard: null, log: [], again: false, pending: null, winner: null, winReason: null, achievements: [], milestones: {}, reaction: null, round: 1, startedAt: null, endsAt: null, stepAt: null });
    log(s, 'Quay về phòng chờ');
  }

  /* ---------- kết thúc ---------- */
  function endGame(s, p, reason) {
    s.phase = 'over'; s.step = null; s.winner = p.id; s.winReason = reason;
    log(s, `🏆 ${p.name} chiến thắng — ${reason}!`);
  }
  const richest = (s) => alive(s).sort((a, b) => networth(s, b) - networth(s, a))[0];
  // gọi định kỳ (server mỗi giây, trình duyệt mỗi giây); hết giờ thì dừng ván và xếp hạng theo tổng tài sản
  function checkTime(s, now) {
    if (s.phase !== 'play' || !s.endsAt || (now || Date.now()) < s.endsAt) return false;
    endGame(s, richest(s), `giàu nhất khi hết ${fmtMin(s.settings.timeLimitMin)}`);
    return true;
  }
  const fmtMin = (m) => (m % 60 ? `${Math.floor(m / 60)} giờ ${m % 60} phút` : `${m / 60} giờ`);
  function checkOver(s) {
    const a = alive(s);
    if (a.length <= 1) { endGame(s, a[0] || s.players[0], 'các đối thủ đều đã phá sản'); return true; }
    return false;
  }
  function addAchievement(s, p, key, kind, data) {
    s.milestones = s.milestones || {};
    const id = `${p.id}:${key}`;
    if (s.milestones[id]) return;
    s.milestones[id] = true;
    s.achievements = s.achievements || [];
    s.achievements.push(Object.assign({ seq: nextSeq(s), pid: p.id, kind }, data || {}));
    if (s.achievements.length > 24) s.achievements.splice(0, s.achievements.length - 24);
  }
  function checkWin(s, p) {
    const groups = Object.keys(GROUPS).filter((g) => ownsGroup(s, p.id, g));
    groups.forEach((g) => addAchievement(s, p, `monopoly:${g}`, 'monopoly', { group: g }));
    if (groups.length === 2) addAchievement(s, p, 'triple-ready', 'tripleReady', { groups: groups.slice() });
    for (let j = 0; j < SIDES.length; j++) {
      const owned = SIDES[j].filter((i) => s.props[i] && s.props[i].owner === p.id).length;
      if (owned === SIDES[j].length - 1) addAchievement(s, p, `line-ready:${j}`, 'lineReady', { side: j, sideName: SIDE_NAMES[j], missing: SIDES[j].filter((i) => !s.props[i] || s.props[i].owner !== p.id) });
    }
    const ownedResorts = RESORTS.filter((i) => s.props[i] && s.props[i].owner === p.id);
    if (ownedResorts.length === RESORTS.length - 1) addAchievement(s, p, 'resort-ready', 'resortReady', { missing: RESORTS.filter((i) => !s.props[i] || s.props[i].owner !== p.id) });
    if (groups.length >= 3) {
      endGame(s, p, `độc quyền 3 vùng (${groups.map((g) => GROUPS[g].name).join(', ')})`);
      return true;
    }
    if (RESORTS.every((i) => s.props[i] && s.props[i].owner === p.id)) {
      endGame(s, p, 'độc quyền cả 4 bãi biển');
      return true;
    }
    for (let j = 0; j < SIDES.length; j++) {
      if (SIDES[j].every((i) => s.props[i] && s.props[i].owner === p.id)) {
        endGame(s, p, `độc quyền trọn ${SIDE_NAMES[j]} bàn cờ`);
        return true;
      }
    }
    return false;
  }

  /* ---------- lượt chơi ---------- */
  function beginTurn(s) {
    const p = cur(s);
    p.doubles = 0;
    s.again = false;
    if (p.tourPending) s.step = { kind: 'tour' };
    else if (p.island > 0) s.step = { kind: 'island' };
    else s.step = { kind: 'roll' };
  }
  function nextTurn(s) {
    s.step = null;
    if (s.phase !== 'play' || checkOver(s)) return;
    const n = s.players.length;
    let i = s.turn;
    do {
      i = (i + 1) % n;
      if (i === 0) {
        s.round++;
        for (const t in s.outage) if (s.outage[t] <= s.round) delete s.outage[t];
      }
    } while (s.players[i].bankrupt);
    s.turn = i;
    if (s.settings.roundLimit && s.round > s.settings.roundLimit) {
      endGame(s, richest(s), `giàu nhất sau ${s.settings.roundLimit} vòng`);
      return;
    }
    beginTurn(s);
  }
  function finish(s) {
    if (s.phase !== 'play') return;
    const p = cur(s);
    if (s.pending) { s.step = { kind: 'debt' }; return; }
    if (s.again && p.island === 0 && !p.bankrupt) {
      s.step = { kind: 'roll', again: true };
      return;
    }
    nextTurn(s);
  }
  // Trả tiền. Đủ tiền: chuyển ngay. Không đủ: khoản này TREO (s.pending), chưa ai mất/nhận tiền;
  // người trả phải bán đất (bước debt) cho đủ rồi mới chuyển, hoặc phá sản.
  function transfer(from, to, amt) { from.money = r2(from.money - amt); if (to) to.money = r2(to.money + amt); }
  function pay(s, from, to, amt, why) {
    amt = r2(amt);
    if (from.money >= amt) { transfer(from, to, amt); return true; }
    s.pending = { from: from.id, to: to ? to.id : null, amount: amt, why: why || '' };
    s.notice = { seq: nextSeq(s), pid: from.id, kind: 'cantPay' };   // giao diện: "Bạn không có đủ tiền thanh toán"
    log(s, `${from.name} không đủ ${k(amt)} để trả ${why || ''} — phải bán tài sản`);
    return false;
  }
  function settle(s) { // đủ tiền thì trả khoản treo
    const d = s.pending, from = byId(s, d.from), to = d.to ? byId(s, d.to) : null;
    if (from.money < d.amount) return false;
    transfer(from, to, d.amount);
    if (to && /^tiền thuê /.test(d.why || '')) s.reaction = { seq: nextSeq(s), pid: to.id, kind: 'happyRent' };
    log(s, `${from.name} đã trả ${k(d.amount)}${to ? ' cho ' + to.name : ''}`);
    s.pending = null;
    return true;
  }
  function recordMove(s, p, from, path, jump) {
    s.moves.push({ seq: nextSeq(s), pid: p.id, from, path, jump: !!jump });
    if (s.moves.length > 8) s.moves.splice(0, s.moves.length - 8);
  }
  function moveBy(s, p, n) {
    const from = p.pos, path = [], dir = n >= 0 ? 1 : -1;
    for (let j = 0; j < Math.abs(n); j++) {
      p.pos = (p.pos + dir + 32) % 32;
      path.push(p.pos);
      if (dir > 0 && p.pos === 0) { p.laps = (p.laps || 0) + 1; p.money = r2(p.money + CFG.SALARY); log(s, `${p.name} đi qua Start, nhận lương ${k(CFG.SALARY)}`); }
    }
    recordMove(s, p, from, path, false);
  }
  function moveTo(s, p, dest) {
    const steps = (dest - p.pos + 32) % 32;
    if (steps) moveBy(s, p, steps);
  }
  function goIsland(s, p) {
    const from = p.pos;
    p.pos = CFG.ISLAND_IDX; p.island = CFG.ISLAND_TURNS; p.tourPending = false; s.again = false;
    recordMove(s, p, from, [p.pos], true);
    log(s, `${p.name} bị kẹt ở Lost Island ${CFG.ISLAND_TURNS} lượt`);
  }
  function setDice(s, a, b) { s.dice = { a, b, seq: nextSeq(s) }; }

  function rollNormal(s, p) {
    const a = die(), b = die(), dbl = a === b;
    setDice(s, a, b);
    log(s, `${p.name} đổ ${a} + ${b} = ${a + b}${dbl ? ' — đôi!' : ''}`);
    if (dbl) {
      p.doubles++;
      if (p.doubles >= CFG.MAX_DOUBLES) {
        log(s, `${p.name} đổ đôi ${CFG.MAX_DOUBLES} lần liên tiếp!`);
        goIsland(s, p);
        return nextTurn(s);
      }
    }
    s.again = dbl;
    s.step = null;
    moveBy(s, p, a + b);
    resolve(s, p);
  }
  function rollIsland(s, p) {
    const a = die(), b = die();
    setDice(s, a, b);
    s.again = false;
    if (a === b) {
      p.island = 0;
      log(s, `${p.name} đổ ${a} + ${b} — đôi! Thoát khỏi Lost Island`);
    } else {
      p.island--;
      if (p.island > 0) {
        log(s, `${p.name} đổ ${a} + ${b}, vẫn kẹt trên đảo (còn ${p.island} lượt)`);
        return nextTurn(s);
      }
      log(s, `${p.name} đổ ${a} + ${b}, hết hạn kẹt — rời đảo`);
    }
    s.step = null;
    moveBy(s, p, a + b);
    resolve(s, p);
  }

  function resolve(s, p) {
    const i = p.pos, t = TILES[i];
    switch (t.type) {
      case 'city': case 'resort': {
        const pr = s.props[i];
        if (!pr) {
          if (p.money >= t.price) { s.step = { kind: 'buy', tile: i }; return; }
          log(s, `${p.name} không đủ tiền mua ${t.name}`);
          return finish(s);
        }
        if (pr.owner === p.id) {
          if (canUpgrade(s, p, i)) { s.step = { kind: 'upgrade', tile: i }; return; }
          return finish(s);
        }
        const owner = byId(s, pr.owner);
        const rent = rentOf(s, i);
        let usedVip = false;
        if (outaged(s, i)) log(s, `${t.name} đang mất điện — ${p.name} không phải trả tiền thuê`);
        else if (p.shields > 0 && rent > 0) {
          p.shields--;
          usedVip = true;
          s.notice = { seq: nextSeq(s), pid: p.id, kind: 'vipUsed', tile: i, amount: rent };
          log(s, `🛡️ ${p.name} dùng thẻ VIP, miễn ${k(rent)} tiền thuê ở ${t.name}`);
        } else {
          if (!pay(s, p, owner, rent, `tiền thuê ${t.name} cho ${owner.name}`)) return finish(s);
          if (rent > 0) s.reaction = { seq: nextSeq(s), pid: owner.id, kind: 'happyRent' };
          log(s, `${p.name} trả ${owner.name} ${k(rent)} tiền thuê ở ${t.name}${s.festival === i ? ` (lễ hội x${festMult(s)})` : ''}`);
        }
        if (canTakeover(s, i)) {
          if (p.money >= takeoverPrice(s, i)) { s.step = { kind: 'takeover', tile: i, price: takeoverPrice(s, i) }; return; }
          if (!usedVip) s.notice = { seq: nextSeq(s), pid: p.id, kind: 'noTakeover' };   // ưu tiên thông báo thẻ VIP nếu vừa tự kích hoạt
        }
        return finish(s);
      }
      case 'chance': return drawCard(s, p);
      case 'island': goIsland(s, p); return finish(s);
      case 'festival':
        if (ownedBy(s, p.id).length) { s.step = { kind: 'festival' }; return; }
        log(s, `${p.name} tới Championships nhưng chưa có đất để tổ chức lễ hội`);
        return finish(s);
      case 'tour':
        p.tourPending = true; s.again = false;
        s.notice = { seq: nextSeq(s), pid: p.id, kind: 'tour' };          // giao diện: popup lượt sau được bay
        log(s, `${p.name} tới World Tour — lượt sau được bay tới bất kỳ ô nào (phí ${k(CFG.TOUR_FEE)})`);
        return finish(s);
      case 'tax': {
        const base = taxBase(s, p);
        const amt = Math.max(CFG.TAX_MIN, Math.round(base * CFG.TAX_RATE / 10) * 10);
        if (pay(s, p, null, amt, 'thuế')) log(s, `${p.name} nộp thuế 10% tổng tài sản ${k(base)}: ${k(amt)}`);
        return finish(s);
      }
      default: return finish(s);
    }
  }

  /* ---------- thẻ Chance ---------- */
  function pickCard() {
    const total = CARDS.reduce((a, c) => a + c.w, 0);
    let x = rnd() * total;
    for (const c of CARDS) { x -= c.w; if (x < 0) return c; }
    return CARDS[CARDS.length - 1];
  }
  const oppCities = (s, p, f) => Object.keys(s.props).map(Number)
    .filter((i) => TILES[i].type === 'city' && s.props[i].owner !== p.id && (!f || f(s.props[i], i))).sort((a, b) => a - b);
  const myCities = (s, p, f) => ownedBy(s, p.id).filter((i) => TILES[i].type === 'city' && (!f || f(s.props[i], i)));
  function cardTargets(s, p, id, stage) {
    if (id === 'POWER_OUTAGE') return oppCities(s, p, (pr, i) => !outaged(s, i));
    if (id === 'EARTHQUAKE') return oppCities(s, p, (pr) => pr.level >= 1 && pr.level < CFG.LANDMARK);
    if (id === 'FORCED_SWAP') return stage === 2 ? oppCities(s, p, (pr) => pr.level < CFG.LANDMARK) : myCities(s, p, (pr) => pr.level < CFG.LANDMARK);
    return [];
  }
  function drawCard(s, p) {
    const c = pickCard();
    s.lastCard = { seq: nextSeq(s), pid: p.id, id: c.id, title: c.title, text: c.text };
    log(s, `🃏 ${p.name} rút thẻ "${c.title}"`);
    switch (c.id) {
      case 'GOLDEN_LOTTERY': p.money = r2(p.money + c.amount); return finish(s);
      case 'VIP_SHIELD': p.shields = (p.shields || 0) + 1; return finish(s);
      case 'ESCAPE_ISLAND': p.escapeCards++; return finish(s);
      case 'HOST_FESTIVAL': moveTo(s, p, CFG.FESTIVAL_IDX); return resolve(s, p);
      case 'FLIGHT_TICKET': s.step = { kind: 'flight' }; return;
      default: {
        const tiles = cardTargets(s, p, c.id, 1);
        const ok = tiles.length && (c.id !== 'FORCED_SWAP' || cardTargets(s, p, c.id, 2).length);
        if (!ok) { log(s, `Không có thành phố phù hợp, thẻ "${c.title}" không có tác dụng`); return finish(s); }
        s.step = { kind: 'card', card: c.id, stage: 1, tiles };
      }
    }
  }
  function applyCard(s, p, st, i) {
    if (!st.tiles.includes(i)) fail('Hãy chọn một ô được làm sáng');
    const t = TILES[i], pr = s.props[i], owner = byId(s, pr.owner);
    if (st.card === 'POWER_OUTAGE') {
      s.outage[i] = s.round + CFG.OUTAGE_ROUNDS;
      if (s.festival === i) s.festival = null;
      log(s, `⚡ ${t.name} của ${owner.name} mất điện ${CFG.OUTAGE_ROUNDS} vòng`);
    } else if (st.card === 'EARTHQUAKE') {
      pr.level--;
      log(s, `🌋 Động đất! ${t.name} của ${owner.name} xuống ${LEVEL_NAMES[pr.level].toLowerCase()}`);
    } else if (st.card === 'FORCED_SWAP') {
      if (st.stage === 1) { s.step = { kind: 'card', card: st.card, stage: 2, mine: i, tiles: cardTargets(s, p, st.card, 2) }; return; }
      const mine = s.props[st.mine];
      mine.owner = pr.owner; pr.owner = p.id;
      log(s, `🔁 ${p.name} đổi ${TILES[st.mine].name} lấy ${t.name} của ${owner.name}`);
      s.step = null;
      if (checkWin(s, p) || checkWin(s, owner)) return;
    }
    s.step = null;
    finish(s);
  }

  function bankrupt(s, p) {
    const d = s.pending, to = d && d.to ? byId(s, d.to) : null;
    if (to) { to.money = r2(to.money + p.money); log(s, `${to.name} nhận toàn bộ ${k(p.money)} tiền mặt còn lại của ${p.name}`); }
    ownedBy(s, p.id).forEach((i) => { delete s.props[i]; delete s.outage[i]; if (s.festival === i) s.festival = null; });
    Object.assign(p, { money: 0, bankrupt: true, island: 0, tourPending: false });
    s.pending = null;
    log(s, `💥 ${p.name} tuyên bố phá sản`);
    nextTurn(s);
  }

  /* ---------- xử lý hành động ---------- */
  function act(s, pid, type, data) {
    const r = actInner(s, pid, type, data);
    s.stepAt = Date.now();                 // mốc đếm thời gian cho bước kế tiếp
    return r;
  }
  function actInner(s, pid, type, data) {
    data = data || {};
    if (s.phase === 'play' && s.endsAt && checkTime(s, Date.now())) return;
    if (s.phase !== 'play') fail('Ván chưa bắt đầu hoặc đã kết thúc');
    const p = cur(s);
    if (!p || p.id !== pid) fail('Chưa tới lượt bạn');
    const st = s.step;
    if (!st) fail('Không có hành động nào lúc này');
    // sơ đồ trạng thái trong rules.js quyết định hành động nào hợp lệ ở bước nào
    if (!STATES[st.kind] || !STATES[st.kind].actions[type]) fail('Hành động không hợp lệ lúc này');
    const need = () => {};
    const tileArg = () => { const i = Number(data.tile); if (!Number.isInteger(i) || i < 0 || i > 31) fail('Ô không hợp lệ'); return i; };

    switch (type) {
      case 'roll':
        need('roll', 'island');
        return st.kind === 'island' ? rollIsland(s, p) : rollNormal(s, p);

      case 'payIsland':
        need('island');
        if (p.money < CFG.ISLAND_FEE) fail('Không đủ tiền');
        transfer(p, null, CFG.ISLAND_FEE);
        p.island = 0;
        log(s, `${p.name} trả ${k(CFG.ISLAND_FEE)} thuê tàu rời đảo`);
        s.step = { kind: 'roll' };
        return;

      case 'useCard':
        need('island');
        if (!p.escapeCards) fail('Bạn không có thẻ thoát đảo');
        p.escapeCards--; p.island = 0;
        s.notice = { seq: nextSeq(s), pid: p.id, kind: 'escapeUsed' };
        log(s, `${p.name} dùng thẻ thoát đảo`);
        s.step = { kind: 'roll' };
        return;

      case 'buy': {
        need('buy');
        const i = p.pos, t = TILES[i], level = Number(data.level) || 0;
        if (s.props[i]) fail('Ô này đã có chủ');
        if (level < 0 || level > 3 || (t.type === 'resort' && level)) fail('Cấp xây không hợp lệ');
        if (level > maxBuild(p)) fail(`Vòng này chỉ được xây tới ${LEVEL_NAMES[maxBuild(p)]}`);
        const cost = value(i, level);
        if (p.money < cost) fail('Không đủ tiền');
        transfer(p, null, cost);
        s.props[i] = { owner: p.id, level };
        log(s, `${p.name} mua ${t.name}${level ? ` và xây ${LEVEL_NAMES[level].toLowerCase()}` : ''} (${k(cost)})`);
        s.step = null;
        if (checkWin(s, p)) return;
        return finish(s);
      }

      case 'upgrade': {
        need('upgrade');
        const i = st.tile, pr = s.props[i], level = Number(data.level);
        const ok = pr.level < 3 ? (level > pr.level && level <= 3) : (pr.level === 3 && level === 4);
        if (!ok) fail('Cấp xây không hợp lệ');
        if (level <= 3 && level > maxBuild(p)) fail(`Vòng này chỉ được xây tới ${LEVEL_NAMES[maxBuild(p)]}`);
        const cost = upgradeCost(i, pr.level, level);
        if (p.money < cost) fail('Không đủ tiền');
        transfer(p, null, cost);
        pr.level = level;
        log(s, `${p.name} nâng ${TILES[i].name} lên ${LEVEL_NAMES[level].toLowerCase()} (${k(cost)})`);
        s.step = null;
        return finish(s);
      }

      case 'takeover': {
        need('takeover');
        const i = st.tile, pr = s.props[i], price = takeoverPrice(s, i);
        if (p.money < price) fail('Không đủ tiền');
        const owner = byId(s, pr.owner);
        transfer(p, owner, price);
        pr.owner = p.id;
        log(s, `${p.name} mua lại ${TILES[i].name} từ ${owner.name} với giá ${k(price)}`);
        s.step = null;
        if (checkWin(s, p)) return;
        if (canUpgrade(s, p, i)) { s.step = { kind: 'upgrade', tile: i }; return; }
        return finish(s);
      }

      case 'festival': {
        need('festival');
        const i = tileArg();
        if (!s.props[i] || s.props[i].owner !== p.id) fail('Hãy chọn ô của bạn');
        s.festival = i;
        s.festLevel = Math.min(CFG.FEST_MULT.length - 1, (s.festLevel || 0) + 1);
        delete s.outage[i];
        log(s, `🎉 ${p.name} tổ chức lễ hội ở ${TILES[i].name} — tiền thuê x${festMult(s)}`);
        s.notice = { seq: nextSeq(s), pid: p.id, kind: 'festival', tile: i, mult: festMult(s) };
        s.step = null;
        return finish(s);
      }

      case 'tour': {
        need('tour');
        const i = tileArg();
        if (i === p.pos) fail('Hãy chọn ô khác');
        if (p.money < CFG.TOUR_FEE) fail('Không đủ tiền mua vé');
        p.tourPending = false;
        transfer(p, null, CFG.TOUR_FEE);
        log(s, `✈️ ${p.name} trả ${k(CFG.TOUR_FEE)} bay tới ${TILES[i].name}`);
        s.step = null;
        moveTo(s, p, i);
        return resolve(s, p);
      }

      case 'flight':
        need('flight');
        s.step = null;
        moveTo(s, p, CFG.TOUR_IDX);
        return resolve(s, p);

      case 'card': {
        need('card');
        return applyCard(s, p, st, tileArg());
      }

      case 'skip':
        need('buy', 'upgrade', 'takeover', 'festival', 'tour', 'card');
        if (st.kind === 'tour') {
          p.tourPending = false;
          s.step = { kind: 'roll' };
          return;
        }
        s.step = null;
        return finish(s);

      case 'sell': {
        need('debt');
        const i = tileArg();
        if (!s.props[i] || s.props[i].owner !== p.id) fail('Hãy chọn ô của bạn');
        const v = sellValue(s, i);
        delete s.props[i]; delete s.outage[i];
        if (s.festival === i) s.festival = null;
        p.money = r2(p.money + v);
        log(s, `${p.name} bán ${TILES[i].name} được ${k(v)}`);
        if (settle(s)) { s.step = null; return finish(s); }
        if (!ownedBy(s, p.id).length) log(s, `${p.name} đã bán hết mà vẫn chưa đủ — chỉ còn cách phá sản`);
        return;
      }

      case 'bankrupt':
        need('debt');
        return bankrupt(s, p);

      default:
        fail('Hành động không xác định');
    }
  }

  /* Hành động tự động khi đi hộ người mất kết nối: an toàn, không tiêu tiền */
  function autoAction(s) {
    const st = s.step, p = cur(s);
    switch (st.kind) {
      case 'roll': case 'island': return ['roll', {}];
      case 'flight': return ['flight', {}];
      case 'card': {
        // tấn công ô giá trị cao nhất; khi đổi đất thì đưa ra ô rẻ nhất của mình
        const byVal = st.tiles.slice().sort((a, b) => value(a, s.props[a].level) - value(b, s.props[b].level));
        return ['card', { tile: st.card === 'FORCED_SWAP' && st.stage === 1 ? byVal[0] : byVal[byVal.length - 1] }];
      }
      case 'debt': {
        const list = ownedBy(s, p.id).sort((a, b) => sellValue(s, a) - sellValue(s, b));
        const enough = list.find((i) => sellValue(s, i) >= s.pending.amount - p.money);
        if (enough !== undefined) return ['sell', { tile: enough }];
        if (list.length) return ['sell', { tile: list[list.length - 1] }];
        return ['bankrupt', {}];
      }
      default: return ['skip', {}];
    }
  }

  /* ---------- thời gian mỗi bước ---------- */
  // còn bao nhiêu ms cho bước hiện tại (đã cộng thời gian hoạt ảnh); null nếu không giới hạn
  function stepLeft(s, now) {
    if (s.phase !== 'play' || !s.settings.turnSec || !s.stepAt) return null;
    return s.stepAt + (CFG.TURN_GRACE_SEC + s.settings.turnSec) * 1000 - (now || Date.now());
  }
  // hết giờ bước: tự làm một hành động an toàn cho người đang tới lượt
  function checkTurn(s, now) {
    const left = stepLeft(s, now);
    if (left === null || left > 0) return false;
    const p = cur(s), [t, d] = autoAction(s);
    log(s, `⏱ ${p.name} hết giờ — tự ${t === 'roll' ? 'đổ xúc xắc' : t === 'sell' ? 'bán đất' : t === 'bankrupt' ? 'phá sản' : 'bỏ qua'}`);
    act(s, p.id, t, d);
    return true;
  }

  const api = {
    RULES: R, STATES, stepLeft, checkTurn,
    GROUPS, TILES, CFG, COLORS, PETS, MAPS, CARDS, LEVEL_NAMES, RESORTS, SIDES, GameError,
    setRng, createState, publicView, ensureHost, isHost, byName, addPlayer, removePlayer, setPet, renamePlayer, setSettings, startGame, resetGame, checkWin,
    act, autoAction, checkTime, cur, byId, value, invested, toll, upgradeCost, rentOf, takeoverPrice, canTakeover, sellValue, ownedBy, networth,
    ownsGroup, canUpgrade, nextLevel, isBuyable, maxBuild, villaLocked, taxBase, outaged, festMult, cardTargets,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Game = api;
})(typeof self !== 'undefined' ? self : this);

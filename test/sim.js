// Mô phỏng hàng loạt ván với lựa chọn ngẫu nhiên để bắt lỗi luật chơi
'use strict';
const G = require('../public/game.js');

let seed = Number(process.argv[2]) || 12345;
const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
G.setRng(rng);
const pick = (a) => a[Math.floor(rng() * a.length)];

function randomAction(s) {
  const p = G.cur(s), st = s.step, opts = [];
  switch (st.kind) {
    case 'roll': opts.push(['roll']); break;
    case 'island':
      opts.push(['roll']);
      if (p.money >= G.CFG.ISLAND_FEE) opts.push(['payIsland']);
      if (p.escapeCards) opts.push(['useCard']);
      break;
    case 'tour': opts.push(['skip']); if (p.money >= G.CFG.TOUR_FEE) G.tourTargets(s, p).forEach((i) => opts.push(['tour', { tile: i }])); break;
    case 'flight': opts.push(['flight']); break;
    case 'buy': {
      opts.push(['skip']);
      const t = G.TILES[p.pos];
      for (let l = 0; l <= (t.type === 'resort' ? 0 : G.maxBuild(p)); l++) if (p.money >= G.invested(p.pos, l)) opts.push(['buy', { level: l }], ['buy', { level: l }]);
      break;
    }
    case 'upgrade': {
      opts.push(['skip']);
      const pr = s.props[st.tile];
      const lv = pr.level < 3 ? [1, 2, 3].filter((l) => l > pr.level && l <= G.maxBuild(p)) : [4];
      lv.forEach((l) => { if (p.money >= G.upgradeCost(st.tile, pr.level, l)) opts.push(['upgrade', { level: l }]); });
      break;
    }
    case 'takeover': opts.push(['skip'], ['takeover']); break;
    case 'festival': opts.push(['skip']); G.festivalTargets(s, p).forEach((i) => { if (s.festival === i || p.money >= G.CFG.CHAMP_MOVE_FEE) opts.push(['festival', { tile: i }]); }); break;
    case 'card': opts.push(['skip']); st.tiles.forEach((i) => opts.push(['card', { tile: i }], ['card', { tile: i }])); break;
    case 'debt': {
      const own = G.ownedBy(s, p.id);
      if (own.length) own.forEach((i) => opts.push(['sell', { tile: i }]));
      else opts.push(['bankrupt']);
      break;
    }
  }
  return pick(opts);
}

const stats = { games: 0, reasons: {}, turns: [], errors: 0 };
const N = Number(process.argv[3]) || 500;
for (let g = 0; g < N; g++) {
  const s = G.createState();
  const n = 2 + (g % 3);
  for (let i = 0; i < n; i++) G.addPlayer(s, { id: 'p' + i, token: 't' + i, name: 'P' + i });
  s.settings.timeLimitMin = 0; s.settings.turnSec = 0;
  if (g % 3 === 0) s.settings.roundLimit = 25; else if (g % 3 === 1) s.settings.roundLimit = 40;
  G.startGame(s);
  let actions = 0;
  while (s.phase === 'play' && actions < 20000) {
    const useAuto = rng() < 0.15;
    const [t, d] = useAuto ? G.autoAction(s) : randomAction(s);
    try { G.act(s, G.cur(s).id, t, d); } catch (e) { stats.errors++; console.error('LỖI', e.message, t, d, s.step); process.exit(1); }
    actions++;
    // bất biến
    for (const p of s.players) {
      if (p.bankrupt && G.ownedBy(s, p.id).length) throw new Error('Người phá sản vẫn còn đất');
      if (p.money < 0) throw new Error(`Âm tiền: ${p.name} ${p.money}`);
    }
    if (s.phase === 'play' && !s.step) throw new Error('Không có bước tiếp theo');
    if (s.phase === 'play' && G.cur(s).bankrupt) throw new Error('Lượt của người đã phá sản');
    if (s.festival !== null && !s.props[s.festival]) throw new Error('Lễ hội ở ô không có chủ');
    if (s.phase === 'play' && !G.STATES[s.step.kind]) throw new Error('Bước không có trong sơ đồ trạng thái: ' + s.step.kind);
    if (s.pending && s.step.kind !== 'debt') throw new Error('Có khoản treo nhưng không ở bước debt');
    for (const i in s.props) { const pr = s.props[i]; if (pr.level < 0 || pr.level > 4) throw new Error('Cấp sai'); if (G.TILES[i].type === 'resort' && pr.level) throw new Error('Bãi biển có cấp'); }
    for (const p of s.players) if (!Number.isFinite(p.money) || Math.abs(p.money * 2 - Math.round(p.money * 2)) > 1e-6) throw new Error('Tiền lẻ bất thường ' + p.money);
  }
  if (s.phase !== 'over') { console.log('STUCK', n, 'round', s.round, s.players.map(p=>[p.money,G.ownedBy(s,p.id).length,p.bankrupt]), 'free', G.TILES.filter(t=>G.isBuyable(t)&&!s.props[t.i]).length, s.log.slice(-6).map(l=>l.t)); continue; }
  stats.games++;
  const r = s.winReason.replace(/\(.*\)/, '').replace(/cạnh \S+/, 'cạnh').trim();
  stats.reasons[r] = (stats.reasons[r] || 0) + 1;
  stats.turns.push(s.round);
}
stats.turns.sort((a, b) => a - b);
console.log(`OK ${stats.games} ván, 0 lỗi. Số vòng trung vị: ${stats.turns[stats.turns.length >> 1]}`);
console.log('Cách thắng:', stats.reasons);

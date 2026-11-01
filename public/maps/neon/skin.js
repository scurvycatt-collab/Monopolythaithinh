/* Skin "Lumina-01" — sinh bởi npm run map:new. Chạy được ngay; thay dần từng slot (chú thích "THAY:").
   Hợp đồng: docs/contracts/map-skin.md · bút vẽ: public/js/render-common/board2d/PEN.md · kind có sẵn: KINDS.md.
   Chỉ dùng asset Kenney CC0 (public/assets/shared/) hoặc dựng bằng code. */
import { defineSkin } from '../../js/render-common/board2d/skin.js';

const flat = (col) => (g, c) => { g.fillStyle = col; g.fillRect(0, 0, c.cw, c.ch); };

export default defineSkin({
  id: 'neon',
  packs: ['kenney-iso-buildings', 'kenney-nature'],   // THAY: bỏ pack không dùng
  palette: {
    // THAY: 8 màu nhóm đất A…H (giữ đúng 8 khoá), hợp tông map
    groups: { A: '#f27aa6', B: '#8fcf4f', C: '#ffbf1f', D: '#1fb5d6', E: '#f07a2a', F: '#c43a3a', G: '#7b86e0', H: '#3fb0e8' },
    ground: '#bde69c', priceStrip: '#c6cdd6', priceText: '#5b6676', labelText: '#ffffff',
    boardSide: '#7a5236', boardSideDark: '#5e3d27', water: '#8fd6ef', sand: '#f1dcaa',
  },
  zones: null,   // THAY: mảng 4 zone nếu mỗi cạnh một theme (map-skin.md §4)
  slots: {
    tile: { paint: (g, c) => c.grass(g, 0, 0, c.cw, c.ch) },   // THAY: mặt ô đất (viền, hoa văn)
    deco: { kind: 'sprite', pick: ['tree_oak', 'tree_fat'], count: 2, tint: 'none' },   // THAY: cây / vật trang trí ô trống
    house: {   // THAY: 5 cấp nhà (0 = đất có cờ, 4 = Khách sạn); tên mảnh trong KINDS.md
      kind: 'kit',
      levels: [[[0, 0, ['128']]], [[0, 0, ['016'], '069']], [[0, 0, ['016', '047'], '082'], [1, 0, ['055']]], [[0, 0, ['016', '047', '047'], '083'], [1, 0, ['024', '051'], '090']], [[0, 0, ['016', '053', '053', '053']], [1, 0, ['000', '053', '053', '053']]]],
      wall: '#ffffff', sign: 'HOTEL',
    },
    resort: { kind: 'sprite', pick: ['tent_smallClosed'], tint: 'none' },   // THAY: ô resort chưa có chủ
    resortHouse: {   // THAY: công trình resort, 4 cấp theo số resort cùng chủ
      kind: 'kit',
      levels: [[[0, 0, ['128']]], [[0, 0, ['016'], '069']], [[0, 0, ['016', '047'], '082']], [[0, 0, ['016', '047', '047'], '083']]],
      wall: '#ffffff', sign: false,
    },
    start: { kind: 'sprite', pick: ['flower_redA'], tint: 'none', paint: flat('#ffe08a') },   // THAY: ô Start
    island: { kind: 'sprite', pick: ['rock_largeA'], tint: 'none', paint: flat('#8fd6ef'), side: ['#7cc3e0', '#5fa9c9'] },   // THAY: Lost Island
    festival: { kind: 'sprite', pick: ['tree_fat'], tint: 'none', paint: flat('#ffb36b') },   // THAY: Championships
    tour: { kind: 'sprite', pick: ['rock_tallA'], tint: 'none', paint: flat('#c9b6ff') },   // THAY: World Tour
    chance: { kind: 'sprite', pick: ['flower_yellowA'], tint: 'none', paint: flat('#fff1d8') },   // THAY: ô Chance
    tax: { kind: 'sprite', pick: ['rock_smallA'], tint: 'none', paint: flat('#dceef3') },   // THAY: ô Tax
    base: {   // THAY: đế bàn dưới 32 ô (khung viền mỏng)
      draw: (p, c) => { const a = c.half + c.margin - 0.1, y = c.y + 0.002; p.line3([[-a, y, a], [a, y, a], [a, y, -a], [-a, y, -a], [-a, y, a]], '#f5b934', 0.03); },
    },
    center: {   // THAY: giữa bàn (paint = mặt đất, draw = mỗi zone, core = vật ở tâm)
      core: (p) => { p.ellipseShadow(0, 0, 0.6, 0.15); p.cyl(0, 0, 0, 0.5, 0.2, '#e2dccb'); p.ball(0, 0.45, 0, 0.3, '#8fd6ef'); },
    },
  },
  labels: { resortLevels: ['Cấp 1', 'Cấp 2', 'Cấp 3', 'Cấp 4'] },   // THAY: tên 4 cấp nhà resort
});

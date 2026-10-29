// Chuẩn tỷ lệ thị giác lấy Map 1 làm nguồn. Mọi renderer phải dùng chung các
// hằng số này; skin chỉ đổi hình dáng, không tự đặt tỷ lệ quân/cấp nhà.
export const TOKEN_HEIGHT = 1.08;

// Hệ số theo cấp [đất, Nhà 1, Nhà 2, Nhà 3, khách sạn].
export const PROPERTY_LEVEL_SCALE = Object.freeze([1, 1, 1.03, 1.06, 1.08]);

export const PROPERTY_TILE_RATIO = Object.freeze({
  tileWidth: 1.7,
  tileDepth: 3.1,
  maxFootprintWidth: 0.84,
  maxFootprintDepth: 0.58,
  maxHeight: 1.25,
});

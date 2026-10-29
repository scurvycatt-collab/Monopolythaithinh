// Quỹ đạo xúc xắc dùng chung cho mọi renderer. Skin chỉ vẽ hình khối; thời lượng,
// độ nảy, rung ngang và nhịp đổi mặt phải đồng nhất giữa WebGL và Canvas 2D.
export const diceRollDuration = (quality, reducedMotion = false) => (reducedMotion || quality === 'low' ? 650 : 1000);

export function diceRollFrame(now, startedAt, duration, dieIndex, finalFace) {
  const u = startedAt < 0 ? 1 : Math.min(1, Math.max(0, (now - startedAt) / duration));
  const rolling = u < 1;
  return {
    u,
    rolling,
    face: rolling ? 1 + (Math.floor(now / 70 + dieIndex * 3) % 6) : finalFace,
    height: rolling ? Math.abs(Math.sin(u * Math.PI * 3)) * (1 - u) * 1.2 : 0,
    jitter: rolling ? Math.sin(now / 50 + dieIndex) * 0.15 * (1 - u) : 0,
    spin: rolling ? Math.pow(1 - u, 1.7) * Math.PI * 6 : 0,
  };
}

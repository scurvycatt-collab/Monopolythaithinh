// Nguồn chuẩn chuyển động quân cho mọi renderer.
// Module chỉ tính thời gian/nội suy; renderer tự chuyển ô thành tọa độ và tự vẽ.
export function tokenStepDuration(pathLength, reducedMotion = false) {
  if (reducedMotion) return pathLength > 10 ? 90 : 120;
  return pathLength > 10 ? 120 : 190;
}

export function tokenFollowAlpha(deltaSeconds, strength = 0.25) {
  const dt = Math.max(0, Math.min(0.1, Number(deltaSeconds) || 0));
  return 1 - Math.pow(1 - strength, dt * 60);
}

export function tokenHopPose(from, to, elapsed, duration, hopHeight = 0.6) {
  const u = duration > 0 ? Math.max(0, Math.min(1, elapsed / duration)) : 1;
  return {
    x: from.x + (to.x - from.x) * u,
    z: from.z + (to.z - from.z) * u,
    y: u === 0 || u === 1 ? 0 : Math.sin(u * Math.PI) * hopHeight,
    progress: u,
  };
}

export function animateTokenStep({
  from,
  to,
  duration,
  hopHeight = 0.6,
  onFrame,
  now = () => performance.now(),
  requestFrame = (fn) => requestAnimationFrame(fn),
}) {
  const startedAt = now();
  return new Promise((resolve) => {
    const step = (timestamp) => {
      const pose = tokenHopPose(from, to, timestamp - startedAt, duration, hopHeight);
      onFrame(pose);
      if (pose.progress < 1) requestFrame(step);
      else resolve(pose);
    };
    // Gọi bằng RAF ngay từ đầu để Promise chỉ hoàn tất sau khung hình cuối thực sự.
    requestFrame(step);
  });
}

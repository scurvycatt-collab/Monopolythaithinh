import assert from 'node:assert/strict';
import { animateTokenStep, tokenFollowAlpha, tokenHopPose, tokenStepDuration } from '../public/js/render-common/token-motion.js';

assert.equal(tokenStepDuration(4, false), 190);
assert.equal(tokenStepDuration(12, false), 120);
assert.equal(tokenStepDuration(4, true), 120);
assert.equal(tokenStepDuration(12, true), 90);

const half = tokenHopPose({ x: 0, z: 2 }, { x: 10, z: 6 }, 50, 100);
assert.deepEqual({ x: half.x, z: half.z, progress: half.progress }, { x: 5, z: 4, progress: 0.5 });
assert.ok(Math.abs(half.y - 0.6) < 1e-9, 'độ cao giữa bước phải đạt đỉnh chuẩn');

// Cùng một thời gian thực phải cho cùng mức follow dù renderer chạy 30 hay 60 FPS.
const follow = (fps) => {
  let x = 0;
  for (let i = 0; i < fps; i++) x += (1 - x) * tokenFollowAlpha(1 / fps);
  return x;
};
assert.ok(Math.abs(follow(30) - follow(60)) < 1e-9, 'follow phải độc lập FPS');

let time = 0;
const frames = [];
const pending = [];
const promise = animateTokenStep({
  from: { x: 0, z: 0 }, to: { x: 8, z: 4 }, duration: 100,
  now: () => time,
  requestFrame: (fn) => pending.push(fn),
  onFrame: (pose) => frames.push(pose),
});
assert.equal(frames.length, 0, 'không được hoàn tất bằng timer trước khung hình đầu');
for (const stamp of [40, 95, 160]) { time = stamp; pending.shift()(stamp); }
await promise;
assert.equal(frames.at(-1).progress, 1, 'Promise chỉ resolve sau frame cuối');
assert.deepEqual({ x: frames.at(-1).x, z: frames.at(-1).z, y: frames.at(-1).y }, { x: 8, z: 4, y: 0 });

console.log('Token motion shared tests passed.');

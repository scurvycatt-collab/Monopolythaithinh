import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'audio', 'background-loop.wav');
const RATE = 22050;
const SECONDS = 60;
const LENGTH = RATE * SECONDS;
const mix = new Float32Array(LENGTH);
let seed = 0x51a7cafe;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 0x100000000) * 2 - 1;
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const wave = (phase, kind) => kind === 'triangle' ? 2 * Math.asin(Math.sin(phase)) / Math.PI : kind === 'square' ? Math.sign(Math.sin(phase)) : Math.sin(phase);

function note(start, duration, midi, volume, kind = 'triangle', decay = 3.6) {
  const begin = Math.max(0, Math.floor(start * RATE)), end = Math.min(LENGTH, Math.ceil((start + duration) * RATE));
  const freq = hz(midi);
  for (let i = begin; i < end; i++) {
    const t = i / RATE - start, attack = Math.min(1, t / .018), release = Math.min(1, (duration - t) / .055);
    const env = attack * Math.max(0, release) * Math.exp(-t * decay / Math.max(.1, duration));
    mix[i] += wave(2 * Math.PI * freq * t, kind) * env * volume;
  }
}
function kick(start, volume = .22) {
  const duration = .18, begin = Math.floor(start * RATE), end = Math.min(LENGTH, Math.ceil((start + duration) * RATE));
  for (let i = begin; i < end; i++) {
    const t = i / RATE - start, phase = 2 * Math.PI * (78 * t - 45 * t * t);
    mix[i] += Math.sin(phase) * Math.exp(-t * 22) * volume;
  }
}
function hat(start, volume = .045) {
  const duration = .055, begin = Math.floor(start * RATE), end = Math.min(LENGTH, Math.ceil((start + duration) * RATE));
  for (let i = begin; i < end; i++) mix[i] += random() * Math.exp(-(i / RATE - start) * 65) * volume;
}
function clap(start, volume = .065) {
  const duration = .12, begin = Math.floor(start * RATE), end = Math.min(LENGTH, Math.ceil((start + duration) * RATE));
  for (let i = begin; i < end; i++) {
    const t = i / RATE - start;
    mix[i] += random() * Math.exp(-t * 28) * (1 + .35 * Math.sin(t * 210)) * volume;
  }
}

// 120 BPM = 0,5 giây/nhịp. Chu kỳ hòa âm 5 ô nhịp lặp 6 lần, kết ở G để nối về C.
const beat = .5;
const chords = [
  { root: 48, notes: [60, 64, 67] }, // C
  { root: 43, notes: [59, 62, 67] }, // G
  { root: 45, notes: [57, 60, 64] }, // Am
  { root: 41, notes: [57, 60, 65] }, // F
  { root: 43, notes: [59, 62, 67] }, // G -> C đầu vòng
];
const melody = [72, 76, 79, 76, 74, 71, 74, 79, 69, 72, 76, 72, 69, 72, 77, 76, 74, 71, 74, 67];

for (let cycle = 0; cycle < 6; cycle++) {
  const cycleBeat = cycle * 20;
  for (let bar = 0; bar < 5; bar++) {
    const chord = chords[bar], barBeat = cycleBeat + bar * 4;
    for (let b = 0; b < 4; b++) {
      const t = (barBeat + b) * beat;
      note(t, .42, chord.root, .105, 'sine', 2.2);
      kick(t, b === 0 ? .23 : .16);
      if (b === 1 || b === 3) clap(t, .06);
      for (let h = 0; h < 2; h++) hat(t + h * beat / 2, h ? .035 : .045);
    }
    for (let eighth = 0; eighth < 8; eighth++) {
      const t = (barBeat + eighth / 2) * beat, chordNote = chord.notes[eighth % chord.notes.length];
      note(t, .2, chordNote + 12, .07, 'triangle', 5.5);
    }
  }
  for (let m = 0; m < melody.length; m++) {
    const t = (cycleBeat + m) * beat;
    const duration = m === melody.length - 1 ? .42 : (m % 5 === 4 ? .78 : .38); // nốt cuối tắt trước mốc 60s để loop không click
    note(t, duration, melody[m] + (cycle % 2 && m % 4 === 0 ? 12 : 0), .105, 'triangle', 2.8);
  }
}

const bytes = Buffer.alloc(44 + LENGTH * 2);
bytes.write('RIFF', 0); bytes.writeUInt32LE(36 + LENGTH * 2, 4); bytes.write('WAVE', 8);
bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
bytes.writeUInt32LE(RATE, 24); bytes.writeUInt32LE(RATE * 2, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
bytes.write('data', 36); bytes.writeUInt32LE(LENGTH * 2, 40);
for (let i = 0; i < LENGTH; i++) {
  const softened = Math.tanh(mix[i] * 1.35) * .62;
  bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, softened)) * 32767), 44 + i * 2);
}

if (process.argv.includes('--check')) {
  if (!fs.existsSync(OUT) || !fs.readFileSync(OUT).equals(bytes)) {
    console.error('background-loop.wav chưa được tạo hoặc không khớp script');
    process.exit(1);
  }
  console.log('OK nhạc nền 60 giây khớp script');
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, bytes);
  console.log(`Đã tạo ${path.relative(ROOT, OUT)} (${(bytes.length / 1024 / 1024).toFixed(2)} MB, ${SECONDS} giây)`);
}

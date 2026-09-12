const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const TONE = 0.1;
const REST = 0.1;
const ROUNDS = 8;
const PULSE = [349, 440, 349, 440];

function writeWav(samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i += 1) {
    buffer.writeInt16LE(samples[i], 44 + i * 2);
  }
  return buffer;
}

function burst(freq, seconds) {
  const count = Math.floor(SAMPLE_RATE * seconds);
  const out = new Array(count);
  for (let i = 0; i < count; i += 1) {
    const t = i / SAMPLE_RATE;
    const attack = Math.min(1, i / (SAMPLE_RATE * 0.004));
    const release = Math.min(1, (count - i) / (SAMPLE_RATE * 0.01));
    const wave = Math.sin(2 * Math.PI * freq * t) + Math.sin(2 * Math.PI * freq * 2 * t) * 0.12;
    out[i] = wave * attack * release * 0.82;
  }
  return out;
}

function silence(seconds) {
  return new Array(Math.floor(SAMPLE_RATE * seconds)).fill(0);
}

const samples = [];
for (let round = 0; round < ROUNDS; round += 1) {
  for (const freq of PULSE) samples.push(...burst(freq, TONE));
  samples.push(...silence(REST));
}

const pcm = samples.map((value) => Math.round(Math.max(-1, Math.min(1, value)) * 32767));
const outPath = path.join(__dirname, '..', 'public', 'sounds', 'new-order.wav');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, writeWav(pcm));
console.log(`Wrote ${outPath} (${(pcm.length / SAMPLE_RATE).toFixed(2)}s)`);

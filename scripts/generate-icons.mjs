import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [20, 20, 20];
const OUTER = [58, 58, 62];
const INNER = [255, 255, 255];
const ACCENT = [192, 32, 32];

function roundRectHit(x, y, cx, cy, w, h, r) {
  const dx = Math.abs(x - cx) - (w / 2 - r);
  const dy = Math.abs(y - cy) - (h / 2 - r);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0);
  return outside <= r;
}

function shade(x, y, size, inset) {
  const cx = size / 2;

  // content scales down for maskable icons so nothing gets clipped
  const scale = inset ? 0.8 : 1;
  const barW = size * 0.56 * scale;
  const barH = size * 0.13 * scale;
  const gap = size * 0.06 * scale;
  const dotR = size * 0.045 * scale;
  const dotX = cx - barW / 2 - gap - dotR + size * 0.02;
  const radius = barH / 2;

  const rows = [size * 0.5 - barH - gap, size * 0.5, size * 0.5 + barH + gap];
  for (let i = 0; i < rows.length; i++) {
    if (roundRectHit(x, y, cx, rows[i], barW, barH, radius)) {
      return i === 1 ? INNER : OUTER;
    }
  }

  if (Math.hypot(x - dotX, y - size * 0.5) <= dotR) return ACCENT;

  return BG;
}

function render(size, samples = 4, inset = false) {
  const buf = Buffer.alloc(size * size * 4);
  const step = 1 / samples;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const c = shade(px + (sx + 0.5) * step, py + (sy + 0.5) * step, size, inset);
          r += c[0]; g += c[1]; b += c[2]; count++;
        }
      }
      const i = (py * size + px) * 4;
      buf[i] = Math.round(r / count);
      buf[i + 1] = Math.round(g / count);
      buf[i + 2] = Math.round(b / count);
      buf[i + 3] = 255;
    }
  }
  return buf;
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

mkdirSync('icons', { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(`icons/icon-${size}.png`, encodePng(size, render(size, size >= 512 ? 4 : 3)));
}
writeFileSync('icons/maskable-512.png', encodePng(512, render(512, 4, true)));
writeFileSync('icons/apple-touch-icon.png', encodePng(180, render(180, 3)));
console.log('icons written');

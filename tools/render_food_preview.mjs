// 음식 그림 미리보기 PNG. Node 24 타입 제거 실행: node tools/render_food_preview.mjs
// 출력: artifacts/food-v0/preview.png (8배·3배 두 줄, 게임 바닥색 배경)
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { FOOD_ART, FOOD_W, FOOD_H } from '../src/art/food.ts';

const ids = Object.keys(FOOD_ART);
const BIG = 8, SMALL = 3, PAD = 16;
const W = ids.length * (FOOD_W * BIG + PAD) + PAD;
const H = PAD + FOOD_H * BIG + PAD + FOOD_H * SMALL + PAD;
const img = new Uint8Array(W * H * 4);
const bg = [0xf3, 0xec, 0xdf];
for (let i = 0; i < W * H; i++) img.set([...bg, 255], i * 4);
const col = c => { const n = parseInt(c.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, c.length > 7 ? parseInt(c.slice(7, 9), 16) : 255]; };
function blit(grid, ox, oy, s) {
  for (let y = 0; y < FOOD_H; y++) for (let x = 0; x < FOOD_W; x++) {
    const c = grid[y * FOOD_W + x]; if (!c) continue;
    const [r, g, b, a] = col(c);
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
      const k = ((oy + y * s + j) * W + ox + x * s + i) * 4, t = a / 255;
      img[k] = img[k] * (1 - t) + r * t; img[k + 1] = img[k + 1] * (1 - t) + g * t; img[k + 2] = img[k + 2] * (1 - t) + b * t;
    }
  }
}
ids.forEach((id, n) => {
  const g = FOOD_ART[id]();
  const ox = PAD + n * (FOOD_W * BIG + PAD);
  blit(g, ox, PAD, BIG);
  blit(g, ox + (FOOD_W * BIG - FOOD_W * SMALL) / 2, PAD * 2 + FOOD_H * BIG, SMALL);
});
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; Buffer.from(img.buffer, y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1); }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
mkdirSync('artifacts/food-v0', { recursive: true });
writeFileSync('artifacts/food-v0/preview.png', Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
writeFileSync('artifacts/food-v0/grids.json', JSON.stringify(Object.fromEntries(ids.map(id => [id, FOOD_ART[id]()]))));
console.log('preview', W + 'x' + H, ids.join(', '));

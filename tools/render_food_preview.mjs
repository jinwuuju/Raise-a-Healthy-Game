// 음식 그림 미리보기 PNG. Node 24 타입 제거 실행: node tools/render_food_preview.mjs
// 출력: artifacts/food-v2/<당김>.png (당김 칸별 격자, 6배, 게임 바닥색 배경) + index.txt(칸 순서 → 메뉴 이름)
//       artifacts/food-v0/preview.png (승인된 기준 5종, 이전 형식 유지)
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { FOOD_ART, FOOD_W, FOOD_H } from '../src/art/food.ts';

const menus = JSON.parse(readFileSync(new URL('../data/content/lunch-menus.v0.1.json', import.meta.url), 'utf8')).menus;
const col = c => { const n = parseInt(c.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, c.length > 7 ? parseInt(c.slice(7, 9), 16) : 255]; };
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
function sheet(ids, file, scale, cols) {
  const PAD = 12, cell = FOOD_W * scale + PAD, rows = Math.ceil(ids.length / cols);
  const W = cols * cell + PAD, H = rows * (FOOD_H * scale + PAD) + PAD, img = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) img.set([0xf3, 0xec, 0xdf, 255], i * 4);
  ids.forEach((id, n) => {
    const g = FOOD_ART[id](), ox = PAD + (n % cols) * cell, oy = PAD + Math.floor(n / cols) * (FOOD_H * scale + PAD);
    for (let y = 0; y < FOOD_H; y++) for (let x = 0; x < FOOD_W; x++) {
      const c = g[y * FOOD_W + x]; if (!c) continue; const [r, gg, b, a] = col(c), t = a / 255;
      for (let j = 0; j < scale; j++) for (let i = 0; i < scale; i++) { const k = ((oy + y * scale + j) * W + ox + x * scale + i) * 4; img[k] = img[k] * (1 - t) + r * t; img[k + 1] = img[k + 1] * (1 - t) + gg * t; img[k + 2] = img[k + 2] * (1 - t) + b * t; }
    }
  });
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; Buffer.from(img.buffer, y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
mkdirSync('artifacts/food-v0', { recursive: true }); mkdirSync('artifacts/food-v2', { recursive: true });
sheet(['mul-naengmyeon', 'tteokbokki', 'sundae-gukbap', 'fried-chicken', 'gimbap'], 'artifacts/food-v0/preview.png', 8, 5);
const lines = [];
for (const crave of ['cool', 'spicy', 'hot', 'crispy', 'meat', 'foreign', 'light', 'quick', 'hearty']) {
  const list = menus.filter(m => m.crave === crave);
  sheet(list.map(m => m.id), 'artifacts/food-v2/' + crave + '.png', 6, 6);
  lines.push(crave + ' (' + list.length + '): ' + list.map((m, i) => (i + 1) + '.' + m.name).join(' '));
}
writeFileSync('artifacts/food-v2/index.txt', lines.join('\n') + '\n');
console.log('preview sheets', lines.length, 'menus', menus.length);

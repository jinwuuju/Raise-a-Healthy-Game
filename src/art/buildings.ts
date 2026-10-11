import type { Building } from '../world/rooms';
import type { Rect } from '../world/types';
import { ellipse, makeCanvas, pixelText, px, rect, rng, shade, textWidth, type Ctx } from './pixel';

type Ramp = [string, string, string, string]; // light, base, shade, dark
export type BuildingArt = { day: HTMLCanvasElement; night: HTMLCanvasElement; lights: Rect[]; billboard: Rect | null };

const ROOF: Ramp = ['#bdbbb5', '#a9a7a1', '#93918b', '#73716c'];
const GLASS: [string, string, string] = ['#b9d6ec', '#6f97bb', '#4d7194'];
const WARM = '#ffd27a', WARM_HI = '#fff0bf';

type Painter = { g: Ctx; night: boolean; r: () => number; lights: Rect[] };

function roof(p: Painter, w: number, d: number, ramp: Ramp, items: number, extra: 'none' | 'garden' | 'solar' | 'helipad' = 'none') {
  const { g, r } = p;
  rect(g, 0, 0, w, d, ramp[1]);
  for (let i = 0; i < (w * d) / 10; i++) px(g, Math.floor(r() * w), Math.floor(r() * d), r() < 0.5 ? shade(ramp[1], 0.06) : shade(ramp[1], -0.05));
  rect(g, 0, 0, w, 2, ramp[0]); rect(g, 0, 0, 2, d, ramp[0]); rect(g, w - 2, 0, 2, d, ramp[2]); rect(g, 0, d - 2, w, 2, ramp[0]);
  rect(g, 2, 2, w - 4, 1, ramp[2]); rect(g, 2, 2, 1, d - 4, ramp[2]);
  if (extra === 'garden') { rect(g, 6, 6, Math.min(40, w - 12), d - 14, '#7fb357'); for (let i = 0; i < 40; i++) px(g, 7 + Math.floor(r() * (Math.min(40, w - 12) - 2)), 7 + Math.floor(r() * (d - 16)), r() < 0.5 ? '#9ccc6a' : '#5f9644'); rect(g, 6, 6, Math.min(40, w - 12), 1, '#d9d2c2'); }
  if (extra === 'solar') for (let i = 0; i < 3; i++) { const x = 6 + i * 16; if (x + 13 > w - 6) break; rect(g, x, 6, 13, 9, '#2c4a7a'); for (let k = 1; k < 4; k++) rect(g, x + k * 3 + 1, 6, 1, 9, '#5a7ab0'); rect(g, x, 10, 13, 1, '#5a7ab0'); rect(g, x, 15, 13, 1, '#1f3456'); }
  if (extra === 'helipad') { const cx = Math.floor(w / 2), cy = Math.floor(d / 2); ellipse(g, cx, cy, 13, 13, '#5c5f66'); ellipse(g, cx, cy, 11, 11, '#6c7078'); rect(g, cx - 4, cy - 5, 2, 11, '#f2f0e8'); rect(g, cx + 3, cy - 5, 2, 11, '#f2f0e8'); rect(g, cx - 2, cy, 5, 2, '#f2f0e8'); }
  for (let i = 0; i < items; i++) {
    const kind = Math.floor(r() * 3), x = 6 + Math.floor(r() * Math.max(1, w - 30)), y = 5 + Math.floor(r() * Math.max(1, d - 22));
    if (extra !== 'none' && x < 54 && y < d - 10) continue;
    if (kind === 0) { rect(g, x, y, 11, 8, '#d9dde3'); rect(g, x, y, 11, 2, '#f0f2f5'); rect(g, x + 11, y + 1, 1, 8, 'rgba(0,0,0,0.18)'); rect(g, x, y + 8, 11, 1, 'rgba(0,0,0,0.18)'); ellipse(g, x + 5, y + 5, 2, 2, '#7a808a'); }
    else if (kind === 1) { rect(g, x, y + 3, 10, 9, '#7aa8c8'); ellipse(g, x + 5, y + 3, 5, 2, '#a8cce0'); rect(g, x + 10, y + 3, 1, 9, 'rgba(0,0,0,0.18)'); rect(g, x + 1, y + 6, 8, 1, '#5f8fae'); }
    else { rect(g, x, y, 16, 9, ramp[0]); rect(g, x, y + 9, 16, 6, ramp[2]); rect(g, x + 6, y + 10, 4, 5, '#5a5a64'); rect(g, x + 16, y + 1, 1, 14, 'rgba(0,0,0,0.18)'); }
  }
}

function facade(g: Ctx, w: number, d: number, h: number, ramp: Ramp) {
  rect(g, 0, d, w, h, ramp[1]); rect(g, 0, d, 1, h, ramp[0]); rect(g, w - 2, d, 2, h, ramp[2]);
  rect(g, 0, d, w, 1, ramp[0]); rect(g, 0, d + 1, w, 1, ramp[2]); rect(g, 0, d + h - 1, w, 1, ramp[3]);
}

function windowAt(p: Painter, x: number, y: number, w: number, h: number, frame: string, glass = GLASS, litChance = 0.42) {
  const { g, night, r } = p;
  rect(g, x - 1, y - 1, w + 2, h + 2, frame);
  if (night && r() < litChance) {
    rect(g, x, y, w, h, WARM); rect(g, x, y, w, 1, WARM_HI); rect(g, x + w - 1, y + 1, 1, h - 1, '#e6ad55');
    p.lights.push({ x, y, w, h });
  } else {
    rect(g, x, y, w, h, night ? shade(glass[2], -0.35) : glass[1]); rect(g, x, y, w, 1, night ? shade(glass[2], -0.5) : glass[2]);
    if (!night) { px(g, x + 1, y + 1, glass[0]); if (w > 3) px(g, x + 2, y + 1, glass[0]); if (h > 4) px(g, x + 1, y + 2, glass[0]); }
  }
}

function balcony(g: Ctx, x: number, y: number, w: number) {
  rect(g, x, y + 3, w, 1, '#d8d0c0'); rect(g, x, y, w, 1, '#3b3a42');
  for (let i = x; i < x + w; i += 2) rect(g, i, y + 1, 1, 2, '#4b4a52');
}

function awningStripe(g: Ctx, x: number, y: number, w: number, color: string) {
  for (let i = 0; i < w; i++) rect(g, x + i, y, 1, 5, (Math.floor(i / 2) % 2) ? '#f6f2ea' : color);
  rect(g, x, y, w, 1, shade(color, 0.3));
  for (let i = 0; i < w; i += 2) px(g, x + i, y + 5, shade(color, -0.25));
  rect(g, x, y + 6, w, 1, 'rgba(0,0,0,0.22)');
}

function storefront(p: Painter, x: number, y: number, w: number, h: number, warm: string, mullion = '#33363d') {
  const { g, night } = p;
  rect(g, x, y, w, h, night ? WARM : warm); rect(g, x, y, w, 2, night ? '#ffe9b0' : shade(warm, -0.18));
  for (let i = x + 3; i < x + w - 3; i += 7) { rect(g, i, y + h - 6, 4, 4, night ? '#c58d4f' : shade(warm, -0.35)); px(g, i + 1, y + 3, night ? '#fff6dc' : '#fff1c4'); }
  rect(g, x, y, 1, h, mullion); rect(g, x + w - 1, y, 1, h, mullion); rect(g, x, y + h - 1, w, 1, mullion);
  for (let i = x + 12; i < x + w - 4; i += 12) rect(g, i, y, 1, h, mullion);
  if (!night) for (let i = 0; i < Math.min(w, h) - 3; i += 1) if (i % 9 < 2) px(g, x + 3 + i, y + h - 3 - i, 'rgba(255,255,255,0.35)');
  if (night) p.lights.push({ x, y, w, h });
}

function sign(g: Ctx, text: string, cx: number, y: number, fg: string, bg: string, pad = 2) {
  const tw = textWidth(text);
  const x = Math.round(cx - tw / 2 - pad);
  rect(g, x, y, tw + pad * 2, 7, bg); rect(g, x, y, tw + pad * 2, 1, shade(bg, 0.25)); rect(g, x, y + 6, tw + pad * 2, 1, shade(bg, -0.3));
  pixelText(g, text, x + pad, y + 1, fg);
}

function door(g: Ctx, x: number, y: number, w: number, h: number, night: boolean) {
  rect(g, x, y, w, h, '#3a3d44'); rect(g, x + 1, y + 1, w - 2, h - 1, night ? '#f2d79c' : '#8fb2c6');
  rect(g, x + Math.floor(w / 2), y + 1, 1, h - 1, '#3a3d44'); px(g, x + Math.floor(w / 2) - 2, y + Math.floor(h / 2), '#e8e8e8'); px(g, x + Math.floor(w / 2) + 2, y + Math.floor(h / 2), '#e8e8e8');
  if (!night) { px(g, x + 2, y + 2, '#d8eaf4'); px(g, x + 3, y + 2, '#d8eaf4'); }
}

const SHOPS: { wall: Ramp; win: 'grid' | 'tall' | 'band' | 'slit'; awning: string; sign: string; signBg: string; brick: boolean; roof: 'none' | 'garden' | 'solar' }[] = [
  { wall: ['#d98b6d', '#c06e52', '#9e5640', '#723b2c'], win: 'grid', awning: '#2f9a7f', sign: 'MART 24', signBg: '#24735f', brick: true, roof: 'none' },
  { wall: ['#f6ecd8', '#ead9bc', '#d1bd9a', '#a6916c'], win: 'grid', awning: '#e47c8e', sign: 'BAKERY', signBg: '#b94f66', brick: false, roof: 'garden' },
  { wall: ['#fafaf8', '#ececea', '#d2d2ce', '#a5a5a0'], win: 'slit', awning: '#3a3e48', sign: 'FLOWER', signBg: '#3a3e48', brick: false, roof: 'none' },
  { wall: ['#e6f0f0', '#d1e1e1', '#b2c8c8', '#84a0a0'], win: 'band', awning: '#33a093', sign: 'CLINIC', signBg: '#2a8076', brick: false, roof: 'solar' },
  { wall: ['#e5ddd2', '#d3c8b8', '#b8ab98', '#8b7f6d'], win: 'grid', awning: '#e8a040', sign: 'BOOKS', signBg: '#a8681f', brick: false, roof: 'none' },
  { wall: ['#c9d1df', '#b3bdcf', '#96a2b8', '#6a7690'], win: 'band', awning: '#2f4470', sign: 'BANK', signBg: '#24365c', brick: false, roof: 'solar' },
  { wall: ['#f3e5d8', '#dac6bb', '#b4968c', '#775c59'], win: 'tall', awning: '#518c91', sign: 'ORBIT', signBg: '#375d6d', brick: false, roof: 'garden' },
];

function paintShop(p: Painter, b: Building) {
  const { g, night } = p;
  const s = SHOPS[b.v % SHOPS.length]!;
  const W = b.w, D = b.d, H = b.h;
  roof(p, W, D, ROOF, Math.max(1, Math.floor(W / 40)), s.roof);
  facade(g, W, D, H, s.wall);
  if (s.brick) for (let y = D + 2; y < D + H - 22; y += 3) for (let x = ((y / 3) % 2) * 3; x < W - 2; x += 6) { rect(g, x, y + 2, 6, 1, s.wall[2]); px(g, x, y, s.wall[2]); }
  const gTop = D + H - 22, floors = Math.max(1, Math.floor((H - 26) / 15));
  for (let f = 0; f < floors; f++) {
    const fy = D + 4 + f * 15;
    rect(g, 0, fy + 13, W, 1, s.wall[0]); rect(g, 0, fy + 14, W, 1, s.wall[2]);
    if (s.win === 'band') { windowAt(p, 4, fy + 3, W - 9, 7, s.wall[3], GLASS, 0.6); for (let x = 12; x < W - 6; x += 9) rect(g, x, fy + 3, 1, 7, s.wall[3]); }
    else if (s.win === 'slit') for (let x = 6; x < W - 6; x += 7) windowAt(p, x, fy + 2, 3, 10, s.wall[3]);
    else for (let x = 5; x + 8 < W - 3; x += 12) { windowAt(p, x, fy + 3, 8, 7, s.wall[3]); rect(g, x + 4, fy + 3, 1, 7, s.wall[3]); if (b.v === 1) { rect(g, x - 1, fy + 10, 10, 2, '#7a5034'); for (let k = 0; k < 9; k += 2) px(g, x + k, fy + 9, k % 4 ? '#f06a8a' : '#f8e070'); } }
  }
  rect(g, 0, gTop - 1, W, 2, s.wall[0]); rect(g, 0, gTop + 1, W, 1, s.wall[3]);
  const doorX = W - 18;
  storefront(p, 3, gTop + 9, doorX - 6, 12, '#e9d3a6');
  door(g, doorX, gTop + 8, 12, 13, night);
  awningStripe(g, 2, gTop + 2, doorX - 4, s.awning);
  sign(g, s.sign, Math.floor((doorX - 2) / 2) + 1, Math.max(D + 2, gTop - 9), '#fbf6ea', s.signBg);
}

function paintOffice(p: Painter, b: Building) {
  const { g, night, r } = p;
  const W = b.w, D = b.d, H = b.h;
  roof(p, W, D, ['#9aa3ad', '#87909b', '#727b86', '#555d68'], 2, 'helipad');
  const gTop = D + H - 20;
  for (let y = D; y < gTop; y++) for (let x = 0; x < W; x++) {
    const band = (y - D) % 12, col = x % 8;
    let c = night ? (band < 2 ? '#2a3442' : '#22303f') : (band < 2 ? '#6d7c8c' : x - (y - D) * 0.6 > (W * 0.25) && x - (y - D) * 0.6 < W * 0.45 ? '#a9cbe2' : '#7fa7c6');
    if (col === 0 && band >= 2) c = night ? '#1a222d' : '#5c6f82';
    rect(g, x, y, 1, 1, c);
  }
  if (night) for (let fy = D + 2; fy < gTop - 9; fy += 12) for (let x = 1; x < W - 8; x += 8) if (r() < 0.35) { rect(g, x, fy, 7, 9, '#f6dfa0'); p.lights.push({ x, y: fy, w: 7, h: 9 }); }
  rect(g, 0, D, 1, gTop - D, '#c9dbe8'); rect(g, W - 2, D, 2, gTop - D, '#4f6478'); rect(g, 0, D, W, 1, '#c9dbe8');
  rect(g, 0, gTop, W, 20, '#5b6672'); rect(g, 0, gTop, W, 2, '#8a96a3');
  storefront(p, 4, gTop + 4, W - 8, 15, '#cfe2ec', '#3f4a56');
  door(g, Math.floor(W / 2) - 7, gTop + 6, 14, 14, night);
  rect(g, 0, D + H - 1, W, 1, '#3f4a56');
}

function paintHotel(p: Painter, b: Building) {
  const { g, night } = p;
  const W = b.w, D = b.d, H = b.h;
  const ramp: Ramp = ['#f3e9d4', '#e5d7bc', '#cbb998', '#9d8b6a'];
  roof(p, W, D, ROOF, 3, 'garden');
  facade(g, W, D, H, ramp);
  const gTop = D + H - 24;
  for (let fy = D + 5; fy + 12 < gTop; fy += 13) for (let x = 6; x < W - 22; x += 10) windowAt(p, x, fy, 6, 8, ramp[3]);
  rect(g, W - 16, D + 6, 10, 54, '#7b2f3a'); rect(g, W - 16, D + 6, 10, 1, '#a8505c');
  'HOTEL'.split('').forEach((ch, i) => pixelText(g, ch, W - 12, D + 10 + i * 9, night ? '#fff0c0' : '#f6e2b0'));
  if (night) p.lights.push({ x: W - 16, y: D + 6, w: 10, h: 54 });
  rect(g, 0, gTop - 1, W, 2, ramp[0]);
  storefront(p, 4, gTop + 8, W - 8, 15, '#f0dcb0');
  rect(g, 18, gTop + 2, W - 36, 5, '#3a2f2c'); rect(g, 18, gTop + 2, W - 36, 1, '#5e4d47'); for (let x = 22; x < W - 22; x += 8) px(g, x, gTop + 6, '#ffe39a');
  door(g, Math.floor(W / 2) - 8, gTop + 9, 16, 15, night);
}

function paintHospital(p: Painter, b: Building) {
  const { g, night } = p;
  const W = b.w, D = b.d, H = b.h;
  const ramp: Ramp = ['#fbfcfc', '#ecf0f0', '#d0d8d8', '#a0aaab'];
  roof(p, W, D, ['#c3c8cc', '#b0b6bb', '#9aa1a7', '#7b8288'], 2, 'helipad');
  facade(g, W, D, H, ramp);
  const gTop = D + H - 24;
  sign(g, 'HOSPITAL', Math.floor(W / 2) + 6, D + 4, '#ffffff', '#2a8f87', 3);
  const cx = Math.floor(W / 2) - 16; rect(g, cx - 4, D + 4, 9, 7, '#ffffff'); rect(g, cx - 1, D + 5, 3, 5, '#2aa39a'); rect(g, cx - 3, D + 6, 7, 3, '#2aa39a');
  for (let fy = D + 15; fy + 9 < gTop; fy += 12) { windowAt(p, 4, fy, W - 9, 7, '#7d8a8c', ['#c7ece8', '#7fc3bd', '#4f9690'], 0.55); for (let x = 12; x < W - 6; x += 10) rect(g, x, fy, 1, 7, '#7d8a8c'); }
  rect(g, 0, gTop - 1, W, 2, ramp[2]);
  storefront(p, 4, gTop + 9, W - 8, 14, '#e2f0ee', '#4f6466');
  rect(g, Math.floor(W / 2) - 22, gTop + 2, 44, 6, '#2a8f87'); rect(g, Math.floor(W / 2) - 22, gTop + 2, 44, 1, '#4fb5ad');
  door(g, Math.floor(W / 2) - 9, gTop + 9, 18, 15, night);
}

function paintEuroPlaza(p: Painter, b: Building): Rect {
  const { g, night } = p;
  const W = b.w, D = b.d, H = b.h;
  const ramp: Ramp = ['#f2ece0', '#e2dacb', '#cac0ae', '#9b917f'];
  roof(p, W, D, ['#bab8b2', '#a6a49e', '#908e88', '#706e69'], 3);
  rect(g, 0, D - 6, W, 6, '#3b4050'); rect(g, 0, D - 6, W, 1, '#5d6479'); rect(g, 0, D - 1, W, 1, '#272b36');
  facade(g, W, D, H, ramp);
  const top = D + 2, fH = 16, gTop = D + H - 22;
  for (let y = top; y < gTop; y += 4) for (let x = 0; x < W; x += 12) rect(g, x, y, 1, 1, ramp[2]);
  for (let f = 0; f < 4; f++) {
    const fy = top + f * fH;
    rect(g, 0, fy + fH - 2, W, 1, ramp[0]); rect(g, 0, fy + fH - 1, W, 1, ramp[2]);
    for (let i = 0; i < 10; i++) {
      const wx = 6 + i * 12;
      if (f === 3 && (i === 4 || i === 5)) continue;
      if ((f === 1 || f === 2) && i >= 8) continue;
      windowAt(p, wx, fy + 2, 6, 10, '#a39886', ['#7c98c4', '#2f4268', '#1f2d4a']);
      balcony(g, wx - 1, fy + 10, 8);
    }
  }
  // Large round clock above the central doorway.
  const ccx = 64, ccy = top + 3 * fH + 6;
  ellipse(g, ccx, ccy, 7, 7, '#6a6a72'); ellipse(g, ccx, ccy, 6, 6, '#24242a');
  for (const [dx, dy] of [[0, -5], [0, 5], [-5, 0], [5, 0]] as [number, number][]) px(g, ccx + dx, ccy + dy, '#f2eee4');
  rect(g, ccx, ccy - 4, 1, 4, '#f2eee4'); rect(g, ccx, ccy, 3, 1, '#f2eee4'); px(g, ccx, ccy, '#e8c88a');
  if (night) p.lights.push({ x: ccx - 6, y: ccy - 6, w: 12, h: 12 });
  // Ground floor.
  rect(g, 0, gTop - 2, W, 3, ramp[0]); rect(g, 0, gTop + 1, W, 1, ramp[3]);
  const gy = gTop + 2;
  for (let i = 0; i < 3; i++) {
    const bx = 2 + i * 19;
    storefront(p, bx, gy + 8, 17, 11, '#e6c890', '#4a3f38');
    const insets = [3, 1, 0, 0, 0, 0];
    insets.forEach((ins, k) => rect(g, bx + ins, gy + 1 + k, 17 - ins * 2, 1, k < 2 ? '#62b480' : '#3f8a5a'));
    for (let x = bx + 2; x < bx + 16; x += 4) rect(g, x, gy + 3, 2, 4, '#4f9e6c');
    for (let x = bx; x < bx + 17; x += 2) px(g, x, gy + 7, '#2b6a44');
    rect(g, bx, gy + 8, 17, 1, 'rgba(0,0,0,0.25)');
  }
  rect(g, 59, gy, 12, 20, '#4a4450'); rect(g, 61, gy + 5, 8, 15, '#7a5a40'); rect(g, 65, gy + 5, 1, 15, '#5a3f2b'); px(g, 63, gy + 12, '#e8c88a'); px(g, 67, gy + 12, '#e8c88a');
  rect(g, 58, D + H - 2, 14, 2, ramp[0]);
  sign(g, 'EURO PLAZA', 100, gy, '#e8c88a', '#2c3140', 3);
  rect(g, 74, gy + 8, 52, 12, night ? '#f2dca0' : '#8fb8c8');
  for (let x = 74; x <= 126; x += 8) rect(g, x, gy + 8, 1, 12, '#4a5866');
  rect(g, 74, gy + 8, 52, 1, '#4a5866');
  if (!night) for (let x = 76; x < 124; x += 9) { px(g, x, gy + 17, '#d8eef6'); px(g, x + 1, gy + 16, '#d8eef6'); }
  else p.lights.push({ x: 74, y: gy + 8, w: 52, h: 12 });
  door(g, 92, gy + 7, 16, 13, night);
  // Digital billboard frame (content animated at draw time).
  const bb = { x: 98, y: top + fH + 1, w: 26, h: fH * 2 - 4 };
  rect(g, bb.x - 1, bb.y - 1, bb.w + 2, bb.h + 2, '#24262d');
  rect(g, bb.x, bb.y, bb.w, bb.h, '#4b3b7a');
  return bb;
}

function paintB2BC(p: Painter, b: Building) {
  const { g, night } = p;
  const W = b.w, D = b.d, H = b.h;
  const ramp: Ramp = ['#f1f2f4', '#e0e3e6', '#c6cacf', '#9da2a9'];
  roof(p, W, D, ['#b6b8bb', '#a3a5a8', '#8e9093', '#707276'], 2);
  facade(g, W, D, H, ramp);
  for (let y = D + 9; y < D + H - 26; y += 8) rect(g, 1, y, W - 3, 1, '#d3d6da');
  for (let x = 10; x < W - 2; x += 10) rect(g, x, D + 2, 1, H - 28, '#d6d9dd');
  for (let f = 0; f < 2; f++) {
    const fy = D + 3 + f * 15;
    [6, 32, 58].forEach((x, i) => {
      rect(g, x - 2, fy, 20, 12, ramp[0]); rect(g, x - 2, fy + 11, 20, 1, ramp[2]);
      windowAt(p, x, fy + 2, 16, 8, '#3a3f48', ['#cfe2f0', '#86aed0', '#5c84a8']);
      rect(g, x + 8, fy + 2, 1, 8, '#3a3f48');
      if ((f + i) % 2 === 1 && !night) for (let k = 0; k < 4; k += 2) rect(g, x, fy + 2 + k, 16, 1, '#f2f2ee');
    });
  }
  const gTop = D + H - 26;
  rect(g, 0, gTop, W, 7, '#2d2f34'); rect(g, 0, gTop, W, 1, '#4a4d55'); rect(g, 0, gTop + 7, W, 1, 'rgba(0,0,0,0.3)');
  const label = 'B2BC COFFEE'; pixelText(g, label, Math.round((W - textWidth(label)) / 2), gTop + 1, night ? '#ffe7b8' : '#f4e6c8');
  if (night) p.lights.push({ x: 4, y: gTop + 1, w: W - 8, h: 5 });
  storefront(p, 2, gTop + 8, 58, 18, '#ecd29d', '#2a2c30');
  rect(g, 8, gTop + 19, 30, 5, night ? '#b07a44' : '#a8784e'); rect(g, 8, gTop + 19, 30, 1, '#d8b080');
  ellipse(g, 50, gTop + 18, 3, 3, '#5f9c45'); px(g, 49, gTop + 16, '#8cc65c');
  for (const x of [12, 24, 36]) { rect(g, x, gTop + 8, 1, 3, '#2a2c30'); rect(g, x - 1, gTop + 11, 3, 2, '#fff1c0'); }
  door(g, 62, gTop + 8, 14, 18, night);
}

const cache = new Map<string, BuildingArt>();
export function buildingArt(b: Building): BuildingArt {
  const hit = cache.get(b.id);
  if (hit) return hit;
  const make = (night: boolean) => {
    const { c, g } = makeCanvas(b.w, b.d + b.h);
    const p: Painter = { g, night, r: rng(b.x * 7 + b.y * 13 + b.w), lights: [] };
    let billboard: Rect | null = null;
    switch (b.kind) {
      case 'europlaza': billboard = paintEuroPlaza(p, b); break;
      case 'b2bc': paintB2BC(p, b); break;
      case 'office': paintOffice(p, b); break;
      case 'hotel': paintHotel(p, b); break;
      case 'hospital': paintHospital(p, b); break;
      default: paintShop(p, b);
    }
    return { c, lights: p.lights, billboard };
  };
  const day = make(false), night = make(true);
  const art: BuildingArt = { day: day.c, night: night.c, lights: night.lights, billboard: day.billboard };
  cache.set(b.id, art);
  return art;
}

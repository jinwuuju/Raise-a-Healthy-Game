import type { Building } from '../world/rooms';
import type { Rect } from '../world/types';
import { ellipse, jinU, makeCanvas, pixelText, px, rect, rng, shade, textWidth, type Ctx } from './pixel';

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

/**
 * Euro Plaza after the user's street photos (2026-10-14, D088): a tall white tower with the EURO letters at the
 * side-street (west) end, and a lower classical stone block with a dark steel roof pergola, wrought-iron balconies,
 * green awnings and the lobby door. The lobby door keeps its old position so the street door zone is unchanged.
 */
function paintEuroPlaza(p: Painter, b: Building): Rect | null {
  const { g, night, r } = p;
  const W = b.w, D = b.d, H = b.h, base = D + H, gy = base - 22;
  const TW = 42, SX = TW, SW = W - TW, SH = H - 28, sTop = H - SH, fy0 = sTop + D;
  const ramp: Ramp = ['#f2ece0', '#e2dacb', '#cac0ae', '#9b917f'];
  // Stone block roof: terrace deck, glass penthouse and the steel pergola frame.
  g.save(); g.translate(SX, sTop);
  roof(p, SW, D, ['#bab8b2', '#a6a49e', '#908e88', '#706e69'], 0);
  rect(g, 4, 4, SW - 8, D - 9, '#b39a7c');
  for (let y = 6; y < D - 6; y += 3) rect(g, 4, y, SW - 8, 1, '#9c8467');
  rect(g, 16, 10, SW - 32, D - 30, '#86a6bf'); rect(g, 16, 10, SW - 32, 2, '#b9d3e6'); rect(g, 16, D - 21, SW - 32, 1, '#4f6b82');
  for (let x = 16; x < SW - 16; x += 9) rect(g, x, 10, 1, D - 30, '#4f6b82');
  rect(g, 2, 2, SW - 4, 2, '#2c2f36'); rect(g, 2, 2, 2, D - 6, '#2c2f36'); rect(g, SW - 4, 2, 2, D - 6, '#2c2f36');
  for (let x = 10; x < SW - 6; x += 10) rect(g, x, 4, 1, D - 10, 'rgba(36,38,46,0.55)');
  g.restore();
  rect(g, SX, sTop, 6, D, 'rgba(40,36,60,0.2)');
  // White tower roof and face.
  rect(g, 0, 0, TW, D, '#e3e6e6'); rect(g, 0, 0, TW, 2, '#f7f8f8'); rect(g, 0, 0, 2, D, '#f7f8f8'); rect(g, TW - 2, 0, 2, D, '#c6cacb'); rect(g, 0, D - 2, TW, 2, '#f7f8f8');
  rect(g, 3, 3, TW - 6, 1, '#cdd1d2');
  for (let y = 10; y < D - 4; y += 8) rect(g, 3, y, TW - 6, 1, '#d6d9da');
  rect(g, 10, 14, 12, 9, '#d9dde3'); rect(g, 10, 14, 12, 2, '#f0f2f5'); ellipse(g, 16, 19, 2, 2, '#7a808a'); rect(g, 22, 15, 1, 9, 'rgba(0,0,0,0.15)');
  rect(g, 0, D, TW, H, '#eef0ef');
  for (let y = D + 3; y < gy; y += 4) rect(g, 1, y, TW - 3, 1, '#dde0e0');
  for (let x = 14; x < TW - 2; x += 14) rect(g, x, D + 1, 1, gy - D - 1, '#e2e5e5');
  rect(g, 0, D, 1, H, '#ffffff'); rect(g, 0, D, TW, 1, '#ffffff'); rect(g, TW - 2, D, 2, H, '#c8cccd');
  pixelText(g, 'EURO', 6, D + 6, '#26242c', 2);
  // Tower ground floor: small wine shop and a hanging banner.
  rect(g, 0, gy - 1, TW, 1, '#c8cccd'); rect(g, 0, gy, TW, 22, '#dfe2e2');
  storefront(p, 3, gy + 7, 24, 14, '#c9a878', '#2e3138');
  sign(g, 'WINE', 15, gy, '#3a3326', '#efe6cc');
  rect(g, 30, gy - 12, 8, 26, '#ddd7ef'); rect(g, 30, gy - 12, 8, 1, '#f4f1fb'); rect(g, 37, gy - 12, 1, 26, '#b9b1d6');
  rect(g, 31, gy - 9, 6, 1, '#8f88b0'); rect(g, 32, gy - 7, 4, 1, '#8f88b0'); ellipse(g, 34, gy + 4, 2, 3, '#7d8fc8');
  // Classical stone block.
  rect(g, SX, fy0, SW, SH, ramp[1]);
  for (let i = 0; i < (SW * SH) / 12; i++) px(g, SX + Math.floor(r() * SW), fy0 + Math.floor(r() * SH), r() < 0.5 ? shade(ramp[1], 0.05) : shade(ramp[1], -0.05));
  rect(g, SX, fy0, 1, SH, 'rgba(0,0,0,0.12)'); rect(g, W - 2, fy0, 2, SH, ramp[2]); rect(g, W - 1, fy0, 1, SH, ramp[3]);
  rect(g, SX, fy0, SW, 2, '#2c2f36');
  rect(g, SX, fy0 + 2, SW, 3, ramp[0]); rect(g, SX, fy0 + 5, SW, 1, ramp[2]);
  for (let x = SX + 1; x < W - 1; x += 3) rect(g, x, fy0 + 6, 2, 2, ramp[2]);
  rect(g, SX, fy0 + 8, SW, 1, ramp[3]);
  const bays = [SX + 8, SX + 37, SX + 66];
  for (const x of [SX + 29, SX + 58]) { rect(g, x, fy0 + 9, 2, gy - fy0 - 9, ramp[0]); rect(g, x + 2, fy0 + 9, 1, gy - fy0 - 9, ramp[2]); }
  for (let f = 0; f < 4; f++) {
    const fy = fy0 + 10 + f * 13;
    rect(g, SX, fy + 11, SW, 1, ramp[0]); rect(g, SX, fy + 12, SW, 1, ramp[2]);
    for (const bx of bays) for (const k of [0, 7]) {
      const wx = bx + k;
      rect(g, wx - 1, fy, 7, 1, ramp[0]); rect(g, wx - 1, fy + 1, 7, 1, ramp[3]);
      windowAt(p, wx, fy + 2, 5, 8, '#efe8da', ['#8a9cb6', '#3c4659', '#273040'], 0.4);
      rect(g, wx + 2, fy + 2, 1, 8, '#efe8da');
    }
    if (f === 1) balcony(g, SX + 2, fy + 7, SW - 4);
    else for (const bx of bays) balcony(g, bx - 2, fy + 7, 16);
  }
  // Ground floor: three green awnings over wooden blinds, and the lobby door.
  rect(g, SX, gy - 1, SW, 2, ramp[0]); rect(g, SX, gy + 1, SW, 1, ramp[3]);
  for (const bx of [SX + 2, SX + 23, 110]) {
    storefront(p, bx, gy + 9, 17, 12, '#9c6d48', '#4a3f38');
    for (let y = gy + 11; y < gy + 20; y += 2) rect(g, bx + 1, y, 15, 1, night ? '#e0b070' : '#7d5638');
    [3, 1, 0, 0, 0, 0].forEach((ins, k) => rect(g, bx + ins, gy + 1 + k, 17 - ins * 2, 1, k < 2 ? '#62b480' : '#3f8a5a'));
    for (let x = bx + 2; x < bx + 16; x += 4) rect(g, x, gy + 3, 2, 4, '#4f9e6c');
    for (let x = bx; x < bx + 17; x += 2) px(g, x, gy + 7, '#2b6a44');
    rect(g, bx, gy + 8, 17, 1, 'rgba(0,0,0,0.25)');
  }
  rect(g, 86, gy + 1, 22, 21, '#3d4049'); rect(g, 86, gy + 1, 22, 1, '#5a5e69');
  sign(g, 'LOBBY', 97, gy + 1, '#f4f0e6', '#2c3140');
  door(g, 92, gy + 9, 16, 13, night);
  rect(g, 0, base - 1, W, 1, '#7d7465');
  return null;
}

/** Game-original colours for the fictional Jin-U convenience store (no real brand colours, marks or slogans). */
const JINU = { teal: '#17837c', hi: '#40b3a8', dk: '#0f5d58', coral: '#ff7b5f', coralDk: '#d65a40' };
const BRICK: Ramp = ['#d27a5c', '#b85d43', '#984a35', '#6e3426'];

function bricks(g: Ctx, W: number, y0: number, y1: number, ramp: Ramp) {
  for (let y = y0; y < y1; y += 3) for (let x = (Math.floor(y / 3) % 2) * 3; x < W - 2; x += 6) { rect(g, x, y + 2, 6, 1, ramp[2]); px(g, x, y, ramp[2]); }
}

/*
 * Street-front rule (D089): buildings on the south side of the narrow lane face Euro Plaza (north), i.e. away from
 * the 3/4 camera, which can only see south-facing walls. Their lane-side front (one upper floor, the sign, the shop
 * glass and the entrance) is stood up along the north edge of the picture, where it borders the pavement in front of
 * Euro Plaza; the roof follows behind it and the plain back wall faces Dosan-daero at the bottom.
 */
const FRONT = 44, ROOF_D = 26;

function backWall(p: Painter, W: number, top: number, bottom: number, ramp: Ramp, brick: boolean) {
  const { g } = p;
  rect(g, 0, top, W, bottom - top, ramp[2]);
  rect(g, 0, top, W, 1, ramp[1]); rect(g, 0, bottom - 1, W, 1, ramp[3]); rect(g, W - 2, top, 2, bottom - top, ramp[3]);
  if (brick) for (let y = top + 2; y < bottom - 2; y += 3) for (let x = (Math.floor(y / 3) % 2) * 3; x < W - 2; x += 6) { rect(g, x, y + 2, 6, 1, ramp[3]); px(g, x, y, ramp[3]); }
  for (let x = 6; x + 7 < W - 4; x += 14) windowAt(p, x, top + 4, 7, 6, ramp[3], GLASS, 0.3);
  rect(g, W - 16, bottom - 12, 10, 11, '#5b5f68'); rect(g, W - 15, bottom - 11, 8, 10, '#70757f'); px(g, W - 9, bottom - 6, '#d8dbe0');
  rect(g, 4, bottom - 9, 10, 7, '#e3e6ea'); rect(g, 4, bottom - 9, 10, 1, '#f6f7f8'); for (let x = 5; x < 13; x += 2) rect(g, x, bottom - 7, 1, 4, '#a9afb8');
}

function roofBehind(p: Painter, W: number, ramp: Ramp, items: number) {
  const { g } = p;
  g.save(); g.translate(0, FRONT); roof(p, W, ROOF_D, ramp, items); g.restore();
  rect(g, 0, FRONT, W, 1, 'rgba(0,0,0,0.28)');
}

function shelves(p: Painter, x0: number, x1: number, y: number) {
  const { g, r } = p;
  for (let x = x0; x < x1; x += 2) {
    px(g, x, y, ['#e85d5d', '#f2c14e', '#5aa0e0', '#7cc36a', '#f4f4f4'][Math.floor(r() * 5)]!);
    px(g, x, y + 5, ['#5aa0e0', '#f2c14e', '#e88aa8', '#f4f4f4'][Math.floor(r() * 4)]!);
    if (r() < 0.5) px(g, x, y + 10, ['#f4f4f4', '#7cc36a', '#e85d5d'][Math.floor(r() * 3)]!);
  }
  rect(g, x0 - 1, y + 1, x1 - x0 + 1, 1, '#9aa4a8'); rect(g, x0 - 1, y + 6, x1 - x0 + 1, 1, '#9aa4a8'); rect(g, x0 - 1, y + 11, x1 - x0 + 1, 1, '#9aa4a8');
}

/** Red-brick block with the fictional Jin-U store; sign and entrance face Euro Plaza (user photos 2, 4, 6). */
function paintJinU(p: Painter, b: Building) {
  const { g, night } = p;
  const W = b.w, T = b.d + b.h;
  rect(g, 0, 0, W, 13, BRICK[1]); rect(g, 0, 0, W, 1, BRICK[0]); rect(g, W - 2, 0, 2, 13, BRICK[2]);
  bricks(g, W, 1, 11, BRICK);
  for (const x of [5, 20, 35, 50]) {
    rect(g, x - 1, 1, 10, 1, '#f1ece2'); rect(g, x + 3, 0, 2, 1, '#f1ece2');
    windowAt(p, x, 3, 8, 7, '#ece6da'); rect(g, x + 4, 3, 1, 7, '#ece6da');
    rect(g, x - 1, 10, 10, 1, '#f1ece2');
  }
  windowAt(p, 66, 2, 7, 9, '#5a4038', ['#a4bccb', '#4f6676', '#364754'], 0.5);
  rect(g, 0, 13, W, 9, JINU.teal); rect(g, 0, 13, W, 1, JINU.hi); rect(g, 0, 22, W, 1, JINU.coral); rect(g, 0, 23, W, 1, JINU.coralDk);
  jinU(g, 5, 14, night ? '#fffbe8' : '#ffffff');
  ellipse(g, 24, 17, 2, 2, JINU.coral);
  pixelText(g, '24', W - 12, 15, night ? '#fffbe8' : '#ffffff');
  if (night) p.lights.push({ x: 0, y: 13, w: W, h: 11 });
  storefront(p, 2, 24, 28, 18, '#eef4f2', '#2b3a3a');
  storefront(p, 48, 24, 30, 18, '#eef4f2', '#2b3a3a');
  shelves(p, 4, 28, 27); shelves(p, 50, 76, 27);
  rect(g, 30, 24, 18, 18, '#2b3a3a'); door(g, 32, 24, 14, 18, night);
  rect(g, 0, 42, W, 2, '#c9c5be'); rect(g, 0, 42, W, 1, '#e4e0d8');
  roofBehind(p, W, ROOF, 1);
  backWall(p, W, FRONT + ROOF_D, T, BRICK, true);
}

/** Granite office block directly opposite Euro Plaza; its entrance faces the lobby door (user photo 3). */
function paintGranite(p: Painter, b: Building) {
  const { g, night, r } = p;
  const W = b.w, T = b.d + b.h;
  const ramp: Ramp = ['#ded8d4', '#ccc5c0', '#b2aaa5', '#857d78'];
  rect(g, 0, 0, W, 16, ramp[1]);
  for (let i = 0; i < W * 2; i++) px(g, Math.floor(r() * W), 1 + Math.floor(r() * 15), r() < 0.5 ? shade(ramp[1], 0.06) : shade(ramp[1], -0.07));
  rect(g, 0, 0, W, 1, ramp[0]); rect(g, W - 2, 0, 2, 16, ramp[2]); rect(g, 0, 6, 62, 1, shade(ramp[1], -0.08)); rect(g, 0, 12, 62, 1, shade(ramp[1], -0.08));
  for (let x = 8; x < 62; x += 8) rect(g, x, 1, 1, 15, shade(ramp[1], -0.05));
  for (let k = 0; k < 7; k++) { const x = 4 + k * 8 + (k % 2); windowAt(p, x, 3, 3, 10, '#4f5660', GLASS, 0.4); if (k % 3 === 1) rect(g, x, 3, 3, 2, '#3b4148'); }
  rect(g, 62, 0, 2, 16, ramp[0]);
  rect(g, 64, 2, W - 66, 12, night ? '#2f3740' : '#5b656e'); rect(g, 64, 2, W - 66, 1, '#3f474f'); px(g, 72, 3, '#f2efe6'); px(g, 84, 3, '#f2efe6');
  rect(g, 64, 9, W - 66, 5, '#b5694f'); rect(g, 64, 9, W - 66, 1, '#cf8468');
  if (night) { rect(g, 66, 4, W - 70, 4, WARM); p.lights.push({ x: 66, y: 4, w: W - 70, h: 4 }); }
  rect(g, 0, 16, W, 2, ramp[0]); rect(g, 0, 18, W, 1, ramp[3]);
  rect(g, 0, 19, W, 23, '#bdb6b1');
  for (const x of [4, 14, 60, 72, 84]) windowAt(p, x, 22, 7, 12, '#3f4650', GLASS, 0.6);
  for (let y = 36; y < 42; y += 2) for (let x = -(y % 5); x < W; x += 7) { if (x > 22 && x < 54) continue; rect(g, x, y, 6, 1, ['#8d8278', '#a39686', '#7a7068', '#b0a493'][Math.floor(r() * 4)]!); }
  rect(g, 24, 19, 34, 4, '#2f7f74'); rect(g, 24, 19, 34, 1, '#58a596'); rect(g, 24, 23, 34, 1, 'rgba(0,0,0,0.25)');
  windowAt(p, 26, 25, 3, 16, '#3f4650', GLASS, 0.6); windowAt(p, 49, 25, 3, 16, '#3f4650', GLASS, 0.6);
  door(g, 31, 24, 16, 18, night);
  rect(g, 0, 42, W, 2, '#c9c5be'); rect(g, 26, 42, 26, 1, '#e8e4dc');
  roofBehind(p, W, ['#bdbab6', '#aaa7a3', '#94918d', '#75726e'], 1);
  rect(g, W - 14, FRONT + 4, 2, 9, '#7a808a'); rect(g, W - 17, FRONT + 4, 8, 1, '#7a808a');
  backWall(p, W, FRONT + ROOF_D, T, ramp, false);
}

/** Red-brick block with a rounded corner where the side street meets the lane (user photo 5; no shop names). */
function paintBrickCorner(p: Painter, b: Building) {
  const { g, night } = p;
  const W = b.w, D = b.d, H = b.h, base = D + H, gTop = base - 24, R = 16;
  const ramp: Ramp = ['#c9745a', '#ad5a42', '#8c4532', '#653124'];
  roof(p, W, D, ROOF, 2);
  facade(g, W, D, H, ramp);
  bricks(g, W, D + 2, gTop - 1, ramp);
  for (let f = 0; f < 3; f++) {
    const fy = D + 3 + f * 14;
    rect(g, 0, fy, W, 2, '#e8dfd2'); rect(g, 0, fy + 11, W, 2, '#e8dfd2'); rect(g, 0, fy + 13, W, 1, ramp[3]);
    windowAt(p, 3, fy + 3, W - 7, 7, '#4a3a34', ['#b2cad8', '#5f7f94', '#3f5a6c'], 0.5);
    for (let x = 12; x < W - 4; x += 9) rect(g, x, fy + 3, 1, 7, '#4a3a34');
  }
  rect(g, 0, gTop, W, 7, '#2e2a2b'); rect(g, 0, gTop, W, 1, '#4b4547'); for (let x = 1; x < W; x += 3) px(g, x, gTop + 7, '#1f1c1d');
  storefront(p, 3, gTop + 9, W - 22, 14, '#e5bd86', '#3a2a22');
  door(g, W - 17, gTop + 9, 12, 15, night);
  rect(g, 0, base - 1, W, 1, ramp[3]);
  // Rounded east corner: lift the front columns along the roof curve and shade them like a cylinder.
  const img = g.getImageData(0, 0, W, base), d = img.data;
  for (let x = W - R; x < W; x++) {
    const dx = x + 0.5 - (W - R), off = Math.round(R - Math.sqrt(Math.max(0, R * R - dx * dx)));
    if (off <= 0) continue;
    for (let y = D - off; y < base; y++) {
      const i = (y * W + x) * 4, src = y + off;
      if (src < base) { const j = (src * W + x) * 4; d[i] = d[j]!; d[i + 1] = d[j + 1]!; d[i + 2] = d[j + 2]!; d[i + 3] = d[j + 3]!; }
      else d[i + 3] = 0;
    }
    const k = 1 - 0.35 * (dx / R);
    for (let y = D - off; y < base - off; y++) { const i = (y * W + x) * 4; d[i] = d[i]! * k; d[i + 1] = d[i + 1]! * k; d[i + 2] = d[i + 2]! * k; }
  }
  g.putImageData(img, 0, 0);
}

/** B2BC cafe: white upper floor, long black awning and a glass front whose entrance faces Euro Plaza (D089). */
function paintB2BC(p: Painter, b: Building) {
  const { g, night } = p;
  const W = b.w, T = b.d + b.h;
  const ramp: Ramp = ['#f1f2f4', '#e0e3e6', '#c6cacf', '#9da2a9'];
  rect(g, 0, 0, W, 13, ramp[1]); rect(g, 0, 0, W, 1, ramp[0]); rect(g, W - 2, 0, 2, 13, ramp[2]);
  for (let x = 10; x < W - 2; x += 10) rect(g, x, 1, 1, 11, '#d6d9dd');
  [4, 30, 56].forEach((x, i) => {
    rect(g, x - 2, 1, 22, 11, ramp[0]);
    windowAt(p, x, 3, 18, 8, '#3a3f48', ['#cfe2f0', '#86aed0', '#5c84a8']);
    rect(g, x + 9, 3, 1, 8, '#3a3f48');
    if (i === 1 && !night) for (let k = 0; k < 6; k += 2) rect(g, x, 3 + k, 18, 1, '#f2f2ee');
  });
  rect(g, 0, 13, W, 8, '#2d2f34'); rect(g, 0, 13, W, 1, '#4a4d55'); rect(g, 0, 21, W, 1, 'rgba(0,0,0,0.3)');
  const label = 'B2BC COFFEE'; pixelText(g, label, Math.round((W - textWidth(label)) / 2), 15, night ? '#ffe7b8' : '#f4e6c8');
  if (night) p.lights.push({ x: 4, y: 14, w: W - 8, h: 6 });
  storefront(p, 2, 22, 56, 20, '#ecd29d', '#2a2c30');
  rect(g, 8, 34, 30, 5, night ? '#b07a44' : '#a8784e'); rect(g, 8, 34, 30, 1, '#d8b080');
  ellipse(g, 50, 33, 3, 3, '#5f9c45'); px(g, 49, 31, '#8cc65c');
  for (const x of [12, 24, 36]) { rect(g, x, 22, 1, 3, '#2a2c30'); rect(g, x - 1, 25, 3, 2, '#fff1c0'); }
  rect(g, 58, 22, 2, 20, '#2a2c30'); door(g, 60, 22, 16, 20, night); rect(g, 76, 22, 2, 20, '#2a2c30');
  rect(g, 0, 42, W, 2, '#c9c5be'); rect(g, 0, 42, W, 1, '#e4e0d8');
  roofBehind(p, W, ['#b6b8bb', '#a3a5a8', '#8e9093', '#707276'], 1);
  backWall(p, W, FRONT + ROOF_D, T, ramp, false);
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
      case 'jinu': paintJinU(p, b); break;
      case 'granite': paintGranite(p, b); break;
      case 'brickcorner': paintBrickCorner(p, b); break;
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

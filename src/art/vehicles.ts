import { makeCanvas, mirror, outline, rect, shade, type Sprite } from './pixel';

export type CarKind = 'sedan' | 'suv' | 'taxi' | 'bus';
export type CarDir = 'down' | 'up' | 'left' | 'right';
const GLASS = '#2e3b4d', GLASS_HI = '#5f7a96', TIRE = '#1f2127';

const cache = new Map<string, Sprite>();

export function carSprite(kind: CarKind, color: string, dir: CarDir): Sprite {
  const key = kind + color + dir;
  const hit = cache.get(key);
  if (hit) return hit;
  let s: Sprite;
  if (dir === 'left') { const r = carSprite(kind, color, 'right'); s = { c: mirror(r.c), ax: r.c.width - r.ax, ay: r.ay }; }
  else if (dir === 'right') s = horizontal(kind, color);
  else s = vertical(kind, color, dir);
  cache.set(key, s);
  return s;
}

function vertical(kind: CarKind, color: string, dir: 'down' | 'up'): Sprite {
  const bus = kind === 'bus';
  const W = bus ? 20 : 16, L = bus ? 48 : 24, F = 6, H = L + F;
  const { c, g } = makeCanvas(W + 2, H + 2);
  const base = bus ? (color === '#3da35d' ? color : '#2f6fb8') : color;
  const hi = shade(base, 0.22), lo = shade(base, -0.22);
  rect(g, 1, 1, W, L, base); rect(g, 1, 1, 1, L, hi); rect(g, W, 1, 1, L, lo);
  for (const y of bus ? [4, L - 8] : [3, L - 7]) { rect(g, 0, y, 1, 5, TIRE); rect(g, W + 1, y, 1, 5, TIRE); }
  if (bus) {
    rect(g, 3, 4, W - 4, L - 6, hi); for (let y = 6; y < L - 4; y += 6) rect(g, 3, y, W - 4, 1, base);
    rect(g, 4, 2, W - 6, 2, '#e8eef4'); rect(g, 5, L - 3, W - 8, 2, '#e8eef4');
  } else {
    const roof: [number, number] = kind === 'suv' ? [6, 16] : [8, 15];
    const front = dir === 'down';
    const ws = front ? [roof[1], roof[1] + 4] : [roof[0] - 4, roof[0]];
    const rw = front ? [roof[0] - 3, roof[0]] : [roof[1], roof[1] + 3];
    rect(g, 3, ws[0]!, W - 4, ws[1]! - ws[0]!, GLASS); rect(g, 4, ws[0]!, 2, 1, GLASS_HI);
    rect(g, 3, rw[0]!, W - 4, rw[1]! - rw[0]!, GLASS);
    rect(g, 3, roof[0], W - 4, roof[1] - roof[0], hi); rect(g, 3, roof[0], W - 4, 1, shade(base, 0.4));
    rect(g, 0, front ? roof[1] : roof[0] - 2, 1, 1, base); rect(g, W + 1, front ? roof[1] : roof[0] - 2, 1, 1, base);
    if (kind === 'taxi') { rect(g, 6, roof[0] + 2, 6, 3, '#f8f4e6'); rect(g, 6, roof[0] + 4, 6, 1, '#d8cfb0'); }
    rect(g, W / 2, front ? roof[1] + 5 : 2, 1, 4, hi);
  }
  const fy = L + 1;
  rect(g, 1, fy, W, F, lo); rect(g, 1, fy + F - 2, W, 2, '#2a2d36');
  if (dir === 'down') { rect(g, 2, fy + 1, 3, 2, '#fff6d0'); rect(g, W - 3, fy + 1, 3, 2, '#fff6d0'); rect(g, 6, fy + 1, W - 10, 2, '#3a3e48'); }
  else { rect(g, 2, fy + 1, 3, 2, '#e8443a'); rect(g, W - 3, fy + 1, 3, 2, '#e8443a'); rect(g, W / 2 - 2, fy + 2, 4, 2, '#f0ece0'); }
  outline(c, '#1b1d24');
  return { c, ax: Math.floor(c.width / 2), ay: c.height - 1 };
}

function horizontal(kind: CarKind, color: string): Sprite {
  const bus = kind === 'bus';
  const L = bus ? 52 : 30, T = bus ? 9 : 9, S = bus ? 13 : 8, W = L + 2, H = T + S + 2;
  const { c, g } = makeCanvas(W, H);
  const base = bus ? (color === '#3da35d' ? color : '#2f6fb8') : color;
  const hi = shade(base, 0.22), lo = shade(base, -0.2);
  rect(g, 1, 1, L, T, base); rect(g, 1, 1, L, 1, hi);
  if (bus) {
    rect(g, 3, 3, L - 4, T - 4, hi); rect(g, 1, T + 1, L, S, lo);
    rect(g, 3, T + 2, L - 6, 5, GLASS); for (let x = 9; x < L - 3; x += 7) rect(g, x, T + 2, 1, 5, lo);
    rect(g, 1, T + 8, L, 2, '#e8eef4'); rect(g, L - 3, T + 2, 3, 7, GLASS);
    for (const x of [6, L - 12]) { rect(g, x, T + S - 3, 7, 4, TIRE); rect(g, x + 2, T + S - 2, 3, 2, '#8a8f98'); }
  } else {
    const roof: [number, number] = kind === 'suv' ? [6, 20] : [8, 19];
    rect(g, roof[0] - 3, 1, 3, T, GLASS); rect(g, roof[1], 1, 4, T, GLASS); rect(g, roof[1] + 1, 2, 1, 2, GLASS_HI);
    rect(g, roof[0], 2, roof[1] - roof[0], T - 2, hi); rect(g, roof[0], 2, roof[1] - roof[0], 1, shade(base, 0.4));
    if (kind === 'taxi') { rect(g, roof[0] + 3, 3, 5, 4, '#f8f4e6'); rect(g, roof[0] + 3, 6, 5, 1, '#d8cfb0'); }
    rect(g, 1, T + 1, L, S, lo); rect(g, roof[0] - 2, T + 1, roof[1] - roof[0] + 5, 3, GLASS); rect(g, roof[0] + 6, T + 1, 1, 3, lo);
    rect(g, roof[0] + 7, T + 4, 1, 3, shade(base, -0.4));
    for (const x of [4, L - 9]) { rect(g, x, T + S - 3, 6, 4, TIRE); rect(g, x + 2, T + S - 2, 2, 2, '#8a8f98'); }
    rect(g, L - 1, T + 2, 2, 2, '#fff6d0'); rect(g, 1, T + 2, 1, 2, '#e8443a');
  }
  outline(c, '#1b1d24');
  return { c, ax: Math.floor(W / 2), ay: H - 1 };
}

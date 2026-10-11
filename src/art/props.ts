import type { PropKind } from '../world/rooms';
import { carSprite } from './vehicles';
import { modelProp } from './campaign';
import { ellipse, hash2, makeCanvas, outline, pixelText, px, rect, rng, shade, sprite, type Ctx, type Sprite } from './pixel';

const INK = '#2d2734';
const GINKGO = [['#fff3a6', '#f4d75c', '#dbb036', '#a9822b'], ['#e7ee90', '#c1d55c', '#94af40', '#6a8631'], ['#fde68c', '#ebc44c', '#cb972f', '#95692a']];
const LEAF = [['#b8e27e', '#88c65c', '#5f9c45', '#3e6f35'], ['#c4e88a', '#97cf66', '#6aa84c', '#457a3a']];

function canopy(g: Ctx, cx: number, cy: number, rx: number, ry: number, ramp: string[], seed: number) {
  const r = rng(seed);
  const blobs: [number, number, number][] = [[cx, cy, Math.min(rx, ry)]];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + r() * 0.3;
    blobs.push([cx + Math.cos(a) * (rx - 4), cy + Math.sin(a) * (ry - 4), 3.5 + r() * 2.5]);
  }
  blobs.push([cx, cy - ry + 5, 5], [cx - rx * 0.45, cy - ry * 0.4, 6], [cx + rx * 0.45, cy - ry * 0.4, 6]);
  const W = g.canvas.width, H = g.canvas.height;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const inside = blobs.some(([bx, by, br]) => (x + 0.5 - bx) ** 2 + (y + 0.5 - by) ** 2 <= br * br) && ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1.25;
    if (!inside) continue;
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    let l = -(dx * 0.55 + dy * 0.85) + (hash2(x >> 1, y >> 1, seed) - 0.5) * 0.7 + (hash2(x, y, seed + 7) - 0.5) * 0.25;
    const i = l > 0.55 ? 0 : l > 0.0 ? 1 : l > -0.55 ? 2 : 3;
    px(g, x, y, ramp[i]!);
  }
}

function tree(kind: 'ginkgo' | 'parktree', v: number): Sprite {
  const ramp = kind === 'ginkgo' ? GINKGO[v % 3]! : LEAF[v % 2]!;
  const W = kind === 'ginkgo' ? 34 : 38, H = 50;
  const { c, g } = makeCanvas(W, H);
  const mid = W / 2;
  rect(g, mid - 2, 30, 4, 17, '#6f5039'); rect(g, mid - 2, 30, 1, 17, '#8b6a4c'); rect(g, mid + 1, 30, 1, 17, '#523a29');
  rect(g, mid - 4, 44, 2, 3, '#6f5039'); rect(g, mid + 2, 45, 2, 2, '#6f5039');
  if (kind === 'ginkgo') canopy(g, mid, 18, 13, 17, ramp, v * 31 + 5); else canopy(g, mid, 19, 17, 16, ramp, v * 17 + 3);
  outline(c, shade(ramp[3]!, -0.45));
  if (kind === 'ginkgo') { rect(g, mid - 7, 46, 14, 3, '#5d5952'); for (let x = mid - 6; x < mid + 7; x += 2) px(g, x, 47, '#403d38'); }
  return { c, ax: Math.floor(mid), ay: 48 };
}

function fountain(frame: number): Sprite {
  return sprite(46, 34, 23, 32, g => {
    ellipse(g, 23, 22, 21, 9, '#cfc8ba'); ellipse(g, 23, 23, 21, 9, '#a49c8e');
    ellipse(g, 23, 21, 18, 7, '#5aa9d4'); ellipse(g, 23, 21, 15, 5, '#6fbbe0');
    for (let i = 0; i < 3; i++) {
      const rr = ((frame + i * 2) % 6) + 4;
      for (let a = 0; a < 24; a++) { const t = (a / 24) * Math.PI * 2; if ((a + frame) % 3 === 0) continue; px(g, 23 + Math.cos(t) * rr * 1.6, 21 + Math.sin(t) * rr * 0.55, '#bfe6f6'); }
    }
    rect(g, 21, 8, 5, 13, '#d8d1c3'); rect(g, 21, 8, 1, 13, '#ece6da'); rect(g, 25, 8, 1, 13, '#b3ab9c');
    ellipse(g, 23, 8, 7, 2, '#d8d1c3'); ellipse(g, 23, 8, 5, 1, '#6fbbe0');
    const drops = [[16, 6], [30, 6], [14, 10], [32, 10], [18, 3], [28, 3], [23, 1]];
    drops.forEach(([x, y], i) => { const o = (frame + i) % 4; px(g, x!, y! + o, '#e6f6fd'); if (o < 3) px(g, x!, y! + o + 1, '#a8dcf2'); });
  }, '#5d574d');
}

function bodyscope(frame: number): Sprite {
  const glow = ['#5fe0e8', '#7ff0f2', '#a6fbfb', '#7ff0f2'][frame % 4]!;
  return sprite(54, 58, 27, 54, g => {
    ellipse(g, 27, 46, 24, 7, '#9aa5b3'); ellipse(g, 27, 45, 24, 7, '#dfe5ec'); ellipse(g, 27, 45, 19, 5, '#c9d2dd');
    for (let a = 0; a < 48; a++) { const t = (a / 48) * Math.PI * 2; if ((a + frame * 2) % 6 < 3) px(g, 27 + Math.cos(t) * 21, 45 + Math.sin(t) * 6, glow); }
    for (let y = 4; y <= 46; y++) for (let x = 4; x <= 50; x++) {
      const d = Math.hypot(x + 0.5 - 27, (y + 0.5 - 26) * 1.0);
      if (d <= 21 && d >= 15 && y <= 44) {
        const lit = x < 27 ? '#e9eef4' : '#c3ccd8';
        px(g, x, y, d < 16 ? glow : lit);
      }
    }
    rect(g, 44, 30, 9, 15, '#3b4352'); rect(g, 44, 30, 9, 2, '#566072'); rect(g, 45, 33, 7, 5, glow); rect(g, 46, 40, 2, 2, '#f0c050'); rect(g, 49, 40, 2, 2, '#e05a5a');
    for (const [x, y] of [[27, 5], [10, 15], [44, 15], [8, 32], [46, 32]] as [number, number][]) px(g, x, y, glow);
  }, '#363d4b', g => {
    for (let y = 9; y <= 42; y++) for (let x = 8; x <= 46; x++) if (Math.hypot(x + 0.5 - 27, y + 0.5 - 26) < 15) px(g, x, y, 'rgba(110,230,240,0.18)');
    const sy = 13 + ((frame * 7) % 26);
    for (let x = 13; x <= 41; x++) if (Math.hypot(x + 0.5 - 27, sy + 0.5 - 26) < 14.5) px(g, x, sy, 'rgba(170,255,255,0.75)');
  });
}

/** Stylised model heart (not anatomical): two lobes, an exit gate on the right and an entry gate on the left. */
function heartcore(frame: number): Sprite {
  const beat = [0, 1, 2, 1][frame % 4]!;
  return sprite(72, 66, 36, 62, g => {
    ellipse(g, 36, 56, 30, 6, '#a52a42');
    const r = 15 + beat, cy = 26 - beat;
    const inside = (x: number, y: number) => {
      const l = (x - 24) ** 2 + (y - cy) ** 2 <= r * r, rr = (x - 48) ** 2 + (y - cy) ** 2 <= r * r;
      const tri = y >= cy && y <= 58 - beat && Math.abs(x - 36) <= (58 - beat - y) * 1.15;
      return l || rr || tri;
    };
    for (let y = 0; y < 66; y++) for (let x = 0; x < 72; x++) {
      if (!inside(x, y)) continue;
      const lit = -((x - 26) * 0.6 + (y - cy + 6) * 0.9) / 30;
      px(g, x, y, lit > 0.45 ? '#ff9aa8' : lit > 0.05 ? '#f0596e' : lit > -0.45 ? '#d43c55' : '#a8293f');
    }
    for (const [x0, y0] of [[22, 18], [26, 15], [31, 14]] as [number, number][]) px(g, x0, y0 - beat, '#ffd6dc');
    for (let i = 0; i < 9; i++) { px(g, 30 + i, 38 + Math.round(Math.sin(i * 0.9) * 2), '#b22d47'); }
    // Gates: entry (left, blue arrow in) and exit (right, red arrow out).
    rect(g, 2, 44, 12, 14, '#5c2134'); rect(g, 3, 45, 10, 12, '#f2dbe0'); rect(g, 4, 50, 6, 2, '#4a7fd0'); px(g, 10, 49, '#4a7fd0'); px(g, 10, 52, '#4a7fd0'); px(g, 11, 50, '#4a7fd0'); px(g, 11, 51, '#4a7fd0');
    rect(g, 58, 44, 12, 14, '#5c2134'); rect(g, 59, 45, 10, 12, '#f2dbe0'); rect(g, 61, 50, 6, 2, '#e04a5e'); px(g, 67, 49, '#e04a5e'); px(g, 67, 52, '#e04a5e'); px(g, 68, 50, '#e04a5e'); px(g, 68, 51, '#e04a5e');
  }, '#4a1424');
}

function robot(frame: number): Sprite {
  const bob = [0, 1, 1, 0][frame % 4]!;
  return sprite(20, 30, 10, 29, g => {
    ellipse(g, 10, 27, 6, 2, 'rgba(60,20,40,0.35)');
    const y0 = 4 - bob;
    rect(g, 9, y0 - 3, 2, 3, '#8a93a6'); rect(g, 8, y0 - 5, 4, 2, frame % 2 ? '#7ff0f2' : '#a6fbfb');
    ellipse(g, 10, y0 + 8, 8, 7, '#eef2f7'); ellipse(g, 9, y0 + 7, 6, 5, '#ffffff');
    rect(g, 4, y0 + 6, 12, 5, '#2c3446'); rect(g, 6, y0 + 7, 2, 3, '#7ff0f2'); rect(g, 12, y0 + 7, 2, 3, '#7ff0f2');
    ellipse(g, 10, y0 + 18, 5, 3, '#d8dee8'); rect(g, 8, y0 + 17, 4, 2, '#f06a8a');
  }, '#3a3f52');
}

function pad(frame: number): Sprite {
  const glow = ['#5fe0e8', '#7ff0f2', '#a6fbfb', '#7ff0f2'][frame % 4]!;
  return sprite(34, 16, 17, 12, g => {
    ellipse(g, 17, 9, 15, 5, '#9aa5b3'); ellipse(g, 17, 8, 15, 5, '#dfe5ec'); ellipse(g, 17, 8, 11, 3, glow);
    ellipse(g, 17, 8, 7, 2, '#ffffff');
    for (let a = 0; a < 24; a++) { const t = (a / 24) * Math.PI * 2; if ((a + frame) % 4 < 2) px(g, 17 + Math.cos(t) * 14, 8 + Math.sin(t) * 4.5, glow); }
  }, '#363d4b');
}

const builders: Record<string, (v: number, frame: number) => Sprite> = {
  ginkgo: v => tree('ginkgo', v),
  parktree: v => tree('parktree', v),
  lamp: () => sprite(12, 46, 6, 45, g => {
    rect(g, 5, 9, 2, 34, '#4b505b'); rect(g, 5, 9, 1, 34, '#6c7280'); rect(g, 4, 41, 4, 3, '#383c46');
    rect(g, 1, 4, 10, 4, '#3a3e48'); rect(g, 2, 3, 8, 1, '#5b6170'); rect(g, 2, 8, 8, 1, '#fff3c6'); rect(g, 3, 9, 6, 1, '#ffe39a');
    rect(g, 4, 18, 4, 9, '#2f6db0'); rect(g, 4, 18, 4, 1, '#5b93d0'); px(g, 5, 21, '#ffffff'); px(g, 6, 23, '#ffffff');
  }, INK),
  bench: () => sprite(24, 16, 12, 14, g => {
    rect(g, 2, 1, 20, 2, '#b98353'); rect(g, 2, 4, 20, 2, '#a7723f'); rect(g, 3, 0, 2, 12, '#3b3f48'); rect(g, 19, 0, 2, 12, '#3b3f48');
    rect(g, 1, 7, 22, 3, '#cf9660'); rect(g, 1, 7, 22, 1, '#e3b07c'); rect(g, 1, 10, 22, 1, '#8c5b34'); rect(g, 3, 11, 2, 3, '#3b3f48'); rect(g, 19, 11, 2, 3, '#3b3f48');
  }, INK),
  planter: v => sprite(18, 22, 9, 21, g => {
    rect(g, 1, 11, 16, 10, '#b8b1a3'); rect(g, 1, 11, 16, 1, '#d8d2c5'); rect(g, 1, 20, 16, 1, '#8f887b'); rect(g, 15, 11, 2, 10, '#a19a8c');
    rect(g, 2, 9, 14, 3, '#d8d2c5'); rect(g, 3, 10, 12, 1, '#6b4b35');
    canopyShrub(g, 9, 7, v);
  }, '#4e4840'),
  bollard: () => sprite(6, 11, 3, 10, g => { rect(g, 1, 1, 4, 9, '#50555f'); rect(g, 1, 1, 1, 9, '#717784'); rect(g, 1, 3, 4, 1, '#efc63f'); rect(g, 1, 0, 4, 1, '#888e9b'); }, INK),
  signal: () => sprite(14, 48, 7, 47, g => {
    rect(g, 6, 7, 2, 39, '#40454f'); rect(g, 6, 7, 1, 39, '#5f6571'); rect(g, 5, 44, 4, 3, '#30343c');
    rect(g, 0, 1, 14, 6, '#262a32'); rect(g, 0, 1, 14, 1, '#3d424d');
    for (const x of [2, 6, 10]) rect(g, x, 3, 2, 2, '#4a4f58');
  }, INK),
  pedsignal: () => sprite(10, 40, 5, 39, g => {
    rect(g, 4, 14, 2, 24, '#40454f'); rect(g, 4, 14, 1, 24, '#5f6571'); rect(g, 3, 37, 4, 2, '#30343c');
    rect(g, 0, 0, 10, 15, '#262a32'); rect(g, 0, 0, 10, 1, '#3d424d'); rect(g, 1, 7, 8, 1, '#1a1d23');
    rect(g, 2, 2, 6, 4, '#3a2a2a'); rect(g, 2, 9, 6, 4, '#24342a');
  }, INK),
  kiosk: () => sprite(20, 28, 10, 27, g => {
    rect(g, 4, 19, 2, 8, '#3d424c'); rect(g, 14, 19, 2, 8, '#3d424c');
    rect(g, 1, 2, 18, 17, '#2f5482'); rect(g, 1, 2, 18, 1, '#5583b8'); rect(g, 3, 4, 14, 13, '#eef3ea');
    rect(g, 3, 9, 14, 2, '#c9cfc7'); rect(g, 9, 4, 2, 13, '#c9cfc7'); rect(g, 12, 12, 4, 4, '#9fcf8a'); rect(g, 4, 5, 4, 3, '#d9d2c1');
    rect(g, 9, 10, 2, 2, '#e04a3a');
  }, INK),
  signpost: () => sprite(32, 36, 16, 35, g => {
    rect(g, 15, 10, 2, 25, '#40454f'); rect(g, 15, 10, 1, 25, '#5f6571');
    rect(g, 1, 1, 30, 11, '#2d5ca4'); rect(g, 2, 2, 28, 9, '#2d5ca4'); rect(g, 1, 1, 30, 1, '#e8eef8'); rect(g, 1, 11, 30, 1, '#e8eef8'); rect(g, 1, 1, 1, 11, '#e8eef8'); rect(g, 30, 1, 1, 11, '#e8eef8');
    rect(g, 5, 3, 1, 7, '#ffffff'); rect(g, 4, 4, 3, 1, '#ffffff'); px(g, 3, 5, '#ffffff'); px(g, 7, 5, '#ffffff');
    rect(g, 11, 3, 13, 6, '#ffffff'); rect(g, 12, 4, 3, 2, '#2d5ca4'); rect(g, 16, 4, 3, 2, '#2d5ca4'); rect(g, 20, 4, 3, 2, '#2d5ca4'); rect(g, 12, 9, 2, 1, '#ffffff'); rect(g, 21, 9, 2, 1, '#ffffff');
  }, INK),
  hydrant: () => sprite(10, 13, 5, 12, g => { rect(g, 3, 3, 4, 9, '#d8473b'); rect(g, 3, 3, 1, 9, '#ef6d5e'); rect(g, 2, 1, 6, 2, '#efc63f'); rect(g, 1, 6, 1, 2, '#b53a30'); rect(g, 8, 6, 1, 2, '#b53a30'); rect(g, 2, 11, 6, 1, '#8f2e26'); }, INK),
  scooter: () => sprite(24, 20, 12, 18, g => {
    rect(g, 3, 13, 5, 5, '#2a2b31'); rect(g, 17, 13, 5, 5, '#2a2b31'); px(g, 5, 15, '#8d929c'); px(g, 19, 15, '#8d929c');
    rect(g, 6, 10, 13, 4, '#eeebe4'); rect(g, 6, 10, 13, 1, '#ffffff'); rect(g, 10, 8, 7, 2, '#2a2b31');
    rect(g, 18, 4, 2, 7, '#3b3c45'); rect(g, 16, 3, 6, 1, '#3b3c45'); px(g, 21, 5, '#fff3c6');
    rect(g, 2, 1, 9, 8, '#d6493e'); rect(g, 2, 1, 9, 2, '#ef6d5e'); rect(g, 9, 3, 2, 6, '#a9362d');
  }, INK),
  bikes: () => sprite(34, 18, 17, 16, g => {
    rect(g, 0, 15, 34, 1, '#8a8f98');
    for (let i = 0; i < 3; i++) {
      const x = 2 + i * 11;
      for (const wx of [x + 2, x + 8]) { ellipse(g, wx, 11, 2, 2, '#2a2b31'); px(g, wx, 11, '#8a8f98'); }
      rect(g, x + 2, 9, 7, 1, '#3d9a5c'); rect(g, x + 5, 7, 1, 3, '#3d9a5c'); rect(g, x + 4, 6, 3, 1, '#2a2b31'); rect(g, x + 8, 6, 1, 3, '#3d9a5c'); rect(g, x + 7, 5, 3, 1, '#2a2b31');
    }
  }, INK),
  vending: () => sprite(18, 28, 9, 27, g => {
    rect(g, 1, 1, 16, 25, '#d9473b'); rect(g, 1, 1, 16, 2, '#ef6d5e'); rect(g, 15, 1, 2, 25, '#a9362d');
    rect(g, 3, 4, 11, 11, '#eaf2f8'); for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) rect(g, 4 + k * 3, 5 + r * 3, 2, 2, ['#3d8fd0', '#e8c040', '#e05a5a', '#5ab06a'][(r + k) % 4]!);
    rect(g, 3, 17, 11, 4, '#2a2b31'); rect(g, 4, 18, 3, 1, '#7fe0f0'); rect(g, 4, 22, 9, 2, '#2a2b31');
  }, INK),
  bin: () => sprite(12, 13, 6, 12, g => { rect(g, 2, 3, 8, 9, '#7c838c'); rect(g, 2, 3, 1, 9, '#9aa1aa'); rect(g, 1, 1, 10, 2, '#3c9c5c'); rect(g, 4, 6, 4, 3, '#e8eef0'); }, INK),
  flowerbed: v => sprite(20, 12, 10, 11, g => {
    rect(g, 1, 6, 18, 5, '#bdb6a8'); rect(g, 1, 6, 18, 1, '#ddd7cb'); rect(g, 2, 4, 16, 3, '#6b4b35');
    const cols = [['#f06a8a', '#ffd0dc'], ['#f8e070', '#fff6c0'], ['#b47ae6', '#e6d2fb']][v % 3]!;
    for (let x = 3; x < 18; x += 3) { rect(g, x, 3, 2, 2, '#5e9c45'); px(g, x, 2, cols[0]!); px(g, x + 1, 2, cols[1]!); px(g, x + 1, 1, cols[0]!); }
  }, '#4e4840'),
  booth: () => sprite(24, 26, 12, 25, g => {
    rect(g, 2, 9, 20, 15, '#ece8df'); rect(g, 20, 9, 2, 15, '#cfc9bd'); rect(g, 5, 12, 12, 6, '#7ea8c8'); rect(g, 5, 12, 12, 1, '#a9c8e0');
    rect(g, 0, 5, 24, 5, '#3a7d8b'); rect(g, 0, 5, 24, 1, '#5aa2b0'); rect(g, 2, 21, 20, 1, '#a9a297');
  }, INK),
  desk: v => sprite(52, 36, 26, 35, g => {
    rect(g, 2, 13, 48, 10, '#cf9f69'); rect(g, 2, 13, 48, 1, '#e5bb86'); rect(g, 2, 23, 48, 3, '#9e6f43'); rect(g, 3, 26, 46, 8, '#ad7f50'); rect(g, 3, 26, 46, 1, '#8c623a'); rect(g, 47, 26, 2, 8, '#8c623a');
    rect(g, 23, 9, 6, 5, '#3a3e48'); rect(g, 14, 0, 24, 11, '#2a2d36'); rect(g, 15, 1, 22, 8, v ? '#3e7fae' : '#3f8f8a');
    for (let y = 2; y < 8; y += 2) rect(g, 17, y, 6 + ((y * 5) % 11), 1, '#a9dcef');
    rect(g, 16, 16, 20, 3, '#ecedf1'); for (let x = 17; x < 35; x += 2) px(g, x, 17, '#b9bcc5');
    rect(g, 39, 15, 9, 6, '#fbfaf5'); rect(g, 40, 16, 7, 1, '#c9c6bc'); rect(g, 40, 18, 5, 1, '#c9c6bc');
    rect(g, 6, 15, 4, 4, v ? '#5a8fd0' : '#e57d6e'); px(g, 10, 16, v ? '#5a8fd0' : '#e57d6e');
  }, INK),
  editordesk: () => sprite(68, 40, 34, 39, g => {
    rect(g, 2, 14, 64, 11, '#94603e'); rect(g, 2, 14, 64, 1, '#b4805a'); rect(g, 2, 25, 64, 3, '#6e4429'); rect(g, 3, 28, 62, 10, '#7f5134'); rect(g, 63, 28, 2, 10, '#6e4429');
    rect(g, 28, 30, 12, 4, '#3a2c22'); rect(g, 29, 31, 10, 2, '#e8c88a');
    for (const x of [1, 47]) { rect(g, x + 8, 10, 4, 5, '#3a3e48'); rect(g, x, 0, 20, 11, '#2a2d36'); rect(g, x + 1, 1, 18, 8, '#3e7fae'); for (let y = 2; y < 8; y += 2) rect(g, x + 3, y, 5 + ((x + y) % 9), 1, '#a9dcef'); }
    rect(g, 26, 8, 2, 7, '#3a3e48'); rect(g, 23, 6, 8, 3, '#2f6450'); rect(g, 24, 9, 6, 1, '#fff3c6');
    rect(g, 4, 16, 10, 7, '#f3f0e6'); rect(g, 5, 15, 10, 7, '#fbfaf5'); rect(g, 6, 17, 8, 1, '#3a3e48'); rect(g, 6, 19, 6, 1, '#b9bcc5');
    rect(g, 34, 17, 22, 3, '#ecedf1'); rect(g, 58, 17, 4, 4, '#ffffff'); rect(g, 59, 18, 2, 2, '#8a5a35');
  }, INK),
  chair: () => sprite(14, 18, 7, 17, g => {
    rect(g, 3, 0, 8, 8, '#3d424e'); rect(g, 3, 0, 8, 1, '#5b6170'); rect(g, 2, 8, 10, 4, '#4c5260'); rect(g, 2, 8, 10, 1, '#6b7282');
    rect(g, 6, 12, 2, 3, '#2a2d36'); rect(g, 2, 15, 10, 1, '#2a2d36'); px(g, 2, 16, '#2a2d36'); px(g, 11, 16, '#2a2d36');
  }, INK),
  bookshelf: v => sprite(34, 48, 17, 47, g => {
    rect(g, 0, 0, 34, 47, '#8c5c3b'); rect(g, 0, 0, 34, 1, '#b07c55'); rect(g, 2, 2, 30, 42, '#5a3b27');
    const r = rng(11 + v * 7);
    const books = ['#c8463a', '#3a6ea8', '#e8b84a', '#4a8a5a', '#8a4a8a', '#ece6d8', '#d87a3a', '#3e9e9a'];
    for (const sy of [2, 13, 24, 35]) {
      let x = 3;
      while (x < 30) { const w = 2 + Math.floor(r() * 2), h = 7 + Math.floor(r() * 3); const col = books[Math.floor(r() * books.length)]!; rect(g, x, sy + 10 - h, w, h, col); rect(g, x, sy + 10 - h, 1, h, shade(col, 0.25)); x += w + (r() < 0.15 ? 2 : 0); }
      rect(g, 2, sy + 10, 30, 2, '#b07c55');
    }
    rect(g, 2, 44, 30, 3, '#6e4429');
  }, INK),
  sofa: () => sprite(52, 26, 26, 25, g => {
    rect(g, 3, 2, 46, 10, '#3f8088'); rect(g, 3, 2, 46, 2, '#5aa0a6'); rect(g, 0, 7, 7, 15, '#35717a'); rect(g, 45, 7, 7, 15, '#35717a'); rect(g, 0, 7, 7, 1, '#5aa0a6'); rect(g, 45, 7, 7, 1, '#5aa0a6');
    rect(g, 7, 12, 19, 7, '#4b929a'); rect(g, 26, 12, 19, 7, '#4b929a'); rect(g, 7, 12, 38, 1, '#6cb3b8'); rect(g, 25, 12, 1, 7, '#35717a');
    rect(g, 5, 19, 42, 4, '#2f6168'); rect(g, 3, 23, 2, 2, '#3a2c22'); rect(g, 47, 23, 2, 2, '#3a2c22');
    rect(g, 10, 6, 7, 6, '#e8c88a'); rect(g, 10, 6, 7, 1, '#f6e0b0');
  }, INK),
  lowtable: () => sprite(32, 16, 16, 15, g => {
    rect(g, 1, 3, 30, 6, '#cf9f69'); rect(g, 1, 3, 30, 1, '#e5bb86'); rect(g, 1, 9, 30, 3, '#9e6f43'); rect(g, 3, 12, 2, 3, '#6e4429'); rect(g, 27, 12, 2, 3, '#6e4429');
    rect(g, 5, 4, 8, 4, '#fbfaf5'); rect(g, 6, 5, 6, 1, '#e05a5a'); rect(g, 20, 4, 3, 3, '#ffffff'); px(g, 23, 5, '#ffffff');
  }, INK),
  printer: () => sprite(28, 28, 14, 26, g => {
    rect(g, 3, 13, 22, 12, '#d6dae0'); rect(g, 3, 13, 22, 1, '#eef0f4'); rect(g, 23, 13, 2, 12, '#b9bec6'); rect(g, 6, 17, 16, 1, '#b9bec6'); rect(g, 6, 21, 16, 1, '#b9bec6');
    rect(g, 2, 3, 24, 11, '#eef0f4'); rect(g, 2, 3, 24, 1, '#ffffff'); rect(g, 17, 5, 7, 3, '#3a4250'); px(g, 18, 6, '#5ae07a');
    rect(g, 6, 0, 14, 4, '#ffffff'); rect(g, 6, 3, 14, 1, '#d6dae0'); rect(g, 4, 11, 12, 2, '#3a4250');
  }, INK),
  water: () => sprite(12, 30, 6, 29, g => {
    rect(g, 2, 13, 8, 15, '#e8ecf2'); rect(g, 2, 13, 1, 15, '#ffffff'); rect(g, 9, 13, 1, 15, '#c4cad4');
    rect(g, 3, 1, 6, 12, '#9fd6f0'); rect(g, 4, 2, 1, 9, '#d6f3fd'); rect(g, 4, 0, 4, 1, '#3d8fd0');
    px(g, 4, 17, '#e05a5a'); px(g, 7, 17, '#3d8fd0'); rect(g, 3, 20, 6, 1, '#c4cad4');
  }, INK),
  plant: v => sprite(18, 28, 9, 27, g => {
    rect(g, 5, 19, 8, 8, v ? '#e7e2d8' : '#c97b4c'); rect(g, 4, 18, 10, 2, v ? '#ffffff' : '#e29b6c'); rect(g, 11, 20, 2, 7, v ? '#c8c2b6' : '#a65f37');
    const lf = LEAF[0]!;
    const leaves: [number, number, number, number][] = [[9, 8, 4, 5], [4, 11, 4, 4], [14, 11, 4, 4], [6, 4, 3, 4], [12, 5, 3, 4], [9, 14, 4, 3]];
    leaves.forEach(([x, y, rx, ry], i) => { ellipse(g, x, y, rx, ry, lf[i % 2 ? 2 : 1]!); px(g, x - 1, y - 1, lf[0]!); px(g, x, y, lf[3]!); });
    rect(g, 8, 13, 1, 6, '#4a7a38');
  }, '#2e3a2a'),
  reception: () => sprite(68, 34, 34, 33, g => {
    rect(g, 0, 9, 68, 5, '#7a5038'); rect(g, 0, 9, 68, 1, '#9c6c4c'); rect(g, 1, 14, 66, 17, '#ece8e0'); rect(g, 1, 14, 66, 1, '#ffffff');
    for (let x = 8; x < 66; x += 12) rect(g, x, 15, 1, 15, '#d6d0c4'); rect(g, 1, 29, 66, 2, '#9a948a');
    rect(g, 26, 18, 16, 6, '#2c3140'); rect(g, 28, 20, 12, 2, '#e8c88a');
    rect(g, 44, 0, 14, 10, '#2a2d36'); rect(g, 45, 1, 12, 7, '#3e7fae'); rect(g, 8, 6, 8, 3, '#fbfaf5');
  }, INK),
  counter: () => sprite(132, 42, 66, 41, g => {
    rect(g, 1, 19, 130, 21, '#8d5d3c'); for (let x = 8; x < 130; x += 10) rect(g, x, 20, 1, 19, '#6e4429'); rect(g, 1, 38, 130, 2, '#5a3826');
    rect(g, 0, 13, 132, 7, '#ddd0ba'); rect(g, 0, 13, 132, 1, '#f3ead8'); rect(g, 0, 19, 132, 1, '#b5a68c');
    rect(g, 4, 1, 26, 13, '#c9ced5'); rect(g, 4, 1, 26, 2, '#eef1f5'); rect(g, 28, 1, 2, 13, '#a3a9b3'); rect(g, 6, 5, 22, 4, '#3a3e48');
    for (const x of [8, 16, 23]) { rect(g, x, 9, 3, 2, '#2a2d36'); rect(g, x, 11, 3, 2, '#ffffff'); }
    rect(g, 32, 3, 8, 11, '#3a3e48'); rect(g, 32, 0, 8, 4, '#7a5038'); rect(g, 33, 1, 6, 2, '#a8744c');
    rect(g, 50, 9, 6, 4, '#ffffff'); rect(g, 51, 10, 4, 1, '#8a5a35'); rect(g, 72, 10, 5, 3, '#f2ede4');
    rect(g, 88, 3, 28, 11, '#cfe8f0'); rect(g, 88, 3, 28, 1, '#ffffff'); rect(g, 88, 8, 28, 1, '#9fb8c2');
    for (let x = 90; x < 114; x += 5) { rect(g, x, 5, 3, 2, '#b9763e'); rect(g, x + 1, 10, 3, 2, '#f0a8b8'); }
    rect(g, 118, 4, 12, 10, '#2a2d36'); rect(g, 119, 5, 10, 5, '#7fd0e0');
  }, INK),
  roundtable: v => sprite(20, 18, 10, 17, g => {
    rect(g, 9, 9, 2, 7, '#3a3e48'); ellipse(g, 10, 16, 4, 1, '#3a3e48');
    ellipse(g, 10, 6, 9, 4, v ? '#e9e2d4' : '#cf9f69'); ellipse(g, 10, 5, 8, 3, v ? '#f6f1e6' : '#e0b27c');
    rect(g, 6, 3, 3, 3, '#ffffff'); px(g, 9, 4, '#ffffff'); rect(g, 7, 3, 1, 1, '#8a5a35');
  }, INK),
  cafechair: () => sprite(12, 17, 6, 16, g => {
    rect(g, 2, 0, 8, 7, '#8d5d3c'); rect(g, 3, 1, 1, 5, '#a8744c'); rect(g, 6, 1, 1, 5, '#a8744c');
    rect(g, 1, 8, 10, 3, '#b07c55'); rect(g, 1, 8, 10, 1, '#cf9f69'); rect(g, 2, 11, 1, 5, '#5a3826'); rect(g, 9, 11, 1, 5, '#5a3826');
  }, INK),
  bar: () => sprite(92, 20, 46, 19, g => {
    rect(g, 1, 6, 90, 4, '#cf9f69'); rect(g, 1, 6, 90, 1, '#e5bb86'); rect(g, 1, 10, 90, 7, '#8d5d3c'); rect(g, 1, 16, 90, 2, '#5a3826');
    for (const x of [14, 40, 66]) { rect(g, x, 3, 4, 4, '#ffffff'); px(g, x + 4, 4, '#ffffff'); rect(g, x + 1, 3, 2, 1, '#8a5a35'); }
    rect(g, 80, 1, 6, 6, '#c97b4c'); ellipse(g, 83, 0, 4, 2, '#6aa84c');
  }, INK),
  stool: () => sprite(10, 15, 5, 14, g => { ellipse(g, 5, 4, 4, 2, '#c8463a'); rect(g, 2, 4, 6, 1, '#9a3329'); rect(g, 4, 6, 2, 7, '#3a3e48'); rect(g, 2, 13, 6, 1, '#3a3e48'); }, INK),
  loungechair: v => sprite(24, 24, 12, 23, g => {
    const c0 = v ? '#d08a52' : '#7a8fb0', c1 = shade(c0, 0.25), c2 = shade(c0, -0.25);
    rect(g, 3, 1, 18, 10, c0); rect(g, 3, 1, 18, 2, c1); rect(g, 0, 7, 5, 13, c2); rect(g, 19, 7, 5, 13, c2);
    rect(g, 5, 11, 14, 6, c0); rect(g, 5, 11, 14, 1, c1); rect(g, 3, 17, 18, 4, c2); rect(g, 3, 21, 2, 2, '#3a2c22'); rect(g, 19, 21, 2, 2, '#3a2c22');
  }, INK),
};

function canopyShrub(g: Ctx, cx: number, cy: number, v: number) {
  const ramp = LEAF[v % 2]!;
  const blobs: [number, number, number][] = [[cx, cy, 5], [cx - 4, cy + 2, 4], [cx + 4, cy + 2, 4], [cx - 2, cy - 2, 3], [cx + 3, cy - 2, 3]];
  for (const [x, y, r] of blobs) ellipse(g, x, y, r, r - 1, ramp[2]!);
  for (const [x, y, r] of blobs) ellipse(g, x - 1, y - 1, r - 1, r - 2, ramp[1]!);
  for (const [x, y] of blobs) { px(g, x - 1, y - 2, ramp[0]!); px(g, x, y - 2, ramp[0]!); }
  if (v % 2) for (const [x, y] of blobs.slice(1)) px(g, x + 1, y, '#f4a0b8');
}

function lifeProp(kind: PropKind, v: number): Sprite | null {
  if (kind === 'homeentry') return sprite(26, 38, 13, 36, g => { rect(g, 2, 10, 22, 26, '#524b62'); rect(g, 4, 12, 18, 23, '#8db1bd'); rect(g, 5, 13, 2, 18, '#c5dfdf'); rect(g, 14, 20, 1, 5, '#f4dfb4'); rect(g, 1, 1, 24, 8, '#476676'); pixelText(g, 'HOME', 5, 3, '#e6f1e7'); }, '#3d374f');
  if (kind === 'clothesrack') return sprite(54, 46, 27, 44, g => { rect(g, 3, 5, 2, 37, '#78818e'); rect(g, 49, 5, 2, 37, '#78818e'); rect(g, 3, 5, 48, 2, '#b8bfca'); for (let i = 0; i < 4; i++) { const x = 8 + i * 10, c = (v ? ['#e9cf9c', '#8eb8a1', '#d59aa8', '#879cc2'] : ['#d5e4e2', '#ba8d73', '#7197aa', '#7f798f'])[i]!; rect(g, x + 3, 8, 1, 3, '#c7c8cc'); rect(g, x, 12, 8, 18, c); rect(g, x - 2, 13, 2, 7, c); rect(g, x + 8, 13, 2, 7, c); rect(g, x + 2, 12, 4, 2, shade(c, -.3)); rect(g, x + 1, 15, 1, 11, shade(c, .3)); if (i % 2 === 0) rect(g, x + 4, 15, 1, 13, shade(c, -.25)); } rect(g, 1, 41, 7, 2, '#5b596e'); rect(g, 46, 41, 7, 2, '#5b596e'); }, '#454052');
  if (kind === 'mirror') return sprite(24, 50, 12, 48, g => { rect(g, 3, 1, 18, 40, '#a38a77'); rect(g, 5, 3, 14, 35, '#a7cbd4'); rect(g, 6, 4, 2, 28, '#dfefeb'); for (let k = 0; k < 14; k++) px(g, 9 + k % 8, 10 + k, '#d4e8e8'); rect(g, 5, 41, 2, 6, '#7c6354'); rect(g, 17, 41, 2, 6, '#7c6354'); rect(g, 2, 47, 20, 1, '#7c6354'); }, '#514052');
  return null;
}

const cache = new Map<string, Sprite>();
export function propSprite(kind: PropKind, v: number, frame = 0): Sprite {
  if (kind === 'parkedcar') {
    const key = 'car' + v;
    let s = cache.get(key);
    if (!s) { s = carSprite(['sedan', 'suv', 'sedan', 'taxi', 'sedan'][v % 5] as 'sedan', CAR_COLORS[v % CAR_COLORS.length]!, 'up'); cache.set(key, s); }
    return s;
  }
  const customKey = kind + ':custom:' + v + ':' + frame;
  const saved = cache.get(customKey); if (saved) return saved;
  const custom = modelProp(kind, v, frame) ?? lifeProp(kind, v);
  if (custom) { cache.set(customKey, custom); return custom; }
  const animated = kind === 'fountain' || kind === 'bodyscope' || kind === 'heartcore' || kind === 'robot' || kind === 'pad';
  const key = kind + ':' + v + ':' + (animated ? frame : 0);
  let s = cache.get(key);
  if (!s) {
    s = kind === 'fountain' ? fountain(frame) : kind === 'bodyscope' ? bodyscope(frame) : kind === 'heartcore' ? heartcore(frame) : kind === 'robot' ? robot(frame) : kind === 'pad' ? pad(frame) : (builders[kind] ?? builders.bench!)(v, frame);
    cache.set(key, s);
  }
  return s;
}
export const CAR_COLORS = ['#eef0f3', '#2b2e37', '#aeb3bc', '#c8463a', '#3a6ea8', '#4c6a58', '#e5d6b8'];

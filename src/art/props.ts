import { euroProp } from './euro-interior';
import type { PropKind } from '../world/rooms';
import { carSprite } from './vehicles';
import { ellipse, hash2, jinU, makeCanvas, outline, pixelText, px, rect, rng, shade, sprite, type Ctx, type Sprite } from './pixel';

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

/** Papillary muscle: a conical muscle column rising from the ventricle wall; chordae attach at its pale tip. v: 0 large, 1 medium, 2 small. */
function papillary(v: number): Sprite {
  const [w, h, tipY] = v === 0 ? [24, 40, 4] : v === 1 ? [20, 36, 4] : [16, 26, 4];
  const ay = h - 2, mid = w / 2;
  return sprite(w, h, Math.floor(mid), ay, g => {
    ellipse(g, mid, ay - 1, mid - 2, 3, '#5a1424');
    for (let y = tipY; y <= ay; y++) {
      const t = (y - tipY) / (ay - tipY), half = 2 + (mid - 4) * Math.pow(t, 0.8);
      for (let x = Math.round(mid - half); x <= Math.round(mid + half); x++) {
        const u = (x - mid) / half;
        const fib = Math.sin(x * 1.7 + y * 0.25) > 0.6;
        const c = u < -0.45 ? '#cf6676' : u < 0.1 ? (fib ? '#b44a5b' : '#a8404f') : u < 0.6 ? '#8c3242' : '#6c2333';
        px(g, x, y, c);
      }
    }
    for (let k = -2; k <= 2; k++) px(g, mid + k, tipY, '#efd4cc');
    for (let k = -1; k <= 1; k++) px(g, mid + k, tipY + 1, '#e2b9b3');
    px(g, mid - 1, tipY + 3, '#f2a5ad'); px(g, mid - 2, tipY + 6, '#e88e98');
  }, '#46101e');
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
  // Narrow cypress in a stone planter (in front of Euro Plaza's awnings, user photo 1).
  cypress: v => sprite(12, 30, 6, 29, g => {
    rect(g, 2, 22, 8, 7, '#c9c3b6'); rect(g, 2, 22, 8, 1, '#e3ded3'); rect(g, 9, 22, 1, 7, '#a59f92'); rect(g, 3, 23, 6, 1, '#5b4433');
    for (let y = 2; y < 23; y++) {
      const half = Math.max(1, Math.round((y - 1) * 0.19 + 0.5));
      for (let x = 6 - half; x <= 5 + half; x++) px(g, x, y, x < 5 ? '#5f9a52' : x < 7 ? '#3f7a3c' : '#2e5e30');
    }
    px(g, 5, 1, '#5f9a52'); if (v % 2) px(g, 4, 9, '#7fb86a');
  }, '#22402a'),
  // Stacked plastic delivery crates outside the convenience store.
  crates: v => sprite(18, 20, 9, 19, g => {
    const c = v % 2 ? ['#3e4045', '#2a2c30', '#5a5d64'] : ['#3d9a52', '#2c7a3e', '#5bb86c'];
    for (let i = 0; i < 4; i++) { const y = 15 - i * 4; rect(g, 1, y, 16, 4, c[0]!); rect(g, 1, y, 16, 1, c[2]!); for (let x = 3; x < 16; x += 3) rect(g, x, y + 1, 1, 2, c[1]!); }
  }, INK),
  // Low rack with tissue packs and bottled-water bundles (no labels).
  goods: () => sprite(24, 20, 12, 19, g => {
    rect(g, 1, 16, 22, 2, '#7d8088'); rect(g, 1, 16, 22, 1, '#9da0a8');
    for (let i = 0; i < 3; i++) { const x = 2 + i * 7; rect(g, x, 9, 6, 7, '#f3f6f8'); rect(g, x, 9, 6, 1, '#ffffff'); rect(g, x + 1, 11, 4, 3, '#8cc6e6'); rect(g, x + 5, 9, 1, 7, '#cdd4da'); }
    for (let i = 0; i < 2; i++) { const x = 5 + i * 7; rect(g, x, 3, 6, 6, '#bfe0f0'); rect(g, x, 3, 6, 1, '#e6f4fb'); for (let k = 0; k < 3; k++) px(g, x + 1 + k * 2, 2, '#2f6db0'); }
  }, INK),
  // A-frame sign of the fictional Jin-U store.
  aboard: () => sprite(18, 20, 9, 19, g => {
    rect(g, 3, 17, 2, 2, '#3a3d44'); rect(g, 13, 17, 2, 2, '#3a3d44');
    rect(g, 1, 2, 16, 15, '#17837c'); rect(g, 1, 2, 16, 1, '#40b3a8'); rect(g, 1, 14, 16, 3, '#ff7b5f');
    jinU(g, 3, 4, '#ffffff');
  }, INK),
  // Blue road-name plate on a pole (Nonhyeon-ro 151-gil; the name itself is shown by the label, not drawn).
  streetsign: () => sprite(32, 40, 16, 39, g => {
    rect(g, 15, 10, 2, 28, '#8a9099'); rect(g, 15, 10, 1, 28, '#b4bac2'); rect(g, 14, 37, 4, 2, '#5d6168');
    rect(g, 1, 1, 30, 10, '#1f4fa0'); rect(g, 1, 1, 30, 1, '#e8eef8'); rect(g, 1, 10, 30, 1, '#e8eef8'); rect(g, 1, 1, 1, 10, '#e8eef8'); rect(g, 30, 1, 1, 10, '#e8eef8');
    pixelText(g, '5', 3, 3, '#ffffff'); pixelText(g, '9', 26, 3, '#ffffff');
    for (let x = 9; x < 23; x += 3) rect(g, x, 3, 2, 3, '#ffffff');
    rect(g, 8, 8, 16, 1, '#c8d6ee');
  }, INK),
  // Shoe-repair booth on the pavement in front of the granite block (user photo 3).
  repairbooth: () => sprite(28, 36, 14, 35, g => {
    rect(g, 2, 4, 24, 30, '#e9e6de'); rect(g, 2, 4, 24, 1, '#ffffff'); rect(g, 24, 4, 2, 30, '#c9c5bb');
    rect(g, 1, 1, 26, 4, '#6b7078'); rect(g, 1, 1, 26, 1, '#8d939c');
    rect(g, 4, 7, 20, 4, '#2e5aa8'); for (let x = 6; x < 22; x += 3) rect(g, x, 8, 2, 2, '#ffffff');
    rect(g, 5, 13, 8, 13, '#9cc3d6'); rect(g, 15, 13, 8, 13, '#9cc3d6'); px(g, 6, 14, '#e6f3fa'); px(g, 16, 14, '#e6f3fa');
    rect(g, 6, 17, 6, 2, '#2e5aa8'); rect(g, 16, 17, 6, 2, '#2e5aa8'); rect(g, 6, 21, 6, 2, '#2e5aa8'); rect(g, 16, 21, 6, 2, '#2e5aa8');
    rect(g, 4, 28, 6, 5, '#b9473c'); rect(g, 2, 33, 24, 1, '#8a867d');
  }, INK),
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
  // ---- D103 shops: Jin-U convenience store (teal and coral) and the Orbit Tailor clothes shop (berry and cream). ----
  storeshelf: v => sprite(68, 30, 34, 29, g => {
    const r = rng(41 + v * 7), cols = ['#e85d5d', '#f2c14e', '#5aa0e0', '#7cc36a', '#f4f4f4', '#e88aa8', '#f08a3a'];
    rect(g, 1, 2, 66, 26, '#d7dcde'); rect(g, 1, 2, 66, 1, '#f2f5f6'); rect(g, 1, 27, 66, 2, '#8e979b');
    for (const y of [4, 12, 20]) {
      for (let x = 3; x < 65; x += 3) { const c = cols[Math.floor(r() * cols.length)]!; rect(g, x, y, 2, 6, c); px(g, x, y, '#ffffff'); }
      rect(g, 2, y + 6, 64, 1, '#9aa4a8');
    }
    rect(g, 0, 2, 1, 26, '#6e777b'); rect(g, 67, 2, 1, 26, '#6e777b'); rect(g, 26, 0, 16, 3, v ? '#f07b6a' : '#2fa59a');
  }, INK),
  fridge: v => sprite(50, 46, 25, 45, g => {
    const r = rng(77 + v), cols = ['#f2c14e', '#7cc36a', '#e85d5d', '#5aa0e0', '#ffffff', '#8fd0a8'];
    rect(g, 1, 0, 48, 45, '#e9eef0'); rect(g, 1, 0, 48, 4, v ? '#f07b6a' : '#2fa59a'); rect(g, 1, 4, 48, 1, '#ffffff');
    for (const x0 of [3, 26]) {
      rect(g, x0, 6, 21, 36, '#2b3a3f'); rect(g, x0 + 1, 7, 19, 34, '#a8dbe6');
      for (const y of [9, 17, 25, 33]) {
        for (let x = x0 + 2; x < x0 + 19; x += 3) { rect(g, x, y, 2, 6, cols[Math.floor(r() * cols.length)]!); px(g, x, y, '#ffffff'); }
        rect(g, x0 + 1, y + 6, 19, 1, '#7fb4c2');
      }
      rect(g, x0 + 17, 18, 1, 8, '#d0d6d8'); rect(g, x0 + 2, 7, 1, 30, 'rgba(255,255,255,0.45)');
    }
    rect(g, 1, 42, 48, 3, '#9aa4a8');
  }, INK),
  storecounter: () => sprite(68, 32, 34, 31, g => {
    rect(g, 1, 12, 66, 18, '#2fa59a'); rect(g, 1, 12, 66, 1, '#5fc9bd'); rect(g, 1, 24, 66, 2, '#f07b6a'); rect(g, 1, 29, 66, 2, '#1f6f66');
    rect(g, 0, 8, 68, 5, '#eef1f2'); rect(g, 0, 8, 68, 1, '#ffffff'); rect(g, 0, 12, 68, 1, '#b9c2c5');
    jinU(g, 6, 15, '#ffffff');
    rect(g, 44, 0, 14, 9, '#3a3e48'); rect(g, 45, 1, 12, 5, '#7fd0e0'); rect(g, 49, 6, 4, 3, '#2a2d36');
    rect(g, 28, 4, 10, 5, '#f2c14e'); rect(g, 29, 3, 8, 1, '#f6d77a'); rect(g, 20, 5, 6, 4, '#e85d5d'); px(g, 21, 5, '#ffffff');
  }, INK),
  rack: v => sprite(52, 36, 26, 35, g => {
    const set = [['#5f86b8', '#f1efe8', '#2f8f6a', '#a9586c', '#c79768'], ['#a9586c', '#c79768', '#5f86b8', '#f1efe8', '#2f8f6a']][v % 2]!;
    rect(g, 2, 4, 2, 30, '#8a8f99'); rect(g, 48, 4, 2, 30, '#8a8f99'); rect(g, 2, 3, 48, 2, '#b8bdc6'); rect(g, 0, 33, 52, 2, '#6e747c');
    set.forEach((c, i) => {
      const x = 6 + i * 9;
      px(g, x + 3, 5, '#3a3e48'); rect(g, x, 6, 8, 2, shade(c, 0.15)); rect(g, x, 8, 8, 16, c); rect(g, x, 8, 1, 16, shade(c, 0.2)); rect(g, x + 7, 8, 1, 16, shade(c, -0.2));
      if (c === '#f1efe8') for (const y of [11, 15, 19]) rect(g, x, y, 8, 1, '#3f5a8f');
      if (c === '#2f8f6a') rect(g, x + 3, 8, 1, 16, '#f7f7f2');
    });
  }, INK),
  mannequin: v => sprite(18, 38, 9, 37, g => {
    const c = ['#c79768', '#5f86b8', '#a9586c'][v % 3]!;
    ellipse(g, 9, 5, 4, 4, '#efe4d6'); rect(g, 8, 9, 2, 2, '#d9cdbd');
    rect(g, 3, 11, 12, 15, c); rect(g, 3, 11, 12, 1, shade(c, 0.25)); rect(g, 8, 11, 2, 12, '#f6efe0'); rect(g, 14, 11, 1, 15, shade(c, -0.25));
    rect(g, 8, 26, 2, 8, '#6e747c'); rect(g, 4, 34, 10, 2, '#4a4f58');
  }, INK),
  mirror: () => sprite(18, 40, 9, 39, g => {
    rect(g, 1, 0, 16, 36, '#c9a35a'); rect(g, 3, 2, 12, 32, '#cfe6ee'); rect(g, 4, 3, 1, 30, '#e6f4f8');
    for (let i = 0; i < 6; i++) px(g, 6 + i, 6 + i, '#ffffff');
    rect(g, 3, 36, 2, 3, '#8a6a3a'); rect(g, 13, 36, 2, 3, '#8a6a3a');
  }, INK),
  tailorcounter: () => sprite(52, 30, 26, 29, g => {
    rect(g, 1, 10, 50, 18, '#8c6a7a'); rect(g, 1, 10, 50, 1, '#a8879a'); rect(g, 1, 27, 50, 2, '#5e4552');
    rect(g, 0, 6, 52, 5, '#f3e9ee'); rect(g, 0, 6, 52, 1, '#ffffff');
    rect(g, 6, 1, 14, 5, '#e8d9a8'); rect(g, 8, 2, 10, 1, '#c9a35a'); rect(g, 30, 2, 12, 4, '#5f86b8'); rect(g, 30, 2, 12, 1, '#86aad6');
    pixelText(g, 'OT', 22, 15, '#f3e9ee');
  }, INK),
  loungechair: v => sprite(24, 24, 12, 23, g => {
    const c0 = v === 2 ? '#a2aba8' : v ? '#d08a52' : '#7a8fb0', c1 = shade(c0, 0.25), c2 = shade(c0, -0.25);
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

const cache = new Map<string, Sprite>();
export function propSprite(kind: PropKind, v: number, frame = 0): Sprite {
  if (kind === 'parkedcar') {
    const key = 'car' + v;
    let s = cache.get(key);
    if (!s) { s = carSprite(['sedan', 'suv', 'sedan', 'taxi', 'sedan'][v % 5] as 'sedan', CAR_COLORS[v % CAR_COLORS.length]!, 'up'); cache.set(key, s); }
    return s;
  }
  const animated = kind === 'fountain' || kind === 'bodyscope' || kind === 'robot' || kind === 'pad';
  const key = kind + ':' + v + ':' + (animated ? frame : 0);
  let s = cache.get(key);
  if (!s) {
    s = euroProp(kind, v) ?? (kind === 'fountain' ? fountain(frame) : kind === 'bodyscope' ? bodyscope(frame) : kind === 'papillary' ? papillary(v) : kind === 'robot' ? robot(frame) : kind === 'pad' ? pad(frame) : (builders[kind] ?? builders.bench!)(v, frame));
    cache.set(key, s);
  }
  return s;
}
export const CAR_COLORS = ['#eef0f3', '#2b2e37', '#aeb3bc', '#c8463a', '#3a6ea8', '#4c6a58', '#e5d6b8'];

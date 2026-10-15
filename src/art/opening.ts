import type { Look } from '../domain/appearance';
import { AX, AY, characterFrame, idleFrame } from './character';
import { ellipse, makeCanvas, outline, pixelText, px, rect, type Ctx } from './pixel';

/*
 * Opening title scene (D100): a sunny October afternoon in front of Euro Plaza. Coded pixel art on the same rules as the
 * game (colour outlines, integer scale, top-left light). Six green-tea cups are hidden around the scene as a small game.
 */
export const SCENE_W = 192, SCENE_H = 128;
export type Tea = { id: string; x: number; y: number; found: string };
/** Top-left of each 8x8 cup. The scene is drawn so every cup sits on (or peeks out of) something. */
export const TEAS: Tea[] = [
  { id: 'cloud', x: 116, y: 7, found: '구름 위에서 녹차 한 잔!' },
  { id: 'roof', x: 41, y: 18, found: '유로프라자 옥상의 녹차!' },
  { id: 'window', x: 70, y: 66, found: '창가에 식혀 둔 녹차!' },
  { id: 'ginkgo', x: 156, y: 45, found: '은행잎 사이에 숨은 녹차!' },
  { id: 'kiosk', x: 128, y: 67, found: '신문 가판대 지붕 위 녹차!' },
  { id: 'bench', x: 40, y: 105, found: '벤치 아래 그늘의 녹차!' },
];

const INK = '#3a2d4f';
const CUP_ROWS = ['........', '........', '.oooooo.', '.otTTTo.', '.occlCoo', '.occcCoo', '..occo..', '..oooo..'];
const CUP: Record<string, string> = { o: '#4d7a3c', t: '#d6f0a8', T: '#8fc95a', c: '#f6faef', C: '#d2e3bf', l: '#6fae46' };

function cup(g: Ctx, x: number, y: number, found: number | null, t: number): void {
  const bounce = found !== null && t - found < 0.5 ? -Math.round(Math.sin(((t - found) / 0.5) * Math.PI) * 3) : 0;
  CUP_ROWS.forEach((row, j) => { for (let i = 0; i < 8; i++) { const k = row[i]!; if (CUP[k]) px(g, x + i, y + j + bounce, CUP[k]!); } });
  if (found === null) return;
  // Found cups steam gently and get a little sparkle when they are discovered.
  const w = Math.floor(t * 3) % 2;
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fillRect(x + 3 + w, y + bounce, 1, 1); g.fillRect(x + 4 - w, y + 1 + bounce, 1, 1); g.fillRect(x + 2 + w, y - 1 + bounce, 1, 1);
  if (t - found < 1.2) {
    const s = t - found < 0.6 ? 2 : 1;
    g.fillStyle = '#fff3a0';
    for (const [sx, sy] of [[x - 2, y + 1], [x + 9, y + 2]] as [number, number][]) { g.fillRect(sx, sy - s, 1, s * 2 + 1); g.fillRect(sx - s, sy, s * 2 + 1, 1); }
  }
}

const hearts = new Map<number, HTMLCanvasElement>();
function heart(big: boolean): HTMLCanvasElement {
  const key = big ? 1 : 0, cached = hearts.get(key); if (cached) return cached;
  const w = big ? 17 : 15, h = big ? 15 : 13, { c, g } = makeCanvas(w + 2, h + 2);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = ((i + 0.5 - w / 2) / (w / 2)) * 1.18, y = ((h / 2 - (j + 0.5)) / (h / 2)) * 1.18 + 0.14;
    if ((x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0) px(g, i + 1, j + 1, j > h * 0.62 ? '#f0607f' : '#ff86a3');
  }
  outline(c, '#b8406a');
  const cx = Math.floor((w + 2) / 2), cy = Math.floor((h + 2) / 2);
  rect(g, cx - 5, cy - 4, 2, 1, '#ffe1ea'); px(g, cx - 5, cy - 3, '#ffe1ea');
  rect(g, cx - 3, cy - 1, 1, 2, INK); rect(g, cx + 2, cy - 1, 1, 2, INK);
  px(g, cx - 1, cy + 1, INK); px(g, cx, cy + 2, INK); px(g, cx + 1, cy + 1, INK);
  rect(g, cx - 5, cy + 1, 2, 1, '#ff4f7a'); rect(g, cx + 3, cy + 1, 2, 1, '#ff4f7a');
  hearts.set(key, c); return c;
}

function cloud(g: Ctx, x: number, y: number, w: number): void {
  ellipse(g, x, y + 1, w + 1, 4, '#c7dcf2');
  ellipse(g, x, y, w, 3, '#ffffff'); ellipse(g, x - Math.round(w / 3), y - 2, Math.round(w / 2), 3, '#ffffff'); ellipse(g, x + Math.round(w / 4), y - 3, Math.round(w / 2.4), 3, '#ffffff');
}

function leaf(g: Ctx, x: number, y: number): void {
  rect(g, x, y, 3, 1, '#ffcf33'); px(g, x + 1, y + 1, '#e0a51e'); px(g, x + 1, y - 1, '#fff08a');
}

/** Paints one frame. `t` is seconds (0 for reduced motion); `found` maps tea id to the time it was found. */
export function paintScene(g: Ctx, t: number, look: Look | null, found: Map<string, number>): void {
  g.imageSmoothingEnabled = false;
  // Sky bands with a checker dither between them.
  const bands = ['#9fd3ff', '#b3dcff', '#c9e7ff', '#ddf0ff', '#fff1d6'];
  for (let y = 0; y < 96; y++) {
    const f = (y / 96) * (bands.length - 1), i = Math.floor(f), frac = f - i;
    for (let x = 0; x < SCENE_W; x++) px(g, x, y, (x + y) % 2 === 0 && frac > 0.5 ? bands[Math.min(bands.length - 1, i + 1)]! : bands[i]!);
  }
  // Smiling sun.
  ellipse(g, 172, 20, 10, 10, '#ffe27a'); ellipse(g, 172, 20, 8, 8, '#fff1a8');
  rect(g, 169, 18, 1, 2, INK); rect(g, 175, 18, 1, 2, INK); px(g, 171, 23, INK); px(g, 172, 24, INK); px(g, 173, 23, INK);
  rect(g, 166, 22, 2, 1, '#ffb48a'); rect(g, 177, 22, 2, 1, '#ffb48a');
  // Clouds; the right one hides a cup that peeks over its top.
  const drift = Math.round(Math.sin(t * 0.4) * 1);
  cloud(g, 34 + drift, 18, 10);
  cloud(g, 120, 16, 9);
  cup(g, TEAS[0]!.x, TEAS[0]!.y, found.get('cloud') ?? null, t);
  ellipse(g, 120, 16, 9, 3, '#ffffff'); ellipse(g, 113, 15, 4, 2, '#ffffff');
  // Distant blocks.
  for (const [x, w, h] of [[0, 18, 26], [84, 16, 30], [100, 20, 20], [142, 14, 24], [178, 14, 30]] as [number, number, number][]) {
    rect(g, x, 96 - h, w, h, '#cfc7ea'); for (let wy = 96 - h + 4; wy < 92; wy += 6) for (let wx = x + 3; wx < x + w - 2; wx += 5) rect(g, wx, wy, 2, 3, '#e3defa');
  }
  // Euro Plaza: white tower with its EURO sign; a cup sits on the roof.
  rect(g, 15, 27, 41, 70, INK); rect(g, 16, 28, 39, 68, '#f6f3ec'); rect(g, 46, 28, 9, 68, '#e2ddd2');
  rect(g, 14, 26, 43, 3, INK); rect(g, 15, 27, 41, 1, '#ffffff');
  rect(g, 23, 18, 1, 9, INK); px(g, 23, 17, '#ff6b6b');
  cup(g, TEAS[1]!.x, TEAS[1]!.y, found.get('roof') ?? null, t);
  rect(g, 19, 32, 19, 9, '#3b6fb6'); pixelText(g, 'EURO', 21, 34, '#ffffff');
  for (let wy = 45; wy < 84; wy += 8) for (let wx = 19; wx < 52; wx += 7) { rect(g, wx, wy, 5, 5, '#8fbbe3'); px(g, wx, wy, '#d9ecfb'); }
  rect(g, 27, 86, 13, 10, INK); rect(g, 28, 87, 11, 9, '#a9d6f2'); rect(g, 33, 87, 1, 9, INK);
  // Stone annex: a cup cools on the windowsill.
  rect(g, 55, 51, 31, 46, INK); rect(g, 56, 52, 29, 44, '#ead6b4'); rect(g, 78, 52, 7, 44, '#d6bf98');
  for (const wy of [57, 66, 78]) for (const wx of [59, 70]) { rect(g, wx, wy, 9, 7, INK); rect(g, wx + 1, wy + 1, 7, 5, '#8fbbe3'); px(g, wx + 1, wy + 1, '#d9ecfb'); rect(g, wx - 1, wy + 7, 11, 1, '#b99a6e'); }
  cup(g, TEAS[2]!.x, TEAS[2]!.y, found.get('window') ?? null, t);
  // Ginkgo tree turning yellow; one cup is tucked between the leaves.
  rect(g, 164, 68, 6, 30, '#7a4d33'); rect(g, 165, 68, 2, 30, '#9a6643');
  for (const [x, y, rx, ry] of [[160, 54, 14, 12], [175, 50, 12, 11], [167, 41, 11, 9], [181, 61, 9, 8], [151, 63, 8, 7]] as [number, number, number, number][]) { ellipse(g, x, y + 1, rx + 1, ry + 1, '#c9962a'); ellipse(g, x, y, rx, ry, '#ffd23f'); ellipse(g, x - 3, y - 3, Math.round(rx / 2), Math.round(ry / 2), '#ffe680'); }
  cup(g, TEAS[3]!.x, TEAS[3]!.y, found.get('ginkgo') ?? null, t);
  if (!found.has('ginkgo')) { ellipse(g, 154, 52, 3, 2, '#ffd23f'); ellipse(g, 165, 51, 3, 2, '#f2b72a'); }
  // Pavement.
  rect(g, 0, 96, SCENE_W, 2, '#cdb89a');
  for (let y = 98; y < SCENE_H; y++) for (let x = 0; x < SCENE_W; x++) px(g, x, y, (y - 98) % 8 === 7 || (x + ((y - 98) >> 3) * 4) % 8 === 7 ? '#e2d1b6' : '#f1e5d1');
  // Newspaper kiosk with a cup on its awning.
  rect(g, 120, 79, 24, 20, INK); rect(g, 121, 80, 22, 18, '#fff4e2');
  for (let x = 118; x < 146; x++) for (let y = 75; y < 80; y++) px(g, x, y, y === 75 || x === 118 || x === 145 ? INK : (x >> 2) % 2 ? '#ff8a8a' : '#ffffff');
  rect(g, 123, 82, 18, 7, INK); pixelText(g, 'NEWS', 124, 83, '#ffe9a8');
  for (const [x, c] of [[123, '#e9eef7'], [129, '#fff8cf'], [135, '#e9eef7']] as [number, string][]) { rect(g, x, 91, 5, 6, c); rect(g, x + 1, 92, 3, 1, '#9aa3b5'); rect(g, x + 1, 94, 2, 1, '#9aa3b5'); }
  cup(g, TEAS[4]!.x, TEAS[4]!.y, found.get('kiosk') ?? null, t);
  // Bench; the cup underneath stays in the bench's shade.
  rect(g, 28, 94, 32, 6, INK); rect(g, 29, 95, 30, 4, '#c98a55'); rect(g, 29, 95, 30, 1, '#e0a874');
  cup(g, TEAS[5]!.x, TEAS[5]!.y, found.get('bench') ?? null, t);
  g.fillStyle = 'rgba(80,52,40,0.28)'; g.fillRect(30, 104, 29, 9);
  rect(g, 27, 100, 34, 4, INK); rect(g, 28, 100, 32, 3, '#c98a55'); rect(g, 28, 100, 32, 1, '#e7b585');
  for (const x of [31, 55]) rect(g, x, 104, 2, 9, '#7a4d33');
  // The heart mascot floats and beats (the Bodyscope's first subject).
  const beat = Math.floor(t * 2) % 2 === 0, bob = Math.round(Math.sin(t * 1.6) * 1.5), hc = heart(beat && t > 0);
  g.drawImage(hc, 98 - Math.floor(hc.width / 2), 50 - Math.floor(hc.height / 2) + bob);
  for (let k = 0; k < 3; k++) px(g, 98, 58 + bob + k * 3, '#c7a0b8');
  // Reporter on the pavement.
  ellipse(g, 100, 116, 7, 2, 'rgba(58,45,79,0.22)');
  if (look) g.drawImage(characterFrame(look, 'down', t > 0 ? idleFrame(t) : 0), 100 - AX, 116 - AY);
  // Falling ginkgo leaves.
  if (t > 0) for (let i = 0; i < 7; i++) {
    const x = Math.round((i * 29 + t * (5 + (i % 3) * 2) + Math.sin(t * 1.3 + i) * 4) % (SCENE_W + 6)) - 3;
    const y = Math.round((i * 17 + t * (9 + (i % 2) * 3)) % (SCENE_H - 4));
    leaf(g, x, y);
  } else for (const [x, y] of [[140, 30], [62, 104], [178, 92], [12, 60]] as [number, number][]) leaf(g, x, y);
}

/** Which cup (if any) a tap in scene coordinates lands on; the touch area is wider than the 8px cup. */
export function teaAt(x: number, y: number): Tea | null {
  let best: Tea | null = null, dist = Infinity;
  for (const tea of TEAS) {
    const d = Math.hypot(x - (tea.x + 4), y - (tea.y + 5));
    if (d <= 9 && d < dist) { best = tea; dist = d; }
  }
  return best;
}

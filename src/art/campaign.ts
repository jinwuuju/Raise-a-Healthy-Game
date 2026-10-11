import anatomy from '../../data/content/heart-anatomy.v0.1.json';
import { ellipse, makeCanvas, pixelText, px, rect, sprite, type Ctx, type Sprite } from './pixel';

export const HEART_ANATOMY_WIDTH = 140;
export const HEART_ANATOMY_HEIGHT = 112;
/** Pixel anchors are a render projection of the sourced content, not anatomy measurements. */
export const HEART_LANDMARKS = anatomy.landmarks.map(p => ({ ...p, x: Math.round(p.x / 2), y: Math.round(p.y / 2) }));
const INK = '#542c48', COOL = '#69aaca', WARM = '#e97a83', SIGNAL = '#f3da73';
function line(g: Ctx, a: number[], b: number[], width: number, color: string): void {
  const dx = b[0]! - a[0]!, dy = b[1]! - a[1]!, steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 0; i <= steps; i++) { const t = steps ? i / steps : 0; rect(g, a[0]! + dx * t - Math.floor(width / 2), a[1]! + dy * t - Math.floor(width / 2), width, width, color); }
}
function path(g: Ctx, points: number[][], width: number, color: string): void { for (let i = 1; i < points.length; i++) line(g, points[i - 1]!, points[i]!, width, color); }
function tube(g: Ctx, points: number[][], width: number, color: string): void { path(g, points, width + 2, INK); path(g, points, width, color); path(g, points.map(([x, y]) => [x! - 1, y! - 1]), 2, color === COOL ? '#a4d6e5' : '#f6b2a9'); }
function arrow(g: Ctx, x: number, y: number, dir: 'up' | 'down' | 'left' | 'right', color = '#fff6dc'): void {
  if (dir === 'up' || dir === 'down') { const s = dir === 'up' ? -1 : 1; rect(g, x, y - s * 2, 1, 4, color); px(g, x - 1, y, color); px(g, x + 1, y, color); px(g, x, y + s, color); }
  else { const s = dir === 'left' ? -1 : 1; rect(g, x - s * 2, y, 4, 1, color); px(g, x, y - 1, color); px(g, x, y + 1, color); px(g, x + s, y, color); }
}
function leaflet(g: Ctx, x: number, y: number, gap: number, vertical = false): void {
  if (vertical) { line(g, [x - 3, y - 4], [x + gap, y], 2, '#f6e7cc'); line(g, [x - 3, y + 4], [x + gap, y], 2, '#f6e7cc'); }
  else { line(g, [x - 6, y - 2], [x - gap, y + 3], 2, '#f6e7cc'); line(g, [x + 6, y - 2], [x + gap, y + 3], 2, '#f6e7cc'); }
}

/**
 * Anterior cutaway concept, with anatomical right on the viewer's left. Branches are flattened
 * for legibility. The blood route never crosses the septum. Animation is illustrative, not timing.
 * Draw only at integer scale so every source pixel remains a pixel.
 */
export function drawHeartAnatomy(g: Ctx, x: number, y: number, scale = 1, phase = 0, highlight: string | string[] | null = null): void {
  g.save(); g.translate(Math.round(x), Math.round(y)); const s = Math.max(1, Math.round(scale)); g.scale(s, s); g.imageSmoothingEnabled = false;
  // Vessels behind the cutaway: systemic return on the anatomical right; pulmonary return left.
  tube(g, [[24, 4], [24, 36], [32, 40]], 8, COOL);
  tube(g, [[24, 108], [24, 60], [32, 50]], 8, COOL);
  tube(g, [[96, 42], [117, 32], [133, 32]], 7, WARM);
  tube(g, [[100, 50], [119, 45], [133, 45]], 7, WARM);
  // Aortic arch and pulmonary trunk are intentionally separated in this unfolded concept.
  tube(g, [[84, 62], [84, 28], [89, 16], [106, 16], [116, 25], [116, 103]], 9, WARM);
  for (const [bx, by] of [[92, 9], [100, 7], [109, 9]]) tube(g, [[bx!, 19], [bx!, by!]], 4, WARM);
  tube(g, [[58, 70], [59, 43], [61, 24], [61, 16]], 9, COOL);
  tube(g, [[61, 20], [47, 15], [7, 15]], 6, COOL); tube(g, [[61, 20], [71, 13], [79, 13]], 6, COOL);
  // Chambers: left ventricle visibly thicker than right, atria above the ventricles.
  ellipse(g, 48, 74, 26, 31, INK); ellipse(g, 48, 74, 24, 29, '#d67c8c'); ellipse(g, 47, 75, 20, 25, '#538da9'); ellipse(g, 45, 73, 17, 22, '#77b2c8');
  ellipse(g, 96, 79, 27, 31, INK); ellipse(g, 96, 78, 25, 29, '#ce667e'); ellipse(g, 94, 78, 21, 26, '#e89197'); ellipse(g, 94, 78, 15, 22, '#d55f75'); ellipse(g, 93, 76, 12, 19, '#e88489');
  ellipse(g, 36, 44, 19, 18, INK); ellipse(g, 36, 43, 17, 16, '#d67c8c'); ellipse(g, 36, 43, 14, 13, '#79b4c9');
  ellipse(g, 96, 43, 22, 17, INK); ellipse(g, 96, 42, 20, 15, '#e38a94'); ellipse(g, 96, 43, 16, 12, '#e88b8d');
  // Tissue between the halves remains solid; no arrow crosses it.
  path(g, [[69, 35], [69, 57], [72, 72], [72, 94], [79, 106]], 7, '#914b69'); path(g, [[68, 34], [68, 57], [71, 72], [71, 94], [78, 105]], 2, '#f1a0a7');
  // Ventricular outflow paths overlay the chambers but remain on their own side.
  tube(g, [[49, 74], [57, 66], [60, 45], [61, 28]], 7, COOL);
  tube(g, [[94, 82], [86, 70], [82, 49], [85, 28]], 7, WARM);
  // Four static valve symbols. No false synchronous inlet/outlet opening animation.
  const gap = 1;
  leaflet(g, 41, 60, gap); leaflet(g, 92, 60, gap); leaflet(g, 60, 46, 1); leaflet(g, 82, 49, 1);
  for (const [ax, ay, dir] of [[24, 22, 'down'], [24, 83, 'up'], [40, 72, 'down'], [59, 36, 'up'], [13, 15, 'left'], [124, 32, 'left'], [98, 66, 'down'], [85, 32, 'up'], [116, 90, 'down']] as [number, number, 'up' | 'down' | 'left' | 'right'][]) arrow(g, ax, ay, dir);
  pixelText(g, 'RA', 29, 41, '#e9f6f7'); pixelText(g, 'RV', 39, 83, '#e9f6f7'); pixelText(g, 'LA', 96, 40, '#fff0e7'); pixelText(g, 'LV', 94, 91, '#fff0e7');
  // Coronary branches originate at the aortic root and stay on the muscle surface.
  const selected = highlight === null ? [] : Array.isArray(highlight) ? highlight : [highlight];
  if (selected.includes('coronary') || selected.includes('supply')) { path(g, [[84, 51], [110, 57], [117, 77], [112, 98]], 3, '#693850'); path(g, [[84, 51], [110, 57], [117, 77], [112, 98]], 1, '#ffcd9c'); path(g, [[110, 63], [102, 72], [102, 100]], 1, '#ffcd9c'); path(g, [[84, 51], [45, 57], [27, 74], [34, 94]], 1, '#ffcd9c'); }
  // Conduction system is a separate yellow network, never a blood vessel.
  if (selected.includes('signal') || selected.some(id => ['sa', 'av', 'his', 'bundle-branches', 'purkinje'].includes(id))) {
    path(g, [[31, 34], [44, 42], [64, 56], [72, 67], [72, 79], [64, 92], [46, 96]], 1, SIGNAL); path(g, [[72, 79], [79, 96], [91, 101], [106, 92]], 1, SIGNAL);
    for (const [nx, ny] of [[31, 34], [64, 56], [72, 67]]) { ellipse(g, nx!, ny!, 2, 2, '#82602d'); px(g, nx!, ny!, SIGNAL); }
    const at = Math.floor(phase) % 6; const signalPoints = [[31, 34], [44, 42], [64, 56], [72, 67], [72, 79], [91, 101]];
    const pt = signalPoints[at]!; ellipse(g, pt[0]!, pt[1]!, 2, 2, '#fff4b9');
  }
  for (const id of selected) { const p = HEART_LANDMARKS.find(p => p.id === id); if (!p) continue; rect(g, p.x - 3, p.y - 3, 7, 1, '#ffefb2'); rect(g, p.x - 3, p.y + 3, 7, 1, '#ffefb2'); rect(g, p.x - 3, p.y - 2, 1, 5, '#ffefb2'); rect(g, p.x + 3, p.y - 2, 1, 5, '#ffefb2'); }
  if (!selected.includes('signal')) {
    // Separate local tracks terminate at the pulmonary/systemic boundaries; no septum shortcut.
    const routes = [[[24, 4], [24, 36], [36, 44], [41, 60], [47, 78], [57, 66], [60, 46], [61, 20], [7, 15]], [[133, 32], [117, 32], [96, 43], [92, 60], [96, 83], [86, 70], [82, 49], [87, 16], [106, 16], [116, 25], [116, 103]]];
    for (const route of routes) {
      const lengths = route.slice(1).map((p, i) => Math.hypot(p[0]! - route[i]![0]!, p[1]! - route[i]![1]!));
      const total = lengths.reduce((n, d) => n + d, 0);
      for (let k = 0; k < 3; k++) {
        let d = ((phase * 12 + k * total / 3) % total + total) % total, segment = 0;
        while (segment < lengths.length - 1 && d > lengths[segment]!) { d -= lengths[segment]!; segment++; }
        const a = route[segment]!, b = route[segment + 1]!, t = d / lengths[segment]!;
        const mx = Math.round(a[0]! + (b[0]! - a[0]!) * t), my = Math.round(a[1]! + (b[1]! - a[1]!) * t);
        rect(g, mx - 1, my - 1, 3, 3, '#8b455b'); rect(g, mx, my - 1, 2, 2, '#ffd197');
      }
    }
  }
  g.restore();
}

export function anatomySprite(v: number, frame: number): Sprite {
  const highlight = v === 1 ? ['ra', 'rv', 'la', 'lv', 'septum'] : v === 2 ? ['tricuspid', 'pulmonary-valve', 'mitral', 'aortic-valve'] : v === 3 ? ['svc', 'ivc', 'pulmonary-artery', 'pulmonary-veins', 'aorta'] : v === 4 ? ['signal'] : v === 5 ? ['coronary'] : [];
  return sprite(144, 130, 72, 128, g => { ellipse(g, 72, 119, 62, 8, '#825370'); ellipse(g, 72, 116, 61, 7, '#cf93a1'); rect(g, 18, 117, 108, 2, '#f3c3c8'); drawHeartAnatomy(g, 2, 3, 1, frame, highlight); }, null);
}
export function modelProp(kind: string, v: number, frame: number): Sprite | null {
  if (kind === 'heartanatomy') return anatomySprite(v, frame);
  if (kind === 'terminal') return sprite(28, 32, 14, 30, g => { rect(g, 2, 20, 24, 10, '#5a586f'); rect(g, 2, 20, 24, 2, '#b9bdca'); rect(g, 6, 10, 16, 13, '#8790a5'); rect(g, 3, 1, 22, 16, '#3d3c56'); rect(g, 5, 3, 18, 11, '#315b72'); path(g, [[7, 9], [11, 9], [13, 5], [16, 12], [18, 9], [21, 9]], 1, '#7ce7db'); rect(g, 6, 20, 15, 3, '#dce5e9'); for (let x = 7; x < 21; x += 3) px(g, x, 21, '#627e98'); px(g, 23, 23, frame % 2 ? '#ffe9a6' : '#79dccc'); }, '#353046');
  if (kind === 'observation') return sprite(18, 17, 9, 15, g => { ellipse(g, 9, 13, 7, 2, '#694b63'); ellipse(g, 9, 12, 6, 2, v ? '#eab879' : '#86c5ce'); rect(g, 7, 6, 4, 6, '#d8dce4'); rect(g, 4, 1, 10, 7, '#f6edd2'); pixelText(g, v ? 'B' : 'A', 7, 2, '#5d5269'); px(g, 2 + frame % 3, 6, '#fff6c6'); }, '#614d66');
  if (kind === 'valve') return sprite(54, 46, 27, 44, g => { ellipse(g, 27, 32, 24, 10, '#8e5367'); ellipse(g, 27, 28, 23, 10, v ? '#d6878e' : '#6ca9bc'); ellipse(g, 27, 26, 19, 8, '#3f394f'); ellipse(g, 27, 25, 17, 7, '#b4697e'); const gap = frame % 2 ? 5 : 2; line(g, [11, 24], [27 - gap, 15], 5, '#f3dfc7'); line(g, [43, 24], [27 + gap, 15], 5, '#f3dfc7'); line(g, [11, 24], [27 - gap, 15], 1, '#fff0db'); line(g, [43, 24], [27 + gap, 15], 1, '#fff0db'); arrow(g, 27, 35, 'up'); rect(g, 9, 38, 36, 3, '#be8897'); }, '#65435e');
  if (kind === 'lungs') return sprite(62, 64, 31, 61, g => { rect(g, 29, 1, 5, 19, '#c5d0d6'); path(g, [[31, 17], [18, 29], [10, 46]], 4, '#adc4d0'); path(g, [[31, 17], [43, 28], [53, 44]], 4, '#adc4d0'); ellipse(g, 17, 34, 14, 23, '#c67892'); ellipse(g, 45, 34, 14, 23, '#d8899e'); path(g, [[31, 17], [18, 29], [14, 48]], 2, '#f1c7cb'); path(g, [[31, 17], [43, 28], [48, 47]], 2, '#f1c7cb'); for (const [x, y] of [[12, 31], [20, 41], [44, 33], [51, 44]]) { ellipse(g, x!, y!, 3, 3, '#a95b7c'); px(g, x!, y!, '#eab5c5'); } ellipse(g, 31, 59, 27, 3, '#aa8497'); }, '#784965');
  if (kind === 'muscle') return sprite(56, 44, 28, 42, g => { ellipse(g, 28, 34, 25, 7, '#a26779'); for (let i = 0; i < 5; i++) { const y = 5 + i * 6; rect(g, 4, y, 46, 5, i % 2 ? '#d47c8b' : '#e8919a'); for (let x = 8 + (i % 2) * 3; x < 49; x += 9) rect(g, x, y, 1, 5, '#a4526a'); rect(g, 5, y, 44, 1, '#f1b8b8'); } path(g, [[10, 5], [18, 16], [34, 20], [45, 31]], 3, '#963f5c'); path(g, [[10, 5], [18, 16], [34, 20], [45, 31]], 1, '#ffc09b'); }, '#704359');
  if (kind === 'signalnode') return sprite(18, 28, 9, 26, g => { ellipse(g, 9, 23, 7, 3, '#7d617b'); rect(g, 7, 11, 4, 12, '#9a7995'); ellipse(g, 9, 8, 7, 6, '#9d763f'); ellipse(g, 9, 7, 5, 4, frame % 4 === v % 4 ? '#fff0b0' : '#e6bb63'); pixelText(g, String(v + 1), 8, 5, '#674f39'); }, '#655066');
  if (kind === 'recordboard') return sprite(48, 52, 24, 50, g => { rect(g, 4, 40, 4, 10, '#785b62'); rect(g, 40, 40, 4, 10, '#785b62'); rect(g, 1, 1, 46, 40, '#9c777f'); rect(g, 3, 3, 42, 35, v === 2 ? '#bcb393' : '#334d66'); if (v === 2) { for (const [x, y, c] of [[8, 9, '#f5dd9b'], [24, 8, '#d6ece1'], [13, 23, '#f7c5be']]) { rect(g, x as number, y as number, 14, 10, c as string); rect(g, (x as number) + 2, (y as number) + 3, 9, 1, '#8d8281'); } } else { pixelText(g, v ? 'COMPARE' : 'RECORD', 10, 6, '#d8e9ef'); for (let i = 0; i < 4; i++) { rect(g, 7, 15 + i * 5, 8, 1, '#b5c7d1'); rect(g, 19, 14 + i * 5, 4 + (i % 2) * 9, 2, v ? '#eabd86' : '#79c9cd'); rect(g, 35, 14 + i * 5, 3, 3, '#dedfcd'); } } rect(g, 3, 38, 42, 2, '#c7a0a6'); }, '#5d4158');
  return null;
}

/** Reusable native-resolution preview, used by automated art contact sheets. */
export function heartAnatomyCanvas(phase = 0): HTMLCanvasElement { const { c, g } = makeCanvas(HEART_ANATOMY_WIDTH, HEART_ANATOMY_HEIGHT); drawHeartAnatomy(g, 0, 0, 1, phase, ['signal', 'coronary']); return c; }

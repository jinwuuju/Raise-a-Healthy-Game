import type { Look } from '../domain/appearance';
import type { Dir } from '../world/types';
import { AX, AY, CH, CW, OY, paintGrid } from './avatar';
import { hex, makeCanvas, mirror, mix, shade } from './pixel';

/*
 * Canvas side of the reporter sprites: palette, outline, mirroring and caching.
 * The pixel layout itself lives in avatar.ts (pure, testable).
 */
export { AX, AY, CH, CW };
export const OUTLINE = '#2b2233';
const INK = '#22151d';

/** Coloured outline: each edge pixel takes a dark version of the colour it wraps (softer than flat black). */
function softOutline(c: HTMLCanvasElement): void {
  const g = c.getContext('2d', { willReadFrequently: true })!;
  const w = c.width, h = c.height, img = g.getImageData(0, 0, w, h), d = img.data;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && (d[(y * w + x) * 4 + 3] ?? 0) > 96;
  const marks: [number, string][] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (solid(x, y)) continue;
    const n = [[x, y + 1], [x, y - 1], [x - 1, y], [x + 1, y]].find(([a, b]) => solid(a!, b!));
    if (!n) continue;
    const i = (n[1]! * w + n[0]!) * 4;
    const col = '#' + [d[i]!, d[i + 1]!, d[i + 2]!].map(v => v.toString(16).padStart(2, '0')).join('');
    marks.push([y * w + x, mix(col, INK, 0.74)]);
  }
  for (const [i, col] of marks) { const [r, gg, b] = hex(col); d[i * 4] = r; d[i * 4 + 1] = gg; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
}

const SKIN: Record<string, [string, string, string]> = {
  fair: ['#fff0e6', '#f3cbb6', '#f7a7a6'], peach: ['#fcdcc4', '#ebb08f', '#f39a92'], honey: ['#f2c69a', '#d69c6c', '#ea8a78'],
  tan: ['#dba57c', '#b77b56', '#d47a66'], deep: ['#a06a4a', '#7c4c34', '#c4675a'],
  mint: ['#c2f0da', '#88c9ac', '#f4a2b8'], lilac: ['#e0d0f7', '#b59ddd', '#f4a2c6'], sky: ['#c6e5f8', '#91bfe3', '#f4a2b8'], pink: ['#ffdbe8', '#eeaac6', '#ff8fb3'],
};
const HAIR: Record<string, [string, string, string]> = {
  ink: ['#3f3649', '#272131', '#665a78'], brown: ['#7d5236', '#573620', '#ab774e'], ash: ['#8c7b70', '#62554c', '#b8a89c'],
  chestnut: ['#a45132', '#743321', '#d27852'], gold: ['#ebc461', '#c19135', '#f9e5a3'], silver: ['#cbcfdb', '#9399ae', '#f3f5fa'],
  pink: ['#f4a3bf', '#cf6f90', '#ffd3e2'], lavender: ['#b49ae6', '#8a6fc0', '#dccdf8'], teal: ['#3ea09d', '#25706e', '#73cfc6'],
};
type OP = { j: string; J: string; k: string; w: string; W: string; p: string; P: string; b: string; B: string; g: string };
const OUTFIT: Record<string, OP> = {
  reporter: { j: '#6f9c7c', J: '#4c7458', k: '#94c09e', w: '#f7f0de', W: '#d6cbb0', p: '#404f70', P: '#2c3651', b: '#71482f', B: '#4a301f', g: '#e05a6a' },
  knit: { j: '#e4ab4e', J: '#b9822f', k: '#f6d38f', w: '#f7f0de', W: '#d6cbb0', p: '#5e81b0', P: '#43608b', b: '#f2f1ec', B: '#b8b9b2', g: '#b9822f' },
  hoodie: { j: '#e57d6e', J: '#b75a52', k: '#f4a395', w: '#fcf4ea', W: '#dccfc5', p: '#4c4d5b', P: '#33343f', b: '#34353d', B: '#1f2027', g: '#fcf4ea' },
  coat: { j: '#c79768', J: '#9c6d45', k: '#e0b488', w: '#3c3c47', W: '#2a2a33', p: '#3c3c47', P: '#2a2a33', b: '#302b2b', B: '#1e1a1a', g: '#e0c27a' },
  suit: { j: '#5c6374', J: '#41475a', k: '#808799', w: '#f0f2f6', W: '#c9cdd6', p: '#41475a', P: '#2f3444', b: '#2c2627', B: '#1a1617', g: '#b04646' },
  apron: { j: '#f5f0e7', J: '#d5ccbe', k: '#ffffff', w: '#ffffff', W: '#d5ccbe', p: '#3e3b45', P: '#2a2830', b: '#5c3f2c', B: '#3d2a1d', g: '#2f6450' },
  uniform: { j: '#30466f', J: '#223255', k: '#e7c45d', w: '#eff1f5', W: '#c9cdd6', p: '#2b3b5f', P: '#1f2b47', b: '#201d21', B: '#121014', g: '#1b2238' },
  casual: { j: '#8fb6d9', J: '#6990b6', k: '#b5d1ea', w: '#ffffff', W: '#d8dde4', p: '#c9b48f', P: '#a8936f', b: '#ebe6dc', B: '#b6afa2', g: '#6990b6' },
};
const wardrobePalette:Record<string,string>={pressvest:'reporter',denim:'casual',cardigan:'knit',overalls:'uniform',raincoat:'knit',turtleneck:'suit',blouse:'apron',striped:'casual',fieldjacket:'reporter',peacoat:'uniform',aproncoat:'apron',sports:'hoodie',summer:'casual',formal:'suit'};
for(const [id,base] of Object.entries(wardrobePalette)) OUTFIT[id]={...OUTFIT[base]!};
OUTFIT.pressvest!.j='#548797';OUTFIT.pressvest!.J='#365a71';OUTFIT.raincoat!.j='#e8bc4c';OUTFIT.raincoat!.J='#a8872e';OUTFIT.blouse!.g='#b04d71';

function palette(look: Look): Record<string, string> {
  const sk = SKIN[look.skin] ?? SKIN.peach!, hr = HAIR[look.hairColor] ?? HAIR.ink!, o = OUTFIT[look.outfit] ?? OUTFIT.reporter!;
  const alien = look.build === 'a';
  return {
    o: OUTLINE, s: sk[0], S: sk[1], r: sk[2], m: '#c4566a', e: alien ? '#28365a' : '#33243f', i: alien ? '#5a8fd0' : '#7a5aa0', E: '#ffffff',
    h: hr[0], H: hr[1], L: hr[2], R: '#ef5a7a',
    j: o.j, J: o.J, d: shade(o.J, -0.3), k: o.k, w: o.w, W: o.W, p: o.p, P: o.P, b: o.b, B: o.B, c: shade(o.b, 0.3), g: o.g,
  };
}

const cache = new Map<string, HTMLCanvasElement>();
const CACHE_LIMIT = 256;
export const characterCacheStats = () => ({ size: cache.size, limit: CACHE_LIMIT });
function cached(key: string): HTMLCanvasElement | undefined {
  const c = cache.get(key);
  if (c) { cache.delete(key); cache.set(key, c); }
  return c;
}
function remember(key: string, c: HTMLCanvasElement): HTMLCanvasElement {
  cache.set(key, c);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  return c;
}
export function lookKey(look: Look): string {
  return [look.build, look.hair, look.face, look.shape, look.skin, look.hairColor, look.outfit, look.glasses ? 'g' : ''].join('.');
}

export function characterFrame(look: Look, dir: Dir, frame: number): HTMLCanvasElement {
  const key = lookKey(look) + '|' + dir + '|' + frame;
  const hit = cached(key);
  if (hit) return hit;
  if (dir === 'left') return remember(key, mirror(characterFrame(look, 'right', frame)));
  const grid = paintGrid(look, dir, frame);
  const pal = palette(look);
  const { c, g } = makeCanvas(CW, CH);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const code = grid[y * CW + x];
    if (code) { g.fillStyle = pal[code] ?? '#ff00ff'; g.fillRect(x, y, 1, 1); }
  }
  softOutline(c);
  return remember(key, c);
}

/** Head-and-shoulders crop used by HUD portraits and dialogs. */
export function portrait(look: Look): HTMLCanvasElement {
  const key = lookKey(look) + '|portrait';
  const hit = cached(key);
  if (hit) return hit;
  const src = characterFrame(look, 'down', 0);
  const { c, g } = makeCanvas(20, 22);
  g.drawImage(src, 0, OY - 2, 20, 22, 0, 0, 20, 22);
  return remember(key, c);
}

export const WALK_CYCLE = [1, 0, 2, 0];
/** Idle breathing: stand, then a one-pixel squash. `phase` keeps actors out of sync. */
export const idleFrame = (time: number, phase = 0): number => (Math.floor(time * 1.6 + phase) % 2 === 0 ? 0 : 3);
export const skinSwatch = (id: string): string => (SKIN[id] ?? SKIN.peach!)[0];
export const hairSwatch = (id: string): string => (HAIR[id] ?? HAIR.ink!)[0];
/** Height of the drawn figure above the feet, for labels and hit boxes. */
export const FIGURE_TOP = AY - OY - 1;

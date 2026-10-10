import type { Look } from '../domain/appearance';
import type { Dir } from '../world/types';
import { AX, AY, CH, CW, paintGrid } from './avatar';
import { makeCanvas, mirror, outline, shade } from './pixel';

/*
 * Canvas side of the reporter sprites: palette, outline, mirroring and caching.
 * The pixel layout itself lives in avatar.ts (pure, testable).
 */
export { AX, AY, CH, CW };
export const OUTLINE = '#2b2233';

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

function palette(look: Look): Record<string, string> {
  const sk = SKIN[look.skin] ?? SKIN.peach!, hr = HAIR[look.hairColor] ?? HAIR.ink!, o = OUTFIT[look.outfit] ?? OUTFIT.reporter!;
  const alien = look.build === 'a';
  return {
    o: OUTLINE, s: sk[0], S: sk[1], r: sk[2], m: '#c4566a', e: alien ? '#28365a' : '#33243f', i: alien ? '#5a8fd0' : '#7a5aa0', E: '#ffffff',
    h: hr[0], H: hr[1], L: hr[2], R: '#ef5a7a',
    j: o.j, J: o.J, k: o.k, w: o.w, W: o.W, p: o.p, P: o.P, b: o.b, B: o.B, c: shade(o.b, 0.3), g: o.g,
  };
}

const cache = new Map<string, HTMLCanvasElement>();
export function lookKey(look: Look): string {
  return [look.build, look.hair, look.face, look.shape, look.skin, look.hairColor, look.outfit, look.glasses ? 'g' : ''].join('.');
}

export function characterFrame(look: Look, dir: Dir, frame: number): HTMLCanvasElement {
  const key = lookKey(look) + '|' + dir + '|' + frame;
  const hit = cache.get(key);
  if (hit) return hit;
  if (dir === 'left') { const c = mirror(characterFrame(look, 'right', frame)); cache.set(key, c); return c; }
  const grid = paintGrid(look, dir, frame);
  const pal = palette(look);
  const { c, g } = makeCanvas(CW, CH);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const code = grid[y * CW + x];
    if (code) { g.fillStyle = pal[code] ?? '#ff00ff'; g.fillRect(x, y, 1, 1); }
  }
  outline(c, OUTLINE);
  cache.set(key, c);
  return c;
}

/** Head-and-shoulders crop used by HUD portraits and dialogs. */
export function portrait(look: Look): HTMLCanvasElement {
  const key = lookKey(look) + '|portrait';
  const hit = cache.get(key);
  if (hit) return hit;
  const src = characterFrame(look, 'down', 0);
  const { c, g } = makeCanvas(20, 22);
  g.drawImage(src, 2, 1, 20, 22, 0, 0, 20, 22);
  cache.set(key, c);
  return c;
}

export const WALK_CYCLE = [1, 0, 2, 0];
export const skinSwatch = (id: string): string => (SKIN[id] ?? SKIN.peach!)[0];
export const hairSwatch = (id: string): string => (HAIR[id] ?? HAIR.ink!)[0];
/** Height of the drawn figure above the feet, for labels and hit boxes. */
export const FIGURE_TOP = AY - 2;

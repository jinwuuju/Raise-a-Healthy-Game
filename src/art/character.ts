import type { Look } from '../domain/appearance';
import type { Dir } from '../world/types';
import { makeCanvas, mirror, outline, shade } from './pixel';

/*
 * Chibi reporter sprites built pixel by pixel (24x33 canvas, feet at row 30).
 * Every frame is composed from the same rules, so all outfits/hair stay on one grid
 * and nothing is ever scaled by a non-integer factor.
 */
export const CW = 24, CH = 33, AX = 12, AY = 31;
const HX = 5, HY = 6;
export const OUTLINE = '#2b2233';

const SKIN: Record<string, [string, string, string]> = {
  peach: ['#fcdcc4', '#ebb08f', '#f39a92'], honey: ['#f2c69a', '#d69c6c', '#ea8a78'], tan: ['#dba57c', '#b77b56', '#d47a66'],
  deep: ['#a06a4a', '#7c4c34', '#bf6352'], mint: ['#c2f0da', '#88c9ac', '#f4a2b8'], lilac: ['#e0d0f7', '#b59ddd', '#f4a2c6'], sky: ['#c6e5f8', '#91bfe3', '#f4a2b8'],
};
const HAIR: Record<string, [string, string, string]> = {
  ink: ['#3f3649', '#272131', '#665a78'], brown: ['#7d5236', '#573620', '#ab774e'], chestnut: ['#a45132', '#743321', '#d27852'],
  gold: ['#ebc461', '#c19135', '#f9e5a3'], silver: ['#cbcfdb', '#9399ae', '#f3f5fa'], teal: ['#3ea09d', '#25706e', '#73cfc6'],
};
type OP = { j: string; J: string; k: string; w: string; W: string; p: string; P: string; b: string; B: string; g: string };
const OUTFIT: Record<string, OP> = {
  reporter: { j: '#6f9c7c', J: '#4c7458', k: '#94c09e', w: '#f7f0de', W: '#d6cbb0', p: '#404f70', P: '#2c3651', b: '#71482f', B: '#4a301f', g: '#8d5a35' },
  knit: { j: '#e4ab4e', J: '#b9822f', k: '#f4ca7d', w: '#f7f0de', W: '#d6cbb0', p: '#5e81b0', P: '#43608b', b: '#f2f1ec', B: '#b8b9b2', g: '#b9822f' },
  hoodie: { j: '#e57d6e', J: '#b75a52', k: '#f4a395', w: '#fcf4ea', W: '#dccfc5', p: '#4c4d5b', P: '#33343f', b: '#34353d', B: '#1f2027', g: '#fcf4ea' },
  coat: { j: '#c79768', J: '#9c6d45', k: '#e0b488', w: '#3c3c47', W: '#2a2a33', p: '#3c3c47', P: '#2a2a33', b: '#302b2b', B: '#1e1a1a', g: '#e0c27a' },
  suit: { j: '#5c6374', J: '#41475a', k: '#808799', w: '#f0f2f6', W: '#c9cdd6', p: '#41475a', P: '#2f3444', b: '#2c2627', B: '#1a1617', g: '#b04646' },
  apron: { j: '#f5f0e7', J: '#d5ccbe', k: '#ffffff', w: '#ffffff', W: '#d5ccbe', p: '#3e3b45', P: '#2a2830', b: '#5c3f2c', B: '#3d2a1d', g: '#2f6450' },
  uniform: { j: '#30466f', J: '#223255', k: '#e7c45d', w: '#eff1f5', W: '#c9cdd6', p: '#2b3b5f', P: '#1f2b47', b: '#201d21', B: '#121014', g: '#1b2238' },
  casual: { j: '#8fb6d9', J: '#6990b6', k: '#b5d1ea', w: '#ffffff', W: '#d8dde4', p: '#c9b48f', P: '#a8936f', b: '#ebe6dc', B: '#b6afa2', g: '#6990b6' },
};

type Grid = (string | null)[];
const at = (x: number, y: number) => y * CW + x;
function set(g: Grid, x: number, y: number, c: string) { if (x >= 0 && y >= 0 && x < CW && y < CH) g[at(x, y)] = c; }
function row(g: Grid, y: number, x0: number, x1: number, c: string) { for (let x = x0; x <= x1; x++) set(g, x, y, c); }

const HEAD: [number, number][] = [[3, 10], [1, 12], [0, 13], [0, 13], [0, 13], [0, 13], [0, 13], [0, 13], [0, 13], [1, 12], [3, 10]];

// Hair column bottoms (head-local rows). Index 0 is the leftmost column listed in `from`.
type HairShape = { from: number; down: number[]; side: number[]; up: number[] };
const HAIRSHAPE: Record<string, HairShape> = {
  short: { from: -1, down: [6, 6, 5, 4, 4, 4, 5, 4, 4, 5, 4, 4, 4, 5, 6, 6], side: [7, 8, 8, 8, 8, 8, 8, 5, 5, 5, 4, 4, 4, 4, 3, -9], up: [7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7] },
  bob: { from: -1, down: [10, 10, 9, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 9, 10, 10], side: [11, 10, 10, 10, 10, 10, 10, 10, 10, 5, 4, 4, 4, 4, 3, -9], up: [11, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11] },
  wave: { from: -2, down: [12, 13, 12, 9, 4, 4, 4, 4, 5, 4, 4, 4, 4, 5, 9, 12, 13, 12], side: [12, 13, 13, 13, 13, 13, 13, 12, 12, 11, 5, 4, 4, 4, 4, 3, -9, -9], up: [12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 12] },
};
function hairTop(lx: number): number {
  if (lx <= -2 || lx >= 15) return 4;
  if (lx === -1 || lx === 14) return 1;
  if (lx <= 1 || lx >= 12) return 0;
  return lx >= 4 && lx <= 9 ? -2 : -1;
}

function paintGrid(look: Look, dir: Dir, frame: number): Grid {
  const g: Grid = new Array<string | null>(CW * CH).fill(null);
  const side = dir === 'left' || dir === 'right';
  const u = frame === 0 ? 0 : 1;
  const outfit = look.outfit;
  const top = 17 + u, hip = 25 + u;

  // Legs and shoes
  if (!side) {
    const lift = (leg: 0 | 1) => (frame === 1 && leg === 0) || (frame === 2 && leg === 1) ? 1 : 0;
    for (const [leg, x0] of [[0, 8], [1, 13]] as const) {
      const l = lift(leg);
      for (let y = hip + 1; y <= 28 - l; y++) { row(g, y, x0, x0 + 2, 'p'); set(g, x0 + 2, y, 'P'); }
      const sx = leg === 0 ? 7 : 13;
      row(g, 29 - l, sx, sx + 3, 'b'); row(g, 30 - l, sx, sx + 3, 'B');
      if (dir === 'down') set(g, sx + 1, 29 - l, 'c');
    }
    row(g, hip, 8, 15, 'p'); set(g, 15, hip, 'P');
  } else {
    if (frame === 0) {
      for (let y = hip + 1; y <= 28; y++) { row(g, y, 10, 13, 'p'); set(g, 10, y, 'P'); }
      row(g, 29, 10, 14, 'b'); row(g, 30, 10, 14, 'B'); set(g, 13, 29, 'c');
    } else {
      const frontNear = frame === 1;
      const back = () => { const c = frontNear ? 'P' : 'p'; row(g, 26, 9, 11, c); row(g, 27, 8, 10, c); row(g, 28, 8, 10, c); row(g, 29, 7, 10, frontNear ? 'B' : 'b'); row(g, 30, 7, 9, 'B'); };
      const front = () => { const c = frontNear ? 'p' : 'P'; row(g, 26, 12, 14, c); row(g, 27, 13, 15, c); row(g, 28, 13, 15, c); row(g, 29, 13, 16, frontNear ? 'b' : 'B'); row(g, 30, 13, 16, 'B'); };
      if (frontNear) { back(); front(); } else { front(); back(); }
    }
    row(g, hip, 10, 13, 'p');
  }

  // Torso
  if (!side) {
    row(g, top, 9, 14, 'j'); row(g, top + 1, 8, 15, 'j');
    for (let r = 2; r <= 7; r++) { row(g, top + r, 7, 16, 'j'); set(g, 16, top + r, 'J'); if (r <= 4) set(g, 7, top + r, 'k'); }
    row(g, top + 7, 7, 16, 'J');
  } else {
    row(g, top, 10, 13, 'j');
    for (let r = 1; r <= 7; r++) { row(g, top + r, 9, 14, 'j'); set(g, 9, top + r, 'J'); }
    row(g, top + 7, 9, 14, 'J');
  }
  outfitDetail(g, outfit, dir, top, hip);

  // Arms
  if (!side) {
    const swing = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    const arm = (x0: number, o: number, inner: number, outer: number) => {
      set(g, x0 === 5 ? 6 : 17, top + 1, 'j');
      for (let r = 2; r <= 5 + o; r++) { set(g, outer, top + r, outer === 5 ? 'k' : 'J'); set(g, inner, top + r, inner === 6 ? 'J' : 'j'); }
      set(g, x0, top + 6 + o, 's'); set(g, x0 + 1, top + 6 + o, 's');
    };
    arm(5, dir === 'down' ? swing : -swing, 6, 5);
    arm(17, dir === 'down' ? -swing : swing, 17, 18);
  } else {
    const shapes: Record<number, [number, number][]> = {
      0: [[11, 1], [11, 2], [11, 3], [11, 4], [11, 5]],
      1: [[11, 1], [10, 2], [10, 3], [9, 4], [9, 5]],
      2: [[11, 1], [12, 2], [12, 3], [13, 4], [13, 5]],
    };
    const pts = shapes[frame] ?? shapes[0]!;
    pts.forEach(([x, r], i) => {
      const last = i === pts.length - 1;
      set(g, x, top + r, last ? 's' : 'k'); set(g, x + 1, top + r, last ? 's' : 'j');
    });
    if (frame === 0) for (let r = 2; r <= 5; r++) set(g, 10, top + r, 'J');
  }

  // Head
  const oy = HY + u;
  HEAD.forEach(([a, b], r) => row(g, oy + r, HX + a, HX + b, 's'));
  for (let r = 2; r <= 8; r++) set(g, HX + 13, oy + r, 'S');
  row(g, oy + 10, HX + 3, HX + 10, 'S');
  const eye = (ex: number) => {
    const L = HX + ex, y = oy + 5;
    if (look.face === 'calm') { set(g, L, y + 1, 'o'); set(g, L + 1, y + 1, 'o'); set(g, L, y + 2, 'e'); set(g, L + 1, y + 2, 'e'); return; }
    set(g, L, y, 'o'); set(g, L + 1, y, 'o');
    set(g, L, y + 1, 'E'); set(g, L + 1, y + 1, 'e');
    set(g, L, y + 2, 'i'); set(g, L + 1, y + 2, look.face === 'bright' ? 'E' : 'i');
  };
  if (dir === 'down') {
    eye(3); eye(9);
    set(g, HX + 1, oy + 8, 'r'); set(g, HX + 2, oy + 8, 'r'); set(g, HX + 11, oy + 8, 'r'); set(g, HX + 12, oy + 8, 'r');
    if (look.face === 'calm') set(g, HX + 7, oy + 9, 'm'); else { set(g, HX + 6, oy + 9, 'm'); set(g, HX + 7, oy + 9, 'm'); }
  } else if (side) {
    eye(9);
    set(g, HX + 11, oy + 8, 'r'); set(g, HX + 12, oy + 8, 'r');
    set(g, HX + 12, oy + 9, 'm');
  }

  // Hair
  const shape = HAIRSHAPE[look.hair];
  if (shape) {
    const list = dir === 'down' ? shape.down : dir === 'up' ? shape.up : shape.side;
    list.forEach((bottom, i) => {
      const lx = shape.from + i;
      for (let ly = hairTop(lx); ly <= bottom; ly++) {
        let c = ly === bottom ? 'H' : 'h';
        if (dir !== 'right' && dir !== 'left' && (lx >= 12 || lx <= -1) && ly > 1) c = 'H';
        set(g, HX + lx, oy + ly, c);
      }
    });
    const shine: [number, number][] = side ? [[4, 1], [5, 0], [6, 0], [7, -1], [8, -1]] : [[2, 1], [3, 0], [4, 0], [5, -1], [6, -1], [7, -1]];
    for (const [lx, ly] of shine) set(g, HX + lx, oy + ly, 'L');
    if (dir === 'down') for (const [lx, ly] of [[5, 2], [5, 3], [8, 1], [8, 2], [8, 3]] as [number, number][]) set(g, HX + lx, oy + ly, 'H');
    if (side && look.hair === 'short') { set(g, HX + 6, oy + 6, 'S'); set(g, HX + 6, oy + 7, 'S'); }
  } else if (look.hair === 'buds') {
    const stalks = side ? [5, 9] : [3, 10];
    stalks.forEach((sx, i) => {
      for (let ly = -3; ly <= -1; ly++) set(g, HX + sx, oy + ly, 'H');
      const bx = side ? sx - (i === 0 ? 1 : 0) : (i === 0 ? sx - 1 : sx);
      set(g, HX + bx, oy - 5, 'L'); set(g, HX + bx + 1, oy - 5, 'L'); set(g, HX + bx, oy - 4, 'L'); set(g, HX + bx + 1, oy - 4, 'h');
    });
  } else if (look.hair === 'tuft') {
    row(g, oy - 1, HX + 4, HX + 9, 'h'); row(g, oy - 2, HX + 5, HX + 8, 'h'); row(g, oy - 3, HX + 6, HX + 8, 'h'); row(g, oy - 4, HX + 7, HX + 8, 'h');
    set(g, HX + 8, oy - 5, 'H'); set(g, HX + 5, oy - 2, 'L'); set(g, HX + 6, oy - 3, 'L'); set(g, HX + 9, oy - 1, 'H');
    if (!side) { set(g, HX - 1, oy + 3, 'h'); set(g, HX - 1, oy + 4, 'H'); set(g, HX + 14, oy + 3, 'h'); set(g, HX + 14, oy + 4, 'H'); }
  } else if (look.hair === 'ears') {
    const ears = side ? [[3, 'S'], [7, 's']] as const : [[1, 's'], [10, 's']] as const;
    for (const [ex, c] of ears) {
      set(g, HX + ex + 1, oy - 5, c);
      for (let ly = -4; ly <= 0; ly++) { row(g, oy + ly, HX + ex, HX + ex + 2, c); if (dir !== 'up' && c === 's' && ly < 0) set(g, HX + ex + 1, oy + ly, 'r'); }
    }
  }

  if (look.glasses && dir !== 'up') {
    const frameAt = (x0: number) => { row(g, oy + 4, HX + x0, HX + x0 + 3, 'o'); row(g, oy + 8, HX + x0, HX + x0 + 3, 'o'); for (let r = 5; r <= 7; r++) { set(g, HX + x0, oy + r, 'o'); set(g, HX + x0 + 3, oy + r, 'o'); } };
    if (dir === 'down') { frameAt(2); frameAt(8); row(g, oy + 5, HX + 6, HX + 7, 'o'); }
    else { frameAt(8); row(g, oy + 5, HX + 5, HX + 7, 'o'); }
  }
  return g;
}

function outfitDetail(g: Grid, outfit: string, dir: Dir, top: number, hip: number) {
  const s = (x: number, r: number, c: string) => set(g, x, top + r, c);
  if (dir === 'down') {
    switch (outfit) {
      case 'reporter': case 'suit':
        s(9, 0, 'k'); s(14, 0, 'k'); row(g, top, 10, 13, 'w'); row(g, top + 1, 10, 13, 'w'); s(9, 1, 'k'); s(14, 1, 'k');
        s(10, 2, 'k'); s(13, 2, 'k'); for (let r = 2; r <= 6; r++) { s(11, r, 'w'); s(12, r, 'w'); }
        if (outfit === 'suit') for (let r = 1; r <= 5; r++) { s(11, r, 'g'); s(12, r, r === 1 ? 'g' : 'W'); }
        else for (let r = 1; r <= 7; r++) s(8 + r, r, 'g');
        break;
      case 'knit':
        row(g, top, 9, 14, 'k'); s(11, 3, 'k'); s(12, 4, 'k'); s(11, 5, 'k'); s(12, 6, 'k');
        for (let x = 7; x <= 16; x += 2) s(x, 7, 'j');
        break;
      case 'hoodie':
        row(g, top, 9, 14, 'J'); s(9, 1, 'J'); s(14, 1, 'J');
        for (let r = 1; r <= 3; r++) { s(10, r, 'g'); s(13, r, 'g'); }
        row(g, top + 5, 9, 14, 'J'); s(9, 6, 'J'); s(14, 6, 'J');
        break;
      case 'coat':
        row(g, top, 10, 13, 'w'); s(9, 1, 'k'); s(10, 1, 'k'); s(11, 1, 'w'); s(12, 1, 'w'); s(13, 1, 'k'); s(14, 1, 'k');
        s(10, 2, 'k'); s(11, 2, 'w'); s(12, 2, 'w'); s(13, 2, 'k');
        for (let r = 3; r <= 7; r++) s(12, r, 'J');
        s(11, 3, 'k'); row(g, top + 5, 7, 16, 'J'); s(11, 5, 'g'); s(12, 5, 'g');
        break;
      case 'apron':
        row(g, top, 10, 13, 'w'); s(9, 0, 'g'); s(14, 0, 'g'); s(9, 1, 'g'); s(14, 1, 'g');
        for (let r = 2; r <= 7; r++) row(g, top + r, 9, 14, 'g');
        row(g, top + 4, 10, 13, 'J');
        break;
      case 'uniform':
        row(g, top, 10, 13, 'w'); for (let r = 1; r <= 4; r++) { s(11, r, 'g'); s(12, r, 'g'); }
        s(14, 3, 'k'); s(14, 5, 'k'); s(8, 1, 'k'); s(15, 1, 'k');
        break;
      default:
        row(g, top, 10, 13, 'k');
    }
  } else if (dir === 'up') {
    switch (outfit) {
      case 'reporter': for (let r = 1; r <= 7; r++) s(16 - r, r, 'g'); break;
      case 'knit': for (let x = 7; x <= 16; x += 2) s(x, 7, 'j'); break;
      case 'hoodie': row(g, top, 9, 14, 'k'); row(g, top + 1, 9, 14, 'k'); s(9, 1, 'J'); s(14, 1, 'J'); row(g, top + 2, 10, 13, 'J'); break;
      case 'coat': row(g, top + 5, 7, 16, 'J'); s(12, 6, 'J'); s(12, 7, 'J'); break;
      case 'apron': row(g, top + 5, 9, 14, 'g'); s(11, 6, 'g'); s(12, 6, 'g'); s(10, 6, 'g'); s(13, 6, 'g'); break;
      default: break;
    }
  } else {
    switch (outfit) {
      case 'reporter': case 'suit':
        for (let r = 0; r <= 6; r++) s(14, r, 'w'); s(13, 0, 'k'); s(13, 1, 'k');
        if (outfit === 'suit') for (let r = 1; r <= 4; r++) s(14, r, 'g');
        else { s(12, 1, 'g'); s(12, 2, 'g'); s(11, 3, 'g'); s(8, 5, 'g'); s(9, 5, 'g'); s(10, 5, 'g'); s(8, 6, 'g'); s(9, 6, 'g'); s(10, 6, 'g'); s(8, 7, 'J'); s(9, 7, 'g'); s(10, 7, 'g'); }
        break;
      case 'knit': row(g, top, 10, 13, 'k'); break;
      case 'hoodie': s(9, 0, 'J'); s(8, 1, 'J'); s(8, 2, 'J'); s(13, 1, 'g'); s(13, 2, 'g'); break;
      case 'coat': s(14, 0, 'k'); s(14, 1, 'k'); s(14, 2, 'k'); row(g, top + 5, 9, 14, 'J'); break;
      case 'apron': for (let r = 2; r <= 7; r++) { s(13, r, 'g'); s(14, r, 'g'); } s(8, 5, 'g'); s(9, 5, 'g'); break;
      case 'uniform': s(13, 3, 'k'); s(13, 5, 'k'); break;
      default: break;
    }
  }
  // Coat / apron skirts over the hips.
  if (outfit === 'coat') {
    const [a, b] = dir === 'left' || dir === 'right' ? [9, 14] : [7, 16];
    row(g, hip, a, b, 'j'); row(g, hip + 1, a, b, 'J');
  }
  if (outfit === 'apron' && dir === 'down') { row(g, hip, 9, 14, 'g'); row(g, hip + 1, 10, 13, 'g'); }
}

function palette(look: Look): Record<string, string> {
  const sk = SKIN[look.skin] ?? SKIN.peach!, hr = HAIR[look.hairColor] ?? HAIR.ink!, o = OUTFIT[look.outfit] ?? OUTFIT.reporter!;
  const alien = look.skin === 'mint' || look.skin === 'lilac' || look.skin === 'sky';
  return {
    o: OUTLINE, s: sk[0], S: sk[1], r: sk[2], m: '#b8525a', e: alien ? '#2d3c5a' : '#3a2840', i: alien ? '#4e7bb0' : '#6d5582', E: '#ffffff',
    h: hr[0], H: hr[1], L: hr[2], j: o.j, J: o.J, k: o.k, w: o.w, W: o.W, p: o.p, P: o.P, b: o.b, B: o.B, c: shade(o.b, 0.3), g: o.g,
  };
}

const cache = new Map<string, HTMLCanvasElement>();
export function lookKey(look: Look): string { return [look.hair, look.face, look.skin, look.hairColor, look.outfit, look.glasses ? 'g' : ''].join('.'); }

export function characterFrame(look: Look, dir: Dir, frame: number): HTMLCanvasElement {
  const key = lookKey(look) + '|' + dir + '|' + frame;
  const hit = cache.get(key);
  if (hit) return hit;
  if (dir === 'left') { const c = mirror(characterFrame(look, 'right', frame)); cache.set(key, c); return c; }
  const grid = paintGrid(look, dir, frame);
  const pal = palette(look);
  const { c, g } = makeCanvas(CW, CH);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const code = grid[at(x, y)];
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
  g.drawImage(src, 2, 0, 20, 22, 0, 0, 20, 22);
  cache.set(key, c);
  return c;
}

export const WALK_CYCLE = [1, 0, 2, 0];
export const skinSwatch = (id: string): string => (SKIN[id] ?? SKIN.peach!)[0];
export const hairSwatch = (id: string): string => (HAIR[id] ?? HAIR.ink!)[0];


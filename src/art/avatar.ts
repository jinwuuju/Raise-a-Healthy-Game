import type { Look } from '../domain/appearance';
import type { Dir } from '../world/types';

/*
 * Pure pixel painter for reporter sprites (no DOM). 24x39 canvas, feet on row 36, anchor (12, 37).
 * Slim chibi of about 2.7 heads: 12px head, 8px torso, long 2px legs. Hair is authored as small
 * templates per style and view so every style keeps the same grid; '1/2/3' cells are drawn behind
 * the body, letters in front of the face.
 */
export const CW = 24, CH = 39, AX = 12, AY = 37;
export const HY = 5;
export type Grid = (string | null)[];

type View = 'front' | 'back' | 'side';
type Tpl = { r: number; rows: string[] };
type HairArt = Record<View, Tpl>;

const T = (r: number, ...rows: string[]): Tpl => ({ r, rows });
const CAP_F = ['8:hhhhhhhh', '6:hLLLhhhhhhhh', '5:hLLhhhhhhhhhhH'];
const CAP_S = ['7:hhhhhhh', '5:hhLLLhhhhhh', '4:hhLLhhhhhhhhh'];
const CAP_SF = ['7:hhhhhhhh', '5:hhLLLhhhhhhh', '4:hhLLhhhhhhhhhh'];
const BACK_SHORT = [...CAP_F, '5:hLhhhhhhhhhhhH', '5:hhhhhhhhhhhhhH', '5:hhhhhhhhhhhhhH', '5:hhhhhhHhhhhhhH', '5:hhhhhhhhhhhhhH', '5:hhhhhhhhhhhhhH', '5:hhhhhhhhhhhhhH', '6:HhhhhhhhhhhH', '7:HHhhhhhhHH'];
const FULL_BANGS = [...CAP_F, '4:hhLhhhhhhhhhhhhH', '4:hhhhhhhhhhhhhhhH', '4:hhhhhhhhhhhhhhhH', '4:hhhhLhhhhhhhhhhH', '4:hhh 10:H 13:H 17:hhH'];
const SIDE_LONG_TOP = [...CAP_SF, '3:hhhLhhhhhhhhhhhH', '3:hhhhhhhhhhhhhhhH', '3:hhhhhhhhhhhhhhhH', '3:hhhhhhhhh 13:hhhhhH', '3:hhhhhhhh 16:hH'];
const rep = (s: string, n: number) => Array<string>(n).fill(s);

export const HAIR: Partial<Record<string, HairArt>> = {
  short: {
    front: T(-2, ...CAP_F, '5:hLhhhhhhhhhhhH', '5:hhhhhhhhhhhhhH', '5:hhhhhhhhhhhhhH', '5:Hh 10:hhhhhhhHH', '5:H 13:hhhhHH', '5:H 16:HHH'),
    back: T(-2, ...BACK_SHORT),
    side: T(-2, ...CAP_S, '4:hhLhhhhhhhhhhh', '4:hhhhhhhhhhhhhhH', '4:hhhhhhhhhhhhhhH', '4:hhhhhhhh 14:hhhhH', '4:hhhhhhh 17:hH', '4:Hhhhhhh', '4:Hhhhh', '5:HHh', '6:H'),
  },
  comma: {
    front: T(-2, '8:hhhhhhhh', '6:hLLLhhhhhhhh', '5:hLLhhhLhhhhhhH', '5:hLhhhhHhhhhhhH', '5:hhhhhhHhhhhhhH', '5:hhhhhh 13:hhhhhH', '5:Hhhhh 14:hhhhH', '5:HhH 16:HhH', '5:HH 17:HH'),
    back: T(-2, ...BACK_SHORT),
    side: T(-2, ...CAP_S, '4:hhLhhhhhhhhhhh', '4:hhhhhhhhhhhhhhH', '4:hhhhhhhhhhhhhhH', '4:hhhhhhhh 13:hhhhhH', '4:hhhhhhh 16:hhH', '4:Hhhhhhh 17:H', '4:Hhhhh', '5:HHh', '6:H'),
  },
  spiky: {
    front: T(-4, '9:h 14:h', '6:h 9:hh 13:hh 17:h', '5:hhhhhhhhhhhhhh', '4:hhLLLhhhhhhhhhhH', '4:hLLhhhhhhhhhhhhH', '5:hLhhhhhhhhhhhH', '5:hhhhhhhhhhhhhH', '5:hhhhhhhhhhhhhH', '5:Hhh 9:h 11:hh 14:h 16:hhH', '5:H 11:h 18:H'),
    back: T(-4, '9:h 14:h', '6:h 9:hh 13:hh 17:h', '5:hhhhhhhhhhhhhh', '4:hhLLLhhhhhhhhhhH', '4:hLLhhhhhhhhhhhhH', ...rep('5:hhhhhhhhhhhhhH', 6), '6:HhhhhhhhhhhH', '7:HHhhhhhhHH'),
    side: T(-4, '8:h 12:h', '5:h 8:hh 11:hh 14:h', '5:hhhhhhhhhhh', '4:hhLLLhhhhhhhh', '3:hhLLhhhhhhhhhhh', '4:hhLhhhhhhhhhhhH', '4:hhhhhhhhhhhhhhH', '4:hhhhhhhhhhhhhhH', '4:hhhhhhhh 14:h 16:hhH', '4:hhhhhhh 18:H', '4:Hhhhhhh', '4:Hhhhh', '5:HHh'),
  },
  curly: {
    front: T(-3, '9:hhhhhh', '7:hhLhhhhhhh', '5:hhLLhhLhhhhhhh', '4:hhLhhhLhhhhLhhhH', '4:hLhhLhhhhLhhhhhH', '4:hhhhhhhhhhhhhhhH', '4:HhhLhhhhLhhhhLhH', '4:Hhh 8:hh 13:hh 16:hhhH', '4:Hh 18:hH', '4:H 19:H'),
    back: T(-3, '9:hhhhhh', '7:hhLhhhhhhh', '5:hhLLhhLhhhhhhh', '4:hhLhhhLhhhhLhhhH', '4:hLhhLhhhhLhhhhhH', '4:hhhhhhhhhhhhhhhH', '4:hhhLhhhhhLhhhhhH', '4:hhhhhhhhhhhhhhhH', '4:hLhhhhLhhhhhLhhH', '4:hhhhhhhhhhhhhhhH', '5:HhhhhhhhhhhhhH', '6:HHhhhhhhhhHH'),
    side: T(-3, '7:hhhhh', '5:hhLhhhhhhh', '4:hhLLhhLhhhhhh', '3:hhLhhhLhhhhLhhh', '3:hLhhLhhhhLhhhhH', '3:hhhhhhhhhhhhhhhH', '3:HhhLhhhhLhhhhhH', '3:Hhhhhhhhh 14:hh 17:hhH', '3:Hhhhhhhh 18:H', '3:HhhhhhH', '4:HhhhH', '5:HH'),
  },
  buzz: {
    front: T(-1, '8:hhhhhhhh', '6:hLLhhhhhhhhH', '6:hLhhhhhhhhhH', '6:hhhhhhhhhhhH', '6:HhhhhhhhhhhH', '6:H 17:H'),
    back: T(-1, '8:hhhhhhhh', '6:hLLhhhhhhhhH', ...rep('6:hhhhhhhhhhhH', 6), '6:HHhhhhhhhhHH', '7:HHHHHHHHHH'),
    side: T(-1, '7:hhhhhhh', '5:hhLLhhhhhhh', '5:hLhhhhhhhhhhH', '5:hhhhhhhhhhhhH', '5:hhhhhhhh 15:hhH', '5:Hhhhhh', '5:Hhhhh', '5:Hhhh', '5:HH'),
  },
  wolf: {
    front: T(-2, ...CAP_F, '5:hLhhhhhhhhhhhH', '5:hhhhhhhhhhhhhH', '5:hhhhhhhhhhhhhH', '5:Hhh 9:hh 12:hhhhhhH', '5:Hh 13:hh 17:hH', '5:Hh 17:hH', '5:Hh 17:hH', '5:H 18:H', '', '7:1 16:1', '7:21 15:12', '8:2 15:2'),
    back: T(-2, ...CAP_F, '5:hLhhhhhhhhhhhH', ...rep('5:hhhhhhhhhhhhhH', 8), '5:HhhhhhhhhhhhhH', '6:hhhhhhhhhhhH', '7:HhhhhhhhhH', '7:H 9:H 11:hH 14:H 16:H'),
    side: T(-2, ...CAP_S, '4:hhLhhhhhhhhhhh', '4:hhhhhhhhhhhhhhH', '4:hhhhhhhhhhhhhhH', '4:hhhhhhhh 13:hhhhhH', '4:hhhhhhh 16:hhH', '4:hhhhhhh 17:H', '4:hhhhhhh', '4:hhhhhh', '4:Hhhhh', '4:hhhh', '5:HhH', '5:H 7:H'),
  },
  bob: {
    front: T(-2, ...FULL_BANGS, ...rep('4:hhh 17:hhH', 5), '4:HhhH 16:HhhH', '5:HH 17:HH'),
    back: T(-2, ...CAP_F, '4:hhhhhhhhhhhhhhhH', '4:hhLLhhhhhhhhhhhH', ...rep('4:hhhhhhhhhhhhhhhH', 8), '4:HhhhhhhhhhhhhhhH', '5:HHHHHHHHHHHHHH'),
    side: T(-2, ...SIDE_LONG_TOP, ...rep('3:hhhhhhhh', 5), '3:HhhhhhhH', '4:HHHHHH'),
  },
  long: {
    front: T(-2, ...FULL_BANGS, '4:hhh 17:hhH', '4:hhh 17:hhH', '4:hLh 17:hhH', ...rep('4:hhh 17:hhH', 9), '4:hLh 17:hhH', '4:hhh 17:hhH', '4:HHH 17:HHH'),
    back: T(-2, ...CAP_F, '4:hhhhhhhhhhhhhhhH', '4:hhLLhhhhhhhhhhhH', '4:hhhhhhhhhhhhhhhH', '4:hhhhhhhhhhhhhhhH', '4:hhhhhHhhhhhHhhhH', ...rep('4:hhhhhhhhhhhhhhhH', 6), '4:hhhhhHhhhhhHhhhH', ...rep('4:hhhhhhhhhhhhhhhH', 5), '4:HHHHHHHHHHHHHHHH'),
    side: T(-2, ...SIDE_LONG_TOP, ...rep('3:hhhhhhhh', 6), '3:hhhhhhhH', ...rep('3:hhhhhhhH', 5), '3:HHHHHHH'),
  },
  wave: {
    front: T(-2, '8:hhhhhhhh', '6:hLLLhhhhhhhh', '5:hLLhhhHhhhhhhH', '4:hhLhhhhHhhhhhhhH', '4:hhhhhhhHhhhhhhhH', '4:hhhhhhh 13:hhhhhhH', '4:hhhhhh 14:hhhhhH', '4:hhhh 16:hhhH', '4:hhh 17:hhH', '4:hLh 17:hhH', '4:hhh 17:hhH', '4:hhh 17:hhH', '4:hhh 17:hhH', '3:hhhH 17:Hhhh', '3:hhh 18:hhh', '4:hhh 17:hhh', '3:hhhH 17:Hhhh', '3:Hhh 18:hhH', '4:HhH 17:HhH', '5:H 18:H'),
    back: T(-2, ...CAP_F, '4:hhhhhhhhhhhhhhhH', '4:hhLLhhhhhhhhhhhH', '4:hhhhhhhhhhhhhhhH', '4:hhhhhhhhhhhhhhhH', '4:hhhHhhhhhhhHhhhH', ...rep('4:hhhhhhhhhhhhhhhH', 3), '4:hhhHhhhhhhhHhhhH', ...rep('4:hhhhhhhhhhhhhhhH', 4), '3:hhhhhhhhhhhhhhhhhH', '3:HhhhhhhhhhhhhhhhhH', '4:HhhhHhhhhHhhhhH', '5:HH 9:HHH 14:HHH'),
    side: T(-2, ...CAP_SF, '3:hhhLhhhhhhhhhhhH', '3:hhhhhhhhhhhhhhhH', '3:hhhhhhhhhhhhhhhH', '3:hhhhhhhhh 15:hhhH', '3:hhhhhhhh 18:h', ...rep('3:hhhhhhhh', 5), '2:hhhhhhhh', '2:hhhhhhH', '2:hhhhhhH', '3:hhhhhH', '2:hhhhhH', '3:HhhH', '4:H'),
  },
  ponytail: {
    front: T(-2, ...CAP_F, '5:hLhhhhhhhhhhhH 19:2', '5:hhhhhhhhhhhhhH 19:12', '5:hhhhhhhhhhhhhH 19:12', '5:Hh 10:hhhhhhhHH 19:12', '5:H 16:hHH 19:12', '5:H 17:HH 19:12', '5:h 18:h 19:12', '5:h 18:h 20:12', '5:H 18:H 20:12', '20:12', '20:2'),
    back: T(-2, ...CAP_F, '5:hhhhhh 11:RR 13:hhhhhH', ...rep('5:hhhhhhhhhhhhhH', 5), '6:HhhhhhhhhhhH', '7:HHhhhhhhHH', '10:hLhh', '10:hLhh', '10:hhhH', '10:hhhH', '11:hhH', '11:HH'),
    side: T(-2, ...CAP_S, '2:2R 4:hhLhhhhhhhhhhh', '1:12 3:hhhhhhhhhhhhhhhH', '1:12 4:hhhhhhhhhhhhhhH', '0:12 4:hhhhhhhh 14:hhhhH', '0:12 4:hhhhhhh 17:hH', '0:12 4:Hhhhhh', '1:12 4:Hhhh', '1:12 5:HH', '2:2'),
  },
  twin: {
    front: T(-2, ...FULL_BANGS, '3:Rhh 18:hhR', '2:hhh 19:hhh', '1:hhLh 19:hLhh', '1:hhhh 19:hhhh', '1:hhhH 19:Hhhh', '2:hhH 19:Hhh', '2:hhH 19:Hhh', '3:hH 19:Hh', '3:H 20:H'),
    back: T(-2, ...CAP_F, ...rep('4:hhhhhhhhhhhhhhhH', 5), '3:R 4:hhhhhhhhhhhhhhhH 20:R', '2:hhh 6:HhhhhhhhhhhH 19:hhh', '1:hhLh 7:HHhhhhhhHH 19:hLhh', '1:hhhh 19:hhhh', '1:hhhH 19:Hhhh', '2:hhH 19:Hhh', '2:hhH 19:Hhh', '3:hH 19:Hh', '3:H 20:H'),
    side: T(-2, ...SIDE_LONG_TOP, '3:hhhhhhR', '2:hhhhhhh', '1:hhLhhhh', '1:hhhh', '1:hhhH', '2:hhH', '2:hhH', '3:hH', '3:H'),
  },
  bun: {
    front: T(-5, '10:hhhh', '9:hLLhhh', '9:hLhhhH', '9:RRRRRR', '6:hLLLhhhhhhhh', '5:hLLhhhHhhhhhhH', '5:hLhhhhHhhhhhhH', '5:hhhhhhHhhhhhhH', '5:hhhhhh 13:hhhhhH', '5:hhhh 15:hhhH', '5:hH 17:Hh', '5:h 18:h', '5:h 18:h', '5:H 18:H'),
    back: T(-5, '10:hhhh', '9:hLLhhh', '9:hhhhhH', '9:RRRRRR', '6:hLLLhhhhhhhh', '5:hLLhhhhhhhhhhH', ...rep('5:hhhhhhhhhhhhhH', 6), '6:HhhhhhhhhhhH', '7:HHhhhhhhHH'),
    side: T(-5, '5:hhhh', '4:hLLhhh', '4:hLhhhH', '5:RR 7:hhhhhhh', '5:hhLLLhhhhhhh', '4:hhLLhhhhhhhhhh', '4:hhLhhhhhhhhhhhH', '4:hhhhhhhhhhhhhhH', '4:hhhhhhhhhhhhhhH', '4:hhhhhhhh 14:hhhhH', '4:hhhhhhh 17:hH', '4:Hhhhhhh', '4:Hhhhh', '5:HHh', '6:H'),
  },
  buds: {
    front: T(-5, '7:LL 15:LL', '7:Lh 15:hH', '8:H 15:H', '8:H 15:H', '8:H 15:H', '8:H 15:H'),
    back: T(-5, '7:LL 15:LL', '7:hh 15:hH', '8:H 15:H', '8:H 15:H', '8:H 15:H', '8:H 15:H'),
    side: T(-5, '8:LL 12:LL', '8:Lh 12:hH', '9:H 12:H', '9:H 12:H', '9:H 12:H'),
  },
  tuft: {
    front: T(-4, '11:hL', '9:hhLh', '8:hhhhhh', '9:hhhh', '', '', '', '', '5:h 18:h', '5:H 18:H'),
    back: T(-4, '11:hL', '9:hhLh', '8:hhhhhh', '9:hhhh', '', '', '', '', '5:h 18:h', '5:H 18:H'),
    side: T(-4, '10:hL', '9:hhLh', '8:hhhhhh', '9:hhhh', '', '', '', '', '5:h', '5:H'),
  },
  ears: {
    front: T(-5, '8:s 15:S', '7:srs 14:srS', '7:srs 14:srS', '7:srs 14:srS', '7:sss 14:ssS', '8:s 15:S'),
    back: T(-5, '8:s 15:S', '7:sss 14:ssS', '7:sss 14:ssS', '7:sss 14:ssS', '7:sss 14:ssS', '8:s 15:S'),
    side: T(-5, '8:S 11:s', '7:SS 10:srs', '7:SS 10:srs', '7:SS 10:srs', '8:S 10:sss', '10:ss'),
  },
  crest: {
    front: T(-4, '11:L', '10:Lhh', '9:hLhhh', '8:hhhhhhH', '9:hhhhhH'),
    back: T(-4, '11:h', '10:hhh', '9:hhhhh', '8:hhhhhhH', '9:hhhhhH'),
    side: T(-4, '10:L', '9:Lhh', '8:hLhhh', '7:hhhhhhH', '8:hhhhhH'),
  },
};

/** Parses one template row ('5:hhH 19:12') into [x, code] cells. */
export function cells(row: string): [number, string][] {
  const out: [number, string][] = [];
  for (const seg of row.split(' ')) {
    if (!seg) continue;
    const i = seg.indexOf(':');
    const x0 = Number(seg.slice(0, i));
    [...seg.slice(i + 1)].forEach((c, k) => { if (c !== '.') out.push([x0 + k, c]); });
  }
  return out;
}

const BEHIND: Record<string, string> = { '1': 'h', '2': 'H', '3': 'L' };

// Face shape: last three rows (r9..r11) of the 12-row head.
const SHAPE: Record<string, [number, number][]> = {
  round: [[6, 17], [7, 16], [9, 14]],
  oval: [[7, 16], [8, 15], [9, 14]],
  vline: [[7, 16], [8, 15], [10, 13]],
  square: [[6, 17], [6, 17], [8, 15]],
  mochi: [[6, 17], [6, 17], [7, 16]],
};
export function headRows(shape: string): [number, number][] {
  const top: [number, number][] = [[9, 14], [7, 16], [6, 17], [6, 17], [6, 17], [6, 17], [6, 17], [6, 17], [6, 17]];
  return [...top, ...(SHAPE[shape] ?? SHAPE.oval!)];
}

export function paintGrid(look: Look, dir: Dir, frame: number): Grid {
  const g: Grid = new Array<string | null>(CW * CH).fill(null);
  const set = (x: number, y: number, c: string) => { if (x >= 0 && y >= 0 && x < CW && y < CH) g[y * CW + x] = c; };
  const get = (x: number, y: number) => (x >= 0 && y >= 0 && x < CW && y < CH ? g[y * CW + x] ?? null : null);
  const row = (y: number, x0: number, x1: number, c: string) => { for (let x = x0; x <= x1; x++) set(x, y, c); };
  const build = look.build ?? 'm';
  const view: View = dir === 'down' ? 'front' : dir === 'up' ? 'back' : 'side';
  const side = view === 'side';
  const u = frame === 0 ? 0 : 1;
  const oy = HY + u, top = 18 + u, hip = 26 + u;
  const L0 = build === 'm' ? 8 : 9, R0 = 23 - L0, S0 = build === 'm' ? 9 : 10;
  const skirt = build === 'f' && look.outfit === 'knit';
  const hair = HAIR[look.hair];
  const tpl = hair?.[view];

  // 1. Hair that hangs behind the body.
  if (tpl) tpl.rows.forEach((r, i) => { for (const [x, c] of cells(r)) if (BEHIND[c]) set(x, oy + tpl.r + i, BEHIND[c]!); });

  // 2. Legs, skirt and shoes.
  const legColor = skirt ? 's' : 'p', legShade = skirt ? 'S' : 'P';
  if (!side) {
    const lift = (leg: 0 | 1) => ((frame === 1 && leg === 0) || (frame === 2 && leg === 1) ? 1 : 0);
    for (const [leg, x0] of [[0, 9], [1, 13]] as const) {
      const l = lift(leg);
      for (let y = hip + 1; y <= 34 - l; y++) { set(x0, y, legColor); set(x0 + 1, y, leg === 1 ? legShade : legColor); }
      const sx = leg === 0 ? 8 : 13;
      row(35 - l, sx, sx + 2, 'b'); row(36 - l, sx, sx + 2, 'B');
      if (view === 'front') set(sx + 1, 35 - l, 'c');
    }
    row(hip, 9, 14, 'p'); set(14, hip, 'P');
  } else {
    const leg = (fwd: boolean, c: string, shoe: string) => {
      for (let y = hip + 1; y <= 34; y++) {
        const k = y - hip, dx = frame === 0 ? 0 : k <= 2 ? 0 : k <= 5 ? 1 : 2, x = fwd ? 11 + dx : 11 - dx;
        set(x, y, c); set(x + 1, y, c);
      }
      const sx = frame === 0 ? 11 : fwd ? 13 : 9;
      row(35, sx, sx + 3, shoe); row(36, sx, sx + 3, 'B');
      if (shoe === 'b') set(sx + 3, 35, 'c');
    };
    if (frame === 0) leg(true, legColor, 'b');
    else if (frame === 1) { leg(false, legShade, 'B'); leg(true, legColor, 'b'); }
    else { leg(true, legShade, 'B'); leg(false, legColor, 'b'); }
    row(hip, 10, 13, 'p');
  }
  if (skirt) {
    if (!side) { row(hip, 9, 14, 'p'); row(hip + 1, 8, 15, 'p'); row(hip + 2, 8, 15, 'p'); row(hip + 3, 8, 15, 'P'); for (const x of [10, 13]) { set(x, hip + 1, 'P'); set(x, hip + 2, 'P'); } }
    else { row(hip, 10, 13, 'p'); row(hip + 1, 9, 14, 'p'); row(hip + 2, 9, 14, 'p'); row(hip + 3, 9, 14, 'P'); set(11, hip + 2, 'P'); }
  }

  // 3. Torso and outfit.
  if (!side) {
    row(top, L0 + 1, R0 - 1, 'j');
    for (let r = 1; r <= 6; r++) { row(top + r, L0, R0, 'j'); set(R0, top + r, 'J'); }
    row(top + 7, L0, R0, 'J');
  } else {
    row(top, S0 + 1, 13, 'j');
    for (let r = 1; r <= 6; r++) { row(top + r, S0, 14, 'j'); set(14, top + r, 'J'); }
    row(top + 7, S0, 14, 'J');
  }
  outfitDetail(set, row, look.outfit, view, top, hip, L0, R0, S0, build);

  // 4. Arms.
  if (!side) {
    const swing = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    const arm = (x: number, o: number, c: string) => { for (let r = 1; r <= 5 + o; r++) set(x, top + r, c); set(x, top + 6 + o, 's'); };
    arm(L0 - 1, view === 'front' ? swing : -swing, 'k');
    arm(R0 + 1, view === 'front' ? -swing : swing, 'J');
  } else {
    const shapes: Record<number, [number, number][]> = {
      0: [[11, 1], [11, 2], [11, 3], [11, 4], [11, 5]],
      1: [[11, 1], [11, 2], [10, 3], [10, 4], [9, 5]],
      2: [[11, 1], [11, 2], [12, 3], [12, 4], [13, 5]],
    };
    const pts = shapes[frame] ?? shapes[0]!;
    for (const [x, r] of pts) { set(x, top + r, 'k'); set(x + 1, top + r, 'j'); }
    const last = pts[pts.length - 1]!;
    set(last[0], top + 6, 's'); set(last[0] + 1, top + 6, 's');
  }

  // 5. Neck and head.
  if (side) { set(11, oy + 12, 'S'); set(12, oy + 12, 'S'); } else { set(11, oy + 12, 'S'); set(12, oy + 12, 'S'); }
  const rows = headRows(look.shape);
  rows.forEach(([a, b], r) => row(oy + r, a, b, 's'));
  if (view !== 'side') for (let r = 3; r <= 10; r++) set(rows[r]![1], oy + r, 'S');
  row(oy + 11, rows[11]![0], rows[11]![1], 'S');
  if (build !== 'a') {
    if (view === 'side') { row(oy + 7, 9, 10, 'S'); row(oy + 8, 9, 10, 'S'); set(10, oy + 8, 'r'); }
    else { set(5, oy + 7, 's'); set(5, oy + 8, 's'); set(18, oy + 7, 'S'); set(18, oy + 8, 'S'); }
  }

  // 6. Face.
  if (view !== 'back') face(set, look, build, oy, side, rows);

  // 7. Front hair.
  if (tpl) tpl.rows.forEach((r, i) => { for (const [x, c] of cells(r)) if (!BEHIND[c]) set(x, oy + tpl.r + i, c); });
  if (view === 'front' && build !== 'a') for (let x = 6; x <= 17; x++) for (let r = 1; r <= 7; r++) {
    const above = get(x, oy + r - 1);
    if (get(x, oy + r) === 's' && (above === 'h' || above === 'H' || above === 'L')) set(x, oy + r, 'S');
  }

  // 8. Glasses.
  if (look.glasses && view !== 'back') {
    const box = (x0: number) => { row(oy + 5, x0, x0 + 3, 'o'); row(oy + 9, x0, x0 + 3, 'o'); for (let r = 6; r <= 8; r++) { set(x0, oy + r, 'o'); set(x0 + 3, oy + r, 'o'); } };
    if (view === 'front') { box(7); box(13); row(oy + 6, 11, 12, 'o'); } else { box(13); row(oy + 6, 10, 12, 'o'); }
  }
  return g;
}

type SetFn = (x: number, y: number, c: string) => void;
type RowFn = (y: number, x0: number, x1: number, c: string) => void;

function face(set: SetFn, look: Look, build: string, oy: number, side: boolean, rows: [number, number][]) {
  const P = (x: number, r: number, c: string) => set(x, oy + r, c);
  const eyes: [number, number, boolean][] = side ? [[14, 15, false]] : [[8, 9, true], [14, 15, false]];
  for (const [a, b, left] of eyes) {
    const outer = left ? a - 1 : b + 1, beyondIn = left ? b + 1 : a - 1, inner = left ? b : a;
    let f: string = look.face;
    if (f === 'wink' && !left && !side) f = 'closed';
    else if (f === 'wink') f = 'bright';
    switch (f) {
      case 'smile': case 'closed': P(a, 7, 'e'); P(b, 7, 'e'); P(outer, 8, 'e'); P(beyondIn, 8, 'e'); break;
      case 'doe': P(a, 5, 'e'); P(b, 5, 'e'); P(a, 6, 'E'); P(b, 6, 'e'); P(a, 7, 'e'); P(b, 7, 'E'); P(a, 8, 'i'); P(b, 8, 'i'); P(outer, 5, 'o'); break;
      case 'cat': P(a, 6, 'e'); P(b, 6, 'e'); P(outer, 5, 'o'); P(a, 7, 'E'); P(b, 7, 'e'); P(inner, 8, 'i'); break;
      case 'calm': P(outer, 7, 'o'); P(a, 7, 'o'); P(b, 7, 'o'); P(a, 8, 'e'); P(b, 8, 'i'); break;
      case 'cool': P(outer, 6, 'o'); P(a, 6, 'o'); P(b, 6, 'o'); P(a, 7, 'E'); P(b, 7, 'e'); break;
      case 'dot': P(a, 7, 'E'); P(b, 7, 'e'); P(a, 8, 'e'); P(b, 8, 'e'); break;
      case 'star': P(a, 6, 'e'); P(b, 6, 'e'); P(a, 7, 'E'); P(b, 7, 'e'); P(a, 8, 'i'); P(b, 8, 'E'); break;
      default: P(a, 6, 'e'); P(b, 6, 'e'); P(a, 7, 'E'); P(b, 7, 'e'); P(a, 8, 'i'); P(b, 8, 'i');
    }
    if (build === 'f' && (f === 'bright' || f === 'star')) P(outer, 6, 'o');
    if (build === 'm' && f !== 'closed') { P(a, 4, 'H'); P(b, 4, 'H'); if (f === 'cool') P(outer, 4, 'H'); }
  }
  if (!side) {
    P(7, 9, 'r'); P(8, 9, 'r'); P(15, 9, 'r'); P(16, 9, 'r');
    if (look.face === 'cool') P(12, 10, 'm'); else { P(11, 10, 'm'); P(12, 10, 'm'); }
  } else {
    P(15, 9, 'r'); P(16, 9, 'r');
    P(rows[10]![1] - 1, 10, 'm');
    if (build !== 'a') P(rows[8]![1] + 1, 8, 's');
  }
}

function outfitDetail(set: SetFn, row: RowFn, outfit: string, view: View, top: number, hip: number, L0: number, R0: number, S0: number, build: string) {
  const s = (x: number, r: number, c: string) => set(x, top + r, c);
  if (view === 'front') {
    switch (outfit) {
      case 'reporter': case 'suit':
        for (let r = 0; r <= 6; r++) { s(11, r, 'w'); s(12, r, 'w'); }
        s(10, 0, 'k'); s(13, 0, 'k'); s(10, 1, 'k'); s(13, 1, 'k'); s(10, 2, 'J'); s(13, 2, 'J');
        if (outfit === 'suit') for (let r = 1; r <= 5; r++) { s(11, r, 'g'); s(12, r, r === 1 ? 'g' : 'W'); }
        else { s(L0 + 1, 3, 'w'); s(L0 + 1, 4, 'W'); s(L0 + 1, 2, 'g'); }
        break;
      case 'knit':
        row(top, L0 + 1, R0 - 1, 'k'); row(top + 3, L0, R0 - 1, 'k');
        for (let x = L0; x <= R0; x += 2) s(x, 7, 'j');
        break;
      case 'hoodie':
        row(top, L0, R0, 'J'); s(10, 1, 'g'); s(10, 2, 'g'); s(13, 1, 'g'); s(13, 2, 'g');
        row(top + 5, L0 + 1, R0 - 1, 'J'); s(L0 + 1, 6, 'J'); s(R0 - 1, 6, 'J');
        break;
      case 'coat':
        s(11, 0, 'w'); s(12, 0, 'w'); s(11, 1, 'w'); s(12, 1, 'w');
        for (let r = 0; r <= 2; r++) { s(10, r, 'k'); s(13, r, 'k'); }
        for (let r = 3; r <= 7; r++) s(12, r, 'J');
        row(top + 5, L0, R0, 'J'); s(11, 5, 'g'); s(12, 5, 'g');
        break;
      case 'apron':
        s(11, 0, 'w'); s(12, 0, 'w'); s(L0 + 1, 0, 'g'); s(R0 - 1, 0, 'g'); s(L0 + 1, 1, 'g'); s(R0 - 1, 1, 'g');
        for (let r = 2; r <= 7; r++) row(top + r, L0 + 1, R0 - 1, 'g');
        row(top + 5, 10, 13, 'J');
        break;
      case 'uniform':
        s(11, 0, 'w'); s(12, 0, 'w'); for (let r = 1; r <= 4; r++) { s(11, r, 'g'); s(12, r, 'g'); }
        s(R0 - 1, 2, 'k'); s(L0 + 1, 3, 'J'); s(R0 - 1, 3, 'J');
        break;
      default:
        row(top, 10, 13, 'k'); for (let r = 1; r <= 5; r++) s(11, r, 'W');
    }
  } else if (view === 'back') {
    switch (outfit) {
      case 'reporter': case 'suit': for (let r = 3; r <= 7; r++) s(11, r, 'J'); break;
      case 'knit': for (let x = L0; x <= R0; x += 2) s(x, 7, 'j'); break;
      case 'hoodie': row(top, L0 + 1, R0 - 1, 'k'); row(top + 1, L0 + 1, R0 - 1, 'k'); row(top + 2, L0 + 2, R0 - 2, 'J'); break;
      case 'coat': row(top + 5, L0, R0, 'J'); s(11, 6, 'J'); s(11, 7, 'J'); break;
      case 'apron': row(top + 5, L0, R0, 'g'); s(11, 6, 'g'); s(12, 6, 'g'); break;
      default: break;
    }
  } else {
    switch (outfit) {
      case 'reporter': case 'suit':
        for (let r = 0; r <= 6; r++) s(14, r, 'w'); s(13, 0, 'k'); s(13, 1, 'k');
        if (outfit === 'suit') for (let r = 1; r <= 4; r++) s(14, r, 'g');
        break;
      case 'knit': row(top, S0 + 1, 13, 'k'); row(top + 3, S0, 14, 'k'); break;
      case 'hoodie': s(S0, 0, 'J'); s(S0, 1, 'J'); s(S0 + 1, 0, 'J'); s(14, 1, 'g'); s(14, 2, 'g'); break;
      case 'coat': s(14, 0, 'k'); s(14, 1, 'k'); s(14, 2, 'k'); row(top + 5, S0, 14, 'J'); break;
      case 'apron': for (let r = 2; r <= 7; r++) { s(13, r, 'g'); s(14, r, 'g'); } break;
      case 'uniform': s(13, 2, 'k'); s(14, 1, 'g'); s(14, 2, 'g'); break;
      default: s(13, 0, 'k'); s(14, 0, 'k');
    }
  }
  if (outfit === 'coat') {
    const [a, b] = view === 'side' ? [S0, 14] : [L0, R0];
    row(hip, a, b, 'j'); row(hip + 1, a, b, 'J');
  }
  if (outfit === 'apron' && view === 'front') { row(hip, L0 + 1, R0 - 1, 'g'); row(hip + 1, L0 + 1, R0 - 1, 'g'); }
  void build;
}

/** Text preview used by tests and tooling. */
export function asText(grid: Grid): string {
  const lines: string[] = [];
  for (let y = 0; y < CH; y++) { let l = ''; for (let x = 0; x < CW; x++) l += grid[y * CW + x] ?? '.'; lines.push(l); }
  return lines.join(String.fromCharCode(10));
}

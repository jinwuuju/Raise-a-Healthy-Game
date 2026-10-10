import type { Look } from '../domain/appearance';
import type { Dir } from '../world/types';

/*
 * Reporter sprites v5 (D047): 바람의나라-style proportions (~2.3 heads) with the cute v3 face, a little smaller.
 * Head r1..r11 (skin r3..r11), neck r12, torso r13..r19, legs r20..r24, feet r25.
 * Front: low wide eyes with one highlight, blush, small mouth. Side: a human profile
 * (sloped forehead, 1px nose, lip, chin, ear) instead of a round disc. Back: hair closes
 * with a tapered nape instead of a straight line.
 * Canvas 20x34, feet on row 32, anchor (10, 33).
 */
export const CW = 20, CH = 34, AX = 10, AY = 33;
export const OY = 7;
export type Grid = (string | null)[];
type View = 'front' | 'back' | 'side';
type Tpl = { r: number; rows: string[] };
type HairArt = { front: Tpl; side: Tpl; nape: number; sheet: number; tail?: Tpl };

const T = (r: number, ...rows: string[]): Tpl => ({ r, rows });
const rep = (s: string, n: number) => Array<string>(n).fill(s);
const CAP = ['6:hhhhhhhh', '4:hhLLhhhhhhhh', '3:hLLhhhhhhhhhhH', '3:hhLhhhhhhhhhhH'];
const BANGS = ['6:hhhhhhhh', '4:hhLLhhhhhhhh', '3:hLLhhhhhhhhhhH', '2:hhLhhhhhhhhhhhhH', '2:hhhhLhhhhhhhhhhH', '2:hhhhhhhhhhhhhhhH'];
const SIDE_CAP = ['6:hhhhhh', '4:hhLLLhhhhh', '3:hhLLhhhhhhhh', '2:hhLhhhhhhhhhhH', '2:hhhhhhhhhhhhhhH'];
const SIDE_F = [...SIDE_CAP, '2:hhhhhhhh 12:hhhhH', '2:hhhhhhh 15:hH'];
const BRAID = ['14:hLh', '14:hhH'];

export const HAIR: Partial<Record<string, HairArt>> = {
  comma: {
    front: T(1, '6:hhhhhhhh', '4:hhLLhhhhhhhh', '3:hLLhhhhhhhhhhH', '3:hhLhhhhhhhhhhH', '3:HhhhhH 11:HhhhhH', '3:Hh 6:hhH 11:Hhh 15:hH', '3:Hh 8:H 11:H 15:hH', '3:Hh 15:hH', '3:H 16:H'),
    side: T(1, ...SIDE_CAP, '2:hhhhhhhh 12:hhhhH', '2:hhhhhhh 14:hhH', '2:Hhhhh 16:H', '2:Hhh', '5:H'),
    nape: 9, sheet: 9,
  },
  short: {
    front: T(1, '6:hhhhhhhh', '4:hhLLhhhhhhhh', '3:hLLhhhhhhhhhhH', '3:hhLhhhhhhhhhhH', '3:hhhhLhhhhhhhhH', '3:Hh 7:hhhHhhhhhH', '3:Hh 10:H 15:hH', '3:Hh 15:hH', '3:H 16:H'),
    side: T(1, ...SIDE_CAP, '2:hhhhhhhh 13:hhhH', '2:hhhhhhh 15:hH', '2:Hhhhh', '2:Hhh', '5:H'),
    nape: 9, sheet: 9,
  },
  part: {
    front: T(1, '5:hhhhhhhhh', '4:hhHLLLhhhhhh', '3:hhhHhLLhhhhhhH', '3:hhh 7:hhhhhhhhhH', '3:Hh 7:hhhhLhhhhH', '3:Hh 10:hhhhhhH', '3:Hh 14:hhH', '3:Hh 15:hH', '3:H 16:H'),
    side: T(1, ...SIDE_CAP, '2:hhhhhhhh 11:hhhhhH', '2:hhhhhhh 14:hhH', '2:Hhhhh 16:H', '2:Hhh', '5:H'),
    nape: 9, sheet: 9,
  },
  mash: {
    front: T(1, '6:hhhhhhhh', '4:hhLLhhhhhhhh', '3:hLLhhhhhhhhhhH', '3:hhLhhhhhhhhhhH', '3:hhhhhhhhhhhhhH', '3:hHhhHhhHhhHhhH', '3:Hh 15:hH', '3:Hh 15:hH', '3:HH 15:HH'),
    side: T(1, ...SIDE_CAP, '2:hhhhhhhhhhhhhhH', '2:hhhhhh', '2:hhhhh', '2:HHHH'),
    nape: 10, sheet: 10,
  },
  spiky: {
    front: T(-1, '6:h 9:h 12:h', '5:hh 8:hh 11:hhh', '6:hhhhhhhh', '4:hhLLhhhhhhhh', '3:hLLhhhhhhhhhhH', '3:hhLhhhhhhhhhhH', '3:HhhhhhhhhhhhhH', '3:Hh 6:hH 9:hh 12:Hh 15:hH', '3:H 7:H 12:H 16:H'),
    side: T(-1, '5:h 8:h 11:h', '4:hh 7:hh 10:hh', ...SIDE_CAP, '2:hhhhhhhh 13:h 15:hH', '2:hhhhhhh 16:H', '2:Hhhhh', '2:Hhh', '5:H'),
    nape: 9, sheet: 9,
  },
  curly: {
    front: T(0, '6:hhhhhhhh', '4:hhLhhhLhhhhh', '3:hLhhLhhhhLhhhH', '3:hhhLhhhhLhhhLH', '3:HhLhhhLhhhhLhH', '3:Hhh 7:hh 10:hhH 14:hhH', '3:Hh 8:H 11:H 15:hH', '3:Hh 15:hH', '3:H 16:H'),
    side: T(0, '6:hhhhh', '4:hhLhhhhhh', '3:hhLLhhLhhhh', '2:hLhhLhhhhLhhh', '1:hhLhhhLhhhhLhhH', '1:hhhhhhhhhhhhhhhH', '1:Hhhhhhhhh 13:hh 15:hhH', '1:HhhhhhhH 16:H', '1:HhhhhH', '2:HhH', '5:H'),
    nape: 9, sheet: 9,
  },
  messy: {
    front: T(0, '6:h 9:hh 13:h', '5:hhhhhhhhhh', '4:hhLLhhhhhhhh', '3:hLhhhhhhhhhhhH', '3:hhhhhhhhhhhhhH', '3:Hh 6:hhh 10:hh 13:hhhH', '3:H 7:h 10:H 14:h 16:H', '3:H 16:H'),
    side: T(0, '5:h 8:hh 12:h', '5:hhhhhhh', ...SIDE_CAP.slice(1), '2:hhhhhhhh 12:hh 15:hH', '1:Hhhhhhhh 16:H', '2:hHhh', '2:H 4:H'),
    nape: 9, sheet: 9,
  },
  slick: {
    front: T(1, '6:hhhhhhhh', '4:hhhLLLLhhhhh', '3:hhLLLhhhhhhhhH', '3:HhhhhhhhhhhhhH', '3:H 16:H', '3:H 16:H'),
    side: T(1, '6:hhhhhh', '4:hhhLLLLhhh', '3:hhLLLLhhhhhh', '2:hhhhhhhhhhhhH', '2:hhhhhhhhH', '2:hhhhhhh', '2:Hhhhh', '2:Hhh', '5:H'),
    nape: 9, sheet: 9,
  },
  buzz: {
    front: T(2, '5:hhhhhhhhhh', '4:hLhhhhhhhhhH', '4:hhhhhhhhhhhH', '4:H 15:H'),
    side: T(2, '5:hhhhhhh', '4:hLLhhhhhhh', '4:hhhhhhhhhhhH', '4:hhhhhhh 13:hhH', '4:Hhhh', '4:Hh'),
    nape: 8, sheet: 8,
  },
  wolf: {
    front: T(1, '6:hhhhhhhh', '4:hhLLhhhhhhhh', '3:hLLhhhhhhhhhhH', '3:hhLhhhhhhhhhhH', '3:HhhhhH 11:HhhhhH', '3:Hh 6:hH 12:Hh 15:hH', '3:Hh 15:hH', '3:Hh 15:hH', '3:Hh 15:hH', '3:H 16:H', '', '5:1 14:1', '5:2 14:2'),
    side: T(1, ...SIDE_CAP, '2:hhhhhhhh 12:hhhhH', '2:hhhhhhh 14:hhH', '2:hhhhhh', '2:hhhhhh', '2:Hhhhh', '2:hhh', '3:HhH', '3:H 5:H'),
    nape: 11, sheet: 11,
  },
  // Idol trend cuts (D049). Side views keep the flat face line: hair stops at the forehead in front.
  leaf: {
    front: T(1, '6:hhhhhhhh', '4:hhLLhhhhhhhh', '3:hLLhhhhhhhhhhH', '3:hhLhhhhhhhhhhH', '3:hhhhhhhLhhhhhH', '3:Hhhhhhh 11:hhhhhH', '3:HhH 14:Hhh', '3:Hh 15:hH', '3:H 16:H'),
    side: T(1, ...SIDE_CAP, '2:hhhhhhhhhhhhH', '2:hhhhhhh', '2:hhhhhh', '2:hhhhh', '2:Hhhh', '4:HhhH', '6:HH'),
    nape: 11, sheet: 11,
  },
  shadow: {
    front: T(0, '6:hhhhhhhh', '4:hhLhhhhLhhhh', '3:hLhhLLhhhhLhhH', '3:hhLhhhhhLhhhhH', '3:HhhhLhhhhhLhhH', '3:Hhh 7:hhH 11:hhH 15:hH', '3:Hh 8:H 12:H 15:hH', '3:Hh 15:hH', '3:H 16:H'),
    side: T(0, '5:hhhhh', '3:hhLhhhhhh', '2:hLhhLLhhhhh', '1:hhLhhhhhLhhhH', '1:hhhhLhhhhhhhhH', '1:HhhhhhHhhhhhhhH', '1:Hhhhhhhh 11:hhH', '1:Hhhhhhh', '1:HhhhhH', '2:HhhH', '4:HH'),
    nape: 9, sheet: 9,
  },
  curtain: {
    front: T(1, '6:hhhhhhhh', '4:hhLLhHhhhhhh', '3:hLLhhhHhhhhhhH', '3:hhLhhhHhhhhhhH', '3:hhhhhh 11:hhhhhH', '3:hhhH 13:Hhhh', '3:hhH 14:Hhh', '3:hh 15:hh', '3:hh 15:hh', '3:hh 15:hh', '4:hH 14:Hh', '5:H 14:H'),
    side: T(1, ...SIDE_CAP, '2:hhhhhhhh 12:hhH', '2:hhhhhhh', '2:hhhhhhh', '2:hhhhhhh', '2:hhhhhh', '3:hhhhH', '4:HHH'),
    nape: 11, sheet: 12,
  },
  hush: {
    front: T(1, '6:hhhhhhhh', '4:hhLLhhhhhhhh', '3:hLLhhhhhhhhhhH', '2:hhLhhhhhhhhhhhhH', '2:hhhhhhhhhhhhhhhH', '2:hhh 6:H 9:HH 13:H 15:hhH', '2:hhh 15:hhH', '2:hhH 15:Hhh', '2:hh 16:hh', '2:hhH 15:Hhh', '1:hhH 16:Hhh', '1:H 18:H'),
    side: T(1, ...SIDE_CAP, '2:hhhhhhhh 11:h 13:hH', '2:hhhhhhh', '2:hhhhhhh', '2:hhhhhhh', '2:hhhhhh', '1:hhhhhhH', '1:HhhhH', '0:H 5:H'),
    nape: 11, sheet: 12,
  },
  jelly: {
    front: T(1, '6:hhhhhhhh', '4:hhLhhLhhhhhh', '3:hLhhLhhhLhhhhH', '2:hhLhhhLhhhhLhhhH', '2:hLhhLhhhhLhhhLhH', '2:hhLh 7:hh 10:hhH 14:hLhH', '1:hhLh 15:hLhh', '1:hLhh 15:hhLh', '0:hhLhH 15:HhLhh', '0:hLhhH 15:HhhLh', '1:HhLH 15:HLhH', '2:H 4:H 15:H 17:H'),
    side: T(1, '6:hhhhhh', '4:hhLhhLhhh', '3:hLhhLhhhLhhh', '2:hhLhhhLhhhhLH', '1:hLhhLhhhhLhhhH', '1:hhLhhhhhh 11:hLhH', '0:hhLhhhhh', '0:hLhhLhhh', '0:hhLhhLhh', '0:hLhhhLh', '1:HhLhhH', '2:H 4:H 6:H'),
    nape: 11, sheet: 12,
  },
  layered: {
    front: T(1, '5:hhhhhhhhh', '4:hhHLLLhhhhhh', '3:hhhHhLLhhhhhhH', '2:hhhh 7:hhhhhhhhhhH', '2:hhh 7:hhhhhhhhhhH', '2:hhh 11:hhhhhhH', '2:hhh 14:hhhH', '2:hhh 15:hhH', '2:hhH 15:Hhh', '1:hhhh 15:hhhh', '1:hhH 16:Hhh', '1:hhh 16:hhh', '1:hhh 16:hhh', '1:hLh 16:hLh', '1:hhh 16:hhh', '1:hhh 16:hhh', '1:hLh 16:hLh', '1:hhh 16:hhh', '1:HhH 16:HhH', '2:H 17:H'),
    side: T(1, ...SIDE_CAP, '2:hhhhhhhh 12:hhH', '2:hhhhhhh', '2:hhhhhhh', '2:hhhhhhh', '2:hhhhhhh', '1:hhhhhhh', '1:hhhhhh', '1:hhhhhh', '1:hhLhhh', '1:hhhhhh', '1:hhhhhh', '1:hhLhhh', '1:hhhhhh', '1:HhhhH', '2:HH'),
    nape: 11, sheet: 19,
  },
  bob: {
    front: T(1, ...BANGS, ...rep('2:hhh 15:hhH', 3), '2:Hhhh 14:hhhH', '3:HHH 14:HHH'),
    side: T(1, ...SIDE_F, ...rep('2:hhhhhh', 3), '2:HhhhhH', '3:HHHH'),
    nape: 11, sheet: 11,
  },
  long: {
    front: T(1, ...BANGS, '2:hhh 15:hhH', '2:hLh 15:hhH', ...rep('2:hhh 15:hhH', 9), '2:hLh 15:hhH', '2:HHH 15:HHH'),
    side: T(1, ...SIDE_F, ...rep('2:hhhhhh', 11), '2:HHHHHH'),
    nape: 11, sheet: 19,
  },
  wave: {
    front: T(1, '6:hhhhhhhh', '4:hhLLhHhhhhhh', '3:hLLhhhHhhhhhhH', '2:hhLhhhhHhhhhhhhH', '2:hhhhhhh 11:hhhhhhH', '2:hhhhh 13:hhhhH', '2:hhhh 14:hhhH', ...rep('2:hhh 15:hhH', 3), '1:hhhH 15:Hhhh', '1:hhh 16:hhh', '2:hhh 15:hhh', '1:hhhH 15:Hhhh', '1:Hhh 16:hhH', '2:HhH 15:HhH', '3:H 16:H'),
    side: T(1, ...SIDE_CAP, '2:hhhhhhhh 13:hhhH', '2:hhhhhhh 16:H', ...rep('2:hhhhhh', 3), '1:hhhhhhh', '1:hhhhhH', '2:hhhhH', '1:hhhhhH', '2:hhhH', '2:HhH', '5:H'),
    nape: 11, sheet: 18,
  },
  hime: {
    front: T(1, ...BANGS, ...rep('1:1 2:hhh 15:hhH 18:1', 4), '1:1 2:HHH 15:HHH 18:1', ...rep('1:11 17:12', 6), '1:22 17:22'),
    side: T(1, ...SIDE_F, ...rep('2:hhhhhhh', 4), ...rep('2:hhhhhh', 6), '2:HHHHHH'),
    nape: 11, sheet: 18,
  },
  pixie: {
    front: T(1, ...CAP, '3:hhhhhhhhhhhhhH', '3:hhhhhhh 14:hhH', '3:hhH 15:hH', '3:hH 15:Hh', '3:H 16:H'),
    side: T(1, ...SIDE_CAP, '2:hhhhhhhh 12:hhhhH', '2:hhhhhh 15:hH', '2:Hhhhh', '2:Hhh', '5:H'),
    nape: 10, sheet: 10,
  },
  ponytail: {
    front: T(1, ...CAP, '3:hhhhhhhhhhhhhH 17:12', '3:Hh 7:hhhhhhhhhH 17:12', '3:H 14:hhH 17:12', '3:h 16:h 17:12', '3:h 16:h 17:12', '17:12', '17:2'),
    side: T(1, '6:hhhhhh', '4:hhLLLhhhhh', '3:hhLLhhhhhhhh', '1:R 2:hhLhhhhhhhhhhH', '0:12 2:hhhhhhhhhhhhhhH', '0:12 2:hhhhhhhh 13:hhhH', '0:12 2:hhhhhhh 15:hH', '0:12 2:Hhhhh', '0:12 2:Hhh', '0:12 5:H', '0:12', '0:12', '0:2'),
    tail: T(2, '9:RR', '', '', '', '', '', '', '', '8:hLhh', '8:hhhh', '8:hhhH', '8:hhhH', '9:hH', '9:HH'),
    nape: 9, sheet: 9,
  },
  braid: {
    front: T(1, '6:hhhhhhhh', '4:hhLLhhhhhhhh', '3:hLLhhhhhhhhhhH', '2:hhLhhhhhhhhhhhhH', '2:hhhhhhhhhhhhhhhH', '2:hhhhhhh 14:hhhH', '2:hh 15:hhH', '3:H 15:hhH', '15:hhH', '15:hhh', '14:hhhH', '14:RRR', ...BRAID, ...BRAID, '14:hLh', '15:H'),
    side: T(1, ...SIDE_F, ...rep('2:hhhhhh', 4), '3:hhhh', '4:RR', '4:hLh', '4:hhH', '4:hLh', '4:hhH', '5:H'),
    nape: 11, sheet: 11,
  },
  twin: {
    front: T(1, ...BANGS, '2:hh 16:hh', '0:Rhh 17:hhR', '0:hhh 17:hhh', '0:hLhh 16:hhLh', '0:hhhh 16:hhhh', '0:hhhH 16:Hhhh', '1:hhH 16:Hhh', '1:hH 17:Hh', '1:H 18:H'),
    side: T(1, ...SIDE_F, '2:hhhhhR', '1:hhhh', '1:hLhh', '1:hhhh', '1:hhhH', '1:hhH', '2:hH', '2:H'),
    nape: 11, sheet: 11,
  },
  bun: {
    front: T(-3, '8:hhhh', '7:hLLhhh', '7:hLhhhH', '7:RRRRRR', '6:hhhhhhhh', '4:hhLLhHhhhhhh', '3:hLLhhhHhhhhhhH', '3:hhLhhhHhhhhhhH', '3:hhhhhh 11:hhhhhH', '3:hhh 14:hhH', '3:hH 15:Hh', '3:h 16:h', '3:h 16:h', '3:H 16:H'),
    side: T(-3, '4:hhhh', '3:hLLhhh', '3:hLhhhH', '4:RRR', ...SIDE_CAP, '2:hhhhhhhh 13:hhhH', '2:hhhhhhh 16:H', '2:Hhhhh', '2:Hhh', '5:H'),
    nape: 9, sheet: 9,
  },
  odango: {
    front: T(-2, '4:hhh 13:hhh', '3:hLhh 13:hLhh', '3:hhhH 13:hhhH', '4:RR 6:hhhhhhhh 14:RR', '4:hhLLhhhhhhhh', '3:hLLhhhhhhhhhhH', '2:hhLhhhhhhhhhhhhH', '2:hhhhLhhhhhhhhhhH', '2:hhhhhhhhhhhhhhhH', '2:hh 16:hH', '2:hH 16:Hh', '3:H 16:H'),
    side: T(-2, '4:hhh', '3:hLhh', '3:hhhH', '4:RR 6:hhhhhh', ...SIDE_CAP.slice(1), '2:hhhhhhhh 12:hhhhH', '2:hhhhhhh 15:hH', '2:Hhhhh', '2:Hhh', '5:H'),
    nape: 10, sheet: 10,
  },
  buds: {
    front: T(-4, '5:LL 13:LL', '5:Lh 13:hH', ...rep('6:H 13:H', 5)),
    side: T(-4, '7:LL 11:LL', '7:Lh 11:hH', ...rep('8:H 11:H', 5)),
    nape: 0, sheet: 0,
  },
  tuft: {
    front: T(0, '9:hL', '8:hhLh', '7:hhhhhh', '8:hhhh', '', '', '', '3:h 16:h', '3:H 16:H'),
    side: T(0, '8:hL', '7:hhLh', '6:hhhhhh', '7:hhhh', '', '', '', '3:h', '5:H'),
    nape: 0, sheet: 0,
  },
  ears: {
    front: T(-5, '6:s 13:S', ...rep('5:srs 12:srS', 4), '5:sss 12:ssS', '6:s 13:S', '6:s 13:S'),
    side: T(-5, '6:S 9:s', ...rep('5:SS 8:srs', 4), '6:S 8:sss', '8:ss', '8:ss'),
    nape: 0, sheet: 0,
  },
  crest: {
    front: T(-1, '9:L', '8:Lhh', '7:hLhhh', '6:hhhhhhH', '7:hhhhhH'),
    side: T(-1, '7:L', '6:Lhh', '5:hLhhh', '4:hhhhhhH', '5:hhhhhH'),
    nape: 0, sheet: 0,
  },
};

/** Parses one template row ('5:hhH 18:12') into [x, code] cells. */
export function cells(row: string): [number, string][] {
  const out: [number, string][] = [];
  for (const seg of row.split(' ')) {
    if (!seg) continue;
    const i = seg.indexOf(':'), x0 = Number(seg.slice(0, i));
    [...seg.slice(i + 1)].forEach((c, k) => { if (c !== '.') out.push([x0 + k, c]); });
  }
  return out;
}

const BEHIND: Record<string, string> = { '1': 'h', '2': 'H', '3': 'L' };
const HEAD_TOP = 3;
const TOP: [number, number][] = [[6, 13], [5, 14], [4, 15], [4, 15], [4, 15], [4, 15], [4, 15]];
const CHIN: Record<string, [number, number][]> = {
  round: [[4, 15], [6, 13]], oval: [[5, 14], [7, 12]], vline: [[5, 14], [8, 11]], mochi: [[4, 15], [4, 15]],
};
// Profile facing right, as in classic dot RPGs: the face is a narrow strip whose front edge is a straight
// vertical line at x=13 (no forehead bulge, nose or cheek sticking out); the rest of the head is hair.
const SIDE_TOP: [number, number][] = [[7, 11], [6, 12], [5, 13], [5, 13], [5, 13], [5, 13], [5, 13]];
const SIDE_CHIN: Record<string, [number, number][]> = {
  round: [[5, 13], [7, 12]], oval: [[6, 13], [8, 12]], vline: [[6, 13], [9, 12]], mochi: [[5, 13], [6, 12]],
};
/** Head skin rows r3..r11 as [from, to] columns. */
export function headRows(shape: string, side = false, alien = false): [number, number][] {
  if (!side) return [...TOP, ...(CHIN[shape] ?? CHIN.oval!)];
  void alien;
  return [...SIDE_TOP, ...(SIDE_CHIN[shape] ?? SIDE_CHIN.oval!)];
}

/** Back view: the hair mass seen from behind (mirrored), closed over the head with a tapered nape. */
function backOf(art: HairArt): Map<number, Map<number, string>> {
  const m = new Map<number, Map<number, string>>();
  const put = (r: number, x: number, c: string) => { if (!m.has(r)) m.set(r, new Map()); m.get(r)!.set(x, c); };
  art.front.rows.forEach((row, i) => {
    for (const [x, c] of cells(row)) { if (BEHIND[c] && art.tail) continue; const k = BEHIND[c] ?? c; put(art.front.r + i, 19 - x, k === 'L' ? 'h' : k); }
  });
  const head = headRows('oval');
  for (let r = HEAD_TOP; r <= art.nape && r <= 11; r++) { const [a, b] = head[r - HEAD_TOP]!; for (let x = a; x <= b; x++) if (!m.get(r)?.has(x)) put(r, x, 'h'); }
  const last = Math.max(art.sheet, art.nape);
  for (const [r, row] of m) {
    const xs = [...row.keys()]; if (!xs.length) continue;
    const lo = Math.min(...xs), hi = Math.max(...xs);
    if (r <= art.sheet) for (let x = lo; x <= hi; x++) if (!row.has(x)) row.set(x, 'h');
    if (row.get(hi) === 'h') row.set(hi, 'H');
    if (r >= art.nape - 3 && r <= last) for (const x of [lo + 3, 9, hi - 3]) if (row.get(x) === 'h' && (x + r) % 2 === 0) row.set(x, 'H');
    if (r === last) { row.delete(lo); row.delete(hi); for (let x = lo + 1; x < hi; x++) if (row.has(x)) row.set(x, x === lo + 1 || x === hi - 1 || x % 3 === 0 ? 'H' : 'h'); }
  }
  if (art.sheet <= art.nape && art.nape > 0) {
    // Short hair: rounded nape that points down into the neck instead of a flat edge.
    for (let x = 7; x <= 12; x++) put(last + 1, x, x === 7 || x === 12 ? 'H' : 'h');
    put(last + 2, 9, 'H'); put(last + 2, 10, 'H');
  }
  // Crown highlight on the upper left, like the front view.
  for (const [r, x] of [[2, 5], [2, 6], [3, 4], [3, 5], [4, 4]] as [number, number][]) if (m.get(r)?.get(x) === 'h') m.get(r)!.set(x, 'L');
  if (art.tail) art.tail.rows.forEach((row, i) => { for (const [x, c] of cells(row)) put(art.tail!.r + i, x, c); });
  return m;
}

export function paintGrid(look: Look, dir: Dir, frame: number): Grid {
  const g: Grid = new Array<string | null>(CW * CH).fill(null);
  const set = (x: number, y: number, c: string) => { if (x >= 0 && y >= 0 && x < CW && y < CH) g[y * CW + x] = c; };
  const row = (y: number, x0: number, x1: number, c: string) => { for (let x = x0; x <= x1; x++) set(x, y, c); };
  const view: View = dir === 'down' ? 'front' : dir === 'up' ? 'back' : 'side';
  const side = view === 'side', alien = look.build === 'a';
  // frame: 0 stand, 1/2 steps (stretch up), 3 idle squash.
  const u = frame === 1 || frame === 2 ? -1 : frame === 3 ? 1 : 0;
  const A = (r: number) => OY + u + r;
  const skirt = look.build === 'f' && look.outfit === 'knit';
  const art = HAIR[look.hair];
  const tpl = art ? (view === 'front' ? art.front : view === 'side' ? art.side : null) : null;

  // 1. Hair behind the body.
  if (tpl) tpl.rows.forEach((r, i) => { for (const [x, c] of cells(r)) if (BEHIND[c]) set(x, A(tpl.r + i), BEHIND[c]!); });

  // 2. Legs and feet (feet fixed; legs stretch or squash with the body).
  const legTop = A(20), feet = OY + 25;
  const legC = skirt ? 's' : 'p', legS = skirt ? 'S' : 'P';
  if (!side) {
    for (const [leg, x0] of [[0, 6], [1, 11]] as const) {
      const lift = (frame === 1 && leg === 0) || (frame === 2 && leg === 1) ? 1 : 0;
      for (let y = legTop; y <= feet - 1 - lift; y++) { row(y, x0, x0 + 2, legC); if (leg) set(x0 + 2, y, legS); }
      const fx = leg ? 11 : 5;
      row(feet - lift, fx, fx + 3, 'b');
      if (view === 'front') set(fx + (leg ? 1 : 2), feet - lift, 'c');
    }
  } else {
    const leg = (fwd: boolean, c: string, shoe: string, lift: number) => {
      const x = frame === 0 || frame === 3 ? 8 : fwd ? 9 : 7;
      for (let y = legTop; y <= feet - 1 - lift; y++) row(y, x, x + 2, c);
      row(feet - lift, x, x + 3, shoe); if (shoe === 'b') set(x + 3, feet - lift, 'c');
    };
    if (frame === 1) { leg(false, legS, 'B', 1); leg(true, legC, 'b', 0); }
    else if (frame === 2) { leg(true, legS, 'B', 0); leg(false, legC, 'b', 1); }
    else leg(true, legC, 'b', 0);
  }

  // Far arm is drawn behind the torso and swings opposite the near arm in profile.
  if (side && (frame === 1 || frame === 2)) {
    const sign = frame === 1 ? 1 : -1;
    for (const [dx, r] of [[0, 14], [1, 15], [2, 16], [3, 17]] as const) {
      set(10 + sign * dx, A(r), 'J'); set(10 + sign * dx + sign, A(r), 'J');
    }
    set(10 + sign * 4, A(18), 'S');
  }

  // 3. Torso (7 rows).
  if (!side) {
    row(A(13), 7, 12, 'j');
    for (let r = 14; r <= 18; r++) { row(A(r), 6, 13, 'j'); set(13, A(r), 'J'); }
    row(A(19), 6, 13, 'J');
  } else {
    row(A(13), 8, 11, 'j');
    for (let r = 14; r <= 18; r++) { row(A(r), 7, 12, 'j'); set(12, A(r), 'J'); }
    row(A(19), 7, 12, 'J');
  }
  if (skirt) {
    if (!side) { row(A(19), 6, 13, 'p'); row(A(20), 5, 14, 'p'); row(A(21), 5, 14, 'P'); set(8, A(20), 'P'); set(11, A(20), 'P'); }
    else { row(A(19), 7, 12, 'p'); row(A(20), 6, 13, 'p'); row(A(21), 6, 13, 'P'); }
  }
  outfit(set, row, look.outfit, view, A);

  // 4. Arms.
  const drawArms = () => {
    if (!side) {
      // frame 1: left leg steps, so the right arm swings forward and the left arm back (and vice versa).
      const pose = (left: boolean): 'n' | 'f' | 'b' => frame === 1 ? (left ? 'b' : 'f') : frame === 2 ? (left ? 'f' : 'b') : 'n';
      const back = view === 'back';
      const arm = (x: number, inward: number, c: string, st: 'n' | 'f' | 'b') => {
        const seam = x + inward;
        for (let r = 15; r <= 17; r++) set(seam, A(r), 'd');
        const low = st !== 'n' && (back ? st === 'b' : st === 'f');
        if (low) {
          for (let r = 14; r <= 17; r++) set(x, A(r), c);
          set(seam, A(18), c); set(seam, A(19), c);
          set(seam, A(20), 's'); set(seam + inward, A(20), 's');
        } else if (st !== 'n') {
          set(x, A(14), c); set(x, A(15), c);
          set(x - inward, A(16), c); set(x - inward, A(17), c);
          set(x - inward, A(18), 'S'); set(x, A(18), 'S');
        } else {
          for (let r = 14; r <= 17; r++) set(x, A(r), c);
          set(x, A(18), 's');
        }
      };
      arm(5, 1, 'k', pose(true));
      arm(14, -1, 'J', pose(false));
    } else {
      const pts: [number, number][] = frame === 1 ? [[9, 14], [8, 15], [7, 16], [6, 17]] : frame === 2 ? [[9, 14], [10, 15], [11, 16], [12, 17]] : [[9, 14], [9, 15], [9, 16], [9, 17]];
      for (const [x, r] of pts) { set(x, A(r), 'k'); set(x + 1, A(r), 'j'); }
      const [hx, hr] = pts[pts.length - 1]!; set(hx, A(hr + 1), 's'); set(hx + 1, A(hr + 1), 's');
    }
  };
  if (view === 'back') drawArms();

  // 5. Neck and head.
  set(side ? 8 : 9, A(12), 'S'); set(side ? 9 : 10, A(12), 'S');
  const head = headRows(look.shape, side, alien);
  head.forEach(([a, b], i) => row(A(HEAD_TOP + i), a, b, 's'));
  if (!side) for (let i = 3; i <= 6; i++) set(head[i]![1], A(HEAD_TOP + i), 'S');
  else if (!alien) { set(7, A(8), 'S'); set(7, A(9), 'S'); }
  if (view !== 'back') face(set, look, A, side, head);

  // 6. Hair in front.
  if (view === 'back' && art) { for (const [r, m] of backOf(art)) for (const [x, c] of m) set(x, A(r), c); }
  else if (tpl) tpl.rows.forEach((r, i) => {
    const rr = tpl.r + i;
    for (const [x, c] of cells(r)) {
      if (BEHIND[c]) continue;
      // Keep the profile flat-fronted: at most 1px of hair in front of the face line, none over the eye or cheek.
      if (side && (x >= 15 || (!alien && rr >= 7 && x >= 11))) continue;
      if (side && look.build === 'm' && x < (rr <= 7 ? 3 : rr <= 9 ? 4 : rr <= 11 ? 5 : 6)) continue;
      set(x, A(rr), c);
    }
  });
  // Near arms pass in front of long hair rather than disappearing under it.
  if (view !== 'back') drawArms();

  // 7. Round glasses.
  if (look.glasses && view !== 'back') {
    const lens = (x0: number) => { row(A(6), x0 + 1, x0 + 2, 'o'); row(A(10), x0 + 1, x0 + 2, 'o'); for (let r = 7; r <= 9; r++) { set(x0, A(r), 'o'); set(x0 + 3, A(r), 'o'); } };
    if (view === 'front') { lens(5); lens(11); row(A(7), 9, 10, 'o'); } else { lens(10); row(A(7), 8, 9, 'o'); }
  }
  return g;
}

type SetFn = (x: number, y: number, c: string) => void;
type RowFn = (y: number, x0: number, x1: number, c: string) => void;

function face(set: SetFn, look: Look, A: (r: number) => number, side: boolean, head: [number, number][]) {
  const P = (x: number, r: number, c: string) => set(x, A(r), c);
  const eyes: [number, number, boolean][] = side ? [[11, 12, false]] : [[6, 7, true], [12, 13, false]];
  for (const [a, b, left] of eyes) {
    const outer = left ? a - 1 : b + 1, beyondIn = left ? b + 1 : a - 1, inner = left ? b : a;
    let f: string = look.face;
    if (f === 'wink') f = !left && !side ? 'closed' : 'bright';
    switch (f) {
      case 'smile': case 'closed': P(a, 8, 'e'); P(b, 8, 'e'); P(outer, 9, 'e'); if (!side) P(beyondIn, 9, 'e'); break;
      case 'doe': P(a, 7, 'e'); P(b, 7, 'e'); P(a, 8, 'E'); P(b, 8, 'e'); P(a, 9, 'i'); P(b, 9, 'E'); P(outer, 7, 'o'); P(outer, 6, 'o'); break;
      case 'cat': P(a, 7, 'e'); P(b, 7, 'e'); P(outer, 6, 'o'); P(a, 8, 'E'); P(b, 8, 'e'); P(inner, 9, 'i'); break;
      case 'calm': P(outer, 8, 'o'); P(a, 8, 'o'); P(b, 8, 'o'); P(a, 9, 'e'); P(b, 9, 'i'); break;
      case 'cool': P(outer, 7, 'o'); P(a, 7, 'o'); P(b, 7, 'o'); P(a, 8, 'E'); P(b, 8, 'e'); break;
      case 'dot': P(a, 8, 'E'); P(b, 8, 'e'); P(a, 9, 'e'); P(b, 9, 'e'); break;
      case 'star': P(a, 7, 'e'); P(b, 7, 'e'); P(a, 8, 'E'); P(b, 8, 'e'); P(a, 9, 'i'); P(b, 9, 'E'); break;
      default: P(a, 7, 'e'); P(b, 7, 'e'); P(a, 8, 'E'); P(b, 8, 'e'); P(a, 9, 'i'); P(b, 9, 'i');
    }
    if (look.build === 'f' && (f === 'bright' || f === 'star')) P(outer, 7, 'o');
  }
  if (!side) {
    P(5, 10, 'r'); P(14, 10, 'r');
    if (look.face === 'cool' || look.face === 'calm') P(10, 10, 'm'); else { P(9, 10, 'm'); P(10, 10, 'm'); }
  } else {
    P(11, 10, 'r');
    void head;
  }
}

function outfit(set: SetFn, row: RowFn, o: string, view: View, A: (r: number) => number) {
  const s = (x: number, r: number, c: string) => set(x, A(r), c);
  if (view === 'front') {
    switch (o) {
      case 'reporter': for (let r = 13; r <= 16; r++) { s(9, r, 'w'); s(10, r, 'w'); } s(10, 16, 'W'); s(8, 13, 'k'); s(11, 13, 'k'); s(8, 14, 'k'); s(11, 14, 'k'); s(7, 15, 'g'); s(7, 16, 'w'); s(7, 17, 'W'); break;
      case 'suit': s(9, 13, 'w'); s(10, 13, 'w'); s(8, 13, 'k'); s(11, 13, 'k'); for (let r = 14; r <= 17; r++) { s(9, r, 'g'); s(10, r, 'g'); } break;
      case 'knit': row(A(13), 7, 12, 'k'); row(A(16), 6, 12, 'k'); break;
      case 'hoodie': row(A(13), 7, 12, 'J'); s(8, 14, 'g'); s(8, 15, 'g'); s(11, 14, 'g'); s(11, 15, 'g'); row(A(17), 7, 12, 'J'); break;
      case 'coat': s(9, 13, 'w'); s(10, 13, 'w'); s(9, 14, 'w'); s(10, 14, 'w'); for (let r = 13; r <= 15; r++) { s(8, r, 'k'); s(11, r, 'k'); } row(A(17), 6, 13, 'J'); s(9, 17, 'g'); s(10, 17, 'g'); row(A(20), 6, 13, 'j'); row(A(21), 6, 13, 'J'); break;
      case 'apron': s(7, 13, 'g'); s(12, 13, 'g'); s(9, 13, 'w'); s(10, 13, 'w'); for (let r = 15; r <= 19; r++) row(A(r), 7, 12, 'g'); break;
      case 'uniform': s(9, 13, 'w'); s(10, 13, 'w'); for (let r = 14; r <= 16; r++) { s(9, r, 'g'); s(10, r, 'g'); } s(12, 15, 'k'); s(7, 16, 'J'); s(12, 16, 'J'); break;
      default: row(A(13), 8, 11, 'k');
    }
  } else if (view === 'back') {
    switch (o) {
      case 'hoodie': row(A(13), 7, 12, 'k'); row(A(14), 7, 12, 'k'); row(A(15), 8, 11, 'J'); break;
      case 'coat': row(A(17), 6, 13, 'J'); row(A(20), 6, 13, 'j'); row(A(21), 6, 13, 'J'); break;
      case 'apron': s(9, 17, 'g'); s(10, 17, 'g'); s(8, 16, 'g'); s(11, 16, 'g'); break;
      case 'reporter': case 'suit': for (let r = 17; r <= 19; r++) s(9, r, 'J'); break;
      default: break;
    }
  } else {
    switch (o) {
      case 'reporter': for (let r = 13; r <= 16; r++) s(12, r, 'w'); s(11, 13, 'k'); break;
      case 'suit': s(12, 13, 'w'); for (let r = 14; r <= 16; r++) s(12, r, 'g'); s(11, 13, 'k'); break;
      case 'knit': row(A(13), 8, 11, 'k'); row(A(16), 7, 12, 'k'); break;
      case 'hoodie': s(7, 13, 'J'); s(7, 14, 'J'); s(8, 13, 'J'); s(12, 14, 'g'); break;
      case 'coat': for (let r = 13; r <= 15; r++) s(12, r, 'k'); row(A(17), 7, 12, 'J'); row(A(20), 7, 12, 'j'); row(A(21), 7, 12, 'J'); break;
      case 'apron': for (let r = 15; r <= 19; r++) { s(11, r, 'g'); s(12, r, 'g'); } break;
      case 'uniform': for (let r = 13; r <= 15; r++) s(12, r, 'g'); s(11, 15, 'k'); break;
      default: s(11, 13, 'k'); s(12, 13, 'k');
    }
  }
}

/** Text preview used by tests and tooling. */
export function asText(grid: Grid): string {
  const lines: string[] = [];
  for (let y = 0; y < CH; y++) { let l = ''; for (let x = 0; x < CW; x++) l += grid[y * CW + x] ?? '.'; lines.push(l); }
  return lines.join(String.fromCharCode(10));
}

import type { Look } from '../domain/appearance';
import type { Dir } from '../world/types';

/*
 * Reporter sprites v3 (D045): tiny round chibi, about 2 heads tall.
 * Principles taken from mobile dot RPGs and mascot defence games (not their characters):
 *  - the head (with hair) is ~60% of the figure and wider than the body;
 *  - eyes sit low and wide on a big round face, simple 2x3 with one white highlight; no brows or nose;
 *  - body is a small bean with nub arms and two-row stubby legs;
 *  - hair is one soft mass that widens the head; outlines are tinted per colour, not flat black;
 *  - motion is a bounce (stretch on steps, squash while idle), not limb detail.
 * Canvas 20x31, feet on row 29, anchor (10, 30). Rows below are relative to the head origin.
 */
export const CW = 20, CH = 31, AX = 10, AY = 30;
export const OY = 6;
export type Grid = (string | null)[];
type View = 'front' | 'back' | 'side';
type Tpl = { r: number; rows: string[] };
type HairArt = { front: Tpl; side: Tpl; back?: Tpl; nape: number; sheet: number; tail?: Tpl };

const T = (r: number, ...rows: string[]): Tpl => ({ r, rows });
const rep = (s: string, n: number) => Array<string>(n).fill(s);
const CAP = ['6:hhhhhhhh', '4:hhLLhhhhhhhh', '3:hLLhhhhhhhhhhH', '2:hhLhhhhhhhhhhhhH', '2:hhhhhhhhhhhhhhhH'];
const CAP_W = ['6:hhhhhhhh', '4:hhLLhhhhhhhh', '2:hhLLhhhhhhhhhhhH', '1:hhLhhhhhhhhhhhhhhH', '1:hhhhhhhhhhhhhhhhhH'];
const BANGS = [...CAP_W, '1:hhhhLhhhhhhhhhhhhH', '1:hhhhhhhhhhhhhhhhhH'];
const SIDE_CAP = ['5:hhhhhhh', '3:hhLLLhhhhhh', '2:hhLLhhhhhhhhh', '1:hhLhhhhhhhhhhhH', '1:hhhhhhhhhhhhhhhH', '1:hhhhhhhhhhhhhhhH'];
const SIDE_F = [...SIDE_CAP, '1:hhhhhhhhh 12:hhhhH', '1:hhhhhhhh 15:hH'];

export const HAIR: Partial<Record<string, HairArt>> = {
  comma: {
    front: T(1, ...CAP, '2:Hhhhhhhh 11:hhhhhhH', '2:Hhhh 14:hhhH', '2:HH 16:HH', '2:H 17:H'),
    side: T(1, ...SIDE_CAP, '1:hhhhhhhhh 12:hhhhH', '1:hhhhhhhh 14:hhH', '1:Hhhhhhh 16:H', '1:Hhhhh', '2:Hhh', '2:HH', '3:H'),
    nape: 12, sheet: 12,
  },
  short: {
    front: T(1, ...CAP, '2:hhhhhhhhhhhhhhhH', '2:Hh 8:hhhhhhhhhH', '2:H 12:hhhhhH', '2:H 15:HHH'),
    side: T(1, ...SIDE_CAP, '1:hhhhhhhhh 13:hhhH', '1:hhhhhhhh 15:hH', '1:Hhhhhhh', '1:Hhhhh', '2:Hhh', '2:HH', '3:H'),
    nape: 12, sheet: 12,
  },
  spiky: {
    front: T(-1, '6:h 10:h 13:h', '5:hh 9:hh 12:hhh', ...CAP, '2:Hhh 6:h 8:hh 11:h 13:hh 16:hH', '2:H 8:h 13:h 17:H'),
    side: T(-1, '4:h 8:h 12:h', '3:hh 7:hh 11:hh', ...SIDE_CAP, '1:hhhhhhhhh 13:h 15:hH', '1:hhhhhhhh 16:H', '1:Hhhhhhh', '1:Hhhhh', '2:HH'),
    nape: 12, sheet: 12,
  },
  curly: {
    front: T(0, '6:hhhhhhhh', '4:hhLhhhhLhhhh', '2:hhLLhhLhhhhLhhhh', '1:hLhhLhhhhLhhhLhhhH', '1:hhhhhhhhhhhhhhhhhH', '1:HhhLhhhhLhhhhLhhhH', '1:Hhh 5:hh 8:h 11:h 13:hh 16:hhH', '1:Hh 17:hH', '1:H 18:H'),
    side: T(0, '5:hhhhh', '3:hhLhhhhhh', '2:hhLLhhLhhhhh', '1:hLhhLhhhhLhhhh', '0:hhLhhhLhhhhLhhhH', '0:hhhhhhhhhhhhhhhhH', '0:HhhLhhhhLhhhhLhH', '0:Hhhhhhhhhh 13:hh 15:hhH', '0:Hhhhhhhhh 16:hH', '0:HhhhhhhH', '1:HhhhH', '2:HH'),
    nape: 12, sheet: 12,
  },
  buzz: {
    front: T(2, '5:hhhhhhhhhh', '3:hLhhhhhhhhhhhH', '3:hhhhhhhhhhhhhH', '3:hhhhhhhhhhhhhH', '3:HhhhhhhhhhhhhH', '3:H 16:H'),
    side: T(2, '4:hhhhhhhh', '3:hLLhhhhhhhhh', '3:hhhhhhhhhhhhH', '3:hhhhhhhhhhhhhH', '3:hhhhhhhh 14:hhH', '3:Hhhhhh', '3:Hhhh', '3:HH'),
    nape: 11, sheet: 11,
  },
  wolf: {
    front: T(1, ...CAP, '2:Hhhhhhhh 11:hhhhhhH', '2:Hhh 6:hh 13:hh 15:hhH', '2:Hh 16:hH', '2:Hh 16:hH', '2:Hh 16:hH', '2:H 17:H', '', '', '', '', '4:1 15:1', '4:2 15:2'),
    side: T(1, ...SIDE_CAP, '1:hhhhhhhhh 12:hhhhH', '1:hhhhhhhh 14:hhH', '1:hhhhhhh', '1:hhhhhh', '1:hhhhh', '1:Hhhh', '1:hhh', '2:HhH', '2:H 4:H'),
    nape: 13, sheet: 13,
  },
  bob: {
    front: T(1, ...BANGS, ...rep('1:hhh 16:hhH', 5), '1:Hhhh 15:hhhH', '2:HHH 15:HHH'),
    side: T(1, ...SIDE_F, ...rep('1:hhhhhhh', 4), '1:HhhhhhH', '2:HHHHH'),
    nape: 15, sheet: 14,
  },
  long: {
    front: T(1, ...BANGS, '1:hhh 16:hhH', '1:hLh 16:hhH', ...rep('1:hhh 16:hhH', 10), '1:hLh 16:hhH', '1:hhh 16:hhH', '1:HHH 16:HHH'),
    side: T(1, ...SIDE_F, ...rep('1:hhhhhhh', 11), '1:HHHHHHH'),
    nape: 15, sheet: 20,
  },
  wave: {
    front: T(1, '6:hhhhhhhh', '4:hhLLhHhhhhhh', '2:hhLLhhhHhhhhhhhH', '1:hhLhhhhhHhhhhhhhhH', '1:hhhhhhhhHhhhhhhhhH', '1:hhhhhhhh 11:hhhhhhhH', '1:hhhhhh 13:hhhhhH', '1:hhhh 15:hhhH', ...rep('1:hhh 16:hhH', 4), '0:hhhH 16:Hhhh', '0:hhh 17:hhh', '1:hhh 16:hhh', '0:hhhH 16:Hhhh', '0:Hhh 17:hhH', '1:HhH 16:HhH', '2:H 17:H'),
    side: T(1, ...SIDE_CAP, '1:hhhhhhhhh 13:hhhH', '1:hhhhhhhh 16:H', ...rep('1:hhhhhhh', 4), '0:hhhhhhh', '0:hhhhhH', '1:hhhhhH', '0:hhhhhH', '1:hhhhH', '1:HhhH', '2:H'),
    nape: 15, sheet: 19,
  },
  ponytail: {
    front: T(1, ...CAP, '2:hhhhhhhhhhhhhhhH 18:12', '2:Hh 7:hhhhhhhhhhH 18:12', '2:H 11:hhhhhhH 18:12', '2:H 15:hhH 18:12', '2:h 17:h 18:12', '2:h 17:h 18:12', '18:12', '18:2'),
    side: T(1, ...SIDE_CAP.slice(0, 3), '0:R 1:hhLhhhhhhhhhhhH', '0:12 2:hhhhhhhhhhhhhhH', '0:12 2:hhhhhhhhhhhhhhH', '0:12 2:hhhhhhhh 13:hhhH', '0:12 2:hhhhhhh 15:hH', '0:12 2:Hhhhhh', '0:12 2:Hhhh', '0:12 2:HH', '0:12', '0:12', '0:2'),
    tail: T(4, '9:RR', '', '', '', '', '', '', '', '', '8:hLhh', '8:hhhh', '8:hhhH', '8:hhhH', '9:hH', '9:HH'),
    nape: 12, sheet: 12,
  },
  twin: {
    front: T(1, ...BANGS, '2:hh 16:hh', '0:Rhh 17:hhR', '0:hhh 17:hhh', '0:hLhh 16:hhLh', '0:hhhh 16:hhhh', '0:hhhH 16:Hhhh', '1:hhH 16:Hhh', '1:hH 17:Hh', '1:H 18:H'),
    side: T(1, ...SIDE_F, '1:hhhhhhR', '0:hhhh', '0:hLhh', '0:hhhh', '0:hhhH', '0:hhH', '1:hH', '1:H'),
    nape: 15, sheet: 15,
  },
  bun: {
    front: T(-3, '8:hhhh', '7:hLLhhh', '7:hLhhhH', '7:RRRRRR', '6:hhhhhhhh', '4:hhLLhHhhhhhh', '3:hLLhhhHhhhhhhH', '2:hhLhhhhHhhhhhhhH', '2:hhhhhhhHhhhhhhhH', '2:hhhhhhh 11:hhhhhhH', '2:hhhh 14:hhhH', '2:hH 16:Hh', '2:h 17:h', '2:h 17:h', '2:h 17:h', '2:H 17:H'),
    side: T(-3, '3:hhhh', '2:hLLhhh', '2:hLhhhH', '3:RRR', ...SIDE_CAP, '1:hhhhhhhhh 13:hhhH', '1:hhhhhhhh 16:H', '1:Hhhhhhh', '1:Hhhhh', '2:HH'),
    nape: 12, sheet: 12,
  },
  buds: {
    front: T(-3, '5:LL 13:LL', '5:Lh 13:hH', '6:H 13:H', '6:H 13:H', '6:H 13:H', '6:H 13:H', '6:H 13:H'),
    side: T(-3, '6:LL 10:LL', '6:Lh 10:hH', '7:H 10:H', '7:H 10:H', '7:H 10:H', '7:H 10:H', '7:H 10:H'),
    nape: 0, sheet: 0,
  },
  tuft: {
    front: T(1, '9:hL', '8:hhLh', '7:hhhhhh', '8:hhhh', '', '', '', '', '2:h 17:h', '2:H 17:H'),
    side: T(1, '8:hL', '7:hhLh', '6:hhhhhh', '7:hhhh', '', '', '', '', '2:h', '2:H'),
    nape: 0, sheet: 0,
  },
  ears: {
    front: T(-4, '6:s 13:S', '5:srs 12:srS', '5:srs 12:srS', '5:srs 12:srS', '5:srs 12:srS', '5:sss 12:ssS', '6:s 13:S', '6:s 13:S'),
    side: T(-4, '5:S 8:s', '4:SS 7:srs', '4:SS 7:srs', '4:SS 7:srs', '4:SS 7:srs', '5:S 7:sss', '7:ss', '7:ss'),
    nape: 0, sheet: 0,
  },
  crest: {
    front: T(0, '9:L', '8:Lhh', '7:hLhhh', '6:hhhhhhH', '7:hhhhhH'),
    side: T(0, '7:L', '6:Lhh', '5:hLhhh', '4:hhhhhhH', '5:hhhhhH'),
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
const TOP: [number, number][] = [[6, 13], [4, 15], [3, 16], [3, 16], [3, 16], [3, 16], [3, 16], [3, 16], [3, 16]];
const CHIN: Record<string, [number, number][]> = {
  round: [[3, 16], [4, 15], [6, 13]],
  oval: [[4, 15], [5, 14], [7, 12]],
  vline: [[4, 15], [6, 13], [8, 11]],
  square: [[3, 16], [3, 16], [5, 14]],
  mochi: [[3, 16], [3, 16], [4, 15]],
};
/** Head skin rows r4..r15 as [from, to] columns. */
export function headRows(shape: string): [number, number][] { return [...TOP, ...(CHIN[shape] ?? CHIN.oval!)]; }

/** Back view: the front hair mass, closed over the head down to the nape (and over the back for long hair). */
function backOf(art: HairArt): Map<number, Map<number, string>> {
  const m = new Map<number, Map<number, string>>();
  const put = (r: number, x: number, c: string) => { if (!m.has(r)) m.set(r, new Map()); m.get(r)!.set(x, c); };
  art.front.rows.forEach((row, i) => { for (const [x, c] of cells(row)) put(art.front.r + i, x, BEHIND[c] ?? c); });
  const head = headRows('oval');
  for (let r = 4; r <= art.nape && r <= 15; r++) { const [a, b] = head[r - 4]!; for (let x = a; x <= b; x++) if (!m.get(r)?.has(x)) put(r, x, 'h'); }
  for (const [r, row] of m) {
    const xs = [...row.keys()]; if (!xs.length) continue;
    const lo = Math.min(...xs), hi = Math.max(...xs);
    if (r <= art.sheet) for (let x = lo; x <= hi; x++) if (!row.has(x)) row.set(x, 'h');
    for (const [x, c] of row) if (c === 'h' && (x === hi || r === Math.max(art.sheet, art.nape))) row.set(x, 'H');
  }
  if (art.tail) art.tail.rows.forEach((row, i) => { for (const [x, c] of cells(row)) put(art.tail!.r + i, x, c); });
  return m;
}

export function paintGrid(look: Look, dir: Dir, frame: number): Grid {
  const g: Grid = new Array<string | null>(CW * CH).fill(null);
  const set = (x: number, y: number, c: string) => { if (x >= 0 && y >= 0 && x < CW && y < CH) g[y * CW + x] = c; };
  const row = (y: number, x0: number, x1: number, c: string) => { for (let x = x0; x <= x1; x++) set(x, y, c); };
  const view: View = dir === 'down' ? 'front' : dir === 'up' ? 'back' : 'side';
  const side = view === 'side';
  // frame: 0 stand, 1/2 steps (stretch up), 3 idle squash.
  const u = frame === 1 || frame === 2 ? -1 : frame === 3 ? 1 : 0;
  const O = OY + u, A = (r: number) => O + r;
  const skirt = look.build === 'f' && look.outfit === 'knit';
  const art = HAIR[look.hair];
  const tpl = art ? (view === 'front' ? art.front : view === 'side' ? art.side : null) : null;

  // 1. Hair behind the body.
  if (tpl) tpl.rows.forEach((r, i) => { for (const [x, c] of cells(r)) if (BEHIND[c]) set(x, A(tpl.r + i), BEHIND[c]!); });

  // 2. Legs and feet (feet fixed on row 28; legs stretch or squash with the body).
  const legTop = A(21), feet = OY + 23;
  const legC = skirt ? 's' : 'p', legS = skirt ? 'S' : 'P';
  if (!side) {
    for (const [leg, x0] of [[0, 7], [1, 11]] as const) {
      const lift = (frame === 1 && leg === 0) || (frame === 2 && leg === 1) ? 1 : 0;
      for (let y = legTop; y <= feet - 1 - lift; y++) { set(x0, y, legC); set(x0 + 1, y, leg ? legS : legC); }
      const fx = leg ? 11 : 6;
      row(feet - lift, fx, fx + 2, 'b');
      if (view === 'front') set(fx + (leg ? 1 : 1), feet - lift, 'c');
    }
  } else {
    const leg = (fwd: boolean, c: string, shoe: string, lift: number) => {
      const x = frame === 0 || frame === 3 ? 9 : fwd ? 10 : 8;
      for (let y = legTop; y <= feet - 1 - lift; y++) { set(x, y, c); set(x + 1, y, c); }
      row(feet - lift, x, x + 2, shoe); if (shoe === 'b') set(x + 2, feet - lift, 'c');
    };
    if (frame === 1) { leg(false, legS, 'B', 1); leg(true, legC, 'b', 0); }
    else if (frame === 2) { leg(true, legS, 'B', 0); leg(false, legC, 'b', 1); }
    else leg(true, legC, 'b', 0);
  }

  // 3. Torso: a small bean.
  if (!side) {
    row(A(16), 7, 12, 'j');
    for (let r = 17; r <= 19; r++) { row(A(r), 6, 13, 'j'); set(13, A(r), 'J'); }
    row(A(20), 6, 13, 'J');
  } else {
    row(A(16), 8, 11, 'j');
    for (let r = 17; r <= 19; r++) { row(A(r), 7, 12, 'j'); set(12, A(r), 'J'); }
    row(A(20), 7, 12, 'J');
  }
  if (skirt) {
    if (!side) { row(A(20), 6, 13, 'p'); row(A(21), 5, 14, 'p'); set(8, A(21), 'P'); set(11, A(21), 'P'); }
    else { row(A(20), 7, 12, 'p'); row(A(21), 6, 13, 'p'); }
  }
  outfit(set, row, look.outfit, view, A);

  // 4. Nub arms.
  if (!side) {
    const sw = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    const arm = (x: number, o: number, c: string) => { for (let r = 17; r <= 18 + o; r++) set(x, A(r), c); set(x, A(19 + o), 's'); };
    arm(5, view === 'front' ? sw : -sw, 'k');
    arm(14, view === 'front' ? -sw : sw, 'J');
  } else {
    const pts: [number, number][] = frame === 1 ? [[9, 17], [8, 18]] : frame === 2 ? [[10, 17], [11, 18]] : [[9, 17], [9, 18]];
    for (const [x, r] of pts) { set(x, A(r), 'k'); set(x + 1, A(r), 'j'); }
    const [hx, hr] = pts[1]!; set(hx, A(hr + 1), 's'); set(hx + 1, A(hr + 1), 's');
  }

  // 5. Head: a big round face.
  const head = headRows(look.shape);
  head.forEach(([a, b], i) => row(A(4 + i), a, b, 's'));
  if (!side) for (let i = 3; i <= 9; i++) set(head[i]![1], A(4 + i), 'S');
  if (view !== 'back') face(set, look, A, side, head);

  // 6. Hair in front.
  if (view === 'back' && art) { for (const [r, m] of backOf(art)) for (const [x, c] of m) set(x, A(r), c); }
  else if (tpl) tpl.rows.forEach((r, i) => { for (const [x, c] of cells(r)) if (!BEHIND[c]) set(x, A(tpl.r + i), c); });

  // 7. Round glasses.
  if (look.glasses && view !== 'back') {
    const lens = (x0: number) => { row(A(9), x0 + 1, x0 + 2, 'o'); row(A(13), x0 + 1, x0 + 2, 'o'); for (let r = 10; r <= 12; r++) { set(x0, A(r), 'o'); set(x0 + 3, A(r), 'o'); } };
    if (view === 'front') { lens(5); lens(11); row(A(10), 9, 10, 'o'); } else { lens(11); row(A(10), 8, 10, 'o'); }
  }
  return g;
}

type SetFn = (x: number, y: number, c: string) => void;
type RowFn = (y: number, x0: number, x1: number, c: string) => void;

function face(set: SetFn, look: Look, A: (r: number) => number, side: boolean, head: [number, number][]) {
  const P = (x: number, r: number, c: string) => set(x, A(r), c);
  const eyes: [number, number, boolean][] = side ? [[12, 13, false]] : [[6, 7, true], [12, 13, false]];
  for (const [a, b, left] of eyes) {
    const outer = left ? a - 1 : b + 1, beyondIn = left ? b + 1 : a - 1, inner = left ? b : a;
    let f: string = look.face;
    if (f === 'wink') f = !left && !side ? 'closed' : 'bright';
    switch (f) {
      case 'smile': case 'closed': P(a, 11, 'e'); P(b, 11, 'e'); P(outer, 12, 'e'); P(beyondIn, 12, 'e'); break;
      case 'doe': P(a, 10, 'e'); P(b, 10, 'e'); P(a, 11, 'E'); P(b, 11, 'e'); P(a, 12, 'i'); P(b, 12, 'E'); P(outer, 10, 'o'); P(outer, 9, 'o'); break;
      case 'cat': P(a, 10, 'e'); P(b, 10, 'e'); P(outer, 9, 'o'); P(a, 11, 'E'); P(b, 11, 'e'); P(inner, 12, 'i'); break;
      case 'calm': P(outer, 11, 'o'); P(a, 11, 'o'); P(b, 11, 'o'); P(a, 12, 'e'); P(b, 12, 'i'); break;
      case 'cool': P(outer, 10, 'o'); P(a, 10, 'o'); P(b, 10, 'o'); P(a, 11, 'E'); P(b, 11, 'e'); break;
      case 'dot': P(a, 11, 'E'); P(b, 11, 'e'); P(a, 12, 'e'); P(b, 12, 'e'); break;
      case 'star': P(a, 10, 'e'); P(b, 10, 'e'); P(a, 11, 'E'); P(b, 11, 'e'); P(a, 12, 'i'); P(b, 12, 'E'); break;
      default: P(a, 10, 'e'); P(b, 10, 'e'); P(a, 11, 'E'); P(b, 11, 'e'); P(a, 12, 'i'); P(b, 12, 'i');
    }
    if (look.build === 'f' && (f === 'bright' || f === 'star')) P(outer, 10, 'o');
  }
  if (!side) {
    P(4, 13, 'r'); P(5, 13, 'r'); P(14, 13, 'r'); P(15, 13, 'r');
    if (look.face === 'cool' || look.face === 'calm') P(10, 14, 'm'); else { P(9, 14, 'm'); P(10, 14, 'm'); }
  } else {
    P(14, 13, 'r'); P(15, 13, 'r');
    P(Math.min(15, head[10]![1] - 1), 14, 'm');
  }
}

function outfit(set: SetFn, row: RowFn, o: string, view: View, A: (r: number) => number) {
  const s = (x: number, r: number, c: string) => set(x, A(r), c);
  if (view === 'front') {
    switch (o) {
      case 'reporter': s(9, 16, 'w'); s(10, 16, 'w'); s(9, 17, 'w'); s(10, 17, 'w'); s(9, 18, 'w'); s(10, 18, 'W'); s(8, 16, 'k'); s(11, 16, 'k'); s(7, 18, 'w'); s(7, 19, 'g'); break;
      case 'suit': s(9, 16, 'w'); s(10, 16, 'w'); s(8, 16, 'k'); s(11, 16, 'k'); for (let r = 17; r <= 19; r++) { s(9, r, 'g'); s(10, r, 'g'); } break;
      case 'knit': row(A(16), 7, 12, 'k'); row(A(18), 6, 12, 'k'); break;
      case 'hoodie': row(A(16), 7, 12, 'J'); s(8, 17, 'g'); s(11, 17, 'g'); row(A(19), 7, 12, 'J'); break;
      case 'coat': s(9, 16, 'w'); s(10, 16, 'w'); s(8, 16, 'k'); s(11, 16, 'k'); s(8, 17, 'k'); s(11, 17, 'k'); row(A(19), 6, 13, 'J'); s(9, 19, 'g'); s(10, 19, 'g'); row(A(21), 6, 13, 'j'); break;
      case 'apron': s(7, 16, 'g'); s(12, 16, 'g'); for (let r = 17; r <= 20; r++) row(A(r), 7, 12, 'g'); s(9, 16, 'w'); s(10, 16, 'w'); break;
      case 'uniform': s(9, 16, 'w'); s(10, 16, 'w'); s(9, 17, 'g'); s(10, 17, 'g'); s(9, 18, 'g'); s(12, 17, 'k'); break;
      default: row(A(16), 8, 11, 'k');
    }
  } else if (view === 'back') {
    switch (o) {
      case 'hoodie': row(A(16), 7, 12, 'k'); row(A(17), 7, 12, 'k'); row(A(18), 8, 11, 'J'); break;
      case 'coat': row(A(19), 6, 13, 'J'); row(A(21), 6, 13, 'j'); break;
      case 'apron': s(9, 19, 'g'); s(10, 19, 'g'); s(8, 18, 'g'); s(11, 18, 'g'); break;
      case 'reporter': case 'suit': s(9, 19, 'J'); s(9, 20, 'J'); break;
      default: break;
    }
  } else {
    switch (o) {
      case 'reporter': s(12, 16, 'w'); s(12, 17, 'w'); s(12, 18, 'w'); s(11, 16, 'k'); break;
      case 'suit': s(12, 16, 'w'); s(12, 17, 'g'); s(12, 18, 'g'); s(11, 16, 'k'); break;
      case 'knit': row(A(16), 8, 11, 'k'); row(A(18), 7, 12, 'k'); break;
      case 'hoodie': s(7, 16, 'J'); s(7, 17, 'J'); s(8, 16, 'J'); s(12, 17, 'g'); break;
      case 'coat': s(12, 16, 'k'); s(12, 17, 'k'); row(A(19), 7, 12, 'J'); row(A(21), 7, 12, 'j'); break;
      case 'apron': for (let r = 17; r <= 20; r++) { s(11, r, 'g'); s(12, r, 'g'); } break;
      case 'uniform': s(12, 16, 'g'); s(12, 17, 'g'); s(11, 17, 'k'); break;
      default: s(11, 16, 'k'); s(12, 16, 'k');
    }
  }
}

/** Text preview used by tests and tooling. */
export function asText(grid: Grid): string {
  const lines: string[] = [];
  for (let y = 0; y < CH; y++) { let l = ''; for (let x = 0; x < CW; x++) l += grid[y * CW + x] ?? '.'; lines.push(l); }
  return lines.join(String.fromCharCode(10));
}

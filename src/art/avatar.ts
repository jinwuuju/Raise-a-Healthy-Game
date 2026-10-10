import type { Look } from '../domain/appearance';
import type { Dir } from '../world/types';

/*
 * Reporter sprites v4 (D046): 바람의나라-style proportions with the cute v3 face.
 * About 2.4 heads: a 12px-wide head that is ~40% of the figure, an 8-row torso and 6-row legs.
 * Kept from v3: low wide eyes with one highlight, blush, no brows/nose, tinted outlines, bounce frames.
 * Canvas 20x37, feet on row 35, anchor (10, 36). Rows below are relative to the head origin
 * (hair r1, head skin r3..r12, neck r13, torso r14..r21, legs r22..r27, feet r28).
 */
export const CW = 20, CH = 37, AX = 10, AY = 36;
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

export const HAIR: Partial<Record<string, HairArt>> = {
  comma: {
    front: T(1, ...CAP, '3:hhhhhhh 11:hhhhH', '3:Hhhh 13:hhhH', '3:HH 15:HH', '3:H 16:H'),
    side: T(1, ...SIDE_CAP, '2:hhhhhhhh 12:hhhhH', '2:hhhhhhh 14:hhH', '2:Hhhhhh 16:H', '2:Hhhh', '3:Hh', '3:H'),
    nape: 10, sheet: 10,
  },
  short: {
    front: T(1, ...CAP, '3:hhhhhhhhhhhhhH', '3:Hh 8:hhhhhhhhH', '3:H 14:hhH', '3:H 16:H'),
    side: T(1, ...SIDE_CAP, '2:hhhhhhhh 13:hhhH', '2:hhhhhhh 15:hH', '2:Hhhhhh', '2:Hhhh', '3:Hh', '3:H'),
    nape: 10, sheet: 10,
  },
  spiky: {
    front: T(-1, '6:h 9:h 12:h', '5:hh 8:hh 11:hhh', ...CAP, '3:Hhh 7:hh 10:h 12:hh 15:hH', '3:H 7:h 12:h 16:H'),
    side: T(-1, '5:h 8:h 11:h', '4:hh 7:hh 10:hh', ...SIDE_CAP, '2:hhhhhhhh 13:h 15:hH', '2:hhhhhhh 16:H', '2:Hhhhhh', '2:Hhhh', '3:HH'),
    nape: 10, sheet: 10,
  },
  curly: {
    front: T(0, '6:hhhhhhhh', '4:hhLhhhLhhhhh', '3:hLhhLhhhhLhhhH', '2:hhhLhhhhLhhhLhhH', '2:hhhhhhhhhhhhhhhH', '2:HhhLhhhhLhhhhLhH', '2:Hhh 6:hh 9:h 11:h 13:hh 15:hhH', '2:Hh 16:hH', '2:H 17:H'),
    side: T(0, '6:hhhhh', '4:hhLhhhhhh', '3:hhLLhhLhhhh', '2:hLhhLhhhhLhhh', '1:hhLhhhLhhhhLhhH', '1:hhhhhhhhhhhhhhhH', '1:Hhhhhhhhh 13:hh 15:hhH', '1:HhhhhhhhH 16:H', '1:HhhhhhH', '2:HhhH', '3:HH'),
    nape: 10, sheet: 10,
  },
  buzz: {
    front: T(2, '5:hhhhhhhhhh', '4:hLhhhhhhhhhH', '4:hhhhhhhhhhhH', '4:H 15:H'),
    side: T(2, '5:hhhhhhh', '4:hLLhhhhhhh', '4:hhhhhhhhhhhH', '4:hhhhhhh 13:hhH', '4:Hhhhh', '4:Hhh', '4:H'),
    nape: 9, sheet: 9,
  },
  wolf: {
    front: T(1, ...CAP, '3:hhhhhhh 11:hhhhH', '3:Hhh 13:hhhH', ...rep('3:Hh 15:hH', 4), '3:H 16:H', '', '5:1 14:1', '5:2 14:2'),
    side: T(1, ...SIDE_CAP, '2:hhhhhhhh 12:hhhhH', '2:hhhhhhh 14:hhH', '2:hhhhhh', '2:hhhhhh', '2:hhhhhh', '2:Hhhh', '2:hhh', '3:HhH', '3:H 5:H'),
    nape: 12, sheet: 12,
  },
  bob: {
    front: T(1, ...BANGS, ...rep('2:hhh 15:hhH', 4), '2:Hhhh 14:hhhH', '3:HHH 14:HHH'),
    side: T(1, ...SIDE_F, ...rep('2:hhhhhh', 4), '2:HhhhhH', '3:HHHH'),
    nape: 12, sheet: 12,
  },
  long: {
    front: T(1, ...BANGS, '2:hhh 15:hhH', '2:hLh 15:hhH', ...rep('2:hhh 15:hhH', 12), '2:hLh 15:hhH', '2:HHH 15:HHH'),
    side: T(1, ...SIDE_F, ...rep('2:hhhhhh', 14), '2:HHHHHH'),
    nape: 12, sheet: 22,
  },
  wave: {
    front: T(1, '6:hhhhhhhh', '4:hhLLhHhhhhhh', '3:hLLhhhHhhhhhhH', '2:hhLhhhhHhhhhhhhH', '2:hhhhhhh 11:hhhhhhH', '2:hhhhh 13:hhhhH', '2:hhhh 14:hhhH', ...rep('2:hhh 15:hhH', 4), '1:hhhH 15:Hhhh', '1:hhh 16:hhh', '2:hhh 15:hhh', '1:hhhH 15:Hhhh', '1:Hhh 16:hhH', '2:HhH 15:HhH', '3:H 16:H'),
    side: T(1, ...SIDE_CAP, '2:hhhhhhhh 13:hhhH', '2:hhhhhhh 16:H', ...rep('2:hhhhhh', 4), '1:hhhhhhh', '1:hhhhhH', '2:hhhhH', '1:hhhhhH', '2:hhhH', '2:HhH', '3:H'),
    nape: 12, sheet: 19,
  },
  ponytail: {
    front: T(1, ...CAP, '3:hhhhhhhhhhhhhH 17:12', '3:Hh 7:hhhhhhhhhH 17:12', '3:H 14:hhH 17:12', '3:h 16:h 17:12', '3:h 16:h 17:12', '17:12', '17:2'),
    side: T(1, '6:hhhhhh', '4:hhLLLhhhhh', '3:hhLLhhhhhhhh', '1:R 2:hhLhhhhhhhhhhH', '0:12 2:hhhhhhhhhhhhhhH', '0:12 2:hhhhhhhh 13:hhhH', '0:12 2:hhhhhhh 15:hH', '0:12 2:Hhhhhh', '0:12 2:Hhhh', '0:12 3:HH', '0:12', '0:12', '0:2'),
    tail: T(2, '9:RR', '', '', '', '', '', '', '', '8:hLhh', '8:hhhh', '8:hhhH', '8:hhhH', '8:hhhH', '9:hH', '9:HH'),
    nape: 10, sheet: 10,
  },
  twin: {
    front: T(1, ...BANGS, '2:hh 16:hh', '0:Rhh 17:hhR', '0:hhh 17:hhh', '0:hLhh 16:hhLh', '0:hhhh 16:hhhh', '0:hhhH 16:Hhhh', '1:hhH 16:Hhh', '1:hH 17:Hh', '1:H 18:H'),
    side: T(1, ...SIDE_F, '2:hhhhhR', '1:hhhh', '1:hLhh', '1:hhhh', '1:hhhH', '1:hhH', '2:hH', '2:H'),
    nape: 12, sheet: 12,
  },
  bun: {
    front: T(-3, '8:hhhh', '7:hLLhhh', '7:hLhhhH', '7:RRRRRR', '6:hhhhhhhh', '4:hhLLhHhhhhhh', '3:hLLhhhHhhhhhhH', '3:hhLhhhHhhhhhhH', '3:hhhhhh 11:hhhhhH', '3:hhh 14:hhH', '3:hH 15:Hh', '3:h 16:h', '3:h 16:h', '3:H 16:H'),
    side: T(-3, '4:hhhh', '3:hLLhhh', '3:hLhhhH', '4:RRR', ...SIDE_CAP, '2:hhhhhhhh 13:hhhH', '2:hhhhhhh 16:H', '2:Hhhhhh', '2:Hhhh', '3:HH'),
    nape: 10, sheet: 10,
  },
  buds: {
    front: T(-4, '5:LL 13:LL', '5:Lh 13:hH', ...rep('6:H 13:H', 5)),
    side: T(-4, '7:LL 11:LL', '7:Lh 11:hH', ...rep('8:H 11:H', 5)),
    nape: 0, sheet: 0,
  },
  tuft: {
    front: T(0, '9:hL', '8:hhLh', '7:hhhhhh', '8:hhhh', '', '', '', '3:h 16:h', '3:H 16:H'),
    side: T(0, '8:hL', '7:hhLh', '6:hhhhhh', '7:hhhh', '', '', '', '3:h', '3:H'),
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
const TOP: [number, number][] = [[6, 13], [5, 14], [4, 15], [4, 15], [4, 15], [4, 15], [4, 15], [4, 15]];
const CHIN: Record<string, [number, number][]> = {
  round: [[4, 15], [6, 13]],
  oval: [[5, 14], [7, 12]],
  vline: [[5, 14], [8, 11]],
  square: [[4, 15], [5, 14]],
  mochi: [[4, 15], [4, 15]],
};
const HEAD_TOP = 3;
/** Head skin rows r3..r12 as [from, to] columns. */
export function headRows(shape: string): [number, number][] { return [...TOP, ...(CHIN[shape] ?? CHIN.oval!)]; }

/** Back view: the front hair mass, closed over the head down to the nape (and over the back for long hair). */
function backOf(art: HairArt): Map<number, Map<number, string>> {
  const m = new Map<number, Map<number, string>>();
  const put = (r: number, x: number, c: string) => { if (!m.has(r)) m.set(r, new Map()); m.get(r)!.set(x, c); };
  art.front.rows.forEach((row, i) => { for (const [x, c] of cells(row)) put(art.front.r + i, x, BEHIND[c] ?? c); });
  const head = headRows('oval');
  for (let r = HEAD_TOP; r <= art.nape && r <= 12; r++) { const [a, b] = head[r - HEAD_TOP]!; for (let x = a; x <= b; x++) if (!m.get(r)?.has(x)) put(r, x, 'h'); }
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

  // 2. Legs and feet (feet fixed on row 35; legs stretch or squash with the body).
  const legTop = A(22), feet = OY + 28;
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

  // 3. Torso.
  if (!side) {
    row(A(14), 7, 12, 'j');
    for (let r = 15; r <= 20; r++) { row(A(r), 6, 13, 'j'); set(13, A(r), 'J'); }
    row(A(21), 6, 13, 'J');
  } else {
    row(A(14), 8, 11, 'j');
    for (let r = 15; r <= 20; r++) { row(A(r), 7, 12, 'j'); set(12, A(r), 'J'); }
    row(A(21), 7, 12, 'J');
  }
  if (skirt) {
    if (!side) { row(A(21), 6, 13, 'p'); row(A(22), 5, 14, 'p'); row(A(23), 5, 14, 'P'); set(8, A(22), 'P'); set(11, A(22), 'P'); }
    else { row(A(21), 7, 12, 'p'); row(A(22), 6, 13, 'p'); row(A(23), 6, 13, 'P'); }
  }
  outfit(set, row, look.outfit, view, A);

  // 4. Arms.
  if (!side) {
    const sw = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    const arm = (x: number, o: number, c: string) => { for (let r = 15; r <= 19 + o; r++) set(x, A(r), c); set(x, A(20 + o), 's'); };
    arm(5, view === 'front' ? sw : -sw, 'k');
    arm(14, view === 'front' ? -sw : sw, 'J');
  } else {
    const pts: [number, number][] = frame === 1 ? [[9, 15], [9, 16], [8, 17], [8, 18], [7, 19]] : frame === 2 ? [[9, 15], [10, 16], [10, 17], [11, 18], [11, 19]] : [[9, 15], [9, 16], [9, 17], [9, 18], [9, 19]];
    for (const [x, r] of pts) { set(x, A(r), 'k'); set(x + 1, A(r), 'j'); }
    const [hx, hr] = pts[pts.length - 1]!; set(hx, A(hr + 1), 's'); set(hx + 1, A(hr + 1), 's');
  }

  // 5. Neck and head.
  set(9, A(13), 'S'); set(10, A(13), 'S');
  const head = headRows(look.shape);
  head.forEach(([a, b], i) => row(A(HEAD_TOP + i), a, b, 's'));
  if (!side) for (let i = 3; i <= 7; i++) set(head[i]![1], A(HEAD_TOP + i), 'S');
  if (view !== 'back') face(set, look, A, side, head);

  // 6. Hair in front.
  if (view === 'back' && art) { for (const [r, m] of backOf(art)) for (const [x, c] of m) set(x, A(r), c); }
  else if (tpl) tpl.rows.forEach((r, i) => { for (const [x, c] of cells(r)) if (!BEHIND[c]) set(x, A(tpl.r + i), c); });

  // 7. Round glasses.
  if (look.glasses && view !== 'back') {
    const lens = (x0: number) => { row(A(6), x0 + 1, x0 + 2, 'o'); row(A(10), x0 + 1, x0 + 2, 'o'); for (let r = 7; r <= 9; r++) { set(x0, A(r), 'o'); set(x0 + 3, A(r), 'o'); } };
    if (view === 'front') { lens(5); lens(11); row(A(7), 9, 10, 'o'); } else { lens(11); row(A(7), 8, 10, 'o'); }
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
      case 'smile': case 'closed': P(a, 8, 'e'); P(b, 8, 'e'); P(outer, 9, 'e'); P(beyondIn, 9, 'e'); break;
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
    if (look.face === 'cool' || look.face === 'calm') P(10, 11, 'm'); else { P(9, 11, 'm'); P(10, 11, 'm'); }
  } else {
    P(14, 10, 'r');
    P(Math.min(15, head[8]![1] - 1), 11, 'm');
  }
}

function outfit(set: SetFn, row: RowFn, o: string, view: View, A: (r: number) => number) {
  const s = (x: number, r: number, c: string) => set(x, A(r), c);
  if (view === 'front') {
    switch (o) {
      case 'reporter': s(9, 14, 'w'); s(10, 14, 'w'); s(9, 15, 'w'); s(10, 15, 'w'); s(9, 16, 'w'); s(10, 16, 'W'); s(8, 14, 'k'); s(11, 14, 'k'); s(7, 16, 'w'); s(7, 17, 'g'); break;
      case 'suit': s(9, 14, 'w'); s(10, 14, 'w'); s(8, 14, 'k'); s(11, 14, 'k'); for (let r = 15; r <= 19; r++) { s(9, r, 'g'); s(10, r, 'g'); } break;
      case 'knit': row(A(14), 7, 12, 'k'); row(A(16), 6, 12, 'k'); break;
      case 'hoodie': row(A(14), 7, 12, 'J'); s(8, 15, 'g'); s(11, 15, 'g'); row(A(17), 7, 12, 'J'); break;
      case 'coat': s(9, 14, 'w'); s(10, 14, 'w'); s(8, 14, 'k'); s(11, 14, 'k'); s(8, 15, 'k'); s(11, 15, 'k'); row(A(17), 6, 13, 'J'); s(9, 17, 'g'); s(10, 17, 'g'); row(A(22), 6, 13, 'j'); row(A(23), 6, 13, 'J'); break;
      case 'apron': s(7, 14, 'g'); s(12, 14, 'g'); for (let r = 16; r <= 21; r++) row(A(r), 7, 12, 'g'); s(9, 14, 'w'); s(10, 14, 'w'); break;
      case 'uniform': s(9, 14, 'w'); s(10, 14, 'w'); s(9, 15, 'g'); s(10, 15, 'g'); s(9, 16, 'g'); s(12, 15, 'k'); break;
      default: row(A(14), 8, 11, 'k');
    }
  } else if (view === 'back') {
    switch (o) {
      case 'hoodie': row(A(14), 7, 12, 'k'); row(A(15), 7, 12, 'k'); row(A(16), 8, 11, 'J'); break;
      case 'coat': row(A(17), 6, 13, 'J'); row(A(22), 6, 13, 'j'); row(A(23), 6, 13, 'J'); break;
      case 'apron': s(9, 17, 'g'); s(10, 17, 'g'); s(8, 16, 'g'); s(11, 16, 'g'); break;
      case 'reporter': case 'suit': s(9, 17, 'J'); s(9, 18, 'J'); break;
      default: break;
    }
  } else {
    switch (o) {
      case 'reporter': s(12, 14, 'w'); s(12, 15, 'w'); s(12, 16, 'w'); s(11, 14, 'k'); break;
      case 'suit': s(12, 14, 'w'); s(12, 15, 'g'); s(12, 16, 'g'); s(11, 14, 'k'); break;
      case 'knit': row(A(14), 8, 11, 'k'); row(A(16), 7, 12, 'k'); break;
      case 'hoodie': s(7, 14, 'J'); s(7, 15, 'J'); s(8, 14, 'J'); s(12, 15, 'g'); break;
      case 'coat': s(12, 14, 'k'); s(12, 15, 'k'); row(A(17), 7, 12, 'J'); row(A(22), 7, 12, 'j'); row(A(23), 7, 12, 'J'); break;
      case 'apron': for (let r = 16; r <= 21; r++) { s(11, r, 'g'); s(12, r, 'g'); } break;
      case 'uniform': s(12, 14, 'g'); s(12, 15, 'g'); s(11, 15, 'k'); break;
      default: s(11, 14, 'k'); s(12, 14, 'k');
    }
  }
}

/** Text preview used by tests and tooling. */
export function asText(grid: Grid): string {
  const lines: string[] = [];
  for (let y = 0; y < CH; y++) { let l = ''; for (let x = 0; x < CW; x++) l += grid[y * CW + x] ?? '.'; lines.push(l); }
  return lines.join(String.fromCharCode(10));
}

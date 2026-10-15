import raw from './district.generated.json';
import type { Point, Rect } from './types';

/*
 * Real-scale district around Euro Plaza (D096): 1 tile (16 px) = 3 m, north up, game pixels.
 * Geometry comes from OpenStreetMap (ODbL, see THIRD_PARTY_NOTICES) via tools/district/build_district.py.
 * Pure geometry only: no rendering and no Room objects (rooms.ts composes the 'district' room from this).
 */
export const DISTRICT_SIZE: number = raw.size;
export const MASK_CELL = 4;
export const districtLicence: string = raw.licence;

/** kind: 0 big carriageway (blocked, cross on crosswalks), 1 small road (shared, walkable), 2 footpath, 3 slip lane (walkable). */
export type DRoad = { id: number; kind: 0 | 1 | 2 | 3; w: number; sw: number; bridge: boolean; pts: Point[] };
/** Tidy game block for one OSM building (D097): axis-aligned, snapped to 8 px, drawn with the street building art. */
export type DBlock = { id: number; kind: string; v: number; x: number; y: number; w: number; d: number; h: number; special: string | null };
export type DArea = { cls: number; pts: Point[] };

const pairs = (a: number[]): Point[] => { const out: Point[] = []; for (let i = 0; i + 1 < a.length; i += 2) out.push({ x: a[i]!, y: a[i + 1]! }); return out; };
const specialOf = new Map<number, string>(Object.entries(raw.special as Record<string, number>).map(([k, v]) => [v, k]));

export const droads: DRoad[] = (raw.roads as number[][]).map(r => ({ id: r[0]!, kind: r[1] as 0 | 1 | 2 | 3, w: r[2]!, sw: r[3]!, bridge: r[4] === 1, pts: pairs(r.slice(5)) }));
const KINDS = ['europlaza', 'b2bc', 'jinu', 'granite', 'shop', 'office', 'apartment', 'brickcorner', 'hotel', 'small'];
export const dblocks: DBlock[] = (raw.blocks as number[][]).map(b => ({ id: b[0]!, kind: KINDS[b[1]!]!, v: b[2]!, x: b[3]!, y: b[4]!, w: b[5]!, d: b[6]!, h: b[7]!, special: specialOf.get(b[0]!) ?? null }));
export const dareas: DArea[] = (raw.areas as number[][]).map(a => ({ cls: a[0]!, pts: pairs(a.slice(1)) }));
export const dlabels = (raw.labels as [string, number, number][]).map(([text, x, y]) => ({ text, x, y }));
export const specialBlock = (k: string): DBlock | undefined => dblocks.find(b => b.special === k);

/* ---------- polylines ---------- */
export type Polyline = { pts: Point[]; cum: number[]; len: number };
export function polyline(pts: Point[]): Polyline {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y));
  return { pts, cum, len: cum[cum.length - 1]! };
}
export function pointAt(pl: Polyline, s: number): { p: Point; dir: Point } {
  const d = Math.max(0, Math.min(pl.len, s));
  let i = 1; while (i < pl.pts.length - 1 && pl.cum[i]! < d) i++;
  const a = pl.pts[i - 1]!, b = pl.pts[i]!, seg = pl.cum[i]! - pl.cum[i - 1]! || 1, t = (d - pl.cum[i - 1]!) / seg;
  return { p: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, dir: { x: (b.x - a.x) / seg, y: (b.y - a.y) / seg } };
}
/** Arc position of the point of the line nearest to q. */
export function nearestS(pl: Polyline, q: Point): number {
  let best = 0, bestD = Infinity;
  for (let i = 1; i < pl.pts.length; i++) {
    const a = pl.pts[i - 1]!, b = pl.pts[i]!, dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / L)), x = a.x + dx * t, y = a.y + dy * t, d = Math.hypot(q.x - x, q.y - y);
    if (d < bestD) { bestD = d; best = pl.cum[i - 1]! + t * Math.sqrt(L); }
  }
  return best;
}
/** Shift a polyline to the driver's right (screen coordinates, y down) by d pixels; negative = left. */
export function offset(pts: Point[], d: number): Point[] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)]!, b = pts[Math.min(pts.length - 1, i + 1)]!, L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: p.x - (b.y - a.y) / L * d, y: p.y + (b.x - a.x) / L * d };
  });
}

/* ---------- the Eulji Hospital crossroads: Nonhyeon-ro (NS) × Dosan-daero (EW) ---------- */
const roadById = new Map(droads.map(r => [r.id, r]));
const chain = (ids: number[]): { pts: Point[]; w: number } => {
  const pts: Point[] = [];
  for (const id of ids) { const r = roadById.get(id)!; for (const p of r.pts) if (!pts.length || Math.hypot(p.x - pts[pts.length - 1]!.x, p.y - pts[pts.length - 1]!.y) > 0.5) pts.push(p); }
  return { pts, w: Math.max(...ids.map(id => roadById.get(id)!.w)) };
};
// Directional carriageways (right-hand traffic) chained from the OSM ways of each direction.
export const carriageways = {
  sb: { axis: 'NS' as const, ...chain([97537668, 218724605, 522490647]) },
  nb: { axis: 'NS' as const, ...chain([166607607, 1009285129, 218724606]) },
  wb: { axis: 'EW' as const, ...chain([218964977, 522490672, 480842847]) },
  eb: { axis: 'EW' as const, ...chain([472042767, 1009285130, 522490642]) },
};
export const crossroads: Point = { x: (2122 + 2162 + 2177) / 3, y: (2545 + 2436 + 2524) / 3 };
export const APPROACH = 70, BAND = 11;

export type Lane = { line: Polyline; axis: 'NS' | 'EW'; stop: number };
/** Two lanes per direction; cars stop before the crosswalk on red. */
export const lanes: Lane[] = Object.values(carriageways).flatMap(cw => [-9, 9].map(d => {
  const line = polyline(offset(cw.pts, d));
  return { line, axis: cw.axis, stop: nearestS(line, crossroads) - APPROACH - BAND - 8 };
}));

/** poly: zebra band reaching a little onto both kerbs (drawn, walkable); core: the part over the carriageway (signal-controlled). */
export type Crosswalk = { id: string; road: 'NS' | 'EW'; poly: Point[]; core: Point[]; ends: [Point, Point] };
function band(a: { pts: Point[]; w: number }, sa: number, b: { pts: Point[]; w: number }, sb: number): { poly: Point[]; core: Point[]; ends: [Point, Point] } {
  const pa = pointAt(polyline(a.pts), sa).p, pb = pointAt(polyline(b.pts), sb).p;
  const L = Math.hypot(pb.x - pa.x, pb.y - pa.y) || 1, v = { x: (pb.x - pa.x) / L, y: (pb.y - pa.y) / L }, u = { x: -v.y, y: v.x };
  const quad = (ea: number, eb: number) => {
    const A = { x: pa.x - v.x * (a.w / 2 + ea), y: pa.y - v.y * (a.w / 2 + ea) }, B = { x: pb.x + v.x * (b.w / 2 + eb), y: pb.y + v.y * (b.w / 2 + eb) };
    return { A, B, q: [{ x: A.x - u.x * BAND, y: A.y - u.y * BAND }, { x: B.x - u.x * BAND, y: B.y - u.y * BAND }, { x: B.x + u.x * BAND, y: B.y + u.y * BAND }, { x: A.x + u.x * BAND, y: A.y + u.y * BAND }] };
  };
  const outer = quad(14, 14), inner = quad(-10, -10); // core starts a little inside the carriageway so corner kerbs never count as crossing
  return { poly: outer.q, core: inner.q, ends: [outer.A, outer.B] };
}
const sOf = (cw: { pts: Point[] }) => nearestS(polyline(cw.pts), crossroads);
const { sb, nb, wb, eb } = carriageways;
export const crosswalks: Crosswalk[] = [
  { id: 'cross-n', road: 'NS', ...band(sb, sOf(sb) - APPROACH, nb, sOf(nb) + APPROACH) },
  { id: 'cross-s', road: 'NS', ...band(sb, sOf(sb) + APPROACH, nb, sOf(nb) - APPROACH) },
  { id: 'cross-w', road: 'EW', ...band(wb, sOf(wb) + APPROACH, eb, sOf(eb) - APPROACH) },
  { id: 'cross-e', road: 'EW', ...band(wb, sOf(wb) - APPROACH, eb, sOf(eb) + APPROACH) },
];

/* ---------- rasterising ---------- */
/** Even-odd scanline fill of a polygon into a grid (pixel centres), calling put(x, y) for every covered cell. */
export function scanPoly(pts: Point[], w: number, h: number, put: (x: number, y: number) => void, scale = 1): void {
  const n = pts.length; if (n < 3) return;
  let y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { y0 = Math.min(y0, p.y * scale); y1 = Math.max(y1, p.y * scale); }
  const xs: number[] = [];
  for (let y = Math.max(0, Math.ceil(y0 - 0.5)); y <= Math.min(h - 1, Math.floor(y1 - 0.5)); y++) {
    const sy = y + 0.5; xs.length = 0;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const ay = pts[i]!.y * scale, by = pts[j]!.y * scale;
      if ((ay > sy) !== (by > sy)) xs.push(pts[i]!.x * scale + (sy - ay) / (by - ay) * (pts[j]!.x - pts[i]!.x) * scale);
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.ceil(xs[k]! - 0.5)); x <= Math.min(w - 1, Math.floor(xs[k + 1]! - 0.5)); x++) put(x, y);
  }
}
/** Thick polyline as quads plus octagonal joints. */
export function strokePolys(pts: Point[], width: number): Point[][] {
  const r = width / 2, out: Point[][] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!, b = pts[i]!, L = Math.hypot(b.x - a.x, b.y - a.y) || 1, nx = -(b.y - a.y) / L * r, ny = (b.x - a.x) / L * r;
    out.push([{ x: a.x + nx, y: a.y + ny }, { x: b.x + nx, y: b.y + ny }, { x: b.x - nx, y: b.y - ny }, { x: a.x - nx, y: a.y - ny }]);
  }
  if (r >= 2) for (const p of pts) out.push(Array.from({ length: 8 }, (_, k) => ({ x: p.x + Math.cos(k * Math.PI / 4 + Math.PI / 8) * r, y: p.y + Math.sin(k * Math.PI / 4 + Math.PI / 8) * r })));
  return out;
}

/** Collision mask (1 = blocked) at 4 px cells: carriageways of the big roads except crosswalks (buildings are solid blocks). */
export function buildMask(): { cell: number; w: number; h: number; data: Uint8Array } {
  const w = Math.ceil(DISTRICT_SIZE / MASK_CELL), h = w, data = new Uint8Array(w * h), s = 1 / MASK_CELL;
  const set = (v: number) => (x: number, y: number) => { data[y * w + x] = v; };
  for (const r of droads) if (r.kind === 0) for (const q of strokePolys(r.pts, r.w)) scanPoly(q, w, h, set(1), s);
  for (const c of crosswalks) scanPoly(c.poly, w, h, set(0), s);
  return { cell: MASK_CELL, w, h, data };
}
export function inPoly(p: Point, pts: Point[]): boolean {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i]!, b = pts[j]!;
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

/* ---------- entrances and fronts of the buildings the game already uses ---------- */
function computeAnchors() {
  const ep = specialBlock('europlaza')!, cafe = specialBlock('cafe')!, jinu = specialBlock('jinu')!, granite = specialBlock('granite')!;
  // Every block shows its south face (the game's 2.5D convention); doors, fronts and the props sit there.
  const euro = { x: ep.x, y: ep.y, w: ep.w, d: ep.d };
  const euroDoor = { x: euro.x + 92, y: euro.y + euro.d, w: 17, h: 7 };
  const front = (b: DBlock, dy: number) => ({ x: b.x + Math.round(b.w / 2), y: b.y + b.d + dy });
  return {
    euro, euroDoor, euroOut: { x: euro.x + 100, y: euro.y + euro.d + 14 },
    cafeDoor: front(cafe, 3), cafeOut: front(cafe, 16), cafeFacing: 'down' as const,
    jinuFront: front(jinu, 10), graniteFront: front(granite, 10),
  };
}
export const anchors = computeAnchors();

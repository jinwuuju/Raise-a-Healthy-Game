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
export type DBuilding = { id: number; cls: number; floors: number; h: number; pts: Point[]; bbox: Rect; maxY: number; special: string | null };
export type DArea = { cls: number; pts: Point[] };

const pairs = (a: number[]): Point[] => { const out: Point[] = []; for (let i = 0; i + 1 < a.length; i += 2) out.push({ x: a[i]!, y: a[i + 1]! }); return out; };
const bboxOf = (pts: Point[]): Rect => {
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y), x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
};
const specialOf = new Map<number, string>(Object.entries(raw.special as Record<string, number>).map(([k, v]) => [v, k]));

export const droads: DRoad[] = (raw.roads as number[][]).map(r => ({ id: r[0]!, kind: r[1] as 0 | 1 | 2 | 3, w: r[2]!, sw: r[3]!, bridge: r[4] === 1, pts: pairs(r.slice(5)) }));
/** Building height in pixels: about half the true scale per floor so tall blocks do not hide whole streets (D096). */
export const heightPx = (floors: number): number => Math.min(150, floors * 8 + 4);
export const dbuildings: DBuilding[] = (raw.buildings as number[][]).map(b => {
  const pts = pairs(b.slice(3)), bbox = bboxOf(pts);
  return { id: b[0]!, cls: b[1]!, floors: b[2]!, h: heightPx(b[2]!), pts, bbox, maxY: bbox.y + bbox.h, special: specialOf.get(b[0]!) ?? null };
});
export const dareas: DArea[] = (raw.areas as number[][]).map(a => ({ cls: a[0]!, pts: pairs(a.slice(1)) }));
export const dlabels = (raw.labels as [string, number, number][]).map(([text, x, y]) => ({ text, x, y }));
export const specialBuilding = (k: string): DBuilding | undefined => dbuildings.find(b => b.special === k);

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

/** Collision mask (1 = blocked) at 4 px cells: carriageways of the big roads except crosswalks, and building footprints. */
export function buildMask(skip: (b: DBuilding) => boolean): { cell: number; w: number; h: number; data: Uint8Array } {
  const w = Math.ceil(DISTRICT_SIZE / MASK_CELL), h = w, data = new Uint8Array(w * h), s = 1 / MASK_CELL;
  const set = (v: number) => (x: number, y: number) => { data[y * w + x] = v; };
  for (const r of droads) if (r.kind === 0) for (const q of strokePolys(r.pts, r.w)) scanPoly(q, w, h, set(1), s);
  for (const c of crosswalks) scanPoly(c.poly, w, h, set(0), s);
  for (const b of dbuildings) if (!skip(b)) scanPoly(b.pts, w, h, set(1), s);
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
type Edge = { mid: Point; n: Point };
function edgeToward(b: DBuilding, score: (p: Point) => number): Edge {
  let best: Edge & { d: number } = { mid: b.pts[0]!, n: { x: 0, y: 1 }, d: Infinity };
  for (let i = 1; i < b.pts.length; i++) {
    const a = b.pts[i - 1]!, c = b.pts[i]!, L = Math.hypot(c.x - a.x, c.y - a.y); if (L < 12) continue;
    const mid = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 }; let n = { x: (c.y - a.y) / L, y: -(c.x - a.x) / L };
    if (inPoly({ x: mid.x + n.x * 3, y: mid.y + n.y * 3 }, b.pts)) n = { x: -n.x, y: -n.y };
    const d = score(mid); if (d < best.d) best = { mid, n, d };
  }
  return best;
}
const out = (e: Edge, d: number): Point => ({ x: Math.round(e.mid.x + e.n.x * d), y: Math.round(e.mid.y + e.n.y * d) });
const faceOf = (n: Point): 'down' | 'up' | 'left' | 'right' => Math.abs(n.x) > Math.abs(n.y) ? (n.x > 0 ? 'right' : 'left') : (n.y > 0 ? 'down' : 'up');
function computeAnchors() {
  const ep = specialBuilding('europlaza')!, cafe = specialBuilding('cafe')!, jinu = specialBuilding('jinu')!, granite = specialBuilding('granite')!;
  // Euro Plaza keeps its approved rectangle art, laid over the real footprint's bounding box; the lobby door keeps
  // its place in that art (92 px from the tower end) and opens onto Nonhyeon-ro 151-gil to the south.
  const euro = { x: Math.round(ep.bbox.x), y: Math.round(ep.bbox.y), w: Math.round(ep.bbox.w / 8) * 8, d: Math.round(ep.bbox.h / 8) * 8 };
  const euroDoor = { x: euro.x + 92, y: euro.y + euro.d, w: 17, h: 7 };
  const near25 = droads.filter(r => r.kind === 1 && r.pts.some(p => Math.hypot(p.x - cafe.bbox.x, p.y - cafe.bbox.y) < 220));
  const cafeEdge = edgeToward(cafe, p => Math.min(...near25.flatMap(r => r.pts.map(q => Math.hypot(q.x - p.x, q.y - p.y)))));
  const toEuro = (p: Point) => Math.hypot(p.x - euroDoor.x, p.y - euroDoor.y);
  const jinuEdge = edgeToward(jinu, toEuro), graniteEdge = edgeToward(granite, toEuro);
  return {
    euro, euroDoor, euroOut: { x: euro.x + 100, y: euro.y + euro.d + 14 },
    cafeDoor: out(cafeEdge, 5), cafeOut: out(cafeEdge, 18), cafeFacing: faceOf(cafeEdge.n), cafeEdge,
    jinuFront: out(jinuEdge, 9), jinuEdge, graniteFront: out(graniteEdge, 10), graniteEdge,
  };
}
export const anchors = computeAnchors();

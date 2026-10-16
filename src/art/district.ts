import { hash2, makeCanvas } from './pixel';
import {
  APPROACH, BAND, DISTRICT_SIZE, carriageways, crossroads, crosswalks, dareas, dblocks, droads, nearestS, pointAt, polyline, scanPoly, strokePolys, zebras,
} from '../world/district';
import type { Point } from '../world/types';

/*
 * D096 real-scale district art. The ground is baked lazily in 256 px chunks where the camera looks, every footprint
 * becomes its own crisp pixel sprite (south-facing walls with floor lines and windows, roof lifted by the height).
 * Polygons are filled by scanline so edges stay hard pixels (no anti-aliasing), matching the rest of the game.
 */
const CHUNK = 256;
const enum C { PAVE, GREEN, PARKING, SCHOOL, CURB, WALK, MAJOR, MINOR, PATH, MARK, TACTILE, ZEBRA }
type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const P = {
  pave: [hex('#cfc6b4'), hex('#d3cab8'), hex('#c9c0ae')], paveLine: hex('#bdb3a0'), walk: hex('#dcd3c2'), walkLine: hex('#c8bda9'), curb: hex('#9e9686'),
  major: [hex('#55595f'), hex('#5a5e64'), hex('#505459')], minor: [hex('#6a6d72'), hex('#6f7277'), hex('#66696e')], path: hex('#cbbfa3'),
  green: [hex('#86b15f'), hex('#7aa555'), hex('#93bc6a')], parking: hex('#aaa59b'), school: hex('#d8c79a'), mark: hex('#eeeae0'), tactile: hex('#e0b93e'), zebra: hex('#f1eee6'),
};
function colour(c: number, x: number, y: number): RGB {
  const n = hash2(x, y, 3);
  switch (c) {
    case C.GREEN: return P.green[n < 0.2 ? 1 : n > 0.85 ? 2 : 0]!;
    case C.PARKING: return P.parking;
    case C.SCHOOL: return P.school;
    case C.CURB: return P.curb;
    case C.WALK: return (y & 7) === 0 || ((x + ((y >> 3) & 1) * 4) & 7) === 0 ? P.walkLine : P.walk;
    case C.MAJOR: return P.major[n < 0.15 ? 1 : n > 0.9 ? 2 : 0]!;
    case C.MINOR: return P.minor[n < 0.15 ? 1 : n > 0.9 ? 2 : 0]!;
    case C.PATH: return P.path;
    case C.MARK: return P.mark;
    case C.TACTILE: return P.tactile;
    case C.ZEBRA: return P.zebra;
    default: return (x & 15) === 0 || (y & 15) === 0 ? P.paveLine : P.pave[n < 0.25 ? 1 : n > 0.9 ? 2 : 0]!;
  }
}

type Shape = { cls: number; pts: Point[] };
let shapes: Shape[] | null = null;
/** All ground shapes in paint order, built once. */
function groundShapes(): Shape[] {
  if (shapes) return shapes;
  const out: Shape[] = [];
  for (const a of dareas) out.push({ cls: [C.GREEN, C.PARKING, C.SCHOOL][a.cls] ?? C.PAVE, pts: a.pts });
  for (const r of droads) if (r.kind === 0) for (const q of strokePolys(r.pts, r.w + 2 * r.sw + 4)) out.push({ cls: C.CURB, pts: q });
  for (const r of droads) if (r.kind === 0) for (const q of strokePolys(r.pts, r.w + 2 * r.sw)) out.push({ cls: C.WALK, pts: q });
  for (const r of droads) if (r.kind === 2) for (const q of strokePolys(r.pts, r.w)) out.push({ cls: C.PATH, pts: q });
  for (const r of droads) if (r.kind === 1) for (const q of strokePolys(r.pts, r.w + 4)) out.push({ cls: C.CURB, pts: q });
  for (const r of droads) if (r.kind === 1) for (const q of strokePolys(r.pts, r.w)) out.push({ cls: C.MINOR, pts: q });
  for (const r of droads) if (r.kind === 0 || r.kind === 3) for (const q of strokePolys(r.pts, r.w)) out.push({ cls: C.MAJOR, pts: q });
  // Lane dashes along each directional carriageway, stop lines before the crosswalks.
  for (const r of droads) if (r.kind === 0) {
    const pl = polyline(r.pts), s0 = nearestS(pl, crossroads), near = Math.hypot(pointAt(pl, s0).p.x - crossroads.x, pointAt(pl, s0).p.y - crossroads.y) < 60;
    for (let s = 6; s + 10 < pl.len; s += 24) {
      if (near && Math.abs(s - s0) < APPROACH + BAND + 10) continue;
      out.push(...strokePolys([pointAt(pl, s).p, pointAt(pl, s + 10).p], 2).slice(0, 1).map(pts => ({ cls: C.MARK, pts })));
    }
  }
  for (const cw of Object.values(carriageways)) {
    const pl = polyline(cw.pts), s = nearestS(pl, crossroads) - APPROACH - BAND - 4, { p, dir } = pointAt(pl, s), n = { x: -dir.y, y: dir.x }, r = cw.w / 2;
    out.push({ cls: C.MARK, pts: strokePolys([{ x: p.x - n.x * r, y: p.y - n.y * r }, { x: p.x + n.x * r, y: p.y + n.y * r }], 3)[0]! });
  }
  for (const c of [...crosswalks, ...zebras]) {
    const [a, b, , d] = c.poly as [Point, Point, Point, Point], L = Math.hypot(b.x - a.x, b.y - a.y), v = { x: (b.x - a.x) / L, y: (b.y - a.y) / L }, u = { x: d.x - a.x, y: d.y - a.y };
    for (let t = 2; t + 4 < L; t += 8) {
      const p0 = { x: a.x + v.x * t, y: a.y + v.y * t }, p1 = { x: p0.x + v.x * 4, y: p0.y + v.y * 4 };
      out.push({ cls: C.ZEBRA, pts: [p0, p1, { x: p1.x + u.x, y: p1.y + u.y }, { x: p0.x + u.x, y: p0.y + u.y }] });
    }
    for (const e of c.ends) out.push({ cls: C.TACTILE, pts: [{ x: e.x - 5, y: e.y - 5 }, { x: e.x + 5, y: e.y - 5 }, { x: e.x + 5, y: e.y + 5 }, { x: e.x - 5, y: e.y + 5 }] });
  }
  shapes = out.map(s => ({ ...s, box: 0 } as Shape));
  return shapes;
}
const boxes = new WeakMap<Shape, [number, number, number, number]>();
function boxOf(s: Shape): [number, number, number, number] {
  let b = boxes.get(s);
  if (!b) { const xs = s.pts.map(p => p.x), ys = s.pts.map(p => p.y); b = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; boxes.set(s, b); }
  return b;
}

function bakeChunk(ix: number, iy: number): HTMLCanvasElement {
  const { c, g } = makeCanvas(CHUNK, CHUNK), x0 = ix * CHUNK, y0 = iy * CHUNK, cls = new Uint8Array(CHUNK * CHUNK);
  for (const s of groundShapes()) {
    const b = boxOf(s); if (b[2] < x0 || b[0] > x0 + CHUNK || b[3] < y0 || b[1] > y0 + CHUNK) continue;
    scanPoly(s.pts.map(p => ({ x: p.x - x0, y: p.y - y0 })), CHUNK, CHUNK, (x, y) => { cls[y * CHUNK + x] = s.cls; });
  }
  const img = g.createImageData(CHUNK, CHUNK);
  for (let y = 0; y < CHUNK; y++) for (let x = 0; x < CHUNK; x++) {
    const i = y * CHUNK + x, [r, gg, b] = colour(cls[i]!, x0 + x, y0 + y);
    img.data[i * 4] = r; img.data[i * 4 + 1] = gg; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
const chunks = new Map<number, HTMLCanvasElement>();
/** Draws the visible ground, baking at most `budget` missing chunks this frame (others show a plain pavement colour). */
export function drawDistrictGround(g: CanvasRenderingContext2D, cx: number, cy: number, vw: number, vh: number, budget = 3): number {
  const n = Math.ceil(DISTRICT_SIZE / CHUNK); let missing = 0;
  for (let iy = Math.max(0, Math.floor(cy / CHUNK)); iy <= Math.min(n - 1, Math.floor((cy + vh) / CHUNK)); iy++)
    for (let ix = Math.max(0, Math.floor(cx / CHUNK)); ix <= Math.min(n - 1, Math.floor((cx + vw) / CHUNK)); ix++) {
      const key = iy * n + ix; let ch = chunks.get(key);
      if (ch) { chunks.delete(key); chunks.set(key, ch); } // keep visible chunks at the recent end of the LRU order
      else if (budget > 0) { ch = bakeChunk(ix, iy); chunks.set(key, ch); budget--; }
      if (ch) g.drawImage(ch, ix * CHUNK - cx, iy * CHUNK - cy);
      else { g.fillStyle = '#cfc6b4'; g.fillRect(ix * CHUNK - cx, iy * CHUNK - cy, CHUNK, CHUNK); missing++; }
    }
  if (chunks.size > 96) for (const k of [...chunks.keys()].slice(0, chunks.size - 96)) chunks.delete(k);
  return missing;
}

/* ---------- minimap ---------- */
let mini: HTMLCanvasElement | null = null;
/** 1/8 scale overview (480 px) for the HUD minimap and the neighbourhood map sheet. */
export function districtMinimap(): HTMLCanvasElement {
  if (mini) return mini;
  const s = 1 / 8, { c, g } = makeCanvas(DISTRICT_SIZE * s, DISTRICT_SIZE * s);
  g.fillStyle = '#bdb5a5'; g.fillRect(0, 0, c.width, c.height);
  const path = (pts: Point[]) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p.x * s, p.y * s) : g.moveTo(p.x * s, p.y * s)); };
  for (const a of dareas) { path(a.pts); g.closePath(); g.fillStyle = a.cls === 0 ? '#6faa4c' : '#a8a397'; g.fill(); }
  g.lineCap = g.lineJoin = 'round';
  for (const r of droads) { if (r.kind === 2) continue; path(r.pts); g.lineWidth = Math.max(1, r.w * s); g.strokeStyle = r.kind === 0 ? '#4b505b' : '#666a74'; g.stroke(); }
  for (const b of dblocks) { g.fillStyle = b.special === 'europlaza' ? '#e8c88a' : b.special === 'cafe' ? '#f08a6a' : b.special === 'jinu' ? '#2fa59a' : '#8b8f9c'; g.fillRect(Math.floor(b.x * s), Math.floor((b.y - b.h * 0.3) * s), Math.ceil(b.w * s), Math.ceil((b.d + b.h * 0.3) * s)); }
  mini = c;
  return c;
}

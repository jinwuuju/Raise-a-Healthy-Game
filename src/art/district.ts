import { hash2, jinU, makeCanvas, pixelText } from './pixel';
import {
  APPROACH, BAND, DISTRICT_SIZE, carriageways, crossroads, crosswalks, dareas, dbuildings, droads, nearestS, pointAt, polyline, scanPoly, strokePolys,
  type DBuilding,
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
  for (const c of crosswalks) {
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
      if (!ch && budget > 0) { ch = bakeChunk(ix, iy); chunks.set(key, ch); budget--; }
      if (ch) g.drawImage(ch, ix * CHUNK - cx, iy * CHUNK - cy);
      else { g.fillStyle = '#cfc6b4'; g.fillRect(ix * CHUNK - cx, iy * CHUNK - cy, CHUNK, CHUNK); missing++; }
    }
  if (chunks.size > 96) for (const k of [...chunks.keys()].slice(0, chunks.size - 96)) chunks.delete(k);
  return missing;
}

/* ---------- buildings ---------- */
const TINTS: [string, string][] = [['#d9c3a5', '#e8d8bf'], ['#c98f74', '#dcae96'], ['#bfc3c4', '#d6d9d9'], ['#e6ddcc', '#f1ebdf'], ['#b9a48a', '#d0bea6'], ['#a9b4b8', '#c6cfd2']];
const CLASS_TINT: Record<number, [string, string]> = { 3: ['#e3c79c', '#efd9b4'], 4: ['#e9dcc0', '#f4ead6'], 5: ['#cfc6d8', '#e0d9e7'], 6: ['#e6cd8a', '#f0dca6'], 7: ['#d8c4dc', '#e7d8ea'], 8: ['#b9b9b4', '#cfcfca'] };
const SPECIAL: Record<string, [string, string]> = { jinu: ['#b4563f', '#cf9a84'], granite: ['#a9a59e', '#c6c2ba'], cafe: ['#e9e3d6', '#f3efe7'] };
const shadeHex = (h: string, f: number): RGB => hex(h).map(v => Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f))))) as RGB;

const sprites = new Map<number, HTMLCanvasElement>();
export function buildingSprite(b: DBuilding): HTMLCanvasElement {
  let c = sprites.get(b.id); if (c) return c;
  const W = Math.ceil(b.bbox.w) + 3, H = Math.ceil(b.bbox.h) + b.h + 3, ox = -b.bbox.x + 1, oy = -b.bbox.y + b.h + 1;
  const made = makeCanvas(W, H); c = made.c; const g = made.g, img = g.createImageData(W, H), d = img.data;
  const put = (col: RGB) => (x: number, y: number) => { const i = (y * W + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; };
  const [wall, roof] = (b.special && SPECIAL[b.special]) || CLASS_TINT[b.cls] || TINTS[b.id % TINTS.length]!;
  const foot = b.pts.map(p => ({ x: p.x + ox, y: p.y + oy })), top = foot.map(p => ({ x: p.x, y: p.y - b.h }));
  let area = 0; for (let i = 0; i < foot.length - 1; i++) area += foot[i]!.x * foot[i + 1]!.y - foot[i + 1]!.x * foot[i]!.y;
  const visible: [Point, Point, number][] = [];
  for (let i = 0; i < foot.length - 1; i++) {
    const a = foot[i]!, e = foot[i + 1]!, ex = e.x - a.x, ey = e.y - a.y, L = Math.hypot(ex, ey) || 1;
    const nx = (area > 0 ? -ey : ey) / L, ny = (area > 0 ? ex : -ex) / L;
    if (ny <= 0.05) continue;
    visible.push([a, e, nx]);
    scanPoly([a, e, { x: e.x, y: e.y - b.h }, { x: a.x, y: a.y - b.h }], W, H, put(shadeHex(wall, nx < -0.3 ? 0.1 : nx > 0.3 ? -0.14 : 0)));
  }
  // Floor lines and windows on the visible walls; commercial ground floors get a lighter shop band.
  const line = (a: Point, e: Point, lift: number, col: RGB, step = 1, len = 1) => {
    const L = Math.hypot(e.x - a.x, e.y - a.y);
    for (let t = 0; t <= L; t += step) for (let k = 0; k < len; k++) { const x = Math.round(a.x + (e.x - a.x) * t / L), y = Math.round(a.y + (e.y - a.y) * t / L - lift - k); if (x >= 0 && y >= 0 && x < W && y < H) put(col)(x, y); }
  };
  for (const [a, e] of visible) {
    line(a, e, 0, shadeHex(wall, -0.45));
    for (let f = 1; f < b.floors; f++) line(a, e, f * 8 - 4 + (b.h - b.floors * 8 - 4 > 0 ? 0 : 0), shadeHex(wall, -0.22), 1);
    for (let f = 0; f < b.floors; f++) {
      const lift = f * 8 + 3, L = Math.hypot(e.x - a.x, e.y - a.y);
      for (let t = 3; t + 3 < L; t += 6) {
        const x = Math.round(a.x + (e.x - a.x) * t / L), y = Math.round(a.y + (e.y - a.y) * t / L - lift);
        const col = f === 0 && b.cls === 1 ? hex('#a9c4cc') : hash2(b.id % 997, f * 31 + t, 5) < 0.12 ? hex('#e7d9a8') : hex('#7d97a1');
        for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 2; xx++) if (x + xx < W && y - yy >= 0) put(col)(x + xx, y - yy);
      }
    }
  }
  scanPoly(top, W, H, put(hex(roof)));
  for (let i = 0; i < top.length - 1; i++) line(top[i]!, top[i + 1]!, 0, shadeHex(roof, -0.4));
  for (const [a] of visible) for (let y = 0; y <= b.h; y++) { const x = Math.round(a.x), yy = Math.round(a.y) - y; if (x >= 0 && x < W && yy >= 0 && yy < H) put(shadeHex(wall, -0.4))(x, yy); }
  // A couple of rooftop units so roofs are not flat colour.
  for (let k = 0; k < Math.min(3, Math.floor(b.bbox.w * b.bbox.h / 2500)); k++) {
    const p = top[Math.floor(hash2(b.id % 991, k, 7) * (top.length - 1))]!, q = { x: (p.x * 2 + top.reduce((s, v) => s + v.x, 0) / top.length * 3) / 5, y: (p.y * 2 + top.reduce((s, v) => s + v.y, 0) / top.length * 3) / 5 };
    for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) put(y === 0 ? hex('#d9dcdb') : hex('#9aa2a3'))(Math.round(q.x) + x, Math.round(q.y) + y);
  }
  g.putImageData(img, 0, 0);
  // Signs for the buildings the story uses (game-original lettering; no real logos).
  const front = visible.slice().sort((p, q) => Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y) - Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y))[0];
  if (front && b.special === 'jinu') {
    const mx = Math.round((front[0].x + front[1].x) / 2), my = Math.round((front[0].y + front[1].y) / 2);
    g.fillStyle = '#2fa59a'; g.fillRect(mx - 12, my - 15, 24, 12); g.fillStyle = '#f07a5a'; g.fillRect(mx - 12, my - 4, 24, 2); jinU(g, mx - 6, my - 13, '#ffffff');
  }
  if (front && b.special === 'cafe') {
    const mx = Math.round((front[0].x + front[1].x) / 2), my = Math.round((front[0].y + front[1].y) / 2);
    g.fillStyle = '#2e2e33'; g.fillRect(mx - 14, my - 13, 28, 9); pixelText(g, 'B2BC', mx - 7, my - 11, '#f6efe2');
  }
  sprites.set(b.id, c);
  return c;
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
  for (const b of dbuildings) { path(b.pts); g.closePath(); g.fillStyle = b.special === 'europlaza' ? '#e8c88a' : b.special === 'cafe' ? '#f08a6a' : b.special === 'jinu' ? '#2fa59a' : '#8b8f9c'; g.fill(); }
  mini = c;
  return c;
}

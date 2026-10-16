import { describe, expect, it } from 'vitest';
import {
  DISTRICT_SIZE, MASK_CELL, buildMask, crosswalks, droads, lanes, loadDistrict, maskBlocked, pointAt, scanPoly, strokePolys, zebras,
  type Polyline,
} from '../../src/world/district';
import { buildSceneGrid, querySceneGrid } from '../../src/world/scene-index';
import { rooms } from '../../src/world/rooms';
import type { Rect } from '../../src/world/types';

// D102 lightening: faster lookups must give exactly the answers of the plain versions they replaced.
describe('D102 efficiency keeps results identical', () => {
  it('scene grid finds every box overlapping the view, in the original order', () => {
    let seed = 11; const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
    const boxes: Rect[] = Array.from({ length: 3000 }, () => ({ x: rnd() * 4200 - 100, y: rnd() * 4200 - 100, w: rnd() * 300, h: rnd() * 300 }));
    const grid = buildSceneGrid(4000, 4000, boxes);
    for (let q = 0; q < 300; q++) {
      const x = rnd() * 4400 - 200, y = rnd() * 4400 - 200, w = rnd() * 700, h = rnd() * 500;
      const exact = boxes.flatMap((b, i) => (b.x + b.w > x && b.x < x + w && b.y + b.h > y && b.y < y + h ? [i] : []));
      const got = querySceneGrid(grid, x, y, w, h);
      expect([...got].sort((a, b) => a - b)).toEqual(got);
      const set = new Set(got);
      expect(exact.every(i => set.has(i))).toBe(true);
    }
  });

  it('pointAt (binary search) matches the old linear scan on every traffic lane', () => {
    const linear = (pl: Polyline, s: number) => {
      const d = Math.max(0, Math.min(pl.len, s));
      let i = 1; while (i < pl.pts.length - 1 && pl.cum[i]! < d) i++;
      const a = pl.pts[i - 1]!, b = pl.pts[i]!, seg = pl.cum[i]! - pl.cum[i - 1]! || 1, t = (d - pl.cum[i - 1]!) / seg;
      return { p: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, dir: { x: (b.x - a.x) / seg, y: (b.y - a.y) / seg } };
    };
    expect(lanes.length).toBeGreaterThan(10);
    for (const l of lanes) for (let s = -20; s <= l.line.len + 20; s += 7.3) expect(pointAt(l.line, s)).toEqual(linear(l.line, s));
    for (const l of lanes) for (const s of l.line.cum) expect(pointAt(l.line, s)).toEqual(linear(l.line, s));
  });

  it('the one-bit collision mask blocks exactly the cells of the old byte mask and is 8 times smaller', () => {
    const m = buildMask(), w = Math.ceil(DISTRICT_SIZE / MASK_CELL), ref = new Uint8Array(w * w), s = 1 / MASK_CELL;
    const set = (v: number) => (x: number, y: number) => { ref[y * w + x] = v; };
    for (const r of droads) if (r.kind === 0 && !r.bridge) for (const q of strokePolys(r.pts, r.w)) scanPoly(q, w, w, set(1), s);
    for (const c of crosswalks) scanPoly(c.poly, w, w, set(0), s);
    for (const z of zebras) scanPoly(z.poly, w, w, set(0), s);
    expect(m.data.length).toBe(Math.ceil(w * w / 8));
    let blocked = 0;
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
      const b = maskBlocked(m, x * MASK_CELL + 1, y * MASK_CELL + 2);
      if (b !== (ref[y * w + x] === 1)) throw new Error('mask differs at cell ' + x + ',' + y);
      if (b) blocked++;
    }
    expect(blocked).toBeGreaterThan(1000);
    expect(maskBlocked(m, -1, 10)).toBe(true);
    expect(maskBlocked(m, 10, DISTRICT_SIZE + 1)).toBe(true);
    expect(rooms.district.mask!.data.length).toBe(m.data.length);
  });

  it('overlapping district loads share one initialisation', async () => {
    const before = lanes;
    await Promise.all([loadDistrict(), loadDistrict()]);
    expect(lanes).toBe(before);
  });
});

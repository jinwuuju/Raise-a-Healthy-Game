import { describe, expect, it } from 'vitest';
import { rooms } from '../../src/world/rooms';
import { canStand, crossingAt } from '../../src/world/collision';
import { findPath } from '../../src/world/path';
import { anchors, carriageways, crossroads, crosswalks, dbuildings, droads, inPoly, nearestS, pointAt, polyline, specialBuilding } from '../../src/world/district';
import ledger from '../../data/world/district-buildings.v0.1.json';

const M = 16 / 3; // px per metre
const d = rooms.district;
const metres = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y) / M;

describe('D096 real-scale district', () => {
  it('is drawn at 1 tile = 3 m with real distances', () => {
    expect(d.cols * 16).toBe(3840); // 720 m square
    const euro = { x: anchors.euro.x + anchors.euro.w / 2, y: anchors.euro.y + anchors.euro.d / 2 };
    expect(metres(euro, crossroads)).toBeGreaterThan(95); expect(metres(euro, crossroads)).toBeLessThan(135); // ~110 m to Eulji crossroads
    const cafe = specialBuilding('cafe')!;
    const c = { x: cafe.bbox.x + cafe.bbox.w / 2, y: cafe.bbox.y + cafe.bbox.h / 2 };
    expect(metres(euro, c)).toBeGreaterThan(60); expect(metres(euro, c)).toBeLessThan(95); // ~78 m north-west
    expect(c.x).toBeLessThan(euro.x); expect(c.y).toBeLessThan(euro.y);
    expect(dbuildings.length).toBeGreaterThan(900); expect(droads.length).toBeGreaterThan(150);
  });

  it('blocks the big carriageways except on the crosswalks, and every footprint', () => {
    for (const cw of Object.values(carriageways)) {
      const pl = polyline(cw.pts), far = pointAt(pl, nearestS(pl, crossroads) - 400).p;
      expect(canStand('district', far)).toBe(false);
    }
    expect(crosswalks).toHaveLength(4);
    for (const c of crosswalks) {
      const mid = { x: (c.ends[0].x + c.ends[1].x) / 2, y: (c.ends[0].y + c.ends[1].y) / 2 };
      expect(canStand('district', mid), c.id).toBe(true);
      expect(crossingAt('district', mid)?.road, c.id).toBe(c.road);
    }
    let checked = 0;
    for (const b of dbuildings) {
      if (b.special === 'europlaza' || b.bbox.w < 20 || b.bbox.h < 20) continue;
      const cx = b.bbox.x + b.bbox.w / 2, cy = b.bbox.y + b.bbox.h / 2;
      if (!inPoly({ x: cx, y: cy }, b.pts)) continue;
      expect(canStand('district', { x: cx, y: cy })).toBe(false); if (++checked > 200) break;
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('walks from Euro Plaza to the cafe and to the crossroads on foot', () => {
    const cafeDoor = d.doors.find(x => x.id === 'cafe-door')!.zone;
    expect(findPath('district', d.spawn, { x: cafeDoor.x + cafeDoor.w / 2, y: cafeDoor.y + cafeDoor.h / 2 }).length).toBeGreaterThan(0);
    // Both ends of every crosswalk are reachable on foot from Euro Plaza (the far side through another crosswalk).
    for (const c of crosswalks) for (const e of c.ends) expect(findPath('district', d.spawn, e).length, c.id).toBeGreaterThan(0);
    expect(rooms.lobby.doors.find(x => x.id === 'front')!.to).toBe('district');
    expect(rooms.cafe.doors[0]!.to).toBe('district');
  });

  it('keeps the building ledger names empty for the user to fill in', () => {
    expect(ledger.buildings.length).toBe(dbuildings.length);
    expect(ledger.buildings.every(b => b.name === null)).toBe(true);
    expect(ledger.buildings.filter(b => b.special).map(b => b.special).sort()).toEqual(['cafe', 'europlaza', 'granite', 'jinu']);
  });

  it('reports coordinates used by the browser tests', () => {
    console.log(JSON.stringify({ spawn: d.spawn, cafeDoor: d.doors[1]!.zone, cross: crosswalks.map(c => ({ id: c.id, ends: c.ends.map(e => [Math.round(e.x), Math.round(e.y)]) })) }));
  });
});

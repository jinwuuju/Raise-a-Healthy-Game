import { describe, expect, it } from 'vitest';
import { rooms } from '../../src/world/rooms';
import { canStandIn, doorAt } from '../../src/world/collision';
import { AREA_WATER, dareas, exits, inPoly, underpasses, zebras, DISTRICT_SIZE } from '../../src/world/district';
import { newState, validateState } from '../../src/domain/state';

/**
 * D104: no sizeable part of the district may be cut off from Euro Plaza by big roads. A reporter who walked far away
 * (a real save stood north of Olympic-daero with no crossing back) must always be able to walk home. Uses the game's own
 * collision on an 8 px grid; tiny pockets (courtyards between blocks, kerb slivers) are ignored.
 */
describe('district reachability (D104)', () => {
  const r = rooms.district, C = 8, n = Math.floor(DISTRICT_SIZE / C);
  const ok = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) ok[j * n + i] = canStandIn(r, { x: i * C + 4, y: j * C + 4 }) ? 1 : 0;
  const comp = new Int32Array(n * n).fill(-1), sizes: number[] = [], thin: boolean[] = [], q = new Int32Array(n * n);
  for (let s = 0; s < n * n; s++) {
    if (!ok[s] || comp[s]! >= 0) continue;
    const id = sizes.length; let h = 0, t = 0; q[t++] = s; comp[s] = id;
    while (h < t) {
      const c = q[h++]!, x = c % n, y = (c / n) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
        const k = ny * n + nx; if (!ok[k] || comp[k]! >= 0) continue;
        if (!canStandIn(r, { x: (x + nx) / 2 * C + 4, y: (y + ny) / 2 * C + 4 })) continue;
        comp[k] = id; q[t++] = k;
      }
    }
    sizes.push(t);
    let x0 = n, y0 = n, x1 = 0, y1 = 0;
    for (let i = 0; i < t; i++) { const c = q[i]!, x = c % n, y = (c / n) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    // Average width in px = area / length of the bounding diagonal. Traffic medians between two carriageways are long thin
    // strips nobody can enter (no crossing lands on them); they are not places a reporter can be stranded in.
    thin.push(t * C * C / (Math.hypot(x1 - x0 + 1, y1 - y0 + 1) * C) < 72);
  }
  const raw = (p: { x: number; y: number }) => comp[Math.floor(p.y / C) * n + Math.floor(p.x / C)]!;
  // D105: underpasses are door pairs inside the district; walking into one comes out at the other side.
  const parent = sizes.map((_, i) => i), find = (i: number): number => parent[i] === i ? i : (parent[i] = find(parent[i]!));
  const merged = sizes.slice();
  for (const d of r.doors) if (d.to === 'district') {
    let a = -1;
    for (let y = d.zone.y; y < d.zone.y + d.zone.h && a < 0; y += 2) for (let x = d.zone.x; x < d.zone.x + d.zone.w && a < 0; x += 2) { const c = raw({ x, y }); if (c >= 0 && canStandIn(r, { x, y })) a = c; }
    const b = raw(d.arrive);
    if (a >= 0 && b >= 0 && find(a) !== find(b)) { merged[find(b)]! += merged[find(a)]!; parent[find(a)] = find(b); }
  }
  const at = (p: { x: number; y: number }) => { const c = raw(p); return c < 0 ? -1 : find(c); };
  const home = at(exits.euroOut);

  it('every sizeable walkable area connects to the Euro Plaza exit', () => {
    expect(home).toBeGreaterThanOrEqual(0);
    const cutOff = sizes.map((s, id) => ({ s, id })).filter(c => c.s >= 150 && find(c.id) !== home && !thin[c.id]);
    expect(cutOff).toEqual([]);
  });

  it('the far north-west spots from real saves (2026-10-17, 2026-10-18) can walk back', () => {
    expect(at({ x: 2577, y: 980 })).toBe(home);
    expect(at({ x: 3151, y: 175 })).toBe(home);
  });

  it('the Han river is water: drawn as an area and not walkable (D105)', () => {
    const river = dareas.filter(a => a.cls === AREA_WATER);
    expect(river.length).toBe(1);
    const p = { x: 600, y: 600 }; // far north-west corner, north of Jamwon Hangang Park
    expect(inPoly(p, river[0]!.pts)).toBe(true);
    expect(canStandIn(r, p)).toBe(false);
    expect(canStandIn(r, { x: 2577, y: 980 })).toBe(true); // the riverside park itself stays walkable
  });

  it('the expressway crossing is an underpass (나들목), not a zebra, and both stairs lead across (D105)', () => {
    expect(underpasses.length).toBeGreaterThanOrEqual(1);
    for (const u of underpasses) expect(zebras.some(z => z.ends[0].x === u.ends[0].x && z.ends[0].y === u.ends[0].y)).toBe(false);
    const doors = r.doors.filter(d => d.id.startsWith('under-'));
    expect(doors.length).toBe(underpasses.length * 2);
    for (const d of doors) {
      expect(canStandIn(r, d.arrive), d.id).toBe(true);
      expect(doorAt('district', d.arrive), d.id).toBeUndefined(); // arriving never re-enters a stair
    }
  });

  it('a saved spot that became water or road reopens at Euro Plaza (D105)', () => {
    const s = validateState({ ...newState(), started: true, at: { room: 'district', x: 600, y: 600, facing: 'down' } });
    expect(s.at).toEqual({ room: 'district', x: exits.euroOut.x, y: exits.euroOut.y, facing: 'down' });
  });
});

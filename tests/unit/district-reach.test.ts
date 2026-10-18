import { describe, expect, it } from 'vitest';
import { rooms } from '../../src/world/rooms';
import { canStandIn } from '../../src/world/collision';
import { exits, DISTRICT_SIZE } from '../../src/world/district';

/**
 * D104: no sizeable part of the district may be cut off from Euro Plaza by big roads. A reporter who walked far away
 * (a real save stood north of Olympic-daero with no crossing back) must always be able to walk home. Uses the game's own
 * collision on an 8 px grid; tiny pockets (courtyards between blocks, kerb slivers) are ignored.
 */
describe('district reachability (D104)', () => {
  const r = rooms.district, C = 8, n = Math.floor(DISTRICT_SIZE / C);
  const ok = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) ok[j * n + i] = canStandIn(r, { x: i * C + 4, y: j * C + 4 }) ? 1 : 0;
  const comp = new Int32Array(n * n).fill(-1), sizes: number[] = [], q = new Int32Array(n * n);
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
  }
  const at = (p: { x: number; y: number }) => comp[Math.floor(p.y / C) * n + Math.floor(p.x / C)]!;
  const home = at(exits.euroOut);

  it('every sizeable walkable area connects to the Euro Plaza exit', () => {
    expect(home).toBeGreaterThanOrEqual(0);
    const cutOff = sizes.map((s, id) => ({ s, id })).filter(c => c.s >= 150 && c.id !== home);
    expect(cutOff).toEqual([]);
  });

  it('the far north-west spots from real saves (2026-10-17, 2026-10-18) can walk back', () => {
    expect(at({ x: 2577, y: 980 })).toBe(home);
    expect(at({ x: 3151, y: 175 })).toBe(home);
  });
});

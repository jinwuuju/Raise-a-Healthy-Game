import { describe, expect, it } from 'vitest';
import { canStand, doorAt, moveWithCollision } from '../../src/world/collision';
import { findPath } from '../../src/world/path';
import { rooms } from '../../src/world/rooms';
import { inRect, roomIds } from '../../src/world/types';

describe('map integrity', () => {
  for (const id of roomIds) {
    const room = rooms[id];
    it(`${id}: spawn is standable and not inside a door`, () => {
      expect(canStand(id, room.spawn)).toBe(true);
      expect(doorAt(id, room.spawn)).toBeUndefined();
    });
    for (const d of room.doors) {
      it(`${id}/${d.id}: arrival in ${d.to} is standable and outside every door zone`, () => {
        expect(canStand(d.to, d.arrive)).toBe(true);
        for (const other of rooms[d.to].doors) expect(inRect(d.arrive, other.zone)).toBe(false);
      });
      it(`${id}/${d.id}: door zone is reachable on foot from spawn`, () => {
        const goal = { x: d.zone.x + d.zone.w / 2, y: d.zone.y + d.zone.h - 2 };
        const path = findPath(id, room.spawn, goal);
        expect(path.length).toBeGreaterThan(0);
        const end = path[path.length - 1]!;
        expect(Math.hypot(end.x - goal.x, end.y - goal.y)).toBeLessThan(8);
      });
    }
    for (const t of room.targets) {
      it(`${id}/${t.id}: target can be approached within its radius`, () => {
        let ok = false;
        for (let r = 0; r <= t.r - 2 && !ok; r += 2) for (let a = 0; a < 16 && !ok; a++) {
          const q = { x: t.x + Math.cos(a / 16 * Math.PI * 2) * r, y: t.y + Math.sin(a / 16 * Math.PI * 2) * r };
          if (canStand(id, q) && findPath(id, room.spawn, q).length) ok = true;
        }
        expect(ok).toBe(true);
      });
    }
  }
});

describe('street rules', () => {
  it('wide roads are crossed only on crosswalks', () => {
    expect(canStand('street', { x: 432, y: 300 })).toBe(false);
    expect(canStand('street', { x: 432, y: 432 })).toBe(true);
    expect(canStand('street', { x: 200, y: 470 })).toBe(false);
    expect(canStand('street', { x: 350, y: 470 })).toBe(true);
  });
  it('the narrow lane in front of Euro Plaza is walkable', () => {
    expect(canStand('street', { x: 200, y: 270 })).toBe(true);
  });
  it('walks from Euro Plaza to the cafe door', () => {
    const path = findPath('street', { x: 292, y: 254 }, { x: 116, y: 403 });
    expect(path.length).toBeGreaterThan(0);
  });
  it('collision slides along walls instead of stopping', () => {
    const r = moveWithCollision('newsroom', { x: 212, y: 52 }, 6, -4);
    expect(r.x).toBeGreaterThan(212);
    expect(r.y).toBeGreaterThanOrEqual(51);
  });
});

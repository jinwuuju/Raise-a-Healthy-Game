import { describe, expect, it } from 'vitest';
import { canStand, doorAt, moveWithCollision } from '../../src/world/collision';
import { clearLine, findPath } from '../../src/world/path';
import { rooms } from '../../src/world/rooms';
import { inRect, overlap, roomIds } from '../../src/world/types';
import { inspectLabels, lookText } from '../../src/application/story';

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
  it('every returned segment is traversable, including the first grid connection', () => {
    for (const id of roomIds) {
      const room = rooms[id];
      const step = room.cols > 100 ? 1400 : 24; // the real-scale district is sampled sparsely
      for (let y = 24; y < room.rows * 16; y += step) for (let x = 24; x < room.cols * 16; x += step) {
        if (!canStand(id, { x, y })) continue;
        const from = { x, y };
        const path = findPath(id, from, room.spawn);
        let prev = from;
        for (const next of path) {
          expect(clearLine(id, prev, next), JSON.stringify({ id, from, prev, next })).toBe(true);
          prev = next;
        }
      }
    }
    // D104: the north-west of the district is now connected, so its sample points find (long) paths instead of failing fast.
  }, 180000);
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

describe('street around Euro Plaza from the user photos (D088)', () => {
  const street = rooms.street;
  const lane = { x: 0, y: 256, w: 384, h: 32 };
  const byId = (id: string) => street.buildings.find(b => b.id === id)!;
  it('the pocket park, fountain and benches across the lane are gone', () => {
    expect(street.props.some(p => p.kind === 'fountain' || p.kind === 'parktree' || p.kind === 'bench' || p.kind === 'flowerbed')).toBe(false);
    const ids = street.targets.map(t => t.id);
    expect(ids).not.toContain('fountain');
    expect(ids).not.toContain('park-bench');
  });
  it('Jin-U and the granite block stand right across the lane, opposite Euro Plaza, with 151-gil between them', () => {
    const euro = byId('europlaza'), jinu = byId('jinu'), granite = byId('granite');
    for (const b of [jinu, granite]) {
      expect(b.block).toBe(true);
      expect(b.y - b.h).toBeGreaterThanOrEqual(lane.y + lane.h);
      expect(b.y - b.h).toBeLessThanOrEqual(lane.y + lane.h + 24);
      expect(b.x < euro.x + euro.w && b.x + b.w > euro.x).toBe(true);
    }
    expect(granite.x - (jinu.x + jinu.w)).toBe(32);
    expect(canStand('street', { x: 240, y: 340 })).toBe(true);
    expect(canStand('street', { x: 184, y: 340 })).toBe(false);
    expect(canStand('street', { x: 300, y: 340 })).toBe(false);
  });
  it('no building picture covers the narrow lane in front of Euro Plaza', () => {
    for (const b of street.buildings) expect(overlap({ x: b.x, y: b.y - b.h, w: b.w, h: b.d + b.h }, lane), b.id).toBe(false);
  });
  it('151-gil leads from the lane down to Dosan-daero, and the side street runs north along the tower', () => {
    expect(findPath('street', { x: 240, y: 272 }, { x: 240, y: 420 }).length).toBeGreaterThan(0);
    expect(findPath('street', street.spawn, { x: 176, y: 40 }).length).toBeGreaterThan(0);
    expect(canStand('street', { x: 176, y: 120 })).toBe(true);
  });
  it('every street target has text and a notebook label', () => {
    for (const t of street.targets) { expect(lookText[t.id], t.id).toBeTruthy(); expect(inspectLabels[t.id], t.id).toBeTruthy(); }
  });
});

import { describe, expect, it } from 'vitest';
import { paintGrid } from '../../src/art/avatar';
import { defaultAppearance, outfits, starterOutfits, type OutfitId } from '../../src/domain/appearance';
import { BAG_MAX, buyItem, buyOutfit, canBuyOutfit, jinuItems, tailorItems } from '../../src/domain/shop';
import { newState, validateState, type GameState } from '../../src/domain/state';
import { canStand, doorAt } from '../../src/world/collision';
import { anchors, exits } from '../../src/world/district';
import { findPath } from '../../src/world/path';
import { rooms } from '../../src/world/rooms';
import type { RoomId } from '../../src/world/types';

const at = (room: RoomId, gold = 1000): GameState => {
  const s = newState(), r = rooms[room];
  return { ...s, started: true, gold, at: { room, x: r.spawn.x, y: r.spawn.y, facing: r.spawnFacing } };
};

// D103 (user): enter Jin-U and buy things, and a clothes shop near Euro Plaza.
describe('D103 shop doors in the real-scale district', () => {
  it('both shop doors can be walked into from Euro Plaza and lead back outside', () => {
    for (const [door, out, room] of [[anchors.jinuDoor, exits.jinuOut, 'jinu'], [anchors.tailorDoor, exits.tailorOut, 'tailor']] as const) {
      expect(canStand('district', out)).toBe(true);
      expect(doorAt('district', out)).toBeUndefined();
      const inDoor = { x: door.x + door.w / 2, y: door.y + door.h - 4 };
      expect(canStand('district', inDoor)).toBe(true);
      expect(doorAt('district', inDoor)?.to).toBe(room);
      expect(findPath('district', exits.euroOut, out).length).toBeGreaterThan(0);
      expect(findPath('district', out, inDoor).length).toBeGreaterThan(0);
      const r = rooms[room];
      expect(canStand(room, r.spawn)).toBe(true);
      const exit = r.doors[0]!, exitPt = { x: exit.zone.x + exit.zone.w / 2, y: exit.zone.y + 4 };
      expect(exit.to).toBe('district');
      expect(findPath(room, r.spawn, exitPt).length).toBeGreaterThan(0);
      for (const t of r.targets) expect(findPath(room, r.spawn, { x: t.x, y: t.y }).length, room + ':' + t.id).toBeGreaterThan(0);
    }
    expect(rooms.district.buildings.find(b => b.id === 'tailor')?.kind).toBe('tailor');
    expect(Math.hypot(anchors.tailorDoor.x - anchors.euroDoor.x, anchors.tailorDoor.y - anchors.euroDoor.y)).toBeLessThan(300); // near Euro Plaza
  });
});

describe('D103 Jin-U purchases', () => {
  it('buys only inside the store, once per command, with gold, bag and ledger together', () => {
    const item = jinuItems[0]!;
    expect(() => buyItem(at('cafe'), item.id, 'c1')).toThrow();
    const s0 = at('jinu', 100);
    const s1 = buyItem(s0, item.id, 'c1');
    expect([s1.gold, s1.shop.bag[item.id], s1.shop.jinuCount, s1.ledger.includes('shop.jinu.c1')]).toEqual([100 - item.price, 1, 1, true]);
    expect(buyItem(s1, item.id, 'c1')).toBe(s1); // the same command never charges twice
    const s2 = buyItem(s1, item.id, 'c2');
    expect(s2.shop.bag[item.id]).toBe(2);
    expect(() => buyItem(at('jinu', 0), item.id, 'c3')).toThrow(/골드/);
    expect(() => buyItem({ ...s0, shop: { ...s0.shop, bag: { [item.id]: BAG_MAX } } }, item.id, 'c4')).toThrow();
    expect(() => buyItem(s0, 'nope', 'c5')).toThrow();
    expect(validateState(JSON.parse(JSON.stringify(s2))).shop).toEqual(s2.shop);
  });
  it('reads older saves without a shop record and rejects broken ones', () => {
    const s = JSON.parse(JSON.stringify(at('jinu'))); delete s.shop;
    expect(validateState(s).shop).toEqual({ bag: {}, jinuCount: 0, tailorCount: 0, last: null });
    expect(() => validateState({ ...s, shop: { bag: { unknown: 1 }, jinuCount: 0, tailorCount: 0, last: null } })).toThrow();
    expect(() => validateState({ ...s, shop: { bag: {}, jinuCount: -1, tailorCount: 0, last: null } })).toThrow();
  });
});

describe('D103 Orbit Tailor', () => {
  it('sells every new outfit once, wears it on request and keeps the save valid', () => {
    expect(tailorItems.map(i => i.id).sort()).toEqual((Object.keys(outfits) as OutfitId[]).filter(id => !starterOutfits.includes(id)).sort());
    for (const i of tailorItems) expect(i.price).toBeGreaterThanOrEqual(200), expect(i.price).toBeLessThanOrEqual(500);
    const s0 = at('tailor', 600), coat = tailorItems.find(i => i.id === 'coat')!;
    expect(() => buyOutfit(at('jinu'), 'coat', true)).toThrow();
    const kept = buyOutfit(s0, 'coat', false);
    expect([kept.gold, kept.owned.includes('coat'), kept.avatar.look.outfit]).toEqual([600 - coat.price, true, s0.avatar.look.outfit]);
    expect(canBuyOutfit(kept, coat)).toBe('보유 중');
    const worn = buyOutfit(kept, 'coat', true); // already owned: wearing costs nothing
    expect([worn.gold, worn.avatar.look.outfit]).toEqual([kept.gold, 'coat']);
    expect(buyOutfit(worn, 'coat', true)).toBe(worn);
    const denim = buyOutfit(worn, 'denim', true);
    expect([denim.avatar.look.outfit, denim.owned.length, denim.shop.tailorCount]).toEqual(['denim', 5, 2]);
    expect(() => buyOutfit(at('tailor', 10), 'denim', true)).toThrow(/골드/);
    const back = validateState(JSON.parse(JSON.stringify(denim)));
    expect([back.avatar.look.outfit, back.owned]).toEqual(['denim', denim.owned]);
  });
  it('every outfit has its own pixels in all four directions', () => {
    for (const dir of ['down', 'up', 'right'] as const) {
      const seen = new Map<string, string>();
      for (const outfit of Object.keys(outfits) as OutfitId[]) {
        const key = paintGrid({ ...defaultAppearance('male'), outfit }, dir, 0).join(',');
        expect(seen.get(key), outfit + ' ' + dir + ' looks like ' + seen.get(key)).toBeUndefined();
        seen.set(key, outfit);
      }
    }
  });
});

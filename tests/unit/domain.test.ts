import { describe, it, expect } from 'vitest';
import { newState, validateState, grantOnce } from '../../src/domain/state';
import { canStand } from '../../src/domain/world';
describe('P1 domain boundaries', () => {
  it('rejects unsupported, malformed and colliding save data', () => {
    const s = newState();
    for (const patch of [{ schemaVersion: 4 }, { gold: -1 }, { totalXp: 0.5 }, { avatar: { preset: 'invalid', name: 'x' } }, { safeLocation: { room: 'newsroom', x: 280, y: 140 } }, { inspected: ['x', 'x'] }]) {
      expect(() => validateState({ ...s, ...patch })).toThrow();
    }
    expect(validateState(s)).toEqual(s);
  });
  it('uses foot collision and rejects non-finite positions', () => {
    expect(canStand('newsroom', { x: 300, y: 185 })).toBe(true);
    expect(canStand('newsroom', { x: 300, y: 135 })).toBe(false);
    expect(canStand('newsroom', { x: Infinity, y: 80 })).toBe(false);
    expect(canStand('newsroom', { x: 20, y: 80 })).toBe(false);
  });
  it('applies an isolated reward fixture once, with safe numeric boundaries', () => {
    const s = newState(); const a = grantOnce(s, 'fixture.first', { xp: 100, gold: 100 });
    expect(grantOnce(a, 'fixture.first', { xp: 100, gold: 100 })).toBe(a);
    expect(a.completionLedger).toEqual(['fixture.first']); expect(a.gold).toBe(100); expect(s.gold).toBe(0);
    expect(() => grantOnce(s, 'x', { xp: -1, gold: 1 })).toThrow();
    expect(() => grantOnce({ ...s, gold: Number.MAX_SAFE_INTEGER }, 'x', { xp: 0, gold: 1 })).toThrow();
  });
});

import { orderDrink } from '../../src/domain/cafe';
it('cafe free welcome is single-use, water stays accessible at zero gold and paid orders are idempotent', () => {
  const state = newState(); state.safeLocation = { room: 'cafe', x: 300, y: 185 };
  const welcome = orderDrink(state, 'welcome', 'first');
  expect(welcome.gold).toBe(0); expect(welcome.cafe.welcomeUsed).toBe(true); expect(welcome.totalXp).toBe(0);
  expect(orderDrink(welcome, 'welcome', 'first')).toBe(welcome);
  expect(() => orderDrink(welcome, 'welcome', 'second')).toThrow('이미');
  expect(() => orderDrink(welcome, 'latte', 'third')).toThrow('부족');
  expect(orderDrink(welcome, 'water', 'water').cafe.orderCount).toBe(2);
  const paid = orderDrink({ ...welcome, gold: 50 }, 'latte', 'paid');
  expect(paid.gold).toBe(25); expect(orderDrink(paid, 'latte', 'paid')).toBe(paid);
});
it('migrates foundation schema 1 without changing progress and rejects malformed cafe records', () => {
  const state = newState();
  const legacy = { ...state, schemaVersion: 1, contentVersion: 'foundation-1', balanceVersion: 'none', gold: 150, totalXp: 100 };
  const migrated = validateState(legacy);
  expect(migrated).toMatchObject({ schemaVersion: 3, gold: 150, totalXp: 100, revision: 0 });
  expect(() => validateState({ ...state, cafe: { ...state.cafe, orderCount: -1 } })).toThrow();
});
import { findWalkPath } from '../../src/game/systems/pathfinding';
it('click-walk routes stay in traversable cells and use crossings rather than traffic lanes', () => {
  const path = findWalkPath('street', { x: 736, y: 712 }, { x: 1040, y: 712 });
  expect(path.length).toBeGreaterThan(0);
  expect(path.every(p => canStand('street', p))).toBe(true);
  expect(path.some(p => p.x > 800 && p.x < 992 && p.y >= 752 && p.y <= 784)).toBe(true);
  expect(findWalkPath('street', { x: 736, y: 712 }, { x: 850, y: 600 })).toEqual([]);
});
import { defaultAppearance,validateAppearance } from '../../src/domain/appearance';
import { doorAt } from '../../src/domain/world';
it('appearance choices and migration preserve progression while rejecting malformed looks',()=>{
  const appearance={...defaultAppearance('alien'),hairId:'ears' as const,skinId:'lilac' as const};
  expect(validateAppearance(appearance,'alien')).toEqual(appearance);
  expect(()=>validateAppearance({...appearance,skinId:'toString'},'alien')).toThrow();
  const current=newState();expect(validateState(current).avatar.appearance).toEqual(defaultAppearance('male'));
  expect(doorAt('street',{x:658,y:694})?.id).toBe('building-return');
  expect(doorAt('street',{x:658,y:720})).toBeUndefined();
});

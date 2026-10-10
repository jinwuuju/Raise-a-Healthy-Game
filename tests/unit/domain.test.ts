import { describe, expect, it } from 'vitest';
import { defaultAppearance, validateAppearance } from '../../src/domain/appearance';
import { orderDrink } from '../../src/domain/cafe';
import { grantOnce, newState, validateState } from '../../src/domain/state';
import { SaveStore } from '../../src/infrastructure/save';

class Mem implements Storage {
  m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}

describe('state', () => {
  it('round-trips through JSON and validation', () => {
    const s = { ...newState(), started: true };
    expect(validateState(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it('rejects unknown versions and impossible positions', () => {
    expect(() => validateState({ ...newState(), schemaVersion: 3 })).toThrow();
    expect(() => validateState({ ...newState(), at: { room: 'street', x: 432, y: 300, facing: 'down' } })).toThrow();
  });
  it('drops unknown imported fields', () => {
    const v = validateState({ ...newState(), injected: 'x' }) as unknown as Record<string, unknown>;
    expect(v.injected).toBeUndefined();
  });
  it('keeps preset-specific appearance rules', () => {
    expect(() => validateAppearance({ ...defaultAppearance('male'), hair: 'buds' }, 'male')).toThrow();
    expect(validateAppearance(defaultAppearance('alien'), 'alien').hair).toBe('buds');
  });
  it('grants a reward key only once', () => {
    const a = grantOnce(newState(), 'q.test', { xp: 10, gold: 5 });
    const b = grantOnce(a, 'q.test', { xp: 10, gold: 5 });
    expect([b.totalXp, b.gold]).toEqual([10, 5]);
  });
});

describe('cafe', () => {
  const inCafe = () => ({ ...newState(), at: { room: 'cafe' as const, x: 240, y: 168, facing: 'up' as const } });
  it('gives the welcome coffee once and water for free', () => {
    const a = orderDrink(inCafe(), 'welcome', 'c1');
    expect(a.cafe.welcomeUsed).toBe(true);
    expect(() => orderDrink(a, 'welcome', 'c2')).toThrow();
    expect(orderDrink(a, 'water', 'c3').gold).toBe(0);
  });
  it('blocks paid drinks without gold and ignores repeated commands', () => {
    expect(() => orderDrink(inCafe(), 'latte', 'c4')).toThrow();
    const a = orderDrink({ ...inCafe(), gold: 30 }, 'latte', 'c5');
    expect(orderDrink(a, 'latte', 'c5')).toBe(a);
    expect(a.gold).toBe(5);
  });
  it('only orders inside the cafe', () => { expect(() => orderDrink(newState(), 'water', 'c6')).toThrow(); });
});

describe('save store', () => {
  it('saves, loads and falls back to a backup when the current slot is corrupted', () => {
    const mem = new Mem(), store = new SaveStore(mem);
    const s = { ...newState(), started: true };
    store.save(s);
    store.save({ ...s, revision: 2 });
    expect(store.load().state?.revision).toBe(2);
    mem.setItem('medical-quest.v4.current', '{broken');
    expect(() => store.load()).not.toThrow();
    expect(mem.getItem('medical-quest.v4.corrupt-original')).toBe('{broken');
  });
});

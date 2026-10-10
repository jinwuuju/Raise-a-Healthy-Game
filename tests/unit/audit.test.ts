import { describe, expect, it, vi } from 'vitest';
import { Game } from '../../src/application/game';
import { orderDrink } from '../../src/domain/cafe';
import { grantOnce, newState, validateState, type GameState } from '../../src/domain/state';
import { SaveStore } from '../../src/infrastructure/save';
import { canStand, moveWithCollision } from '../../src/world/collision';

const CURRENT = 'medical-quest.v4.current';
class StorageStub implements Storage {
  data = new Map<string, string>();
  failRead = false;
  failWrite = false;
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  getItem(k: string) { if (this.failRead) throw new Error('read denied'); return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { if (this.failWrite) throw new Error('quota exceeded'); this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

describe('save failure and recovery regressions', () => {
  it('timestamps autosaved movement and advances its revision', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
      const game = new Game(new SaveStore(new StorageStub())); game.flag('met-editor');
      const before = game.state.revision, at = game.state.at;
      vi.advanceTimersByTime(8000);
      game.setPosition(at.room, at.x + 1, at.y, at.facing);
      expect(game.persist()).toBe(true);
      expect(game.state.revision).toBe(before + 1);
      expect(game.state.updatedAt).toBe('2026-10-10T12:00:08.000Z');
    } finally { vi.useRealTimers(); }
  });
  it('boots with a visible error when storage reads fail', () => {
    const storage = new StorageStub(); storage.failRead = true;
    const game = new Game(new SaveStore(storage));
    expect(game.lastError).toBeTruthy();
  });
  it('recovers a valid backup even if preserving the corrupt original fails', () => {
    const storage = new StorageStub();
    storage.setItem(CURRENT, '{broken');
    storage.setItem('medical-quest.v4.backup1', JSON.stringify(newState()));
    storage.failWrite = true;
    const loaded = new SaveStore(storage).load();
    expect(loaded.state).not.toBeNull();
    expect(loaded.error).toContain('보관하지 못');
    expect(storage.data.get(CURRENT)).toBe('{broken');
  });
  it('keeps progress dirty and retries after a failed save without requiring movement', () => {
    const storage = new StorageStub(), game = new Game(new SaveStore(storage));
    storage.failWrite = true; game.flag('met-editor');
    expect(game.needsSave).toBe(true);
    storage.failWrite = false;
    expect(game.persist()).toBe(true);
    expect(game.needsSave).toBe(false);
    expect(JSON.parse(storage.getItem(CURRENT)!).flags).toContain('met-editor');
  });
  it('does not replace live state or freeze position if import cannot be saved', () => {
    const storage = new StorageStub(), game = new Game(new SaveStore(storage));
    game.flag('met-editor');
    const before = game.state;
    storage.failWrite = true;
    expect(() => game.importState({ ...before, gold: 99 })).toThrow();
    expect(game.state).toEqual(before);
    const at = before.at;
    game.setPosition(at.room, at.x + 1, at.y, at.facing);
    expect(game.state.at.x).toBe(at.x + 1);
  });
  it('always backs up the current live state when importing inside the rotation interval', () => {
    const storage = new StorageStub(), game = new Game(new SaveStore(storage));
    game.flag('met-editor'); game.flag('reported-back');
    const at = game.state.at;
    game.setPosition(at.room, at.x + 1, at.y, at.facing);
    const before = game.state;
    game.importState({ ...newState(), started: true });
    expect(game.backups()).toContainEqual(before);
  });
  it('rejects a stale writer without overwriting newer progress', () => {
    const storage = new StorageStub();
    const a = new Game(new SaveStore(storage)), b = new Game(new SaveStore(storage));
    a.flag('met-editor');
    b.flag('stale');
    expect(b.lastError).toBeTruthy();
    expect(JSON.parse(storage.getItem(CURRENT)!).flags).toEqual(['met-editor']);
  });
  it('never overwrites an unread corrupt original if preservation failed', () => {
    const storage = new StorageStub(); storage.setItem(CURRENT, '{broken'); storage.failWrite = true;
    const game = new Game(new SaveStore(storage));
    storage.failWrite = false;
    expect(game.persist()).toBe(false);
    expect(storage.getItem(CURRENT)).toBe('{broken');
  });
});

describe('domain and collision regressions', () => {
  it('can continue saving after 2000 legitimate cafe orders without losing command deduplication', () => {
    let s: GameState = { ...newState(), at: { room: 'cafe', x: 240, y: 168, facing: 'up' } };
    for (let i = 0; i < 2001; i++) s = orderDrink(s, 'water', 'water' + i);
    expect(validateState(s).cafe.orderCount).toBe(2001);
    expect(orderDrink(s, 'water', 'water0')).toBe(s);
  });
  it('rejects sparse progress arrays', () => {
    expect(() => validateState({ ...newState(), flags: new Array(1) })).toThrow();
  });
  it('rejects rewards that overflow safe integer totals', () => {
    expect(() => grantOnce({ ...newState(), totalXp: Number.MAX_SAFE_INTEGER }, 'overflow', { xp: 1, gold: 0 })).toThrow();
  });
  it('corner nudges never leave the feet inside a solid', () => {
    for (let y = 40; y < 100; y += 0.5) for (let x = 180; x < 240; x += 0.5) {
      const p = { x, y };
      if (!canStand('newsroom', p)) continue;
      for (const [dx, dy] of [[1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]]) {
        const moved = moveWithCollision('newsroom', p, dx!, dy!);
        expect(canStand('newsroom', moved), JSON.stringify({ p, dx, dy, moved })).toBe(true);
      }
    }
  });
});

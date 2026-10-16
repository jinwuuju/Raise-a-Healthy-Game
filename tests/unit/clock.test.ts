import { afterEach, describe, expect, it, vi } from 'vitest';
import lunch from '../../data/balance/lunch.v0.1.json';
import { GAME_TIME_ZONE, seoulTime, seoulTimeByOffset } from '../../src/domain/clock';
import { newState, validateState } from '../../src/domain/state';
import { SaveStore } from '../../src/infrastructure/save';

class Mem implements Storage {
  m = new Map<string, string>();
  failWrites = false;
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { if (this.failWrites) throw new Error('quota'); this.m.set(k, v); }
}
const CURRENT = 'medical-quest.v4.current', BACKUP1 = 'medical-quest.v4.backup1';
const at = (iso: string) => Date.parse(iso);

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe('Seoul real-time clock (D068, lunch step 5)', () => {
  it('uses the time zone from the lunch balance file', () => {
    expect(GAME_TIME_ZONE).toBe('Asia/Seoul');
    expect(lunch.clock.timezone).toBe(GAME_TIME_ZONE);
  });

  it('reads an instant as Seoul wall-clock time', () => {
    expect(seoulTime(at('2026-10-14T01:42:05Z'))).toEqual({ dateKey: '2026-10-14', year: 2026, month: 10, day: 14, hour: 10, minute: 42, second: 5, secondOfDay: 10 * 3600 + 42 * 60 + 5 });
  });

  it('starts a new day at 00:00:00 Seoul time, not at device or UTC midnight', () => {
    expect(seoulTime(at('2026-10-13T14:59:59.999Z'))).toMatchObject({ dateKey: '2026-10-13', hour: 23, minute: 59, second: 59, secondOfDay: 86399 });
    expect(seoulTime(at('2026-10-13T15:00:00Z'))).toMatchObject({ dateKey: '2026-10-14', hour: 0, minute: 0, second: 0, secondOfDay: 0 });
    expect(seoulTime(at('2026-10-14T00:00:00Z')).dateKey).toBe('2026-10-14');
  });

  it('has an exact second for the 11:30:00 lunch close', () => {
    expect(seoulTime(at('2026-10-14T02:29:59.999Z')).secondOfDay).toBe(11 * 3600 + 29 * 60 + 59);
    expect(seoulTime(at('2026-10-14T02:30:00Z')).secondOfDay).toBe(11 * 3600 + 30 * 60);
  });

  it('crosses month, year and leap-day boundaries in Seoul', () => {
    expect(seoulTime(at('2026-12-31T15:00:00Z')).dateKey).toBe('2027-01-01');
    expect(seoulTime(at('2028-02-28T15:00:00Z')).dateKey).toBe('2028-02-29');
    expect(seoulTime(at('2027-02-28T15:00:00Z')).dateKey).toBe('2027-03-01');
  });

  it('matches the fixed UTC+9 reading across two years of samples', () => {
    const start = at('2026-01-01T00:00:00Z');
    for (let i = 0; i < 1200; i++) {
      const ms = start + i * 14_653_123; // about every 4 hours, drifting through every minute/second
      expect(seoulTime(ms)).toEqual(seoulTimeByOffset(ms));
    }
  });

  it('falls back to UTC+9 when the runtime has no time-zone data', async () => {
    vi.resetModules();
    vi.stubGlobal('Intl', { ...Intl, DateTimeFormat: function () { throw new RangeError('no tz data'); } });
    const fresh = await import('../../src/domain/clock');
    expect(fresh.seoulTime(at('2026-10-13T15:00:00Z'))).toMatchObject({ dateKey: '2026-10-14', secondOfDay: 0 });
  });

  it('rejects impossible clock values instead of inventing a time', () => {
    for (const bad of [NaN, Infinity, -Infinity, 8.64e15 + 1]) {
      expect(() => seoulTime(bad)).toThrow();
      expect(() => seoulTimeByOffset(bad)).toThrow();
    }
  });
});

describe('removed in-game time setting: old saves stay readable (schema4)', () => {
  const oldSave = (time: unknown) => ({ ...newState(), started: true, totalXp: 120, gold: 40, flags: ['met-editor'], settings: { time } });

  it('new saves have no time setting', () => {
    expect('settings' in newState()).toBe(false);
    expect(JSON.stringify(newState())).not.toContain('settings');
  });

  it('reads and ignores any old settings.time without losing progress', () => {
    for (const time of ['day', 'dusk', 'night', 'auto', 'noon', 7, null]) {
      const s = validateState(JSON.parse(JSON.stringify(oldSave(time))));
      expect('settings' in s).toBe(false);
      expect([s.totalXp, s.gold, s.flags]).toEqual([120, 40, ['met-editor']]);
    }
    for (const settings of [undefined, null, 'x', [], { time: 'night', extra: 1 }]) {
      expect(() => validateState({ ...newState(), settings })).not.toThrow();
    }
  });

  it('keeps the untouched old save as a backup when the first new save is written', () => {
    const mem = new Mem(), raw = JSON.stringify(oldSave('night'));
    mem.setItem(CURRENT, raw);
    const store = new SaveStore(mem), loaded = store.load();
    expect(loaded.error).toBeNull();
    expect(loaded.state && 'settings' in loaded.state).toBe(false);
    store.save({ ...loaded.state!, revision: loaded.state!.revision + 1 });
    expect(mem.getItem(BACKUP1)).toBe(raw);
    const current = JSON.parse(mem.getItem(CURRENT)!);
    expect(current.settings).toBeUndefined();
    expect([current.totalXp, current.gold]).toEqual([120, 40]);
  });

  it('a failed save leaves the old save in place', () => {
    const mem = new Mem(), raw = JSON.stringify(oldSave('dusk'));
    mem.setItem(CURRENT, raw);
    const store = new SaveStore(mem), loaded = store.load();
    mem.failWrites = true;
    expect(() => store.save({ ...loaded.state!, revision: loaded.state!.revision + 1 })).toThrow();
    expect(mem.getItem(CURRENT)).toBe(raw);
    mem.failWrites = false;
    expect(new SaveStore(mem).load().state?.totalXp).toBe(120);
  });
});

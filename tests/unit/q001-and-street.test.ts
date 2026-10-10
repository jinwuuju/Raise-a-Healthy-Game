import { describe, expect, it } from 'vitest';
import { CH, CW, HAIR, cells, paintGrid } from '../../src/art/avatar';
import { defaultAppearance, faceFor, hairFor, presets, shapeFor, validateAppearance, type Look } from '../../src/domain/appearance';
import { Q1, acceptQ1, briefQ1, canEnterHeart, levelOf, observeQ1, q1Seen } from '../../src/domain/quest';
import { newState, validateState, type GameState } from '../../src/domain/state';
import { SIGNAL_CYCLE, carPhase, pedPhase } from '../../src/game/traffic';
import { canStand, crossingAt } from '../../src/world/collision';
import { findPath } from '../../src/world/path';
import { rooms } from '../../src/world/rooms';

describe('reporter sprites', () => {
  it('every hair template stays inside the 24px canvas', () => {
    for (const [id, art] of Object.entries(HAIR)) for (const view of ['front', 'back', 'side'] as const) {
      for (const row of art![view].rows) for (const [x] of cells(row)) expect(x, id + '/' + view).toBeGreaterThanOrEqual(0), expect(x, id + '/' + view).toBeLessThan(CW);
    }
  });
  it('each preset offers its own hair, eyes and face shapes, all with art', () => {
    expect(hairFor('male')).not.toEqual(hairFor('female'));
    for (const p of presets) {
      expect(hairFor(p).length).toBeGreaterThanOrEqual(4);
      expect(faceFor(p).length).toBeGreaterThanOrEqual(4);
      expect(shapeFor(p).length).toBeGreaterThanOrEqual(2);
      for (const hair of hairFor(p)) expect(HAIR[hair], hair).toBeDefined();
    }
  });
  it('paints feet on the anchor row in every direction and frame', () => {
    for (const p of presets) for (const dir of ['down', 'up', 'right'] as const) for (const f of [0, 1, 2]) {
      const g = paintGrid(defaultAppearance(p) as Look, dir, f);
      const rows = [...Array(CH).keys()].filter(y => g.slice(y * CW, y * CW + CW).some(Boolean));
      expect(Math.max(...rows)).toBe(36);
      expect(Math.min(...rows)).toBeGreaterThanOrEqual(0);
    }
  });
  it('is slimmer than the head: torso narrower than the face', () => {
    const g = paintGrid(defaultAppearance('female') as Look, 'down', 0);
    const width = (y: number) => g.slice(y * CW, y * CW + CW).filter(Boolean).length;
    expect(width(30)).toBeLessThan(width(12));
  });
  it('migrates old saved looks instead of rejecting them, but stays strict for new choices', () => {
    const old = { hair: 'short', face: 'calm', skin: 'peach', hairColor: 'ink', outfit: 'reporter' };
    const v = validateAppearance(old, 'female', true);
    expect(hairFor('female')).toContain(v.hair);
    expect(v.shape).toBe('oval');
    expect(() => validateAppearance(old, 'female')).toThrow();
    const s = validateState({ ...newState(), avatar: { preset: 'female', name: '기자', look: old } });
    expect(s.avatar.look.build).toBe('f');
  });
});

describe('Q001 entry', () => {
  const ready = (): GameState => ({ ...newState(), started: true, flags: ['met-editor', 'reported-back'], cafe: { ...newState().cafe, welcomeUsed: true } });
  const inHeart = (s: GameState): GameState => ({ ...s, at: { room: 'heart', x: 224, y: 258, facing: 'up' } });
  it('needs the editor commission before the Bodyscope runs', () => {
    expect(canEnterHeart(ready())).not.toBeNull();
    expect(() => acceptQ1(newState())).toThrow();
    expect(canEnterHeart(acceptQ1(ready()))).toBeNull();
  });
  it('pays the observation checkpoint once, only after both doors', () => {
    let s = inHeart(acceptQ1(ready()));
    s = observeQ1(s, 'heart-out');
    expect([s.totalXp, s.flags.includes(Q1.observed)]).toEqual([0, false]);
    s = observeQ1(observeQ1(s, 'heart-out'), 'heart-in');
    expect([s.totalXp, s.flags.includes(Q1.observed), q1Seen(s).length]).toEqual([20, true, 2]);
    const again = observeQ1(observeQ1(s, 'heart-in'), 'heart-out');
    expect(again.totalXp).toBe(20);
    expect(briefQ1(s).flags).toContain(Q1.briefed);
  });
  it('rejects observations outside the model or before acceptance', () => {
    expect(() => observeQ1(inHeart(ready()), 'heart-out')).toThrow();
    expect(() => observeQ1(acceptQ1(ready()), 'heart-out')).toThrow();
    expect(() => observeQ1(inHeart(acceptQ1(ready())), 'shelf')).toThrow();
  });
  it('saves and reloads inside the heart model', () => {
    const s = inHeart(acceptQ1(ready()));
    expect(validateState(JSON.parse(JSON.stringify(s))).at.room).toBe('heart');
  });
  it('the observation points are reachable over the bridge', () => {
    const h = rooms.heart;
    for (const id of ['heart-out', 'heart-in', 'guide']) {
      const t = h.targets.find(q => q.id === id)!;
      expect(findPath('heart', h.spawn, { x: t.x, y: t.y }).length, id).toBeGreaterThan(0);
    }
    expect(canStand('heart', { x: 224, y: 232 })).toBe(true);
    expect(canStand('heart', { x: 120, y: 232 })).toBe(false);
  });
  it('level 2 starts at 100 XP', () => {
    expect(levelOf(20)).toEqual({ level: 1, into: 20, need: 100 });
    expect(levelOf(100).level).toBe(2);
  });
});

describe('traffic and pedestrian lights', () => {
  it('people never get a walk signal while cars on that road may move', () => {
    for (let t = 0; t < SIGNAL_CYCLE * 2; t += 0.05) for (const road of ['NS', 'EW'] as const) {
      if (pedPhase(t, road) !== 'stop') expect(carPhase(t, road), road + ' ' + t.toFixed(2)).toBe('red');
    }
  });
  it('each road gets a walk phase every cycle', () => {
    for (const road of ['NS', 'EW'] as const) {
      const walk = [...Array(200).keys()].filter(i => pedPhase(i / 10, road) === 'walk').length;
      expect(walk).toBeGreaterThan(30);
    }
  });
  it('the four crosswalks are detected and the waiting corners are not', () => {
    expect(crossingAt('street', { x: 432, y: 432 })?.road).toBe('NS');
    expect(crossingAt('street', { x: 350, y: 500 })?.road).toBe('EW');
    expect(crossingAt('street', { x: 375, y: 432 })).toBeUndefined();
    expect(rooms.street.crossings).toHaveLength(4);
  });
});

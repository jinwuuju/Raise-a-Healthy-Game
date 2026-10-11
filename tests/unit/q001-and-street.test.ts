import { describe, expect, it } from 'vitest';
import { AY, CH, CW, HAIR, OY, cells, paintGrid } from '../../src/art/avatar';
import { defaultAppearance, faceFor, hairFor, presets, shapeFor, validateAppearance, type Look } from '../../src/domain/appearance';
import { Q1, acceptQ1, briefQ1, canEnterHeart, levelOf, observeQ1, q1Seen } from '../../src/domain/quest';
import { newState, validateState, type GameState } from '../../src/domain/state';
import { SIGNAL_CYCLE, carPhase, pedPhase } from '../../src/game/traffic';
import { canStand, crossingAt } from '../../src/world/collision';
import { findPath } from '../../src/world/path';
import { rooms } from '../../src/world/rooms';

describe('reporter sprites', () => {
  it('every hair template stays inside the 24px canvas', () => {
    for (const [id, art] of Object.entries(HAIR)) for (const view of ['front', 'side', 'tail'] as const) {
      for (const row of art![view]?.rows ?? []) for (const [x] of cells(row)) expect(x, id + '/' + view).toBeGreaterThanOrEqual(0), expect(x, id + '/' + view).toBeLessThan(CW);
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
  it('paints feet on the anchor row in every direction and frame, inside the canvas', () => {
    for (const p of presets) for (const hair of hairFor(p)) for (const dir of ['down', 'up', 'right'] as const) for (const f of [0, 1, 2, 3]) {
      const g = paintGrid({ ...defaultAppearance(p), hair } as Look, dir, f);
      const rows = [...Array(CH).keys()].filter(y => g.slice(y * CW, y * CW + CW).some(Boolean));
      expect(Math.max(...rows), hair + dir + f).toBe(AY - 1);
      expect(Math.min(...rows), hair + dir + f).toBeGreaterThanOrEqual(1);
    }
  });
  it('uses 바람의나라-like proportions: head about 40% of the figure, still wider than the body', () => {
    for (const p of presets) for (const hair of hairFor(p)) {
      const g = paintGrid({ ...defaultAppearance(p), hair } as Look, 'down', 0);
      const width = (y: number) => g.slice(y * CW, y * CW + CW).filter(Boolean).length;
      const rows = [...Array(CH).keys()].filter(y => width(y) > 0 && y >= OY + 1);
      const top = Math.min(...rows), feet = AY - 1, chin = OY + 11, ratio = (chin - top + 1) / (feet - top + 1);
      if (p !== 'alien') { expect(ratio, p + hair).toBeGreaterThan(0.36); expect(ratio, p + hair).toBeLessThan(0.52); }
      const body = (y: number) => g.slice(y * CW, y * CW + CW).filter(c => c && !'hHL'.includes(c)).length;
      expect(width(OY + 8), p + hair).toBeGreaterThan(body(OY + 16));
      expect(feet - top + 1, p + hair).toBeLessThanOrEqual(28);
    }
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
  it('hands swing in opposite directions and swap on the next step in front/back views', () => {
    for (const preset of presets) for (const dir of ['down', 'up'] as const) {
      // Short hair exposes both hands, including in the back view.
      const look = defaultAppearance(preset); if (preset === 'female') look.hair = 'pixie';
      const hands = (f: number, left: boolean) => {
        const g = paintGrid(look, dir, f);
        const u = f === 1 || f === 2 ? -1 : 0;
        const ys: number[] = [];
        for (let r = 14; r <= 20; r++) for (let x = left ? 3 : 12; x <= (left ? 7 : 16); x++) {
          if (['s', 'S'].includes(g[(OY + u + r) * CW + x] ?? '')) ys.push(r);
        }
        return ys.reduce((a, b) => a + b, 0) / ys.length + u;
      };
      const left1 = hands(1, true), right1 = hands(1, false), left2 = hands(2, true), right2 = hands(2, false);
      expect((left1 - right1) * (left2 - right2)).toBeLessThan(0);
      expect((left1 - hands(0, true)) * (right1 - hands(0, false))).toBeLessThan(0);
      expect(left1).toBe(right2); expect(right1).toBe(left2);
    }
  });
  it('profile has a visible far hand swinging opposite the near hand and the near leg', () => {
    for (const preset of presets) for (const f of [1, 2]) {
      const look = defaultAppearance(preset); if (preset === 'female') look.hair = 'pixie';
      const g = paintGrid(look, 'right', f), y = OY - 1 + 18;
      const far = [...Array(CW).keys()].filter(x => g[y * CW + x] === 'S');
      const near = [...Array(CW).keys()].filter(x => g[y * CW + x] === 's');
      expect(far.length).toBeGreaterThan(0); expect(near.length).toBeGreaterThan(0);
      const fx = far[0]!, nx = near[0]!;
      expect((fx - 9) * (nx - 9)).toBeLessThan(0);
      expect(f === 1 ? nx < 9 : nx > 9).toBe(true);
    }
  });
  it('rear arms have separate silhouettes and never show a palm across the back', () => {
    for (const preset of presets) for (const f of [0, 1, 2]) {
      const look = defaultAppearance(preset); if (preset === 'female') look.hair = 'pixie';
      const front = paintGrid(look, 'down', f), back = paintGrid(look, 'up', f), u = f ? -1 : 0;
      const armMask = (g: typeof front) => {
        const out: boolean[] = [];
        for (let r = 14; r <= 20; r++) for (const x of [3, 4, 5, 6, 7, 12, 13, 14, 15, 16]) out.push(!!g[(OY + u + r) * CW + x]);
        return out;
      };
      expect(armMask(back)).not.toEqual(armMask(front));
      for (let r = 14; r <= 20; r++) for (let x = 6; x <= 13; x++) expect(['s', 'S'].includes(back[(OY + u + r) * CW + x] ?? '')).toBe(false);
    }
  });
});

describe('Q001 entry', () => {
  const ready = (): GameState => ({ ...newState(), started: true, flags: ['met-editor', 'reported-back'], cafe: { ...newState().cafe, welcomeUsed: true } });
  const inRoom = (s: GameState, room: 'heart' | 'rv'): GameState => ({ ...s, at: { room, x: rooms[room].spawn.x, y: rooms[room].spawn.y, facing: 'down' } });
  it('needs the editor commission before the Bodyscope runs', () => {
    expect(canEnterHeart(ready())).not.toBeNull();
    expect(() => acceptQ1(newState())).toThrow();
    expect(canEnterHeart(acceptQ1(ready()))).toBeNull();
  });
  it('pays the observation checkpoint once, only after both doors, each in its own chamber', () => {
    let s = inRoom(acceptQ1(ready()), 'heart');
    expect(() => observeQ1(s, 'heart-out')).toThrow();
    s = observeQ1(s, 'heart-in');
    expect([s.totalXp, s.flags.includes(Q1.observed)]).toEqual([0, false]);
    s = inRoom(s, 'rv');
    expect(() => observeQ1(s, 'heart-in')).toThrow();
    s = observeQ1(observeQ1(s, 'heart-out'), 'heart-out');
    expect([s.totalXp, s.flags.includes(Q1.observed), q1Seen(s).length]).toEqual([20, true, 2]);
    expect(observeQ1(s, 'heart-out').totalXp).toBe(20);
    expect(briefQ1(s).flags).toContain(Q1.briefed);
  });
  it('rejects observations outside the heart or before acceptance', () => {
    expect(() => observeQ1(inRoom(ready(), 'heart'), 'heart-in')).toThrow();
    expect(() => observeQ1(acceptQ1(ready()), 'heart-in')).toThrow();
    expect(() => observeQ1(inRoom(acceptQ1(ready()), 'heart'), 'shelf')).toThrow();
  });
  it('saves and reloads inside the heart; a position from the old heart model moves to the safe entry', () => {
    const s = inRoom(acceptQ1(ready()), 'rv');
    expect(validateState(JSON.parse(JSON.stringify(s))).at.room).toBe('rv');
    const old = validateState({ ...s, at: { room: 'heart', x: 30, y: 400, facing: 'up' } });
    expect(old.at).toEqual({ room: 'heart', x: rooms.heart.spawn.x, y: rooms.heart.spawn.y, facing: rooms.heart.spawnFacing });
    expect(() => validateState({ ...s, at: { room: 'street', x: 400, y: 100, facing: 'up' } })).toThrow();
  });
  it('the two doors are reachable on foot from where the reporter arrives', () => {
    for (const [room, id] of [['heart', 'heart-in'], ['rv', 'heart-out'], ['heart', 'guide']] as const) {
      const r = rooms[room], t = r.targets.find(q => q.id === id)!;
      expect(findPath(room, r.spawn, { x: t.x, y: t.y }).length, id).toBeGreaterThan(0);
    }
    expect(canStand('heart', rooms.heart.spawn)).toBe(true);
    expect(canStand('heart', { x: 138, y: 300 })).toBe(false);
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

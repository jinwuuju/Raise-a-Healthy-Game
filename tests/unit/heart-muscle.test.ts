import { describe, expect, it } from 'vitest';
import q6 from '../../data/content/q006.v0.1.json';
import { newState, type GameState } from '../../src/domain/state';
import { discoveries, discoveryIds, hxKey } from '../../src/domain/heart';
import { roomStars, tierStars, tiers, maxStars } from '../../src/domain/mastery';
import { LOAD, MUSCLE, RUN, STRETCHES, finishRun, gradeOf, isMuscleStop, muscleOpen, parOf, pickMuscle, validateHeartRun } from '../../src/domain/heart-run';
import type { RoomId } from '../../src/world/types';

/* D108 step 1 (design 18 remaining steps): the heart-muscle delivery on the Q006 route, and stars on the see-through map. */
const base = (): GameState => ({ ...newState(), started: true });
const at = (s: GameState, room: RoomId): GameState => ({ ...s, at: { room, x: 0, y: 0, facing: 'down' } });
const published = (s: GameState): GameState => ({ ...s, q006: { ...s.q006, publishedAt: '2026-10-15T10:00:00.000Z' } });
const day = Date.parse('2026-10-19T03:00:00Z');
const route = (entry: string, n = 3) => [{ id: 'hx-svc', correct: n > 0 }, { id: entry, correct: n > 1 }, { id: MUSCLE.back, correct: n > 2 }];

describe('D108 heart-muscle delivery', () => {
  it('follows the Q006 notes: the left opening mainly serves the left ventricle wall, the right one the right side', () => {
    const note = (id: string) => q6.notes.find(n => n.id === id)!;
    expect(note('lca').target).toBe(MUSCLE.entry.lv); expect(note('lca').text).toContain('좌심실');
    expect(note('rca').target).toBe(MUSCLE.entry.rv); expect(note('rca').text).toContain('양쪽 심실');
    expect(note('return').target).toBe(MUSCLE.back);
    expect(discoveries[MUSCLE.wall.lv]!.room).toBe('lv'); expect(discoveries[MUSCLE.wall.rv]!.room).toBe('rv');
    for (const id of Object.values(MUSCLE.entry)) expect(discoveries[id]!.room).toBe('aorta');
    expect(discoveries[MUSCLE.back]!.room).toBe('heart');
  });

  it('opens only after Q006 is published', () => {
    expect(muscleOpen(base())).toBe(false);
    expect(muscleOpen(published(base()))).toBe(true);
    expect(() => finishRun(at(base(), 'heart'), { runId: 'm1', seconds: 100, oxygen: true, kind: 'muscle', waypoints: route(MUSCLE.entry.lv) }, day)).toThrow();
  });

  it('orders both walls over many seeds, never uses a supply stop as the clue waypoint, and is reproducible', () => {
    const s = published(base()), walls = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const m = pickMuscle(s, 'seed' + i);
      walls.add(m.wall);
      expect(isMuscleStop(m.waypoint)).toBe(false); expect(m.waypoint).not.toBe(LOAD);
      expect([...STRETCHES[0]!, ...STRETCHES[1]!]).toContain(discoveries[m.waypoint]!.room);
      expect(pickMuscle(s, 'seed' + i)).toEqual(m);
    }
    expect([...walls].sort()).toEqual(['lv', 'rv']);
  });

  it('finishes only at the coronary sinus opening in the right atrium with a well-formed route', () => {
    const s = published(base());
    expect(() => finishRun(at(s, 'aorta'), { runId: 'm1', seconds: 100, oxygen: true, kind: 'muscle', waypoints: route(MUSCLE.entry.lv) }, day)).toThrow();
    expect(() => finishRun(at(s, 'heart'), { runId: 'm1', seconds: 100, oxygen: true, kind: 'muscle', waypoints: route('hx-svc') }, day)).toThrow();
    expect(() => finishRun(at(s, 'heart'), { runId: 'm1', seconds: 100, oxygen: true, kind: 'muscle', waypoints: [{ id: MUSCLE.back, correct: true }, ...route(MUSCLE.entry.lv).slice(1)] }, day)).toThrow();
    expect(() => finishRun(at(s, 'heart'), { runId: 'm1', seconds: 100, oxygen: false, kind: 'muscle', waypoints: route(MUSCLE.entry.lv) }, day)).toThrow();
  });

  it('pays like the blood run, keeps its own best time, and gives XP only for the first muscle delivery', () => {
    const s0 = at(published(base()), 'heart');
    const r1 = finishRun(s0, { runId: 'm1', seconds: parOf('muscle'), oxygen: true, kind: 'muscle', waypoints: route(MUSCLE.entry.rv) }, day);
    expect(r1.reward!.grade).toBe('S');
    expect(r1.state.totalXp).toBe(RUN.xp.firstMuscleRun + RUN.xp.firstS + (r1.reward!.sighting?.first ? RUN.xp.newSighting : 0));
    expect(r1.reward!.lines.some(l => l.includes('첫 배달 경험치'))).toBe(false);
    expect(r1.state.heartRun.muscle).toEqual({ runs: 1, best: parOf('muscle') });
    expect(r1.state.heartRun.best).toBeNull(); // blood best untouched
    expect(r1.state.heartRun.runs).toBe(1);
    const r2 = finishRun(r1.state, { runId: 'm2', seconds: parOf('muscle') - 10, oxygen: true, kind: 'muscle', waypoints: route(MUSCLE.entry.lv) }, day + 1000);
    expect(r2.reward!.best).toBe(true); expect(r2.reward!.xp).toBe(r2.reward!.sighting?.first ? RUN.xp.newSighting : 0);
    expect(r2.state.heartRun.muscle.best).toBe(parOf('muscle') - 10);
    // A later first blood delivery still earns its own first-run XP.
    const r3 = finishRun(at(r2.state, 'aorta'), { runId: 'b1', seconds: 200, oxygen: true, waypoints: ['hx-svc', 'hx-pv', 'hx-lvwall'].map(id => ({ id, correct: true })) }, day + 2000);
    expect(r3.reward!.lines.some(l => l.startsWith('첫 배달 경험치'))).toBe(true);
    expect(r3.state.heartRun.best).toBe(200); expect(r3.state.heartRun.muscle.best).toBe(parOf('muscle') - 10);
    expect(validateHeartRun(JSON.parse(JSON.stringify(r3.state.heartRun)))).toEqual(r3.state.heartRun);
    expect(gradeOf(parOf('muscle'), 3, parOf('muscle'))).toBe('S'); expect(gradeOf(parOf('muscle'), 3)).not.toBe('S');
  });

  it('reads saves from before D108 (no muscle record) and refuses an impossible one', () => {
    const old = { runs: 4, best: 70, bestGrade: 'A', combo: 1, lastDay: '2026-10-18', lastRunId: 'x1', seen: [], goldEarned: 300, perfect: 2 };
    expect(validateHeartRun(old).muscle).toEqual({ runs: 0, best: null });
    expect(() => validateHeartRun({ ...old, muscle: { runs: 5, best: null } })).toThrow();
    expect(() => validateHeartRun({ ...old, muscle: { runs: -1, best: null } })).toThrow();
  });
});

describe('D108 stars on the heart see-through map', () => {
  it('room stars add up to the whole heart, and a room medal needs every star there', () => {
    const rooms = ['heart', 'rv', 'lung', 'la', 'lv', 'aorta'];
    expect(rooms.reduce((n, r) => n + roomStars(base(), r).max, 0)).toBe(maxStars());
    expect(tiers.reduce((n, t) => n + tierStars(base(), t).max, 0)).toBe(maxStars());
    const ids = discoveryIds.filter(id => discoveries[id]!.room === 'la');
    const full: GameState = { ...base(), inspected: ids.map(hxKey), mastery: Object.fromEntries(ids.map(id => [id, { stars: 3, kinds: ['name', 'hint', 'room'] }])) };
    expect(roomStars(full, 'la')).toEqual({ stars: ids.length * 3, max: ids.length * 3, medal: true });
    const one = { ...full, mastery: { ...full.mastery, [ids[0]!]: { stars: 2, kinds: ['name', 'hint'] as ('name' | 'hint')[] } } };
    expect(roomStars(one, 'la').medal).toBe(false);
    expect(roomStars(base(), 'body')).toEqual({ stars: 0, max: 0, medal: false });
  });
});

describe('D108 test fixture', () => {
  it('the after-Q006 save is valid and opens the muscle delivery', async () => {
    const { q7Fixture } = await import('../helpers/q007-fixture');
    const { validateState } = await import('../../src/domain/state');
    const s = validateState(q7Fixture());
    expect(muscleOpen(s)).toBe(true);
    for (const id of [...Object.values(MUSCLE.entry), ...Object.values(MUSCLE.wall), MUSCLE.back]) expect(s.inspected).toContain(hxKey(id));
  });
});

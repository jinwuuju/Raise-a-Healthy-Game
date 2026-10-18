import { describe, expect, it } from 'vitest';
import { newState, validateState, type GameState } from '../../src/domain/state';
import { discoveries, discoveryIds, hxKey } from '../../src/domain/heart';
import { answerQuiz, hints, isOpen, makeQuestion, masteryContent, nextKind, nextLocked, tierOf, tiers, totalStars, QUIZ_KINDS } from '../../src/domain/mastery';
import { DELIVER, LOAD, RUN, STRETCHES, finishRun, gradeOf, pickWaypoints, sightings } from '../../src/domain/heart-run';
import type { RoomId } from '../../src/world/types';

const base = (): GameState => ({ ...newState(), started: true });
const at = (s: GameState, room: RoomId): GameState => ({ ...s, at: { room, x: 0, y: 0, facing: 'down' } });
const known = (s: GameState, ids: string[]): GameState => ({ ...s, inspected: [...s.inspected, ...ids.map(hxKey)] });

describe('D106 field checks and tiers', () => {
  it('every structure has a clue line that never names it, and sits in exactly one tier', () => {
    for (const id of discoveryIds) {
      expect(hints[id], id).toBeTruthy();
      expect(hints[id]!.includes(discoveries[id]!.name.split(' (')[0]!), id).toBe(false);
      expect(tiers.filter(t => t.ids.includes(id)).length, id).toBe(1);
    }
    expect(tiers[0]!.ids.length).toBe(12);
    expect(masteryContent.status).toBe('draft_unreviewed');
  });

  it('questions have three choices with the answer among them, no confusable twin, and are reproducible', () => {
    for (const id of discoveryIds) for (const kind of QUIZ_KINDS) {
      const q = makeQuestion(id, kind, 'seed');
      expect(q.choices).toHaveLength(3);
      expect(q.choices.filter(c => c.id === q.answer)).toHaveLength(1);
      expect(new Set(q.choices.map(c => c.id)).size).toBe(3);
      for (const [a, b] of masteryContent.twins) if (id === a) expect(q.choices.some(c => c.id === b)).toBe(false);
      expect(makeQuestion(id, kind, 'seed')).toEqual(q);
    }
  });

  it('a right answer of a new kind gives one star and 5G; repeats, wrong answers and wrong places give nothing or refuse', () => {
    let s = at(known(base(), ['hx-svc']), 'heart');
    const r1 = answerQuiz(s, 'hx-svc', 'name', true);
    expect(r1.star).toBe(true); expect(r1.state.gold).toBe(5); expect(r1.state.mastery['hx-svc']).toEqual({ stars: 1, kinds: ['name'] });
    s = r1.state;
    expect(answerQuiz(s, 'hx-svc', 'name', true).state).toBe(s);
    expect(answerQuiz(s, 'hx-svc', 'room', false).state).toBe(s);
    expect(nextKind(s, 'hx-svc')).toBe('hint');
    expect(() => answerQuiz(at(s, 'rv'), 'hx-svc', 'hint', true)).toThrow();
    expect(() => answerQuiz(s, 'hx-sa', 'name', true)).toThrow(); // not recorded yet
    expect(validateState(s).mastery).toEqual(s.mastery);
  });

  it('core structures are open from the start; deeper tiers open with stars; recorded ones always stay open', () => {
    const s = base();
    expect(isOpen(s, 'hx-svc')).toBe(true);
    expect(tierOf('hx-moderator').id).toBe('deep');
    expect(isOpen(s, 'hx-moderator')).toBe(false);
    expect(isOpen(known(s, ['hx-moderator']), 'hx-moderator')).toBe(true);
    const core = tiers[0]!.ids;
    let t = known(s, core);
    for (const id of core) t = { ...t, mastery: { ...t.mastery, [id]: { stars: 1, kinds: ['name'] } } };
    expect(totalStars(t)).toBe(12);
    expect(isOpen(t, 'hx-moderator')).toBe(true);
    expect(nextLocked(t)!.id).toBe('detail');
  });

  it('stars on a structure without its exploration record are rejected; old saves read as empty', () => {
    const s = base();
    expect(() => validateState({ ...s, mastery: { 'hx-svc': { stars: 1, kinds: ['name'] } } })).toThrow();
    const old = JSON.parse(JSON.stringify(s)); delete old.mastery; delete old.heartRun;
    const v = validateState(old);
    expect(v.mastery).toEqual({}); expect(v.heartRun.runs).toBe(0);
  });
});

describe('D106 blood-delivery run', () => {
  it('picks one open waypoint per stretch of the route, preferring recorded ones', () => {
    const s = known(base(), ['hx-svc', 'hx-pv', 'hx-lvwall']);
    const w = pickWaypoints(s, 'abc');
    expect(w).toHaveLength(3);
    w.forEach((id, i) => { expect(STRETCHES[i]).toContain(discoveries[id]!.room); expect(isOpen(s, id)).toBe(true); expect([LOAD, DELIVER]).not.toContain(id); });
    expect(w).toEqual(['hx-svc', 'hx-pv', 'hx-lvwall']);
    expect(pickWaypoints(base(), 'x').every(id => isOpen(base(), id))).toBe(true);
  });

  it('grades by correct waypoints and time against par', () => {
    expect(gradeOf(RUN.parSeconds, 3)).toBe('S');
    expect(gradeOf(RUN.parSeconds + 1, 3)).toBe('A');
    expect(gradeOf(RUN.parSeconds * 3, 1)).toBe('B');
    expect(gradeOf(RUN.parSeconds * 3, 0)).toBe('C');
  });

  it('pays every finished run once, with first-of-day, best, combo and XP; never takes anything away', () => {
    const s0 = at(base(), 'aorta');
    const wp = (n: number) => ['hx-svc', 'hx-pv', 'hx-lvwall'].map((id, i) => ({ id, correct: i < n }));
    const day = Date.parse('2026-10-18T03:00:00Z');
    expect(() => finishRun(at(s0, 'lv'), { runId: 'a1', seconds: 100, oxygen: true, waypoints: wp(3) }, day)).toThrow();
    expect(() => finishRun(s0, { runId: 'a1', seconds: 100, oxygen: false, waypoints: wp(3) }, day)).toThrow();
    expect(() => finishRun(s0, { runId: 'a1', seconds: 5, oxygen: true, waypoints: wp(3) }, day)).toThrow();
    const r1 = finishRun(s0, { runId: 'a1', seconds: 80, oxygen: true, waypoints: wp(3) }, day);
    expect(r1.reward!.grade).toBe('S');
    expect(r1.reward!.firstOfDay).toBe(true);
    const g = RUN.gold, sightGold = r1.reward!.sighting ? (r1.reward!.sighting.first ? g.sightingNew : g.sightingRepeat) : 0;
    expect(r1.reward!.gold).toBe(Math.round((g.base + 3 * g.perCheckpoint + g.grade.S) * RUN.combo[1]!) + g.firstOfDay + sightGold);
    expect(r1.state.totalXp).toBe(RUN.xp.base + 3 * RUN.xp.perCheckpoint + RUN.xp.gradeS);
    expect(finishRun(r1.state, { runId: 'a1', seconds: 80, oxygen: true, waypoints: wp(3) }, day).reward).toBeNull();
    const r2 = finishRun(r1.state, { runId: 'a2', seconds: 75, oxygen: true, waypoints: wp(3) }, day + 1000);
    expect(r2.reward!.firstOfDay).toBe(false); expect(r2.reward!.best).toBe(true); expect(r2.reward!.combo).toBe(2);
    const r3 = finishRun(r2.state, { runId: 'a3', seconds: 900, oxygen: true, waypoints: wp(0) }, day + 2000);
    expect(r3.reward!.grade).toBe('C'); expect(r3.reward!.gold).toBeGreaterThanOrEqual(g.base); expect(r3.state.heartRun.combo).toBe(0);
    expect(r3.state.gold).toBeGreaterThan(r2.state.gold);
    const v = validateState(r3.state);
    expect(v.heartRun).toEqual(r3.state.heartRun);
  });

  it('rare sightings: weights cover every card and the roll is fixed per run id', () => {
    expect(sightings.length).toBeGreaterThanOrEqual(5);
    const s0 = at(base(), 'aorta'), wp = ['hx-svc', 'hx-pv', 'hx-lvwall'].map(id => ({ id, correct: true }));
    let hits = 0;
    for (let i = 0; i < 400; i++) {
      const id = 'r' + i, a = finishRun(s0, { runId: id, seconds: 100, oxygen: true, waypoints: wp }).reward!, b = finishRun(s0, { runId: id, seconds: 100, oxygen: true, waypoints: wp }).reward!;
      expect(a.sighting?.id).toBe(b.sighting?.id);
      if (a.sighting) hits++;
    }
    expect(hits).toBeGreaterThan(400 * RUN.sightingChance * 0.5);
    expect(hits).toBeLessThan(400 * RUN.sightingChance * 1.6);
  });
});

import { describe, expect, it } from 'vitest';
import levels from '../../data/balance/levels.v0.2.json';
import { q11Fixture } from '../helpers/q011-fixture';
import { q12Fixture } from '../helpers/q012-fixture';
import { acceptQ11, canOfferQ11, checkQ11, clearQ11Board, compareQ11, pairQ11, publishQ11, q11Ready, q11Reward, recordQ11, selectQ11 } from '../../src/domain/q011';
import { airModes, emptyQ11, jobOrder, q11Evidence, q11Text, supportsOf, validateQ11 } from '../../src/domain/q011-state';
import { publishQ11WithReaction, reprintArticle } from '../../src/domain/reaction';
import { latestReaction } from '../../src/domain/reaction-state';
import { RELEASE_CAP, levelOf, xpToNext } from '../../src/domain/quest';
import { newState, validateState, type GameState } from '../../src/domain/state';
import { objective, talk } from '../../src/application/story';
import { rooms } from '../../src/world/rooms';
import { canStand } from '../../src/world/collision';
import type { RoomId } from '../../src/world/types';

/* D112 Q011 ‘공기 항구’: four scenes in the nose, the air-port observer (only the incoming air changes), the desk. */
function at(s: GameState, room: RoomId, target: string): GameState {
  const t = rooms[room].targets.find(t => t.id === target)!;
  for (let dx = -22; dx <= 22; dx += 2) for (let dy = -22; dy <= 22; dy += 2) { const p = { x: t.x + dx, y: t.y + dy }; if (Math.hypot(dx, dy) <= t.r && canStand(room, p)) return { ...s, at: { room, ...p, facing: 'up' } }; }
  throw new Error('Unreachable target ' + target);
}
const desk = (s: GameState): GameState => at(s, 'newsroom', 'my-desk');
const accepted = (): GameState => acceptQ11(q11Fixture());
function walked(): GameState {
  let s = accepted();
  for (const n of q11Text.notes) s = recordQ11(at(s, n.room as RoomId, n.target), n.id as typeof q11Evidence[number]);
  return s;
}
function compared(): GameState {
  let s = at(walked(), 'nose', 'rx-choana');
  for (const m of airModes) s = compareQ11(s, m);
  return desk(s);
}
function ready(): GameState {
  let s = compared();
  for (const id of ['wall', 'mucus', 'hairs'] as const) s = pairQ11(s, id);
  return checkQ11(selectQ11(selectQ11(selectQ11(s, 'lead', 'winter'), 'analogy', 'harbor'), 'limit', 'analogy'));
}

describe('D112 release cap 30', () => {
  it('levels follow data/balance/levels.v0.2.json up to the release cap; XP above the cap is kept', () => {
    for (const row of levels.rows.slice(0, RELEASE_CAP - 1)) { expect(xpToNext(row.level)).toBe(row.xpToNext); expect(levelOf(row.cumulativeXp)).toEqual({ level: row.level, into: 0, need: row.xpToNext }); }
    expect(levelOf(2700).level).toBe(10); expect(levelOf(3249).level).toBe(10); expect(levelOf(3250).level).toBe(11);
    const capRow = levels.rows[RELEASE_CAP - 1]!;
    expect(levelOf(capRow.cumulativeXp)).toEqual({ level: RELEASE_CAP, into: 0, need: 0 });
    expect(levelOf(capRow.cumulativeXp + 5000).level).toBe(RELEASE_CAP);
  });
});

describe('D112 Q011 the air port (basic course)', () => {
  it('is offered after the heart graduation, only in the newsroom; old saves read an empty commission', () => {
    const s = q11Fixture();
    expect(validateState(JSON.parse(JSON.stringify(s))).q011).toEqual(emptyQ11());
    const { q011: _q, ...old } = s; expect(validateState(JSON.parse(JSON.stringify(old))).q011).toEqual(emptyQ11());
    expect(canOfferQ11(s)).toBe(true); expect(canOfferQ11(newState())).toBe(false);
    expect(talk('editor', s).action).toBe('offer-q11');
    expect(objective(s, 'newsroom')).toContain('공기 항구');
    expect(objective(s, 'newsroom')).toContain('바디스코프에서 호흡기를 골라');
    expect(() => acceptQ11({ ...s, at: { room: 'nose', ...rooms.nose.spawn, facing: 'right' } })).toThrow();
    expect(accepted().q011.accepted).toBe(true);
  });

  it('records each scene only beside it in the nose, together with the structure record', () => {
    const s = accepted();
    expect(() => recordQ11(s, 'hairs')).toThrow('가까이');
    const a = recordQ11(at(s, 'nose', 'rx-vestibule'), 'hairs');
    expect(a.q011.notes).toEqual(['hairs']); expect(a.inspected).toContain('rx:rx-vestibule');
    expect(recordQ11(a, 'hairs')).toBe(a);
    expect(() => recordQ11(at(a, 'nose', 'rx-vestibule'), 'mucus')).toThrow();
    expect(objective(a, 'nose')).toContain('(1/4)');
    expect(objective(a, 'newsroom')).toContain('바디스코프에서 호흡기를 골라');
    expect(() => validateState(JSON.parse(JSON.stringify(a)))).not.toThrow();
  });

  it('opens the observer after the four scenes, at the back of the nose; only the incoming air changes', () => {
    const s = walked();
    expect(() => compareQ11(at(accepted(), 'nose', 'rx-choana'), 'cold')).toThrow('네 장면');
    expect(() => compareQ11(at(s, 'nose', 'rx-vestibule'), 'cold')).toThrow('뒤콧구멍');
    const c = compareQ11(at(s, 'nose', 'rx-choana'), 'virus');
    expect(c.q011.compared).toEqual(['virus']); expect(compareQ11(c, 'virus')).toBe(c);
    expect(objective(c, 'nose')).toContain('관찰기');
    expect(q11Ready(compared())).toBe(true);
    // The virus picture says the nose catches many particles but not all of them (no overclaim).
    expect(q11Text.observer.modes.virus.text).toContain('모두 막지는 못');
    const m = q11Text.observer.modes;
    expect(m.virus.back.bits).toBeGreaterThan(m.dust.back.bits);
    for (const k of airModes) { expect(m[k].back.warm).toBeGreaterThanOrEqual(m[k].front.warm); expect(m[k].back.wet).toBeGreaterThanOrEqual(m[k].front.wet); expect(m[k].back.bits).toBeLessThanOrEqual(m[k].front.bits); }
  });

  it('pairs each job with a scene that shows it; wrong scenes and the decoy are refused with a hint and never saved', () => {
    const s = compared();
    expect(() => pairQ11(walked(), 'wall')).toThrow();
    expect(() => pairQ11(s, 'hairs')).toThrow('Q011'); // hairs do not warm the air: points to a scene that does
    expect(() => pairQ11(s, 'oxygen')).toThrow('폐');
    const a = pairQ11(s, 'shelves'); // several valid scenes per job (the shelves help all three)
    expect(a.q011.pairs).toEqual(['shelves']);
    expect(clearQ11Board(a).q011.pairs).toEqual([]);
    for (const [i, job] of jobOrder.entries()) expect(supportsOf(job).length).toBeGreaterThan(i === 0 ? 1 : 2);
    expect(() => selectQ11(ready(), 'lead', 'shield')).toThrow('뒤콧구멍');
    expect(() => selectQ11(ready(), 'analogy', 'filter')).toThrow('모두 막지는');
    const bad = JSON.parse(JSON.stringify({ ...s, q011: { ...s.q011, pairs: ['hairs'] } }));
    expect(() => validateState(bad)).toThrow();
  });

  it('publishes once for 550XP·380G (Lv.11) with a reader reaction; reprints pay gold only', () => {
    const r = ready();
    expect(r.q011.checked).toBe(true);
    const p = publishQ11WithReaction(r, () => 0.5, '2026-10-23T00:00:00Z');
    expect(p.totalXp - r.totalXp).toBe(q11Reward.xp); expect(q11Reward).toEqual({ key: 'quest.Q011.first', xp: 550, gold: 380 });
    expect(levelOf(p.totalXp).level).toBe(11); expect(p.ledger).toContain('quest.Q011.first');
    expect(latestReaction(p)?.questId).toBe('Q011');
    expect(publishQ11(p)).toBe(p);
    const again = reprintArticle(p, p.reactions.count, () => 0.5, '2026-10-23T00:10:00Z', 'Q011');
    expect(again.totalXp).toBe(p.totalXp); expect(again.gold).toBeGreaterThan(p.gold);
    expect(() => validateState(JSON.parse(JSON.stringify(again)))).not.toThrow();
    expect(objective(p, 'newsroom')).toContain('발행 완료');
    expect(talk('editor', p).action).toBe('offer-q12'); // D113: the next respiratory quest follows
  });

  it('rejects forged saves and keeps the fixture after publication valid', () => {
    const r = ready();
    expect(() => validateState(JSON.parse(JSON.stringify({ ...r, q011: { ...r.q011, publishedAt: '2026-10-23T00:00:00Z' } })))).toThrow(); // no reward record
    expect(() => validateQ11({ ...emptyQ11(), notes: ['hairs'] })).toThrow(); // not accepted
    expect(() => validateQ11({ ...r.q011, lead: 'shield' })).toThrow(); // a refused lead is never stored
    expect(() => validateState(JSON.parse(JSON.stringify({ ...q11Fixture(), q011: { ...emptyQ11(), accepted: true, notes: ['hairs'] } })))).toThrow(); // scene without its structure record
    const f = validateState(JSON.parse(JSON.stringify(q12Fixture())));
    expect(levelOf(f.totalXp).level).toBe(11); expect(f.q011.publishedAt).not.toBeNull();
  });

  it('keeps the basic-course contract: no numbers on screens, at most three new names, sources for every scene', () => {
    const screen = [q11Text.question, ...q11Text.offer, ...q11Text.notes.map(n => n.text + n.card + n.name), q11Text.observer.intro, q11Text.observer.singleVariable, q11Text.observer.limit,
      ...airModes.map(m => q11Text.observer.modes[m].text + q11Text.observer.modes[m].label), q11Text.board.intro, q11Text.board.wrong, ...q11Text.board.decoys.map(d => d.card + d.hint),
      ...q11Text.board.jobs.map(j => j.claim), ...q11Text.article.leads.map(l => l.text + l.title + (l.hint ?? '')), ...q11Text.article.analogies.map(a => a.text + (a.hint ?? '')),
      ...q11Text.article.limitations.map(l => l.text), q11Text.article.factcheck, q11Text.article.next, q11Text.article.reply].join('');
    expect(/[0-9]/.test(screen)).toBe(false);
    expect(q11Text.newNames.length).toBeLessThanOrEqual(3);
    const ids = q11Text.sources.map(s => s.id);
    for (const n of q11Text.notes) { expect(n.src.length).toBeGreaterThan(0); expect(n.src.every(id => ids.includes(id))).toBe(true); expect(rooms.nose.targets.some(t => t.id === n.target)).toBe(true); }
    expect(q11Text.status).toBe('draft_unreviewed'); expect(q11Text.disclaimer).toContain('검수 전 모형');
  });
});

import { describe, expect, it } from 'vitest';
import { q13Fixture } from '../helpers/q013-fixture';
import { q14Fixture } from '../helpers/q014-fixture';
import { acceptQ13, canOfferQ13, checkQ13, clearQ13Board, compareQ13, publishQ13, q13Ready, q13Reward, recordQ13, selectQ13, sortQ13 } from '../../src/domain/q013';
import { binOf, breathModes, emptyQ13, flowCards, q13Evidence, q13Text, validateQ13 } from '../../src/domain/q013-state';
import { MUCUS_SPEED, SWALLOW, airflow } from '../../src/domain/breath';
import { publishQ13WithReaction, reprintArticle } from '../../src/domain/reaction';
import { latestReaction } from '../../src/domain/reaction-state';
import { levelOf } from '../../src/domain/quest';
import { validateState, type GameState } from '../../src/domain/state';
import { objective, talk } from '../../src/application/story';
import { rooms } from '../../src/world/rooms';
import { canStand } from '../../src/world/collision';
import type { RoomId } from '../../src/world/types';

/* D117 Q013 ‘두 개의 흐름’: four scenes in the trachea and bronchi, the flow observer (only the breath changes), the desk. */
function at(s: GameState, room: RoomId, target: string): GameState {
  const t = rooms[room].targets.find(t => t.id === target)!;
  for (let dx = -22; dx <= 22; dx += 2) for (let dy = -22; dy <= 22; dy += 2) { const p = { x: t.x + dx, y: t.y + dy }; if (Math.hypot(dx, dy) <= t.r && canStand(room, p)) return { ...s, at: { room, ...p, facing: 'up' } }; }
  throw new Error('Unreachable target ' + target);
}
const desk = (s: GameState): GameState => at(s, 'newsroom', 'my-desk');
const accepted = (): GameState => acceptQ13(q13Fixture());
function walked(): GameState {
  let s = accepted();
  for (const n of q13Text.notes) s = recordQ13(at(s, n.room as RoomId, n.target), n.id as typeof q13Evidence[number]);
  return s;
}
function compared(): GameState {
  let s = at(walked(), 'trachea', 'rx-goblet');
  for (const m of breathModes) s = compareQ13(s, m);
  return desk(s);
}
function ready(): GameState {
  let s = compared();
  for (const id of flowCards) s = sortQ13(s, id, binOf(id));
  return checkQ13(selectQ13(selectQ13(selectQ13(s, 'lead', 'reader'), 'analogy', 'escalator'), 'limit', 'analogy'));
}

describe('D117 Q013 two flows in the windpipe (basic course)', () => {
  it('is offered after the fork article, only in the newsroom; old saves read an empty commission', () => {
    const s = q13Fixture();
    expect(validateState(JSON.parse(JSON.stringify(s))).q013).toEqual(emptyQ13());
    const { q013: _q, ...old } = s; expect(validateState(JSON.parse(JSON.stringify(old))).q013).toEqual(emptyQ13());
    expect(canOfferQ13(s)).toBe(true);
    expect(talk('editor', s).action).toBe('offer-q13');
    expect(objective(s, 'newsroom')).toContain('두 개의 흐름');
    expect(() => acceptQ13({ ...s, at: { room: 'trachea', ...rooms.trachea.spawn, facing: 'down' } })).toThrow();
    expect(accepted().q013.accepted).toBe(true);
    expect(canOfferQ13({ ...s, q012: { ...s.q012, publishedAt: null } })).toBe(false);
  });

  it('records each scene only beside it in the windpipe, together with the structure record', () => {
    const s = accepted();
    expect(() => recordQ13(s, 'rings')).toThrow('가까이');
    const a = recordQ13(at(s, 'trachea', 'rx-c-ring'), 'rings');
    expect(a.q013.notes).toEqual(['rings']); expect(a.inspected).toContain('rx:rx-c-ring');
    expect(recordQ13(a, 'rings')).toBe(a);
    expect(() => recordQ13(at(a, 'trachea', 'rx-c-ring'), 'carina')).toThrow();
    expect(objective(a, 'trachea')).toContain('(1/4)');
    expect(objective(a, 'trachea')).toContain('살펴보기');
    expect(objective(a, 'bronchi')).toContain('살펴보기');
    expect(objective(a, 'newsroom')).toContain('바디스코프에서 호흡기를 골라');
    expect(() => validateState(JSON.parse(JSON.stringify(a)))).not.toThrow();
  });

  it('opens the observer after the four scenes, in the middle of the trachea; only the breath changes', () => {
    const s = walked();
    expect(() => compareQ13(at(accepted(), 'trachea', 'rx-goblet'), 'in')).toThrow('네 장면');
    expect(() => compareQ13(at(s, 'trachea', 'rx-carina'), 'in')).toThrow('한가운데');
    const c = compareQ13(at(s, 'trachea', 'rx-goblet'), 'hold');
    expect(c.q013.compared).toEqual(['hold']); expect(compareQ13(c, 'hold')).toBe(c);
    expect(c.inspected).toContain('rx:rx-goblet');
    expect(objective(c, 'trachea')).toContain('관찰기');
    expect(q13Ready(compared())).toBe(true);
    const m = q13Text.observer.modes;
    expect([m.in.air, m.out.air, m.hold.air]).toEqual(['down', 'up', 'still']);
    expect(new Set([m.in.flows.mucus, m.out.flows.mucus, m.hold.flows.mucus]).size).toBe(1);
  });

  it('matches the airway clock: the observer clocks breathe in, out and hold; the mucus speed never depends on the breath', () => {
    for (let t = 0.3; t < 2.4; t += 0.1) expect(airflow(t)).toBeGreaterThan(0);
    for (let t = 3.0; t < 6.6; t += 0.1) expect(airflow(t)).toBeLessThan(0);
    expect(airflow(SWALLOW.at + 1.2)).toBe(0);
    expect(MUCUS_SPEED).toBeGreaterThan(0);
    // The windpipe and bronchial mucus tracks run up towards the throat (y decreases along each track).
    for (const m of rooms.trachea.airway!.mucus) expect(m.pts[m.pts.length - 1]!.y).toBeLessThan(m.pts[0]!.y);
    // In the bronchial tree every mucus track ends nearer the windpipe than it starts (side branches join bigger ones).
    const toTrachea = (p: { x: number; y: number }) => Math.min(Math.hypot(p.x - 300, p.y), Math.hypot(p.x - 440, p.y));
    for (const m of rooms.bronchi.airway!.mucus) expect(toTrachea(m.pts[m.pts.length - 1]!)).toBeLessThan(toTrachea(m.pts[0]!));
  });

  it('sorts movements into their flows; the wrong flow, a sorted card and the decoy are refused with a hint and never saved', () => {
    const s = compared();
    expect(() => sortQ13(walked(), 'tide', 'air')).toThrow();
    expect(() => sortQ13(s, 'up', 'air')).toThrow('Q013');
    expect(() => sortQ13(s, 'follow', 'mucus')).toThrow('섬모');
    const a = sortQ13(s, 'up', 'mucus');
    expect(a.q013.sorted).toEqual(['up']);
    expect(() => sortQ13(a, 'up', 'mucus')).toThrow('이미');
    expect(clearQ13Board(a).q013.sorted).toEqual([]);
    expect(() => selectQ13(ready(), 'lead', 'empty')).toThrow('섬모');
    expect(() => selectQ13(ready(), 'analogy', 'straw')).toThrow('점액');
    expect(() => validateState(JSON.parse(JSON.stringify({ ...s, q013: { ...s.q013, sorted: ['follow'] } })))).toThrow();
    expect(() => validateState(JSON.parse(JSON.stringify({ ...s, q013: { ...s.q013, sorted: ['up', 'up'] } })))).toThrow();
  });

  it('publishes once for 680XP·420G (Lv.13) with a reader reaction; reprints pay gold only', () => {
    const r = ready();
    expect(r.q013.checked).toBe(true);
    const p = publishQ13WithReaction(r, () => 0.5, '2026-10-26T03:00:00Z');
    expect(p.totalXp - r.totalXp).toBe(q13Reward.xp); expect(q13Reward).toEqual({ key: 'quest.Q013.first', xp: 680, gold: 420 });
    expect(levelOf(p.totalXp).level).toBe(13); expect(p.ledger).toContain('quest.Q013.first');
    expect(latestReaction(p)?.questId).toBe('Q013');
    expect(publishQ13(p)).toBe(p);
    const again = reprintArticle(p, p.reactions.count, () => 0.5, '2026-10-26T03:10:00Z', 'Q013');
    expect(again.totalXp).toBe(p.totalXp); expect(again.gold).toBeGreaterThan(p.gold);
    expect(() => validateState(JSON.parse(JSON.stringify(again)))).not.toThrow();
    expect(objective(p, 'newsroom')).toContain('발행 완료');
    expect(talk('editor', p).action).toBeUndefined();
  });

  it('rejects forged saves and keeps the fixture after publication valid', () => {
    const r = ready();
    expect(() => validateState(JSON.parse(JSON.stringify({ ...r, q013: { ...r.q013, publishedAt: '2026-10-26T00:00:00Z' } })))).toThrow();
    expect(() => validateQ13({ ...emptyQ13(), notes: ['rings'] })).toThrow();
    expect(() => validateQ13({ ...r.q013, lead: 'empty' })).toThrow();
    expect(() => validateState(JSON.parse(JSON.stringify({ ...q13Fixture(), q013: { ...emptyQ13(), accepted: true, notes: ['rings'] } })))).toThrow();
    const q12Open = q13Fixture();
    expect(() => validateState(JSON.parse(JSON.stringify({ ...q12Open, q012: { ...q12Open.q012, publishedAt: null }, ledger: q12Open.ledger.filter(k => k !== 'quest.Q012.first'), q013: { ...emptyQ13(), accepted: true } })))).toThrow();
    const f = validateState(JSON.parse(JSON.stringify(q14Fixture())));
    expect(levelOf(f.totalXp).level).toBe(13); expect(f.q013.publishedAt).not.toBeNull();
  });

  it('keeps the basic-course contract: no numbers on screens, at most three new names, sources for every scene', () => {
    const o = q13Text.observer;
    const screen = [q13Text.question, ...q13Text.offer, ...q13Text.notes.map(n => n.text + n.card + n.name + n.place), o.intro, o.singleVariable, o.limit, ...Object.values(o.views), ...Object.values(o.flowNames),
      ...breathModes.map(m => o.modes[m].text + o.modes[m].label + o.modes[m].result + Object.values(o.modes[m].flows).join('')), q13Text.board.intro, q13Text.board.wrong, ...q13Text.board.decoys.map(d => d.card + d.hint),
      ...q13Text.board.cards.map(c => c.card), ...q13Text.article.leads.map(l => l.text + l.title + (l.hint ?? '')), ...q13Text.article.analogies.map(a => a.text + (a.hint ?? '')),
      ...q13Text.article.limitations.map(l => l.text), q13Text.article.factcheck, q13Text.article.next, q13Text.article.reply].join('');
    expect(/[0-9]/.test(screen)).toBe(false);
    for (const w of ['감기', '독감', '코로나', '폐렴', '천식', '기관지염']) expect(screen).not.toContain(w);
    expect(q13Text.newNames.length).toBeLessThanOrEqual(3);
    const ids = q13Text.sources.map(s => s.id);
    for (const n of q13Text.notes) { expect(n.src.length).toBeGreaterThan(0); expect(n.src.every(id => ids.includes(id))).toBe(true); expect(rooms[n.room as RoomId].targets.some(t => t.id === n.target)).toBe(true); }
    expect(rooms.trachea.targets.some(t => t.id === o.target)).toBe(true);
    expect(q13Text.status).toBe('draft_unreviewed'); expect(q13Text.disclaimer).toContain('검수 전 모형');
  });
});

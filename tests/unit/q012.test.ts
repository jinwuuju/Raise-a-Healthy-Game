import { describe, expect, it } from 'vitest';
import { q12Fixture } from '../helpers/q012-fixture';
import { q13Fixture } from '../helpers/q013-fixture';
import { acceptQ12, canOfferQ12, checkQ12, clearQ12Board, compareQ12, placeQ12, publishQ12, q12Ready, q12Reward, recordQ12, selectQ12 } from '../../src/domain/q012';
import { emptyQ12, q12Evidence, q12Text, stepOrder, throatModes, validateQ12 } from '../../src/domain/q012-state';
import { epiglottisDown, glottisClosed, palateLift, swallowing, SWALLOW } from '../../src/domain/breath';
import { publishQ12WithReaction, reprintArticle } from '../../src/domain/reaction';
import { latestReaction } from '../../src/domain/reaction-state';
import { levelOf } from '../../src/domain/quest';
import { validateState, type GameState } from '../../src/domain/state';
import { objective, talk } from '../../src/application/story';
import { rooms } from '../../src/world/rooms';
import { canStand } from '../../src/world/collision';
import type { RoomId } from '../../src/world/types';

/* D113 Q012 ‘갈라지는 길’: four scenes in the pharynx and larynx, the fork observer (only what passes changes), the desk. */

function at(s: GameState, room: RoomId, target: string): GameState {
  const t = rooms[room].targets.find(t => t.id === target)!;
  for (let dx = -22; dx <= 22; dx += 2) for (let dy = -22; dy <= 22; dy += 2) { const p = { x: t.x + dx, y: t.y + dy }; if (Math.hypot(dx, dy) <= t.r && canStand(room, p)) return { ...s, at: { room, ...p, facing: 'up' } }; }
  throw new Error('Unreachable target ' + target);
}
const desk = (s: GameState): GameState => at(s, 'newsroom', 'my-desk');
const accepted = (): GameState => acceptQ12(q12Fixture());
function walked(): GameState {
  let s = accepted();
  for (const n of q12Text.notes) s = recordQ12(at(s, n.room as RoomId, n.target), n.id as typeof q12Evidence[number]);
  return s;
}
function compared(): GameState {
  let s = at(walked(), 'pharynx', 'rx-esophagus');
  for (const m of throatModes) s = compareQ12(s, m);
  return desk(s);
}
function ready(): GameState {
  let s = compared();
  for (const id of stepOrder) s = placeQ12(s, id);
  return checkQ12(selectQ12(selectQ12(selectQ12(s, 'lead', 'reader'), 'analogy', 'rail'), 'limit', 'analogy'));
}

describe('D113 Q012 the fork in the throat (basic course)', () => {
  it('is offered after the air-port article, only in the newsroom; old saves read an empty commission', () => {
    const s = q12Fixture();
    expect(validateState(JSON.parse(JSON.stringify(s))).q012).toEqual(emptyQ12());
    const { q012: _q, ...old } = s; expect(validateState(JSON.parse(JSON.stringify(old))).q012).toEqual(emptyQ12());
    expect(canOfferQ12(s)).toBe(true);
    expect(talk('editor', s).action).toBe('offer-q12');
    expect(objective(s, 'newsroom')).toContain('갈라지는 길');
    expect(() => acceptQ12({ ...s, at: { room: 'pharynx', ...rooms.pharynx.spawn, facing: 'right' } })).toThrow();
    expect(accepted().q012.accepted).toBe(true);
    // Before Q011 is published the fork is not offered.
    expect(canOfferQ12({ ...s, q011: { ...s.q011, publishedAt: null } })).toBe(false);
  });

  it('records each scene only beside it in the throat, together with the structure record', () => {
    const s = accepted();
    expect(() => recordQ12(s, 'palate')).toThrow('가까이');
    const a = recordQ12(at(s, 'pharynx', 'rx-soft-palate'), 'palate');
    expect(a.q012.notes).toEqual(['palate']); expect(a.inspected).toContain('rx:rx-soft-palate');
    expect(recordQ12(a, 'palate')).toBe(a);
    expect(() => recordQ12(at(a, 'pharynx', 'rx-soft-palate'), 'lid')).toThrow();
    expect(objective(a, 'pharynx')).toContain('(1/4)');
    expect(objective(a, 'larynx')).toContain('살펴보기'); // the scenes left in this room come first
    expect(objective(a, 'newsroom')).toContain('바디스코프에서 호흡기를 골라');
    expect(() => validateState(JSON.parse(JSON.stringify(a)))).not.toThrow();
  });

  it('opens the observer after the four scenes, in front of the oesophagus; only what passes the throat changes', () => {
    const s = walked();
    expect(() => compareQ12(at(accepted(), 'pharynx', 'rx-esophagus'), 'breath')).toThrow('네 장면');
    expect(() => compareQ12(at(s, 'larynx', 'rx-epiglottis'), 'breath')).toThrow('식도 입구');
    const c = compareQ12(at(s, 'pharynx', 'rx-esophagus'), 'swallow');
    expect(c.q012.compared).toEqual(['swallow']); expect(compareQ12(c, 'swallow')).toBe(c);
    expect(c.inspected).toContain('rx:rx-esophagus'); // the replay stays reachable after publication (detail tier)
    expect(objective(c, 'pharynx')).toContain('관찰기');
    expect(q12Ready(compared())).toBe(true);
    const m = q12Text.observer.modes;
    expect([m.breath.route, m.swallow.route, m.slip.route]).toEqual(['front', 'back', 'cough']);
    expect(m.swallow.gates.breath).toContain('멈춤'); expect(m.slip.text).toContain('기침');
  });

  it('matches the airway clock: during a swallow the palate lifts, the lid covers, the folds close and breath stops', () => {
    const mid = SWALLOW.at + SWALLOW.length / 2;
    expect(swallowing(mid)).toBe(true);
    expect(palateLift(mid)).toBe(1); expect(epiglottisDown(mid)).toBe(1); expect(glottisClosed(mid)).toBe(1);
    expect(palateLift(1)).toBe(0); expect(epiglottisDown(1)).toBe(0); expect(glottisClosed(1)).toBe(0);
  });

  it('puts the swallow steps in order; later steps, used steps and the decoy are refused with a hint and never saved', () => {
    const s = compared();
    expect(() => placeQ12(walked(), 'arrive')).toThrow();
    expect(() => placeQ12(s, 'down')).toThrow('Q012'); // a later step points back to a scene
    expect(() => placeQ12(s, 'both')).toThrow('식도 입구');
    const a = placeQ12(s, 'arrive');
    expect(a.q012.order).toEqual(['arrive']);
    expect(() => placeQ12(a, 'arrive')).toThrow('이미');
    expect(clearQ12Board(a).q012.order).toEqual([]);
    expect(() => selectQ12(ready(), 'lead', 'never')).toThrow('기침');
    expect(() => selectQ12(ready(), 'analogy', 'straws')).toThrow('갈라져요');
    const bad = JSON.parse(JSON.stringify({ ...s, q012: { ...s.q012, order: ['close'] } }));
    expect(() => validateState(bad)).toThrow();
  });

  it('publishes once for 600XP·400G (Lv.12) with a reader reaction; reprints pay gold only', () => {
    const r = ready();
    expect(r.q012.checked).toBe(true);
    const p = publishQ12WithReaction(r, () => 0.5, '2026-10-23T03:00:00Z');
    expect(p.totalXp - r.totalXp).toBe(q12Reward.xp); expect(q12Reward).toEqual({ key: 'quest.Q012.first', xp: 600, gold: 400 });
    expect(levelOf(p.totalXp).level).toBe(12); expect(p.ledger).toContain('quest.Q012.first');
    expect(latestReaction(p)?.questId).toBe('Q012');
    expect(publishQ12(p)).toBe(p);
    const again = reprintArticle(p, p.reactions.count, () => 0.5, '2026-10-23T03:10:00Z', 'Q012');
    expect(again.totalXp).toBe(p.totalXp); expect(again.gold).toBeGreaterThan(p.gold);
    expect(() => validateState(JSON.parse(JSON.stringify(again)))).not.toThrow();
    expect(objective(p, 'newsroom')).toContain('발행 완료');
    expect(talk('editor', p).action).toBeUndefined();
  });

  it('rejects forged saves and keeps the fixture after publication valid', () => {
    const r = ready();
    expect(() => validateState(JSON.parse(JSON.stringify({ ...r, q012: { ...r.q012, publishedAt: '2026-10-23T00:00:00Z' } })))).toThrow(); // no reward record
    expect(() => validateQ12({ ...emptyQ12(), notes: ['palate'] })).toThrow(); // not accepted
    expect(() => validateQ12({ ...r.q012, lead: 'never' })).toThrow(); // a refused lead is never stored
    expect(() => validateState(JSON.parse(JSON.stringify({ ...q12Fixture(), q012: { ...emptyQ12(), accepted: true, notes: ['palate'] } })))).toThrow(); // scene without its structure record
    const q11Open = q12Fixture(); // accepting before the air-port article is a forgery
    expect(() => validateState(JSON.parse(JSON.stringify({ ...q11Open, q011: { ...q11Open.q011, publishedAt: null }, ledger: q11Open.ledger.filter(k => k !== 'quest.Q011.first'), q012: { ...emptyQ12(), accepted: true } })))).toThrow();
    const f = validateState(JSON.parse(JSON.stringify(q13Fixture())));
    expect(levelOf(f.totalXp).level).toBe(12); expect(f.q012.publishedAt).not.toBeNull();
  });

  it('keeps the basic-course contract: no numbers on screens, at most three new names, sources for every scene', () => {
    const o = q12Text.observer;
    const screen = [q12Text.question, ...q12Text.offer, ...q12Text.notes.map(n => n.text + n.card + n.name + n.place), o.intro, o.singleVariable, o.limit, ...Object.values(o.views), ...Object.values(o.gateNames),
      ...throatModes.map(m => o.modes[m].text + o.modes[m].label + o.modes[m].result + Object.values(o.modes[m].gates).join('')), q12Text.board.intro, q12Text.board.wrong, ...q12Text.board.decoys.map(d => d.card + d.hint),
      ...q12Text.board.steps.map(s => s.card), ...q12Text.article.leads.map(l => l.text + l.title + (l.hint ?? '')), ...q12Text.article.analogies.map(a => a.text + (a.hint ?? '')),
      ...q12Text.article.limitations.map(l => l.text), q12Text.article.factcheck, q12Text.article.next, q12Text.article.reply].join('');
    expect(/[0-9]/.test(screen)).toBe(false);
    for (const w of ['감기', '독감', '코로나', '폐렴', '천식']) expect(screen).not.toContain(w);
    expect(q12Text.newNames.length).toBeLessThanOrEqual(3);
    const ids = q12Text.sources.map(s => s.id);
    for (const n of q12Text.notes) { expect(n.src.length).toBeGreaterThan(0); expect(n.src.every(id => ids.includes(id))).toBe(true); expect(rooms[n.room as RoomId].targets.some(t => t.id === n.target)).toBe(true); }
    expect(rooms.pharynx.targets.some(t => t.id === o.target)).toBe(true);
    expect(q12Text.status).toBe('draft_unreviewed'); expect(q12Text.disclaimer).toContain('검수 전 모형');
  });
});

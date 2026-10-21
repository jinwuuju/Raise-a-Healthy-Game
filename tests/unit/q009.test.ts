import { describe, expect, it } from 'vitest';
import { q9Fixture } from '../helpers/q009-fixture';
import { q10Fixture } from '../helpers/q010-fixture';
import { acceptQ9, canOfferQ9, chainQ9, checkQ9, clearQ9Board, publishQ9, q9Reward, recordQ9, selectQ9, slotQ9 } from '../../src/domain/q009';
import { chainOrder, emptyQ9, q9Text, slotOrder, validateQ9, type Q9Evidence } from '../../src/domain/q009-state';
import { publishQ9WithReaction, reprintArticle } from '../../src/domain/reaction';
import { latestReaction } from '../../src/domain/reaction-state';
import { levelOf } from '../../src/domain/quest';
import { newState, validateState, type GameState } from '../../src/domain/state';
import { objective, talk } from '../../src/application/story';
import { rooms } from '../../src/world/rooms';
import { canStand } from '../../src/world/collision';
import type { RoomId } from '../../src/world/types';

/* D108 Q009 ‘독자에게 설명하는 순환’: basic course, a known principle applied to a new arrangement (design 03), no new disease. */

function at(s: GameState, room: RoomId, target: string): GameState {
  const t = rooms[room].targets.find(t => t.id === target)!;
  for (let dx = -20; dx <= 20; dx += 2) for (let dy = -20; dy <= 20; dy += 2) { const p = { x: t.x + dx, y: t.y + dy }; if (Math.hypot(dx, dy) <= t.r && canStand(room, p)) return { ...s, at: { room, ...p, facing: 'up' } }; }
  throw new Error('Unreachable target ' + target);
}
const desk = (s: GameState): GameState => at(s, 'newsroom', 'my-desk');
function evidenced(): GameState {
  let s = acceptQ9(q9Fixture());
  for (const n of q9Text.notes) s = recordQ9(at(s, n.room as RoomId, n.target), n.id as Q9Evidence);
  return desk(s);
}
function boarded(): GameState {
  let s = evidenced();
  for (const id of slotOrder) s = slotQ9(s, id);
  for (const id of chainOrder) s = chainQ9(s, id);
  return s;
}
const ready = (): GameState => checkQ9(selectQ9(selectQ9(selectQ9(boarded(), 'lead', 'mirror'), 'analogy', 'two-pumps'), 'limit', 'analogy'));

describe('D108 Q009 circulation explained to readers', () => {
  it('is offered after Q008 is published, only in the newsroom, and the editor speaks the offer', () => {
    const s = q9Fixture();
    expect(validateState(s).q009).toEqual(emptyQ9());
    expect(canOfferQ9(s)).toBe(true);
    expect(canOfferQ9(newState())).toBe(false);
    expect(talk('editor', s).action).toBe('offer-q9');
    expect(objective(s, 'newsroom')).toContain('독자에게 설명하는 순환');
    expect(() => acceptQ9(at(s, 'aorta', 'hx-ascending'))).toThrow();
    expect(acceptQ9(s).q009.accepted).toBe(true);
  });

  it('re-checks four pieces of evidence in the heart, each only at its own place, before the desk opens', () => {
    const s = acceptQ9(q9Fixture());
    for (const n of q9Text.notes) expect(rooms[n.room as RoomId].targets.some(t => t.id === n.target)).toBe(true);
    expect(() => recordQ9(s, 'wall')).toThrow();
    expect(() => recordQ9(at(s, 'lv', 'hx-av-below'), 'wall')).toThrow();
    expect(objective(s, 'newsroom')).toContain('근거 다시 보기');
    expect(() => slotQ9(desk(recordQ9(at(s, 'heart', 'hx-fossa'), 'wall')), 'ra')).toThrow(/근거 네 곳/);
    expect(evidenced().q009.notes).toEqual(['wall', 'right-pump', 'lung', 'left-pump']);
    expect(() => slotQ9(at(evidenced(), 'heart', 'hx-fossa'), 'ra')).toThrow(/편집국/);
  });

  it('reads the picture drawn facing the person: a wrong room shows only the missing side or level, never saved', () => {
    const s = evidenced();
    expect(() => slotQ9(s, 'la')).toThrow(q9Text.board.sideHint); // the person's left sits on the picture's right
    expect(() => slotQ9(s, 'rv')).toThrow(q9Text.board.levelHint); // atria on top
    expect(() => slotQ9(s, 'lv')).toThrow(q9Text.board.sideHint);
    expect(s.q009.slots).toEqual([]);
    let p = s; for (const id of slotOrder) p = slotQ9(p, id);
    expect(p.q009.slots).toEqual(['ra', 'rv', 'la', 'lv']);
  });

  it('joins one loop with evidence: decoys have none, an out-of-order card shows only the missing link', () => {
    let s = evidenced();
    expect(() => chainQ9(s, 'ra')).toThrow(q9Text.board.needSlots);
    for (const id of slotOrder) s = slotQ9(s, id);
    expect(() => chainQ9(s, 'rv')).toThrow(q9Text.board.startHint);
    s = chainQ9(s, 'ra');
    expect(() => chainQ9(s, 'cross')).toThrow(/근거가 없는 연결/);
    expect(() => chainQ9(chainQ9(s, 'rv'), 'skip')).toThrow(/폐로 가는 길/);
    expect(() => chainQ9(chainQ9(s, 'rv'), 'la')).toThrow(/‘우심실’ 다음/);
    expect(chainQ9(s, 'rv').q009.chain).toEqual(['ra', 'rv']);
    expect(q9Text.board.chain.every(c => q9Text.notes.some(n => n.id === c.evidence))).toBe(true);
    const b = boarded();
    expect(b.q009.chain).toEqual(chainOrder);
    expect(clearQ9Board(b).q009).toMatchObject({ slots: [], chain: [] });
    expect(clearQ9Board(b).q009.notes).toEqual(b.q009.notes);
  });

  it('refuses the filter analogy with a hint and needs a lead, an analogy and a limitation before the editor check', () => {
    const b = boarded();
    expect(() => selectQ9(b, 'analogy', 'filter')).toThrow(/거르지 않고/);
    expect(checkQ9(selectQ9(b, 'lead', 'loop')).q009.checked).toBe(false);
    expect(ready().q009.checked).toBe(true);
  });

  it('publishes once for the existing reward (500XP·350G, Lv.10) with a reader reaction; reprints pay gold only', () => {
    const r = ready();
    const before = r.totalXp, p = publishQ9WithReaction(r, () => 0.5, '2026-10-21T03:00:00Z');
    expect(p.totalXp - before).toBe(q9Reward.xp); expect(q9Reward).toEqual({ key: 'quest.Q009.first', xp: 500, gold: 350 });
    expect(p.totalXp).toBe(2700); expect(levelOf(p.totalXp).level).toBe(10);
    expect(latestReaction(p)!.questId).toBe('Q009');
    expect(publishQ9(p)).toBe(p);
    expect(validateState(p).q009.publishedAt).toBe('2026-10-21T03:00:00Z');
    const again = reprintArticle(p, p.reactions.count, () => 0.5, '2026-10-21T04:00:00Z', 'Q009');
    expect(again.totalXp).toBe(p.totalXp); expect(again.gold).toBeGreaterThan(p.gold);
    expect(() => reprintArticle(r, r.reactions.count, () => 0.5, '2026-10-21T04:00:00Z', 'Q009')).toThrow();
    expect(objective(p, 'newsroom')).toContain('준비 중');
  });

  it('validates saves: old saves read empty, forged pictures, loops and analogies are refused', () => {
    const old = JSON.parse(JSON.stringify(q9Fixture())); delete old.q009;
    expect(validateState(old).q009).toEqual(emptyQ9());
    expect(validateState(q10Fixture()).q009.publishedAt).not.toBeNull();
    const r = ready();
    expect(validateState(r).q009).toEqual(r.q009);
    expect(() => validateQ9({ ...r.q009, slots: ['la', 'rv', 'ra', 'lv'] })).toThrow();
    expect(() => validateQ9({ ...r.q009, chain: ['ra', 'rv', 'la', 'lung', 'lv', 'body'] })).toThrow();
    expect(() => validateQ9({ ...r.q009, analogy: 'filter' })).toThrow();
    expect(() => validateQ9({ ...emptyQ9(), accepted: true, notes: ['wall'], slots: ['ra'] })).toThrow();
    expect(() => validateState({ ...q9Fixture(), q008: { ...q9Fixture().q008, publishedAt: null }, ledger: q9Fixture().ledger.filter(k => k !== 'quest.Q008.first'), q009: { ...emptyQ9(), accepted: true } })).toThrow();
  });

  it('keeps the basic-course contract: no numbers on screen, no new disease, no advanced-only words', () => {
    expect(q9Text.tier).toBe('basic');
    const b = q9Text.board, a = q9Text.article;
    const screen = [q9Text.question, ...q9Text.offer, ...q9Text.notes.map(n => n.text), b.picture, b.sideHint, b.levelHint, b.startHint, b.nextHint, b.twice,
      ...b.chain.map(c => c.card), ...b.decoys.map(d => d.card + d.hint), ...a.leads.map(l => l.text), ...a.analogies.map(x => x.text), ...a.limitations.map(l => l.text), a.factcheck, a.reply].join('');
    expect(/[0-9]/.test(screen)).toBe(false);
    expect(JSON.stringify(q9Text)).not.toMatch(/협심증|심근경색|심부전|이상지질혈증|수면무호흡|고혈압/);
  });
});

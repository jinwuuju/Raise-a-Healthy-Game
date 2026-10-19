import { describe, expect, it } from 'vitest';
import { q7Fixture } from '../helpers/q007-fixture';
import { acceptQ7, canOfferQ7, chainQ7, checkQ7, clearQ7Board, pairQ7, publishQ7, q7Reward, recordQ7, selectQ7, setQ7Mode } from '../../src/domain/q007';
import { chainOrder, emptyQ7, q7Text, validateQ7, type Q7Evidence } from '../../src/domain/q007-state';
import { publishQ7WithReaction, reprintArticle } from '../../src/domain/reaction';
import { latestReaction } from '../../src/domain/reaction-state';
import { levelOf } from '../../src/domain/quest';
import { newState, validateState, type GameState } from '../../src/domain/state';
import { objective, talk } from '../../src/application/story';
import { rooms } from '../../src/world/rooms';
import { canStand } from '../../src/world/collision';
import type { RoomId } from '../../src/world/types';

/* D108 Q007 ‘좁아진 모형 통로’: basic course (design 19), atherosclerosis basic layer, one condition at a time. */
function at(s: GameState, room: RoomId, target: string): GameState {
  const t = rooms[room].targets.find(t => t.id === target)!;
  for (let dx = -20; dx <= 20; dx += 2) for (let dy = -20; dy <= 20; dy += 2) { const p = { x: t.x + dx, y: t.y + dy }; if (Math.hypot(dx, dy) <= t.r && canStand(room, p)) return { ...s, at: { room, ...p, facing: 'up' } }; }
  throw new Error('Unreachable target ' + target);
}
const desk = (s: GameState): GameState => at(s, 'newsroom', 'my-desk');
const sinus = (s: GameState): GameState => at(s, 'aorta', 'hx-sinus');
function observed(): GameState {
  let s = acceptQ7(q7Fixture());
  for (const n of q7Text.notes) s = recordQ7(at(s, n.room as RoomId, n.target), n.id as Q7Evidence);
  return s;
}
function compared(): GameState {
  let s = recordQ7(setQ7Mode(sinus(observed()), 'mild'), 'mild');
  s = recordQ7(setQ7Mode(s, 'narrow'), 'narrow');
  return setQ7Mode(s, 'wide');
}
function researched(): GameState {
  let s = desk(compared());
  for (const id of ['causes', 'tests', 'care'] as const) s = recordQ7(s, id);
  return s;
}
function ready(): GameState {
  let s = pairQ7(researched(), 'narrow-rest');
  for (const id of chainOrder) s = chainQ7(s, id);
  return checkQ7(selectQ7(selectQ7(s, 'lead', 'open-road'), 'limit', 'model'));
}

describe('D108 Q007 passage comparison', () => {
  it('is offered after Q006 is published, only in the newsroom, and the editor speaks the offer', () => {
    const s = q7Fixture();
    expect(canOfferQ7(s)).toBe(true);
    expect(canOfferQ7(newState())).toBe(false);
    expect(talk('editor', s).action).toBe('offer-q7');
    expect(objective(s, 'newsroom')).toContain('좁아진 모형 통로');
    expect(() => acceptQ7(at(s, 'aorta', 'hx-sinus'))).toThrow();
    expect(acceptQ7(s).q007.accepted).toBe(true);
  });

  it('starts from the normal entrances: both seen up close before the observer opens', () => {
    const s = acceptQ7(q7Fixture());
    expect(() => recordQ7(s, 'lca-wall')).toThrow();
    expect(() => setQ7Mode(sinus(s), 'mild')).toThrow();
    const one = recordQ7(at(s, 'aorta', 'hx-lca'), 'lca-wall');
    expect(() => setQ7Mode(sinus(one), 'mild')).toThrow();
    expect(setQ7Mode(sinus(observed()), 'mild').q007.mode).toBe('mild');
    expect(() => setQ7Mode(at(observed(), 'aorta', 'hx-lca'), 'mild')).toThrow();
  });

  it('changes one condition at a time: a little narrower before much narrower, recorded only in that mode', () => {
    const s = sinus(observed());
    expect(() => recordQ7(setQ7Mode(s, 'narrow'), 'narrow')).toThrow();
    expect(() => recordQ7(s, 'mild')).toThrow(); // still wide
    const c = compared();
    expect(c.q007.notes).toEqual(['lca-wall', 'rca-wall', 'mild', 'narrow']);
    expect(c.q007.mode).toBe('wide');
  });

  it('takes the three materials at the desk in order', () => {
    const c = compared();
    expect(() => recordQ7(c, 'causes')).toThrow(); // not at the desk
    expect(() => recordQ7(desk(c), 'tests')).toThrow();
    expect(researched().q007.notes.slice(-3)).toEqual(['causes', 'tests', 'care']);
  });

  it('refuses a two-change pair and the cut-road decoy with hints, never saving them', () => {
    const s = researched();
    expect(() => pairQ7(s, 'narrow-work')).toThrow(/두 가지/);
    expect(() => chainQ7(pairQ7(s, 'narrow-rest'), 'cut')).toThrow(/이어져/);
    expect(() => chainQ7(pairQ7(s, 'narrow-rest'), 'less-flow')).toThrow(/순서/);
    const half = chainQ7(pairQ7(s, 'narrow-rest'), 'buildup');
    expect(half.q007.chain).toEqual(['buildup']);
    expect(clearQ7Board(half).q007).toMatchObject({ pair: null, chain: [] });
    expect(clearQ7Board(half).q007.notes).toEqual(half.q007.notes);
  });

  it('publishes once for the existing reward (400XP·260G, Lv.8) with a reader reaction; reprints pay gold only', () => {
    const r = ready();
    expect(r.q007.checked).toBe(true);
    const before = r.totalXp, p = publishQ7WithReaction(r, () => 0.5, '2026-10-19T03:00:00Z');
    expect(p.totalXp - before).toBe(q7Reward.xp); expect(q7Reward).toEqual({ key: 'quest.Q007.first', xp: 400, gold: 260 });
    expect(levelOf(p.totalXp).level).toBe(8);
    expect(latestReaction(p)!.questId).toBe('Q007');
    expect(publishQ7(p)).toBe(p);
    expect(validateState(p).q007.publishedAt).toBe('2026-10-19T03:00:00Z');
    const again = reprintArticle(p, p.reactions.count, () => 0.5, '2026-10-19T04:00:00Z', 'Q007');
    expect(again.totalXp).toBe(p.totalXp); expect(again.gold).toBeGreaterThan(p.gold);
    expect(() => reprintArticle(r, r.reactions.count, () => 0.5, '2026-10-19T04:00:00Z', 'Q007')).toThrow();
  });

  it('validates saves: old saves read empty, forged boards and out-of-order notes are refused', () => {
    const old = JSON.parse(JSON.stringify(q7Fixture())); delete old.q007;
    expect(validateState(old).q007).toEqual(emptyQ7());
    const r = ready();
    expect(validateState(r).q007).toEqual(r.q007);
    expect(() => validateQ7({ ...r.q007, chain: ['narrowing', 'buildup', 'less-flow'] })).toThrow();
    expect(() => validateQ7({ ...r.q007, pair: 'narrow-work' })).toThrow();
    expect(() => validateQ7({ ...r.q007, notes: ['lca-wall', 'rca-wall', 'narrow', 'mild', 'causes', 'tests', 'care'] })).toThrow();
    expect(() => validateQ7({ ...emptyQ7(), accepted: true, notes: ['lca-wall', 'rca-wall', 'narrow'] })).toThrow();
    expect(() => validateState({ ...r, q007: { ...r.q007, mode: 'narrow' } })).toThrow(); // narrowed only at the aorta
    expect(() => validateState({ ...q7Fixture(), q006: { ...q7Fixture().q006, publishedAt: null }, ledger: q7Fixture().ledger.filter(k => k !== 'quest.Q006.first'), q007: { ...emptyQ7(), accepted: true } })).toThrow();
  });

  it('keeps the basic-course contract: no numbers in materials and the layer is labelled', () => {
    expect(q7Text.tier).toBe('basic');
    for (const m of q7Text.materials) expect(/[0-9]/.test(m.text + m.cards.map(c => c.text).join(''))).toBe(false);
    expect(q7Text.layerLimit).toContain('질환 레이어');
    expect(JSON.stringify(q7Text)).not.toMatch(/협심증|심근경색|심부전/);
  });
});

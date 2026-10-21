import { describe, expect, it } from 'vitest';
import { q8Fixture } from '../helpers/q008-fixture';
import { q9Fixture } from '../helpers/q009-fixture';
import { acceptQ8, canOfferQ8, checkQ8, clearQ8Board, pickQ8, publishQ8, q8Reward, recordQ8, selectQ8, setQ8Mode, verdictQ8 } from '../../src/domain/q008';
import { emptyQ8, q8Text, recordPicks, validateQ8, type Q8Evidence } from '../../src/domain/q008-state';
import { pressurePush, settle } from '../../src/domain/pressure-model';
import { publishQ8WithReaction, reprintArticle } from '../../src/domain/reaction';
import { latestReaction } from '../../src/domain/reaction-state';
import { levelOf } from '../../src/domain/quest';
import { newState, validateState, type GameState } from '../../src/domain/state';
import { objective, talk } from '../../src/application/story';
import { rooms } from '../../src/world/rooms';
import { canStand } from '../../src/world/collision';
import type { RoomId } from '../../src/world/types';

/* D108 Q008 ‘하나의 숫자로 충분할까’: basic course (design 19), hypertension basic layer without threshold numbers. */

function at(s: GameState, room: RoomId, target: string): GameState {
  const t = rooms[room].targets.find(t => t.id === target)!;
  for (let dx = -20; dx <= 20; dx += 2) for (let dy = -20; dy <= 20; dy += 2) { const p = { x: t.x + dx, y: t.y + dy }; if (Math.hypot(dx, dy) <= t.r && canStand(room, p)) return { ...s, at: { room, ...p, facing: 'up' } }; }
  throw new Error('Unreachable target ' + target);
}
const desk = (s: GameState): GameState => at(s, 'newsroom', 'my-desk');
const observer = (s: GameState): GameState => at(s, 'aorta', 'hx-ascending');
function observed(): GameState {
  let s = acceptQ8(q8Fixture());
  for (const n of q8Text.notes) s = recordQ8(at(s, n.room as RoomId, n.target), n.id as Q8Evidence);
  return s;
}
function compared(): GameState {
  let s = recordQ8(setQ8Mode(observer(observed()), 'moved'), 'moved');
  s = recordQ8(setQ8Mode(s, 'high'), 'high');
  return setQ8Mode(s, 'rest');
}
function researched(): GameState {
  let s = desk(compared());
  for (const id of ['causes', 'tests', 'care'] as const) s = recordQ8(s, id);
  return s;
}
function ready(): GameState {
  let s = researched();
  for (const id of recordPicks) s = pickQ8(s, id);
  s = verdictQ8(s, 'repeat');
  return checkQ8(selectQ8(selectQ8(s, 'lead', 'one-number'), 'limit', 'model'));
}

describe('D108 Q008 blood-pressure records', () => {
  it('is offered after Q007 is published, only in the newsroom, and the editor speaks the offer', () => {
    const s = q8Fixture();
    expect(validateState(s).q008).toEqual(emptyQ8());
    expect(canOfferQ8(s)).toBe(true);
    expect(canOfferQ8(newState())).toBe(false);
    expect(talk('editor', s).action).toBe('offer-q8');
    expect(objective(s, 'newsroom')).toContain('하나의 숫자로 충분할까');
    expect(() => acceptQ8(observer(s))).toThrow();
    expect(acceptQ8(s).q008.accepted).toBe(true);
  });

  it('starts from the normal push: squeeze in the left ventricle and recoil in the aorta, before the observer opens', () => {
    const s = acceptQ8(q8Fixture());
    expect(() => recordQ8(s, 'squeeze')).toThrow();
    expect(() => setQ8Mode(observer(s), 'moved')).toThrow();
    const one = recordQ8(at(s, 'lv', 'hx-av-below'), 'squeeze');
    expect(() => setQ8Mode(observer(one), 'moved')).toThrow();
    expect(setQ8Mode(observer(observed()), 'moved').q008.mode).toBe('moved');
    expect(() => setQ8Mode(at(observed(), 'aorta', 'hx-sinus'), 'moved')).toThrow();
  });

  it('changes one thing at a time: just moved before high while resting, recorded only in that mode', () => {
    const s = observer(observed());
    expect(() => recordQ8(setQ8Mode(s, 'high'), 'high')).toThrow(/막 움직인 뒤부터/);
    expect(() => recordQ8(s, 'moved')).toThrow(); // still at rest
    const c = compared();
    expect(c.q008.notes).toEqual(['squeeze', 'recoil', 'moved', 'high']);
    expect(c.q008.mode).toBe('rest');
  });

  it('draws high while resting above even the resting peak, and a just-moved rise that settles back', () => {
    expect(pressurePush('high', 0)).toBeGreaterThan(pressurePush('rest', 1));
    expect(pressurePush('rest', 0)).toBeGreaterThan(0); // the wall recoil keeps pressure between beats
    expect(pressurePush('moved', 1, 0)).toBeGreaterThan(pressurePush('rest', 1));
    expect(settle(9)).toBe(0); expect(pressurePush('moved', 0.5, 9)).toBeCloseTo(pressurePush('rest', 0.5));
  });

  it('takes the three materials at the desk in order', () => {
    const c = compared();
    expect(() => recordQ8(c, 'causes')).toThrow(); // not at the desk
    expect(() => recordQ8(desk(c), 'tests')).toThrow();
    expect(researched().q008.notes.slice(-3)).toEqual(['causes', 'tests', 'care']);
  });

  it('refuses different-condition and unlabelled records and both wrong verdicts with hints, never saving them', () => {
    const s = researched();
    expect(() => pickQ8(s, 'stairs')).toThrow(/조건이 달라요/);
    expect(() => pickQ8(s, 'unknown')).toThrow(/적혀 있지 않아/);
    expect(() => verdictQ8(pickQ8(s, 'home-1'), 'repeat')).toThrow(/세 장/);
    let three = s; for (const id of recordPicks) three = pickQ8(three, id);
    expect(() => verdictQ8(three, 'diagnose')).toThrow(/관찰/);
    expect(() => verdictQ8(three, 'ignore')).toThrow(/느낌이 없어서/);
    expect(three.q008.picks).toEqual(['home-1', 'home-2', 'home-3']);
    expect(clearQ8Board(three).q008).toMatchObject({ picks: [], verdict: null });
    expect(clearQ8Board(three).q008.notes).toEqual(three.q008.notes);
  });

  it('publishes once for the existing reward (450XP·300G, Lv.9) with a reader reaction; reprints pay gold only', () => {
    const r = ready();
    expect(r.q008.checked).toBe(true);
    const before = r.totalXp, p = publishQ8WithReaction(r, () => 0.5, '2026-10-19T06:00:00Z');
    expect(p.totalXp - before).toBe(q8Reward.xp); expect(q8Reward).toEqual({ key: 'quest.Q008.first', xp: 450, gold: 300 });
    expect(p.totalXp).toBe(2200); expect(levelOf(p.totalXp).level).toBe(9);
    expect(latestReaction(p)!.questId).toBe('Q008');
    expect(publishQ8(p)).toBe(p);
    expect(validateState(p).q008.publishedAt).toBe('2026-10-19T06:00:00Z');
    const again = reprintArticle(p, p.reactions.count, () => 0.5, '2026-10-19T07:00:00Z', 'Q008');
    expect(again.totalXp).toBe(p.totalXp); expect(again.gold).toBeGreaterThan(p.gold);
    expect(() => reprintArticle(r, r.reactions.count, () => 0.5, '2026-10-19T07:00:00Z', 'Q008')).toThrow();
    expect(objective(p, 'newsroom')).toContain('독자에게 설명하는 순환'); // Q009 is offered next
  });

  it('validates saves: old saves read empty, forged boards and out-of-order notes are refused', () => {
    const old = JSON.parse(JSON.stringify(q8Fixture())); delete old.q008;
    expect(validateState(old).q008).toEqual(emptyQ8());
    expect(validateState(q9Fixture()).q008.publishedAt).not.toBeNull();
    const r = ready();
    expect(validateState(r).q008).toEqual(r.q008);
    expect(() => validateQ8({ ...r.q008, picks: ['home-1', 'stairs', 'home-3'] })).toThrow();
    expect(() => validateQ8({ ...r.q008, verdict: 'diagnose' })).toThrow();
    expect(() => validateQ8({ ...r.q008, picks: ['home-1', 'home-2'] })).toThrow(); // a verdict needs all three records
    expect(() => validateQ8({ ...r.q008, notes: ['squeeze', 'recoil', 'high', 'moved', 'causes', 'tests', 'care'] })).toThrow();
    expect(() => validateQ8({ ...emptyQ8(), accepted: true, notes: ['squeeze', 'recoil', 'high'] })).toThrow();
    expect(() => validateState({ ...r, q008: { ...r.q008, mode: 'high' } })).toThrow(); // only at the aorta
    expect(() => validateState({ ...q8Fixture(), q007: { ...q8Fixture().q007, publishedAt: null, checked: true }, ledger: q8Fixture().ledger.filter(k => k !== 'quest.Q007.first'), q008: { ...emptyQ8(), accepted: true } })).toThrow();
  });

  it('keeps the basic-course contract: no numbers on screen, no thresholds, the layer is labelled', () => {
    expect(q8Text.tier).toBe('basic');
    const screen = [q8Text.question, ...q8Text.offer, ...q8Text.notes.map(n => n.text), ...Object.values(q8Text.comparison).map(c => c.text), q8Text.singleVariable,
      ...q8Text.materials.map(m => m.text + m.cards.map(c => c.text).join('')), ...q8Text.board.records.map(r => r.card + (r.hint ?? '')), ...q8Text.board.verdicts.map(v => v.card + (v.hint ?? '')),
      ...q8Text.article.leads.map(l => l.text), ...q8Text.article.limitations.map(l => l.text), q8Text.article.factcheck].join('');
    expect(/[0-9]/.test(screen)).toBe(false);
    expect(JSON.stringify(q8Text)).not.toMatch(/mm ?Hg|협심증|심근경색|심부전|수면무호흡/);
    expect(q8Text.layerLimit).toContain('질환 레이어');
  });
});

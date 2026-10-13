import { describe, expect, it } from 'vitest';
import { q5Fixture } from '../helpers/q005-fixture';
import { acceptQ5, canOfferQ5, checkQ5, clearQ5Order, placeQ5, recordQ5, selectQ5, setQ5Mode, q5Reward } from '../../src/domain/q005';
import { emptyQ5, q5Normal, q5Text, signalOrder, validOrder, validateQ5, type Q5Evidence, type SignalCard } from '../../src/domain/q005-state';
import { publishQ5WithReaction, reprintArticle } from '../../src/domain/reaction';
import { latestReaction } from '../../src/domain/reaction-state';
import { levelOf } from '../../src/domain/quest';
import { newState, validateState, type GameState } from '../../src/domain/state';
import { toward } from '../../src/application/story';
import { Game } from '../../src/application/game';
import { SaveStore } from '../../src/infrastructure/save';
import { stripValue } from '../../src/ui/ecg-strip';
import { REAL_CYCLE } from '../../src/domain/cardiac';
import { rooms } from '../../src/world/rooms';
import { canStand } from '../../src/world/collision';
import type { RoomId } from '../../src/world/types';

function at(s: GameState, room: RoomId, target: string): GameState {
  const t = rooms[room].targets.find(t => t.id === target)!;
  for (let dx = -20; dx <= 20; dx += 2) for (let dy = -20; dy <= 20; dy += 2) { const p = { x: t.x + dx, y: t.y + dy }; if (Math.hypot(dx, dy) <= t.r && canStand(room, p)) return { ...s, at: { room, ...p, facing: 'up' } }; }
  throw new Error('Unreachable target ' + target);
}
const office = (s: GameState): GameState => ({ ...s, at: newState().at });
const desk = (s: GameState): GameState => at(s, 'newsroom', 'my-desk');
function observed(): GameState {
  let s = acceptQ5(q5Fixture());
  for (const n of q5Text.notes) s = recordQ5(at(s, n.room as RoomId, n.target), n.id as SignalCard);
  return s;
}
function compared(): GameState {
  let s = setQ5Mode(at(observed(), 'heart', 'hx-sa'), 'af');
  s = recordQ5(s, 'af');
  return setQ5Mode(s, 'normal');
}
function researched(): GameState {
  let s = desk(compared());
  for (const id of ['causes', 'tests', 'care'] as const) s = recordQ5(s, id);
  return s;
}
function ready(branches: SignalCard[] = ['right-branch', 'left-branch']): GameState {
  let s = researched();
  for (const id of ['sa', 'atria', 'av', ...branches] as SignalCard[]) s = placeQ5(s, id);
  return checkQ5(selectQ5(selectQ5(s, 'lead', 'signal'), 'limit', 'model'));
}
class Memory implements Storage {
  data = new Map<string, string>(); fail = false; get length() { return this.data.size; } clear() { this.data.clear(); } key(i: number) { return [...this.data.keys()][i] ?? null; }
  getItem(k: string) { return this.data.get(k) ?? null; } removeItem(k: string) { this.data.delete(k); } setItem(k: string, v: string) { if (this.fail) throw new Error('quota'); this.data.set(k, v); }
}

describe('Q005 signal reporting with the atrial fibrillation companion module (D077)', () => {
  it('opens only after the Q004 article, in the office, with no retroactive credit; every target is reachable and sourced', () => {
    expect(canOfferQ5(newState())).toBe(false); expect(() => acceptQ5(q5Fixture())).not.toThrow();
    expect(() => acceptQ5({ ...q5Fixture(), at: { room: 'lung', x: 26, y: 176, facing: 'right' } })).toThrow('편집국');
    expect(() => acceptQ5({ ...q5Fixture(), q004: { ...q5Fixture().q004, publishedAt: null }, ledger: q5Fixture().ledger.filter(k => k !== 'quest.Q004.first') })).toThrow();
    const s = acceptQ5(q5Fixture()); expect(acceptQ5(s)).toBe(s); expect(s.q005.notes).toEqual([]); expect(s.totalXp).toBe(700);
    expect(() => recordQ5(s, 'sa')).toThrow();
    for (const n of q5Text.notes) { expect(at(s, n.room as RoomId, n.target)).toBeTruthy(); expect(n.src.every(id => q5Text.sources.some(x => x.id === id))).toBe(true); }
    for (const m of q5Text.materials) expect(m.src.every(id => q5Text.sources.some(x => x.id === id))).toBe(true);
    expect(new Set(q5Text.notes.map(n => n.target)).size).toBe(5);
  });

  it('needs the five physical normal observations before the AF layer, opened only at the sinoatrial node', () => {
    let s = acceptQ5(q5Fixture());
    expect(() => setQ5Mode(at(s, 'heart', 'hx-sa'), 'af')).toThrow('다섯 곳');
    for (const n of q5Text.notes.slice(0, 4)) s = recordQ5(at(s, n.room as RoomId, n.target), n.id as SignalCard);
    expect(() => setQ5Mode(at(s, 'heart', 'hx-sa'), 'af')).toThrow();
    const o = observed();
    expect(() => setQ5Mode(at(o, 'heart', 'hx-avnode'), 'af')).toThrow();
    expect(() => setQ5Mode({ ...at(o, 'heart', 'hx-sa'), q003: { ...o.q003, mode: 'stenosis' } }, 'af')).toThrow('판막');
    expect(() => recordQ5(at(o, 'heart', 'hx-sa'), 'af')).toThrow();
    const af = setQ5Mode(at(o, 'heart', 'hx-sa'), 'af'); expect(af.q005.mode).toBe('af');
    expect(() => recordQ5(at(af, 'heart', 'hx-avnode'), 'av')).toThrow('비교 창');
    expect(() => recordQ5({ ...at(o, 'heart', 'hx-sa'), q005: { ...af.q005, notes: af.q005.notes.filter(n => n !== 'sa') } }, 'sa')).toThrow('정상');
    expect(validateState(af).q005.mode).toBe('af');
    expect(() => validateState({ ...af, at: { room: 'rv', x: 150, y: 92, facing: 'down' } })).toThrow('Q005');
  });

  it('takes desk materials in order after the comparison, without rewards, and the reporter must be at the desk', () => {
    const c = compared();
    expect(() => recordQ5(office(c), 'causes')).toThrow();
    expect(() => recordQ5(desk(observed()), 'causes')).toThrow();
    expect(() => recordQ5(desk(c), 'tests')).toThrow('순서');
    const r = researched(); expect(r.q005.notes).toHaveLength(9); expect([r.totalXp, r.gold]).toEqual([700, 540]);
  });

  it('refuses out-of-order signal cards with a hint and no penalty; both bundle branches share the last stage', () => {
    const r = researched();
    expect(() => placeQ5(r, 'av')).toThrow(q5Text.board.mismatch);
    expect(() => placeQ5(r, 'left-branch')).toThrow('동방결절');
    let s = placeQ5(r, 'sa'); expect(() => placeQ5(s, 'av')).toThrow('심방'); expect(placeQ5(s, 'sa')).toBe(s);
    s = placeQ5(placeQ5(s, 'atria'), 'av'); expect(() => placeQ5(s, 'sa')).not.toThrow();
    for (const branches of [['right-branch', 'left-branch'], ['left-branch', 'right-branch']] as SignalCard[][]) expect(ready(branches).q005.checked).toBe(true);
    expect(validOrder(['sa', 'atria', 'av', 'left-branch', 'right-branch'])).toBe(true);
    expect(validOrder(['sa', 'av'])).toBe(false); expect(validOrder(['atria'])).toBe(false); expect(validOrder(['sa', 'sa'])).toBe(false);
    expect(checkQ5(selectQ5(selectQ5(s, 'lead', 'signal'), 'limit', 'model')).q005.checked).toBe(false);
    const done = ready(); expect(selectQ5(done, 'lead', 'rhythm').q005.checked).toBe(false); expect(clearQ5Order(done).q005.order).toEqual([]);
    expect(clearQ5Order(done).q005.checked).toBe(false); expect(done.gold).toBe(540);
    expect(() => placeQ5({ ...r, at: { room: 'lung', x: 26, y: 176, facing: 'right' } }, 'sa')).toThrow('편집국');
  });

  it('keeps older saves and rejects sparse, fabricated or orphan Q005 records', () => {
    const { q005: _drop, ...old } = q5Fixture(); expect(validateState(old).q005).toEqual(emptyQ5());
    const r = ready(); expect(validateState(r).q005).toEqual(r.q005);
    const bad: Partial<GameState['q005']>[] = [
      { notes: Array(1) as Q5Evidence[] }, { order: Array(1) as SignalCard[] }, { order: ['atria'] }, { notes: ['af'] },
      { notes: [...q5Normal, 'af', 'tests'] }, { checked: true, order: ['sa'] }, { publishedAt: '2026-10-13T00:00:00Z', checked: false }, { lead: 'nope' },
    ];
    for (const patch of bad) expect(() => validateQ5({ ...r.q005, ...patch })).toThrow();
    expect(() => validateQ5({ ...emptyQ5(), notes: ['sa'] })).toThrow();
    expect(() => validateState({ ...r, q004: { ...r.q004, publishedAt: null }, ledger: r.ledger.filter(k => k !== 'quest.Q004.first') })).toThrow();
  });

  it('grants 300XP/200G once (Lv.6) with a saved Q005 reaction; explicit reprints only add gold', () => {
    const r = ready(), p = publishQ5WithReaction(r, () => .5, '2026-10-13T10:00:00Z'), receipt = latestReaction(p)!;
    expect([p.totalXp, p.gold, receipt.questId, receipt.xp, receipt.baseGold]).toEqual([1000, 740 + receipt.bonusGold, 'Q005', q5Reward.xp, q5Reward.gold]);
    expect(levelOf(p.totalXp).level).toBe(6); expect(p.q005.mode).toBe('normal');
    expect(publishQ5WithReaction(p, () => { throw new Error('must not draw'); })).toBe(p);
    const next = reprintArticle(p, p.reactions.count, () => .5, new Date().toISOString(), 'Q005'); expect(next.totalXp).toBe(1000); expect(next.gold).toBe(p.gold + latestReaction(next)!.bonusGold);
    expect(reprintArticle(next, p.reactions.count, () => { throw new Error('must not draw'); }, new Date().toISOString(), 'Q005')).toBe(next);
    expect(validateState(next)).toEqual(next);
    expect(() => reprintArticle(r, r.reactions.count, () => .5, new Date().toISOString(), 'Q005')).toThrow('Q005');
    expect(() => validateState({ ...p, ledger: p.ledger.filter(k => k !== 'quest.Q005.first') })).toThrow();
    expect(() => validateState({ ...r, reactions: p.reactions })).toThrow();
    // After publication the observer can be reopened for reading without breaking the save.
    expect(validateState(setQ5Mode(at(p, 'heart', 'hx-sa'), 'af')).q005.publishedAt).toBeTruthy();
  });

  it('resets the observer when leaving the room and preserves publication through failed writes and retry', () => {
    const mem = new Memory(); const af = setQ5Mode(at(observed(), 'heart', 'hx-sa'), 'af');
    mem.setItem('medical-quest.v4.current', JSON.stringify(af)); const g = new Game(new SaveStore(mem));
    const door = rooms.heart.doors[0]!; g.enter(door.to, door.arrive.x, door.arrive.y, door.facing); expect(g.state.q005.mode).toBe('normal');
    mem.clear(); mem.setItem('medical-quest.v4.current', JSON.stringify(desk(ready()))); const game = new Game(new SaveStore(mem));
    mem.fail = true; expect(game.publishQ5()).toBe(true); const receipt = latestReaction(game.state)!;
    expect(game.lastError).toBeTruthy(); expect(game.publishQ5()).toBe(false); expect(latestReaction(game.state)).toEqual(receipt);
    mem.fail = false; game.persist(); expect(new Game(new SaveStore(mem)).state.q005).toEqual(game.state.q005);
  });

  it('keeps the fictional ECG strips distinct and the Korean direction particle correct', () => {
    expect(stripValue('regular', 0.16)).toBeCloseTo(stripValue('regular', 0.16 + REAL_CYCLE), 6);
    const peaks: number[] = []; for (let t = 0; t < 4; t += 0.001) if (stripValue('irregular', t) > 0.8 && !peaks.some(p => Math.abs(p - t) < 0.1)) peaks.push(t);
    const gaps = peaks.slice(1).map((p, i) => p - peaks[i]!); expect(peaks.length).toBeGreaterThan(4); expect(Math.max(...gaps) - Math.min(...gaps)).toBeGreaterThan(0.3);
    expect([toward('우심실'), toward('좌심방'), toward('폐 모세혈관'), toward('대동맥')]).toEqual(['우심실로', '좌심방으로', '폐 모세혈관으로', '대동맥으로']);
    expect(signalOrder).toHaveLength(5);
  });
});

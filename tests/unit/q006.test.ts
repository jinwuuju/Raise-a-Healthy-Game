import { describe, expect, it } from 'vitest';
import { q6Fixture } from '../helpers/q006-fixture';
import { acceptQ6, canOfferQ6, checkQ6, clearQ6Order, placeQ6, recordQ6, selectQ6, setQ6Mode, q6Reward } from '../../src/domain/q006';
import { emptyQ6, q6Normal, q6Text, supplyOrder, validSupplyOrder, validateQ6, type Q6Evidence, type SupplyCard } from '../../src/domain/q006-state';
import { publishQ6WithReaction, reprintArticle } from '../../src/domain/reaction';
import { latestReaction } from '../../src/domain/reaction-state';
import { levelOf } from '../../src/domain/quest';
import { newState, validateState, type GameState } from '../../src/domain/state';
import { objective, talk } from '../../src/application/story';
import { Game } from '../../src/application/game';
import { SaveStore } from '../../src/infrastructure/save';
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
  let s = acceptQ6(q6Fixture());
  for (const n of q6Text.notes) s = recordQ6(at(s, n.room as RoomId, n.target), n.id as SupplyCard);
  return s;
}
function compared(): GameState {
  let s = setQ6Mode(at(observed(), 'aorta', 'hx-sinus'), 'work');
  s = recordQ6(s, 'work');
  return setQ6Mode(s, 'rest');
}
function researched(): GameState {
  let s = desk(compared());
  for (const id of ['need', 'timing', 'demand'] as const) s = recordQ6(s, id);
  return s;
}
function ready(order: SupplyCard[] = supplyOrder): GameState {
  let s = researched();
  for (const id of order) s = placeQ6(s, id);
  return checkQ6(selectQ6(selectQ6(s, 'lead', 'pump'), 'limit', 'model'));
}
class Memory implements Storage {
  data = new Map<string, string>(); fail = false; get length() { return this.data.size; } clear() { this.data.clear(); } key(i: number) { return [...this.data.keys()][i] ?? null; }
  getItem(k: string) { return this.data.get(k) ?? null; } removeItem(k: string) { this.data.delete(k); } setItem(k: string, v: string) { if (this.fail) throw new Error('quota'); this.data.set(k, v); }
}

describe('Q006 heart-muscle supply reporting (D099)', () => {
  it('opens only after the Q005 article, in the office, with no retroactive credit; every target is reachable, distinct and sourced', () => {
    expect(canOfferQ6(newState())).toBe(false); expect(canOfferQ6(q6Fixture())).toBe(true);
    expect(talk('editor', office(q6Fixture())).action).toBe('offer-q6');
    expect(objective(q6Fixture(), 'newsroom')).toContain('펌프도 배달이 필요해');
    expect(() => acceptQ6({ ...q6Fixture(), at: { room: 'lung', x: 26, y: 176, facing: 'right' } })).toThrow('편집국');
    expect(() => acceptQ6({ ...q6Fixture(), q005: { ...q6Fixture().q005, publishedAt: null, checked: false }, ledger: q6Fixture().ledger.filter(k => k !== 'quest.Q005.first') })).toThrow();
    const s = acceptQ6(q6Fixture()); expect(acceptQ6(s)).toBe(s); expect(s.q006.notes).toEqual([]); expect([s.totalXp, s.gold]).toEqual([1000, 740]);
    expect(talk('editor', s).action).toBeUndefined();
    expect(() => recordQ6(s, 'return')).toThrow();
    for (const n of q6Text.notes) { expect(at(s, n.room as RoomId, n.target)).toBeTruthy(); expect(n.src.every(id => q6Text.sources.some(x => x.id === id))).toBe(true); }
    for (const m of q6Text.materials) expect(m.src.every(id => q6Text.sources.some(x => x.id === id))).toBe(true);
    expect(new Set(q6Text.notes.map(n => n.target)).size).toBe(5);
    // Q006 stops never share a target with the Q004/Q005 reporting stops in the same rooms.
    expect(q6Text.notes.map(n => n.target).filter(t => ['hx-sa', 'hx-avnode', 'hx-moderator', 'hx-bachmann', 'hx-lbb', 'hx-ascending', 'hx-svc', 'hx-av-below', 'hx-pv'].includes(t))).toEqual([]);
    expect(at(s, 'aorta', 'hx-sinus')).toBeTruthy();
  });

  it('follows the walking order in the objective, then opens the supply observer only at the aortic sinus', () => {
    let s = office(acceptQ6(q6Fixture()));
    expect(objective(s, 'newsroom')).toContain('(0/5)');
    expect(objective({ ...s, at: { room: 'heart', x: 180, y: 40, facing: 'down' } }, 'heart')).toContain('관상정맥동 입구 살펴보기');
    expect(() => setQ6Mode(at(s, 'aorta', 'hx-sinus'), 'work')).toThrow('다섯 곳');
    for (const n of q6Text.notes.slice(0, 4)) s = recordQ6(at(s, n.room as RoomId, n.target), n.id as SupplyCard);
    expect(objective(s, 'aorta')).toContain('왼관상동맥 입구 살펴보기');
    expect(() => setQ6Mode(at(s, 'aorta', 'hx-sinus'), 'work')).toThrow();
    const o = observed();
    expect(objective(o, 'aorta')).toContain('공급 관찰기'); expect(objective(o, 'lv')).toContain('대동맥');
    expect(() => setQ6Mode(at(o, 'aorta', 'hx-rca'), 'work')).toThrow();
    expect(() => recordQ6(at(o, 'aorta', 'hx-sinus'), 'work')).toThrow();
    const work = setQ6Mode(at(o, 'aorta', 'hx-sinus'), 'work'); expect(work.q006.mode).toBe('work');
    expect(() => recordQ6({ ...at(work, 'aorta', 'hx-lca'), q006: { ...work.q006, notes: work.q006.notes.filter(n => n !== 'lca') } }, 'lca')).toThrow('비교 창');
    expect(validateState(work).q006.mode).toBe('work');
    expect(() => validateState({ ...work, at: { room: 'heart', x: 180, y: 40, facing: 'down' } })).toThrow('Q006');
  });

  it('takes desk materials in order after the comparison, without rewards, and the reporter must be at the desk', () => {
    const c = compared();
    expect(() => recordQ6(office(c), 'need')).toThrow();
    expect(() => recordQ6(desk(observed()), 'need')).toThrow();
    expect(() => recordQ6(desk(c), 'timing')).toThrow('순서');
    expect(() => recordQ6(desk(c), 'demand')).toThrow('순서');
    const r = researched(); expect(r.q006.notes).toHaveLength(9); expect([r.totalXp, r.gold]).toEqual([1000, 740]);
    expect(objective(r, 'newsroom')).toContain('배송 노선 도해');
  });

  it('refuses the main body route and out-of-order cards with a hint and no penalty; paired cards may go either way', () => {
    const r = researched();
    expect(() => placeQ6(r, 'body')).toThrow(q6Text.board.mismatch);
    expect(() => placeQ6(r, 'body')).toThrow('주 노선만 이으면');
    expect(() => placeQ6(r, 'return')).toThrow('대동맥굴');
    expect(() => placeQ6(r, 'lv-muscle')).toThrow('관상동맥 입구');
    let s = placeQ6(r, 'lca'); expect(() => placeQ6(s, 'rv-muscle')).toThrow('대동맥굴'); expect(placeQ6(s, 'lca')).toBe(s);
    s = placeQ6(s, 'rca'); expect(() => placeQ6(s, 'return')).toThrow('심장 벽'); expect(() => placeQ6(s, 'body')).toThrow('주 노선');
    expect([s.gold, s.totalXp]).toEqual([740, 1000]);
    for (const order of [supplyOrder, ['lca', 'rca', 'lv-muscle', 'rv-muscle', 'return']] as SupplyCard[][]) expect(ready(order).q006.checked).toBe(true);
    expect(validSupplyOrder(['rca', 'lca', 'lv-muscle'])).toBe(true);
    expect(validSupplyOrder(['return'])).toBe(false); expect(validSupplyOrder(['rca', 'rv-muscle'])).toBe(false); expect(validSupplyOrder(['rca', 'rca'])).toBe(false); expect(validSupplyOrder(['body'])).toBe(false);
    expect(checkQ6(selectQ6(selectQ6(s, 'lead', 'pump'), 'limit', 'model')).q006.checked).toBe(false);
    const done = ready(); expect(selectQ6(done, 'lead', 'branch').q006.checked).toBe(false); expect(clearQ6Order(done).q006.order).toEqual([]);
    expect(clearQ6Order(done).q006.checked).toBe(false);
    expect(() => placeQ6({ ...r, at: { room: 'lung', x: 26, y: 176, facing: 'right' } }, 'rca')).toThrow('편집국');
  });

  it('keeps older saves and rejects sparse, fabricated or orphan Q006 records', () => {
    const { q006: _drop, ...old } = q6Fixture(); expect(validateState(old).q006).toEqual(emptyQ6());
    const r = ready(); expect(validateState(r).q006).toEqual(r.q006);
    const bad: Partial<GameState['q006']>[] = [
      { notes: Array(1) as Q6Evidence[] }, { order: Array(1) as SupplyCard[] }, { order: ['return'] }, { order: ['body' as SupplyCard] }, { notes: ['work'] },
      { notes: [...q6Normal, 'work', 'timing'] }, { checked: true, order: ['rca'] }, { publishedAt: '2026-10-15T00:00:00Z', checked: false }, { lead: 'nope' }, { mode: 'fast' as never },
    ];
    for (const patch of bad) expect(() => validateQ6({ ...r.q006, ...patch })).toThrow();
    expect(() => validateQ6({ ...emptyQ6(), notes: ['return'] })).toThrow();
    expect(() => validateState({ ...r, q005: { ...r.q005, publishedAt: null, checked: false }, ledger: r.ledger.filter(k => k !== 'quest.Q005.first') })).toThrow();
  });

  it('grants 350XP/220G once (Lv.7) with a saved Q006 reaction; explicit reprints only add gold', () => {
    const r = ready(), p = publishQ6WithReaction(r, () => .5, '2026-10-15T10:00:00Z'), receipt = latestReaction(p)!;
    expect([p.totalXp, p.gold, receipt.questId, receipt.xp, receipt.baseGold]).toEqual([1350, 960 + receipt.bonusGold, 'Q006', q6Reward.xp, q6Reward.gold]);
    expect(levelOf(p.totalXp).level).toBe(7); expect(p.q006.mode).toBe('rest');
    expect(objective(p, 'newsroom')).toContain('좁아진 모형 통로'); // D108: the Q007 offer follows
    expect(publishQ6WithReaction(p, () => { throw new Error('must not draw'); })).toBe(p);
    const next = reprintArticle(p, p.reactions.count, () => .5, new Date().toISOString(), 'Q006'); expect(next.totalXp).toBe(1350); expect(next.gold).toBe(p.gold + latestReaction(next)!.bonusGold);
    expect(reprintArticle(next, p.reactions.count, () => { throw new Error('must not draw'); }, new Date().toISOString(), 'Q006')).toBe(next);
    expect(validateState(next)).toEqual(next);
    expect(() => reprintArticle(r, r.reactions.count, () => .5, new Date().toISOString(), 'Q006')).toThrow('Q006');
    expect(() => validateState({ ...p, ledger: p.ledger.filter(k => k !== 'quest.Q006.first') })).toThrow();
    expect(() => validateState({ ...r, reactions: p.reactions })).toThrow();
    // After publication the observer can be reopened for reading without breaking the save.
    expect(validateState(setQ6Mode(at(p, 'aorta', 'hx-sinus'), 'work')).q006.publishedAt).toBeTruthy();
  });

  it('resets the observer when leaving the aorta and preserves publication through failed writes and retry', () => {
    const mem = new Memory(); const work = setQ6Mode(at(observed(), 'aorta', 'hx-sinus'), 'work');
    mem.setItem('medical-quest.v4.current', JSON.stringify(work)); const g = new Game(new SaveStore(mem));
    expect(g.state.q006.mode).toBe('work');
    const door = rooms.aorta.doors[0]!; g.enter(door.to, door.arrive.x, door.arrive.y, door.facing); expect(g.state.q006.mode).toBe('rest');
    mem.clear(); mem.setItem('medical-quest.v4.current', JSON.stringify(desk(ready()))); const game = new Game(new SaveStore(mem));
    mem.fail = true; expect(game.publishQ6()).toBe(true); const receipt = latestReaction(game.state)!;
    expect(game.lastError).toBeTruthy(); expect(game.publishQ6()).toBe(false); expect(latestReaction(game.state)).toEqual(receipt);
    mem.fail = false; game.persist(); expect(new Game(new SaveStore(mem)).state.q006).toEqual(game.state.q006);
  });

  it('keeps the draft boundary: no advanced-gate disease words and the layer is labelled as a normal condition', () => {
    const text = JSON.stringify(q6Text);
    expect(text).not.toContain('협심증'); expect(text).not.toContain('심근경색');
    expect(q6Text.status).toBe('draft_unreviewed'); expect(q6Text.review).toBeNull(); expect(q6Text.layerLimit).toContain('질환 레이어가 아니에요');
    expect(q6Text.disclaimer).toContain('검수 전 모형');
  });
});

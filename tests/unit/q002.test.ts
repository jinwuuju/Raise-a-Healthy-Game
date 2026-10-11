import { describe, expect, it } from 'vitest';
import { acceptQ2, checkQ2, observeQ2, publishQ2, q2Feedback, q2Key, reportQ2, selectQ2 } from '../../src/domain/q002';
import { q2Text, chamberIds, emptyQ2 } from '../../src/domain/q002-state';
import { publishQ2WithReaction, reprintArticle } from '../../src/domain/reaction';
import { latestReaction } from '../../src/domain/reaction-state';
import { newState, validateState, type GameState } from '../../src/domain/state';
import { notebookRecords } from '../../src/application/notebook';
import { canStand } from '../../src/world/collision';
import type { RoomId } from '../../src/world/types';
import { rooms } from '../../src/world/rooms';
import { Game } from '../../src/application/game';
import { SaveStore } from '../../src/infrastructure/save';

function first(): GameState {
  return { ...newState(), started: true, totalXp: 100, gold: 100, ledger: ['quest.Q001.observe', 'quest.Q001.first'],
    flags: ['met-editor', 'reported-back', 'q001-accepted', 'q001-entered', 'q001-observed', 'q001-briefed', 'heart-guided'],
    inspected: ['q001:heart-in', 'q001:heart-out'], cafe: { ...newState().cafe, welcomeUsed: true },
    article: { lead: 'question', returning: 'heart-in', outgoing: 'heart-out', extra: null, checked: true, publishedAt: '2026-10-11T00:00:00Z' } };
}
function observed(): GameState {
  let s = acceptQ2(first());
  for (const n of q2Text.notes) {
    const t = rooms[n.room as RoomId].targets.find(t => t.id === n.target)!;
    s = observeQ2({ ...s, at: { room: n.room as RoomId, x: t.x, y: t.y, facing: 'down' } }, n.target);
  }
  return { ...s, at: newState().at };
}
function ready(): GameState {
  let s = selectQ2(reportQ2(observed()), 'lead', 'addresses');
  for (const id of chamberIds) s = selectQ2(s, id, id);
  return checkQ2(s);
}

describe('Q002 reporting in the existing heart', () => {
  it('requires the first publication and four physical observation sites, with no retroactive reward or inherited evidence', () => {
    expect(() => acceptQ2(newState())).toThrow(); const s = acceptQ2(first()); expect(acceptQ2(s)).toBe(s);
    expect(s.inspected).toEqual(first().inspected); expect(s.totalXp).toBe(100);
    expect(() => observeQ2(s, 'hx-tricuspid')).toThrow();
    expect(() => observeQ2({ ...s, at: { ...s.at, room: 'heart' } }, 'hx-tricuspid')).toThrow('가까이');
    expect(() => reportQ2(s)).toThrow();
    const notes = observed(); expect(notes.inspected.filter(k => k.startsWith('q002:'))).toHaveLength(4); expect(notes.totalXp).toBe(100); expect(notes.gold).toBe(100);
  });
  it('links notes to accessible existing structures in all four chambers, with real sources and draft status', () => {
    expect(q2Text.status).toBe('draft_unreviewed'); expect(q2Text.review).toBeNull();
    for (const n of q2Text.notes) {
      const t = rooms[n.room as RoomId].targets.find(t => t.id === n.target)!;
      expect(t).toBeTruthy();
      let reachable = false;
      for (let dx = -12; dx <= 12; dx += 2) for (let dy = -12; dy <= 12; dy += 2) if (Math.hypot(dx, dy) <= t.r && canStand(n.room as RoomId, { x: t.x + dx, y: t.y + dy })) reachable = true;
      expect(reachable, n.name).toBe(true); expect(n.src.every(id => q2Text.sources.some(s => s.id === id))).toBe(true);
    }
  });
  it('allows both leads but requires the right observation card for each article paragraph and newsroom editing', () => {
    let s = reportQ2(observed()); expect(() => publishQ2(s)).toThrow();
    s = selectQ2(s, 'lead', 'journey'); for (const id of chamberIds) s = selectQ2(s, id, 'heart');
    expect(q2Feedback(s)).toHaveLength(3); expect(checkQ2(s).q002.checked).toBe(false);
    const r = ready(); expect(r.q002.checked).toBe(true); expect(selectQ2(r, 'lead', 'journey').q002.checked).toBe(false);
    expect(() => selectQ2({ ...r, at: { ...r.at, room: 'heart' } }, 'lead', 'journey')).toThrow('편집국');
  });
  it('grants the canonical 150XP/120G once and adds a quest-linked random reaction atomically', () => {
    const s = ready(), p = publishQ2WithReaction(s, () => .5), r = latestReaction(p)!;
    expect([p.totalXp, p.gold]).toEqual([250, 220 + r.bonusGold]); expect([r.questId, r.xp, r.baseGold]).toEqual(['Q002', 150, 120]);
    expect(publishQ2WithReaction(p, () => { throw new Error('must not draw'); })).toBe(p);
    const repeat = reprintArticle(p, p.reactions.count, () => .5, new Date().toISOString(), 'Q002');
    expect(repeat.totalXp).toBe(250); expect(repeat.gold).toBe(p.gold + latestReaction(repeat)!.bonusGold);
    expect(reprintArticle(repeat, p.reactions.count, () => { throw new Error('must not draw'); }, new Date().toISOString(), 'Q002')).toBe(repeat);
    expect(validateState(JSON.parse(JSON.stringify(repeat)))).toEqual(repeat);
  });
  it('preserves absent old fields, resumable drafts and rejects orphan evidence, approvals and receipts', () => {
    const { q002: _, ...old } = first(); expect(validateState(old).q002).toEqual(emptyQ2());
    const s = ready(); expect(validateState(JSON.parse(JSON.stringify(s))).q002).toEqual(s.q002);
    expect(() => validateState({ ...s, inspected: s.inspected.filter(k => k !== q2Key('lv')) })).toThrow();
    expect(() => validateState({ ...s, q002: { ...s.q002, accepted: false } })).toThrow();
    const p = publishQ2WithReaction(s, () => .5);
    expect(() => validateState({ ...p, ledger: p.ledger.filter(k => k !== 'quest.Q002.first') })).toThrow();
    expect(() => publishQ2WithReaction({ ...s, gold: Number.MAX_SAFE_INTEGER - 120 }, () => .5)).toThrow();
    expect(s.q002.publishedAt).toBeNull();
  });
  it('partitions Q002 evidence exactly once under reporting, without turning it into legacy or anatomy copies', () => {
    const s = observed(), vm = notebookRecords(s);
    expect(vm.q2Evidence).toEqual(chamberIds.map(q2Key));
    expect([...vm.evidence, ...vm.q2Evidence, ...Object.values(vm.anatomy).flat(), ...Object.values(vm.local).flat(), ...vm.legacy].sort()).toEqual([...s.inspected].sort());
  });
  it('keeps Q002 publication, reward and reaction together through failed storage, retries and reload', () => {
    class Memory implements Storage {
      data = new Map<string, string>(); fail = false;
      get length() { return this.data.size; } clear() { this.data.clear(); } key(i: number) { return [...this.data.keys()][i] ?? null; }
      getItem(k: string) { return this.data.get(k) ?? null; } removeItem(k: string) { this.data.delete(k); }
      setItem(k: string, v: string) { if (this.fail) throw new Error('quota'); this.data.set(k, v); }
    }
    const mem = new Memory(); mem.setItem('medical-quest.v4.current', JSON.stringify(ready()));
    const game = new Game(new SaveStore(mem)); mem.fail = true; expect(game.publishQ2()).toBe(true);
    const receipt = latestReaction(game.state)!; expect(game.lastError).toBeTruthy(); expect(game.state.q002.publishedAt).toBeTruthy();
    expect(JSON.parse(mem.getItem('medical-quest.v4.current')!).q002.publishedAt).toBeNull();
    expect(game.publishQ2()).toBe(false); expect(latestReaction(game.state)).toEqual(receipt);
    mem.fail = false; expect(game.persist()).toBe(true); const loaded = new Game(new SaveStore(mem));
    expect(loaded.state.q002).toEqual(game.state.q002); expect(latestReaction(loaded.state)).toEqual(receipt); expect(loaded.state.gold).toBe(receipt.goldAfter);
  });
});

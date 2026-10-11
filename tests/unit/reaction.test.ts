import { describe, expect, it } from 'vitest';
import { Game } from '../../src/application/game';
import { checkArticle, selectArticle } from '../../src/domain/article';
import { publishWithReaction, reprintArticle, seeReaction } from '../../src/domain/reaction';
import { bandFor, latestReaction, reactionBalance as b, reactionText as content } from '../../src/domain/reaction-state';
import { newState, validateState, type GameState } from '../../src/domain/state';
import { SaveStore } from '../../src/infrastructure/save';

function ready(): GameState {
  const s = { ...newState(), started: true, totalXp: 20, ledger: ['quest.Q001.observe'], inspected: ['q001:heart-in', 'q001:heart-out'],
    flags: ['met-editor', 'reported-back', 'q001-accepted', 'q001-entered', 'q001-observed', 'q001-briefed'] };
  return checkArticle(selectArticle(selectArticle(selectArticle(s, 'lead', 'question'), 'returning', 'heart-in'), 'outgoing', 'heart-out'));
}
class Mem implements Storage {
  data = new Map<string, string>(); fail = false;
  get length() { return this.data.size; } clear() { this.data.clear(); } key(i: number) { return [...this.data.keys()][i] ?? null; }
  getItem(k: string) { return this.data.get(k) ?? null; } removeItem(k: string) { this.data.delete(k); }
  setItem(k: string, v: string) { if (this.fail) throw new Error('quota'); this.data.set(k, v); }
}
describe('publication reaction receipts', () => {
  it('adds only gold to the canonical first reward, stores a coherent receipt and never rolls again on repeat commands', () => {
    const s = publishWithReaction(ready(), () => .5, '2026-10-11T12:00:00Z'), r = latestReaction(s)!;
    expect(s.totalXp).toBe(100); expect(s.gold).toBe(100 + r.bonusGold); expect(r.xp).toBe(80);
    expect([r.xpBefore, r.xpAfter, r.goldBefore, r.goldAfter]).toEqual([20, 100, 0, s.gold]);
    expect(publishWithReaction(s, () => { throw new Error('must not draw'); })).toBe(s);
    expect(validateState(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it('is independent of article expression and optional records for the same random stream', () => {
    const a = ready(), other = checkArticle(selectArticle(a, 'lead', 'journey'));
    const now = '2026-10-11T12:00:00Z';
    expect(latestReaction(publishWithReaction(a, () => .3, now))).toEqual(latestReaction(publishWithReaction(other, () => .3, now)));
  });
  it('supports new editions with gold only; stale double clicks are not new editions', () => {
    const first = publishWithReaction(ready(), () => .5), second = reprintArticle(first, 1, () => .9);
    expect(second.totalXp).toBe(100); expect(second.gold).toBe(first.gold + latestReaction(second)!.bonusGold);
    expect(latestReaction(second)!.xp).toBe(0); expect(reprintArticle(second, 1)).toBe(second);
    expect(seeReaction(second, 2).gold).toBe(second.gold); expect(seeReaction(seeReaction(second, 2), 1).reactions.seen).toBe(2);
  });
  it('has distinct voices and keeps scores, gold and combinations within the versioned content contract', () => {
    const combinations = new Set<string>();
    for (let seed = 1; seed <= 500; seed++) {
      let value = seed;
      const random = () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
      const s = publishWithReaction(ready(), random), r = latestReaction(s)!;
      expect(r.score).toBeGreaterThanOrEqual(b.scoreMin); expect(r.score).toBeLessThanOrEqual(b.scoreMax);
      expect(new Set(r.voices.map(v => v.profile)).size).toBe(3); expect(new Set(r.voices.map(v => v.quote)).size).toBe(3);
      combinations.add(JSON.stringify({ score: r.score, voices: r.voices, headline: r.headline, scene: r.scene }));
      expect(validateState(s).gold).toBe(s.gold);
    }
    expect(combinations.size).toBeGreaterThan(490);
    expect(content.profiles.length).toBe(16); expect(content.bands.reduce((n, band) => n + band.quotes.length, 0)).toBe(48);
  });
  it('keeps a bounded history and the exact last result through JSON/export, without reducing earned currency', () => {
    let s = publishWithReaction(ready(), () => .5); const bonus = latestReaction(s)!.bonusGold;
    for (let i = 1; i < 45; i++) s = reprintArticle(s, s.reactions.count, () => .5);
    expect(s.reactions.results).toHaveLength(b.historyLimit); expect(s.reactions.count).toBe(45);
    expect(s.gold).toBe(100 + 45 * bonus); expect(s.totalXp).toBe(100);
    expect(validateState(JSON.parse(JSON.stringify(s))).reactions).toEqual(s.reactions);
  });
  it('keeps older publication saves intact and makes no fictional historical receipt or new reward on loading', () => {
    const s = publishWithReaction(ready(), () => .5); const { reactions: _r, ...old } = s;
    const loaded = validateState(old); expect(loaded.reactions.count).toBe(0); expect(loaded.gold).toBe(s.gold);
    const reprint = reprintArticle(loaded, 0, () => .5); expect(latestReaction(reprint)!.kind).toBe('reprint'); expect(reprint.totalXp).toBe(100);
  });
  it('rejects fabricated receipts and fails without a partial base payment when generation or totals fail', () => {
    const s = ready();
    for (const random of [() => -1, () => 1, () => NaN]) expect(() => publishWithReaction(s, random)).toThrow();
    expect(() => publishWithReaction({ ...s, gold: Number.MAX_SAFE_INTEGER - 100 }, () => .5)).toThrow();
    expect([s.gold, s.totalXp, s.article.publishedAt]).toEqual([0, 20, null]);
    const p = publishWithReaction(s, () => .5), r = latestReaction(p)!;
    for (const bad of [{ ...r, score: 101 }, { ...r, xp: 81 }, { ...r, goldAfter: 0 }, { ...r, voices: [] }, { ...r, headline: bandFor(r.score).headlines.length }])
      expect(() => validateState({ ...p, reactions: { ...p.reactions, results: [bad] } })).toThrow();
    expect(() => reprintArticle({ ...p, at: { ...p.at, room: 'heart' } }, 1)).toThrow('편집국');
    expect(() => seeReaction(p, 2)).toThrow();
  });
  it('keeps random result and gold together on failed writes, retries the same receipt and preserves it on reload', () => {
    const mem = new Mem(); mem.setItem('medical-quest.v4.current', JSON.stringify(ready()));
    const game = new Game(new SaveStore(mem)); mem.fail = true; game.publishArticle();
    const receipt = latestReaction(game.state)!; expect(game.lastError).toBeTruthy(); expect(game.needsSave).toBe(true);
    expect(JSON.parse(mem.getItem('medical-quest.v4.current')!).reactions.count).toBe(0);
    expect(game.publishArticle()).toBe(false); expect(latestReaction(game.state)).toEqual(receipt);
    mem.fail = false; game.persist(); const loaded = new Game(new SaveStore(mem));
    expect(latestReaction(loaded.state)).toEqual(receipt); expect(loaded.state.gold).toBe(receipt.goldAfter);
  });
});

import { describe, expect, it } from 'vitest';
import balance from '../../data/balance/early-quests.v0.1.json';
import entry from '../../data/content/q001-entry.v0.1.json';
import { Game } from '../../src/application/game';
import { articleAccess, articleFeedback, checkArticle, publishArticle, selectArticle } from '../../src/domain/article';
import { articleText } from '../../src/domain/article-state';
import { discoveries } from '../../src/domain/heart';
import { acceptQ1, briefQ1, levelOf, observeQ1 } from '../../src/domain/quest';
import { newState, validateState, type GameState } from '../../src/domain/state';
import { SaveStore } from '../../src/infrastructure/save';
import { rooms } from '../../src/world/rooms';

function ready(): GameState {
  let s = acceptQ1({ ...newState(), started: true, flags: ['met-editor', 'reported-back'] });
  for (const [id, room] of [['heart-in', 'heart'], ['heart-out', 'rv']] as const) {
    s = observeQ1({ ...s, at: { room, ...rooms[room].spawn, facing: 'down' } }, id);
  }
  return briefQ1({ ...s, at: newState().at });
}
function draft(s = ready()): GameState {
  return selectArticle(selectArticle(selectArticle(s, 'lead', 'question'), 'returning', 'heart-in'), 'outgoing', 'heart-out');
}
class Memory implements Storage {
  data = new Map<string, string>(); failWrite = false;
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { if (this.failWrite) throw new Error('quota exceeded'); this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

describe('first article and reward', () => {
  it('uses source-linked draft content and preserves the canonical Q001 total and completion key', () => {
    expect(articleText.status).toBe('draft_unreviewed'); expect(articleText.review).toBeNull();
    expect(articleText.disclaimer).toContain('검수 전 모형');
    const ids = entry.sources.map(s => s.id);
    for (const id of [...articleText.sourceIds, ...articleText.evidence.flatMap(e => e.src)]) expect(ids).toContain(id);
    const published = publishArticle(checkArticle(draft()));
    expect([published.totalXp, published.gold]).toEqual([balance.quests[0]!.xp, balance.quests[0]!.gold]);
    expect(published.ledger).toContain(balance.quests[0]!.completionKey);
    expect(levelOf(published.totalXp).level).toBe(2);
  });
  it('needs both observations, reporting and the newsroom before writing', () => {
    expect(articleAccess(newState())).toBeTruthy();
    expect(() => selectArticle({ ...ready(), flags: [] }, 'lead', 'question')).toThrow();
    const outside = { ...ready(), at: { room: 'heart' as const, ...rooms.heart.spawn, facing: 'down' as const } };
    expect(() => selectArticle(outside, 'lead', 'question')).toThrow('편집국');
    expect(() => publishArticle({ ...checkArticle(draft()), at: outside.at })).toThrow('편집국');
  });
  it('gives specific free editing feedback for missing or misplaced cards; editing invalidates the check', () => {
    let s = selectArticle(ready(), 'lead', 'question');
    expect(articleFeedback(s)).toHaveLength(2); expect(checkArticle(s)).toBe(s);
    s = selectArticle(selectArticle(s, 'returning', 'heart-out'), 'outgoing', 'heart-in');
    expect(articleFeedback(s).join(' ')).toContain('하대정맥');
    expect(() => publishArticle(s)).toThrow('편집장');
    s = checkArticle(draft(s)); expect(s.article.checked).toBe(true);
    s = selectArticle(s, 'lead', 'journey'); expect(s.article.checked).toBe(false);
    expect([s.totalXp, s.gold]).toEqual([20, 0]);
    expect(() => publishArticle(s)).toThrow();
  });
  it('does not require extra exploration or a purchase, and both opening styles can publish', () => {
    for (const lead of ['question', 'journey']) {
      const s = publishArticle(checkArticle(selectArticle(draft(), 'lead', lead)));
      expect(s.article.extra).toBeNull(); expect(s.gold).toBe(100);
      expect(s.inspected).toHaveLength(2);
    }
  });
  it('only attaches discovered optional notes and preserves the optional note through publication', () => {
    const id = Object.keys(discoveries)[0]!;
    expect(() => selectArticle(draft(), 'extra', id)).toThrow('직접 관찰');
    const base = draft();
    const s = selectArticle({ ...base, inspected: [...base.inspected, 'hx:' + id] }, 'extra', id);
    expect(publishArticle(checkArticle(s)).article.extra).toBe(id);
    expect(() => selectArticle(base, 'lead', 'unknown')).toThrow();
  });
  it('publication is immutable and repeated publication never pays again', () => {
    const s = publishArticle(checkArticle(draft()), '2026-10-11T10:00:00Z');
    expect(publishArticle(s)).toBe(s);
    expect(() => selectArticle(s, 'lead', 'journey')).toThrow('이미 발행');
    expect(validateState(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it('does not partially grant on overflow, a missing checkpoint or an invalid publication date', () => {
    const s = checkArticle(draft());
    expect(() => publishArticle({ ...s, gold: Number.MAX_SAFE_INTEGER })).toThrow();
    expect(() => publishArticle({ ...s, ledger: [] })).toThrow('관찰 보상');
    expect(() => publishArticle(s, 'not-a-date')).toThrow();
    expect([s.article.publishedAt, s.gold, s.totalXp]).toEqual([null, 0, 20]);
  });
  it('migrates previous schema-4 saves without losing observations, appearance, position or reward', () => {
    const s = ready(); const { article: _article, ...old } = s;
    const loaded = validateState(JSON.parse(JSON.stringify(old)));
    expect(loaded).toEqual(s);
    expect(publishArticle(checkArticle(draft(loaded))).totalXp).toBe(100);
  });
  it('rejects malformed drafts, unowned records, false edit checks and publication without its ledger', () => {
    const s = ready();
    for (const article of [null, [], { ...s.article, extra: 'missing' }, { ...s.article, checked: true }, { ...s.article, returning: 'unknown' }])
      expect(() => validateState({ ...s, article })).toThrow();
    expect(() => validateState({ ...draft(), inspected: [] })).toThrow();
    const p = publishArticle(checkArticle(draft()));
    expect(() => validateState({ ...p, ledger: [] })).toThrow();
  });
  it('keeps article and reward together on save failure, retries once and reloads without duplication', () => {
    const mem = new Memory(); mem.setItem('medical-quest.v4.current', JSON.stringify(checkArticle(draft())));
    const game = new Game(new SaveStore(mem)); mem.failWrite = true;
    expect(game.publishArticle()).toBe(true); expect(game.lastError).toBeTruthy(); expect(game.needsSave).toBe(true);
    const saved = JSON.parse(mem.getItem('medical-quest.v4.current')!);
    expect([saved.article.publishedAt, saved.gold, saved.totalXp]).toEqual([null, 0, 20]);
    expect(game.publishArticle()).toBe(false); expect(game.state.gold).toBe(100);
    mem.failWrite = false; expect(game.persist()).toBe(true);
    const reloaded = new Game(new SaveStore(mem)); expect(reloaded.publishArticle()).toBe(false);
    expect([reloaded.state.gold, reloaded.state.totalXp]).toEqual([100, 100]);
    expect(reloaded.state.ledger.filter(k => k === 'quest.Q001.first')).toHaveLength(1);
  });
});

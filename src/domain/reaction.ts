import { publishArticle } from './article';
import { publishQ2 } from './q002';
import { publishQ3 } from './q003';
import { publishQ4 } from './q004';
import { publishQ5 } from './q005';
import { publishQ6 } from './q006';
import { publishQ7 } from './q007';
import { publishQ8 } from './q008';
import { publishQ9 } from './q009';
import { bandFor, reactionBalance as b, reactionText as text, type QuestId, type Reaction } from './reaction-state';
import type { GameState } from './state';

type Random = () => number;
export function randomReactionValue(): number {
  return typeof globalThis.crypto?.getRandomValues === 'function' ? crypto.getRandomValues(new Uint32Array(1))[0]! / 4294967296 : Math.random();
}
function appendReaction(before: GameState, next: GameState, first: boolean, random: Random, now: string, questId: QuestId = 'Q001'): GameState {
  if (!Number.isFinite(Date.parse(now))) throw new Error('발행 시각이 잘못되었습니다.');
  const sample = () => { const n = random(); if (!Number.isFinite(n) || n < 0 || n >= 1) throw new Error('반응을 만들지 못했어요.'); return n; };
  const pick = (n: number) => Math.floor(sample() * n);
  const score = b.scoreMin + pick(b.scoreMax - b.scoreMin + 1), band = bandFor(score);
  const windfall = sample() < b.windfallChance, range = windfall ? b.windfallGold : b.normalGold;
  const bonusGold = range.min + pick(range.max - range.min + 1);
  if (!Number.isSafeInteger(next.gold + bonusGold) || !Number.isSafeInteger(before.reactions.count + 1)) throw new Error('보상 합계가 저장 가능한 범위를 넘었어요.');
  const profiles = text.profiles.map(p => p.id), quotes = band.quotes.map((_, i) => i);
  const voices = Array.from({ length: 3 }, () => ({ profile: profiles.splice(pick(profiles.length), 1)[0]!, quote: quotes.splice(pick(quotes.length), 1)[0]! }));
  const result: Reaction = { ...(questId !== 'Q001' ? { questId } : {}), version: 1, round: before.reactions.count + 1, kind: first ? 'first' : 'reprint', at: now, score, windfall, bonusGold,
    baseGold: next.gold - before.gold, xp: next.totalXp - before.totalXp, xpBefore: before.totalXp, xpAfter: next.totalXp,
    goldBefore: before.gold, goldAfter: next.gold + bonusGold, scene: text.scenes[pick(text.scenes.length)]!, headline: pick(band.headlines.length), voices };
  return { ...next, gold: result.goldAfter, reactions: { count: result.round, seen: before.reactions.seen, results: [...before.reactions.results, result].slice(-b.historyLimit) } };
}
/** A first publication keeps the canonical XP/base reward and adds a saved reader reaction. */
export function publishWithReaction(s: GameState, random: Random = randomReactionValue, now = new Date().toISOString()): GameState {
  const next = publishArticle(s, now); return next === s ? s : appendReaction(s, next, true, random, now);
}
export function publishQ2WithReaction(s: GameState, random: Random = randomReactionValue, now = new Date().toISOString()): GameState {
  const next = publishQ2(s, now); return next === s ? s : appendReaction(s, next, true, random, now, 'Q002');
}
export function publishQ3WithReaction(s: GameState, random: Random = randomReactionValue, now = new Date().toISOString()): GameState {
  const next = publishQ3(s, now); return next === s ? s : appendReaction(s, next, true, random, now, 'Q003');
}
export function publishQ4WithReaction(s: GameState, random: Random = randomReactionValue, now = new Date().toISOString()): GameState {
  const next = publishQ4(s, now); return next === s ? s : appendReaction(s, next, true, random, now, 'Q004');
}
export function publishQ5WithReaction(s: GameState, random: Random = randomReactionValue, now = new Date().toISOString()): GameState {
  const next = publishQ5(s, now); return next === s ? s : appendReaction(s, next, true, random, now, 'Q005');
}

export function publishQ6WithReaction(s: GameState, random: Random = randomReactionValue, now = new Date().toISOString()): GameState {
  const next = publishQ6(s, now); return next === s ? s : appendReaction(s, next, true, random, now, 'Q006');
}

export function publishQ9WithReaction(s: GameState, random: Random = randomReactionValue, now = new Date().toISOString()): GameState {
  const next = publishQ9(s, now); return next === s ? s : appendReaction(s, next, true, random, now, 'Q009');
}

export function publishQ8WithReaction(s: GameState, random: Random = randomReactionValue, now = new Date().toISOString()): GameState {
  const next = publishQ8(s, now); return next === s ? s : appendReaction(s, next, true, random, now, 'Q008');
}

export function publishQ7WithReaction(s: GameState, random: Random = randomReactionValue, now = new Date().toISOString()): GameState {
  const next = publishQ7(s, now); return next === s ? s : appendReaction(s, next, true, random, now, 'Q007');
}

/** Explicit new editions can earn more gold, while stale double clicks and history reads cannot. */
export function reprintArticle(s: GameState, expectedCount: number, random: Random = randomReactionValue, now = new Date().toISOString(), questId: QuestId = 'Q001'): GameState {
  if (expectedCount !== s.reactions.count) return s;
  if (s.at.room !== 'newsroom') throw new Error('다시 발행은 편집국에서 할 수 있어요.');
  if (!s.article.publishedAt || !s.ledger.includes('quest.Q001.first')) throw new Error('첫 기사 발행을 먼저 마쳐 주세요.');
  if (questId === 'Q002' && (!s.q002.publishedAt || !s.ledger.includes('quest.Q002.first'))) throw new Error('Q002 기사 발행을 먼저 마쳐 주세요.');
  if (questId === 'Q003' && (!s.q003.publishedAt || !s.ledger.includes('quest.Q003.first'))) throw new Error('Q003 기사 발행을 먼저 마쳐 주세요.');
  if (questId === 'Q004' && (!s.q004.publishedAt || !s.ledger.includes('quest.Q004.first'))) throw new Error('Q004 기사 발행을 먼저 마쳐 주세요.');
  if (questId === 'Q005' && (!s.q005.publishedAt || !s.ledger.includes('quest.Q005.first'))) throw new Error('Q005 기사 발행을 먼저 마쳐 주세요.');
  if (questId === 'Q006' && (!s.q006.publishedAt || !s.ledger.includes('quest.Q006.first'))) throw new Error('Q006 기사 발행을 먼저 마쳐 주세요.');
  if (questId === 'Q009' && (!s.q009.publishedAt || !s.ledger.includes('quest.Q009.first'))) throw new Error('Q009 기사 발행을 먼저 마쳐 주세요.');
  if (questId === 'Q008' && (!s.q008.publishedAt || !s.ledger.includes('quest.Q008.first'))) throw new Error('Q008 기사 발행을 먼저 마쳐 주세요.');
  if (questId === 'Q007' && (!s.q007.publishedAt || !s.ledger.includes('quest.Q007.first'))) throw new Error('Q007 기사 발행을 먼저 마쳐 주세요.');
  return appendReaction(s, s, false, random, now, questId);
}
export function seeReaction(s: GameState, round: number): GameState {
  if (!Number.isSafeInteger(round) || round < 1 || round > s.reactions.count) throw new Error('확인할 수 없는 반응이에요.');
  return round <= s.reactions.seen ? s : { ...s, reactions: { ...s.reactions, seen: round } };
}

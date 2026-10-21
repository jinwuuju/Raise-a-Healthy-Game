import balance from '../../data/balance/article-reactions.v0.1.json';
import content from '../../data/content/article-reactions.v0.1.json';
import q2Balance from '../../data/balance/q002.v0.1.json';
import q3Balance from '../../data/balance/q003.v0.1.json';
import q4Balance from '../../data/balance/q004.v0.1.json';
import q5Balance from '../../data/balance/q005.v0.1.json';
import q6Balance from '../../data/balance/q006.v0.1.json';
import q7Balance from '../../data/balance/q007.v0.1.json';
import q8Balance from '../../data/balance/q008.v0.1.json';
import q9Balance from '../../data/balance/q009.v0.1.json';
import q10Balance from '../../data/balance/q010.v0.1.json';

export const reactionBalance = balance;
/** Quests whose articles have saved reader reactions. Q001 receipts may omit questId (older saves). */
export type QuestId = 'Q001' | 'Q002' | 'Q003' | 'Q004' | 'Q005' | 'Q006' | 'Q007' | 'Q008' | 'Q009' | 'Q010';
export const questIds: QuestId[] = ['Q001', 'Q002', 'Q003', 'Q004', 'Q005', 'Q006', 'Q007', 'Q008', 'Q009', 'Q010'];
export const reactionText = content;
export type Reaction = {
  questId?: QuestId;
  version: 1; round: number; kind: 'first' | 'reprint'; at: string;
  score: number; windfall: boolean; bonusGold: number; baseGold: number; xp: number;
  xpBefore: number; xpAfter: number; goldBefore: number; goldAfter: number;
  scene: string; headline: number; voices: { profile: string; quote: number }[];
};
export type Reactions = { count: number; seen: number; results: Reaction[] };
export const emptyReactions = (): Reactions => ({ count: 0, seen: 0, results: [] });
const int = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
export const bandFor = (score: number) => [...content.bands].reverse().find(b => score >= b.min)!;
export const latestReaction = (s: { reactions: Reactions }): Reaction | null => s.reactions.results.at(-1) ?? null;

/** Versioned, bounded publication receipts; earlier schema-4 saves have no reactions. */
export function validateReactions(value: unknown): Reactions {
  if (value === undefined) return emptyReactions();
  const fail = (): never => { throw new Error('독자 반응 기록이 잘못되었습니다.'); };
  if (!value || typeof value !== 'object') return fail();
  const v = value as Reactions;
  if (!int(v.count) || !int(v.seen) || v.seen > v.count || !Array.isArray(v.results) || v.results.length !== Math.min(v.count, balance.historyLimit)) return fail();
  const results: Reaction[] = [];
  for (const [i, r] of v.results.entries()) {
    if (!r || (r.questId !== undefined && !questIds.includes(r.questId)) || r.version !== 1 || r.round !== v.count - v.results.length + i + 1 || !['first', 'reprint'].includes(r.kind) ||
        typeof r.at !== 'string' || !Number.isFinite(Date.parse(r.at)) || !int(r.score) || r.score < balance.scoreMin || r.score > balance.scoreMax ||
        typeof r.windfall !== 'boolean' || ![r.bonusGold, r.baseGold, r.xp, r.xpBefore, r.xpAfter, r.goldBefore, r.goldAfter].every(int)) return fail();
    const range = r.windfall ? balance.windfallGold : balance.normalGold, band = bandFor(r.score);
    const reward = r.questId === 'Q010' ? q10Balance.publication : r.questId === 'Q009' ? q9Balance.publication : r.questId === 'Q008' ? q8Balance.publication : r.questId === 'Q007' ? q7Balance.publication : r.questId === 'Q006' ? q6Balance.publication : r.questId === 'Q005' ? q5Balance.publication : r.questId === 'Q004' ? q4Balance.publication : r.questId === 'Q003' ? q3Balance.publication : r.questId === 'Q002' ? q2Balance.publication : { xp: 80, gold: 100 };
    if (r.bonusGold < range.min || r.bonusGold > range.max || r.xp !== (r.kind === 'first' ? reward.xp : 0) || r.baseGold !== (r.kind === 'first' ? reward.gold : 0) ||
        (r.kind === 'first' && (r.questId === undefined || r.questId === 'Q001' ? r.round !== 1 : results.some(p => p.questId === r.questId && p.kind === 'first'))) || r.xpAfter !== r.xpBefore + r.xp || r.goldAfter !== r.goldBefore + r.baseGold + r.bonusGold ||
        !content.scenes.includes(r.scene) || !int(r.headline) || r.headline >= band.headlines.length || !Array.isArray(r.voices) || r.voices.length !== 3) return fail();
    for (const voice of r.voices) if (!voice || !content.profiles.some(p => p.id === voice.profile) || !int(voice.quote) || voice.quote >= band.quotes.length) return fail();
    if (new Set(r.voices.map(v => v.profile)).size !== 3 || new Set(r.voices.map(v => v.quote)).size !== 3) return fail();
    results.push({ ...(r.questId ? { questId: r.questId } : {}), version: 1, round: r.round, kind: r.kind, at: r.at, score: r.score, windfall: r.windfall, bonusGold: r.bonusGold, baseGold: r.baseGold,
      xp: r.xp, xpBefore: r.xpBefore, xpAfter: r.xpAfter, goldBefore: r.goldBefore, goldAfter: r.goldAfter,
      scene: r.scene, headline: r.headline, voices: r.voices.map(v => ({ profile: v.profile, quote: v.quote })) });
  }
  return { count: v.count, seen: v.seen, results };
}

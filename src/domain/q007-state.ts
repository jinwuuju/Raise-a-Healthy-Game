import content from '../../data/content/q007.v0.1.json';
import { passageModes, type PassageMode } from './passage-model';

export const q7Text = content;
/** Normal baseline first (design 16: normal before disease): both coronary entrances seen again. */
export const q7Normal = ['lca-wall', 'rca-wall'] as const;
/** One condition at a time: a little narrower, then much narrower (design 03 Q007). */
export const q7Compare = ['mild', 'narrow'] as const;
export const q7Materials = ['causes', 'tests', 'care'] as const;
export const q7Evidence = [...q7Normal, ...q7Compare, ...q7Materials] as const;
export type Q7Evidence = typeof q7Evidence[number];
export type ChainCard = 'buildup' | 'narrowing' | 'less-flow';
export const chainOrder: ChainCard[] = ['buildup', 'narrowing', 'less-flow'];
export type PairCard = 'narrow-rest' | 'narrow-work';
export type Q7State = { accepted: boolean; mode: PassageMode; notes: Q7Evidence[]; pair: PairCard | null; chain: ChainCard[]; lead: string | null; limit: string | null; checked: boolean; publishedAt: string | null };
export const emptyQ7 = (): Q7State => ({ accepted: false, mode: 'wide', notes: [], pair: null, chain: [], lead: null, limit: null, checked: false, publishedAt: null });

export function validateQ7(value: unknown): Q7State {
  if (value === undefined) return emptyQ7();
  const fail = (): never => { throw new Error('Q007 통로 비교 취재 기록이 잘못되었습니다.'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const q = value as Q7State;
  if (typeof q.accepted !== 'boolean' || !passageModes.includes(q.mode) || typeof q.checked !== 'boolean' ||
      !Array.isArray(q.notes) || q.notes.length > q7Evidence.length || new Set(q.notes).size !== q.notes.length ||
      !Array.isArray(q.chain) || q.chain.length > chainOrder.length || !(q.pair === null || q.pair === content.board.correctPair) ||
      !(q.lead === null || content.article.leads.some(l => l.id === q.lead)) ||
      !(q.limit === null || content.article.limitations.some(l => l.id === q.limit)) ||
      !(q.publishedAt === null || (typeof q.publishedAt === 'string' && Number.isFinite(Date.parse(q.publishedAt))))) return fail();
  for (let i = 0; i < q.notes.length; i++) if (!Object.hasOwn(q.notes, i) || !(q7Evidence as readonly string[]).includes(q.notes[i]!)) return fail();
  // The cause-and-effect chain only ever holds a correct prefix (wrong cards are refused, never saved).
  for (let i = 0; i < q.chain.length; i++) if (!Object.hasOwn(q.chain, i) || q.chain[i] !== chainOrder[i]) return fail();
  const has = (id: Q7Evidence) => q.notes.includes(id), normal = q7Normal.every(has), ready = q7Evidence.every(has);
  const idx = (id: Q7Evidence) => q.notes.indexOf(id);
  if ((!q.accepted && (q.mode !== 'wide' || q.notes.length || q.pair || q.chain.length || q.lead || q.limit || q.checked || q.publishedAt)) ||
      ((q.mode !== 'wide' || has('mild')) && !normal) || (has('narrow') && !has('mild')) ||
      (q7Materials.some(has) && !has('narrow')) || (has('tests') && !has('causes')) || (has('care') && !has('tests')) ||
      (has('narrow') && idx('narrow') < idx('mild')) ||
      ((q.pair || q.chain.length || q.lead || q.limit) && !ready) ||
      ((q.checked || q.publishedAt) && (!q.pair || q.chain.length !== chainOrder.length || !q.lead || !q.limit || !ready)) ||
      (q.publishedAt && !q.checked)) return fail();
  return { accepted: q.accepted, mode: q.mode, notes: [...q.notes], pair: q.pair, chain: [...q.chain], lead: q.lead, limit: q.limit, checked: q.checked, publishedAt: q.publishedAt };
}

import content from '../../data/content/q005.v0.1.json';
import { rhythmModes, type RhythmMode } from './rhythm-model';

export const q5Text = content;
/** Walking order through the heart for guidance; the signal order is checked separately on the article board. */
export const q5Normal = ['sa', 'av', 'right-branch', 'atria', 'left-branch'] as const;
export const q5Evidence = [...q5Normal, 'af', 'causes', 'tests', 'care'] as const;
export type SignalCard = typeof q5Normal[number];
export type Q5Evidence = typeof q5Evidence[number];
/** Canonical arrival order: the two bundle branches share the last stage and may be placed either way round. */
export const signalOrder: SignalCard[] = ['sa', 'atria', 'av', 'right-branch', 'left-branch'];
export const stageOf = (id: SignalCard): number => content.notes.find(n => n.id === id)!.stage;
/** True when every placed card is at the stage the signal reaches next. */
export const validOrder = (order: readonly string[]): boolean =>
  order.length <= signalOrder.length && new Set(order).size === order.length &&
  order.every((id, i) => (q5Normal as readonly string[]).includes(id) && stageOf(id as SignalCard) === stageOf(signalOrder[i]!));
export type Q5State = { accepted: boolean; mode: RhythmMode; notes: Q5Evidence[]; order: SignalCard[]; lead: string | null; limit: string | null; checked: boolean; publishedAt: string | null };
export const emptyQ5 = (): Q5State => ({ accepted: false, mode: 'normal', notes: [], order: [], lead: null, limit: null, checked: false, publishedAt: null });

export function validateQ5(value: unknown): Q5State {
  if (value === undefined) return emptyQ5();
  const fail = (): never => { throw new Error('Q005 박동 신호 취재 기록이 잘못되었습니다.'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const q = value as Q5State;
  if (typeof q.accepted !== 'boolean' || !rhythmModes.includes(q.mode) || typeof q.checked !== 'boolean' ||
      !Array.isArray(q.notes) || q.notes.length > q5Evidence.length || new Set(q.notes).size !== q.notes.length ||
      !Array.isArray(q.order) || !(q.lead === null || content.article.leads.some(l => l.id === q.lead)) ||
      !(q.limit === null || content.article.limitations.some(l => l.id === q.limit)) ||
      !(q.publishedAt === null || (typeof q.publishedAt === 'string' && Number.isFinite(Date.parse(q.publishedAt))))) return fail();
  for (let i = 0; i < q.notes.length; i++) if (!Object.hasOwn(q.notes, i) || !(q5Evidence as readonly string[]).includes(q.notes[i]!)) return fail();
  for (let i = 0; i < q.order.length; i++) if (!Object.hasOwn(q.order, i) || typeof q.order[i] !== 'string') return fail();
  if (!validOrder(q.order)) return fail();
  const has = (id: Q5Evidence) => q.notes.includes(id), normal = q5Normal.every(has), ready = q5Evidence.every(has);
  if ((!q.accepted && (q.mode !== 'normal' || q.notes.length || q.order.length || q.lead || q.limit || q.checked || q.publishedAt)) ||
      ((q.mode !== 'normal' || has('af')) && !normal) ||
      ((has('causes') || has('tests') || has('care')) && !has('af')) || (has('tests') && !has('causes')) || (has('care') && !has('tests')) ||
      ((q.order.length || q.lead || q.limit) && !ready) ||
      ((q.checked || q.publishedAt) && (q.order.length !== signalOrder.length || !q.lead || !q.limit || !ready)) ||
      (q.publishedAt && !q.checked)) return fail();
  return { accepted: q.accepted, mode: q.mode, notes: [...q.notes], order: [...q.order], lead: q.lead, limit: q.limit, checked: q.checked, publishedAt: q.publishedAt };
}

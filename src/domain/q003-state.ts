import content from '../../data/content/q003.v0.1.json';
import { valveModes, type ValveMode } from './valve-model';
export const q3Text = content;
export const q3Evidence = ['tricuspid', 'pulmonary', 'stenosis', 'regurgitation', 'causes', 'tests', 'care'] as const;
export type Q3Evidence = typeof q3Evidence[number];
export type Q3State = { accepted: boolean; mode: ValveMode; notes: Q3Evidence[]; lead: string | null; limit: string | null; checked: boolean; publishedAt: string | null };
export const emptyQ3 = (): Q3State => ({ accepted: false, mode: 'normal', notes: [], lead: null, limit: null, checked: false, publishedAt: null });
export function validateQ3(value: unknown): Q3State {
  if (value === undefined) return emptyQ3();
  const fail = (): never => { throw new Error('Q003 취재 기록이 잘못되었습니다.'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const q = value as Q3State;
  if (typeof q.accepted !== 'boolean' || !valveModes.includes(q.mode) || typeof q.checked !== 'boolean' || !Array.isArray(q.notes) || new Set(q.notes).size !== q.notes.length || !q.notes.every(n => q3Evidence.includes(n)) ||
      !(q.lead === null || content.article.leads.some(l => l.id === q.lead)) || !(q.limit === null || content.article.limitations.some(l => l.id === q.limit)) ||
      !(q.publishedAt === null || (typeof q.publishedAt === 'string' && Number.isFinite(Date.parse(q.publishedAt))))) return fail();
  const has = (id: Q3Evidence) => q.notes.includes(id), normal = has('tricuspid') && has('pulmonary'), compare = has('stenosis') && has('regurgitation');
  if ((!q.accepted && (q.mode !== 'normal' || q.notes.length || q.lead || q.limit || q.checked || q.publishedAt)) ||
      ((q.mode !== 'normal' || has('stenosis') || has('regurgitation')) && !normal) ||
      ((has('causes') || has('tests') || has('care')) && !compare) || (has('tests') && !has('causes')) || (has('care') && !has('tests')) ||
      ((q.lead || q.limit) && !has('care')) || ((q.checked || q.publishedAt) && (!q.lead || !q.limit || q3Evidence.some(id => !has(id)))) || (q.publishedAt && !q.checked)) return fail();
  return { accepted: q.accepted, mode: q.mode, notes: [...q.notes], lead: q.lead, limit: q.limit, checked: q.checked, publishedAt: q.publishedAt };
}

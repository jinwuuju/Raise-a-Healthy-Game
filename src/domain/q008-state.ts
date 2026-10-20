import content from '../../data/content/q008.v0.1.json';
import { pressureModes, type PressureMode } from './pressure-model';

export const q8Text = content;
/** Normal baseline first (design 16: normal before disease): the push while the heart squeezes and while it rests. */
export const q8Normal = ['squeeze', 'recoil'] as const;
/** One difference at a time: a passing situation (just moved) before a lasting state (high while resting). */
export const q8Compare = ['moved', 'high'] as const;
export const q8Materials = ['causes', 'tests', 'care'] as const;
export const q8Evidence = [...q8Normal, ...q8Compare, ...q8Materials] as const;
export type Q8Evidence = typeof q8Evidence[number];
export type RecordCard = 'home-1' | 'home-2' | 'home-3' | 'stairs' | 'unknown';
export type VerdictCard = 'repeat' | 'diagnose' | 'ignore';
export const recordPicks = content.board.correctRecords as RecordCard[];
export type Q8State = { accepted: boolean; mode: PressureMode; notes: Q8Evidence[]; picks: RecordCard[]; verdict: VerdictCard | null; lead: string | null; limit: string | null; checked: boolean; publishedAt: string | null };

export const emptyQ8 = (): Q8State => ({ accepted: false, mode: 'rest', notes: [], picks: [], verdict: null, lead: null, limit: null, checked: false, publishedAt: null });

export function validateQ8(value: unknown): Q8State {
  if (value === undefined) return emptyQ8();
  const fail = (): never => { throw new Error('Q008 혈압 기록 취재 기록이 잘못되었습니다.'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const q = value as Q8State;
  if (typeof q.accepted !== 'boolean' || !pressureModes.includes(q.mode) || typeof q.checked !== 'boolean' ||
      !Array.isArray(q.notes) || q.notes.length > q8Evidence.length || new Set(q.notes).size !== q.notes.length ||
      !Array.isArray(q.picks) || q.picks.length > recordPicks.length || new Set(q.picks).size !== q.picks.length ||
      !(q.verdict === null || q.verdict === content.board.correctVerdict) ||
      !(q.lead === null || content.article.leads.some(l => l.id === q.lead)) ||
      !(q.limit === null || content.article.limitations.some(l => l.id === q.limit)) ||
      !(q.publishedAt === null || (typeof q.publishedAt === 'string' && Number.isFinite(Date.parse(q.publishedAt))))) return fail();
  for (let i = 0; i < q.notes.length; i++) if (!Object.hasOwn(q.notes, i) || !(q8Evidence as readonly string[]).includes(q.notes[i]!)) return fail();
  // Only records taken under the same resting condition are ever saved (decoys are refused with a hint, never stored).
  for (let i = 0; i < q.picks.length; i++) if (!Object.hasOwn(q.picks, i) || !recordPicks.includes(q.picks[i]!)) return fail();
  const has = (id: Q8Evidence) => q.notes.includes(id), normal = q8Normal.every(has), ready = q8Evidence.every(has);
  const idx = (id: Q8Evidence) => q.notes.indexOf(id), picked = q.picks.length === recordPicks.length;
  if ((!q.accepted && (q.mode !== 'rest' || q.notes.length || q.picks.length || q.verdict || q.lead || q.limit || q.checked || q.publishedAt)) ||
      ((q.mode !== 'rest' || has('moved')) && !normal) || (has('high') && !has('moved')) || (has('high') && idx('high') < idx('moved')) ||
      (q8Materials.some(has) && !has('high')) || (has('tests') && !has('causes')) || (has('care') && !has('tests')) ||
      ((q.picks.length || q.verdict || q.lead || q.limit) && !ready) || (q.verdict && !picked) ||
      ((q.checked || q.publishedAt) && (!picked || !q.verdict || !q.lead || !q.limit || !ready)) ||
      (q.publishedAt && !q.checked)) return fail();
  return { accepted: q.accepted, mode: q.mode, notes: [...q.notes], picks: [...q.picks], verdict: q.verdict, lead: q.lead, limit: q.limit, checked: q.checked, publishedAt: q.publishedAt };
}

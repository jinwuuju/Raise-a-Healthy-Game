import content from '../../data/content/q011.v0.1.json';

/*
 * D112 Q011 ‘공기 항구’ (design 20 section 3, basic course of design 19). Saved commission state, no DOM.
 * Four scenes walked in the nose, three kinds of incoming air in the observer (only the air changes), then the desk:
 * one recorded scene for each job of the nose (warm, wet, filter), a lead, an analogy and its limitation.
 * Wrong cards are refused with a hint and never saved, so only valid pairs are stored.
 */
export const q11Text = content;
export const q11Evidence = ['hairs', 'shelves', 'wall', 'mucus'] as const;
export type Q11Evidence = typeof q11Evidence[number];
export const airModes = ['cold', 'dust', 'virus'] as const;
export type AirMode = typeof airModes[number];
export type Job = 'warm' | 'wet' | 'filter';
export const jobOrder = content.board.jobs.map(j => j.id) as Job[];
export type DecoyCard = 'oxygen';
export const supportsOf = (job: Job): string[] => content.board.jobs.find(j => j.id === job)?.supports ?? [];

export type Q11State = { accepted: boolean; notes: Q11Evidence[]; compared: AirMode[]; pairs: Q11Evidence[]; lead: string | null; analogy: string | null; limit: string | null; checked: boolean; publishedAt: string | null };
export const emptyQ11 = (): Q11State => ({ accepted: false, notes: [], compared: [], pairs: [], lead: null, analogy: null, limit: null, checked: false, publishedAt: null });

const valid = <T extends { id: string; hint?: string }>(list: T[], id: string | null) => id === null || list.some(x => x.id === id && !x.hint);

export function validateQ11(value: unknown): Q11State {
  if (value === undefined) return emptyQ11();
  const fail = (): never => { throw new Error('Q011 공기 항구 취재 기록이 잘못되었습니다.'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const q = value as Q11State;
  if (typeof q.accepted !== 'boolean' || typeof q.checked !== 'boolean' ||
      !Array.isArray(q.notes) || q.notes.length > q11Evidence.length || new Set(q.notes).size !== q.notes.length ||
      !Array.isArray(q.compared) || q.compared.length > airModes.length || new Set(q.compared).size !== q.compared.length ||
      !Array.isArray(q.pairs) || q.pairs.length > jobOrder.length ||
      !valid(content.article.leads, q.lead) || !valid(content.article.analogies, q.analogy) || !valid(content.article.limitations, q.limit) ||
      !(q.publishedAt === null || (typeof q.publishedAt === 'string' && Number.isFinite(Date.parse(q.publishedAt))))) return fail();
  for (let i = 0; i < q.notes.length; i++) if (!Object.hasOwn(q.notes, i) || !(q11Evidence as readonly string[]).includes(q.notes[i]!)) return fail();
  for (let i = 0; i < q.compared.length; i++) if (!Object.hasOwn(q.compared, i) || !(airModes as readonly string[]).includes(q.compared[i]!)) return fail();
  // Only scenes that really show the job are ever stored (a wrong pair is refused with a hint).
  for (let i = 0; i < q.pairs.length; i++) if (!Object.hasOwn(q.pairs, i) || !supportsOf(jobOrder[i]!).includes(q.pairs[i]!) || !q.notes.includes(q.pairs[i]!)) return fail();
  const seen = q11Evidence.every(id => q.notes.includes(id)), compared = airModes.every(m => q.compared.includes(m)), paired = q.pairs.length === jobOrder.length;
  if ((!q.accepted && (q.notes.length || q.compared.length || q.pairs.length || q.lead || q.analogy || q.limit || q.checked || q.publishedAt)) ||
      (q.compared.length && !seen) || ((q.pairs.length || q.lead || q.analogy || q.limit) && !(seen && compared)) ||
      ((q.checked || q.publishedAt) && (!paired || !q.lead || !q.analogy || !q.limit)) || (q.publishedAt && !q.checked)) return fail();
  return { accepted: q.accepted, notes: [...q.notes], compared: [...q.compared], pairs: [...q.pairs], lead: q.lead, analogy: q.analogy, limit: q.limit, checked: q.checked, publishedAt: q.publishedAt };
}

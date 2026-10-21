import content from '../../data/content/q010.v0.1.json';

export const q10Text = content;
type Claim = { id: string; card: string; supports?: string[]; hint?: string };
export const q10Claims = content.board.claims as Claim[];
export const validClaims = q10Claims.filter(c => !c.hint).map(c => c.id);
export const evidenceIds = content.board.evidence.map(e => e.id);
export const NEED = content.board.need;
export const supportsOf = (claim: string): string[] => q10Claims.find(c => c.id === claim)?.supports ?? [];
const correctAnalogies = (content.article.analogies as { id: string; hint?: string }[]).filter(a => !a.hint).map(a => a.id);
/** runDone: one blood-delivery run finished after the commission (design 19 section 6, any grade). The core check is derived from stars. */
export type Q10State = { accepted: boolean; runDone: boolean; claim: string | null; evidence: string[]; lead: string | null; analogy: string | null; limit: string | null; checked: boolean; publishedAt: string | null };

export const emptyQ10 = (): Q10State => ({ accepted: false, runDone: false, claim: null, evidence: [], lead: null, analogy: null, limit: null, checked: false, publishedAt: null });

export function validateQ10(value: unknown): Q10State {
  if (value === undefined) return emptyQ10();
  const fail = (): never => { throw new Error('Q010 졸업 특집호 기록이 잘못되었습니다.'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const q = value as Q10State;
  if (typeof q.accepted !== 'boolean' || typeof q.runDone !== 'boolean' || typeof q.checked !== 'boolean' ||
      !(q.claim === null || validClaims.includes(q.claim)) || !Array.isArray(q.evidence) || q.evidence.length > NEED || new Set(q.evidence).size !== q.evidence.length ||
      !(q.lead === null || content.article.leads.some(l => l.id === q.lead)) || !(q.analogy === null || correctAnalogies.includes(q.analogy)) ||
      !(q.limit === null || content.article.limitations.some(l => l.id === q.limit)) ||
      !(q.publishedAt === null || (typeof q.publishedAt === 'string' && Number.isFinite(Date.parse(q.publishedAt))))) return fail();
  // Only evidence that supports the chosen sentence is ever saved (other records are refused with where to find the missing one).
  for (let i = 0; i < q.evidence.length; i++) if (!Object.hasOwn(q.evidence, i) || !q.claim || !supportsOf(q.claim).includes(q.evidence[i]!)) return fail();
  const boarded = !!q.claim && q.evidence.length === NEED;
  if ((!q.accepted && (q.runDone || q.claim || q.evidence.length || q.lead || q.analogy || q.limit || q.checked || q.publishedAt)) ||
      ((q.claim || q.lead || q.analogy || q.limit) && !q.runDone) ||
      ((q.checked || q.publishedAt) && (!boarded || !q.lead || !q.analogy || !q.limit)) || (q.publishedAt && !q.checked)) return fail();
  return { accepted: q.accepted, runDone: q.runDone, claim: q.claim, evidence: [...q.evidence], lead: q.lead, analogy: q.analogy, limit: q.limit, checked: q.checked, publishedAt: q.publishedAt };
}

import content from '../../data/content/q012.v0.1.json';

/*
 * D113 Q012 ‘갈라지는 길’ (design 20 section 3, basic course of design 19). Saved commission state, no DOM.
 * Four scenes walked in the pharynx and the larynx, three things passing the throat in the fork observer (only what
 * passes changes: air, a sip of water, a crumb that slips), then the desk: the steps of one swallow put in order,
 * a lead, an analogy and its limitation. Wrong cards are refused with a hint and never saved, so only the right
 * order is ever stored.
 */
export const q12Text = content;
export const q12Evidence = ['palate', 'fork', 'lid', 'cords'] as const;
export type Q12Evidence = typeof q12Evidence[number];
export const throatModes = ['breath', 'swallow', 'slip'] as const;
export type ThroatMode = typeof throatModes[number];
export type SwallowStep = 'arrive' | 'close' | 'down' | 'open';
export const stepOrder = content.board.steps.map(s => s.id) as SwallowStep[];
export type Q12Decoy = 'both';
export const q12Decoys = content.board.decoys.map(d => d.id) as Q12Decoy[];

export type Q12State = { accepted: boolean; notes: Q12Evidence[]; compared: ThroatMode[]; order: SwallowStep[]; lead: string | null; analogy: string | null; limit: string | null; checked: boolean; publishedAt: string | null };
export const emptyQ12 = (): Q12State => ({ accepted: false, notes: [], compared: [], order: [], lead: null, analogy: null, limit: null, checked: false, publishedAt: null });

const valid = <T extends { id: string; hint?: string }>(list: T[], id: string | null) => id === null || list.some(x => x.id === id && !x.hint);

export function validateQ12(value: unknown): Q12State {
  if (value === undefined) return emptyQ12();
  const fail = (): never => { throw new Error('Q012 갈라지는 길 취재 기록이 잘못되었습니다.'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const q = value as Q12State;
  if (typeof q.accepted !== 'boolean' || typeof q.checked !== 'boolean' ||
      !Array.isArray(q.notes) || q.notes.length > q12Evidence.length || new Set(q.notes).size !== q.notes.length ||
      !Array.isArray(q.compared) || q.compared.length > throatModes.length || new Set(q.compared).size !== q.compared.length ||
      !Array.isArray(q.order) || q.order.length > stepOrder.length ||
      !valid(content.article.leads, q.lead) || !valid(content.article.analogies, q.analogy) || !valid(content.article.limitations, q.limit) ||
      !(q.publishedAt === null || (typeof q.publishedAt === 'string' && Number.isFinite(Date.parse(q.publishedAt))))) return fail();
  for (let i = 0; i < q.notes.length; i++) if (!Object.hasOwn(q.notes, i) || !(q12Evidence as readonly string[]).includes(q.notes[i]!)) return fail();
  for (let i = 0; i < q.compared.length; i++) if (!Object.hasOwn(q.compared, i) || !(throatModes as readonly string[]).includes(q.compared[i]!)) return fail();
  // Only the right order is ever stored (an out-of-order card is refused with a hint).
  for (let i = 0; i < q.order.length; i++) if (!Object.hasOwn(q.order, i) || q.order[i] !== stepOrder[i]) return fail();
  const seen = q12Evidence.every(id => q.notes.includes(id)), compared = throatModes.every(m => q.compared.includes(m)), ordered = q.order.length === stepOrder.length;
  if ((!q.accepted && (q.notes.length || q.compared.length || q.order.length || q.lead || q.analogy || q.limit || q.checked || q.publishedAt)) ||
      (q.compared.length && !seen) || ((q.order.length || q.lead || q.analogy || q.limit) && !(seen && compared)) ||
      ((q.checked || q.publishedAt) && (!ordered || !q.lead || !q.analogy || !q.limit)) || (q.publishedAt && !q.checked)) return fail();
  return { accepted: q.accepted, notes: [...q.notes], compared: [...q.compared], order: [...q.order], lead: q.lead, analogy: q.analogy, limit: q.limit, checked: q.checked, publishedAt: q.publishedAt };
}

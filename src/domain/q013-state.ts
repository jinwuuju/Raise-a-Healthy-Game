import content from '../../data/content/q013.v0.1.json';

/*
 * D117 Q013 ‘두 개의 흐름’ (design 20 section 3, basic course of design 19). Saved commission state, no DOM.
 * Four scenes walked in the trachea and the bronchial tree, three breaths in the flow observer (only the breath
 * changes: breathing in, breathing out, holding the breath; the mucus keeps going up), then the desk: each movement
 * sorted into the air flow or the mucus flow, a lead, an analogy and its limitation. Wrong cards are refused with a
 * hint and never saved, so only rightly sorted cards are ever stored.
 */
export const q13Text = content;
export const q13Evidence = ['rings', 'carpet', 'carina', 'branches'] as const;
export type Q13Evidence = typeof q13Evidence[number];
export const breathModes = ['in', 'out', 'hold'] as const;
export type BreathMode = typeof breathModes[number];
export type FlowBin = 'air' | 'mucus';
export const flowBins = content.board.bins.map(b => b.id) as FlowBin[];
export type FlowCard = 'tide' | 'divide' | 'up' | 'gather';
export const flowCards = content.board.cards.map(c => c.id) as FlowCard[];
export type Q13Decoy = 'follow';
export const q13Decoys = content.board.decoys.map(d => d.id) as Q13Decoy[];
/** The flow each movement belongs to (the content file is the only source). */
export const binOf = (id: FlowCard): FlowBin => content.board.cards.find(c => c.id === id)!.bin as FlowBin;
export type Q13State = { accepted: boolean; notes: Q13Evidence[]; compared: BreathMode[]; sorted: FlowCard[]; lead: string | null; analogy: string | null; limit: string | null; checked: boolean; publishedAt: string | null };
export const emptyQ13 = (): Q13State => ({ accepted: false, notes: [], compared: [], sorted: [], lead: null, analogy: null, limit: null, checked: false, publishedAt: null });

const valid = <T extends { id: string; hint?: string }>(list: T[], id: string | null) => id === null || list.some(x => x.id === id && !x.hint);

export function validateQ13(value: unknown): Q13State {
  if (value === undefined) return emptyQ13();
  const fail = (): never => { throw new Error('Q013 두 개의 흐름 취재 기록이 잘못되었습니다.'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const q = value as Q13State;
  if (typeof q.accepted !== 'boolean' || typeof q.checked !== 'boolean' ||
      !Array.isArray(q.notes) || q.notes.length > q13Evidence.length || new Set(q.notes).size !== q.notes.length ||
      !Array.isArray(q.compared) || q.compared.length > breathModes.length || new Set(q.compared).size !== q.compared.length ||
      !Array.isArray(q.sorted) || q.sorted.length > flowCards.length || new Set(q.sorted).size !== q.sorted.length ||
      !valid(content.article.leads, q.lead) || !valid(content.article.analogies, q.analogy) || !valid(content.article.limitations, q.limit) ||
      !(q.publishedAt === null || (typeof q.publishedAt === 'string' && Number.isFinite(Date.parse(q.publishedAt))))) return fail();
  for (let i = 0; i < q.notes.length; i++) if (!Object.hasOwn(q.notes, i) || !(q13Evidence as readonly string[]).includes(q.notes[i]!)) return fail();
  for (let i = 0; i < q.compared.length; i++) if (!Object.hasOwn(q.compared, i) || !(breathModes as readonly string[]).includes(q.compared[i]!)) return fail();
  // A card is stored only after it was sorted into its own flow (a wrong flow is refused with a hint).
  for (let i = 0; i < q.sorted.length; i++) if (!Object.hasOwn(q.sorted, i) || !(flowCards as readonly string[]).includes(q.sorted[i]!)) return fail();
  const seen = q13Evidence.every(id => q.notes.includes(id)), compared = breathModes.every(m => q.compared.includes(m)), sorted = q.sorted.length === flowCards.length;
  if ((!q.accepted && (q.notes.length || q.compared.length || q.sorted.length || q.lead || q.analogy || q.limit || q.checked || q.publishedAt)) ||
      (q.compared.length && !seen) || ((q.sorted.length || q.lead || q.analogy || q.limit) && !(seen && compared)) ||
      ((q.checked || q.publishedAt) && (!sorted || !q.lead || !q.analogy || !q.limit)) || (q.publishedAt && !q.checked)) return fail();
  return { accepted: q.accepted, notes: [...q.notes], compared: [...q.compared], sorted: [...q.sorted], lead: q.lead, analogy: q.analogy, limit: q.limit, checked: q.checked, publishedAt: q.publishedAt };
}

import content from '../../data/content/q002.v0.1.json';
export const q2Text = content;
export const chamberIds = ['heart', 'rv', 'la', 'lv'] as const;
export type ChamberId = typeof chamberIds[number];
export type Q2State = { accepted: boolean; reported: boolean; lead: string | null; cards: Record<ChamberId, ChamberId | null>; checked: boolean; publishedAt: string | null };
export const emptyQ2 = (): Q2State => ({ accepted: false, reported: false, lead: null, cards: { heart: null, rv: null, la: null, lv: null }, checked: false, publishedAt: null });
export function validateQ2(value: unknown): Q2State {
  if (value === undefined) return emptyQ2();
  const fail = (): never => { throw new Error('Q002 취재 기록이 잘못되었습니다.'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const q = value as Q2State;
  if (typeof q.accepted !== 'boolean' || typeof q.reported !== 'boolean' || typeof q.checked !== 'boolean' || !q.cards ||
    !(q.lead === null || content.leads.some(l => l.id === q.lead)) ||
    !(q.publishedAt === null || (typeof q.publishedAt === 'string' && Number.isFinite(Date.parse(q.publishedAt))))) return fail();
  const cards = {} as Q2State['cards'];
  for (const id of chamberIds) { const v = q.cards[id]; if (v !== null && !chamberIds.includes(v)) return fail(); cards[id] = v; }
  if ((!q.accepted && (q.reported || q.lead || q.checked || q.publishedAt || chamberIds.some(id => cards[id]))) ||
      ((q.lead || chamberIds.some(id => cards[id])) && !q.reported) ||
      ((q.checked || q.publishedAt) && (!q.reported || !q.lead || chamberIds.some(id => cards[id] !== id))) || (q.publishedAt && !q.checked)) return fail();
  return { accepted: q.accepted, reported: q.reported, lead: q.lead, cards, checked: q.checked, publishedAt: q.publishedAt };
}

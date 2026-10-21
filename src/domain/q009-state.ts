import content from '../../data/content/q009.v0.1.json';

export const q9Text = content;
/** Evidence first (design 03 Q009: no connection without evidence): the wall between the sides, both pump exits and the lungs. */
export const q9Evidence = ['wall', 'right-pump', 'lung', 'left-pump'] as const;
export type Q9Evidence = typeof q9Evidence[number];
export type RoomCard = 'ra' | 'rv' | 'la' | 'lv';
export type ChainCard = 'ra' | 'rv' | 'lung' | 'la' | 'lv' | 'body';
export type DecoyCard = 'cross' | 'skip';
/** The reader's picture is drawn facing the person: their right side sits on the picture's left (a new arrangement, design 03). */
export const slotOrder = content.board.slots.map(s => s.room) as RoomCard[];
export const chainOrder = content.board.chain.map(c => c.id) as ChainCard[];
export type Q9State = { accepted: boolean; notes: Q9Evidence[]; slots: RoomCard[]; chain: ChainCard[]; lead: string | null; analogy: string | null; limit: string | null; checked: boolean; publishedAt: string | null };

export const emptyQ9 = (): Q9State => ({ accepted: false, notes: [], slots: [], chain: [], lead: null, analogy: null, limit: null, checked: false, publishedAt: null });

const correctAnalogies = content.article.analogies.filter(a => !('hint' in a)).map(a => a.id);

export function validateQ9(value: unknown): Q9State {
  if (value === undefined) return emptyQ9();
  const fail = (): never => { throw new Error('Q009 순환 설명 취재 기록이 잘못되었습니다.'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const q = value as Q9State;
  if (typeof q.accepted !== 'boolean' || typeof q.checked !== 'boolean' ||
      !Array.isArray(q.notes) || q.notes.length > q9Evidence.length || new Set(q.notes).size !== q.notes.length ||
      !Array.isArray(q.slots) || q.slots.length > slotOrder.length || !Array.isArray(q.chain) || q.chain.length > chainOrder.length ||
      !(q.lead === null || content.article.leads.some(l => l.id === q.lead)) ||
      !(q.analogy === null || correctAnalogies.includes(q.analogy)) ||
      !(q.limit === null || content.article.limitations.some(l => l.id === q.limit)) ||
      !(q.publishedAt === null || (typeof q.publishedAt === 'string' && Number.isFinite(Date.parse(q.publishedAt))))) return fail();
  for (let i = 0; i < q.notes.length; i++) if (!Object.hasOwn(q.notes, i) || !(q9Evidence as readonly string[]).includes(q.notes[i]!)) return fail();
  // Only the correct prefix of the picture and of the loop is ever saved (wrong cards are refused with a hint, never stored).
  for (let i = 0; i < q.slots.length; i++) if (!Object.hasOwn(q.slots, i) || q.slots[i] !== slotOrder[i]) return fail();
  for (let i = 0; i < q.chain.length; i++) if (!Object.hasOwn(q.chain, i) || q.chain[i] !== chainOrder[i]) return fail();
  const ready = q9Evidence.every(id => q.notes.includes(id)), slotted = q.slots.length === slotOrder.length, looped = q.chain.length === chainOrder.length;
  if ((!q.accepted && (q.notes.length || q.slots.length || q.chain.length || q.lead || q.analogy || q.limit || q.checked || q.publishedAt)) ||
      ((q.slots.length || q.chain.length || q.lead || q.analogy || q.limit) && !ready) || (q.chain.length && !slotted) ||
      ((q.checked || q.publishedAt) && (!slotted || !looped || !q.lead || !q.analogy || !q.limit || !ready)) ||
      (q.publishedAt && !q.checked)) return fail();
  return { accepted: q.accepted, notes: [...q.notes], slots: [...q.slots], chain: [...q.chain], lead: q.lead, analogy: q.analogy, limit: q.limit, checked: q.checked, publishedAt: q.publishedAt };
}

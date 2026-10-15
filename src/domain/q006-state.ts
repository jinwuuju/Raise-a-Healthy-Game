import content from '../../data/content/q006.v0.1.json';
import { supplyModes, type SupplyMode } from './supply-model';

export const q6Text = content;
/** Walking order through the heart (right atrium first); the supply route order is checked separately on the article board. */
export const q6Normal = ['return', 'rv-muscle', 'lv-muscle', 'rca', 'lca'] as const;
export const q6Evidence = [...q6Normal, 'work', 'need', 'timing', 'demand'] as const;
export type SupplyCard = typeof q6Normal[number];
export type Q6Evidence = typeof q6Evidence[number];
/** Cards offered on the board: the five reported stops plus the main body route, which is never part of the heart's own supply. */
export type BoardCard = SupplyCard | 'body';
/** Canonical route: both coronary openings share the first stage and both walls the second; either order is accepted inside a stage. */
export const supplyOrder: SupplyCard[] = ['rca', 'lca', 'rv-muscle', 'lv-muscle', 'return'];
export const supplyStage = (id: SupplyCard): number => content.notes.find(n => n.id === id)!.stage;

/** True when every placed card is at the stage the supply reaches next. */
export const validSupplyOrder = (order: readonly string[]): boolean =>
  order.length <= supplyOrder.length && new Set(order).size === order.length &&
  order.every((id, i) => (q6Normal as readonly string[]).includes(id) && supplyStage(id as SupplyCard) === supplyStage(supplyOrder[i]!));

export type Q6State = { accepted: boolean; mode: SupplyMode; notes: Q6Evidence[]; order: SupplyCard[]; lead: string | null; limit: string | null; checked: boolean; publishedAt: string | null };
export const emptyQ6 = (): Q6State => ({ accepted: false, mode: 'rest', notes: [], order: [], lead: null, limit: null, checked: false, publishedAt: null });

export function validateQ6(value: unknown): Q6State {
  if (value === undefined) return emptyQ6();
  const fail = (): never => { throw new Error('Q006 심장 근육 공급 취재 기록이 잘못되었습니다.'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const q = value as Q6State;
  if (typeof q.accepted !== 'boolean' || !supplyModes.includes(q.mode) || typeof q.checked !== 'boolean' ||
      !Array.isArray(q.notes) || q.notes.length > q6Evidence.length || new Set(q.notes).size !== q.notes.length ||
      !Array.isArray(q.order) || !(q.lead === null || content.article.leads.some(l => l.id === q.lead)) ||
      !(q.limit === null || content.article.limitations.some(l => l.id === q.limit)) ||
      !(q.publishedAt === null || (typeof q.publishedAt === 'string' && Number.isFinite(Date.parse(q.publishedAt))))) return fail();
  for (let i = 0; i < q.notes.length; i++) if (!Object.hasOwn(q.notes, i) || !(q6Evidence as readonly string[]).includes(q.notes[i]!)) return fail();
  for (let i = 0; i < q.order.length; i++) if (!Object.hasOwn(q.order, i) || typeof q.order[i] !== 'string') return fail();
  if (!validSupplyOrder(q.order)) return fail();
  const has = (id: Q6Evidence) => q.notes.includes(id), normal = q6Normal.every(has), ready = q6Evidence.every(has);
  if ((!q.accepted && (q.mode !== 'rest' || q.notes.length || q.order.length || q.lead || q.limit || q.checked || q.publishedAt)) ||
      ((q.mode !== 'rest' || has('work')) && !normal) ||
      ((has('need') || has('timing') || has('demand')) && !has('work')) || (has('timing') && !has('need')) || (has('demand') && !has('timing')) ||
      ((q.order.length || q.lead || q.limit) && !ready) ||
      ((q.checked || q.publishedAt) && (q.order.length !== supplyOrder.length || !q.lead || !q.limit || !ready)) ||
      (q.publishedAt && !q.checked)) return fail();
  return { accepted: q.accepted, mode: q.mode, notes: [...q.notes], order: [...q.order], lead: q.lead, limit: q.limit, checked: q.checked, publishedAt: q.publishedAt };
}

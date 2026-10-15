import balance from '../../data/balance/q006.v0.1.json';
import { q6Evidence, q6Normal, q6Text, supplyOrder, supplyStage, type BoardCard, type Q6Evidence, type SupplyCard } from './q006-state';
import { supplyModes, type SupplyMode } from './supply-model';
import { grantOnce, type GameState } from './state';
import { rooms } from '../world/rooms';

export const q6Reward = balance.publication;
export const canOfferQ6 = (s: GameState) => !!s.q005.publishedAt && s.ledger.includes('quest.Q005.first') && !s.q006.accepted;
export const q6NormalDone = (s: GameState) => q6Normal.every(id => s.q006.notes.includes(id));
export const q6CompareDone = (s: GameState) => s.q006.notes.includes('work');
export const q6Ready = (s: GameState) => q6Evidence.every(id => s.q006.notes.includes(id));

export function acceptQ6(s: GameState): GameState {
  if (s.q006.accepted) return s;
  if (!canOfferQ6(s) || s.at.room !== 'newsroom') throw new Error('Q005 기사 발행 뒤 편집국에서 심장 근육 공급 취재를 받아 주세요.');
  return { ...s, q006: { ...s.q006, accepted: true } };
}

function near(s: GameState, target: string, room: string): boolean {
  if (s.at.room !== room) return false;
  const t = rooms[s.at.room].targets.find(t => t.id === target);
  return !!t && Math.hypot(s.at.x - t.x, s.at.y - t.y) <= t.r + 2;
}

/** The supply observer stands in front of the aortic sinus. Rendering reads the mode; it never moves the reporter. */
export function setQ6Mode(s: GameState, mode: SupplyMode): GameState {
  if (!supplyModes.includes(mode)) throw new Error('선택할 수 없는 비교 상태예요.');
  if (mode !== 'rest' && (!s.q006.accepted || !q6NormalDone(s) || !near(s, 'hx-sinus', 'aorta'))) throw new Error('공급 노선의 다섯 곳을 먼저 보고 대동맥굴 앞에서 비교해 주세요.');
  return s.q006.mode === mode ? s : { ...s, q006: { ...s.q006, mode } };
}

export function recordQ6(s: GameState, id: Q6Evidence): GameState {
  if (!s.q006.accepted || !(q6Evidence as readonly string[]).includes(id)) throw new Error('먼저 심장 근육 공급 취재를 받아 주세요.');
  const note = q6Text.notes.find(n => n.id === id);
  if (note) {
    if (!near(s, note.target, note.room)) throw new Error('공급 노선의 해당 구조 가까이에서 관찰해 주세요.');
    if (s.q006.mode !== 'rest') throw new Error('비교 창을 닫아 쉴 때 모형으로 돌아온 뒤 관찰해 주세요.');
  } else if (id === 'work') {
    if (!q6NormalDone(s) || !near(s, 'hx-sinus', 'aorta') || s.q006.mode !== 'work') throw new Error('공급 노선 다섯 곳을 본 뒤 공급 관찰기의 더 일할 때 비교에서 기록해 주세요.');
  } else {
    if (!near(s, 'my-desk', 'newsroom') || !q6CompareDone(s) || s.q006.mode !== 'rest') throw new Error('공급 비교 후 편집국 내 자리의 자료 취재로 이어가 주세요.');
    if ((id === 'timing' && !s.q006.notes.includes('need')) || (id === 'demand' && !s.q006.notes.includes('timing'))) throw new Error('필요한 이유→흐르는 때→더 일할 때 순서로 취재해 주세요.');
  }
  return s.q006.notes.includes(id) ? s : { ...s, q006: { ...s.q006, notes: [...s.q006.notes, id] } };
}

export function q6ArticleAccess(s: GameState): string | null {
  if (!q6Ready(s)) return '공급 노선 관찰·공급 비교·자료 취재를 모두 마치면 배송 노선 기사를 쓸 수 있어요.';
  if (s.at.room !== 'newsroom') return '기사 쓰기와 배송 노선 도해는 편집국에서 할 수 있어요.';
  return null;
}

function writable(s: GameState): void {
  const why = q6ArticleAccess(s); if (why) throw new Error(why);
  if (s.q006.publishedAt || s.ledger.includes(q6Reward.key)) throw new Error('발행한 기사는 기록으로 읽어요.');
}

/** Places the next card on the supply route. The main body route and out-of-order cards are refused with a hint and no penalty. */
export function placeQ6(s: GameState, id: BoardCard): GameState {
  writable(s);
  if (id === 'body') throw new Error(q6Text.board.mismatch + q6Text.board.decoy.hint);
  if (!(q6Normal as readonly string[]).includes(id)) throw new Error('선택할 수 없는 배송 카드예요.');
  if (s.q006.order.includes(id)) return s;
  const next = supplyOrder[s.q006.order.length];
  if (!next) return s;
  if (supplyStage(id) !== supplyStage(next)) throw new Error(q6Text.board.mismatch + (q6Text.board.hints as Record<string, string>)[String(supplyStage(next))]!);
  return { ...s, q006: { ...s.q006, order: [...s.q006.order, id], checked: false } };
}

/** Clears the board to try again; the reporting notes stay. */
export function clearQ6Order(s: GameState): GameState {
  writable(s);
  return s.q006.order.length ? { ...s, q006: { ...s.q006, order: [], checked: false } } : s;
}

export function selectQ6(s: GameState, slot: 'lead' | 'limit', id: string | null): GameState {
  writable(s);
  if (!['lead', 'limit'].includes(slot) || (id !== null && !(slot === 'lead' ? q6Text.article.leads : q6Text.article.limitations).some(x => x.id === id))) throw new Error('선택할 수 없는 기사 문장이에요.');
  return s.q006[slot] === id ? s : { ...s, q006: { ...s.q006, [slot]: id, checked: false } };
}

export function checkQ6(s: GameState): GameState {
  writable(s);
  return s.q006.checked || s.q006.order.length !== supplyOrder.length || !s.q006.lead || !s.q006.limit ? s : { ...s, q006: { ...s.q006, checked: true } };
}

export function publishQ6(s: GameState, now = new Date().toISOString()): GameState {
  if (s.q006.publishedAt || s.ledger.includes(q6Reward.key)) return s;
  writable(s);
  if (!s.q006.checked || s.q006.order.length !== supplyOrder.length || !s.q006.lead || !s.q006.limit || !Number.isFinite(Date.parse(now))) throw new Error('배송 노선 도해와 모형의 한계를 편집장에게 확인받아 주세요.');
  return { ...grantOnce(s, q6Reward.key, q6Reward), q006: { ...s.q006, mode: 'rest', publishedAt: now } };
}

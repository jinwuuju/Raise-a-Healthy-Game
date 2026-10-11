import balance from '../../data/balance/q002.v0.1.json';
import { chamberIds, q2Text, type ChamberId } from './q002-state';
import { grantOnce, type GameState } from './state';
import { rooms } from '../world/rooms';
export const q2Reward = balance.publication;
export const q2Key = (id: string) => 'q002:' + id;
export const q2Seen = (s: GameState) => chamberIds.filter(id => s.inspected.includes(q2Key(id)));
export const canOfferQ2 = (s: GameState) => !!s.article.publishedAt && s.ledger.includes('quest.Q001.first') && !s.q002.accepted;
export function acceptQ2(s: GameState): GameState {
  if (s.q002.accepted) return s;
  if (!canOfferQ2(s) || s.at.room !== 'newsroom') throw new Error('첫 기사 발행 후 편집국에서 다음 의뢰를 받아 주세요.');
  return { ...s, q002: { ...s.q002, accepted: true } };
}
export function observeQ2(s: GameState, targetId: string): GameState {
  const note = q2Text.notes.find(n => n.target === targetId);
  if (!s.q002.accepted || !note || s.at.room !== note.room) throw new Error('의뢰를 받은 뒤 그 방의 취재 지점에서 관찰해 주세요.');
  const t = rooms[s.at.room].targets.find(t => t.id === targetId)!;
  if (Math.hypot(s.at.x - t.x, s.at.y - t.y) > t.r + 2) throw new Error('취재 지점 가까이에서 관찰해 주세요.');
  const key = q2Key(note.id);
  return s.inspected.includes(key) ? s : { ...s, inspected: [...s.inspected, key] };
}
export function reportQ2(s: GameState): GameState {
  if (!s.q002.accepted || q2Seen(s).length !== 4 || s.at.room !== 'newsroom') throw new Error('네 방의 관찰을 모아 편집국에서 보고해 주세요.');
  return s.q002.reported ? s : { ...s, q002: { ...s.q002, reported: true } };
}
export function q2Access(s: GameState): string | null {
  if (!s.q002.accepted || !s.q002.reported || q2Seen(s).length !== 4) return '네 방을 관찰하고 편집장에게 보고하면 도해 기사를 쓸 수 있어요.';
  if (s.at.room !== 'newsroom') return '기사 작성과 발행은 편집국에서 할 수 있어요. 여기에서는 초안을 읽어요.';
  return null;
}
function writable(s: GameState) {
  const why = q2Access(s); if (why) throw new Error(why);
  if (s.q002.publishedAt || s.ledger.includes(q2Reward.key)) throw new Error('발행한 기사는 기록으로 읽을 수 있어요.');
}
export function selectQ2(s: GameState, slot: ChamberId | 'lead', id: string | null): GameState {
  writable(s);
  if (slot === 'lead') {
    if (id !== null && !q2Text.leads.some(l => l.id === id)) throw new Error('선택할 수 없는 첫 문장이에요.');
    if (s.q002.lead === id) return s;
    return { ...s, q002: { ...s.q002, lead: id, checked: false } };
  }
  if (!chamberIds.includes(slot) || (id !== null && (!chamberIds.includes(id as ChamberId) || !s.inspected.includes(q2Key(id))))) throw new Error('직접 취재한 주소 카드를 선택해 주세요.');
  if (s.q002.cards[slot] === id) return s;
  return { ...s, q002: { ...s.q002, cards: { ...s.q002.cards, [slot]: id as ChamberId | null }, checked: false } };
}
export function q2Feedback(s: GameState): string[] {
  const messages: string[] = [];
  if (!s.q002.lead) messages.push('독자의 질문에 답할 첫 문장을 골라 주세요.');
  for (const note of q2Text.notes) if (s.q002.cards[note.id as ChamberId] !== note.id || !s.inspected.includes(q2Key(note.id))) messages.push(note.name + '의 직접 취재한 주소 카드를 붙여 주세요.');
  return messages;
}
export function checkQ2(s: GameState): GameState {
  writable(s);
  return q2Feedback(s).length || s.q002.checked ? s : { ...s, q002: { ...s.q002, checked: true } };
}
export function publishQ2(s: GameState, now = new Date().toISOString()): GameState {
  if (s.q002.publishedAt || s.ledger.includes(q2Reward.key)) return s;
  writable(s);
  if (!s.q002.checked || q2Feedback(s).length) throw new Error('편집장에게 출입구와 근거를 확인받아 주세요.');
  if (!Number.isFinite(Date.parse(now))) throw new Error('발행 시각이 잘못되었습니다.');
  return { ...grantOnce(s, q2Reward.key, q2Reward), q002: { ...s.q002, publishedAt: now } };
}

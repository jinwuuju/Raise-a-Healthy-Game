import balance from '../../data/balance/q009.v0.1.json';
import { chainOrder, q9Evidence, q9Text, slotOrder, type ChainCard, type DecoyCard, type Q9Evidence, type RoomCard } from './q009-state';
import { grantOnce, type GameState } from './state';
import { rooms } from '../world/rooms';

/*
 * D108 Q009 ‘독자에게 설명하는 순환’ (basic course, design 19; design 03: apply a known principle to a new arrangement).
 * Re-check four pieces of evidence in the heart → read a picture drawn facing the person (their right on the picture's left)
 * → join one loop on that picture (no connection without evidence) → an easy explanatory article with a lead, an analogy and
 * its limitation. Wrong cards are refused with only the missing link as a hint, never saved. No new disease (design 19 section 6).
 */

export const q9Reward = balance.publication;
export const canOfferQ9 = (s: GameState) => !!s.q008.publishedAt && s.ledger.includes('quest.Q008.first') && !s.q009.accepted;
export const q9Ready = (s: GameState) => q9Evidence.every(id => s.q009.notes.includes(id));

export function acceptQ9(s: GameState): GameState {
  if (s.q009.accepted) return s;
  if (!canOfferQ9(s) || s.at.room !== 'newsroom') throw new Error('Q008 기사 발행 뒤 편집국에서 순환 설명 취재를 받아 주세요.');
  return { ...s, q009: { ...s.q009, accepted: true } };
}

function near(s: GameState, target: string, room: string): boolean {
  if (s.at.room !== room) return false;
  const t = rooms[s.at.room].targets.find(t => t.id === target);
  return !!t && Math.hypot(s.at.x - t.x, s.at.y - t.y) <= t.r + 2;
}

export function recordQ9(s: GameState, id: Q9Evidence): GameState {
  const note = q9Text.notes.find(n => n.id === id);
  if (!s.q009.accepted || !note) throw new Error('먼저 순환 설명 취재를 받아 주세요.');
  if (!near(s, note.target, note.room)) throw new Error('근거 지점 가까이에서 살펴봐 주세요.');
  return s.q009.notes.includes(id) ? s : { ...s, q009: { ...s.q009, notes: [...s.q009.notes, id] } };
}

export function q9ArticleAccess(s: GameState): string | null {
  if (!q9Ready(s)) return '심장 속 근거 네 곳을 다시 확인하면 그림 읽기와 설명 기사를 쓸 수 있어요.';
  if (s.at.room !== 'newsroom') return '그림 읽기와 기사 쓰기는 편집국에서 할 수 있어요.';
  return null;
}

function writable(s: GameState): void {
  const why = q9ArticleAccess(s); if (why) throw new Error(why);
  if (s.q009.publishedAt || s.ledger.includes(q9Reward.key)) throw new Error('발행한 기사는 기록으로 읽어요.');
}

/** Names the next empty square of the reader's picture. A wrong room shows only what is missing: the side or the level. */
export function slotQ9(s: GameState, id: RoomCard): GameState {
  writable(s);
  const b = q9Text.board, room = b.rooms.find(r => r.id === id);
  if (!room) throw new Error('선택할 수 없는 방 카드예요.');
  if (s.q009.slots.includes(id)) throw new Error('이미 그림에 붙인 방이에요.');
  const want = b.rooms.find(r => r.id === slotOrder[s.q009.slots.length])!;
  if (!want) throw new Error('그림의 네 칸을 모두 채웠어요.');
  if (id !== want.id) throw new Error(room.side !== want.side ? b.sideHint : b.levelHint);
  return { ...s, q009: { ...s.q009, slots: [...s.q009.slots, id], checked: false } };
}

/** Adds the next stop of one loop on the picture. Decoys have no evidence; an out-of-order card shows only the missing link. */
export function chainQ9(s: GameState, id: ChainCard | DecoyCard): GameState {
  writable(s);
  const b = q9Text.board;
  if (s.q009.slots.length < slotOrder.length) throw new Error(b.needSlots);
  const decoy = b.decoys.find(d => d.id === id);
  if (decoy) throw new Error(decoy.hint);
  if (!(chainOrder as string[]).includes(id)) throw new Error('선택할 수 없는 연결 카드예요.');
  if (s.q009.chain.includes(id as ChainCard)) throw new Error('이미 이은 곳이에요.');
  const i = s.q009.chain.length;
  if (id !== chainOrder[i]) {
    if (i === 0) throw new Error(b.startHint);
    const last = b.chain.find(c => c.id === s.q009.chain[i - 1])!;
    throw new Error(b.nextHint.replace('{last}', last.card.split(' · ')[0]!));
  }
  return { ...s, q009: { ...s.q009, chain: [...s.q009.chain, id as ChainCard], checked: false } };
}

/** Clears the picture and the loop to try again; the evidence notes stay. */
export function clearQ9Board(s: GameState): GameState {
  writable(s);
  return s.q009.slots.length || s.q009.chain.length ? { ...s, q009: { ...s.q009, slots: [], chain: [], checked: false } } : s;
}

export const q9BoardDone = (s: GameState) => s.q009.slots.length === slotOrder.length && s.q009.chain.length === chainOrder.length;

export function selectQ9(s: GameState, slot: 'lead' | 'analogy' | 'limit', id: string | null): GameState {
  writable(s);
  const list: { id: string; hint?: string }[] | null = slot === 'lead' ? q9Text.article.leads : slot === 'analogy' ? q9Text.article.analogies : slot === 'limit' ? q9Text.article.limitations : null;
  const choice = id === null ? null : list?.find(x => x.id === id);
  if (!list || (id !== null && !choice)) throw new Error('선택할 수 없는 기사 문장이에요.');
  if (choice?.hint) throw new Error(choice.hint);
  return s.q009[slot] === id ? s : { ...s, q009: { ...s.q009, [slot]: id, checked: false } };
}

export function checkQ9(s: GameState): GameState {
  writable(s);
  return s.q009.checked || !q9BoardDone(s) || !s.q009.lead || !s.q009.analogy || !s.q009.limit ? s : { ...s, q009: { ...s.q009, checked: true } };
}

export function publishQ9(s: GameState, now = new Date().toISOString()): GameState {
  if (s.q009.publishedAt || s.ledger.includes(q9Reward.key)) return s;
  writable(s);
  if (!s.q009.checked || !q9BoardDone(s) || !s.q009.lead || !s.q009.analogy || !s.q009.limit || !Number.isFinite(Date.parse(now))) throw new Error('그림 읽기와 한 바퀴 잇기, 비유와 그 한계를 편집장에게 확인받아 주세요.');
  return { ...grantOnce(s, q9Reward.key, q9Reward), q009: { ...s.q009, publishedAt: now } };
}

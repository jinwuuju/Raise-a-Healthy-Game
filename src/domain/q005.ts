import balance from '../../data/balance/q005.v0.1.json';
import { q5Evidence, q5Normal, q5Text, signalOrder, stageOf, type Q5Evidence, type SignalCard } from './q005-state';
import { rhythmModes, type RhythmMode } from './rhythm-model';
import { grantOnce, type GameState } from './state';
import { rooms } from '../world/rooms';

export const q5Reward = balance.publication;
export const canOfferQ5 = (s: GameState) => !!s.q004.publishedAt && s.ledger.includes('quest.Q004.first') && !s.q005.accepted;
export const q5NormalDone = (s: GameState) => q5Normal.every(id => s.q005.notes.includes(id));
export const q5CompareDone = (s: GameState) => s.q005.notes.includes('af');
export const q5Ready = (s: GameState) => q5Evidence.every(id => s.q005.notes.includes(id));

export function acceptQ5(s: GameState): GameState {
  if (s.q005.accepted) return s;
  if (!canOfferQ5(s) || s.at.room !== 'newsroom') throw new Error('Q004 기사 발행 뒤 편집국에서 박동 신호 취재를 받아 주세요.');
  return { ...s, q005: { ...s.q005, accepted: true } };
}

function near(s: GameState, target: string, room: string): boolean {
  if (s.at.room !== room) return false;
  const t = rooms[s.at.room].targets.find(t => t.id === target);
  return !!t && Math.hypot(s.at.x - t.x, s.at.y - t.y) <= t.r + 2;
}

/** The signal observer stands in front of the sinoatrial node. Rendering reads the mode; it never moves the reporter. */
export function setQ5Mode(s: GameState, mode: RhythmMode): GameState {
  if (!rhythmModes.includes(mode)) throw new Error('선택할 수 없는 비교 상태예요.');
  if (mode !== 'normal') {
    if (!s.q005.accepted || !q5NormalDone(s) || !near(s, 'hx-sa', 'heart')) throw new Error('신호가 지나는 다섯 곳을 먼저 보고 우심방 동방결절 앞에서 비교해 주세요.');
    if (s.q003.mode !== 'normal') throw new Error('판막 비교 창을 닫은 뒤 신호를 비교해 주세요.');
  }
  return s.q005.mode === mode ? s : { ...s, q005: { ...s.q005, mode } };
}

export function recordQ5(s: GameState, id: Q5Evidence): GameState {
  if (!s.q005.accepted || !(q5Evidence as readonly string[]).includes(id)) throw new Error('먼저 박동 신호 취재를 받아 주세요.');
  const note = q5Text.notes.find(n => n.id === id);
  if (note) {
    if (!near(s, note.target, note.room)) throw new Error('신호가 지나는 해당 구조 가까이에서 관찰해 주세요.');
    if (s.q005.mode !== 'normal' || s.q003.mode !== 'normal') throw new Error('비교 창을 닫아 정상 모형으로 돌아온 뒤 관찰해 주세요.');
  } else if (id === 'af') {
    if (!q5NormalDone(s) || !near(s, 'hx-sa', 'heart') || s.q005.mode !== 'af') throw new Error('정상 신호 다섯 곳을 본 뒤 신호 관찰기의 심방세동 레이어에서 기록해 주세요.');
  } else {
    if (!near(s, 'my-desk', 'newsroom') || !q5CompareDone(s) || s.q005.mode !== 'normal') throw new Error('신호 비교 후 편집국 내 자리의 자료 취재로 이어가 주세요.');
    if ((id === 'tests' && !s.q005.notes.includes('causes')) || (id === 'care' && !s.q005.notes.includes('tests'))) throw new Error('원인 자료→검사 해석→관리 원리 순서로 취재해 주세요.');
  }
  return s.q005.notes.includes(id) ? s : { ...s, q005: { ...s.q005, notes: [...s.q005.notes, id] } };
}

export function q5ArticleAccess(s: GameState): string | null {
  if (!q5Ready(s)) return '정상 신호 관찰·심방세동 비교·자료실 취재를 모두 마치면 신호 기사를 쓸 수 있어요.';
  if (s.at.room !== 'newsroom') return '기사 쓰기와 신호 순서 도해는 편집국에서 할 수 있어요.';
  return null;
}

function writable(s: GameState): void {
  const why = q5ArticleAccess(s); if (why) throw new Error(why);
  if (s.q005.publishedAt || s.ledger.includes(q5Reward.key)) throw new Error('발행한 기사는 기록으로 읽어요.');
}

/** Places the next card on the arrival-order board. A card out of order is refused with a hint and no penalty. */
export function placeQ5(s: GameState, id: SignalCard): GameState {
  writable(s);
  if (!(q5Normal as readonly string[]).includes(id)) throw new Error('선택할 수 없는 신호 카드예요.');
  if (s.q005.order.includes(id)) return s;
  const next = signalOrder[s.q005.order.length];
  if (!next) return s;
  if (stageOf(id) !== stageOf(next)) throw new Error(q5Text.board.mismatch + (q5Text.board.hints as Record<string, string>)[String(stageOf(next))]!);
  return { ...s, q005: { ...s.q005, order: [...s.q005.order, id], checked: false } };
}

/** Clears the board to try again; the reporting notes stay. */
export function clearQ5Order(s: GameState): GameState {
  writable(s);
  return s.q005.order.length ? { ...s, q005: { ...s.q005, order: [], checked: false } } : s;
}

export function selectQ5(s: GameState, slot: 'lead' | 'limit', id: string | null): GameState {
  writable(s);
  if (!['lead', 'limit'].includes(slot) || (id !== null && !(slot === 'lead' ? q5Text.article.leads : q5Text.article.limitations).some(x => x.id === id))) throw new Error('선택할 수 없는 기사 문장이에요.');
  return s.q005[slot] === id ? s : { ...s, q005: { ...s.q005, [slot]: id, checked: false } };
}

export function checkQ5(s: GameState): GameState {
  writable(s);
  return s.q005.checked || s.q005.order.length !== signalOrder.length || !s.q005.lead || !s.q005.limit ? s : { ...s, q005: { ...s.q005, checked: true } };
}

export function publishQ5(s: GameState, now = new Date().toISOString()): GameState {
  if (s.q005.publishedAt || s.ledger.includes(q5Reward.key)) return s;
  writable(s);
  if (!s.q005.checked || s.q005.order.length !== signalOrder.length || !s.q005.lead || !s.q005.limit || !Number.isFinite(Date.parse(now))) throw new Error('신호 순서 도해와 모형의 한계를 편집장에게 확인받아 주세요.');
  return { ...grantOnce(s, q5Reward.key, q5Reward), q005: { ...s.q005, mode: 'normal', publishedAt: now } };
}

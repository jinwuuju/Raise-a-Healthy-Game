import balance from '../../data/balance/q007.v0.1.json';
import { passageModes, type PassageMode } from './passage-model';
import { chainOrder, q7Compare, q7Evidence, q7Materials, q7Normal, q7Text, type ChainCard, type PairCard, type Q7Evidence } from './q007-state';
import { grantOnce, type GameState } from './state';
import { rooms } from '../world/rooms';

/*
 * D108 Q007 ‘좁아진 모형 통로’ (basic course, design 19): normal coronary entrances again → the passage observer changes one
 * condition (entrance width) → three source-based materials → a single-variable comparison and a cause-and-effect chain
 * on the board → an easy explanatory/fact-check article. Wrong cards are refused with a hint, never saved, never penalised.
 */
export const q7Reward = balance.publication;
export const canOfferQ7 = (s: GameState) => !!s.q006.publishedAt && s.ledger.includes('quest.Q006.first') && !s.q007.accepted;
export const q7NormalDone = (s: GameState) => q7Normal.every(id => s.q007.notes.includes(id));
export const q7CompareDone = (s: GameState) => q7Compare.every(id => s.q007.notes.includes(id));
export const q7Ready = (s: GameState) => q7Evidence.every(id => s.q007.notes.includes(id));

export function acceptQ7(s: GameState): GameState {
  if (s.q007.accepted) return s;
  if (!canOfferQ7(s) || s.at.room !== 'newsroom') throw new Error('Q006 기사 발행 뒤 편집국에서 통로 비교 취재를 받아 주세요.');
  return { ...s, q007: { ...s.q007, accepted: true } };
}

function near(s: GameState, target: string, room: string): boolean {
  if (s.at.room !== room) return false;
  const t = rooms[s.at.room].targets.find(t => t.id === target);
  return !!t && Math.hypot(s.at.x - t.x, s.at.y - t.y) <= t.r + 2;
}

/** The passage observer stands in front of the aortic sinus. Rendering reads the mode; it never moves the reporter. */
export function setQ7Mode(s: GameState, mode: PassageMode): GameState {
  if (!passageModes.includes(mode)) throw new Error('선택할 수 없는 비교 상태예요.');
  if (mode !== 'wide' && (!s.q007.accepted || !q7NormalDone(s) || !near(s, 'hx-sinus', 'aorta'))) throw new Error('두 관상동맥 입구를 먼저 보고 대동맥굴 앞에서 비교해 주세요.');
  return s.q007.mode === mode ? s : { ...s, q007: { ...s.q007, mode } };
}

export function recordQ7(s: GameState, id: Q7Evidence): GameState {
  if (!s.q007.accepted || !(q7Evidence as readonly string[]).includes(id)) throw new Error('먼저 통로 비교 취재를 받아 주세요.');
  const note = q7Text.notes.find(n => n.id === id);
  if (note) {
    if (!near(s, note.target, note.room)) throw new Error('관상동맥 입구 가까이에서 관찰해 주세요.');
    if (s.q007.mode !== 'wide') throw new Error('비교 창을 닫아 넓은 통로로 돌아온 뒤 관찰해 주세요.');
  } else if (id === 'mild' || id === 'narrow') {
    if (!q7NormalDone(s) || !near(s, 'hx-sinus', 'aorta') || s.q007.mode !== id) throw new Error('두 입구를 본 뒤 통로 관찰기에서 그 폭을 골라 기록해 주세요.');
    if (id === 'narrow' && !s.q007.notes.includes('mild')) throw new Error('조건은 하나씩 · 조금 좁아짐부터 기록해 주세요.');
  } else {
    if (!near(s, 'my-desk', 'newsroom') || !q7CompareDone(s) || s.q007.mode !== 'wide') throw new Error('통로 비교 후 편집국 내 자리의 자료 취재로 이어가 주세요.');
    const i = q7Materials.indexOf(id as typeof q7Materials[number]);
    if (i > 0 && !s.q007.notes.includes(q7Materials[i - 1]!)) throw new Error('왜 쌓일까 → 무엇을 보면 알까 → 몸을 돕는 원리 순서로 취재해 주세요.');
  }
  return s.q007.notes.includes(id) ? s : { ...s, q007: { ...s.q007, notes: [...s.q007.notes, id] } };
}

export function q7ArticleAccess(s: GameState): string | null {
  if (!q7Ready(s)) return '정상 기준·통로 비교·자료 취재를 모두 마치면 통로 비교 기사를 쓸 수 있어요.';
  if (s.at.room !== 'newsroom') return '기사 쓰기와 통로 비교 도해는 편집국에서 할 수 있어요.';
  return null;
}
function writable(s: GameState): void {
  const why = q7ArticleAccess(s); if (why) throw new Error(why);
  if (s.q007.publishedAt || s.ledger.includes(q7Reward.key)) throw new Error('발행한 기사는 기록으로 읽어요.');
}

/** Picks the panel compared with the wide/rest baseline. A pair that changes two things at once is refused with a hint. */
export function pairQ7(s: GameState, id: PairCard): GameState {
  writable(s);
  const p = q7Text.board.pairs.find(x => x.id === id);
  if (!p) throw new Error('선택할 수 없는 비교 카드예요.');
  if (id !== q7Text.board.correctPair) throw new Error(p.hint ?? '하나만 바꾼 짝을 골라 주세요.');
  return s.q007.pair === id ? s : { ...s, q007: { ...s.q007, pair: id, checked: false } };
}

/** Places the next card of the cause-and-effect chain. The ‘road is cut’ decoy and out-of-order cards are refused with a hint. */
export function chainQ7(s: GameState, id: ChainCard | 'cut'): GameState {
  writable(s);
  if (id === 'cut') throw new Error(q7Text.board.mismatch + q7Text.board.decoy.hint);
  if (!chainOrder.includes(id)) throw new Error('선택할 수 없는 카드예요.');
  if (s.q007.chain.includes(id)) return s;
  const next = chainOrder[s.q007.chain.length];
  if (!next) return s;
  if (id !== next) throw new Error(q7Text.board.mismatch + (q7Text.board.hints as Record<string, string>)[next]!);
  return { ...s, q007: { ...s.q007, chain: [...s.q007.chain, id], checked: false } };
}

/** Clears the board to try again; the reporting notes stay. */
export function clearQ7Board(s: GameState): GameState {
  writable(s);
  return s.q007.pair || s.q007.chain.length ? { ...s, q007: { ...s.q007, pair: null, chain: [], checked: false } } : s;
}

export function selectQ7(s: GameState, slot: 'lead' | 'limit', id: string | null): GameState {
  writable(s);
  if (!['lead', 'limit'].includes(slot) || (id !== null && !(slot === 'lead' ? q7Text.article.leads : q7Text.article.limitations).some(x => x.id === id))) throw new Error('선택할 수 없는 기사 문장이에요.');
  return s.q007[slot] === id ? s : { ...s, q007: { ...s.q007, [slot]: id, checked: false } };
}

export const q7BoardDone = (s: GameState) => !!s.q007.pair && s.q007.chain.length === chainOrder.length;

export function checkQ7(s: GameState): GameState {
  writable(s);
  return s.q007.checked || !q7BoardDone(s) || !s.q007.lead || !s.q007.limit ? s : { ...s, q007: { ...s.q007, checked: true } };
}

export function publishQ7(s: GameState, now = new Date().toISOString()): GameState {
  if (s.q007.publishedAt || s.ledger.includes(q7Reward.key)) return s;
  writable(s);
  if (!s.q007.checked || !q7BoardDone(s) || !s.q007.lead || !s.q007.limit || !Number.isFinite(Date.parse(now))) throw new Error('통로 비교 도해와 모형의 한계를 편집장에게 확인받아 주세요.');
  return { ...grantOnce(s, q7Reward.key, q7Reward), q007: { ...s.q007, mode: 'wide', publishedAt: now } };
}

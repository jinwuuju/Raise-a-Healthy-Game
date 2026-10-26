import balance from '../../data/balance/q013.v0.1.json';
import { binOf, breathModes, flowCards, q13Evidence, q13Text, type BreathMode, type FlowBin, type FlowCard, type Q13Decoy, type Q13Evidence } from './q013-state';
import { grantOnce, type GameState } from './state';
import { rooms } from '../world/rooms';

/*
 * D117 Q013 ‘두 개의 흐름’ (design 20 section 3; basic course contract of design 19 section 3). The third respiratory
 * quest: walk the trachea and the bronchial tree and see four scenes (the rings holding the windpipe open while air
 * goes both ways, the cilia carpet carrying mucus always up, the ridge where the windpipe splits left and right, the
 * mucus gathering from the branches), then the flow observer in the middle of the trachea changes only the breath
 * (in, out, held): the air follows the breath, the mucus keeps going up. At the desk the reporter sorts each movement
 * into the air flow or the mucus flow, then an easy article with a lead, an analogy and its limitation. Wrong cards
 * are refused with a hint, never saved; no penalty. Publishing pays 680XP·420G once (design 02 E(12)).
 */
export const q13Reward = balance.publication;
export const canOfferQ13 = (s: GameState) => !!s.q012.publishedAt && !s.q013.accepted;
export const q13NotesDone = (s: GameState) => q13Evidence.every(id => s.q013.notes.includes(id));
export const q13CompareDone = (s: GameState) => breathModes.every(m => s.q013.compared.includes(m));
export const q13Ready = (s: GameState) => q13NotesDone(s) && q13CompareDone(s);
export const Q13_OBSERVER = { room: q13Text.observer.room as 'trachea', target: q13Text.observer.target };

export function acceptQ13(s: GameState): GameState {
  if (s.q013.accepted) return s;
  if (!canOfferQ13(s) || s.at.room !== 'newsroom') throw new Error('갈라지는 길 기사 발행 뒤 편집국에서 두 개의 흐름 취재를 받아 주세요.');
  return { ...s, q013: { ...s.q013, accepted: true } };
}

function near(s: GameState, target: string, room: string): boolean {
  if (s.at.room !== room) return false;
  const t = rooms[s.at.room].targets.find(t => t.id === target);
  return !!t && Math.hypot(s.at.x - t.x, s.at.y - t.y) <= t.r + 2;
}

export function recordQ13(s: GameState, id: Q13Evidence): GameState {
  const note = q13Text.notes.find(n => n.id === id);
  if (!s.q013.accepted || s.q013.publishedAt || !note) throw new Error('먼저 두 개의 흐름 취재를 받아 주세요.');
  if (!near(s, note.target, note.room)) throw new Error('기관과 기관지의 그 장면 가까이에서 살펴봐 주세요.');
  if (s.q013.notes.includes(id)) return s;
  // The scene is also the structure's exploration record (rx:), like Q011 and Q012.
  const key = 'rx:' + note.target, inspected = s.inspected.includes(key) ? s.inspected : [...s.inspected, key];
  return { ...s, inspected, q013: { ...s.q013, notes: [...s.q013.notes, id] } };
}

/** The observer records one breath; the windpipe stays the same (single variable). */
export function compareQ13(s: GameState, mode: BreathMode): GameState {
  if (!s.q013.accepted || s.q013.publishedAt) throw new Error('먼저 두 개의 흐름 취재를 받아 주세요.');
  if (!(breathModes as readonly string[]).includes(mode)) throw new Error('비교할 수 없는 장면이에요.');
  if (!q13NotesDone(s)) throw new Error('기관과 기관지의 네 장면을 먼저 보고 와 주세요.');
  if (!near(s, Q13_OBSERVER.target, Q13_OBSERVER.room)) throw new Error('관찰기는 기관 한가운데에 있어요.');
  if (s.q013.compared.includes(mode)) return s;
  // Standing at the observer also records that structure, so the replay after publication stays reachable.
  const key = 'rx:' + Q13_OBSERVER.target, inspected = s.inspected.includes(key) ? s.inspected : [...s.inspected, key];
  return { ...s, inspected, q013: { ...s.q013, compared: [...s.q013.compared, mode] } };
}

export function q13ArticleAccess(s: GameState): string | null {
  if (!q13NotesDone(s)) return '기관과 기관지의 네 장면을 먼저 보고 와 주세요.';
  if (!q13CompareDone(s)) return '기관 한가운데 두 흐름 관찰기에서 세 가지 숨을 모두 비교해 주세요.';
  if (s.at.room !== 'newsroom') return '기사 쓰기는 편집국 내 자리에서 할 수 있어요.';
  return null;
}

function writable(s: GameState): void {
  const why = q13ArticleAccess(s); if (why) throw new Error(why);
  if (s.q013.publishedAt || s.ledger.includes(q13Reward.key)) throw new Error('발행한 기사는 기록으로 읽어요.');
}

const noteName = (id: string) => q13Text.notes.find(n => n.id === id)!.name.replace('장면 · ', '');

/** Sorts one movement into a flow. The wrong flow points back to the scene that showed it (never saved). */
export function sortQ13(s: GameState, id: FlowCard | Q13Decoy, bin: FlowBin): GameState {
  writable(s);
  const b = q13Text.board;
  const decoy = b.decoys.find(d => d.id === id);
  if (decoy) throw new Error(decoy.hint);
  const card = b.cards.find(c => c.id === id);
  if (!card || !b.bins.some(x => x.id === bin)) throw new Error('선택할 수 없는 카드예요.');
  if (s.q013.sorted.includes(id as FlowCard)) throw new Error(b.placed);
  if (binOf(id as FlowCard) !== bin) throw new Error(b.wrong.replace('{scene}', noteName(card.scenes[0]!)) + ' (수첩 취재 파일 Q013)');
  return { ...s, q013: { ...s.q013, sorted: [...s.q013.sorted, id as FlowCard], checked: false } };
}

/** Clears the sorting to try again; the scenes and the observer records stay. */
export function clearQ13Board(s: GameState): GameState {
  writable(s);
  return s.q013.sorted.length ? { ...s, q013: { ...s.q013, sorted: [], checked: false } } : s;
}

export const q13BoardDone = (s: GameState) => flowCards.every(id => s.q013.sorted.includes(id));

export function selectQ13(s: GameState, slot: 'lead' | 'analogy' | 'limit', id: string | null): GameState {
  writable(s);
  const list: { id: string; hint?: string }[] | null = slot === 'lead' ? q13Text.article.leads : slot === 'analogy' ? q13Text.article.analogies : slot === 'limit' ? q13Text.article.limitations : null;
  const choice = id === null ? null : list?.find(x => x.id === id);
  if (!list || (id !== null && !choice)) throw new Error('선택할 수 없는 기사 문장이에요.');
  if (choice?.hint) throw new Error(choice.hint);
  return s.q013[slot] === id ? s : { ...s, q013: { ...s.q013, [slot]: id, checked: false } };
}

export function checkQ13(s: GameState): GameState {
  writable(s);
  return s.q013.checked || !q13BoardDone(s) || !s.q013.lead || !s.q013.analogy || !s.q013.limit ? s : { ...s, q013: { ...s.q013, checked: true } };
}

export function publishQ13(s: GameState, now = new Date().toISOString()): GameState {
  if (s.q013.publishedAt || s.ledger.includes(q13Reward.key)) return s;
  writable(s);
  if (!s.q013.checked || !q13BoardDone(s) || !s.q013.lead || !s.q013.analogy || !s.q013.limit || !Number.isFinite(Date.parse(now))) throw new Error('두 흐름 나누기와 첫 문장·비유·한계를 편집장에게 확인받아 주세요.');
  return { ...grantOnce(s, q13Reward.key, q13Reward), q013: { ...s.q013, publishedAt: now } };
}

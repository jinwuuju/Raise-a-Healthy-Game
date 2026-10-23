import balance from '../../data/balance/q012.v0.1.json';
import { q12Evidence, q12Text, stepOrder, throatModes, type Q12Decoy, type Q12Evidence, type SwallowStep, type ThroatMode } from './q012-state';
import { grantOnce, type GameState } from './state';
import { rooms } from '../world/rooms';

/*
 * D113 Q012 ‘갈라지는 길’ (design 20 section 3; basic course contract of design 19 section 3). The second respiratory
 * quest: walk the pharynx and the larynx and see four scenes (the uvula lifting, the fork into the air way and the food
 * way, the epiglottis covering the air way, the vocal-fold gap closing), then the fork observer in front of the
 * oesophagus changes only what passes the throat (air while breathing, a sip of water, a crumb that slips). At the desk
 * the reporter puts the steps of one swallow in order, then an easy article with a lead, an analogy and its limitation.
 * Wrong cards are refused with a hint, never saved; no penalty. Publishing pays 600XP·400G once (design 02 E(11)).
 */
export const q12Reward = balance.publication;
export const canOfferQ12 = (s: GameState) => !!s.q011.publishedAt && !s.q012.accepted;
export const q12NotesDone = (s: GameState) => q12Evidence.every(id => s.q012.notes.includes(id));
export const q12CompareDone = (s: GameState) => throatModes.every(m => s.q012.compared.includes(m));
export const q12Ready = (s: GameState) => q12NotesDone(s) && q12CompareDone(s);
export const Q12_OBSERVER = { room: q12Text.observer.room as 'pharynx', target: q12Text.observer.target };

export function acceptQ12(s: GameState): GameState {
  if (s.q012.accepted) return s;
  if (!canOfferQ12(s) || s.at.room !== 'newsroom') throw new Error('공기 항구 기사 발행 뒤 편집국에서 갈라지는 길 취재를 받아 주세요.');
  return { ...s, q012: { ...s.q012, accepted: true } };
}

function near(s: GameState, target: string, room: string): boolean {
  if (s.at.room !== room) return false;
  const t = rooms[s.at.room].targets.find(t => t.id === target);
  return !!t && Math.hypot(s.at.x - t.x, s.at.y - t.y) <= t.r + 2;
}

export function recordQ12(s: GameState, id: Q12Evidence): GameState {
  const note = q12Text.notes.find(n => n.id === id);
  if (!s.q012.accepted || s.q012.publishedAt || !note) throw new Error('먼저 갈라지는 길 취재를 받아 주세요.');
  if (!near(s, note.target, note.room)) throw new Error('목구멍과 공기 길 입구의 그 장면 가까이에서 살펴봐 주세요.');
  if (s.q012.notes.includes(id)) return s;
  // The scene is also the structure's exploration record (rx:), like Q011.
  const key = 'rx:' + note.target, inspected = s.inspected.includes(key) ? s.inspected : [...s.inspected, key];
  return { ...s, inspected, q012: { ...s.q012, notes: [...s.q012.notes, id] } };
}

/** The observer records one thing passing the throat; the throat stays the same (single variable). */
export function compareQ12(s: GameState, mode: ThroatMode): GameState {
  if (!s.q012.accepted || s.q012.publishedAt) throw new Error('먼저 갈라지는 길 취재를 받아 주세요.');
  if (!(throatModes as readonly string[]).includes(mode)) throw new Error('비교할 수 없는 장면이에요.');
  if (!q12NotesDone(s)) throw new Error('목구멍과 공기 길 입구의 네 장면을 먼저 보고 와 주세요.');
  if (!near(s, Q12_OBSERVER.target, Q12_OBSERVER.room)) throw new Error('관찰기는 목구멍 맨 아래 식도 입구 앞에 있어요.');
  if (s.q012.compared.includes(mode)) return s;
  // Standing at the observer also records the oesophagus opening (a detail-tier structure), so the replay stays reachable.
  const key = 'rx:' + Q12_OBSERVER.target, inspected = s.inspected.includes(key) ? s.inspected : [...s.inspected, key];
  return { ...s, inspected, q012: { ...s.q012, compared: [...s.q012.compared, mode] } };
}

export function q12ArticleAccess(s: GameState): string | null {
  if (!q12NotesDone(s)) return '목구멍과 공기 길 입구의 네 장면을 먼저 보고 와 주세요.';
  if (!q12CompareDone(s)) return '식도 입구 앞 갈림길 관찰기에서 세 가지를 모두 비교해 주세요.';
  if (s.at.room !== 'newsroom') return '기사 쓰기는 편집국 내 자리에서 할 수 있어요.';
  return null;
}

function writable(s: GameState): void {
  const why = q12ArticleAccess(s); if (why) throw new Error(why);
  if (s.q012.publishedAt || s.ledger.includes(q12Reward.key)) throw new Error('발행한 기사는 기록으로 읽어요.');
}

const noteName = (id: string) => q12Text.notes.find(n => n.id === id)!.name.replace('장면 · ', '');

/** Puts the next step of one swallow. A later step points back to a scene that shows the step before (never saved). */
export function placeQ12(s: GameState, id: SwallowStep | Q12Decoy): GameState {
  writable(s);
  const b = q12Text.board, i = s.q012.order.length;
  if (i >= stepOrder.length) throw new Error('삼킴 한 번의 네 가지 일을 모두 놓았어요.');
  const decoy = b.decoys.find(d => d.id === id);
  if (decoy) throw new Error(decoy.hint);
  const at = stepOrder.indexOf(id as SwallowStep);
  if (at < 0) throw new Error('선택할 수 없는 카드예요.');
  if (at < i) throw new Error(b.placed);
  if (at > i) throw new Error(b.wrong.replace('{scene}', noteName(b.steps[i]!.scenes[0]!)) + ' (수첩 취재 파일 Q012)');
  return { ...s, q012: { ...s.q012, order: [...s.q012.order, id as SwallowStep], checked: false } };
}

/** Clears the order to try again; the scenes and the observer records stay. */
export function clearQ12Board(s: GameState): GameState {
  writable(s);
  return s.q012.order.length ? { ...s, q012: { ...s.q012, order: [], checked: false } } : s;
}

export const q12BoardDone = (s: GameState) => s.q012.order.length === stepOrder.length;

export function selectQ12(s: GameState, slot: 'lead' | 'analogy' | 'limit', id: string | null): GameState {
  writable(s);
  const list: { id: string; hint?: string }[] | null = slot === 'lead' ? q12Text.article.leads : slot === 'analogy' ? q12Text.article.analogies : slot === 'limit' ? q12Text.article.limitations : null;
  const choice = id === null ? null : list?.find(x => x.id === id);
  if (!list || (id !== null && !choice)) throw new Error('선택할 수 없는 기사 문장이에요.');
  if (choice?.hint) throw new Error(choice.hint);
  return s.q012[slot] === id ? s : { ...s, q012: { ...s.q012, [slot]: id, checked: false } };
}

export function checkQ12(s: GameState): GameState {
  writable(s);
  return s.q012.checked || !q12BoardDone(s) || !s.q012.lead || !s.q012.analogy || !s.q012.limit ? s : { ...s, q012: { ...s.q012, checked: true } };
}

export function publishQ12(s: GameState, now = new Date().toISOString()): GameState {
  if (s.q012.publishedAt || s.ledger.includes(q12Reward.key)) return s;
  writable(s);
  if (!s.q012.checked || !q12BoardDone(s) || !s.q012.lead || !s.q012.analogy || !s.q012.limit || !Number.isFinite(Date.parse(now))) throw new Error('삼킴의 순서와 첫 문장·비유·한계를 편집장에게 확인받아 주세요.');
  return { ...grantOnce(s, q12Reward.key, q12Reward), q012: { ...s.q012, publishedAt: now } };
}

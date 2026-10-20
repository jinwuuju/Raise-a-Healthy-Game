import balance from '../../data/balance/q008.v0.1.json';
import { pressureModes, type PressureMode } from './pressure-model';
import { q8Compare, q8Evidence, q8Materials, q8Normal, q8Text, recordPicks, type Q8Evidence, type RecordCard, type VerdictCard } from './q008-state';
import { grantOnce, type GameState } from './state';
import { rooms } from '../world/rooms';

/*
 * D108 Q008 ‘하나의 숫자로 충분할까’ (basic course, design 19): the push of blood on the wall while the heart squeezes and
 * rests → the blood-pressure observer changes one thing at a time (just moved / high while resting) → three source-based
 * materials without threshold numbers → the record board (pick records taken under the same resting condition, then an
 * observation-not-diagnosis verdict) → an easy explanatory/fact-check article. Wrong cards are refused with a hint, never saved.
 */
export const q8Reward = balance.publication;
export const OBSERVER = { room: 'aorta', target: 'hx-ascending' } as const;
export const canOfferQ8 = (s: GameState) => !!s.q007.publishedAt && s.ledger.includes('quest.Q007.first') && !s.q008.accepted;
export const q8NormalDone = (s: GameState) => q8Normal.every(id => s.q008.notes.includes(id));
export const q8CompareDone = (s: GameState) => q8Compare.every(id => s.q008.notes.includes(id));
export const q8Ready = (s: GameState) => q8Evidence.every(id => s.q008.notes.includes(id));

export function acceptQ8(s: GameState): GameState {
  if (s.q008.accepted) return s;
  if (!canOfferQ8(s) || s.at.room !== 'newsroom') throw new Error('Q007 기사 발행 뒤 편집국에서 혈압 기록 취재를 받아 주세요.');
  return { ...s, q008: { ...s.q008, accepted: true } };
}

function near(s: GameState, target: string, room: string): boolean {
  if (s.at.room !== room) return false;
  const t = rooms[s.at.room].targets.find(t => t.id === target);
  return !!t && Math.hypot(s.at.x - t.x, s.at.y - t.y) <= t.r + 2;
}

/** The blood-pressure observer stands in front of the ascending aorta. Rendering reads the mode; it never moves the reporter. */
export function setQ8Mode(s: GameState, mode: PressureMode): GameState {
  if (!pressureModes.includes(mode)) throw new Error('선택할 수 없는 비교 상태예요.');
  if (mode !== 'rest' && (!s.q008.accepted || !q8NormalDone(s) || !near(s, OBSERVER.target, OBSERVER.room))) throw new Error('심장이 짤 때와 쉴 때를 먼저 보고 오름대동맥 앞에서 비교해 주세요.');
  return s.q008.mode === mode ? s : { ...s, q008: { ...s.q008, mode } };
}

export function recordQ8(s: GameState, id: Q8Evidence): GameState {
  if (!s.q008.accepted || !(q8Evidence as readonly string[]).includes(id)) throw new Error('먼저 혈압 기록 취재를 받아 주세요.');
  const note = q8Text.notes.find(n => n.id === id);
  if (note) {
    if (!near(s, note.target, note.room)) throw new Error('관찰 지점 가까이에서 살펴봐 주세요.');
    if (s.q008.mode !== 'rest') throw new Error('비교 창을 닫아 쉴 때로 돌아온 뒤 관찰해 주세요.');
  } else if (id === 'moved' || id === 'high') {
    if (!q8NormalDone(s) || !near(s, OBSERVER.target, OBSERVER.room) || s.q008.mode !== id) throw new Error('짤 때와 쉴 때를 본 뒤 혈압 관찰기에서 그 상태를 골라 기록해 주세요.');
    if (id === 'high' && !s.q008.notes.includes('moved')) throw new Error('하나씩 · 막 움직인 뒤부터 기록해 주세요.');
  } else {
    if (!near(s, 'my-desk', 'newsroom') || !q8CompareDone(s) || s.q008.mode !== 'rest') throw new Error('혈압 비교 후 편집국 내 자리의 자료 취재로 이어가 주세요.');
    const i = q8Materials.indexOf(id as typeof q8Materials[number]);
    if (i > 0 && !s.q008.notes.includes(q8Materials[i - 1]!)) throw new Error('왜 높아질까 → 무엇을 보면 알까 → 몸을 돕는 원리 순서로 취재해 주세요.');
  }
  return s.q008.notes.includes(id) ? s : { ...s, q008: { ...s.q008, notes: [...s.q008.notes, id] } };
}

export function q8ArticleAccess(s: GameState): string | null {
  if (!q8Ready(s)) return '정상 기준·혈압 비교·자료 취재를 모두 마치면 혈압 기록 기사를 쓸 수 있어요.';
  if (s.at.room !== 'newsroom') return '기사 쓰기와 혈압 기록 도해는 편집국에서 할 수 있어요.';
  return null;
}

function writable(s: GameState): void {
  const why = q8ArticleAccess(s); if (why) throw new Error(why);
  if (s.q008.publishedAt || s.ledger.includes(q8Reward.key)) throw new Error('발행한 기사는 기록으로 읽어요.');
}

/** Picks a record to compare. Records taken under a different or unknown condition are refused with a hint. */
export function pickQ8(s: GameState, id: RecordCard): GameState {
  writable(s);
  const r = q8Text.board.records.find(x => x.id === id);
  if (!r) throw new Error('선택할 수 없는 기록 카드예요.');
  if (!recordPicks.includes(id)) throw new Error(r.hint ?? '같은 조건에서 잰 기록끼리 골라 주세요.');
  return s.q008.picks.includes(id) ? s : { ...s, q008: { ...s.q008, picks: [...s.q008.picks, id], checked: false } };
}

/** The sentence for the article: an observation is not a diagnosis, and a high reading is not to be ignored either. */
export function verdictQ8(s: GameState, id: VerdictCard): GameState {
  writable(s);
  const v = q8Text.board.verdicts.find(x => x.id === id);
  if (!v) throw new Error('선택할 수 없는 판단 카드예요.');
  if (s.q008.picks.length < recordPicks.length) throw new Error(q8Text.board.needPicks);
  if (id !== q8Text.board.correctVerdict) throw new Error(v.hint ?? '관찰과 판단을 구분해 주세요.');
  return s.q008.verdict === id ? s : { ...s, q008: { ...s.q008, verdict: id, checked: false } };
}

/** Clears the board to try again; the reporting notes stay. */
export function clearQ8Board(s: GameState): GameState {
  writable(s);
  return s.q008.picks.length || s.q008.verdict ? { ...s, q008: { ...s.q008, picks: [], verdict: null, checked: false } } : s;
}

export function selectQ8(s: GameState, slot: 'lead' | 'limit', id: string | null): GameState {
  writable(s);
  if (!['lead', 'limit'].includes(slot) || (id !== null && !(slot === 'lead' ? q8Text.article.leads : q8Text.article.limitations).some(x => x.id === id))) throw new Error('선택할 수 없는 기사 문장이에요.');
  return s.q008[slot] === id ? s : { ...s, q008: { ...s.q008, [slot]: id, checked: false } };
}

export const q8BoardDone = (s: GameState) => s.q008.picks.length === recordPicks.length && !!s.q008.verdict;

export function checkQ8(s: GameState): GameState {
  writable(s);
  return s.q008.checked || !q8BoardDone(s) || !s.q008.lead || !s.q008.limit ? s : { ...s, q008: { ...s.q008, checked: true } };
}

export function publishQ8(s: GameState, now = new Date().toISOString()): GameState {
  if (s.q008.publishedAt || s.ledger.includes(q8Reward.key)) return s;
  writable(s);
  if (!s.q008.checked || !q8BoardDone(s) || !s.q008.lead || !s.q008.limit || !Number.isFinite(Date.parse(now))) throw new Error('혈압 기록 도해와 모형의 한계를 편집장에게 확인받아 주세요.');
  return { ...grantOnce(s, q8Reward.key, q8Reward), q008: { ...s.q008, mode: 'rest', publishedAt: now } };
}

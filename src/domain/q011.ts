import balance from '../../data/balance/q011.v0.1.json';
import { airModes, jobOrder, q11Evidence, q11Text, supportsOf, type AirMode, type DecoyCard, type Q11Evidence } from './q011-state';
import { heartGraduated } from './q010';
import { grantOnce, type GameState } from './state';
import { rooms } from '../world/rooms';

/*
 * D112 Q011 ‘공기 항구’ (design 20 section 3; basic course contract of design 19 section 3). The first respiratory quest:
 * walk the nose from the nostril to the back and see four scenes (hairs, shelves, the warm wet wall, the sticky mucus),
 * then the air-port observer at the back of the nose changes only the incoming air (cold dry air, dusty air, air with
 * small particles carrying virus). At the desk the reporter backs each job of the nose with one scene they saw, then an
 * easy article with a lead, an analogy and its limitation. Wrong cards are refused with a hint, never saved; no penalty.
 * Publishing pays 550XP·380G once (design 02 E(10); the release cap goes to 30 with this quest).
 */
export const q11Reward = balance.publication;
export const canOfferQ11 = (s: GameState) => heartGraduated(s) && !!s.q010.publishedAt && !s.q011.accepted;
export const q11NotesDone = (s: GameState) => q11Evidence.every(id => s.q011.notes.includes(id));
export const q11CompareDone = (s: GameState) => airModes.every(m => s.q011.compared.includes(m));
export const q11Ready = (s: GameState) => q11NotesDone(s) && q11CompareDone(s);
export const Q11_OBSERVER = { room: q11Text.observer.room as 'nose', target: q11Text.observer.target };

export function acceptQ11(s: GameState): GameState {
  if (s.q011.accepted) return s;
  if (!canOfferQ11(s) || s.at.room !== 'newsroom') throw new Error('심장 졸업 특집호 발행 뒤 편집국에서 공기 항구 취재를 받아 주세요.');
  return { ...s, q011: { ...s.q011, accepted: true } };
}

function near(s: GameState, target: string, room: string): boolean {
  if (s.at.room !== room) return false;
  const t = rooms[s.at.room].targets.find(t => t.id === target);
  return !!t && Math.hypot(s.at.x - t.x, s.at.y - t.y) <= t.r + 2;
}

export function recordQ11(s: GameState, id: Q11Evidence): GameState {
  const note = q11Text.notes.find(n => n.id === id);
  if (!s.q011.accepted || s.q011.publishedAt || !note) throw new Error('먼저 공기 항구 취재를 받아 주세요.');
  if (!near(s, note.target, note.room)) throw new Error('코안의 그 장면 가까이에서 살펴봐 주세요.');
  if (s.q011.notes.includes(id)) return s;
  // The scene is also the structure's exploration record (rx:), like the heart quests record hx: structures.
  const key = 'rx:' + note.target, inspected = s.inspected.includes(key) ? s.inspected : [...s.inspected, key];
  return { ...s, inspected, q011: { ...s.q011, notes: [...s.q011.notes, id] } };
}

/** The observer records one kind of incoming air; only the air changes, the nose stays the same (single variable). */
export function compareQ11(s: GameState, mode: AirMode): GameState {
  if (!s.q011.accepted || s.q011.publishedAt) throw new Error('먼저 공기 항구 취재를 받아 주세요.');
  if (!(airModes as readonly string[]).includes(mode)) throw new Error('비교할 수 없는 공기예요.');
  if (!q11NotesDone(s)) throw new Error('코안의 네 장면을 먼저 보고 와 주세요.');
  if (!near(s, Q11_OBSERVER.target, Q11_OBSERVER.room)) throw new Error('관찰기는 코안 맨 뒤 뒤콧구멍 앞에 있어요.');
  return s.q011.compared.includes(mode) ? s : { ...s, q011: { ...s.q011, compared: [...s.q011.compared, mode] } };
}

export function q11ArticleAccess(s: GameState): string | null {
  if (!q11NotesDone(s)) return '코안의 네 장면을 먼저 보고 와 주세요.';
  if (!q11CompareDone(s)) return '뒤콧구멍 앞 공기 항구 관찰기에서 세 가지 공기를 모두 비교해 주세요.';
  if (s.at.room !== 'newsroom') return '기사 쓰기는 편집국 내 자리에서 할 수 있어요.';
  return null;
}

function writable(s: GameState): void {
  const why = q11ArticleAccess(s); if (why) throw new Error(why);
  if (s.q011.publishedAt || s.ledger.includes(q11Reward.key)) throw new Error('발행한 기사는 기록으로 읽어요.');
}

const noteName = (id: string) => q11Text.notes.find(n => n.id === id)!.name.replace('장면 · ', '');

/** Backs the next job with a recorded scene. A scene that does not show the job points to one that does (never saved). */
export function pairQ11(s: GameState, id: Q11Evidence | DecoyCard): GameState {
  writable(s);
  const b = q11Text.board, i = s.q011.pairs.length;
  if (i >= jobOrder.length) throw new Error('세 가지 일에 모두 장면을 붙였어요.');
  const decoy = b.decoys.find(d => d.id === id);
  if (decoy) throw new Error(decoy.hint);
  if (!(q11Evidence as readonly string[]).includes(id) || !s.q011.notes.includes(id as Q11Evidence)) throw new Error('선택할 수 없는 장면 카드예요.');
  const job = b.jobs.find(j => j.id === jobOrder[i])!;
  if (!supportsOf(job.id as typeof jobOrder[number]).includes(id)) {
    const need = job.supports.find(x => x !== id)!;
    throw new Error(b.wrong.replace('{job}', job.name).replace('{need}', noteName(need)) + ' (수첩 취재 파일 Q011)');
  }
  return { ...s, q011: { ...s.q011, pairs: [...s.q011.pairs, id as Q11Evidence], checked: false } };
}

/** Clears the pairs to try again; the scenes and the observer records stay. */
export function clearQ11Board(s: GameState): GameState {
  writable(s);
  return s.q011.pairs.length ? { ...s, q011: { ...s.q011, pairs: [], checked: false } } : s;
}

export const q11BoardDone = (s: GameState) => s.q011.pairs.length === jobOrder.length;

export function selectQ11(s: GameState, slot: 'lead' | 'analogy' | 'limit', id: string | null): GameState {
  writable(s);
  const list: { id: string; hint?: string }[] | null = slot === 'lead' ? q11Text.article.leads : slot === 'analogy' ? q11Text.article.analogies : slot === 'limit' ? q11Text.article.limitations : null;
  const choice = id === null ? null : list?.find(x => x.id === id);
  if (!list || (id !== null && !choice)) throw new Error('선택할 수 없는 기사 문장이에요.');
  if (choice?.hint) throw new Error(choice.hint);
  return s.q011[slot] === id ? s : { ...s, q011: { ...s.q011, [slot]: id, checked: false } };
}

export function checkQ11(s: GameState): GameState {
  writable(s);
  return s.q011.checked || !q11BoardDone(s) || !s.q011.lead || !s.q011.analogy || !s.q011.limit ? s : { ...s, q011: { ...s.q011, checked: true } };
}

export function publishQ11(s: GameState, now = new Date().toISOString()): GameState {
  if (s.q011.publishedAt || s.ledger.includes(q11Reward.key)) return s;
  writable(s);
  if (!s.q011.checked || !q11BoardDone(s) || !s.q011.lead || !s.q011.analogy || !s.q011.limit || !Number.isFinite(Date.parse(now))) throw new Error('세 가지 일의 장면과 첫 문장·비유·한계를 편집장에게 확인받아 주세요.');
  return { ...grantOnce(s, q11Reward.key, q11Reward), q011: { ...s.q011, publishedAt: now } };
}

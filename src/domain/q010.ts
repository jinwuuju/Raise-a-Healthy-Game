import balance from '../../data/balance/q010.v0.1.json';
import { NEED, q10Claims, q10Text, supportsOf } from './q010-state';
import { starsOf, tiers } from './mastery';
import { grantOnce, type GameState } from './state';

/*
 * D108 Q010 ‘심장 졸업 특집호’ (design 19 section 6; design 03: several valid claim-evidence pairs, a draft is kept and the
 * missing evidence is pointed to). A special delivery run (any grade, usual run rewards), the core-structure check (only core
 * structures without any star, one question each on the spot, usual star rewards) and an easy special article built on the
 * reporter's own records. Publishing pays the existing 0XP·400G once; graduation is derived from that record (no new field).
 */

export const q10Reward = balance.publication;
export const coreIds = tiers.find(t => t.id === 'core')!.ids;
export const canOfferQ10 = (s: GameState) => !!s.q009.publishedAt && s.ledger.includes('quest.Q009.first') && !s.q010.accepted;
/** Core structures still without a star: each needs one field-check question on the spot. */
export const q10CoreLeft = (s: GameState): string[] => coreIds.filter(id => starsOf(s, id) === 0);
export const q10Ready = (s: GameState) => s.q010.accepted && s.q010.runDone && q10CoreLeft(s).length === 0;
/** Graduation and the first promotion are read from the completion record (design 19 section 5). */
export const heartGraduated = (s: GameState) => s.ledger.includes(q10Reward.key);
export const rankOf = (s: GameState) => (heartGraduated(s) ? '신입 기자' : '수습 기자');

export function acceptQ10(s: GameState): GameState {
  if (s.q010.accepted) return s;
  if (!canOfferQ10(s) || s.at.room !== 'newsroom') throw new Error('Q009 기사 발행 뒤 편집국에서 졸업 특집호를 받아 주세요.');
  return { ...s, q010: { ...s.q010, accepted: true } };
}

/** Called when a blood-delivery run is settled (any grade). Muscle runs do not count. */
export function runQ10(s: GameState, kind: 'blood' | 'muscle'): GameState {
  if (!s.q010.accepted || s.q010.runDone || kind !== 'blood' || s.q010.publishedAt) return s;
  return { ...s, q010: { ...s.q010, runDone: true } };
}

export function q10ArticleAccess(s: GameState): string | null {
  if (!s.q010.runDone) return '바디스코프로 들어가 바디와 특집 배달 런을 한 판 완주해 주세요.';
  const left = q10CoreLeft(s).length;
  if (left) return '별이 없는 핵심 구조 ' + left + '곳을 그 자리에서 확인해 주세요.';
  if (s.at.room !== 'newsroom') return '특집 기사는 편집국 내 자리에서 쓸 수 있어요.';
  return null;
}

function writable(s: GameState): void {
  const why = q10ArticleAccess(s); if (why) throw new Error(why);
  if (s.q010.publishedAt || s.ledger.includes(q10Reward.key)) throw new Error('발행한 기사는 기록으로 읽어요.');
}

/** Picks the answer sentence. The decoy is refused with a hint. Changing the sentence clears evidence that no longer fits. */
export function claimQ10(s: GameState, id: string): GameState {
  writable(s);
  const c = q10Claims.find(x => x.id === id);
  if (!c) throw new Error('선택할 수 없는 문장이에요.');
  if (c.hint) throw new Error(c.hint);
  if (s.q010.claim === id) return s;
  return { ...s, q010: { ...s.q010, claim: id, evidence: s.q010.evidence.filter(e => supportsOf(id).includes(e)), checked: false } };
}

/** Adds one of the reporter's records. A record that does not support the sentence points to a missing one and where it is. */
export function evidenceQ10(s: GameState, id: string): GameState {
  writable(s);
  const b = q10Text.board, e = b.evidence.find(x => x.id === id);
  if (!e) throw new Error('선택할 수 없는 기록이에요.');
  if (!s.q010.claim) throw new Error(b.needClaim);
  if (s.q010.evidence.includes(id)) return s;
  const fits = supportsOf(s.q010.claim);
  if (!fits.includes(id)) {
    const want = b.evidence.find(x => fits.includes(x.id) && !s.q010.evidence.includes(x.id))!;
    throw new Error(b.wrongEvidence.replace('{need}', want.card + ' (수첩 취재 파일 ' + want.quest + ')'));
  }
  if (s.q010.evidence.length >= NEED) throw new Error('기록은 두 장이면 충분해요. 바꾸려면 근거를 다시 골라 주세요.');
  return { ...s, q010: { ...s.q010, evidence: [...s.q010.evidence, id], checked: false } };
}

export function clearQ10Board(s: GameState): GameState {
  writable(s);
  return s.q010.claim || s.q010.evidence.length ? { ...s, q010: { ...s.q010, claim: null, evidence: [], checked: false } } : s;
}

export const q10BoardDone = (s: GameState) => !!s.q010.claim && s.q010.evidence.length === NEED;

export function selectQ10(s: GameState, slot: 'lead' | 'analogy' | 'limit', id: string | null): GameState {
  writable(s);
  const list: { id: string; hint?: string }[] | null = slot === 'lead' ? q10Text.article.leads : slot === 'analogy' ? q10Text.article.analogies : slot === 'limit' ? q10Text.article.limitations : null;
  const choice = id === null ? null : list?.find(x => x.id === id);
  if (!list || (id !== null && !choice)) throw new Error('선택할 수 없는 기사 문장이에요.');
  if (choice?.hint) throw new Error(choice.hint);
  return s.q010[slot] === id ? s : { ...s, q010: { ...s.q010, [slot]: id, checked: false } };
}

export function checkQ10(s: GameState): GameState {
  writable(s);
  return s.q010.checked || !q10BoardDone(s) || !s.q010.lead || !s.q010.analogy || !s.q010.limit ? s : { ...s, q010: { ...s.q010, checked: true } };
}

export function publishQ10(s: GameState, now = new Date().toISOString()): GameState {
  if (s.q010.publishedAt || s.ledger.includes(q10Reward.key)) return s;
  writable(s);
  if (!s.q010.checked || !q10BoardDone(s) || !s.q010.lead || !s.q010.analogy || !s.q010.limit || !Number.isFinite(Date.parse(now))) throw new Error('근거 두 장과 첫 문장·비유·한계를 편집장에게 확인받아 주세요.');
  return { ...grantOnce(s, q10Reward.key, q10Reward), q010: { ...s.q010, publishedAt: now } };
}

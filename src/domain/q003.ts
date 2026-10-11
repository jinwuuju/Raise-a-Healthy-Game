import balance from '../../data/balance/q003.v0.1.json';
import { q3Evidence, q3Text, type Q3Evidence } from './q003-state';
import { valveModes, type ValveMode } from './valve-model';
import { grantOnce, type GameState } from './state';
import { rooms } from '../world/rooms';
export const q3Reward = balance.publication;
export const canOfferQ3 = (s: GameState) => !!s.q002.publishedAt && s.ledger.includes('quest.Q002.first') && !s.q003.accepted;
export const q3NormalDone = (s: GameState) => s.q003.notes.includes('tricuspid') && s.q003.notes.includes('pulmonary');
export const q3CompareDone = (s: GameState) => s.q003.notes.includes('stenosis') && s.q003.notes.includes('regurgitation');
export const q3Ready = (s: GameState) => q3Evidence.every(id => s.q003.notes.includes(id));
export function acceptQ3(s: GameState): GameState {
  if (s.q003.accepted) return s;
  if (!canOfferQ3(s) || s.at.room !== 'newsroom') throw new Error('Q002 기사 발행 뒤 편집국에서 판막 취재를 받아 주세요.');
  return { ...s, q003: { ...s.q003, accepted: true } };
}
function near(s: GameState, target: string, room: string): boolean {
  const t = rooms[s.at.room].targets.find(t => t.id === target);
  return s.at.room === room && !!t && Math.hypot(s.at.x - t.x, s.at.y - t.y) <= t.r + 2;
}
export function setQ3Mode(s: GameState, mode: ValveMode): GameState {
  if (!valveModes.includes(mode)) throw new Error('선택할 수 없는 비교 상태예요.');
  if (mode !== 'normal' && (!s.q003.accepted || !q3NormalDone(s) || !near(s, 'hx-tricuspid', 'heart'))) throw new Error('정상 판막 두 곳을 먼저 보고 우심방 삼첨판 앞에서 비교해 주세요.');
  return s.q003.mode === mode ? s : { ...s, q003: { ...s.q003, mode } };
}
export function recordQ3(s: GameState, id: Q3Evidence): GameState {
  if (!s.q003.accepted || !q3Evidence.includes(id)) throw new Error('먼저 판막 취재를 받아 주세요.');
  const normal = q3Text.normal.find(n => n.id === id);
  if (normal) { if (!near(s, normal.target, normal.room) || s.q003.mode !== 'normal') throw new Error('정상 모형의 해당 판막 앞에서 관찰해 주세요.'); }
  else if (id === 'stenosis' || id === 'regurgitation') {
    if (!q3NormalDone(s) || !near(s, 'hx-tricuspid', 'heart') || s.q003.mode !== id) throw new Error('정상 판막 관찰 뒤 해당 비교 레이어에서 기록해 주세요.');
  } else {
    if (!near(s, 'my-desk', 'newsroom') || !q3CompareDone(s) || s.q003.mode !== 'normal') throw new Error('판막 비교 후 편집국 내 자리의 자료 취재로 이어가 주세요.');
    if ((id === 'tests' && !s.q003.notes.includes('causes')) || (id === 'care' && !s.q003.notes.includes('tests'))) throw new Error('원인 자료→검사 해석→관리 원리 순서로 취재해 주세요.');
  }
  return s.q003.notes.includes(id) ? s : { ...s, q003: { ...s.q003, notes: [...s.q003.notes, id] } };
}
export function q3ArticleAccess(s: GameState): string | null {
  if (!q3Ready(s)) return '정상·질환 비교와 자료실 취재를 모두 마치면 팩트체크 기사를 쓸 수 있어요.';
  if (s.at.room !== 'newsroom') return '기사 쓰기와 발행은 편집국에서 할 수 있어요.';
  return null;
}
function writable(s: GameState) {
  const why = q3ArticleAccess(s); if (why) throw new Error(why);
  if (s.q003.publishedAt || s.ledger.includes(q3Reward.key)) throw new Error('발행한 기사는 기록으로 읽어요.');
}
export function selectQ3(s: GameState, slot: 'lead' | 'limit', id: string | null): GameState {
  writable(s);
  if (!['lead', 'limit'].includes(slot) || (id !== null && !(slot === 'lead' ? q3Text.article.leads : q3Text.article.limitations).some(x => x.id === id))) throw new Error('선택할 수 없는 기사 문장이에요.');
  return s.q003[slot] === id ? s : { ...s, q003: { ...s.q003, [slot]: id, checked: false } };
}
export function checkQ3(s: GameState): GameState {
  writable(s);
  return !s.q003.lead || !s.q003.limit || s.q003.checked ? s : { ...s, q003: { ...s.q003, checked: true } };
}
export function publishQ3(s: GameState, now = new Date().toISOString()): GameState {
  if (s.q003.publishedAt || s.ledger.includes(q3Reward.key)) return s;
  writable(s);
  if (!s.q003.checked || !s.q003.lead || !s.q003.limit || !Number.isFinite(Date.parse(now))) throw new Error('취재 근거와 모형의 한계를 편집장에게 확인받아 주세요.');
  return { ...grantOnce(s, q3Reward.key, q3Reward), q003: { ...s.q003, mode: 'normal', publishedAt: now } };
}

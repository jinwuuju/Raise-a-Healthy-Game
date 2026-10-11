import { isHeartRoom, type RoomId } from '../world/types';
import { grantOnce, type GameState } from './state';
import balance from '../../data/balance/q001.v0.1.json';

/*
 * Q001 entry rules (P2-01 scope): accept -> enter the heart -> two observations -> return.
 * ‘Returning door’ = inferior vena cava opening in the right atrium; ‘sending door’ = pulmonary valve in the right ventricle.
 * Flags and inspected keys live in the existing schema-4 save, so no migration is needed.
 * The observation checkpoint pays 20 XP once (part of Q001's 100 XP total, see data/examples/quest.example.json).
 */
export const Q1 = { accepted: 'q001-accepted', entered: 'q001-entered', observed: 'q001-observed', briefed: 'q001-briefed' } as const;
export const Q1_OBSERVATIONS = ['heart-out', 'heart-in'] as const;
export type Q1Observation = (typeof Q1_OBSERVATIONS)[number];
export const Q1_ROOM: Record<Q1Observation, RoomId> = { 'heart-in': 'heart', 'heart-out': 'rv' };
export const Q1_OBSERVE_REWARD = balance.observation;

const has = (s: GameState, f: string) => s.flags.includes(f);
const addFlag = (s: GameState, f: string): GameState => (has(s, f) ? s : { ...s, flags: [...s.flags, f] });
export const obsKey = (id: string) => 'q001:' + id;

export function q1Seen(s: GameState): Q1Observation[] { return Q1_OBSERVATIONS.filter(id => s.inspected.includes(obsKey(id))); }
export function q1CanOffer(s: GameState): boolean { return has(s, 'reported-back') && !has(s, Q1.accepted); }

export function acceptQ1(s: GameState): GameState {
  if (!has(s, 'reported-back')) throw new Error('편집장에게 동네를 다녀왔다고 먼저 알려 주세요.');
  return addFlag(s, Q1.accepted);
}

/** Enter the model: only with the commission, only from the Bodyscope in the newsroom. */
export function canEnterHeart(s: GameState): string | null {
  if (!has(s, Q1.accepted)) return '편집장의 취재 의뢰가 있어야 바디스코프를 가동할 수 있어요.';
  if (s.at.room !== 'newsroom') return '바디스코프는 편집국에 있어요.';
  return null;
}

export function observeQ1(s: GameState, id: string): GameState {
  if (!has(s, Q1.accepted)) throw new Error('먼저 편집장에게 취재를 받아야 해요.');
  if (!(Q1_OBSERVATIONS as readonly string[]).includes(id)) throw new Error('관찰할 수 없는 대상이에요.');
  if (!isHeartRoom(s.at.room)) throw new Error('심장 속에서 관찰할 수 있어요.');
  if (s.at.room !== Q1_ROOM[id as Q1Observation]) throw new Error('그 구조는 지금 있는 곳에 없어요.');
  let next = s.inspected.includes(obsKey(id)) ? s : { ...s, inspected: [...s.inspected, obsKey(id)] };
  if (q1Seen(next).length === Q1_OBSERVATIONS.length && !has(next, Q1.observed)) {
    next = addFlag(grantOnce(next, Q1_OBSERVE_REWARD.key, Q1_OBSERVE_REWARD), Q1.observed);
  }
  return next;
}

export function briefQ1(s: GameState): GameState {
  if (!has(s, Q1.observed)) throw new Error('아직 관찰을 마치지 않았어요.');
  return addFlag(s, Q1.briefed);
}

/** Reporter level from total XP (Lv.2 at 100 XP; mirrors data/balance/levels.v0.2.json xpToNext for Lv.1-9; early access caps at Lv.10). */
export function levelOf(totalXp: number): { level: number; into: number; need: number } {
  const steps = [100, 150, 200, 250, 300, 350, 400, 450, 500];
  let level = 1, rest = totalXp;
  for (const need of steps) { if (rest < need) return { level, into: rest, need }; rest -= need; level++; }
  return { level, into: 0, need: 0 };
}

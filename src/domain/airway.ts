import content from '../../data/content/respiratory-interior.v0.1.json';
import mcontent from '../../data/content/respiratory-mastery.v0.1.json';
import { airwayRoomIds, type AirwayRoomId, type RoomId } from '../world/types';
import { starsOf, type Tier } from './mastery';
import { heartGraduated } from './q010';
import type { GameState } from './state';

/*
 * D111 airway exploration record (design 20 section 7 step 2; draft, not medically reviewed).
 * Records live in the schema-4 `inspected` list with the prefix rx: (no save migration); stars share the mastery record
 * with the heart but are counted per organ, so heart tiers and the heart graduation never change. No XP: stars give the
 * same small gold as the heart (design 18). The airway opens when the heart is graduated (design 19 section 5).
 */
export type AirDiscovery = { room: AirwayRoomId; name: string; text: string; src: string[] };
export const rxDiscoveries = content.discoveries as Record<string, AirDiscovery>;
export const rxIds = Object.keys(rxDiscoveries);
export const rxKey = (id: string): string => 'rx:' + id;
export const rxTiers = content.tiers as Tier[];
export const rxCore = rxTiers[0]!.ids;
export const RX_DISCLAIMER: string = content.disclaimer;
export const RX_MASTERY_DISCLAIMER: string = mcontent.disclaimer;
export const isRx = (id: string): boolean => !!rxDiscoveries[id];

export const rxDiscovered = (s: GameState): string[] => rxIds.filter(id => s.inspected.includes(rxKey(id)));
export function discoverRx(s: GameState, id: string): GameState {
  const d = rxDiscoveries[id];
  if (!d || !airwayRoomIds.includes(d.room)) throw new Error('기록할 수 없는 구조예요.');
  if (s.at.room !== d.room) throw new Error('그 구조는 지금 있는 곳에 없어요.');
  if (s.inspected.includes(rxKey(id))) return s;
  return { ...s, inspected: [...s.inspected, rxKey(id)] };
}
export function rxRoomProgress(s: GameState, room: RoomId): { found: number; total: number } {
  const ids = rxIds.filter(id => rxDiscoveries[id]!.room === room);
  return { found: ids.filter(id => s.inspected.includes(rxKey(id))).length, total: ids.length };
}

export const rxTierOf = (id: string): Tier => rxTiers.find(t => t.ids.includes(id)) ?? rxTiers[rxTiers.length - 1]!;
export const rxTotalStars = (s: GameState): number => rxIds.reduce((n, id) => n + starsOf(s, id), 0);
export const rxMaxStars = (): number => rxIds.length * 3;
export const rxTierOpen = (s: GameState, t: Tier): boolean => rxTotalStars(s) >= t.unlockStars;
/** Same core-first rule as the heart: deeper airway structures open with airway stars; recorded ones stay open. */
export const rxIsOpen = (s: GameState, id: string): boolean => rxTierOpen(s, rxTierOf(id)) || s.inspected.includes(rxKey(id));
export const rxNextLocked = (s: GameState): Tier | null => rxTiers.find(t => !rxTierOpen(s, t)) ?? null;
export function rxRoomStars(s: GameState, room: string): { stars: number; max: number; medal: boolean } {
  const ids = rxIds.filter(id => rxDiscoveries[id]!.room === room);
  const stars = ids.reduce((n, id) => n + starsOf(s, id), 0), max = ids.length * 3;
  return { stars, max, medal: max > 0 && stars === max };
}

/** The airway is the next organ after the heart graduation (derived from the Q010 record, no new save field). */
export const airwayOpen = (s: GameState): boolean => heartGraduated(s);
export function canEnterAirway(s: GameState): string | null {
  if (!airwayOpen(s)) return '심장 졸업 특집호(Q010)를 발행하면 호흡기로 들어갈 수 있어요.';
  if (s.at.room !== 'newsroom') return '바디스코프는 편집국에 있어요.';
  return null;
}

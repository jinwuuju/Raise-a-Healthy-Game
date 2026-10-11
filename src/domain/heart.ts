import content from '../../data/content/heart-interior.v0.1.json';
import { heartRoomIds, type RoomId } from '../world/types';
import type { GameState } from './state';

/*
 * Heart exploration record (draft content, see data/content/heart-interior.v0.1.json).
 * A structure is recorded once, only while standing in its room. Records live in the existing
 * schema-4 `inspected` list (prefix hx:), so no save migration is needed. Records give no XP or gold:
 * the Q001 reward plan (data/balance) stays unchanged.
 */
export type Discovery = { room: RoomId; name: string; text: string; src: string[] };
export const discoveries = content.discoveries as Record<string, Discovery>;
export const discoveryIds = Object.keys(discoveries);
export const hxKey = (id: string): string => 'hx:' + id;

export function discovered(s: GameState): string[] { return discoveryIds.filter(id => s.inspected.includes(hxKey(id))); }

export function discover(s: GameState, id: string): GameState {
  const d = discoveries[id];
  if (!d || !heartRoomIds.includes(d.room)) throw new Error('기록할 수 없는 구조예요.');
  if (s.at.room !== d.room) throw new Error('그 구조는 지금 있는 곳에 없어요.');
  if (s.inspected.includes(hxKey(id))) return s;
  return { ...s, inspected: [...s.inspected, hxKey(id)] };
}

export function roomProgress(s: GameState, room: RoomId): { found: number; total: number } {
  const ids = discoveryIds.filter(id => discoveries[id]!.room === room);
  return { found: ids.filter(id => s.inspected.includes(hxKey(id))).length, total: ids.length };
}

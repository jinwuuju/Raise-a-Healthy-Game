import { discoveries } from '../domain/heart';
import { Q1_OBSERVATIONS, obsKey } from '../domain/quest';
import { chamberIds } from '../domain/q002-state';
import type { GameState } from '../domain/state';
import type { RoomId } from '../world/types';

const places: Record<string, 'office' | 'neighborhood' | 'cafe' | 'shops'> = {
  'my-desk': 'office', device: 'office', shelf: 'office', notice: 'neighborhood', 'street-notice': 'neighborhood',
  station: 'neighborhood', 'jinu-store': 'neighborhood', 'alley-151': 'neighborhood', 'shoe-repair': 'neighborhood', 'park-bench': 'neighborhood', fountain: 'neighborhood', 'window-seat': 'cafe',
  'jinu-fridge': 'shops', 'jinu-shelf': 'shops', 'tailor-rack': 'shops', 'tailor-mannequin': 'shops',
};
/** Each persistent observation has exactly one home. Overviews and actions only link to that home. */
export function notebookRecords(s: GameState) {
  const evidence: string[] = [], q2Evidence: string[] = [], anatomy: Partial<Record<RoomId, string[]>> = {}, legacy: string[] = [];
  const local = { office: [] as string[], neighborhood: [] as string[], cafe: [] as string[], shops: [] as string[] };
  for (const key of s.inspected) {
    if (Q1_OBSERVATIONS.some(id => obsKey(id) === key)) evidence.push(key);
    else if (chamberIds.some(id => 'q002:' + id === key)) q2Evidence.push(key);
    else if (key.startsWith('hx:') && Object.hasOwn(discoveries, key.slice(3))) {
      const id = key.slice(3), room = discoveries[id]!.room; (anatomy[room] ??= []).push(key);
    } else if (Object.hasOwn(places, key)) local[places[key]!].push(key);
    else legacy.push(key);
  }
  return { evidence, q2Evidence, anatomy, local, legacy };
}

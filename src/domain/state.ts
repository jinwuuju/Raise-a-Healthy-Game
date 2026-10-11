import { defaultAppearance, outfits, presets, starterOutfits, validateAppearance, type Appearance, type OutfitId, type Preset } from './appearance';
import { canStand } from '../world/collision';
import { rooms } from '../world/rooms';
import { isHeartRoom, roomIds, type Dir, type RoomId } from '../world/types';

export type TimeMode = 'day' | 'dusk' | 'night' | 'auto';
export const timeModes: Record<TimeMode, string> = { day: '낮', dusk: '노을', night: '밤', auto: '실제 시간' };

export type GameState = {
  schemaVersion: 4; contentVersion: 'redesign-1'; balanceVersion: 'cafe-0.1';
  saveId: string; revision: number; createdAt: string; updatedAt: string; started: boolean;
  avatar: { preset: Preset; name: string; look: Appearance };
  owned: OutfitId[];
  at: { room: RoomId; x: number; y: number; facing: Dir };
  totalXp: number; gold: number; ledger: string[]; inspected: string[]; flags: string[];
  cafe: { welcomeUsed: boolean; orderCount: number; lastOrder: { itemId: string; price: number; orderedAt: string } | null; restedAt: string | null };
  settings: { time: TimeMode };
};

export function newState(): GameState {
  const now = new Date().toISOString();
  const spawn = rooms.newsroom.spawn;
  return {
    schemaVersion: 4, contentVersion: 'redesign-1', balanceVersion: 'cafe-0.1',
    saveId: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
    revision: 0, createdAt: now, updatedAt: now, started: false,
    avatar: { preset: 'male', name: '새 기자', look: defaultAppearance('male') }, owned: [...starterOutfits],
    at: { room: 'newsroom', x: spawn.x, y: spawn.y, facing: 'down' },
    totalXp: 0, gold: 0, ledger: [], inspected: [], flags: [],
    cafe: { welcomeUsed: false, orderCount: 0, lastOrder: null, restedAt: null },
    settings: { time: 'day' },
  };
}

const dirs: Dir[] = ['down', 'up', 'left', 'right'];
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
function strings(v: unknown, max = 2000): v is string[] {
  if (!Array.isArray(v) || v.length > max) return false;
  for (const x of v) if (typeof x !== 'string' || x.length > 100) return false;
  return new Set(v).size === v.length;
}
const date = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));

export function validateState(value: unknown): GameState {
  if (!value || typeof value !== 'object') throw new Error('저장 파일이 올바르지 않습니다.');
  const s = value as Record<string, unknown>;
  if (s.schemaVersion !== 4 || s.contentVersion !== 'redesign-1' || s.balanceVersion !== 'cafe-0.1') throw new Error('이 버전에서 읽을 수 없는 저장 파일입니다.');
  const a = s.avatar as Record<string, unknown> | undefined;
  const at = s.at as Record<string, unknown> | undefined;
  const cafe = s.cafe as Record<string, unknown> | undefined;
  const settings = s.settings as Record<string, unknown> | undefined;
  if (typeof s.saveId !== 'string' || !s.saveId || s.saveId.length > 100 || !integer(s.revision) || typeof s.started !== 'boolean' || !date(s.createdAt) || !date(s.updatedAt)) throw new Error('저장 기본 정보가 잘못되었습니다.');
  if (!a || !presets.includes(a.preset as Preset) || typeof a.name !== 'string' || !a.name.trim() || a.name.length > 12) throw new Error('기자 정보가 잘못되었습니다.');
  const preset = a.preset as Preset;
  const look = validateAppearance(a.look, preset, true);
  if (!strings(s.owned) || !s.owned.every(id => Object.hasOwn(outfits, id)) || !s.owned.includes(look.outfit)) throw new Error('옷장 기록이 잘못되었습니다.');
  if (!at || !roomIds.includes(at.room as RoomId) || typeof at.x !== 'number' || typeof at.y !== 'number' || !dirs.includes(at.facing as Dir)) throw new Error('저장된 위치가 올바르지 않습니다.');
  let place = { room: at.room as RoomId, x: at.x, y: at.y, facing: at.facing as Dir };
  if (!canStand(place.room, place)) {
    // The heart was rebuilt (D056): a position saved in the old heart model moves to that room's safe entry point.
    if (!isHeartRoom(place.room)) throw new Error('저장된 위치가 올바르지 않습니다.');
    const r = rooms[place.room];
    place = { room: place.room, x: r.spawn.x, y: r.spawn.y, facing: r.spawnFacing };
  }
  if (!integer(s.totalXp) || !integer(s.gold) || !strings(s.ledger, Infinity) || !strings(s.inspected) || !strings(s.flags)) throw new Error('진행 기록이 잘못되었습니다.');
  if (!cafe || typeof cafe.welcomeUsed !== 'boolean' || !integer(cafe.orderCount) || (cafe.restedAt !== null && !date(cafe.restedAt))) throw new Error('카페 기록이 잘못되었습니다.');
  const lo = cafe.lastOrder as Record<string, unknown> | null;
  if (lo !== null && (!lo || typeof lo.itemId !== 'string' || !integer(lo.price) || !date(lo.orderedAt))) throw new Error('카페 주문 기록이 잘못되었습니다.');
  const time = settings && typeof settings.time === 'string' && ['day', 'dusk', 'night', 'auto'].includes(settings.time) ? settings.time as TimeMode : 'day';
  return {
    schemaVersion: 4, contentVersion: 'redesign-1', balanceVersion: 'cafe-0.1', saveId: s.saveId, revision: s.revision,
    createdAt: s.createdAt, updatedAt: s.updatedAt, started: s.started,
    avatar: { preset, name: a.name.trim(), look }, owned: [...s.owned] as OutfitId[],
    at: place,
    totalXp: s.totalXp, gold: s.gold, ledger: [...s.ledger], inspected: [...s.inspected], flags: [...s.flags],
    cafe: { welcomeUsed: cafe.welcomeUsed, orderCount: cafe.orderCount, restedAt: (cafe.restedAt as string | null), lastOrder: lo ? { itemId: lo.itemId as string, price: lo.price as number, orderedAt: lo.orderedAt as string } : null },
    settings: { time },
  };
}

/** Reward contract for later quests: a key can be granted only once. */
export function grantOnce(state: GameState, key: string, reward: { xp: number; gold: number }): GameState {
  if (!key || key.length > 100 || ![reward.xp, reward.gold].every(n => Number.isSafeInteger(n) && n >= 0)) throw new Error('잘못된 보상입니다.');
  if (state.ledger.includes(key)) return state;
  if (!integer(state.totalXp + reward.xp) || !integer(state.gold + reward.gold)) throw new Error('보상 합계가 저장 가능한 범위를 넘었어요.');
  return { ...state, totalXp: state.totalXp + reward.xp, gold: state.gold + reward.gold, ledger: [...state.ledger, key] };
}

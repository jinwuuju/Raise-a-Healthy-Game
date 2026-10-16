import { wasD092Position } from '../world/legacy-euro';
import { wasLegacyLobbyPosition } from '../world/legacy-lobby';
import { defaultAppearance, outfits, presets, starterOutfits, validateAppearance, type Appearance, type OutfitId, type Preset } from './appearance';
import { emptyArticle, validateArticle, type Q1Article } from './article-state';
import { emptyReactions, latestReaction, validateReactions, type Reactions } from './reaction-state';
import { emptyQ2, validateQ2, chamberIds, type Q2State } from './q002-state';
import { emptyQ3, validateQ3, type Q3State } from './q003-state';
import { emptyQ4, validateQ4, type Q4State } from './q004-state';
import { emptyQ5, validateQ5, type Q5State } from './q005-state';
import { emptyQ6, validateQ6, type Q6State } from './q006-state';
import { emptyLunch, validateLunch, type LunchState } from './lunch';
import { emptyShop, validateShop, type ShopState } from './shop';
import { canStand, canStandIn, footRect } from '../world/collision';
import { rooms, roomsD093, roomsD094 } from '../world/rooms';
import { isHeartRoom, overlap, roomIds, type Dir, type RoomId } from '../world/types';

export type GameState = {
  schemaVersion: 4; contentVersion: 'redesign-1'; balanceVersion: 'cafe-0.1';
  saveId: string; revision: number; createdAt: string; updatedAt: string; started: boolean;
  avatar: { preset: Preset; name: string; look: Appearance };
  owned: OutfitId[];
  at: { room: RoomId; x: number; y: number; facing: Dir };
  totalXp: number; gold: number; ledger: string[]; inspected: string[]; flags: string[];
  article: Q1Article;
  q002: Q2State;
  q003: Q3State;
  q004: Q4State;
  q005: Q5State;
  q006: Q6State;
  reactions: Reactions;
  cafe: { welcomeUsed: boolean; orderCount: number; lastOrder: { itemId: string; price: number; orderedAt: string } | null; restedAt: string | null };
  /** 오늘의 점심(D085). schema4 옛 저장에는 없으며 빈 기록으로 읽는다. */
  lunch: LunchState;
  /** 진U 가방·오비트 테일러 구매 기록(D103). 옛 저장에는 없으며 빈 기록으로 읽는다. */
  shop: ShopState;
  // No `settings`: the in-game time-of-day setting was removed (D068, lunch step 5). The game follows the device clock in Asia/Seoul (domain/clock).
};

export function newState(): GameState {
  const now = new Date().toISOString();
  const spawn = rooms.newsroom.spawn;
  return {
    schemaVersion: 4, contentVersion: 'redesign-1', balanceVersion: 'cafe-0.1',
    saveId: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
    revision: 0, createdAt: now, updatedAt: now, started: false,
    avatar: { preset: 'male', name: '새 기자', look: defaultAppearance('male') }, owned: [...starterOutfits],
    at: { room: 'newsroom', x: spawn.x, y: spawn.y, facing: rooms.newsroom.spawnFacing },
    totalXp: 0, gold: 0, ledger: [], inspected: [], flags: [],
    article: emptyArticle(),
    q002: emptyQ2(),
    q003: emptyQ3(),
    q004: emptyQ4(),
    q005: emptyQ5(),
    q006: emptyQ6(),
    reactions: emptyReactions(),
    cafe: { welcomeUsed: false, orderCount: 0, lastOrder: null, restedAt: null },
    lunch: emptyLunch(),
    shop: emptyShop(),
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
  if (typeof s.saveId !== 'string' || !s.saveId || s.saveId.length > 100 || !integer(s.revision) || typeof s.started !== 'boolean' || !date(s.createdAt) || !date(s.updatedAt)) throw new Error('저장 기본 정보가 잘못되었습니다.');
  if (!a || !presets.includes(a.preset as Preset) || typeof a.name !== 'string' || !a.name.trim() || a.name.length > 12) throw new Error('기자 정보가 잘못되었습니다.');
  const preset = a.preset as Preset;
  const look = validateAppearance(a.look, preset, true);
  if (!strings(s.owned) || !s.owned.every(id => Object.hasOwn(outfits, id)) || !s.owned.includes(look.outfit)) throw new Error('옷장 기록이 잘못되었습니다.');
  if (!at || !roomIds.includes(at.room as RoomId) || typeof at.x !== 'number' || typeof at.y !== 'number' || !dirs.includes(at.facing as Dir)) throw new Error('저장된 위치가 올바르지 않습니다.');
  let place = { room: at.room as RoomId, x: at.x, y: at.y, facing: at.facing as Dir };
  // D096: the compressed street became the real-scale district; any former street position reopens at Euro Plaza's door.
  if (place.room === 'street') {
    const builtOver = rooms.street.buildings.some(b => overlap(footRect(place), { x: b.x, y: b.y - b.h, w: b.w, h: b.d + b.h }));
    if (!canStand('street', place) && !builtOver) throw new Error('저장된 위치가 올바르지 않습니다.');
    place = { room: 'district', ...rooms.district.spawn, facing: rooms.district.spawnFacing };
  }
  // D093: the old separate outer office is now an open area in the corridor map.
  if (place.room === 'outeroffice') {
    if (!wasD092Position(place.room, place)) throw new Error('저장된 위치가 올바르지 않습니다.');
    place = { room: 'floor4', ...rooms.floor4.spawn, facing: rooms.floor4.spawnFacing };
  }
  if (!canStand(place.room, place)) {
    // D092 kept its lounge inside the corridor map; those saves go to the separate lounge (D093).
    if (place.room === 'floor4' && place.x < 240 && place.y >= 240 && place.y < 368 && wasD092Position('floor4', place)) {
      place = { room: 'lounge', ...rooms.lounge.spawn, facing: rooms.lounge.spawnFacing };
    }
  }
  if (!canStand(place.room, place)) {
    // The heart was rebuilt (D056), the street across from Euro Plaza was built up (D088) and Euro Plaza's interior was
    // rebuilt (D092~D095): a position that was valid where there is now a wall moves to that room's safe entry point.
    // Roads and other impossible spots stay invalid.
    const builtOver = place.room === 'street' && rooms.street.buildings.some(b => overlap(footRect(place), { x: b.x, y: b.y - b.h, w: b.w, h: b.d + b.h }));
    const rebuiltLobby = place.room === 'lobby' && wasLegacyLobbyPosition(place);
    const d093 = place.room in roomsD093 && canStandIn(roomsD093[place.room as keyof typeof roomsD093], place);
    const d094 = place.room in roomsD094 && canStandIn(roomsD094[place.room as keyof typeof roomsD094], place);
    if (!isHeartRoom(place.room) && !builtOver && !rebuiltLobby && !d093 && !d094 && !wasD092Position(place.room, place)) throw new Error('저장된 위치가 올바르지 않습니다.');
    const r = rooms[place.room];
    place = { room: place.room, x: r.spawn.x, y: r.spawn.y, facing: r.spawnFacing };
  }
  if (!integer(s.totalXp) || !integer(s.gold) || !strings(s.ledger, Infinity) || !strings(s.inspected) || !strings(s.flags)) throw new Error('진행 기록이 잘못되었습니다.');
  const article = validateArticle(s.article);
  for (const id of [article.returning, article.outgoing]) if (id && !s.inspected.includes('q001:' + id)) throw new Error('기사의 관찰 기록이 없습니다.');
  if (article.extra && !s.inspected.includes('hx:' + article.extra)) throw new Error('기사의 탐험 기록이 없습니다.');
  if (article.publishedAt && !s.ledger.includes('quest.Q001.first')) throw new Error('기사 발행 보상 기록이 없습니다.');
  const q002 = validateQ2(s.q002);
  const inspected = s.inspected;
  const q2Notes = chamberIds.filter(id => inspected.includes('q002:' + id));
  if ((q002.accepted && (!article.publishedAt || !s.ledger.includes('quest.Q001.first'))) ||
      (!q002.accepted && q2Notes.length) || (q002.reported && q2Notes.length !== 4) ||
      chamberIds.some(id => q002.cards[id] && !inspected.includes('q002:' + q002.cards[id])) ||
      (!!q002.publishedAt !== s.ledger.includes('quest.Q002.first'))) throw new Error('Q002 취재 근거와 발행 기록이 맞지 않습니다.');
  const reactions = validateReactions(s.reactions), lastReaction = latestReaction({ reactions });
  const q003 = validateQ3(s.q003);
  if ((q003.accepted && !q002.publishedAt) || (q003.mode !== 'normal' && place.room !== 'heart') || (!!q003.publishedAt !== s.ledger.includes('quest.Q003.first'))) throw new Error('Q003 의뢰와 기사 발행 기록이 맞지 않습니다.');
  const q004 = validateQ4(s.q004);
  if ((q004.accepted && !q003.publishedAt) || (!!q004.publishedAt !== s.ledger.includes('quest.Q004.first'))) throw new Error('Q004 의뢰와 기사 발행 기록이 맞지 않습니다.');
  const q005 = validateQ5(s.q005);
  if ((q005.accepted && !q004.publishedAt) || (q005.mode !== 'normal' && place.room !== 'heart') || (!!q005.publishedAt !== s.ledger.includes('quest.Q005.first'))) throw new Error('Q005 의뢰와 기사 발행 기록이 맞지 않습니다.');
  const q006 = validateQ6(s.q006);
  if ((q006.accepted && !q005.publishedAt) || (q006.mode !== 'rest' && place.room !== 'aorta') || (!!q006.publishedAt !== s.ledger.includes('quest.Q006.first'))) throw new Error('Q006 의뢰와 기사 발행 기록이 맞지 않습니다.');
  if (reactions.count && (!article.publishedAt || !s.ledger.includes('quest.Q001.first') || (lastReaction && lastReaction.xpAfter > s.totalXp))) throw new Error('발행과 독자 반응 기록이 맞지 않습니다.');
  if (reactions.results.some(r => r.questId === 'Q002' && !q002.publishedAt)) throw new Error('Q002 독자 반응의 발행 기사가 없습니다.');
  if (reactions.results.some(r => r.questId === 'Q003' && !q003.publishedAt)) throw new Error('Q003 독자 반응의 발행 기사가 없습니다.');
  if (reactions.results.some(r => r.questId === 'Q004' && !q004.publishedAt)) throw new Error('Q004 독자 반응의 발행 기사가 없습니다.');
  if (reactions.results.some(r => r.questId === 'Q005' && !q005.publishedAt)) throw new Error('Q005 독자 반응의 발행 기사가 없습니다.');
  if (reactions.results.some(r => r.questId === 'Q006' && !q006.publishedAt)) throw new Error('Q006 독자 반응의 발행 기사가 없습니다.');
  if (!cafe || typeof cafe.welcomeUsed !== 'boolean' || !integer(cafe.orderCount) || (cafe.restedAt !== null && !date(cafe.restedAt))) throw new Error('카페 기록이 잘못되었습니다.');
  const lo = cafe.lastOrder as Record<string, unknown> | null;
  if (lo !== null && (!lo || typeof lo.itemId !== 'string' || !integer(lo.price) || !date(lo.orderedAt))) throw new Error('카페 주문 기록이 잘못되었습니다.');
  // Older schema4 saves carry `settings.time` (낮/노을/밤/실제 시간). It is read and ignored, whatever its value, and is not written back.
  return {
    schemaVersion: 4, contentVersion: 'redesign-1', balanceVersion: 'cafe-0.1', saveId: s.saveId, revision: s.revision,
    createdAt: s.createdAt, updatedAt: s.updatedAt, started: s.started,
    avatar: { preset, name: a.name.trim(), look }, owned: [...s.owned] as OutfitId[],
    at: place,
    totalXp: s.totalXp, gold: s.gold, ledger: [...s.ledger], inspected: [...s.inspected], flags: [...s.flags],
    article,
    q002,
    q003,
    q004,
    q005,
    q006,
    reactions,
    cafe: { welcomeUsed: cafe.welcomeUsed, orderCount: cafe.orderCount, restedAt: (cafe.restedAt as string | null), lastOrder: lo ? { itemId: lo.itemId as string, price: lo.price as number, orderedAt: lo.orderedAt as string } : null },
    lunch: validateLunch(s.lunch),
    shop: validateShop(s.shop),
  };
}

/** Reward contract for later quests: a key can be granted only once. */
export function grantOnce(state: GameState, key: string, reward: { xp: number; gold: number }): GameState {
  if (!key || key.length > 100 || ![reward.xp, reward.gold].every(n => Number.isSafeInteger(n) && n >= 0)) throw new Error('잘못된 보상입니다.');
  if (state.ledger.includes(key)) return state;
  if (!integer(state.totalXp + reward.xp) || !integer(state.gold + reward.gold)) throw new Error('보상 합계가 저장 가능한 범위를 넘었어요.');
  return { ...state, totalXp: state.totalXp + reward.xp, gold: state.gold + reward.gold, ledger: [...state.ledger, key] };
}

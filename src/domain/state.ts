import { defaultAppearance,validateAppearance,starterOutfits,outfits,type Appearance } from './appearance';
import { canStand, type Point, type RoomId } from './world';
export const presets = ['male', 'female', 'alien'] as const;
export type Preset = typeof presets[number];
export type GameState = {
  schemaVersion: 3; contentVersion: 'foundation-3'; balanceVersion: 'cafe-0.1';
  saveId: string; revision: number; createdAt: string; updatedAt: string;
  avatar: { preset: Preset; name: string; appearance:Appearance }; ownedCosmeticIds:string[]; started: boolean;
  safeLocation: Point & { room: RoomId };
  totalXp: number; gold: number; completionLedger: string[];
  inspected: string[];
  cafe: { welcomeUsed: boolean; orderCount: number; lastOrder: { itemId: string; price: number; orderedAt: string } | null; restedAt: string | null };
};
export function newState(): GameState {
  const now = new Date().toISOString();
  return { schemaVersion: 3, contentVersion: 'foundation-3', balanceVersion: 'cafe-0.1', saveId: crypto.randomUUID(), revision: 0,
    createdAt: now, updatedAt: now, avatar: { preset: 'male', name: '새 기자',appearance:defaultAppearance('male') },ownedCosmeticIds:[...starterOutfits], started: false,
    safeLocation: { room: 'newsroom', x: 320, y: 270 }, totalXp: 0, gold: 0, completionLedger: [], inspected: [], cafe: { welcomeUsed: false, orderCount: 0, lastOrder: null, restedAt: null } };
}
export function validateState(value: unknown): GameState {
  if (!value || typeof value !== 'object') throw new Error('저장 파일이 올바르지 않습니다.');
  let s = value as Record<string, unknown>;
  if (s.schemaVersion === 1 && s.contentVersion === 'foundation-1' && s.balanceVersion === 'none') {
    s = { ...s, schemaVersion: 2, contentVersion: 'foundation-2', balanceVersion: 'cafe-0.1', cafe: { welcomeUsed: false, orderCount: 0, lastOrder: null, restedAt: null } };
  }
  if(s.schemaVersion===2 && s.contentVersion==='foundation-2' && s.balanceVersion==='cafe-0.1'){
    const old=s.avatar as {preset:Preset;name:string};
    s={...s,schemaVersion:3,contentVersion:'foundation-3',avatar:old?{...old,appearance:defaultAppearance(old.preset)}:old,ownedCosmeticIds:[...starterOutfits]};
  }
  const p = s.safeLocation as GameState['safeLocation'] | undefined;
  const a = s.avatar as GameState['avatar'] | undefined;
  const integer = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
  const strings = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 1000 && v.every(x => typeof x === 'string' && x.length <= 100) && new Set(v).size === v.length;
  if (s.schemaVersion !== 3 || s.contentVersion !== 'foundation-3' || s.balanceVersion !== 'cafe-0.1') throw new Error('지원하지 않는 저장 버전입니다. 원본을 보존해 주세요.');
  if (typeof s.saveId !== 'string' || s.saveId.length < 1 || s.saveId.length > 100 || !integer(s.revision) || typeof s.started !== 'boolean' ||
      !a || !presets.includes(a.preset) || typeof a.name !== 'string' || !a.name.trim() || a.name.length > 20 ||
      !p || !['newsroom', 'lobby', 'street', 'cafe'].includes(p.room) || !canStand(p.room, p) ||
      !integer(s.totalXp) || !integer(s.gold) || !strings(s.completionLedger) || !strings(s.inspected) ||
      typeof s.createdAt !== 'string' || !Number.isFinite(Date.parse(s.createdAt)) || typeof s.updatedAt !== 'string' || !Number.isFinite(Date.parse(s.updatedAt))) throw new Error('저장 데이터 형식 또는 위치가 잘못되었습니다.');
  const appearance=validateAppearance(a.appearance,a.preset);
  if(!strings(s.ownedCosmeticIds) || !s.ownedCosmeticIds.every(id=>Object.hasOwn(outfits,id)) || !s.ownedCosmeticIds.includes(appearance.outfitId))throw new Error('옷장/착용 기록이 올바르지 않습니다.');
  const cafe = s.cafe as GameState['cafe'] | undefined;
  const validDate = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
  if (!cafe || typeof cafe.welcomeUsed !== 'boolean' || !integer(cafe.orderCount) ||
      (cafe.restedAt !== null && !validDate(cafe.restedAt)) ||
      (cafe.lastOrder !== null && (!cafe.lastOrder || !['welcome', 'water', 'americano', 'latte', 'tea'].includes(cafe.lastOrder.itemId) || !integer(cafe.lastOrder.price) || !validDate(cafe.lastOrder.orderedAt)))) throw new Error('카페 저장 기록이 잘못되었습니다.');
  // Project into known fields. Unknown imported fields cannot become executable state.
  return { schemaVersion: 3, contentVersion: 'foundation-3', balanceVersion: 'cafe-0.1', saveId: s.saveId, revision: s.revision as number,
    createdAt: s.createdAt, updatedAt: s.updatedAt, started: s.started, avatar: { preset: a.preset, name: a.name,appearance },ownedCosmeticIds:[...s.ownedCosmeticIds as string[]],
    safeLocation: { room: p.room, x: p.x, y: p.y }, totalXp: s.totalXp as number, gold: s.gold as number,
    completionLedger: [...s.completionLedger as string[]], inspected: [...s.inspected as string[]], cafe: structuredClone(cafe) };
}
// Reward contract for later quests. P1 exposes no reward command or medical quest.
export function grantOnce(state: GameState, key: string, reward: { xp: number; gold: number }): GameState {
  if (!key || key.length > 100 || ![reward.xp, reward.gold].every(n => Number.isSafeInteger(n) && n >= 0)) throw new Error('잘못된 보상');
  if (state.completionLedger.includes(key)) return state;
  const xp = state.totalXp + reward.xp, gold = state.gold + reward.gold;
  if (!Number.isSafeInteger(xp) || !Number.isSafeInteger(gold)) throw new Error('보상 범위 초과');
  return { ...state, totalXp: xp, gold, completionLedger: [...state.completionLedger, key] };
}

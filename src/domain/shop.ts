import rules from '../../data/balance/shops.v0.1.json';
import { outfits, type OutfitId } from './appearance';
import type { GameState } from './state';

/*
 * D103 shops: the fictional Jin-U convenience store and the fictional Orbit Tailor clothes shop (design 11, section 4).
 * Prices are game hypotheses (data/balance/shops.v0.1.json). Items only fill the bag record and clothes only change the
 * look: no XP, no reporting ability, no article score. Every purchase is one atomic state change with a ledger key.
 */
export type ShopItem = { id: string; title: string; price: number; line: string };
export type TailorItem = { id: OutfitId; price: number; line: string };
export type ShopState = {
  /** Things bought at Jin-U, by item id (1..bagMax each). */
  bag: Record<string, number>;
  jinuCount: number; tailorCount: number;
  last: { shop: 'jinu' | 'tailor'; itemId: string; price: number; boughtAt: string } | null;
};

export const jinuItems: ShopItem[] = rules.jinu.items;
export const BAG_MAX: number = rules.jinu.bagMax;
export const tailorItems: TailorItem[] = rules.tailor.outfits.filter(o => Object.hasOwn(outfits, o.id)) as TailorItem[];

export const emptyShop = (): ShopState => ({ bag: {}, jinuCount: 0, tailorCount: 0, last: null });

const count = (v: unknown, max = Number.MAX_SAFE_INTEGER): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= max;
const COMMAND = /^[A-Za-z0-9_-]{1,40}$/;

/** Older saves have no shop record and read as empty. */
export function validateShop(v: unknown): ShopState {
  if (v === undefined) return emptyShop();
  if (!v || typeof v !== 'object') throw new Error('가게 기록이 잘못되었습니다.');
  const s = v as Record<string, unknown>, bag = s.bag as Record<string, unknown> | undefined;
  if (!bag || typeof bag !== 'object' || Array.isArray(bag) || !count(s.jinuCount) || !count(s.tailorCount)) throw new Error('가게 기록이 잘못되었습니다.');
  const out: Record<string, number> = {};
  for (const [id, n] of Object.entries(bag)) {
    if (!jinuItems.some(i => i.id === id) || !count(n, BAG_MAX) || n === 0) throw new Error('가방 기록이 잘못되었습니다.');
    out[id] = n;
  }
  const l = s.last as Record<string, unknown> | null | undefined;
  if (l !== null && l !== undefined && (typeof l !== 'object' || (l.shop !== 'jinu' && l.shop !== 'tailor') || typeof l.itemId !== 'string' || l.itemId.length > 40 || !count(l.price) || typeof l.boughtAt !== 'string' || !Number.isFinite(Date.parse(l.boughtAt)))) throw new Error('가게 기록이 잘못되었습니다.');
  return { bag: out, jinuCount: s.jinuCount, tailorCount: s.tailorCount,
    last: l ? { shop: l.shop as 'jinu' | 'tailor', itemId: l.itemId as string, price: l.price as number, boughtAt: l.boughtAt as string } : null };
}

/** Why an item cannot be bought right now (shown on the choice), or null. */
export function canBuyItem(state: GameState, item: ShopItem): string | null {
  if ((state.shop.bag[item.id] ?? 0) >= BAG_MAX) return '가방이 가득 찼어요';
  if (state.gold < item.price) return '골드 부족';
  return null;
}

export function buyItem(state: GameState, itemId: string, commandId: string, now = new Date()): GameState {
  if (state.at.room !== 'jinu') throw new Error('진U 편의점 안에서 살 수 있어요.');
  const item = jinuItems.find(i => i.id === itemId);
  if (!item || !Number.isSafeInteger(item.price) || item.price < 0) throw new Error('없는 상품이에요.');
  if (!COMMAND.test(commandId)) throw new Error('잘못된 주문이에요.');
  const key = 'shop.jinu.' + commandId;
  if (state.ledger.includes(key)) return state;
  const why = canBuyItem(state, item);
  if (why) throw new Error(why === '골드 부족' ? '골드가 부족해요. 취재로 골드를 모아 다시 와 주세요.' : '같은 물건은 가방에 ' + BAG_MAX + '개까지 넣을 수 있어요.');
  return {
    ...state, gold: state.gold - item.price, ledger: [...state.ledger, key],
    shop: { ...state.shop, bag: { ...state.shop.bag, [item.id]: (state.shop.bag[item.id] ?? 0) + 1 }, jinuCount: state.shop.jinuCount + 1,
      last: { shop: 'jinu', itemId: item.id, price: item.price, boughtAt: now.toISOString() } },
  };
}

export function canBuyOutfit(state: GameState, item: TailorItem): string | null {
  if (state.owned.includes(item.id)) return '보유 중';
  if (state.gold < item.price) return '골드 부족';
  return null;
}

/** Buys a piece of clothing once (ledger key per outfit) and optionally wears it straight away. */
export function buyOutfit(state: GameState, id: string, wear: boolean, now = new Date()): GameState {
  if (state.at.room !== 'tailor') throw new Error('오비트 테일러 안에서 살 수 있어요.');
  const item = tailorItems.find(i => i.id === id);
  if (!item || !Number.isSafeInteger(item.price) || item.price < 0) throw new Error('없는 옷이에요.');
  const key = 'shop.tailor.' + item.id;
  if (state.ledger.includes(key) || state.owned.includes(item.id)) {
    if (!wear || state.avatar.look.outfit === item.id || !state.owned.includes(item.id)) return state;
    return { ...state, avatar: { ...state.avatar, look: { ...state.avatar.look, outfit: item.id } } };
  }
  if (state.gold < item.price) throw new Error('골드가 부족해요. 취재로 골드를 모아 다시 와 주세요.');
  return {
    ...state, gold: state.gold - item.price, ledger: [...state.ledger, key], owned: [...state.owned, item.id],
    avatar: wear ? { ...state.avatar, look: { ...state.avatar.look, outfit: item.id } } : state.avatar,
    shop: { ...state.shop, tailorCount: state.shop.tailorCount + 1, last: { shop: 'tailor', itemId: item.id, price: item.price, boughtAt: now.toISOString() } },
  };
}

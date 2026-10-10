import rules from '../../data/balance/cafe.v0.1.json';
import type { GameState } from './state';

export type MenuItem = { id: string; title: string; price: number; once: boolean };
export const cafeMenu: MenuItem[] = rules.items;

export function canOrder(state: GameState, item: MenuItem): string | null {
  if (item.once && state.cafe.welcomeUsed) return '이미 받음';
  if (state.gold < item.price) return '골드 부족';
  return null;
}

export function orderDrink(state: GameState, itemId: string, commandId: string): GameState {
  if (state.at.room !== 'cafe') throw new Error('비투비씨 카페 안에서 주문할 수 있어요.');
  const item = cafeMenu.find(i => i.id === itemId);
  if (!item || !Number.isSafeInteger(item.price) || item.price < 0) throw new Error('없는 메뉴입니다.');
  const key = 'cafe.order.' + commandId;
  if (state.ledger.includes(key)) return state;
  if (item.once && state.cafe.welcomeUsed) throw new Error('첫 방문 커피는 이미 받았어요. 물은 언제든 무료예요.');
  if (state.gold < item.price) throw new Error('골드가 부족해요. 물이나 첫 방문 커피를 이용해 보세요.');
  return {
    ...state, gold: state.gold - item.price, ledger: [...state.ledger, key],
    cafe: { ...state.cafe, welcomeUsed: state.cafe.welcomeUsed || item.once, orderCount: state.cafe.orderCount + 1, lastOrder: { itemId: item.id, price: item.price, orderedAt: new Date().toISOString() } },
  };
}

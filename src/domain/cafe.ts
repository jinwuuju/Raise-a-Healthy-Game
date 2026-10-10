import rules from '../../data/balance/cafe.v0.1.json';
import type { GameState } from './state';
export const cafeMenu = rules.items;
export function orderDrink(state: GameState, itemId: string, commandId: string): GameState {
  if (state.safeLocation.room !== 'cafe') throw new Error('비투비씨 카페에서 주문해 주세요.');
  if (!/^[a-zA-Z0-9-]{1,64}$/.test(commandId)) throw new Error('올바르지 않은 주문 번호입니다.');
  const item = cafeMenu.find(i => i.id === itemId);
  if (!item || !Number.isSafeInteger(item.price) || item.price < 0) throw new Error('없는 메뉴입니다.');
  const key = `cafe.order.${commandId}`;
  if (state.completionLedger.includes(key)) return state;
  if (item.once && state.cafe.welcomeUsed) throw new Error('첫 방문 커피는 이미 받았어요. 물은 언제든 무료입니다.');
  if (state.gold < item.price) throw new Error('골드가 부족합니다. 무료 물이나 첫 방문 커피를 이용하세요.');
  return { ...state, gold: state.gold - item.price, completionLedger: [...state.completionLedger, key],
    cafe: { ...state.cafe, welcomeUsed: state.cafe.welcomeUsed || item.once, orderCount: state.cafe.orderCount + 1,
      lastOrder: { itemId: item.id, price: item.price, orderedAt: new Date().toISOString() } } };
}

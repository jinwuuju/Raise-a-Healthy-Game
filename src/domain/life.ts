import raw from '../../data/balance/life-shop.v0.1.json';
import type { GameState } from './state';
import { outfits, type OutfitId } from './appearance';
import { campaignContent, questById, questIds, type QuestId } from './content';
import type { CampaignState } from './campaign-state';

export type FurnitureDef = { id: string; title: string; w: number; h: number; price: number };
export type Placement = { id: string; x: number; y: number; rotated: boolean };
export type HomeKind = 'lodging' | 'house';
export type HomeState = { kind: HomeKind; ownedHomes: HomeKind[]; furniture: string[]; placements: Placement[]; pins: string[]; favorites: string[]; spareDrafts: Record<string, string> };
export type ShopItem = { id: string; title: string; kind: 'outfit' | 'equipment' | 'furniture' | 'home'; price: number; unlock: QuestId; effect: string; outfitId?: OutfitId; furnitureId?: string };
export const furniture: FurnitureDef[] = raw.furniture;
export const shopItems = raw.items as ShopItem[];
export function validateShop(): void {
  if (furniture.length !== 24 || new Set(furniture.map(f => f.id)).size !== furniture.length || new Set(shopItems.map(i => i.id)).size !== shopItems.length) throw new Error('생활 상품 ID 중복/누락');
  for (const f of furniture) if (![f.w, f.h].every(n => Number.isSafeInteger(n) && n > 0 && n <= 4) || !Number.isSafeInteger(f.price) || f.price < 0) throw new Error('가구 크기/가격 오류');
  for (const item of shopItems) {
    if (!questIds.includes(item.unlock) || !Number.isSafeInteger(item.price) || item.price < 0 || !item.title || !item.effect || item.id !== item.kind + '.' + (item.outfitId ?? item.furnitureId ?? item.id.split('.')[1])) throw new Error('상점 해금/가격 계약 오류');
    if (item.kind === 'outfit' && (!item.outfitId || !Object.hasOwn(outfits, item.outfitId))) throw new Error('없는 의상 상품');
    if (item.kind === 'furniture' && !furniture.some(f => f.id === item.furnitureId && f.price === item.price)) throw new Error('가구 원본과 상품 불일치');
    if (item.kind === 'equipment' && !['equipment.notebook', 'equipment.desk', 'equipment.bookcase'].includes(item.id)) throw new Error('지원하지 않는 준비물');
    if (item.kind === 'home' && item.id !== 'home.house') throw new Error('지원하지 않는 집');
  }
  if (furniture.some(f => !shopItems.some(item => item.furnitureId === f.id))) throw new Error('구매할 수 없는 가구');
}
validateShop();
export const newHome = (): HomeState => ({ kind: 'lodging', ownedHomes: ['lodging'], furniture: ['bed', 'wardrobe', 'desk', 'chair'], placements: [{ id: 'bed', x: 0, y: 0, rotated: false }, { id: 'wardrobe', x: 6, y: 0, rotated: false }, { id: 'desk', x: 0, y: 4, rotated: false }, { id: 'chair', x: 2, y: 5, rotated: false }], pins: [], favorites: [], spareDrafts: {} });
export const homeSize = (kind: HomeKind) => kind === 'lodging' ? { w: 8, h: 8 } : { w: 12, h: 10 };
export const exitCell = (kind: HomeKind, x: number, y: number) => (x === 6 || x === 7) && y >= homeSize(kind).h - 2;
export function footprint(p: Placement): { w: number; h: number } { const f = furniture.find(f => f.id === p.id); if (!f) throw new Error('없는 가구'); return p.rotated ? { w: f.h, h: f.w } : { w: f.w, h: f.h }; }
export function placementRect(p: Placement) { const { w, h } = footprint(p); return { x: 96 + p.x * 16, y: 64 + p.y * 16, w: w * 16, h: h * 16 }; }
export function validPlacements(kind: HomeKind, ps: Placement[]): boolean {
  const size = homeSize(kind), used = new Set<string>(), ids = new Set<string>();
  for (const p of ps) {
    if (!p || !furniture.some(f => f.id === p.id) || ids.has(p.id) || !Number.isInteger(p.x) || !Number.isInteger(p.y) || typeof p.rotated !== 'boolean') return false;
    ids.add(p.id); const { w, h } = footprint(p);
    if (p.x < 0 || p.y < 0 || p.x + w > size.w || p.y + h > size.h) return false;
    for (let y = p.y; y < p.y + h; y++) for (let x = p.x; x < p.x + w; x++) { const key = x + ':' + y; if (used.has(key) || exitCell(kind, x, y)) return false; used.add(key); }
  }
  return true;
}
export function validateHome(v: unknown): HomeState {
  if (v === undefined) return newHome();
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('집 저장 오류');
  const h = v as HomeState;
  const list = (v: unknown, max: number): v is string[] => Array.isArray(v) && v.length <= max && [...v].every(x => typeof x === 'string' && x.length <= 100) && new Set(v).size === v.length;
  if (!['lodging', 'house'].includes(h.kind) || !list(h.ownedHomes, 2) || !h.ownedHomes.includes(h.kind) || !h.ownedHomes.includes('lodging') || h.ownedHomes.some(x => !['lodging', 'house'].includes(x)) || !list(h.furniture, 24) || h.furniture.some(id => !furniture.some(f => f.id === id)) || !Array.isArray(h.placements) || !validPlacements(h.kind, h.placements) || h.placements.some(p => !h.furniture.includes(p.id)) || !list(h.pins, 5) || !list(h.favorites, 20) || !h.spareDrafts || typeof h.spareDrafts !== 'object' || Array.isArray(h.spareDrafts) || Object.keys(h.spareDrafts).some(slot => !['0', '1'].includes(slot)) || Object.values(h.spareDrafts).some(x => typeof x !== 'string' || x.length > 2000)) throw new Error('가구/집 기록이 잘못되었습니다.');
  return { kind: h.kind, ownedHomes: [...h.ownedHomes], furniture: [...h.furniture], placements: h.placements.map(p => ({ id: p.id, x: p.x, y: p.y, rotated: p.rotated })), pins: [...h.pins], favorites: [...h.favorites], spareDrafts: { ...h.spareDrafts } };
}
export type PinnedEvidence = { id: string; questId: QuestId; title: string; text: string };
export function availableEvidence(s: Pick<GameState, 'campaign'>): PinnedEvidence[] {
  return questIds.flatMap(id => { const p = s.campaign.records[id], q = questById(id); return (p?.evidence ?? []).map(evidenceId => { const o = q.observations.find(o => o.id === evidenceId), t = q.tasks.find(t => t.evidenceId === evidenceId); return { id: id + ':' + evidenceId, questId: id, title: o?.title ?? t?.title ?? evidenceId, text: o?.text ?? t?.feedback ?? '' }; }); });
}
export const availableConcepts = (s: Pick<GameState, 'campaign'>) => campaignContent.concepts.filter(c => campaignContent.quests.some(q => q.conceptIds.includes(c.id) && s.campaign.records[q.id]?.published));
export const pinLimit = (s: Pick<GameState, 'campaign'>) => s.campaign.purchased.includes('equipment.notebook') ? 5 : 3;
export const noteLimit = (s: Pick<GameState, 'campaign'>) => s.campaign.purchased.includes('equipment.desk') ? 2 : 1;
export function validateLifeProgress(home: HomeState, campaign: CampaignState, owned: OutfitId[]): void {
  const projected = { campaign };
  if (home.pins.length > pinLimit(projected) || home.pins.some(id => !availableEvidence(projected).some(e => e.id === id)) || (home.favorites.length && !campaign.purchased.includes('equipment.bookcase')) || home.favorites.some(id => !availableConcepts(projected).some(c => c.id === id)) || Object.keys(home.spareDrafts).some(slot => Number(slot) >= noteLimit(projected))) throw new Error('준비물과 핀·초안·즐겨찾기 기록 불일치');
  for (const itemId of campaign.purchased) {
    const item = shopItems.find(item => item.id === itemId)!;
    if ((item.kind === 'outfit' && !owned.includes(item.outfitId!)) || (item.kind === 'furniture' && !home.furniture.includes(item.furnitureId!)) || (item.kind === 'home' && !home.ownedHomes.includes('house'))) throw new Error('구매 기록과 보유 품목 불일치');
  }
  if (home.ownedHomes.includes('house') && !campaign.purchased.includes('home.house')) throw new Error('내 집 구매 기록이 없어요.');
}
export function ownedItem(s: GameState, item: ShopItem): boolean { return item.kind === 'outfit' ? s.owned.includes(item.outfitId!) : item.kind === 'furniture' ? s.home.furniture.includes(item.furnitureId!) : item.kind === 'home' ? s.home.ownedHomes.includes('house') : s.campaign.purchased.includes(item.id); }
export function canBuy(s: GameState, item: ShopItem): string | null { if (ownedItem(s, item)) return '보유 중'; if (!s.campaign.records[item.unlock]?.published) return item.unlock + ' 발행 후'; if (s.gold < item.price) return '골드 부족'; return null; }
export function buyItem(s: GameState, id: string): GameState {
  if (s.at.room !== 'store') throw new Error('오비트 테일러 진열대에서 구매해 주세요.');
  const item = shopItems.find(i => i.id === id); if (!item) throw new Error('없는 상품'); if (ownedItem(s, item)) return s;
  const why = canBuy(s, item); if (why) throw new Error(why);
  let next: GameState = { ...s, gold: s.gold - item.price, campaign: { ...s.campaign, purchased: [...s.campaign.purchased, item.id] } };
  if (item.kind === 'outfit') next = { ...next, owned: [...s.owned, item.outfitId!] };
  if (item.kind === 'furniture') next = { ...next, home: { ...s.home, furniture: [...s.home.furniture, item.furnitureId!] } };
  if (item.kind === 'home') next = { ...next, home: { ...s.home, ownedHomes: [...s.home.ownedHomes, 'house'] } };
  return next;
}
export function equipOutfit(s: GameState, id: OutfitId): GameState { if (!s.owned.includes(id)) throw new Error('아직 갖고 있지 않은 옷이에요.'); if (s.avatar.look.outfit === id) return s; return { ...s, avatar: { ...s.avatar, look: { ...s.avatar.look, outfit: id } } }; }
export function placeFurniture(s: GameState, p: Placement): GameState {
  if (s.at.room !== 'home') throw new Error('집에서 배치해 주세요.'); if (!s.home.furniture.includes(p.id)) throw new Error('보유하지 않은 가구');
  const ps = [...s.home.placements.filter(old => old.id !== p.id), { ...p }]; if (!validPlacements(s.home.kind, ps)) throw new Error('다른 가구·방 경계·출입구 안전 영역과 겹쳐요.');
  const r = placementRect(p), at = s.at; if (p.id !== 'rug' && at.x + 4 > r.x && at.x - 4 < r.x + r.w && at.y + 1 > r.y && at.y - 3 < r.y + r.h) throw new Error('기자가 서 있는 자리는 비워 주세요.');
  return { ...s, home: { ...s.home, placements: ps } };
}
export function storeFurniture(s: GameState, id: string): GameState { if (s.at.room !== 'home') throw new Error('집에서 정리해 주세요.'); if (!s.home.furniture.includes(id)) throw new Error('보유하지 않은 가구'); return { ...s, home: { ...s.home, placements: s.home.placements.filter(p => p.id !== id) } }; }
export function switchHome(s: GameState, kind: HomeKind): GameState { if (s.at.room !== 'home' || !s.home.ownedHomes.includes(kind)) throw new Error('보유한 집에서만 전환할 수 있어요.'); if (kind === s.home.kind) return s; return { ...s, home: { ...s.home, kind, placements: [] } }; }
export function pinEvidence(s: GameState, id: string): GameState { if (!availableEvidence(s).some(e => e.id === id)) throw new Error('아직 얻지 못한 근거예요.'); const pins = s.home.pins.includes(id) ? s.home.pins.filter(x => x !== id) : [...s.home.pins, id]; const max = pinLimit(s); if (pins.length > max) throw new Error('동시 핀 ' + max + '개. 모든 근거는 기본 목록에서 무료로 열 수 있어요.'); return { ...s, home: { ...s.home, pins } }; }
export function favoriteConcept(s: GameState, id: string): GameState { if (!s.campaign.purchased.includes('equipment.bookcase')) throw new Error('자료 책장의 선택 편의 기능이에요. 기본 도감은 무료입니다.'); if (!availableConcepts(s).some(c => c.id === id)) throw new Error('아직 열리지 않은 도감 항목이에요.'); return { ...s, home: { ...s.home, favorites: s.home.favorites.includes(id) ? s.home.favorites.filter(x => x !== id) : [...s.home.favorites, id] } }; }
export function spareNote(s: GameState, slot: string, text: string): GameState { const max = noteLimit(s); if (!Array.from({ length: max }, (_, i) => String(i)).includes(slot) || typeof text !== 'string' || text.length > 2000) throw new Error('초안 보관 칸을 확인해 주세요.'); return { ...s, home: { ...s.home, spareDrafts: { ...s.home.spareDrafts, [slot]: text } } }; }

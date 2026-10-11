import { furnitureFrame } from '../art/furniture';
import { characterFrame } from '../art/character';
import { outfits, type OutfitId } from '../domain/appearance';
import { availableConcepts, availableEvidence, canBuy, exitCell, footprint, furniture, homeSize, noteLimit, ownedItem, pinLimit, shopItems, type HomeKind, type Placement, type ShopItem } from '../domain/life';
import { questById, questIds } from '../domain/content';
import { progressOf } from '../domain/campaign';
import type { Game } from '../application/game';
import { button, el, pixelCanvas } from './dom';
import { openSheet } from './sheet';
import './life.css';

type Command = (run: () => void, message?: string) => void;
function panel(title: string, game: Game, onUpdate: () => void, build: (body: HTMLElement, command: Command) => void): void {
  openSheet(title, content => {
    content.closest('.sheet')?.classList.add('life-sheet');
    const notice = el('p', 'life-notice'); notice.setAttribute('role', 'status'); notice.setAttribute('aria-live', 'polite');
    const body = el('div', 'life-body'); content.append(notice, body);
    const render = () => {
      const key = (document.activeElement as HTMLElement | null)?.dataset.lifeKey;
      body.replaceChildren(); build(body, command);
      if (key) [...body.querySelectorAll<HTMLElement>('[data-life-key]')].find(e => e.dataset.lifeKey === key)?.focus({ preventScroll: true });
    };
    const command: Command = (run, message = '저장 완료') => {
      try { run(); notice.textContent = message; notice.classList.remove('error'); onUpdate(); render(); }
      catch (e) { notice.textContent = e instanceof Error ? e.message : '변경을 저장하지 못했어요.'; notice.classList.add('error'); }
    };
    render();
  }, onUpdate, { dismissOnContentClick: false });
}
function control(text: string, key: string, action: () => void, disabled = false): HTMLButtonElement { const b = button('life-button', text, action); b.dataset.lifeKey = key; b.disabled = disabled; return b; }
function preview(game: Game, outfit: OutfitId): HTMLElement {
  const row = el('div', 'life-avatar-preview');
  for (const dir of ['down', 'left', 'up', 'right'] as const) row.append(pixelCanvas(characterFrame({ ...game.state.avatar.look, outfit }, dir, 0)));
  row.setAttribute('aria-label', outfits[outfit] + ' 네 방향 미리보기'); return row;
}
function tabs<T extends string>(ids: readonly T[], labels: Record<T, string>, selected: T, onSelect: (id: T) => void): HTMLElement {
  const nav = el('div', 'life-tabs'); nav.setAttribute('role', 'group'); nav.setAttribute('aria-label', '보기 선택');
  for (const id of ids) { const b = control(labels[id], 'tab:' + id, () => onSelect(id)); b.setAttribute('aria-pressed', String(selected === id)); nav.append(b); } return nav;
}

export function openShop(game: Game, onUpdate: () => void): void {
  let category: ShopItem['kind'] = 'outfit', selected = 'outfit.coat';
  panel('오비트 테일러 · 취재 준비실', game, onUpdate, (body, command) => {
    const s = game.state;
    body.append(el('p', 'life-summary', '보유 ' + s.gold + 'G · 모든 취재는 구매 없이 진행할 수 있어요.'));
    body.append(tabs(['outfit', 'equipment', 'furniture', 'home'] as const, { outfit: '옷', equipment: '준비물', furniture: '가구', home: '집' }, category, id => { category = id; selected = shopItems.find(item => item.kind === id)!.id; command(() => {}, '상품을 골라 미리 보세요.'); }));
    const layout = el('div', 'life-shop-layout'), list = el('div', 'life-catalog');
    for (const item of shopItems.filter(item => item.kind === category)) {
      const b = control('', 'item:' + item.id, () => { selected = item.id; command(() => {}, '구매 전 미리보기'); });
      b.setAttribute('aria-pressed', String(selected === item.id));
      b.append(el('b', '', item.title), el('small', '', ownedItem(s, item) ? '보유 중' : item.price + 'G · ' + item.unlock + ' 이후'));
      list.append(b);
    }
    const item = shopItems.find(item => item.id === selected) ?? shopItems.find(item => item.kind === category)!;
    const detail = el('section', 'life-product'); detail.append(el('h3', '', item.title));
    if (item.outfitId) detail.append(preview(game, item.outfitId));
    if (item.furnitureId) { const f = furniture.find(f => f.id === item.furnitureId)!; const art = pixelCanvas(furnitureFrame(f.id)); art.classList.add('life-furniture-preview'); detail.append(art, el('div', 'life-product-dimensions', f.w + ' × ' + f.h + ' 칸')); }
    if (item.kind === 'home') detail.append(el('div', 'life-product-dimensions', '12 × 10 칸'));
    detail.append(el('p', '', item.effect), el('p', 'muted', item.price === 0 ? '무료 품목' : '가격 ' + item.price + 'G'));
    const why = canBuy(s, item), buy = control(why ?? item.price + 'G 구매하고 저장', 'buy:' + item.id, () => command(() => game.buyItem(item.id), item.title + ' 구매·저장 완료'), !!why || s.at.room !== 'store');
    detail.append(buy);
    if (s.at.room !== 'store') detail.append(el('p', 'muted', '거리의 오비트 테일러 진열대에서 구매할 수 있어요.'));
    if (ownedItem(s, item) && item.kind === 'outfit') detail.append(control('이 옷 입기', 'equip:' + item.id, () => command(() => game.equipOutfit(item.outfitId!), '월드와 기자 정보에 새 옷을 반영했어요.')));
    layout.append(list, detail); body.append(layout);
  });
}

export function openWardrobe(game: Game, onUpdate: () => void): void {
  let selected = game.state.avatar.look.outfit;
  panel('내 옷장', game, onUpdate, (body, command) => {
    body.append(el('p', 'muted', '옷을 눌러 네 방향을 확인한 뒤 입기를 선택해요. 미리보기만 하고 닫으면 지금 옷을 유지해요.'), preview(game, selected));
    const list = el('div', 'life-outfits');
    for (const id of game.state.owned) { const b = control(outfits[id], 'look:' + id, () => { selected = id; command(() => {}, outfits[id] + ' 미리보기'); }); b.setAttribute('aria-pressed', String(id === selected)); list.append(b); }
    body.append(list, control(game.state.avatar.look.outfit === selected ? '지금 입고 있어요' : outfits[selected] + ' 입고 저장', 'wear', () => command(() => game.equipOutfit(selected), '새 옷을 입고 저장했어요.'), game.state.avatar.look.outfit === selected));
  });
}

export function openHome(game: Game, onUpdate: () => void): void {
  let selected = game.state.home.furniture[0] ?? 'bed';
  let proposal: Placement = { ...(game.state.home.placements.find(p => p.id === selected) ?? { id: selected, x: 0, y: 0, rotated: false }) };
  panel('가구와 공간 꾸미기', game, onUpdate, (body, command) => {
    const s = game.state, size = homeSize(s.home.kind);
    body.append(el('p', 'life-summary', (s.home.kind === 'lodging' ? '무료 기자 숙소' : '작은 내 집') + ' · ' + size.w + '×' + size.h + ' 칸 · 보유 가구 ' + s.home.furniture.length + '/24'));
    body.append(el('p', 'muted', '가구 선택 → 칸 선택 → 배치하고 저장. 이동·회전 미리보기는 저장 전까지 월드에 반영되지 않아요. 출입구 빗금 영역은 비워 둡니다.'));
    const form = el('div', 'life-arrange-controls'), label = el('label', 'life-field'); label.append(el('span', '', '가구 선택'));
    const select = el('select'); select.setAttribute('aria-label', '배치할 가구'); select.dataset.lifeKey = 'furniture-select';
    for (const id of s.home.furniture) { const option = el('option', '', furniture.find(f => f.id === id)!.title + (s.home.placements.some(p => p.id === id) ? ' · 배치 중' : ' · 보관함')); option.value = id; select.append(option); }
    select.value = selected; select.addEventListener('change', () => { selected = select.value; proposal = { ...(game.state.home.placements.find(p => p.id === selected) ?? { id: selected, x: 0, y: 0, rotated: false }) }; command(() => {}, '칸을 골라 배치 위치를 미리 보세요.'); }); label.append(select); form.append(label);
    const coords = el('div', 'life-coordinate-fields');
    for (const axis of ['x', 'y'] as const) {
      const field = el('label', 'life-field'); field.append(el('span', '', axis === 'x' ? '가로 칸' : '세로 칸'));
      const input = el('input'); input.type = 'number'; input.min = '1'; input.max = String(axis === 'x' ? size.w : size.h); input.step = '1'; input.value = String(proposal[axis] + 1); input.setAttribute('aria-label', axis === 'x' ? '가로 칸' : '세로 칸'); input.dataset.lifeKey = 'coordinate:' + axis;
      input.addEventListener('change', () => { proposal = { ...proposal, [axis]: Number(input.value) - 1 }; command(() => {}, '배치 미리보기'); }); field.append(input); coords.append(field);
    }
    form.append(coords, control('회전 ' + (proposal.rotated ? '90°' : '0°'), 'rotate', () => { proposal = { ...proposal, rotated: !proposal.rotated }; command(() => {}, '회전 미리보기'); })); body.append(form);
    const scroll = el('div', 'life-floor-scroll'), grid = el('div', 'life-floor'); grid.style.setProperty('--columns', String(size.w)); grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', '가구 배치 칸. 가로로 스크롤할 수 있어요.');
    const proposed = footprint(proposal);
    const art = pixelCanvas(furnitureFrame(proposal.id, proposal.rotated)); art.classList.add('life-furniture-preview'); body.append(art);
    for (let y = 0; y < size.h; y++) for (let x = 0; x < size.w; x++) {
      const placed = s.home.placements.find(p => { const f = footprint(p); return x >= p.x && x < p.x + f.w && y >= p.y && y < p.y + f.h; });
      const title = placed ? furniture.find(f => f.id === placed.id)!.title : '빈 칸';
      const b = control(placed ? furniture.find(f => f.id === placed.id)!.title.slice(0, 2) : '·', 'cell:' + x + ':' + y, () => { proposal = { ...proposal, x, y }; command(() => {}, '가로 ' + (x + 1) + '·세로 ' + (y + 1) + ' 칸 미리보기'); }, exitCell(s.home.kind, x, y));
      b.classList.add('life-cell'); b.setAttribute('aria-label', '가로 ' + (x + 1) + ' 세로 ' + (y + 1) + ': ' + (b.disabled ? '출입구 안전 영역' : title));
      if (placed) b.classList.add('occupied'); if (b.disabled) b.classList.add('exit');
      if (x >= proposal.x && x < proposal.x + proposed.w && y >= proposal.y && y < proposal.y + proposed.h) b.classList.add('proposed'); grid.append(b);
    }
    scroll.append(grid); body.append(scroll);
    const actions = el('div', 'life-actions');
    actions.append(control('배치하고 저장', 'place', () => command(() => game.placeFurniture(proposal), '가구 배치·저장 완료'), s.at.room !== 'home'), control('보관함으로', 'store', () => command(() => game.storeFurniture(selected), '가구를 보관했어요.'), !s.home.placements.some(p => p.id === selected) || s.at.room !== 'home'), control('미리보기 취소', 'cancel-placement', () => { proposal = { ...(game.state.home.placements.find(p => p.id === selected) ?? { id: selected, x: 0, y: 0, rotated: false }) }; command(() => {}, '저장된 배치로 돌아왔어요.'); })); body.append(actions);
    if (s.home.ownedHomes.length > 1) {
      body.append(el('p', 'muted', '집을 전환하면 현재 배치한 가구를 모두 보관함으로 옮겨요. 가구 소유는 유지합니다.'));
      for (const kind of s.home.ownedHomes) body.append(control(kind === s.home.kind ? '현재 ' + homeTitle(kind) : homeTitle(kind) + ' 전환 · 가구 보관', 'house:' + kind, () => command(() => game.switchHome(kind), homeTitle(kind) + '으로 전환했어요.'), kind === s.home.kind || s.at.room !== 'home'));
    } else body.append(el('p', 'muted', 'Q010 이후 작은 내 집을 선택 구매할 수 있어요. 무료 숙소로도 모든 취재를 끝낼 수 있어요.'));
  });
}
const homeTitle = (kind: HomeKind) => kind === 'lodging' ? '무료 숙소' : '작은 내 집';

export function openLifeTools(game: Game, onUpdate: () => void): void {
  let selected: 'pins' | 'favorites' | 'notes' = 'pins';
  panel('근거 핀·자료·초안 보관', game, onUpdate, (body, command) => {
    const s = game.state;
    body.append(tabs(['pins', 'favorites', 'notes'] as const, { pins: '근거 핀', favorites: '자료', notes: '초안 메모' }, selected, id => { selected = id; command(() => {}, '선택한 자료 보기'); }));
    if (selected === 'pins') {
      body.append(el('p', 'muted', '선택한 근거를 위에 모아 보세요. 핀 ' + s.home.pins.length + '/' + pinLimit(s) + ' · 원래 취재수첩 목록은 계속 무료입니다.'));
      const evidence = availableEvidence(s), pinned = evidence.filter(e => s.home.pins.includes(e.id));
      for (const e of [...pinned, ...evidence.filter(e => !s.home.pins.includes(e.id))]) {
        const card = el('section', 'life-evidence'); card.append(el('h3', '', e.questId + ' · ' + e.title), el('p', '', e.text));
        const b = control(s.home.pins.includes(e.id) ? '핀 해제' : '근거 핀', 'pin:' + e.id, () => command(() => game.pinEvidence(e.id), '근거 핀을 저장했어요.')); b.setAttribute('aria-pressed', String(s.home.pins.includes(e.id))); card.append(b); body.append(card);
      }
      if (!evidence.length) body.append(el('p', '', '모형을 관찰하면 근거를 모을 수 있어요.'));
    } else if (selected === 'favorites') {
      const enabled = s.campaign.purchased.includes('equipment.bookcase'), concepts = availableConcepts(s);
      body.append(el('p', 'muted', enabled ? '자료 책장: 즐겨찾기를 먼저 표시합니다. 첫 특집호도 함께 전시해요.' : '기본 도감은 무료입니다. Q010 이후 자료 책장을 선택 구매하면 즐겨찾기와 특집호 전시를 사용할 수 있어요.'));
      for (const c of [...concepts].sort((a, b) => Number(s.home.favorites.includes(b.id)) - Number(s.home.favorites.includes(a.id)))) {
        const card = el('section', 'life-evidence'); card.append(el('h3', '', c.title), el('p', '', c.text));
        const b = control(s.home.favorites.includes(c.id) ? '즐겨찾기 해제' : '즐겨찾기', 'favorite:' + c.id, () => command(() => game.favoriteConcept(c.id), '자료 즐겨찾기 저장'), !enabled); b.setAttribute('aria-pressed', String(s.home.favorites.includes(c.id))); card.append(b); body.append(card);
      }
      if (enabled) { const edition = el('section', 'life-edition'); edition.append(el('h3', '', '첫 특집호 · 심장이 일하는 방식'), el('p', 'muted', '검수 전 모형 · 작성한 기사 모음')); for (const id of questIds.filter(id => progressOf(s, id).published)) { const q = questById(id), p = progressOf(s, id), draft = p.publishedDraft ?? p.draft; edition.append(el('p', '', id + ' · ' + (draft.headline ? q.alternateHeadline : q.headline))); } body.append(edition); }
      if (!concepts.length) body.append(el('p', '', '첫 기사를 발행하면 순환 도감이 열려요.'));
    } else {
      body.append(el('p', 'muted', '메모 보관 ' + noteLimit(s) + '칸. 저장 버튼을 눌러 보관하고 편집국에서 현재 기사로 가져오세요. 개인 메모는 자동 의학 판정 대상이 아닙니다.'));
      for (let index = 0; index < noteLimit(s); index++) {
        const slot = String(index), field = el('label', 'life-field'); field.append(el('span', '', '초안 메모 ' + (index + 1)));
        const text = el('textarea'); text.value = s.home.spareDrafts[slot] ?? ''; text.maxLength = 2000; text.rows = 6; text.setAttribute('aria-label', '초안 메모 ' + (index + 1)); text.dataset.lifeKey = 'note:' + slot; field.append(text); body.append(field);
        const actions = el('div', 'life-actions'); actions.append(control('메모 보관하고 저장', 'save-note:' + slot, () => command(() => game.spareNote(slot, text.value), '초안 메모 보관 완료')));
        const active = s.campaign.active;
        actions.append(control('현재 기사 메모로 가져오기', 'use-note:' + slot, () => { if (active) command(() => game.saveDraft(active, { ...progressOf(game.state, active).draft, note: s.home.spareDrafts[slot] ?? '' }), '현재 기사 초안에 메모를 가져왔어요.'); }, !active || s.at.room !== 'newsroom' || !s.home.spareDrafts[slot])); body.append(actions);
      }
    }
  });
}

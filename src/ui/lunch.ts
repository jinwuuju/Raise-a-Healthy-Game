/*
 * 오늘의 점심 화면(D085, 점심 ⑥). 이 모듈은 메뉴 데이터·그림과 함께 처음 열 때만 따로 내려받는다(지연 로딩).
 * 흐름: 당김 → 후보 4장·굶기 → 과장 신고(선택) → 똑똑하게 시키기(선택) → 확정 → 픽셀 식탁 → 동료 한마디 → 카드.
 * 확정·저장은 Game(application)만 한다. 식탁 연출·카드·다시 보기는 저장된 기록을 읽기만 한다. 좋고 나쁨 색칠·점수·비난 없음.
 */
import balance from '../../data/balance/lunch.v0.1.json';
import menusData from '../../data/content/lunch-menus.v0.1.json';
import type { Game } from '../application/game';
import { FOOD_ART, FOOD_H, FOOD_W, type FoodGrid } from '../art/food';
import { lunchExtras as extras, fillMenu, tipText, tipsFor, type LunchTip } from '../domain/lunch-content';
import { CRAVES, CRAVE_NAMES, LUNCH_REWARDS, lunchPlanFor, lunchTomorrow, lunchDay, lunchOpen, lunchSecondsLeft, lunchToday, type Crave, type CraveChoice, type LunchDay, type LunchPool } from '../domain/lunch';
import type { GameState } from '../domain/state';
import { button, el } from './dom';
import { openSheet } from './sheet';

type Nut = Record<'kcal' | 'protein' | 'fat' | 'saturatedFat' | 'carb' | 'sugar' | 'fiber' | 'sodium', number>;
type Menu = {
  id: string; name: string; crave: Crave; servingG: number | null; servingUnit: string | null; servingBasis: string;
  perServing: Nut | null; per100g: Nut | null; nutritionStatus: 'analyzed' | 'calculated' | 'borrowed' | 'none';
  source: { db: string; foodCode: string; foodName: string; method: string; createdAt: string; basis: string; borrowedFor: string | null } | null;
  otherAnalyses: { foodCode: string; servingG: number | null; kcal: number; sodium: number; createdAt: string }[];
  art: { id: string; status: string };
};
const MENUS = menusData.menus as unknown as Menu[];
const BY_ID = new Map(MENUS.map(m => [m.id, m]));
export const LUNCH_MENU_COUNT = MENUS.length;

const CRAVE_LABEL: Record<CraveChoice, string> = CRAVE_NAMES;
const NUT_LABEL: Record<keyof Nut, [string, string]> = { kcal: ['열량', 'kcal'], sodium: ['나트륨', 'mg'], protein: ['단백질', 'g'], carb: ['탄수화물', 'g'], sugar: ['당류', 'g'], fat: ['지방', 'g'], saturatedFat: ['포화지방', 'g'], fiber: ['식이섬유', 'g'] };
const REF = balance.dailyReference as unknown as Nut & { source: string };
const NUTS = balance.display.nutrients as (keyof Nut)[];
const HYPE = new Map(extras.hype.map(h => [h.id, h])), FAIR = new Map(extras.fair.map(f => [f.id, f]));
const TYPES = extras.claimTypes as Record<string, { label: string; law: string }>;
const COLLEAGUES = extras.colleagues;
type Situation = 'pick' | 'any' | 'skip' | 'reportHit' | 'reportMiss';
const voices = (sit: Situation) => COLLEAGUES.map(c => ({ id: c.id, lines: c.lines[sit].length }));

export const lunchPool = (): LunchPool => ({ menus: MENUS.map(m => ({ id: m.id, crave: m.crave, name: m.name })), hype: extras.hype.map(h => h.id), fair: extras.fair.map(f => f.id) });

/* ---------- 작은 표시 부품 ---------- */
const fmt = (n: number) => (Math.abs(n) >= 100 ? Math.round(n).toLocaleString('ko-KR') : String(Math.round(n * 10) / 10));
const dateLabel = (date: string) => { const [, m, d] = date.split('-').map(Number); return m + '월 ' + d + '일'; };

/** 32x32 음식 그림 → 정수 배율 캔버스(픽셀 그대로). */
export function foodCanvas(id: string, scale = 3): HTMLCanvasElement {
  const c = el('canvas', 'lunch-art'); c.width = FOOD_W; c.height = FOOD_H; c.style.width = FOOD_W * scale + 'px'; c.style.height = FOOD_H * scale + 'px';
  const art = FOOD_ART[id]; if (art) paint(c.getContext('2d')!, art(), 0, 0);
  c.setAttribute('role', 'img'); c.setAttribute('aria-label', (BY_ID.get(id)?.name ?? '음식') + ' 픽셀 그림');
  return c;
}
function paint(g: CanvasRenderingContext2D, grid: FoodGrid, ox: number, oy: number): void {
  for (let y = 0; y < FOOD_H; y++) for (let x = 0; x < FOOD_W; x++) { const col = grid[y * FOOD_W + x]; if (col) { g.fillStyle = col; g.fillRect(ox + x, oy + y, 1, 1); } }
}

function colleagueLine(who: string | null, line: number | null, sit: Situation, menuName = ''): HTMLElement | null {
  const c = COLLEAGUES.find(x => x.id === who); if (!c) return null;
  const lines = c.lines[sit], text = lines[line !== null && line < lines.length ? line : 0] ?? lines[0]!;
  const p = el('p', 'lunch-voice'); p.append(el('b', '', c.name), el('span', '', fillMenu(text, { name: menuName })));
  return p;
}

/** 영양 표시: 1인분 값과 1일 기준치 %, 근거 단계, 다른 분석 범위, 출처. 색으로 좋고 나쁨을 나타내지 않는다. */
export function nutritionPanel(menu: Menu): HTMLElement {
  const box = el('section', 'lunch-nutrition'); box.setAttribute('aria-label', menu.name + ' 영양 정보');
  const status: Record<Menu['nutritionStatus'], string> = { analyzed: '식약처 분석값', calculated: '식약처 산출값(레시피 계산, 분석값 아님)', borrowed: '대체 값 · 비슷한 음식의 분석값', none: '식약처 DB에 값 없음' };
  box.append(el('p', 'lunch-status', status[menu.nutritionStatus]));
  if (menu.nutritionStatus === 'none' || (!menu.perServing && !menu.per100g)) {
    box.append(el('p', '', '이 메뉴는 숫자를 만들지 않았어요. ' + menu.servingBasis));
  } else {
    const per = menu.perServing ?? menu.per100g!, serving = !!menu.perServing, unit = menu.servingUnit ?? 'g';
    box.append(el('p', 'lunch-serving', serving ? '1인분 ' + fmt(menu.servingG!) + unit + ' 기준 · ' + menu.servingBasis : '1인분 양 미상 · 기준량 100' + unit + '당 값만 보여 줘요(1일 기준치 %는 1인분이 정해진 메뉴에만 표시)'));
    const table = el('table', 'lunch-table'); const head = el('tr'); head.append(el('th', '', '성분'), el('th', '', serving ? '1인분' : '100' + unit + '당'), ...(serving ? [el('th', '', '1일 기준치 대비')] : [])); table.append(head);
    for (const k of NUTS) { const [label, u] = NUT_LABEL[k], tr = el('tr'); tr.append(el('td', '', label), el('td', '', fmt(per[k]) + u)); if (serving) tr.append(el('td', '', Math.round((per[k] / REF[k]) * 100) + '%')); table.append(tr); }
    box.append(table);
    if (menu.nutritionStatus === 'borrowed' && menu.source) box.append(el('p', 'lunch-note', '대체 값: 같은 DB에 ' + (menu.source.borrowedFor ?? menu.name) + ' 값이 없어 ‘' + menu.source.foodName + '’ 분석값을 보여 줘요. 실제 측정값이 아니에요.'));
    if (menu.otherAnalyses.length && menu.perServing) { const all = [menu.perServing.kcal, ...menu.otherAnalyses.map(o => o.kcal)]; box.append(el('p', 'lunch-note', '같은 음식의 다른 분석: ' + fmt(Math.min(...all)) + '~' + fmt(Math.max(...all)) + 'kcal · 가게·조사마다 이만큼 달라요')); }
  }
  if (menu.source) box.append(el('p', 'muted', '출처: ' + menu.source.db + ' · ' + menu.source.foodName + ' (' + menu.source.foodCode + ', ' + menu.source.method + ')'));
  box.append(el('p', 'muted', '1일 기준치: ' + REF.source + ' · 실제 가게·양에 따라 크게 달라요 · 검수 전 모형'));
  return box;
}
const kcalShort = (m: Menu) => m.perServing ? '1인분 약 ' + fmt(m.perServing.kcal) + 'kcal' + (m.nutritionStatus === 'borrowed' ? ' (대체 값)' : m.nutritionStatus === 'calculated' ? ' (산출값)' : '') : m.per100g ? '1인분 양 미상' : '식약처 DB에 값 없음';

/* ---------- 픽셀 식탁(편집국 내 자리) ---------- */
const TABLE_W = 72, TABLE_H = 44;
function drawTable(g: CanvasRenderingContext2D, day: LunchDay, t: number): void {
  g.clearRect(0, 0, TABLE_W, TABLE_H);
  const r = (x: number, y: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  r(0, 0, TABLE_W, 26, '#3b3550'); r(0, 0, TABLE_W, 2, '#4c4566'); for (let x = 4; x < TABLE_W; x += 12) r(x, 6, 6, 9, '#5a6b8a');
  r(0, 26, TABLE_W, 18, '#b9864f'); r(0, 26, TABLE_W, 2, '#d8a66a'); r(0, 42, TABLE_W, 2, '#8a5a2e');
  if (day.outcome !== 'ordered' || !day.menu) { r(52, 20, 12, 8, '#e8e2d2'); r(53, 21, 10, 1, '#b8b0a2'); return; }
  const bagY = t < 0.3 ? Math.round(-20 + (t / 0.3) * 30) : 10, open = t >= 0.35;
  if (t < 0.55) {
    r(26, bagY, 20, 18, '#e6c48a'); r(26, bagY, 20, 2, '#f6dca6'); r(44, bagY, 2, 18, '#c49a5a');
    if (open) { r(24, bagY - 3, 24, 3, '#f6dca6'); r(31, bagY - 6, 10, 3, '#e6c48a'); } else { r(33, bagY - 3, 6, 3, '#c49a5a'); }
    if (day.tips.includes('mild-please')) { r(28, bagY + 8, 7, 6, '#fff3a0'); r(29, bagY + 10, 5, 1, '#c8a02a'); r(29, bagY + 12, 4, 1, '#c8a02a'); }
    return;
  }
  const k = Math.min(1, (t - 0.55) / 0.25), dy = Math.round((1 - k) * 6);
  const grid = FOOD_ART[day.menu]?.(); if (grid) paint(g, grid, 20, 8 + dy);
  const show = (i: number) => t >= 0.8 + i * 0.05;
  let side = 0;
  if (day.tips.includes('rice-half') && show(side++)) { r(54, 30, 12, 6, '#f1eee8'); r(55, 29, 10, 2, '#ffffff'); r(56, 28, 5, 2, '#fbfaf3'); r(54, 35, 12, 1, '#b8b0a2'); }
  if (day.tips.includes('sauce-side') && show(side++)) { r(6, 33, 10, 4, '#f3efe6'); r(7, 32, 8, 2, '#a8542a'); r(6, 36, 10, 1, '#b8b0a2'); }
  if (day.tips.includes('broth-sip') && show(side++)) { r(8, 24, 2, 9, '#c3ccd6'); r(6, 30, 6, 3, '#e6ebf0'); }
  if (day.tips.includes('mild-please') && show(side++)) { r(58, 18, 8, 7, '#fff3a0'); r(59, 20, 6, 1, '#c8a02a'); r(59, 22, 4, 1, '#c8a02a'); }
  r(18, 38, 36, 2, '#8a5a2e33');
}
function tableCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = el('canvas', 'lunch-table-art'); c.width = TABLE_W; c.height = TABLE_H; c.setAttribute('role', 'img');
  const g = c.getContext('2d')!; g.imageSmoothingEnabled = false; return [c, g];
}
const tableWords = (day: LunchDay) => (day.outcome !== 'ordered' ? balance.skip.label : day.menuName + '이(가) 내 자리에 차려졌어요' + (day.tips.length ? ' · 식탁에 ' + day.tips.map(id => extras.tips.find(t => t.id === id)?.table).filter(Boolean).join(', ') : ''));

/* ---------- 결과 카드(읽기 전용) ---------- */
function resultCard(day: LunchDay): HTMLElement {
  const card = el('article', 'lunch-result');
  const head = el('div', 'lunch-result-head');
  if (day.outcome === 'ordered' && day.menu) head.append(foodCanvas(day.menu, 3));
  const words = el('div'); words.append(el('small', 'muted', dateLabel(day.date) + ' 점심' + (day.crave ? ' · ' + CRAVE_LABEL[day.crave] : '')), el('h3', '', day.outcome === 'ordered' ? day.menuName ?? '' : balance.skip.label));
  if (day.outcome === 'skipped') words.append(el('p', 'muted', day.skip === 'auto' ? '11:30까지 고르지 않아 건너뛴 날로 기록했어요. 보상도 불이익도 없어요.' : '직접 건너뛴 날이에요. 보상도 불이익도 없어요.'));
  head.append(words); card.append(head);
  const voice = colleagueLine(day.who, day.line, day.outcome === 'skipped' ? 'skip' : day.crave === 'any' ? 'any' : 'pick', day.menuName ?? ''); if (voice) card.append(voice);
  if (day.report) { const hype = day.cards.find(c => c.hype); card.append(el('p', 'lunch-note', (day.report.hit ? '과장 신고 적중 · ' : '과장 신고 · 가게 소개였어요 · ') + (hype ? '과장 문구 유형: ' + (TYPES[HYPE.get(hype.claim)?.type ?? '']?.label ?? '') : ''))); }
  card.append(el('p', 'lunch-gold', day.gold > 0 ? '오늘 점심으로 받은 골드 +' + day.gold + 'G' : day.outcome === 'skipped' ? '건너뛴 날 · 보상 0, 불이익 없음' : '받은 골드 없음'));
  if (day.tips.length) { const list = el('ul', 'lunch-tips-done'); for (const id of day.tips) { const t = extras.tips.find(x => x.id === id); if (t) list.append(el('li', '', t.label)); } card.append(el('p', 'lunch-note', '똑똑하게 시키기'), list); }
  const menu = day.menu ? BY_ID.get(day.menu) : undefined;
  if (menu) { const d = el('details', 'lunch-more'); d.append(el('summary', '', '영양 정보 · 출처'), nutritionPanel(menu)); card.append(d); }
  return card;
}

const rewardText = '점심을 고르면 +' + LUNCH_REWARDS.order + 'G · 과장 신고 적중 +' + LUNCH_REWARDS.reportHit + 'G · 처음 먹는 메뉴(도감) +' + LUNCH_REWARDS.newDex + 'G · 메뉴의 건강도와는 상관없어요';
function deadlineText(now: number): string {
  const left = lunchSecondsLeft(now), h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60);
  return '11:30까지 주문 · 남은 시간 ' + (h ? h + '시간 ' : '') + (h || m ? m + '분' : '1분 미만');
}

/* ---------- 열기 ---------- */
type Opts = { onRecord?: () => void; exportSave: () => void; readOnlyDate?: string | undefined };

/** 오늘의 점심 창. readOnlyDate를 주면 그날 카드만 읽기 전용으로 보여 준다(수첩에서 다시 보기). */
export function openLunch(game: Game, opts: Opts): void {
  let timer = 0, raf = 0, alive = true;
  openSheet(opts.readOnlyDate ? '점심 카드 다시 보기' : '오늘의 점심', (c, close) => {
    const sheet = c.parentElement!; sheet.classList.add('lunch-sheet'); c.classList.add('keep-open');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let selected: string | null = null, chosenTips: string[] = [], message = '', replayTable = false;
    // 내일 뭐 먹지(D087): 'pick'=당김 고르기, Crave=그 칸 메뉴 둘러보기, planMenu=메뉴 자세히. 주문 단추는 없다.
    let planning: 'pick' | Crave | null = null, planMenu: string | null = null;
    const status = el('p', 'lunch-message'); status.setAttribute('role', 'status');
    const act = (fn: () => void) => { message = ''; try { game.settleLunch(); fn(); } catch (e) { message = e instanceof Error ? e.message : '처리하지 못했어요.'; game.settleLunch(); } render(); };
    const saveWarn = () => game.lastError ? el('p', 'lunch-message', '기록 저장 주의 · ' + game.lastError) : null;

    function render(): void {
      cancelAnimationFrame(raf); if (!alive) return;
      const s: GameState = game.state, now = Date.now();
      c.replaceChildren();
      if (opts.readOnlyDate) { const d = lunchDay(s, opts.readOnlyDate); c.append(d && d.outcome ? resultCard(d) : el('p', 'muted', '기록이 없어요.')); return; }
      if (!s.started) { c.append(el('p', 'muted', '기자를 만든 뒤 점심을 고를 수 있어요.')); return; }
      const day = lunchToday(s, now);
      c.append(el('p', 'muted lunch-disclaimer', '검수 전 모형 · 편집국 식대로 먹어요(골드 차감 없음) · 시계는 한국 시간'));
      if (message) { status.textContent = message; c.append(status); }
      const warn = saveWarn(); if (warn) c.append(warn);
      if (day?.outcome) { if (!day.seen || replayTable) return showTable(day); if (planning) { showPlan(); keepFocus(); return; } return showResult(day); }
      if (!lunchOpen(now)) { act(() => {}); return; }
      c.append(el('p', 'lunch-deadline', deadlineText(now)));
      if (!day || !day.cards.length) showChips();
      else if (selected) showOrder(day, selected);
      else showCards(day);
      keepFocus();
    }
    /** 다시 그리면 눌렀던 버튼이 사라지므로 키보드 포커스를 창 안 첫 조작으로 옮긴다. */
    function keepFocus(): void {
      if (sheet.contains(document.activeElement) && document.activeElement !== document.body) return;
      c.querySelector<HTMLElement>('button, input')?.focus({ preventScroll: true });
    }

    function showChips(): void {
      c.append(el('h3', '', '오늘 당기는 느낌은?'));
      const grid = el('div', 'lunch-chips');
      const plan = lunchPlanFor(game.state, Date.now()), planned = plan?.menu ? BY_ID.get(plan.menu) : undefined;
      if (plan) c.append(el('p', 'lunch-plan-hint', '어제 고민해 둔 점심: ' + (planned ? planned.name + ' · ‘' + CRAVE_LABEL[plan.crave] + '’나 ‘아무거나’를 고르면 후보에 꼭 들어가요' : '‘' + CRAVE_LABEL[plan.crave] + '’')));
      for (const id of [...CRAVES, 'any'] as CraveChoice[]) {
        const b = button('lunch-chip' + (plan && id === plan.crave ? ' planned' : ''), CRAVE_LABEL[id], () => act(() => game.drawLunch(id, lunchPool())));
        if (plan && id === plan.crave) b.append(el('span', 'lunch-chip-note', '어제 고민한 당김'));
        grid.append(b);
      }
      c.append(grid, el('p', 'muted', rewardText), skipButton());
    }

    /* ---- 내일 뭐 먹지: 고민만, 주문은 내일 00:00~11:30 ---- */
    function showPlan(): void {
      const tomorrow = lunchTomorrow(Date.now());
      c.append(el('h3', '', '내일 뭐 먹지? · ' + dateLabel(tomorrow)), el('p', 'muted', '오늘은 고민만 해요. 주문은 내일 00:00부터 11:30 전까지 할 수 있어요. 고민해 둔 메뉴는 내일 그 당김을 고르면 후보에 꼭 들어가요. 보상은 없어요.'));
      if (planning === 'pick') {
        const grid = el('div', 'lunch-chips');
        for (const id of CRAVES) grid.append(button('lunch-chip', CRAVE_LABEL[id], () => { planning = id; planMenu = null; render(); }));
        c.append(grid, button('secondary', '오늘 카드로 돌아가기', () => { planning = null; render(); }));
        return;
      }
      const crave = planning as Crave;
      if (planMenu) {
        const m = BY_ID.get(planMenu)!, head = el('div', 'lunch-order-head'), words = el('div');
        words.append(el('h3', '', m.name), el('span', 'lunch-crave', CRAVE_LABEL[m.crave])); head.append(foodCanvas(m.id, 4), words);
        const row = el('div', 'lunch-order-actions');
        row.append(button('primary', '내일 이걸로 생각해 두기', () => act(() => { game.planLunch(crave, m.id, lunchPool()); planning = null; planMenu = null; })), button('secondary', '다른 메뉴 보기', () => { planMenu = null; render(); }));
        c.append(head, row, nutritionPanel(m));
        return;
      }
      c.append(el('h4', '', CRAVE_LABEL[crave] + ' · 메뉴 둘러보기'));
      const list = el('div', 'lunch-browse');
      for (const m of MENUS.filter(x => x.crave === crave)) {
        const b = button('lunch-browse-item', '', () => { planMenu = m.id; render(); }, m.name + ' 자세히 보기');
        const words = el('span'); words.append(el('b', '', m.name), el('small', '', kcalShort(m)));
        b.append(foodCanvas(m.id, 2), words); list.append(b);
      }
      const row = el('div', 'lunch-order-actions');
      row.append(button('secondary', '메뉴 없이 당김만 정해 두기', () => act(() => { game.planLunch(crave, null, lunchPool()); planning = null; })), button('secondary', '다른 당김 보기', () => { planning = 'pick'; render(); }));
      c.append(row, list);
    }
    function planSummary(): HTMLElement {
      const box = el('section', 'lunch-plan'), tomorrow = lunchTomorrow(Date.now()), plan = game.state.lunch.plan?.date === tomorrow ? game.state.lunch.plan : null;
      box.append(el('h4', '', '내일 뭐 먹지?'));
      if (plan) {
        const m = plan.menu ? BY_ID.get(plan.menu) : undefined;
        const line = el('div', 'lunch-plan-line'); if (m) line.append(foodCanvas(m.id, 2));
        line.append(el('p', '', dateLabel(tomorrow) + ' 점심으로 ' + (m ? m.name + '(' + CRAVE_LABEL[plan.crave] + ')' : '‘' + CRAVE_LABEL[plan.crave] + '’') + '을(를) 생각해 뒀어요. 주문은 내일 11:30 전에.'));
        box.append(line);
        const row = el('div', 'lunch-order-actions'); row.append(button('secondary', '다시 고민하기', () => { planning = 'pick'; planMenu = null; render(); }), button('secondary', '고민 지우기', () => act(() => game.clearLunchPlan()))); box.append(row);
      } else box.append(el('p', 'muted', '점심시간이 지나도 내일 메뉴는 미리 고민할 수 있어요(주문은 내일).'), button('primary', '내일 점심 고민해 보기', () => { planning = 'pick'; planMenu = null; render(); }));
      return box;
    }
    function skipButton(): HTMLElement {
      const b = button('secondary lunch-skip', '오늘은 굶기', () => act(() => game.skipLunch(voices('skip'))));
      const wrap = el('div', 'lunch-skip-row'); wrap.append(b, el('span', 'muted', '건너뛰면 보상 0 · 불이익 없음')); return wrap;
    }

    function showCards(day: LunchDay): void {
      c.append(el('h3', '', CRAVE_LABEL[day.crave ?? 'any'] + ' · 오늘의 후보'));
      c.append(el('p', 'muted', '가상 배달 가게의 홍보 문구예요. 그중 하나는 음식이 할 수 없는 말을 해요. 찾으면 ‘과장 신고’(선택, 틀려도 괜찮아요).'));
      const list = el('div', 'lunch-cards');
      for (const card of day.cards) {
        const m = BY_ID.get(card.menu); if (!m) continue;
        const item = el('article', 'lunch-card'); item.append(foodCanvas(m.id, 3));
        const body = el('div', 'lunch-card-body');
        body.append(el('b', '', m.name), el('span', 'lunch-crave', CRAVE_LABEL[m.crave]));
        const claim = card.hype ? HYPE.get(card.claim)?.text : FAIR.get(card.claim)?.text;
        body.append(el('q', 'lunch-claim', fillMenu(claim ?? '', m)), el('span', 'muted', kcalShort(m)));
        if (day.report && card.hype) body.append(el('span', 'lunch-badge', '과장 문구'));
        if (lunchPlanFor(game.state, Date.now())?.menu === card.menu) body.append(el('span', 'lunch-badge', '어제 고민한 메뉴'));
        const row = el('div', 'lunch-card-actions');
        row.append(button('primary lunch-pick', '이걸로', () => { selected = m.id; chosenTips = []; message = ''; render(); }));
        if (!day.report) row.append(button('secondary', '과장 신고', () => act(() => game.reportLunch(m.id, voices(card.hype ? 'reportHit' : 'reportMiss')))));
        body.append(row); item.append(body); list.append(item);
      }
      c.append(list);
      if (day.report) c.append(reportBox(day));
      c.append(skipButton());
    }
    function reportBox(day: LunchDay): HTMLElement {
      const box = el('section', 'lunch-report'); box.setAttribute('aria-live', 'polite');
      const hype = day.cards.find(x => x.hype)!, h = HYPE.get(hype.claim), menu = BY_ID.get(hype.menu), reported = BY_ID.get(day.report!.menu);
      box.append(el('h4', '', day.report!.hit ? '신고 적중! 과장 문구였어요' : '이 문구는 가게 소개였어요'));
      if (!day.report!.hit) box.append(el('p', '', (reported?.name ?? '') + ' · ' + extras.fairWhy));
      if (h && menu) { box.append(el('p', '', '과장 문구: “' + fillMenu(h.text, menu) + '”'), el('p', '', h.why), el('p', 'muted', '유형 · ' + (TYPES[h.type]?.label ?? '') + ' · 식품표시광고법 ' + (TYPES[h.type]?.law ?? ''))); }
      if (day.report!.hit) box.append(el('p', 'lunch-gold', '팩트체크 보상 +' + LUNCH_REWARDS.reportHit + 'G'));
      const v = colleagueLine(day.report!.who, day.report!.line, day.report!.hit ? 'reportHit' : 'reportMiss'); if (v) box.append(v);
      box.append(el('p', 'muted', extras.disclaimer));
      return box;
    }

    function showOrder(day: LunchDay, id: string): void {
      const m = BY_ID.get(id); if (!m || !day.cards.some(x => x.menu === id)) { selected = null; return render(); }
      const head = el('div', 'lunch-order-head'); const words = el('div'); words.append(el('h3', '', m.name), el('span', 'lunch-crave', CRAVE_LABEL[m.crave]));
      head.append(foodCanvas(m.id, 4), words); c.append(head);
      const tips: LunchTip[] = tipsFor(m);
      const box = el('fieldset', 'lunch-tips'); box.append(el('legend', '', '똑똑하게 시키기 (선택)'), el('p', 'muted', extras.tipsNote));
      for (const t of tips) {
        const label = el('label', 'lunch-tip'), input = el('input'); input.type = 'checkbox'; input.checked = chosenTips.includes(t.id);
        input.addEventListener('change', () => { chosenTips = input.checked ? [...chosenTips, t.id] : chosenTips.filter(x => x !== t.id); });
        const words2 = el('span'); words2.append(el('b', '', t.label), el('small', '', tipText(t)));
        label.append(input, words2); box.append(label);
      }
      c.append(box, nutritionPanel(m));
      const row = el('div', 'lunch-order-actions');
      row.append(button('primary', '이 메뉴로 주문 확정', () => act(() => { game.orderLunch(m.id, m.name, chosenTips.filter(t => tips.some(x => x.id === t)), tips.map(x => x.id), voices(day.crave === 'any' ? 'any' : 'pick')); selected = null; })), button('secondary', '다른 후보 보기', () => { selected = null; render(); }));
      c.append(row);
    }

    function showTable(day: LunchDay): void {
      const [canvas, g] = tableCanvas(); canvas.setAttribute('aria-label', tableWords(day));
      const caption = el('p', 'lunch-table-caption', tableWords(day)); caption.setAttribute('role', 'status');
      const skip = button('primary', '결과 바로 보기', () => done());
      c.append(el('h3', '', day.outcome === 'ordered' ? '내 자리에 점심 도착' : '오늘 점심'), canvas, caption, skip);
      const total = balance.animation.tableRevealSec * 1000, start = performance.now();
      let finished = false;
      const done = () => { if (finished) return; finished = true; cancelAnimationFrame(raf); replayTable = false; if (!day.seen) game.seeLunch(day.date); render(); };
      if (motion.matches || day.outcome !== 'ordered') { drawTable(g, day, 1); skip.textContent = '카드 보기'; }
      else {
        const tick = (now: number) => { if (!alive || finished) return; const t = Math.min(1, (now - start) / total); drawTable(g, day, t); if (t < 1) raf = requestAnimationFrame(tick); else { skip.textContent = '카드 보기'; } };
        raf = requestAnimationFrame(tick);
      }
      requestAnimationFrame(() => { if (alive && skip.isConnected) skip.focus({ preventScroll: true }); });
    }
    function showResult(day: LunchDay): void {
      const [canvas, g] = tableCanvas(); drawTable(g, day, 1); canvas.setAttribute('aria-label', tableWords(day));
      c.append(canvas, resultCard(day)); requestAnimationFrame(keepFocus);
      c.append(planSummary());
      c.append(el('p', 'muted', '지난 점심 기록과 도감은 수첩 ‘동네·생활’에 있어요.'));
      const row = el('div', 'lunch-order-actions');
      if (day.outcome === 'ordered') row.append(button('secondary', '식탁 다시 보기', () => { replayTable = true; render(); }));
      if (opts.onRecord) row.append(button('secondary', '수첩에서 기록 보기', () => { close(); opts.onRecord!(); }));
      row.append(button('primary', '월드로 돌아가기', () => close()));
      c.append(row);
    }

    render();
    // 열어 둔 채 마감을 넘기면 자동 굶음으로 정리하고 다시 그린다. 그 밖에는 남은 시간 글자만 바꿔 포커스를 지킨다.
    timer = window.setInterval(() => {
      if (!alive || opts.readOnlyDate) return;
      if (game.settleLunch()) { selected = null; render(); return; }
      const d = c.querySelector('.lunch-deadline'); if (d) d.textContent = deadlineText(Date.now());
    }, 5_000);
  }, () => { alive = false; clearInterval(timer); cancelAnimationFrame(raf); }, { dismissOnOutside: false });
}

/** 수첩 동네·생활 탭의 도감(본문은 수첩에만). 모은 메뉴는 그림, 안 모은 메뉴는 개수만. */
export function renderLunchDex(body: HTMLElement, s: GameState): void {
  const got = new Set(s.lunch.dex.filter(id => BY_ID.has(id)));
  body.append(el('p', '', '도감 ' + got.size + ' / ' + LUNCH_MENU_COUNT + '종 · 주문한 메뉴가 모여요'));
  for (const crave of CRAVES) {
    const all = MENUS.filter(m => m.crave === crave), mine = all.filter(m => got.has(m.id));
    const d = el('details', 'notebook-fold'); d.append(el('summary', '', CRAVE_LABEL[crave] + ' · ' + mine.length + '/' + all.length));
    const grid = el('div', 'lunch-dex');
    for (const m of mine) { const cell = el('figure'); cell.append(foodCanvas(m.id, 2), el('figcaption', '', m.name)); grid.append(cell); }
    if (!mine.length) grid.append(el('p', 'muted', '아직 없어요.'));
    d.append(grid); body.append(d);
  }
}

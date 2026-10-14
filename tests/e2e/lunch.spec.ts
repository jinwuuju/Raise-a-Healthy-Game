import { expect, test, type Page } from '@playwright/test';

// 오늘의 점심 ⑥(D085): 서울 시계 기준 흐름·마감·자동 굶음·표시 단계·모바일. 시각은 page.clock으로 고정한다.
type Day = { date: string; crave: string | null; cards: { menu: string; claim: string; hype: boolean }[]; report: { hit: boolean } | null; outcome: string | null; menu: string | null; menuName: string | null; tips: string[]; skip: string | null; seen: boolean };
type State = { totalXp: number; gold: number; lunch: { days: Day[]; dex: string[]; plan: { date: string; crave: string; menu: string | null } | null } } & Record<string, unknown>;
type Hook = { game: { state: State; importState(s: unknown): void } };
const at = (hms: string, date = '2026-10-14') => new Date(date + 'T' + hms + '+09:00');
const state = (page: Page) => page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.game.state);
const lunchLine = (page: Page) => page.locator('.quest .lunch-line');

async function start(page: Page, time: Date) {
  await page.clock.setFixedTime(time);
  await page.goto('/');
  await page.getByRole('button', { name: '첫 출근하기' }).click();
  await page.waitForFunction(() => !!(window as unknown as { __mq?: { world?: unknown } }).__mq?.world);
}
async function patchAndReload(page: Page, patch: (s: State) => State) {
  await Promise.all([page.waitForEvent('load'), page.evaluate(fn => { const mq = (window as unknown as { __mq: Hook }).__mq; mq.game.importState(new Function('s', 'return (' + fn + ')(s)')(JSON.parse(JSON.stringify(mq.game.state)))); location.reload(); }, patch.toString())]);
  await page.waitForFunction(() => !!(window as unknown as { __mq?: { world?: unknown } }).__mq?.world);
}

test('10:00 당김 → 후보 4장 → 과장 신고 → 요령 → 확정 → 식탁 → 카드, 고르기 +10G·새 도감 +5G', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await start(page, at('10:00:00'));
  await expect(lunchLine(page)).toContainText('오늘 점심 고르기 · 11:30까지');
  const before = await state(page);
  await page.getByRole('button', { name: '오늘의 점심 열기' }).click();
  const sheet = page.locator('.lunch-sheet');
  await expect(sheet.locator('.lunch-chip')).toHaveCount(10);
  await expect(sheet).toContainText('11:30까지 주문');
  await sheet.getByRole('button', { name: '뜨끈한 거' }).click();
  await expect(sheet.locator('.lunch-card')).toHaveCount(4);
  expect(await page.evaluate(() => !!document.activeElement?.closest('.lunch-sheet'))).toBe(true);
  const day = (await state(page)).lunch.days[0]!;
  expect(day.cards.filter(c => c.hype)).toHaveLength(1);
  // 틀린 신고: 감점 없이 해설과 정답 공개
  const fairIndex = day.cards.findIndex(c => !c.hype);
  await sheet.locator('.lunch-card').nth(fairIndex).getByRole('button', { name: '과장 신고' }).click();
  await expect(sheet.locator('.lunch-report')).toContainText('가게 소개');
  await expect(sheet.locator('.lunch-report')).toContainText('과장 문구:');
  await expect(sheet.locator('.lunch-badge')).toHaveCount(1);
  await expect(sheet.getByRole('button', { name: '과장 신고' })).toHaveCount(0);
  // 첫 후보 주문 + 요령 하나
  await sheet.locator('.lunch-card').first().getByRole('button', { name: '이걸로' }).click();
  await expect(sheet.locator('.lunch-nutrition')).toBeVisible();
  await expect(sheet.locator('.lunch-nutrition')).toContainText('검수 전 모형');
  const tips = sheet.locator('.lunch-tip input');
  if (await tips.count()) await tips.first().check();
  await sheet.getByRole('button', { name: '이 메뉴로 주문 확정' }).click();
  await expect(sheet.locator('.lunch-table-art')).toBeVisible();
  await sheet.getByRole('button', { name: /결과 바로 보기|카드 보기/ }).click();
  await expect(sheet.locator('.lunch-result')).toBeVisible();
  await expect(sheet.locator('.lunch-voice')).toBeVisible();
  const after = await state(page), d = after.lunch.days[0]!;
  expect([d.outcome, d.menu, d.seen, after.lunch.dex]).toEqual(['ordered', day.cards[0]!.menu, true, [day.cards[0]!.menu]]);
  expect(d.report!.hit).toBe(false);
  expect([after.totalXp, after.gold]).toEqual([before.totalXp, before.gold + 15]);
  await expect(sheet.locator('.lunch-result')).toContainText('+15G');
  await sheet.getByRole('button', { name: '월드로 돌아가기' }).click();
  await expect(lunchLine(page)).toContainText('오늘 점심: ' + d.menuName);
  // 새로고침해도 같은 결과, 연출을 다시 지급하지 않는다
  await page.reload(); await page.waitForFunction(() => !!(window as unknown as { __mq?: { world?: unknown } }).__mq?.world);
  await page.getByRole('button', { name: '오늘의 점심 열기' }).click();
  await expect(page.locator('.lunch-result')).toBeVisible();
  await expect(page.getByRole('button', { name: '결과 바로 보기' })).toHaveCount(0);
  expect((await state(page)).lunch).toEqual(after.lunch);
  expect((await state(page)).gold).toBe(after.gold);
  await page.getByRole('button', { name: '수첩에서 기록 보기' }).click();
  await expect(page.getByRole('tab', { name: '동네·생활' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.notebook-sheet')).toContainText('오늘의 점심 · 기록 1일 · 도감 1종');
  expect(errors).toEqual([]);
});

test('과장 문구를 맞히면 +20G, 다시 열거나 새로고침해도 더 주지 않는다', async ({ page }) => {
  await start(page, at('10:00:00'));
  await page.getByRole('button', { name: '오늘의 점심 열기' }).click();
  await page.getByRole('button', { name: '고기 당기는 거' }).click();
  const before = await state(page), hypeIndex = before.lunch.days[0]!.cards.findIndex(c => c.hype);
  await page.locator('.lunch-card').nth(hypeIndex).getByRole('button', { name: '과장 신고' }).click();
  await expect(page.locator('.lunch-report')).toContainText('신고 적중');
  await expect(page.locator('.lunch-report')).toContainText('+20G');
  expect((await state(page)).gold).toBe(before.gold + 20);
  await page.reload(); await page.waitForFunction(() => !!(window as unknown as { __mq?: { world?: unknown } }).__mq?.world);
  await page.getByRole('button', { name: '오늘의 점심 열기' }).click();
  await expect(page.locator('.lunch-report')).toContainText('신고 적중');
  expect((await state(page)).gold).toBe(before.gold + 20);
});

test('점심시간이 지나도 내일 뭐 먹을지 고민할 수 있고(주문 없음), 다음 날 그 메뉴가 후보에 들어온다(D087)', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await start(page, at('13:20:00'));
  const before = await state(page);
  await page.getByRole('button', { name: '오늘의 점심 열기' }).click();
  await page.getByRole('button', { name: '카드 보기' }).click();
  await page.getByRole('button', { name: '내일 점심 고민해 보기' }).click();
  const sheet = page.locator('.lunch-sheet');
  await expect(sheet).toContainText('주문은 내일 00:00부터 11:30 전까지');
  await expect(sheet.locator('.lunch-chip')).toHaveCount(9);
  await sheet.getByRole('button', { name: '뜨끈한 거' }).click();
  await expect(sheet.locator('.lunch-browse-item')).toHaveCount(32);
  await sheet.getByRole('button', { name: '칼국수 자세히 보기', exact: true }).click();
  await expect(sheet.locator('.lunch-nutrition')).toBeVisible();
  await expect(sheet.getByRole('button', { name: /주문/ })).toHaveCount(0);
  await sheet.getByRole('button', { name: '내일 이걸로 생각해 두기' }).click();
  await expect(sheet.locator('.lunch-plan')).toContainText('칼국수');
  const planned = await state(page);
  expect(planned.lunch.plan).toMatchObject({ date: '2026-10-15', crave: 'hot', menu: 'kalguksu' });
  expect(planned.lunch.days.filter(d => d.outcome === 'ordered')).toEqual([]);
  expect([planned.gold, planned.totalXp]).toEqual([before.gold, before.totalXp]);
  // 다음 날 10:00
  await page.keyboard.press('Escape');
  await page.clock.setFixedTime(at('10:00:00', '2026-10-15'));
  await page.reload(); await page.waitForFunction(() => !!(window as unknown as { __mq?: { world?: unknown } }).__mq?.world);
  await expect(lunchLine(page)).toContainText('오늘 점심 고르기');
  await page.getByRole('button', { name: '오늘의 점심 열기' }).click();
  await expect(sheet.locator('.lunch-plan-hint')).toContainText('칼국수');
  await expect(sheet.locator('.lunch-chip.planned')).toContainText('뜨끈한 거');
  await sheet.locator('.lunch-chip.planned').click();
  await expect(sheet.locator('.lunch-card').filter({ has: page.locator('b', { hasText: /^칼국수$/ }) })).toContainText('어제 고민한 메뉴');
  expect(errors).toEqual([]);
});

test('11:30:00을 넘기면 주문이 막히고 그날은 자동 굶음', async ({ page }) => {
  await start(page, at('11:29:50'));
  await page.getByRole('button', { name: '오늘의 점심 열기' }).click();
  await expect(page.locator('.lunch-chip')).toHaveCount(10);
  await page.clock.setFixedTime(at('11:30:05'));
  const chip = page.getByRole('button', { name: '매콤한 거' });
  if (await chip.count()) await chip.click().catch(() => {});
  await expect.poll(async () => (await state(page)).lunch.days.map(d => [d.outcome, d.skip])).toEqual([['skipped', 'auto']]);
  await expect(page.locator('.lunch-sheet')).toContainText('건너뛰었어요');
  expect((await state(page)).lunch.dex).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(lunchLine(page)).toContainText('오늘 점심: 건너뜀');
});

test('12:00에 처음 열면 그날만 자동 굶음으로 기록하고 지난날을 만들지 않는다', async ({ page }) => {
  await start(page, at('12:00:00'));
  await expect.poll(async () => (await state(page)).lunch.days.map(d => [d.date, d.outcome, d.skip])).toEqual([['2026-10-14', 'skipped', 'auto']]);
  await expect(lunchLine(page)).toContainText('오늘 점심: 건너뜀');
});

test.describe('동작 줄이기', () => {
  test.use({ reducedMotion: 'reduce' });
  test('직접 굶기: 중립 문구, 연출 없이 바로 카드, 보상·벌칙 없음', async ({ page }) => {
    await start(page, at('09:00:00'));
    const before = await state(page);
    await page.getByRole('button', { name: '오늘의 점심 열기' }).click();
    await page.getByRole('button', { name: '오늘은 굶기' }).click();
    await expect(page.locator('.lunch-table-caption')).toHaveText('오늘 점심은 건너뛰었어요.');
    await page.getByRole('button', { name: '카드 보기' }).click();
    await expect(page.locator('.lunch-result')).toContainText('직접 건너뛴 날');
    const after = await state(page);
    expect([after.lunch.days[0]!.outcome, after.lunch.days[0]!.skip, after.totalXp, after.gold]).toEqual(['skipped', 'manual', before.totalXp, before.gold]);
  });
  test('주문해도 식탁은 완성 화면만 보여 준다', async ({ page }) => {
    await start(page, at('09:00:00'));
    await page.getByRole('button', { name: '오늘의 점심 열기' }).click();
    await page.getByRole('button', { name: '아무거나' }).click();
    await page.locator('.lunch-card').first().getByRole('button', { name: '이걸로' }).click();
    await page.getByRole('button', { name: '이 메뉴로 주문 확정' }).click();
    await expect(page.getByRole('button', { name: '카드 보기' })).toBeVisible();
    await expect(page.getByRole('button', { name: '결과 바로 보기' })).toHaveCount(0);
  });
});

test('값 없음·대체 값·1인분 미상은 측정값처럼 보이지 않는다', async ({ page }) => {
  await start(page, at('10:00:00'));
  await patchAndReload(page, s => ({ ...s, lunch: { dex: [], plan: null, days: [{ date: '2026-10-14', crave: 'foreign', cards: [{ menu: 'taco', claim: 'cold-shield', hype: true }, { menu: 'boneless-chicken', claim: 'cooked-to-order', hype: false }, { menu: 'hotdog', claim: 'sauce-separate', hype: false }, { menu: 'mul-naengmyeon', claim: 'spice-levels', hype: false }], report: null, outcome: null, menu: null, menuName: null, tips: [], skip: null, decidedAt: null, who: null, line: null, seen: false }] } }));
  await page.getByRole('button', { name: '오늘의 점심 열기' }).click();
  const cards = page.locator('.lunch-card');
  await expect(cards.nth(0)).toContainText('식약처 DB에 값 없음');
  await expect(cards.nth(1)).toContainText('대체 값');
  await expect(cards.nth(2)).toContainText('1인분 양 미상');
  const open = async (i: number) => { await cards.nth(i).getByRole('button', { name: '이걸로' }).click(); return page.locator('.lunch-nutrition'); };
  let n = await open(0);
  await expect(n).toContainText('식약처 DB에 값 없음'); await expect(n.locator('table')).toHaveCount(0); expect(await n.innerText()).not.toMatch(/\d+kcal/);
  await page.getByRole('button', { name: '다른 후보 보기' }).click();
  n = await open(1);
  await expect(n).toContainText('실제 측정값이 아니에요'); await expect(n).toContainText('닭튀김');
  await page.getByRole('button', { name: '다른 후보 보기' }).click();
  n = await open(2);
  await expect(n).toContainText('1인분 양 미상'); await expect(n.locator('th', { hasText: '1일 기준치' })).toHaveCount(0);
  await page.getByRole('button', { name: '다른 후보 보기' }).click();
  n = await open(3);
  await expect(n).toContainText('같은 음식의 다른 분석'); await expect(n.locator('th', { hasText: '1일 기준치' })).toHaveCount(1);
  expect(await n.locator('[style*=color]').count()).toBe(0);
});

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) test(`모바일 ${viewport.width}x${viewport.height}: 칩·후보 버튼 48px 이상, 가로 넘침 없음`, async ({ browser }) => {
  const ctx = await browser.newContext({ viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await start(page, at('10:30:00'));
  await page.getByRole('button', { name: '오늘의 점심 열기' }).click();
  const chips = page.locator('.lunch-chip'); await expect(chips).toHaveCount(10);
  for (const h of await chips.evaluateAll(els => els.map(e => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(48);
  const content = page.locator('.lunch-sheet .content');
  expect(await content.evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  await page.getByRole('button', { name: '든든한 거' }).click();
  await expect(page.locator('.lunch-card')).toHaveCount(4);
  for (const h of await page.locator('.lunch-card-actions button').evaluateAll(els => els.map(e => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(48);
  expect(await content.evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: `artifacts/lunch-${viewport.width}x${viewport.height}.png` });
  await ctx.close();
});

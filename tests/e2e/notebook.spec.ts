import { expect, test, type Page } from '@playwright/test';

type Hook = { game: { state: Record<string, unknown> & { cafe: Record<string, unknown> }; importState(s: unknown): void; publishArticle(): boolean; reprintArticle(n: number): boolean; seeReaction(n: number): void }; world: unknown };
const note = (p: Page) => p.getByRole('dialog', { name: '취재 수첩' });
const saved = (p: Page) => p.evaluate(() => JSON.parse(localStorage.getItem('medical-quest.v4.current')!));
async function start(page: Page) {
  await page.goto('/'); await page.getByRole('button', { name: '첫 출근하기' }).click();
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => {
    const g = (window as unknown as { __mq: Hook }).__mq.game, s = g.state;
    g.importState({ ...s, flags: ['met-editor', 'reported-back', 'q001-accepted', 'q001-entered', 'q001-observed', 'q001-briefed'],
      inspected: ['q001:heart-in', 'q001:heart-out', 'hx:hx-svc', 'shelf', 'window-seat', 'unknown-old-note'],
      ledger: ['quest.Q001.observe'], totalXp: 20, gold: 0, article: { lead: 'question', returning: 'heart-in', outgoing: 'heart-out', extra: null, checked: true, publishedAt: null },
      cafe: { ...s.cafe, welcomeUsed: true } }); location.reload();
  })]);
  await page.getByRole('button', { name: '취재 수첩' }).click(); await expect(note(page)).toBeVisible();
}

test('notebook has five exclusive homes, folds room/record detail, preserves old notes and remembers folds in the session', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); await start(page);
  await expect(note(page).getByRole('tab')).toHaveCount(5);
  await expect(note(page).getByRole('tabpanel')).toHaveCount(1);
  await note(page).getByRole('tab', { name: '취재 파일', exact: true }).click();
  await expect(note(page).getByRole('tabpanel')).toContainText('취재 파일');
  await note(page).locator('details[data-group="heart-in"] > summary').click();
  await expect(note(page)).toContainText('태아 순환의 흔적');
  await expect(note(page).getByRole('link', { name: /NHLBI/ })).toBeVisible();
  await note(page).getByRole('tab', { name: '인체 탐험', exact: true }).click();
  await expect(note(page).locator('[role=tabpanel]:not([hidden]) details[data-group^="room-"]')).toHaveCount(6);
  await expect(note(page).getByRole('tabpanel')).not.toContainText('관찰 A ·');
  await note(page).locator('details[data-group="room-heart"] > summary').click();
  await note(page).locator('details[data-group="hx-svc"] > summary').click();
  await expect(note(page).getByRole('tabpanel')).toContainText('상대정맥');
  await expect(note(page).getByRole('tabpanel')).toContainText('미발견 구조 8곳');
  await note(page).locator('details[data-group="room-heart"] > summary').click();
  await expect(note(page).locator('details[data-group="room-heart"]')).toHaveJSProperty('open', false);
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: '취재 수첩' }).click();
  await expect(note(page).getByRole('tab', { name: '인체 탐험' })).toHaveAttribute('aria-selected', 'true');
  await expect(note(page).locator('details[data-group="room-heart"]')).toHaveJSProperty('open', false);
  await note(page).getByRole('tab', { name: '동네·생활', exact: true }).click();
  await expect(note(page).getByRole('tabpanel')).toContainText('이전 버전·기타 보존 기록 1건');
  expect((await saved(page)).inspected).toContain('unknown-old-note');
  await expect(note(page).getByRole('tabpanel')).not.toContainText('태아 순환의 흔적'); expect(errors).toEqual([]);
});

test('notebook tabs, summaries and focus can be operated with the keyboard', async ({ page }) => {
  await start(page); await note(page).getByRole('tab', { name: '지금 할 일', exact: true }).focus();
  await page.keyboard.press('ArrowRight'); await expect(note(page).getByRole('tab', { name: '취재 파일' })).toBeFocused();
  await expect(note(page).getByRole('tab', { name: '취재 파일' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End'); await expect(note(page).getByRole('tab', { name: '동네·생활' })).toBeFocused();
  const panel = note(page).getByRole('tabpanel'); await panel.focus(); await page.keyboard.press('Tab');
  const first = note(page).locator('details[data-group="place-office"] > summary'); await expect(first).toBeFocused();
  await page.keyboard.press('Enter'); await expect(note(page).locator('details[data-group="place-office"]')).toHaveJSProperty('open', true);
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: '취재 수첩' })).toBeFocused();
});

test('legacy prototype-like record names do not break the notebook or its modal lifecycle', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); await start(page); await page.keyboard.press('Escape');
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => {
    const g = (window as unknown as { __mq: Hook }).__mq.game;
    g.importState({ ...g.state, inspected: [...g.state.inspected as string[], 'constructor', 'toString', '__proto__', 'hx:constructor', 'hx:toString', 'hx:__proto__'] }); location.reload();
  })]);
  await page.getByRole('button', { name: '취재 수첩' }).click(); await note(page).getByRole('tab', { name: '동네·생활' }).click();
  await expect(note(page).getByRole('tabpanel')).toContainText('이전 버전·기타 보존 기록 7건');
  await page.keyboard.press('Escape'); await expect(note(page)).toHaveCount(0); expect(errors).toEqual([]);
});

test('archived reader reactions reopen their actual saved results without awarding again', async ({ page }) => {
  await start(page); await page.keyboard.press('Escape');
  await page.evaluate(() => { const g = (window as unknown as { __mq: Hook }).__mq.game; g.publishArticle(); g.seeReaction(1); g.reprintArticle(1); g.seeReaction(2); });
  const before = await saved(page);
  await page.getByRole('button', { name: '취재 수첩' }).click(); await note(page).getByRole('tab', { name: '발행 기사', exact: true }).click();
  await note(page).getByRole('button', { name: /2번째 발행/ }).click();
  const result = page.getByRole('dialog', { name: '발행 결과 · 독자 반응' }); await expect(result).toHaveClass(/settled/);
  await expect(result.locator('.reaction-score b')).toHaveText(String(before.reactions.results[1].score));
  await expect(result).toContainText('이미 받은 보상'); await result.getByRole('button', { name: '월드로 돌아가기' }).click();
  expect([(await saved(page)).gold, (await saved(page)).totalXp, (await saved(page)).reactions.count]).toEqual([before.gold, 100, 2]);
  await page.getByRole('button', { name: '취재 수첩' }).click(); await note(page).locator('details[data-group="earlier-reactions"] > summary').click();
  await expect(note(page).getByRole('button', { name: /1번째 발행/ })).toBeVisible();
});

for (const [width, height] of [[390, 844], [844, 390]] as const) {
  test(`notebook ${width}×${height}: every category is reachable, body taps stay open and 200% text remains scrollable`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
    await start(page);
    const closeBox = (await note(page).getByRole('button', { name: '닫기' }).boundingBox())!;
    expect(closeBox.width).toBeGreaterThanOrEqual(48); expect(closeBox.height).toBeGreaterThanOrEqual(48);
    for (const name of ['지금 할 일', '취재 파일', '발행 기사', '인체 탐험', '동네·생활']) {
      const tab = note(page).getByRole('tab', { name, exact: true }); await tab.tap(); await expect(tab).toHaveAttribute('aria-selected', 'true');
      const r = (await tab.boundingBox())!; expect(r.height).toBeGreaterThanOrEqual(48); expect(r.width).toBeGreaterThanOrEqual(48); expect(r.x + r.width).toBeLessThanOrEqual(width);
    }
    await note(page).getByRole('tab', { name: '인체 탐험' }).tap(); await note(page).locator('details[data-group="room-heart"] > summary').tap();
    await note(page).locator('details[data-group="hx-svc"] > summary').tap(); await note(page).getByRole('tabpanel').locator('h3').tap(); await expect(note(page)).toBeVisible();
    await page.screenshot({ path: `artifacts/notebook/${width}x${height}.png`, animations: 'disabled' });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    expect(await note(page).evaluate(s => s.scrollWidth - s.clientWidth)).toBeLessThanOrEqual(1);
    await note(page).getByRole('tab', { name: '취재 파일' }).tap(); await note(page).locator('.content').evaluate(c => { c.scrollTop = c.scrollHeight; });
    await expect(note(page).getByRole('button', { name: '첫 기사 쓰기 · 초안 이어서' })).toBeVisible();
    await note(page).getByRole('button', { name: '닫기' }).tap(); await expect(note(page)).toHaveCount(0); await page.close();
  });
}

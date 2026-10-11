import { expect, test, type Page } from '@playwright/test';

type Hook = { game: { state: Record<string, unknown> & { cafe: Record<string, unknown> }; importState(s: unknown): void }; world: { player: { x: number; y: number } } | null };
const saved = (p: Page) => p.evaluate(() => JSON.parse(localStorage.getItem('medical-quest.v4.current')!));
const article = (p: Page) => p.getByRole('dialog', { name: '첫 기사 · 사라진 혈액 배달표' });
const result = (p: Page) => p.getByRole('dialog', { name: '발행 결과 · 독자 반응' });
async function start(page: Page, reduced = false) {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/'); await page.getByRole('button', { name: '첫 출근하기' }).click();
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => {
    const mq = (window as unknown as { __mq: Hook }).__mq, s = mq.game.state;
    mq.game.importState({ ...s, reactions: undefined, flags: ['met-editor', 'reported-back', 'q001-accepted', 'q001-entered', 'q001-observed', 'q001-briefed'],
      inspected: ['q001:heart-in', 'q001:heart-out'], ledger: ['quest.Q001.observe'], totalXp: 20, gold: 0,
      article: { lead: 'question', returning: 'heart-in', outgoing: 'heart-out', extra: null, checked: true, publishedAt: null }, cafe: { ...s.cafe, welcomeUsed: true } }); location.reload();
  })]);
  await page.getByRole('button', { name: '취재 수첩' }).click(); await page.getByRole('button', { name: '첫 기사 쓰기 · 초안 이어서' }).click();
}

test('publication reveals a saved random result, resumes interrupted reveal exactly, and new editions grant only gold', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); await start(page);
  await article(page).getByRole('button', { name: '게임 속 신문에 발행' }).click(); await expect(result(page)).toBeVisible();
  const first = await saved(page), receipt = first.reactions.results[0]; expect(first.gold).toBe(100 + receipt.bonusGold); expect(first.totalXp).toBe(100);
  await page.reload(); await expect(result(page)).toBeVisible(); await expect(result(page)).toHaveClass(/settled/);
  await expect(result(page).locator('.reaction-score b')).toHaveText(String(receipt.score));
  expect((await saved(page)).reactions.results[0]).toEqual(receipt);
  await result(page).getByRole('button', { name: '기사 다시 읽기' }).click();
  await expect(article(page)).toBeVisible();
  await article(page).getByRole('button', { name: '다시 발행 · 새 독자 반응' }).click(); await expect(result(page)).toBeVisible();
  const second = await saved(page), next = second.reactions.results[1];
  expect(second.reactions.count).toBe(2); expect(second.totalXp).toBe(100); expect(second.gold).toBe(first.gold + next.bonusGold);
  expect(next.xp).toBe(0); expect(next.baseGold).toBe(0);
  await page.keyboard.press('Escape'); await expect(result(page)).toBeVisible(); await expect(result(page)).toHaveClass(/settled/);
  await expect(result(page).locator('.reader-voice')).toHaveCount(3);
  await page.keyboard.press('Escape'); await expect(result(page)).toHaveCount(0);
  await page.reload(); await expect(result(page)).toHaveCount(0);
  expect((await saved(page)).reactions.seen).toBe(2); expect((await saved(page)).gold).toBe(second.gold); expect(errors).toEqual([]);
});

test('result stays open for outside taps, contains focus and movement, and normal animation settles', async ({ page }) => {
  await start(page); await article(page).getByRole('button', { name: '게임 속 신문에 발행' }).click();
  await page.mouse.click(2, 2); await expect(result(page)).toBeVisible();
  const before = await page.evaluate(() => ({ ...(window as unknown as { __mq: Hook }).__mq.world!.player }));
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(200); await page.keyboard.up('ArrowRight');
  const after = await page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.world!.player); expect(after.x).toBe(before.x);
  await expect(result(page)).toHaveClass(/settled/, { timeout: 5000 });
  const receipt = (await saved(page)).reactions.results[0]; await expect(result(page).locator('.reaction-score b')).toHaveText(String(receipt.score));
  await result(page).getByRole('button', { name: '닫기' }).focus(); await page.keyboard.press('Shift+Tab');
  await expect(result(page).getByRole('button', { name: '기사 다시 읽기' })).toBeFocused();
  await result(page).getByRole('button', { name: '월드로 돌아가기' }).click();
  await expect(page.getByRole('button', { name: '취재 수첩' })).toBeFocused();
});

test('holding Escape or Enter cannot both skip and dismiss one result', async ({ page }) => {
  await start(page); await article(page).getByRole('button', { name: '게임 속 신문에 발행' }).click();
  await page.keyboard.down('Escape'); await expect(result(page)).toHaveClass(/settled/);
  await page.keyboard.down('Escape'); await expect(result(page)).toBeVisible();
  await page.keyboard.up('Escape'); await result(page).getByRole('button', { name: '기사 다시 읽기' }).click();
  await article(page).getByRole('button', { name: '다시 발행 · 새 독자 반응' }).click();
  const skip = result(page).getByRole('button', { name: '결과 바로 보기' }); await skip.focus();
  await page.keyboard.down('Enter'); await expect(result(page)).toHaveClass(/settled/);
  await page.keyboard.down('Enter'); await expect(result(page)).toBeVisible();
  await page.keyboard.up('Enter'); await page.keyboard.press('Escape'); await expect(result(page)).toHaveCount(0);
});

test('failed save is visible in the result; retry persists the same score and money', async ({ page }) => {
  await start(page, true);
  await page.evaluate(() => {
    const w = window as unknown as { originalSet: typeof Storage.prototype.setItem }; w.originalSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k, v) { if (k === 'medical-quest.v4.current') throw new DOMException('full', 'QuotaExceededError'); w.originalSet.call(this, k, v); };
  });
  await article(page).getByRole('button', { name: '게임 속 신문에 발행' }).click();
  await expect(result(page).getByRole('alert')).toContainText('저장');
  const live = await page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.game.state);
  expect((await saved(page)).article.publishedAt).toBeNull();
  await result(page).getByRole('button', { name: '다시 저장' }).click();
  await expect(result(page).getByRole('alert')).toBeVisible();
  await page.evaluate(() => { Storage.prototype.setItem = (window as unknown as { originalSet: typeof Storage.prototype.setItem }).originalSet; });
  await result(page).getByRole('button', { name: '다시 저장' }).click(); await expect(result(page).getByRole('alert')).toBeHidden();
  expect((await saved(page)).reactions).toEqual(live.reactions); expect((await saved(page)).gold).toBe(live.gold);
});

for (const [width, height] of [[390, 844], [844, 390]] as const) {
  test(`result ${width}×${height}: reduced motion, reachable actions, hidden world confirm and readable reaction`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    await start(page, true); await article(page).getByRole('button', { name: '게임 속 신문에 발행' }).tap();
    await expect(result(page)).toHaveClass(/settled/); await expect(page.locator('.mobile-confirm')).toBeHidden();
    const closeBox = (await result(page).getByRole('button', { name: '닫기' }).boundingBox())!;
    expect(closeBox.width).toBeGreaterThanOrEqual(48); expect(closeBox.height).toBeGreaterThanOrEqual(48);
    const metrics = await result(page).evaluate(s => ({ overflow: s.scrollWidth - s.clientWidth, controls: [...s.querySelectorAll('.reaction-actions button')].map(b => b.getBoundingClientRect().toJSON()) }));
    expect(metrics.overflow).toBeLessThanOrEqual(1);
    for (const b of metrics.controls) { expect(b.width).toBeGreaterThanOrEqual(48); expect(b.height).toBeGreaterThanOrEqual(48); expect(b.bottom).toBeLessThanOrEqual(height); }
    await page.screenshot({ path: `artifacts/article-reactions/${width}x${height}.png`, animations: 'disabled' });
    await result(page).getByRole('button', { name: '월드로 돌아가기' }).tap(); await expect(result(page)).toHaveCount(0); await page.close();
  });
}

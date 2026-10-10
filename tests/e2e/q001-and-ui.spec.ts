import { expect, test, type Page } from '@playwright/test';

type W = { roomId: string; tap(p: { x: number; y: number }): void; player: { x: number; y: number }; traffic: { t: number }; waitingAt: unknown };
type Hook = { world: W | null; game: { state: Record<string, unknown> & { cafe: Record<string, unknown> }; importState(s: unknown): void } };
const room = (page: Page) => page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.world?.roomId ?? null);
const tap = (page: Page, x: number, y: number) => page.evaluate(([px, py]) => (window as unknown as { __mq: Hook }).__mq.world!.tap({ x: px!, y: py! }), [x, y]);
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('medical-quest.v4.current')!));
async function finishDialog(page: Page) {
  for (let i = 0; i < 14 && await page.locator('.dialog').count(); i++) { await page.keyboard.press('e'); await page.waitForTimeout(120); }
}
async function untilChoices(page: Page) {
  for (let i = 0; i < 10 && !(await page.locator('.dialog .choices').count()); i++) { await page.keyboard.press('e'); await page.waitForTimeout(150); }
}
async function start(page: Page, patch: Record<string, unknown>) {
  await page.goto('/');
  await page.getByRole('button', { name: '첫 출근하기' }).click();
  // Import and reload in one task so the running frame loop cannot write the old position back.
  await Promise.all([
    page.waitForEvent('load'),
    page.evaluate(p => { const mq = (window as unknown as { __mq: Hook }).__mq; const s = mq.game.state; mq.game.importState({ ...s, ...p, cafe: { ...s.cafe, welcomeUsed: true } }); location.reload(); }, patch),
  ]);
  await page.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world);
  await page.waitForTimeout(300);
}

test('Q001 entry: commission → Bodyscope → heart model → two observations → back to the newsroom', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await start(page, { flags: ['met-editor', 'reported-back'] });
  await expect(page.locator('.quest p')).toContainText('첫 취재');

  await tap(page, 88, 80);
  await expect(page.locator('.dialog')).toBeVisible({ timeout: 8000 });
  await untilChoices(page);
  await page.locator('.choice', { hasText: '취재 맡기' }).click();
  await finishDialog(page);
  await expect(page.locator('.quest p')).toContainText('바디스코프');

  await tap(page, 308, 118);
  await expect(page.locator('.dialog')).toBeVisible({ timeout: 10000 });
  await untilChoices(page);
  await page.locator('.choice', { hasText: '심장 모형으로 들어가기' }).click();
  await expect.poll(() => room(page), { timeout: 8000 }).toBe('heart');
  await expect(page.locator('.quest p')).toContainText('0/2');

  await page.waitForTimeout(700);
  await tap(page, 272, 110);
  await expect(page.locator('.dialog')).toBeVisible({ timeout: 12000 });
  // Tap anywhere on the screen (not the dialog) to finish and close it.
  for (let i = 0; i < 6 && await page.locator('.dialog').count(); i++) { await page.mouse.click(640, 120); await page.waitForTimeout(150); }
  await expect(page.locator('.dialog')).toHaveCount(0);
  await expect(page.locator('.quest p')).toContainText('1/2');

  await tap(page, 176, 110);
  await expect(page.locator('.dialog')).toBeVisible({ timeout: 12000 });
  await finishDialog(page);
  await expect(page.locator('.quest p')).toContainText('귀환');
  const s = await saved(page);
  expect([s.totalXp, s.flags.includes('q001-observed')]).toEqual([20, true]);
  await expect(page.locator('.chip .rank')).toContainText('20/100XP');

  await tap(page, 120, 252);
  await expect(page.locator('.dialog')).toBeVisible({ timeout: 12000 });
  await untilChoices(page);
  await page.locator('.choice', { hasText: '돌아가기' }).click();
  await expect.poll(() => room(page), { timeout: 8000 }).toBe('newsroom');

  await page.waitForTimeout(400);
  await tap(page, 88, 80);
  await expect(page.locator('.dialog')).toBeVisible({ timeout: 10000 });
  await finishDialog(page);
  expect((await saved(page)).flags).toContain('q001-briefed');
  expect(errors).toEqual([]);
});

test('red pedestrian light holds the reporter at the curb, green lets them cross', async ({ page }) => {
  await start(page, { flags: ['met-editor'], at: { room: 'street', x: 372, y: 432, facing: 'right' } });
  expect(await room(page)).toBe('street');
  await page.evaluate(() => { (window as unknown as { __mq: Hook }).__mq.world!.traffic.t = 0; });
  await tap(page, 500, 432);
  await page.waitForTimeout(1500);
  const held = await page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.world!.player.x);
  expect(held).toBeLessThan(384);
  await expect(page.locator('.toast')).toContainText('빨간불');
  await page.evaluate(() => { (window as unknown as { __mq: Hook }).__mq.world!.traffic.t = 10; });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.world!.player.x), { timeout: 6000 }).toBeGreaterThan(480);
});

test('no corner action button; windows close by tapping anywhere', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  await page.goto('/');
  await page.getByRole('button', { name: '첫 출근하기' }).click();
  await expect(page.locator('.action')).toHaveCount(0);
  await page.getByRole('button', { name: '취재 수첩' }).click();
  await expect(page.getByRole('dialog', { name: '취재 수첩' })).toBeVisible();
  await page.getByRole('dialog', { name: '취재 수첩' }).locator('h3').first().click();
  await expect(page.getByRole('dialog', { name: '취재 수첩' })).toHaveCount(0);
  await page.close();
});

import { expect, test, type Page } from '@playwright/test';

type Hook = { world: { roomId: string; locked: boolean; player: { x: number; y: number } }; game: { state: Record<string, unknown>; importState(s: unknown): void } };
const snapshot = (page: Page) => page.evaluate(() => {
  const mq = (window as unknown as { __mq: Hook }).__mq;
  return { room: mq.world.roomId, locked: mq.world.locked, x: mq.world.player.x, y: mq.world.player.y, entered: (mq.game.state.flags as string[]).includes('q001-entered'), xp: mq.game.state.totalXp, gold: mq.game.state.gold };
});
async function entry(page: Page) {
  await page.goto('/'); await page.getByRole('button', { name: '첫 출근하기' }).click();
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => {
    const mq = (window as unknown as { __mq: Hook }).__mq;
    mq.game.importState({ ...mq.game.state, flags: ['met-editor', 'reported-back', 'q001-accepted', 'heart-guided'], at: { room: 'newsroom', x: 308, y: 142, facing: 'up' } }); location.reload();
  })]);
  await expect(page.locator('.dialog')).toBeVisible();
  for (let i = 0; i < 12 && !await page.locator('.dialog .choices').count(); i++) { await page.keyboard.press('e'); await page.waitForTimeout(120); }
  await page.getByRole('button', { name: /심장 속으로 들어가기/ }).click();
  await expect(page.getByRole('dialog', { name: '심장으로 들어가기' })).toBeVisible();
}

test('entry film waits 4.2 seconds, shows body → zoom → beat → vena cava and commits entry only at the end', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await entry(page);
  const film = page.locator('.organ-entry');
  await expect(film).toHaveAttribute('data-step', 'body');
  await page.screenshot({ path: 'artifacts/organ-entry-body.png' });
  const before = await snapshot(page); expect(before.room).toBe('newsroom'); expect(before.entered).toBe(false);
  await page.keyboard.down('ArrowDown');
  await expect(film).toHaveAttribute('data-step', 'zoom');
  await expect(film).toHaveAttribute('data-step', 'beat');
  await page.screenshot({ path: 'artifacts/organ-entry-heart.png' });
  expect(await snapshot(page)).toEqual(before);
  await expect(film).toHaveAttribute('data-step', 'enter');
  await page.keyboard.up('ArrowDown');
  await expect.poll(async () => (await snapshot(page)).room).toBe('heart');
  await expect(film).toHaveCount(0);
  const after = await snapshot(page); expect(after.entered).toBe(true); expect(after.xp).toBe(before.xp); expect(after.gold).toBe(before.gold);
  expect(errors).toEqual([]);
});

for (const [width, height] of [[390, 844], [844, 390]] as const) {
  test(`entry on ${width}×${height}: reduced motion, focus, no outside dismissal, skip once, saved resume`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: true, isMobile: true, deviceScaleFactor: 3, reducedMotion: 'reduce' });
    await entry(page);
    const film = page.locator('.organ-entry'), skip = film.getByRole('button', { name: '바로 들어가기' });
    await expect(skip).toBeFocused();
    const box = (await skip.boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(48); expect(box.y + box.height).toBeLessThanOrEqual(height);
    await page.keyboard.press('Tab'); await expect(film.getByRole('button', { name: '연출 건너뛰고 들어가기' })).toBeFocused();
    await page.locator('.entry-stage').tap(); await expect(film).toBeVisible();
    await page.screenshot({ path: `artifacts/organ-entry-${width}.png` });
    await skip.evaluate(b => { (b as HTMLButtonElement).click(); (b as HTMLButtonElement).click(); });
    await expect.poll(async () => (await snapshot(page)).room).toBe('heart');
    await expect.poll(async () => (await snapshot(page)).locked).toBe(false);
    await expect(page.locator('#view')).toBeFocused();
    await page.reload(); await expect.poll(async () => (await snapshot(page)).room).toBe('heart');
    await expect(film).toHaveCount(0);
    await page.close();
  });
}

test('reload during introduction preserves newsroom entry without marking heart visited', async ({ page }) => {
  await entry(page); await page.reload();
  await expect.poll(async () => (await snapshot(page)).room).toBe('newsroom');
  expect((await snapshot(page)).entered).toBe(false);
});

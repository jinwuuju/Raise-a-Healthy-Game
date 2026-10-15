import { expect, test, type Page } from '@playwright/test';

async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '첫 출근하기' }).click();
}
const position = (page: Page) => page.evaluate(() => {
  const p = (window as unknown as { __mq: { world: { player: { x: number; y: number } } } }).__mq.world.player;
  return { x: p.x, y: p.y };
});

async function scopeState(page: Page, accepted: boolean, y = 176) {
  await start(page);
  await Promise.all([page.waitForEvent('load'), page.evaluate(({ accepted, y }) => {
    const game = (window as unknown as { __mq: { game: { state: Record<string, unknown> & { cafe: Record<string, unknown> }; importState(s: unknown): void } } }).__mq.game;
    game.importState({ ...game.state, flags: accepted ? ['met-editor', 'reported-back', 'q001-accepted'] : [], cafe: { ...game.state.cafe, welcomeUsed: true }, at: { room: 'newsroom', x: 464, y, facing: 'up' } });
    location.reload();
  }, { accepted, y })]);
  await page.waitForFunction(() => !!(window as unknown as { __mq?: { world?: unknown } }).__mq?.world);
}

test('standing in front of the Bodyscope opens entry without clicking, and cancellation stays closed', async ({ page }) => {
  await scopeState(page, true);
  await page.keyboard.down('w'); await expect.poll(async () => (await position(page)).y).toBeLessThan(142); await page.keyboard.up('w');
  await expect(page.locator('.dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: /심장 속으로 들어가기/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await expect(page.locator('.dialog')).toHaveCount(0);
  await page.keyboard.down('s'); await expect.poll(async () => (await position(page)).y).toBeGreaterThan(168); await page.keyboard.up('s');
  await page.keyboard.down('w'); await expect.poll(async () => (await position(page)).y).toBeLessThan(142); await page.keyboard.up('w');
  await expect(page.locator('.dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: /심장 속으로 들어가기/ })).toBeVisible();
  await page.getByRole('button', { name: /심장 속으로 들어가기/ }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __mq: { world: { roomId: string } } }).__mq.world.roomId)).toBe('heart');
});

test('Bodyscope auto entry respects the commission and does not open behind the device', async ({ page }) => {
  await scopeState(page, false, 138);
  await page.waitForTimeout(350);
  await expect(page.locator('.dialog')).toHaveCount(0);
  await page.reload();
  await page.waitForFunction(() => !!(window as unknown as { __mq?: { game?: unknown } }).__mq?.game); // the map chunk loads before the game hook exists (D098)
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => {
    const game = (window as unknown as { __mq: { game: { state: Record<string, unknown>; importState(s: unknown): void } } }).__mq.game;
    game.importState({ ...game.state, flags: ['met-editor', 'reported-back', 'q001-accepted'], at: { room: 'newsroom', x: 464, y: 90, facing: 'up' } }); location.reload();
  })]);
  await page.waitForTimeout(350);
  await expect(page.locator('.dialog')).toHaveCount(0);
});

test('menu clears held movement and contains keyboard focus', async ({ page }) => {
  await start(page);
  await page.keyboard.down('d');
  await page.waitForTimeout(100);
  await page.keyboard.press('Escape');
  const before = await position(page);
  await page.waitForTimeout(200);
  expect(await position(page)).toEqual(before);
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('.sheet'))).toBe(true);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  expect(await position(page)).toEqual(before);
  await page.keyboard.up('d');
});

test('appearance Escape cancels editing without opening another window', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: '기자 정보', exact: true }).click();
  await page.getByRole('button', { name: '외형 꾸미기', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.creator')).toHaveCount(0);
  await expect(page.locator('.sheet')).toHaveCount(0);
  await expect(page.locator('.hud')).toBeVisible();
  await expect(page.getByRole('button', { name: '기자 정보', exact: true })).toBeFocused();
});

test('dialog input cannot reach HUD controls through Tab or minimap', async ({ page }) => {
  await start(page);
  await page.evaluate(() => (window as unknown as { __mq: { world: { tap(p: { x: number; y: number }): void } } }).__mq.world.tap({ x: 88, y: 80 }));
  await expect(page.locator('.dialog')).toBeVisible({ timeout: 8000 });
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('.dialog'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#view')).toBeFocused();
});

test('second tab cannot overwrite the writer and can export its in-memory record', async ({ page }) => {
  await start(page);
  const other = await page.context().newPage();
  await other.goto('/');
  await other.waitForFunction(() => !!(window as unknown as { __mq?: { game?: unknown } }).__mq?.game);
  // The time-of-day setting is gone (D068); a progress change in the second tab is the write attempt instead.
  await other.evaluate(() => (window as unknown as { __mq: { game: { flag(f: string): void } } }).__mq.game.flag('second-tab-probe'));
  await other.getByRole('button', { name: '메뉴', exact: true }).click();
  await other.getByRole('button', { name: '지금 저장하기' }).click();
  await expect(other.locator('.toast')).toContainText('저장 실패');
  expect(await other.evaluate(() => (window as unknown as { __mq: { game: { state: { flags: string[] } } } }).__mq.game.state.flags)).toContain('second-tab-probe');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('medical-quest.v4.current')!).flags)).not.toContain('second-tab-probe');
  const download = other.waitForEvent('download');
  await other.getByRole('button', { name: '기록 파일로 내보내기' }).click();
  expect((await download).suggestedFilename()).toContain('medical-quest');
  await other.close();
});

test('storage unavailability is visible and still permits playing and exporting', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
  await start(page);
  await expect(page.locator('.save-error')).toBeVisible();
  await page.getByRole('button', { name: '메뉴', exact: true }).click();
  await expect(page.locator('.sheet .save-message')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '기록 파일로 내보내기' }).click();
  await download;
});

test('full storage still loads the existing reporter and reports write failure inside the menu', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('기자 이름').fill('보존테스트');
  await page.getByRole('button', { name: '첫 출근하기' }).click();
  const original = await page.evaluate(() => localStorage.getItem('medical-quest.v4.current'));
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('quota exceeded'); }; });
  await page.reload();
  await expect(page.locator('.chip .name')).toHaveText('보존테스트');
  // A progress change is the write attempt (the former time-of-day button was removed, D068).
  await page.evaluate(() => (window as unknown as { __mq: { game: { flag(f: string): void } } }).__mq.game.flag('full-storage-probe'));
  await page.getByRole('button', { name: '메뉴', exact: true }).click();
  await expect(page.locator('.sheet .save-message')).toContainText('quota exceeded');
  await page.getByRole('button', { name: '지금 저장하기' }).click();
  await expect(page.locator('.toast')).toContainText('저장 실패');
  expect(await page.evaluate(() => localStorage.getItem('medical-quest.v4.current'))).toBe(original);
});

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`mobile ${viewport.width}x${viewport.height}: scrolling menus stays open and focus stays inside`, async ({ browser }) => {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
    await start(page);
    await page.getByRole('button', { name: '메뉴', exact: true }).click();
    const content = page.locator('.sheet .content');
    const box = (await content.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 800);
    await expect(page.locator('.sheet')).toBeVisible();
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('.sheet'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: '메뉴', exact: true })).toBeFocused();
    await page.close();
  });
}

import { expect, test, type Page } from '@playwright/test';

// D068 lunch step 5: the game follows the device clock read in Asia/Seoul. The in-game time-of-day setting is gone;
// old schema4 saves that still carry settings.time are read, ignored, and kept as a backup on the first new write.

type Hook = { world: { roomId: string; timeOfDay: string; player: { x: number; y: number }; tap(p: { x: number; y: number }): void } | null; game: { state: Record<string, unknown> & { cafe: Record<string, unknown> }; importState(s: unknown): void } };
const CURRENT = 'medical-quest.v4.current', BACKUP1 = 'medical-quest.v4.backup1';
const hook = (page: Page) => page.evaluate(() => { const w = (window as unknown as { __mq: Hook }).__mq.world; return w ? { room: w.roomId, tod: w.timeOfDay, x: w.player.x } : null; });

async function startAt(page: Page, patch: Record<string, unknown>) {
  await page.goto('/');
  await page.getByRole('button', { name: '첫 출근하기' }).click();
  await moveTo(page, patch);
}

/** Import a patched save and reload in one task so the running frame loop cannot write the old position back. */
async function moveTo(page: Page, patch: Record<string, unknown>) {
  await Promise.all([
    page.waitForEvent('load'),
    page.evaluate(p => { const mq = (window as unknown as { __mq: Hook }).__mq; const s = mq.game.state; mq.game.importState({ ...s, ...p, cafe: { ...s.cafe, welcomeUsed: true } }); location.reload(); }, patch),
  ]);
  await page.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world);
  await page.waitForTimeout(300);
}

/** Mean brightness of the game canvas (sampled grid). */
const brightness = (page: Page) => page.evaluate(() => {
  const c = document.querySelector<HTMLCanvasElement>('#view')!, g = c.getContext('2d')!;
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let sum = 0, n = 0;
  for (let y = 0; y < c.height; y += 23) for (let x = 0; x < c.width; x += 23) { const i = (y * c.width + x) * 4; sum += d[i]! + d[i + 1]! + d[i + 2]!; n++; }
  return sum / n / 3;
});

test('menu has no time-of-day setting and explains the Seoul clock', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '첫 출근하기' }).click();
  await page.getByRole('button', { name: '메뉴', exact: true }).click();
  const sheet = page.locator('.sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('heading', { name: /시간대/ })).toHaveCount(0);
  for (const name of ['낮', '노을', '밤', '실제 시간']) await expect(sheet.getByRole('button', { name, exact: true })).toHaveCount(0);
  await expect(sheet).toContainText('기기 시계의 한국 시간(서울)');
  await expect(sheet).toContainText('오전 7시부터 낮, 오후 5시부터 노을, 오후 7시부터 밤');
  expect(await page.evaluate(k => 'settings' in JSON.parse(localStorage.getItem(k)!), CURRENT)).toBe(false);
});

test('old save with settings.time loads with progress, and the first new save drops it and backs up the original', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await startAt(page, { flags: ['met-editor'], totalXp: 120, gold: 40, at: { room: 'street', x: 372, y: 432, facing: 'right' } });
  // Write an old-format save (settings.time = 'night') and reload in the same task. The running tab cannot write it back:
  // the save store refuses to overwrite a slot that changed underneath it.
  const raw = await Promise.all([
    page.waitForEvent('load'),
    page.evaluate(([cur, b1]) => {
      const s = JSON.parse(localStorage.getItem(cur!)!); s.settings = { time: 'night' };
      const text = JSON.stringify(s); localStorage.setItem(cur!, text); localStorage.removeItem(b1!); localStorage.removeItem('medical-quest.v4.backup2');
      location.reload(); return text;
    }, [CURRENT, BACKUP1]),
  ]).then(([, text]) => text);
  await page.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world);
  const state = await page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.game.state);
  expect('settings' in state).toBe(false);
  expect([state.totalXp, state.gold, (state.at as { room: string }).room]).toEqual([120, 40, 'district']); // old street saves reopen in the real-scale district (D096)
  await expect(page.locator('.save-error')).toBeHidden();
  await page.getByRole('button', { name: '메뉴', exact: true }).click();
  await page.getByRole('button', { name: '지금 저장하기' }).click();
  await expect(page.locator('.toast')).toContainText('저장했어요');
  const stored = await page.evaluate(([cur, b1]) => ({ current: JSON.parse(localStorage.getItem(cur!)!), backup: localStorage.getItem(b1!) }), [CURRENT, BACKUP1]);
  expect(stored.current.settings).toBeUndefined();
  expect([stored.current.totalXp, stored.current.gold]).toEqual([120, 40]);
  expect(stored.backup).toBe(raw);
  expect(errors).toEqual([]);
});

test.describe('device in another time zone', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });

  test('street lighting follows Seoul time, not the device time zone', async ({ page }) => {
    test.setTimeout(60000);
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.clock.setFixedTime(new Date('2026-10-14T03:00:00Z')); // Seoul 12:00 · Los Angeles 20:00 (13 Oct)
    await startAt(page, { flags: ['met-editor'], at: { room: 'street', x: 372, y: 432, facing: 'right' } });
    expect(await page.evaluate(() => new Date().getHours())).toBe(20);
    expect((await hook(page))?.tod).toBe('day');
    await page.waitForTimeout(300);
    const day = await brightness(page);

    await page.clock.setFixedTime(new Date('2026-10-14T08:30:00Z')); // Seoul 17:30 · Los Angeles 01:30
    expect((await hook(page))?.tod).toBe('dusk');

    await page.clock.setFixedTime(new Date('2026-10-14T12:00:00Z')); // Seoul 21:00 · Los Angeles 05:00
    expect(await page.evaluate(() => new Date().getHours())).toBe(5);
    expect((await hook(page))?.tod).toBe('night');
    await page.waitForTimeout(300);
    const night = await brightness(page);
    expect(night).toBeLessThan(day - 5);

    // Walking still works at night and nothing in the save records a time setting.
    const x0 = (await hook(page))!.x;
    const pos = () => page.evaluate(() => { const p = (window as unknown as { __mq: { world: { player: { x: number; y: number } } } }).__mq.world.player; return { x: p.x, y: p.y }; });
    void x0;
    const start = await pos();
    await page.evaluate(async () => { const cu = '/src/world/path.ts'; const { findPath } = await import(/* @vite-ignore */ cu); const w = (window as unknown as { __mq: { world: { player: { x: number; y: number }; tap(p: { x: number; y: number }): void } } }).__mq.world;
      for (const dx of [130, 170, 100, 210]) for (const dy of [0, 20, 40, -20]) { const q = { x: w.player.x + dx, y: w.player.y + dy }; if (findPath('district', w.player, q).length) { w.tap(q); return; } } });
    // With a fixed clock the frame loop advances slowly; give the walk a few seconds before measuring.
    for (let k = 0; k < 6; k++) { await page.waitForTimeout(500); await pos(); }
    await expect.poll(async () => { const q = await pos(); return Math.hypot(q.x - start.x, q.y - start.y); }, { timeout: 8000 }).toBeGreaterThan(20);
    expect(await page.evaluate(k => 'settings' in JSON.parse(localStorage.getItem(k)!), CURRENT)).toBe(false);

    // Indoors stays lit whatever the hour.
    await moveTo(page, { at: { room: 'newsroom', x: 212, y: 176, facing: 'down' } });
    expect((await hook(page))?.room).toBe('newsroom');
    const indoorNight = await brightness(page);
    await page.clock.setFixedTime(new Date('2026-10-14T03:00:00Z'));
    await page.waitForTimeout(300);
    expect(Math.abs(indoorNight - await brightness(page))).toBeLessThan(2);
    expect(errors).toEqual([]);
  });
});

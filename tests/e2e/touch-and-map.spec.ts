import { expect, test, devices, type Page } from '@playwright/test';

type Hook = { world: { roomId: string; player: { x: number; y: number; facing: string } } | null; game: { state: Record<string, unknown> & { cafe: Record<string, unknown> }; importState(s: unknown): void } };
const player = (page: Page) => page.evaluate(() => ({ ...(window as unknown as { __mq: Hook }).__mq.world!.player }));

async function enterHeart(page: Page, touch: boolean) {
  await page.goto('/');
  const b = page.getByRole('button', { name: '첫 출근하기' });
  if (touch) await b.tap(); else await b.click();
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => {
    const mq = (window as unknown as { __mq: Hook }).__mq; const s = mq.game.state;
    mq.game.importState({ ...s, flags: ['met-editor', 'reported-back', 'q001-accepted', 'q001-entered', 'heart-guided'], cafe: { ...s.cafe, welcomeUsed: true }, at: { room: 'heart', x: 230, y: 200, facing: 'down' } });
    location.reload();
  })]);
  await page.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world);
  await page.waitForTimeout(500);
}

// Same viewport, touch and user agent as an iPhone 13, on the configured Chromium.
const { defaultBrowserType: _browser, ...iphone } = devices['iPhone 13'];

test.describe('touch screen', () => {
  test.use(iphone);
  test('the movement ball walks the reporter while held and stops on release; the heart minimap opens room, heart and body maps', async ({ page, context }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await enterHeart(page, true);
    const ball = page.locator('.joystick .base');
    await expect(ball).toBeVisible();
    const b = (await ball.boundingBox())!, cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    const p0 = await player(page);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
    for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx, y: cy - i * 8 }] }); await page.waitForTimeout(30); }
    await page.waitForTimeout(900);
    const p1 = await player(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(300);
    const p2 = await player(page);
    await page.waitForTimeout(400);
    const p3 = await player(page);
    expect(p0.y - p1.y).toBeGreaterThan(25);
    expect(p1.facing).toBe('up');
    expect(Math.abs(p3.y - p2.y)).toBeLessThan(2);
    // The minimap is shown inside the heart and opens the three map scales.
    await expect(page.locator('.minimap')).toBeVisible();
    await expect(page.locator('.minimap .cap')).toHaveText('우심방');
    await page.locator('.minimap').tap();
    await expect(page.locator('.sheet')).toBeVisible();
    await expect(page.locator('.sheet .place .meter')).toContainText('이 방에서 찾은 구조');
    for (const [tab, text] of [['인체', '탐험할 수 있는 기관'], ['심장', '심장 탐험 기록'], ['이 방', '이 방에서 찾은 구조']] as const) {
      await page.locator('.sheet .scale button', { hasText: tab }).tap();
      await expect(page.locator('.sheet .place .meter')).toContainText(text);
      await expect(page.locator('.sheet canvas')).toHaveCount(1);
      await expect(page.locator('.sheet .scale button.on')).toHaveText(tab);
    }
    // Tapping the map itself does not close the window.
    await page.locator('.sheet .stage').tap();
    await expect(page.locator('.sheet')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('a tap on the world still walks there with touch events', async ({ page }) => {
    await enterHeart(page, true);
    const p0 = await player(page);
    const vp = page.viewportSize()!;
    await page.touchscreen.tap(vp.width / 2, vp.height * 0.72);
    await page.waitForTimeout(1500);
    expect((await player(page)).y).toBeGreaterThan(p0.y + 20);
  });
});

test('PC shows no movement ball but keeps the heart minimap', async ({ page }) => {
  await enterHeart(page, false);
  await expect(page.locator('.joystick')).toBeHidden();
  await expect(page.locator('.minimap')).toBeVisible();
  await expect(page.locator('.cycle')).toBeVisible();
});

test('heart structures are named from a few steps away, not only when touching them', async ({ page }) => {
  await enterHeart(page, false);
  // At (230, 200) the guide robot is about 50px away and the return pad about 90px: both reach range is wider now.
  await page.waitForTimeout(300);
  const seen = await page.evaluate(() => { const w = (window as unknown as { __mq: { world: { aware: { id: string }[]; near: { id: string } | null } } }).__mq.world; return { aware: w.aware.map(t => t.id), near: w.near?.id ?? null }; });
  expect(seen.aware).toContain('guide');
  expect(seen.near).toBeNull();
});

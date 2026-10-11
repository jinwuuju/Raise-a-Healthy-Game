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
    for (const [tab, text] of [['이 방', '탐험 기록'], ['심장', '판막은'], ['인체', '심장']] as const) {
      await page.locator('.sheet .seg button', { hasText: tab }).tap();
      await expect(page.locator('.sheet .atlas p').first()).toContainText(text);
      await expect(page.locator('.sheet canvas')).toHaveCount(1);
    }
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

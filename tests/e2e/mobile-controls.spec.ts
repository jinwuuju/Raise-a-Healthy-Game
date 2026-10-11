import { expect, test, type Page } from '@playwright/test';

type Hook = { world: { player: { x: number; y: number }; near: { id: string } | null; roomId: string } | null; game: { state: Record<string, unknown> & { cafe: Record<string, unknown> }; importState(s: unknown): void } };
async function start(page: Page, heart = false, scope = false) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/'); await page.getByRole('button', { name: '첫 출근하기' }).click();
  await Promise.all([page.waitForEvent('load'), page.evaluate(({ heart, scope }) => {
    const mq = (window as unknown as { __mq: Hook }).__mq, s = mq.game.state;
    mq.game.importState({ ...s, flags: heart || scope ? ['met-editor', 'reported-back', 'q001-accepted', 'q001-entered', 'heart-guided'] : [],
      at: heart ? { room: 'heart', x: 230, y: 200, facing: 'down' } : scope ? { room: 'newsroom', x: 308, y: 142, facing: 'down' } : { room: 'newsroom', x: 88, y: 122, facing: 'up' },
      cafe: { ...s.cafe, welcomeUsed: heart || scope } }); location.reload();
  }, { heart, scope })]);
  await page.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world);
}
const position = (page: Page) => page.evaluate(() => ({ ...(window as unknown as { __mq: Hook }).__mq.world!.player }));

for (const [width, height] of [[390, 844], [844, 390]] as const) {
  test(`mobile confirm at ${width}×${height}: aligned thumb controls, one advance per touch and contained dialog focus`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await start(page);
    const confirm = page.getByRole('button', { name: '확인', exact: true });
    await expect(confirm).toBeEnabled();
    const ball = (await page.locator('.joystick .base').boundingBox())!, action = (await confirm.boundingBox())!;
    expect(Math.abs(ball.y + ball.height / 2 - action.y - action.height / 2)).toBeLessThan(1);
    expect(action.width).toBeGreaterThanOrEqual(48); expect(action.height).toBeGreaterThanOrEqual(48);
    expect(action.x).toBeGreaterThan(width / 2);
    const before = await position(page);
    await confirm.tap();
    await expect(page.locator('.dialog .text')).toContainText('어서 와요');
    // A synthesized mouse click after the touch must not skip the first line.
    await confirm.dispatchEvent('click', { detail: 1 });
    await expect(page.locator('.dialog .text')).toContainText('어서 와요');
    const d = (await page.locator('.dialog').boundingBox())!, c = (await confirm.boundingBox())!;
    expect(d.y).toBeGreaterThanOrEqual(0); expect(d.y + d.height).toBeLessThan(c.y);
    await confirm.tap(); await expect(page.locator('.dialog .text')).toContainText('여기는 논현로');
    await page.keyboard.press('Tab'); await expect(confirm).toBeFocused();
    await page.keyboard.press('Tab'); await expect(confirm).toBeFocused();
    await page.screenshot({ path: `artifacts/mobile-controls/${width}x${height}-dialog.png`, animations: 'disabled' });
    await confirm.tap(); await expect(page.locator('.dialog .text')).toContainText('첫 취재 전에');
    await confirm.tap(); await expect(page.locator('.dialog')).toHaveCount(0);
    const after = await position(page); expect(after.x).toBe(before.x); expect(after.y).toBe(before.y);
    await page.getByRole('button', { name: '메뉴', exact: true }).tap(); await expect(confirm).toBeHidden();
    await page.getByRole('button', { name: '닫기', exact: true }).tap(); await expect(confirm).toBeVisible();
    expect(errors).toEqual([]); await page.close();
  });

  test(`heart cycle at ${width}×${height}: starts compact, toggles independently, stays clear of confirm and still opens the map`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await start(page, true);
    const toggle = page.getByRole('button', { name: '심장 주기 접기/펼치기' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false'); await expect(page.locator('.cycle-body')).toBeHidden();
    const compact = (await page.locator('.cycle').boundingBox())!;
    await page.screenshot({ path: `artifacts/mobile-controls/${width}x${height}-collapsed.png`, animations: 'disabled' });
    await toggle.tap(); await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.cycle canvas')).toBeVisible(); await expect(page.locator('.cycle b')).not.toHaveText('');
    await expect(page.locator('.sheet')).toHaveCount(0);
    const expanded = (await page.locator('.cycle').boundingBox())!, action = (await page.locator('.mobile-confirm').boundingBox())!;
    expect(expanded.height).toBeGreaterThan(compact.height + 50); expect(expanded.y + expanded.height).toBeLessThan(action.y);
    await page.screenshot({ path: `artifacts/mobile-controls/${width}x${height}-expanded.png`, animations: 'disabled' });
    await page.getByRole('button', { name: '심장 길 안내' }).tap();
    await expect(page.getByRole('dialog', { name: '바디스코프 지도' })).toBeVisible(); await expect(page.locator('.mobile-confirm')).toBeHidden();
    await page.getByRole('button', { name: '닫기', exact: true }).tap();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.tap(); await expect(page.locator('.cycle-body')).toBeHidden();
    const before = await position(page); await page.waitForTimeout(150); const after = await position(page);
    expect(after.x).toBe(before.x); expect(after.y).toBe(before.y); expect(errors).toEqual([]); await page.close();
  });
}

test('mobile confirm never selects a Bodyscope choice; touch-only events work when pointer events are absent', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await start(page, false, true);
  const confirm = page.getByRole('button', { name: '확인', exact: true }); await expect(confirm).toBeEnabled();
  // iOS/in-app fallback: fire only the TouchEvent, without a PointerEvent or a click.
  await confirm.evaluate(b => { const t = new Touch({ identifier: 41, target: b, clientX: 300, clientY: 750 }); b.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [t], touches: [t], bubbles: true, cancelable: true })); });
  await expect(page.locator('.dialog .choices')).toBeVisible(); await expect(confirm).toBeHidden();
  expect(await page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.world!.roomId)).toBe('newsroom');
  await page.waitForTimeout(200); expect(await page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.world!.roomId)).toBe('newsroom');
  await page.getByRole('button', { name: '그만두기' }).tap(); await expect(page.locator('.dialog')).toHaveCount(0);
  await page.close();
});

test('PC keeps confirm hidden and can toggle the expanded cycle with the keyboard', async ({ page }) => {
  await start(page, true); await expect(page.locator('.mobile-confirm')).toBeHidden();
  const toggle = page.getByRole('button', { name: '심장 주기 접기/펼치기' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'true'); await toggle.focus(); await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false'); await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true'); await expect(page.locator('.sheet')).toHaveCount(0);
});

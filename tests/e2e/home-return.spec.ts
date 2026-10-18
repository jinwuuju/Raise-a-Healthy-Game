import { expect, test, type Page } from '@playwright/test';

/** D104: continuing from a far, formerly cut-off corner of the district, and the Euro Plaza return button. */
type Hook = { world: { roomId: string; player: { x: number; y: number } }; game: { state: { at: { room: string; x: number; y: number } }; importState(s: object): void } };
const where = (p: Page) => p.evaluate(() => { const h = (window as unknown as { __mq: Hook }).__mq; return { room: h.world.roomId, x: Math.round(h.world.player.x), y: Math.round(h.world.player.y) }; });
const ready = (p: Page) => p.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world);
const FAR = { room: 'district', x: 3151, y: 175, facing: 'right' }; // a real save stood here (north of Olympic-daero)

async function startAt(p: Page, at: object) {
  await p.goto('/'); await p.getByRole('button', { name: '첫 출근하기' }).click(); await p.waitForTimeout(300);
  await Promise.all([p.waitForEvent('load'), p.evaluate(a => { const h = (window as unknown as { __mq: Hook }).__mq; h.game.importState({ ...h.game.state, at: a }); location.reload(); }, at)]);
  await ready(p); await p.waitForTimeout(700);
}

for (const [width, height] of [[1280, 900], [360, 640]]) test(`far save continues in place; the return button brings the reporter to Euro Plaza ${width}x${height}`, async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: width!, height: height! });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await startAt(page, FAR);
  expect(await where(page)).toEqual({ room: 'district', x: 3151, y: 175 }); // continue exactly where the save stood
  const btn = page.getByRole('button', { name: '유로프라자 앞으로 복귀' });
  await expect(btn).toBeVisible();
  // The button must not sit on top of the reporter chip, the notebook/menu buttons or the minimap.
  const boxes = await page.evaluate(() => ['.chip', '.btnrow', '.minimap', '.homebtn'].map(s => { const r = document.querySelector(s)!.getBoundingClientRect(); return { s, x: r.x, y: r.y, w: r.width, h: r.height }; }));
  const home = boxes[3]!;
  for (const b of boxes.slice(0, 3)) expect(home.x < b.x + b.w && b.x < home.x + home.w && home.y < b.y + b.h && b.y < home.y + home.h, b.s).toBe(false);
  expect(home.x + home.w).toBeLessThanOrEqual(width!);
  await page.screenshot({ path: `artifacts/d104-home-button-${width}.png` });
  await btn.click(); await page.waitForTimeout(700);
  const front = await page.evaluate(async () => { const u = '/src/world/district.ts'; return (await import(/* @vite-ignore */ u)).exits.euroOut as { x: number; y: number }; });
  expect(await where(page)).toEqual({ room: 'district', x: front.x, y: front.y });
  await expect(page.locator('.toast')).toHaveText('유로프라자 앞으로 돌아왔어요.');
  // Saved there: a reload continues in front of Euro Plaza.
  await page.reload(); await ready(page); await page.waitForTimeout(500);
  expect(await where(page)).toEqual({ room: 'district', x: front.x, y: front.y });
  // From inside a building (lobby) the button and the H key work too.
  await page.evaluate(() => { const h = (window as unknown as { __mq: Hook }).__mq; h.game.importState({ ...h.game.state, at: { room: 'lobby', x: 240, y: 324, facing: 'up' } }); });
  await page.reload(); await ready(page); await page.waitForTimeout(500);
  expect((await where(page)).room).toBe('lobby');
  await page.locator('#view').focus(); await page.keyboard.press('h'); await page.waitForTimeout(700);
  expect(await where(page)).toEqual({ room: 'district', x: front.x, y: front.y });
  expect(errors).toEqual([]);
});

test('the return button is hidden inside the heart', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await startAt(page, { room: 'heart', x: 0, y: 0, facing: 'down' }); // an off-map heart spot reopens at the heart's entry
  expect((await where(page)).room).toBe('heart');
  await expect(page.getByRole('button', { name: '유로프라자 앞으로 복귀' })).toBeHidden();
  await page.locator('#view').focus(); await page.keyboard.press('h'); await page.waitForTimeout(500);
  expect((await where(page)).room).toBe('heart');
  expect(errors).toEqual([]);
});

import { expect, test, type Page } from '@playwright/test';

type Hook = { world: { roomId: string; tap(p: { x: number; y: number }): void; player: { x: number; y: number } } | null; game: { state: { cafe: { welcomeUsed: boolean }; flags: string[]; at: { room: string } } } };
const hook = (page: Page) => page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.world?.roomId ?? null);
async function tap(page: Page, x: number, y: number) { await page.evaluate(([px, py]) => (window as unknown as { __mq: Hook }).__mq.world!.tap({ x: px!, y: py! }), [x, y]); }
async function finishDialog(page: Page) {
  for (let i = 0; i < 12 && await page.locator('.dialog').count(); i++) { await page.keyboard.press('e'); await page.waitForTimeout(120); }
}

test('first day route: editor → corridor → elevator → lift hall → lobby → real-scale district → cafe order', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.getByLabel('기자 이름').fill('테스트');
  await page.getByRole('button', { name: '첫 출근하기' }).click();
  await expect(page.locator('.chip .name')).toHaveText('테스트');
  await expect(page.locator('.quest p')).toContainText('편집장');

  await tap(page, 256, 80);
  await expect(page.locator('.dialog')).toBeVisible({ timeout: 8000 });
  await finishDialog(page);
  await expect(page.locator('.quest p')).toContainText('엘리베이터');

  await tap(page, 336, 442);
  await expect.poll(() => hook(page), { timeout: 10000 }).toBe('floor4');
  await page.waitForTimeout(400);
  await tap(page, 416, 523);
  await expect.poll(() => hook(page), { timeout: 15000 }).toBe('lift4');
  await page.waitForTimeout(400);
  await tap(page, 132, 84);
  await expect(page.locator('.dialog')).toBeVisible({ timeout: 8000 });
  await page.keyboard.press('e'); await page.waitForTimeout(150);
  await page.getByRole('button', { name: /1층 · 로비/ }).click();
  await expect.poll(() => hook(page)).toBe('lift1');
  await page.waitForTimeout(400);
  await tap(page, 80, 155);
  await expect.poll(() => hook(page), { timeout: 10000 }).toBe('lifthall');
  await page.waitForTimeout(400);
  await tap(page, 72, 187);
  await expect.poll(() => hook(page), { timeout: 10000 }).toBe('lobby');
  await page.waitForTimeout(400);
  await tap(page, 240, 347);
  await expect.poll(() => hook(page), { timeout: 10000 }).toBe('district');
  await page.waitForTimeout(400);
  // The cafe is at its real address, about 78 m north-west of Euro Plaza (D096).
  const door = await page.evaluate(async () => { const u = '/src/world/rooms.ts'; const { rooms } = await import(/* @vite-ignore */ u); const z = rooms.district.doors.find((d: { id: string }) => d.id === 'cafe-door').zone; return { x: z.x + z.w / 2, y: z.y + z.h / 2 }; });
  await tap(page, door.x, door.y);
  await expect.poll(() => hook(page), { timeout: 40000 }).toBe('cafe');
  await page.waitForTimeout(400);

  await tap(page, 112, 50);
  await expect(page.locator('.dialog')).toBeVisible({ timeout: 8000 });
  await page.keyboard.press('e'); await page.waitForTimeout(150);
  await page.keyboard.press('e'); await page.waitForTimeout(150);
  await page.locator('.choice', { hasText: '첫 방문 아메리카노' }).click();
  await finishDialog(page);
  const used = await page.evaluate(() => JSON.parse(localStorage.getItem('medical-quest.v4.current')!).cafe.welcomeUsed);
  expect(used).toBe(true);
  expect(errors).toEqual([]);
});

test('mobile portrait keeps HUD actions reachable', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  await page.goto('/');
  await page.getByRole('button', { name: '첫 출근하기' }).click();
  for (const name of ['기자 정보', '취재 수첩', '메뉴']) {
    const box = await page.getByRole('button', { name }).boundingBox();
    expect(box && box.width >= 44 && box.height >= 44).toBeTruthy();
  }
  await page.getByRole('button', { name: '메뉴' }).click();
  await expect(page.getByRole('dialog', { name: '메뉴' })).toBeVisible();
  await expect(page.getByRole('button', { name: '기록 파일로 내보내기' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '메뉴' })).toHaveCount(0);
  await page.close();
});

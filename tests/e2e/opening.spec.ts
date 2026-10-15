import { expect, test, type Page } from '@playwright/test';
import type { GameState } from '../../src/domain/state';

type Hook = { world: { roomId: string } | null; game: { state: GameState; importState(s: unknown): void } };
const state = (p: Page) => p.evaluate(() => (window as unknown as { __mq: Hook }).__mq.game.state);
// Same cup positions as src/art/opening.ts TEAS (scene pixels, top-left of each 8x8 cup).
const teas = [[116, 7], [41, 18], [70, 66], [156, 45], [128, 67], [40, 105]];

async function tapTea(p: Page, [x, y]: number[]) {
  const box = (await p.locator('.op-scene canvas').boundingBox())!;
  await p.mouse.click(box.x + ((x! + 4) / 192) * box.width, box.y + ((y! + 5) / 128) * box.height);
}

test('opening: title and maker, hidden green tea hunt that persists, then the creator and a first start in front of the editor', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?opening');
  const opening = page.getByRole('region', { name: '건강 기자 키우기 시작 화면' });
  await expect(opening).toBeVisible(); await expect(opening.getByRole('heading', { level: 1 })).toHaveText('건강 기자 키우기');
  await expect(opening).toContainText('제작 · 진우주'); await expect(page).toHaveTitle('건강 기자 키우기');
  const start = opening.getByRole('button', { name: '시작하기' }); await expect(start).toBeVisible(); await expect(start).toBeFocused();
  await expect(opening.locator('.op-tea')).toContainText('녹차 6잔이 숨어');
  await tapTea(page, teas[0]!); await expect(opening.locator('.op-tea')).toContainText('구름 위에서 녹차 한 잔');
  await page.keyboard.press('Escape'); await expect(page.locator('.sheet')).toHaveCount(0);
  for (const t of teas.slice(1)) await tapTea(page, t);
  await expect(opening.locator('.op-tea')).toContainText('모두 찾았어요');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('medical-quest.opening.tea') ?? '[]').length)).toBe(6);
  await page.reload(); await expect(opening.locator('.op-tea')).toContainText('모두 찾았어요');
  await opening.getByRole('button', { name: '시작하기' }).click(); await expect(opening).toHaveCount(0);
  const creator = page.getByRole('dialog', { name: '기자 만들기' }); await expect(creator).toContainText('건강 기자 키우기');
  await page.getByRole('button', { name: '첫 출근하기' }).click();
  await page.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world);
  expect((await state(page)).at).toEqual({ room: 'newsroom', x: 256, y: 152, facing: 'up' });
  await expect(page.locator('body')).toContainText('편집장에게 첫 출근 인사하기');
  expect(errors).toEqual([]);
});

test('opening: a reload keeps the saved place, a new session clocks in at the newsroom in front of the editor', async ({ context }) => {
  const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?opening'); await page.getByRole('button', { name: '시작하기' }).click(); await page.getByRole('button', { name: '첫 출근하기' }).click();
  await page.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world);
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => { const mq = (window as unknown as { __mq: Hook }).__mq; mq.game.importState({ ...mq.game.state, at: { room: 'lung', x: 26, y: 176, facing: 'right' } }); location.reload(); })]);
  await page.getByRole('button', { name: '이어서 출근하기' }).click();
  await page.waitForFunction(() => (window as unknown as { __mq?: Hook }).__mq?.world?.roomId === 'lung');
  await page.close();
  const next = await context.newPage(); next.on('pageerror', e => errors.push(e.message));
  await next.goto('/?opening'); await next.getByRole('button', { name: '이어서 출근하기' }).click();
  await next.waitForFunction(() => (window as unknown as { __mq?: Hook }).__mq?.world?.roomId === 'newsroom');
  expect((await state(next)).at).toEqual({ room: 'newsroom', x: 256, y: 152, facing: 'up' });
  expect(errors).toEqual([]);
});

for (const [width, height] of [[390, 844], [844, 390]] as const) test(`opening ${width}×${height}: fits without sideways scrolling, start button on screen, static under reduced motion`, async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, reducedMotion: 'reduce' });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?opening'); const start = page.getByRole('button', { name: '시작하기' }); await expect(start).toBeVisible();
  const overflow = await page.locator('.opening').evaluate(el => el.scrollWidth - el.clientWidth); expect(overflow).toBeLessThan(2);
  const canvas = (await page.locator('.op-scene canvas').boundingBox())!; expect(canvas.x).toBeGreaterThanOrEqual(0); expect(canvas.x + canvas.width).toBeLessThanOrEqual(width + 1);
  const b = (await start.boundingBox())!; expect(b.y + b.height).toBeLessThanOrEqual(height); expect(b.height).toBeGreaterThanOrEqual(44);
  const a = await page.locator('.op-scene canvas').evaluate(c => (c as HTMLCanvasElement).toDataURL()); await page.waitForTimeout(400);
  expect(await page.locator('.op-scene canvas').evaluate(c => (c as HTMLCanvasElement).toDataURL())).toBe(a);
  await page.screenshot({ path: `artifacts/opening-${width}.png` });
  await start.tap(); await expect(page.getByRole('dialog', { name: '기자 만들기' })).toBeVisible();
  expect(errors).toEqual([]); await page.close();
});

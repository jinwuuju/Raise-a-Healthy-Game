import { expect, test, type Page } from '@playwright/test';

// D103 (user): enter Jin-U and buy things, the Orbit Tailor clothes shop near Euro Plaza, two-finger pinch zoom on
// phones (wheel and +/- on PC).
type Hook = {
  world: { roomId: string; tap(p: { x: number; y: number }): void; player: { x: number; y: number; look: { outfit: string } }; view: { zoom: number }; path: unknown[] } | null;
  game: { state: Record<string, unknown> & { gold: number; owned: string[]; avatar: { look: { outfit: string } }; shop: { bag: Record<string, number> }; cafe: Record<string, unknown> }; importState(s: unknown): void };
};
const mq = (page: Page) => page.evaluate(() => { const h = (window as unknown as { __mq: Hook }).__mq; const w = h.world; return { room: w?.roomId ?? null, zoom: w?.view.zoom ?? 0, x: w?.player.x ?? 0, y: w?.player.y ?? 0, preview: w?.player.look.outfit ?? '', s: h.game.state }; });
const tap = (page: Page, x: number, y: number) => page.evaluate(([px, py]) => (window as unknown as { __mq: Hook }).__mq.world!.tap({ x: px!, y: py! }), [x, y]);

async function startAt(page: Page, patch: Record<string, unknown>) {
  await page.goto('/');
  await page.getByRole('button', { name: '첫 출근하기' }).click();
  await Promise.all([
    page.waitForEvent('load'),
    page.evaluate(p => { const h = (window as unknown as { __mq: Hook }).__mq; const s = h.game.state; h.game.importState({ ...s, ...p, flags: ['met-editor'], cafe: { ...s.cafe, welcomeUsed: true } }); location.reload(); }, patch),
  ]);
  await page.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world);
  await page.waitForTimeout(400);
}
async function untilChoice(page: Page, name: string) {
  const choice = page.locator('.choice', { hasText: name });
  for (let i = 0; i < 12 && !(await choice.isVisible()); i++) { await page.keyboard.press('e'); await page.waitForTimeout(150); }
  return choice;
}
async function finishDialog(page: Page) {
  for (let i = 0; i < 12 && await page.locator('.dialog').count(); i++) { await page.keyboard.press('e'); await page.waitForTimeout(120); }
}
const exitsOf = async (page: Page) => { await page.goto('/'); return page.evaluate(async () => { const u = '/src/world/district.ts'; const d = await import(/* @vite-ignore */ u); await d.loadDistrict(); return d.exits as { euroOut: { x: number; y: number }; jinuOut: { x: number; y: number } }; }); };
const doorOf = (page: Page, id: string) => page.evaluate(async did => {
  const u = '/src/world/rooms.ts'; const { rooms } = await import(/* @vite-ignore */ u);
  const z = rooms.district.doors.find((d: { id: string }) => d.id === did).zone; return { x: z.x + z.w / 2, y: z.y + z.h - 4 };
}, id);

test('Jin-U: walk in, buy at the till, walk out; Orbit Tailor: try on, buy and wear', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const out = await exitsOf(page);
  await startAt(page, { gold: 500, at: { room: 'district', x: out.jinuOut.x, y: out.jinuOut.y, facing: 'up' } });
  const jinuDoor = await doorOf(page, 'jinu-door');
  await tap(page, jinuDoor.x, jinuDoor.y);
  await expect.poll(async () => (await mq(page)).room, { timeout: 20000 }).toBe('jinu');
  await page.waitForTimeout(500);
  await tap(page, 196, 76);
  await expect(page.locator('.dialog')).toBeVisible({ timeout: 8000 });
  await (await untilChoice(page, '녹차 페트병')).click();
  await finishDialog(page);
  let st = (await mq(page)).s;
  expect([st.gold, st.shop.bag.greentea]).toEqual([488, 1]);
  await expect(page.locator('.toast').last()).toContainText('녹차 페트병');

  await tap(page, 128, 172);
  await expect.poll(async () => (await mq(page)).room, { timeout: 15000 }).toBe('district');
  await page.waitForTimeout(500);
  const tailorDoor = await doorOf(page, 'tailor-door');
  await tap(page, tailorDoor.x, tailorDoor.y);
  await expect.poll(async () => (await mq(page)).room, { timeout: 30000 }).toBe('tailor');
  await page.waitForTimeout(500);
  const before = (await mq(page)).s.avatar.look.outfit;
  await tap(page, 214, 60);
  await expect(page.locator('.dialog')).toBeVisible({ timeout: 8000 });
  await (await untilChoice(page, '데님 재킷')).click();
  const buy = await untilChoice(page, '사서 바로 입기');
  const trying = await mq(page);
  expect([trying.preview, trying.s.avatar.look.outfit, trying.s.gold]).toEqual(['denim', before, 488]); // only a preview so far
  await buy.click();
  await finishDialog(page);
  st = (await mq(page)).s;
  expect([st.gold, st.owned.includes('denim'), st.avatar.look.outfit]).toEqual([238, true, 'denim']);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('medical-quest.v4.current')!));
  expect([saved.avatar.look.outfit, saved.owned.includes('denim')]).toEqual(['denim', true]);

  // Trying something on and walking away buys nothing.
  await tap(page, 214, 60);
  await (await untilChoice(page, '줄무늬 셔츠')).click();
  await untilChoice(page, '사서 바로 입기');
  await page.keyboard.press('Escape');
  await finishDialog(page);
  const after = await mq(page);
  expect([after.preview, after.s.avatar.look.outfit, after.s.gold, after.s.owned.includes('stripe')]).toEqual(['denim', 'denim', 238, false]);
  expect(errors).toEqual([]);
});

test('phone: two fingers zoom the world in and out without walking, and the choice is remembered', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const out = await exitsOf(page);
  await startAt(page, { at: { room: 'district', x: out.euroOut.x, y: out.euroOut.y, facing: 'down' } });
  const z0 = (await mq(page)).zoom, p0 = await mq(page);
  const pinch = (from: number, to: number) => page.evaluate(([a, b]) => {
    const c = document.querySelector<HTMLCanvasElement>('#view')!, cx = innerWidth / 2, cy = innerHeight / 2;
    const t = (id: number, d: number) => new Touch({ identifier: id, target: c, clientX: cx + (id === 1 ? -d : d), clientY: cy });
    const fire = (type: string, touches: Touch[], changed: Touch[]) => c.dispatchEvent(new TouchEvent(type, { touches, targetTouches: touches, changedTouches: changed, bubbles: true, cancelable: true }));
    const a0 = t(1, a!), b0 = t(2, a!);
    fire('touchstart', [a0], [a0]); fire('touchstart', [a0, b0], [b0]);
    for (let k = 1; k <= 6; k++) { const d = a! + (b! - a!) * k / 6, a1 = t(1, d), b1 = t(2, d); fire('touchmove', [a1, b1], [a1, b1]); }
    const a2 = t(1, b!), b2 = t(2, b!);
    fire('touchend', [a2], [b2]); fire('touchend', [], [a2]);
  }, [from, to]);
  await pinch(30, 150);
  await page.waitForTimeout(300);
  const zin = (await mq(page)).zoom;
  expect(zin).toBeGreaterThan(z0);
  await pinch(150, 20);
  await page.waitForTimeout(300);
  const zout = await mq(page);
  expect(zout.zoom).toBeLessThan(zin);
  expect(Math.hypot(zout.x - p0.x, zout.y - p0.y)).toBeLessThan(1); // pinching never walks
  const remembered = await page.evaluate(() => localStorage.getItem('medical-quest.view.zoom'));
  expect(remembered).not.toBeNull();
  await page.reload();
  await page.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world);
  await page.waitForTimeout(400);
  expect((await mq(page)).zoom).toBe(zout.zoom);
  expect(errors).toEqual([]);
  await page.close();
});

test('PC: mouse wheel and +/- keys zoom the view', async ({ page }) => {
  const out = await exitsOf(page);
  await startAt(page, { at: { room: 'district', x: out.euroOut.x, y: out.euroOut.y, facing: 'down' } });
  const z0 = (await mq(page)).zoom;
  await page.mouse.move(640, 450);
  await page.mouse.wheel(0, -200);
  await expect.poll(async () => (await mq(page)).zoom).toBe(z0 + 1);
  await page.keyboard.press('-'); await page.keyboard.press('-');
  await expect.poll(async () => (await mq(page)).zoom).toBe(z0 - 1);
  await page.keyboard.press('=');
  await expect.poll(async () => (await mq(page)).zoom).toBe(z0);
});

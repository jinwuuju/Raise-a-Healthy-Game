import { expect, test, type Page } from '@playwright/test';

/** D110 mid-check: after a commission is published its stops are ordinary recorded structures again (field check by default),
 * and an observer of a published commission stays available as an extra choice. */

type Hook = { world: { roomId: string; setRoom(r: string, x: number, y: number, f: string): void }; game: { state: Record<string, unknown> & { mastery: Record<string, { stars: number }> }; importState(s: object): void; enter(r: string, x: number, y: number, f: string): void } };

async function boot(p: Page) {
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.goto('/'); await p.getByRole('button', { name: '첫 출근하기' }).click(); await p.waitForTimeout(300);
  await Promise.all([p.waitForEvent('load'), p.evaluate(async () => {
    const f = '/tests/helpers/q011-fixture.ts', { q11Fixture } = await import(/* @vite-ignore */ f);
    const h = (window as unknown as { __mq: Hook }).__mq, s = q11Fixture();
    h.game.importState({ ...s, inspected: [...(s.inspected as string[]), 'hx:hx-sinus'], saveId: (h.game.state as unknown as { saveId: string }).saveId });
    location.reload();
  })]);
  await p.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world); await p.waitForTimeout(600);
}
async function goTo(p: Page, room: string, id: string) {
  await p.evaluate(async ({ room, id }) => {
    const { rooms } = await import(/* @vite-ignore */ '/src/world/rooms.ts' as string), { canStand } = await import(/* @vite-ignore */ '/src/world/collision.ts' as string);
    const t = rooms[room].targets.find((x: { id: string }) => x.id === id);
    let q = { x: t.x, y: t.y };
    outer: for (let r = 2; r <= t.r; r += 2) for (let a = 0; a < 16; a++) { const c = { x: Math.round(t.x + Math.cos(a / 16 * Math.PI * 2) * r), y: Math.round(t.y + Math.sin(a / 16 * Math.PI * 2) * r) }; if (canStand(room, c)) { q = c; break outer; } }
    const h = (window as unknown as { __mq: Hook }).__mq;
    const moved = h.world.roomId !== room;
    h.world.setRoom(room, q.x, q.y, 'down');
    if (moved) h.game.enter(room, q.x, q.y, 'down');
  }, { room, id });
  await p.waitForTimeout(250);
}
const press = async (p: Page) => { await p.locator('#view').focus(); await p.keyboard.press('e'); await p.waitForTimeout(300); };

test('published commission stops give field checks again, observers stay as an extra choice (D110)', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page);
  // Q004 route note stop (superior vena cava opening): a field check, not the old commission note
  await goTo(page, 'heart', 'hx-svc'); await press(page);
  await expect(page.getByRole('button', { name: /^확인 문제 풀기/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^관찰기 다시 보기/ })).toHaveCount(0);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // Q005 observer stop (SA node): field check by default, the rhythm observer as an extra choice
  await goTo(page, 'heart', 'hx-sa'); await press(page);
  await expect(page.getByRole('button', { name: /^확인 문제 풀기/ })).toBeVisible();
  await page.getByRole('button', { name: /^관찰기 다시 보기/ }).click();
  await expect(page.getByRole('dialog', { name: '신호 관찰기 · 고른 박자와 심방세동' })).toBeVisible();
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // Q003 valve stop and Q006/Q007 aortic sinus stop
  await goTo(page, 'heart', 'hx-tricuspid'); await press(page);
  await expect(page.getByRole('button', { name: /^확인 문제 풀기/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^관찰기 다시 보기/ })).toContainText('Q003');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await goTo(page, 'aorta', 'hx-sinus'); await press(page);
  await expect(page.getByRole('button', { name: /^관찰기 다시 보기/ })).toContainText('Q007');
  await page.getByRole('button', { name: /^확인 문제 풀기/ }).click();
  await expect(page.locator('.dialog')).toContainText('확인 문제');
  expect(errors).toEqual([]);
});

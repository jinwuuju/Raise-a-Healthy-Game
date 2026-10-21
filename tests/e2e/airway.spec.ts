import { expect, test, type Page } from '@playwright/test';

/** D111 airway space (design 20 section 7 step 2): Bodyscope organ choice after the heart graduation, walking the air path,
 * records and field checks, the swallow gate, and the return pad. */
type Hook = {
  world: { roomId: string; airClock: number; player: { x: number; y: number }; setRoom(r: string, x: number, y: number, f: string): void };
  game: { state: Record<string, unknown> & { inspected: string[]; at: { room: string } }; importState(s: object): void; enter(r: string, x: number, y: number, f: string): void };
};
const hook = (p: Page) => p.evaluate(() => { const h = (window as unknown as { __mq: Hook }).__mq; return { room: h.world.roomId, x: h.world.player.x, y: h.world.player.y, inspected: h.game.state.inspected }; });

async function boot(p: Page) {
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.goto('/'); await p.getByRole('button', { name: '첫 출근하기' }).click(); await p.waitForTimeout(300);
  await Promise.all([p.waitForEvent('load'), p.evaluate(async () => {
    const f = '/tests/helpers/q011-fixture.ts', { q11Fixture } = await import(/* @vite-ignore */ f);
    const h = (window as unknown as { __mq: Hook }).__mq, s = q11Fixture();
    h.game.importState({ ...s, at: { room: 'newsroom', x: 464, y: 152, facing: 'up' }, saveId: (h.game.state as unknown as { saveId: string }).saveId });
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
    h.world.setRoom(room, q.x, q.y, 'up');
    if (moved) h.game.enter(room, q.x, q.y, 'up');
  }, { room, id });
  await p.waitForTimeout(250);
}
const press = async (p: Page) => { await p.locator('#view').focus(); await p.keyboard.press('e'); await p.waitForTimeout(350); };
async function closeDialogs(p: Page) { for (let i = 0; i < 6 && await p.locator('.dialog').isVisible(); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(200); } }

test('after the heart graduation the Bodyscope opens the airway: records, field checks, swallow gate and return (D111)', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page);
  await goTo(page, 'newsroom', 'device'); await press(page);
  await page.getByRole('button', { name: /^호흡기/ }).click();
  await page.waitForFunction(() => (window as unknown as { __mq: Hook }).__mq.world.roomId === 'nose', null, { timeout: 8000 });
  await expect(page.locator('.dialog')).toContainText('호흡기 속이에요', { timeout: 4000 });
  await closeDialogs(page);

  // The nose is drawn (many colours, not an empty frame) and the minimap is shown.
  const colours = await page.evaluate(() => {
    const c = document.querySelector('#view') as HTMLCanvasElement, g = c.getContext('2d')!, d = g.getImageData(0, 0, c.width, c.height).data, set = new Set<number>();
    for (let i = 0; i < d.length; i += 4 * 37) set.add((d[i]! << 16) | (d[i + 1]! << 8) | d[i + 2]!);
    return set.size;
  });
  expect(colours).toBeGreaterThan(60);
  await expect(page.locator('.minimap')).toBeVisible();

  // Record a core structure, then the same spot gives a field check.
  await goTo(page, 'nose', 'rx-nostril'); await press(page);
  await expect(page.locator('.dialog')).toContainText('콧구멍');
  await closeDialogs(page);
  expect((await hook(page)).inspected).toContain('rx:rx-nostril');
  await press(page);
  await page.getByRole('button', { name: /^확인 문제 풀기/ }).click();
  await expect(page.locator('.dialog')).toContainText('확인 문제');
  await closeDialogs(page);

  // Swallow gate in the throat: while swallowing the soft palate covers the way down; afterwards it opens.
  await page.evaluate(() => { const h = (window as unknown as { __mq: Hook }).__mq; h.world.setRoom('pharynx', 300, 250, 'down'); h.game.enter('pharynx', 300, 250, 'down'); h.world.airClock = 10.6 + 1.0; });
  await page.locator('#view').focus();
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(500); await page.keyboard.up('ArrowDown');
  expect((await hook(page)).y).toBeLessThan(268);
  await expect(page.locator('.toast').last()).toContainText('삼키는 중');
  await page.evaluate(() => { (window as unknown as { __mq: Hook }).__mq.world.airClock = 1; });
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(700); await page.keyboard.up('ArrowDown');
  expect((await hook(page)).y).toBeGreaterThan(268);

  // The oesophagus is never walked into; the larynx is ahead. Return pad leads back to the newsroom.
  await goTo(page, 'pharynx', 'return-pad'); await press(page);
  await page.getByRole('button', { name: /^돌아가기/ }).click();
  await page.waitForFunction(() => (window as unknown as { __mq: Hook }).__mq.world.roomId === 'newsroom', null, { timeout: 8000 });
  await page.waitForTimeout(400);
  // The notebook keeps the airway record room by room.
  await page.locator('#view').focus(); await page.keyboard.press('j');
  await page.getByRole('tab', { name: '인체 탐험' }).click();
  await expect(page.getByRole('tabpanel', { name: '인체 탐험' })).toContainText('호흡기 탐사 · 1/44');
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

test('walking the air path from the nose to the alveoli through every door (D111)', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page);
  await page.evaluate(() => { const h = (window as unknown as { __mq: Hook }).__mq; h.world.setRoom('nose', 30, 298, 'right'); h.game.enter('nose', 30, 298, 'right'); });
  const route: [string, string][] = [['nose', 'pharynx'], ['pharynx', 'larynx'], ['larynx', 'trachea'], ['trachea', 'bronchi'], ['bronchi', 'alveoli']];
  for (const [from, to] of route) {
    await page.evaluate(async ({ from, to }) => {
      const { rooms } = await import(/* @vite-ignore */ '/src/world/rooms.ts' as string), { canStand } = await import(/* @vite-ignore */ '/src/world/collision.ts' as string);
      const h = (window as unknown as { __mq: Hook }).__mq, d = rooms[from].doors.find((x: { to: string }) => x.to === to);
      const goal = { x: d.zone.x + d.zone.w / 2, y: d.zone.y + d.zone.h / 2 }, z = d.zone;
      // A standable spot just outside the door zone, then walk into the door.
      let near = h.world.player;
      outer: for (let r = 6; r < 60; r += 2) for (let a = 0; a < 32; a++) {
        const q = { x: Math.round(goal.x + Math.cos(a / 32 * Math.PI * 2) * (z.w / 2 + r)), y: Math.round(goal.y + Math.sin(a / 32 * Math.PI * 2) * (z.h / 2 + r)) };
        if (canStand(from, q) && !(q.x >= z.x && q.x < z.x + z.w && q.y >= z.y && q.y < z.y + z.h)) { near = q; break outer; }
      }
      h.world.airClock = 1; // breathing, not swallowing
      h.world.setRoom(from, near.x, near.y, 'down');
      (h.world as unknown as { path: { x: number; y: number }[] }).path = [goal];
    }, { from, to });
    await page.waitForFunction(t => (window as unknown as { __mq: Hook }).__mq.world.roomId === t, to, { timeout: 8000 });
    await page.waitForTimeout(400);
  }
  expect((await hook(page)).room).toBe('alveoli');
  expect(errors).toEqual([]);
});

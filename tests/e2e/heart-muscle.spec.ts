import { expect, test, type Page } from '@playwright/test';

/** D108 step 1: the heart-muscle delivery on the Q006 route, and stars on the heart see-through map. */
type Run = { start: number; kind: string; wall: string; oxygen: boolean; entered: boolean; fed: boolean; waypoints: { id: string; done: boolean; correct: boolean }[] };
type Hook = { world: { roomId: string; setRoom(r: string, x: number, y: number, f: string): void }; game: { state: Record<string, unknown> & { gold: number; totalXp: number; inspected: string[]; heartRun: { runs: number; muscle: { runs: number; best: number | null } } }; importState(s: object): void; enter(r: string, x: number, y: number, f: string): void }; run: Run | null };
const mq = (p: Page) => p.evaluate(() => (window as unknown as { __mq: Hook }).__mq.run);

async function bootAfterQ6(p: Page, extra: object = {}) {
  await p.goto('/'); await p.getByRole('button', { name: '첫 출근하기' }).click(); await p.waitForTimeout(300);
  await Promise.all([p.waitForEvent('load'), p.evaluate(async (x) => {
    const f = '/tests/helpers/q007-fixture.ts', { q7Fixture } = await import(/* @vite-ignore */ f);
    const h = (window as unknown as { __mq: Hook }).__mq, s = q7Fixture();
    h.game.importState({ ...s, saveId: (h.game.state as unknown as { saveId: string }).saveId, at: { room: 'heart', x: 292, y: 254, facing: 'down' }, ...x });
    location.reload();
  }, extra)]);
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
const press = async (p: Page) => { await p.locator('#view').focus(); await p.keyboard.press('e'); await p.waitForTimeout(250); };
const advance = async (p: Page) => { for (let i = 0; i < 6 && await p.locator('.dialog').isVisible(); i++) { await p.keyboard.press('e'); await p.waitForTimeout(200); } };
const nameOf = (p: Page, id: string) => p.evaluate(async (id) => { const { discoveries } = await import(/* @vite-ignore */ '/src/domain/heart.ts' as string); return discoveries[id].name as string; }, id);
const roomOf = (p: Page, id: string) => p.evaluate(async (id) => { const { discoveries } = await import(/* @vite-ignore */ '/src/domain/heart.ts' as string); return discoveries[id].room as string; }, id);
const waitRoom = (p: Page, room: string) => p.waitForFunction((r) => { const h = (window as unknown as { __mq: Hook }).__mq; return h.world.roomId === r && !(h.world as unknown as { locked: boolean }).locked; }, room, { timeout: 8000 });

test('is locked before Q006 and shown at the guide', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: '첫 출근하기' }).click(); await page.waitForTimeout(300);
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => { const h = (window as unknown as { __mq: Hook }).__mq; h.game.importState({ ...h.game.state, at: { room: 'heart', x: 292, y: 254, facing: 'down' } }); location.reload(); })]);
  await page.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world); await page.waitForTimeout(600);
  await goTo(page, 'heart', 'guide'); await press(page);
  await expect(page.getByRole('button', { name: /^심장 근육 배달 시작/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /^심장 근육 배달 시작/ })).toContainText('Q006');
});

test('one heart-muscle delivery: oxygen, clue, a wrong coronary opening without loss, the wall, the coronary sinus and the result (D108)', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await bootAfterQ6(page);
  const xp0 = await page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.game.state.totalXp);
  await goTo(page, 'heart', 'guide'); await press(page);
  await page.getByRole('button', { name: /^심장 근육 배달 시작/ }).click();
  await page.waitForTimeout(400);
  const r0 = (await mq(page))!;
  expect(r0.kind).toBe('muscle'); expect(['lv', 'rv']).toContain(r0.wall);
  const wall = r0.wall, entry = r0.waypoints[1]!.id, wrong = entry === 'hx-lca' ? 'hx-rca' : 'hx-lca', wallId = wall === 'lv' ? 'hx-lvwall' : 'hx-rvwall', clue = r0.waypoints[0]!.id;
  expect(r0.waypoints[2]!.id).toBe('hx-cs');
  await expect(page.locator('.quest')).toContainText('관상동맥 입구로');
  // oxygen in the lung
  await goTo(page, 'lung', 'hx-exchange'); await press(page); await advance(page);
  // the clue waypoint (recorded structures ask for the name)
  const known = await page.evaluate((id) => (window as unknown as { __mq: Hook }).__mq.game.state.inspected.includes('hx:' + id), clue);
  await goTo(page, await roomOf(page, clue), clue); await press(page);
  if (known) { await page.getByRole('button', { name: new RegExp('^' + (await nameOf(page, clue)).replace(/[()]/g, '.')) }).click(); await page.waitForTimeout(200); }
  await advance(page);
  // a wrong opening first: a gentle explanation, nothing lost, no travel
  await goTo(page, 'aorta', wrong); await press(page);
  await expect(page.locator('.dialog')).toContainText('잃는 건 없어요');
  await advance(page);
  expect(await page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.world.roomId)).toBe('aorta');
  // the right opening carries the cell to the ordered wall
  await goTo(page, 'aorta', entry); await press(page);
  await waitRoom(page, wall);
  await page.screenshot({ path: 'artifacts/d108-muscle-wall.png' });
  await goTo(page, wall, wallId); await press(page); await advance(page);
  await waitRoom(page, 'heart');
  const mid = (await mq(page))!;
  expect(mid).toMatchObject({ oxygen: true, entered: true, fed: true });
  await page.evaluate(() => { (window as unknown as { __mq: Hook }).__mq.run!.start -= 60000; });
  // the hidden coronary sinus opening, named from its clue
  await goTo(page, 'heart', 'hx-cs'); await press(page);
  await page.getByRole('button', { name: new RegExp('^' + (await nameOf(page, 'hx-cs')).replace(/[()]/g, '.')) }).click(); await page.waitForTimeout(200);
  await advance(page);
  await expect(page.getByRole('dialog', { name: '심장 근육 배달 결과' })).toBeVisible();
  await expect(page.locator('.sheet')).toContainText('다시 골라 찾았어요');
  await page.screenshot({ path: 'artifacts/d108-muscle-result.png' });
  const after = await page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.game.state);
  expect(after.heartRun.muscle.runs).toBe(1); expect(after.heartRun.runs).toBe(1);
  expect(after.totalXp - xp0).toBeGreaterThanOrEqual(20);
  await page.getByRole('button', { name: /^한 판 더/ }).click();
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.world.roomId)).toBe('heart');
  expect((await mq(page))?.kind).toBe('muscle');
  expect(errors).toEqual([]);
});

test('the heart map shows mastery stars per room and a gold medal for a finished room (D108)', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await bootAfterQ6(page);
  const ids = await page.evaluate(async () => { const { discoveries, discoveryIds } = await import(/* @vite-ignore */ '/src/domain/heart.ts' as string); return (discoveryIds as string[]).filter(id => discoveries[id].room === 'la'); });
  expect(ids.length).toBeGreaterThan(0);
  await Promise.all([page.waitForEvent('load'), page.evaluate((ids) => {
    const h = (window as unknown as { __mq: Hook }).__mq, s = h.game.state as Record<string, unknown> & { inspected: string[] };
    h.game.importState({ ...s, inspected: [...s.inspected, ...ids.map(id => 'hx:' + id).filter(k => !s.inspected.includes(k))], mastery: Object.fromEntries(ids.map(id => [id, { stars: 3, kinds: ['name', 'hint', 'room'] }])) });
    location.reload();
  }, ids)]);
  await page.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world); await page.waitForTimeout(600);
  await page.locator('.minimap').click();
  await page.getByRole('button', { name: '심장', exact: true }).click();
  await expect(page.locator('.sheet .place .meter')).toContainText('숙련 ★' + ids.length * 3 + '/');
  await expect(page.locator('.sheet .info')).toContainText('메달 1/6');
  await page.screenshot({ path: 'artifacts/d108-heart-map-stars.png' });
  expect(errors).toEqual([]);
});

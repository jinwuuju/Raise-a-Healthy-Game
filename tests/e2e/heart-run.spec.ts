import { expect, test, type Page } from '@playwright/test';

/** D106: field check on a recorded structure, and one full blood-delivery run with its result sheet and '한 판 더'. */
type Hook = { world: { roomId: string; near: { id: string } | null; setRoom(r: string, x: number, y: number, f: string): void }; game: { state: Record<string, unknown> & { gold: number; heartRun: { runs: number }; mastery: Record<string, { stars: number }> }; importState(s: object): void; enter(r: string, x: number, y: number, f: string): void }; run: { start: number; waypoints: { id: string; done: boolean }[]; oxygen: boolean } | null };
const hook = (p: Page) => p.evaluate(() => !!(window as unknown as { __mq?: Hook }).__mq?.world);

async function boot(p: Page, extra: object) {
  await p.goto('/'); await p.getByRole('button', { name: '첫 출근하기' }).click(); await p.waitForTimeout(300);
  await Promise.all([p.waitForEvent('load'), p.evaluate(x => { const h = (window as unknown as { __mq: Hook }).__mq; h.game.importState({ ...h.game.state, ...x }); location.reload(); }, extra)]);
  await p.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world); await p.waitForTimeout(600);
}
/** Stands next to a target (game state and world together) so it is the one within reach. */
async function goTo(p: Page, room: string, id: string) {
  await p.evaluate(async ({ room, id }) => {
    const { rooms } = await import(/* @vite-ignore */ '/src/world/rooms.ts' as string), { canStand } = await import(/* @vite-ignore */ '/src/world/collision.ts' as string);
    const t = rooms[room].targets.find((x: { id: string }) => x.id === id);
    let q = { x: t.x, y: t.y };
    outer: for (let r = 2; r <= t.r; r += 2) for (let a = 0; a < 16; a++) { const c = { x: Math.round(t.x + Math.cos(a / 16 * Math.PI * 2) * r), y: Math.round(t.y + Math.sin(a / 16 * Math.PI * 2) * r) }; if (canStand(room, c)) { q = c; break outer; } }
    const h = (window as unknown as { __mq: Hook }).__mq;
    // world first, then the state change, so the refresh that follows reads the new room (quest stops, labels)
    const moved = h.world.roomId !== room;
    h.world.setRoom(room, q.x, q.y, 'down');
    if (moved) h.game.enter(room, q.x, q.y, 'down');
  }, { room, id });
  await p.waitForTimeout(250);
}
const press = async (p: Page) => { await p.locator('#view').focus(); await p.keyboard.press('e'); await p.waitForTimeout(250); };
const advance = async (p: Page) => { for (let i = 0; i < 6 && await p.locator('.dialog').isVisible(); i++) { await p.keyboard.press('e'); await p.waitForTimeout(200); } };

test('a recorded structure hides its name and gives a star for a right answer (D106)', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page, { at: { room: 'heart', x: 292, y: 254, facing: 'down' }, inspected: ['hx:hx-svc'] });
  expect(await hook(page)).toBe(true);
  await goTo(page, 'heart', 'hx-svc');
  await press(page);
  await page.getByRole('button', { name: /^확인 문제 풀기/ }).click();
  // first kind is 'name': the right choice is the structure's name
  await page.getByRole('button', { name: /^상대정맥 입구/ }).click();
  await expect(page.locator('.dialog')).toContainText('별 +1');
  await advance(page);
  const s = await page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.game.state);
  expect(s.mastery['hx-svc']!.stars).toBe(1);
  expect(errors).toEqual([]);
});

test('one blood-delivery run: start at the guide, three clue waypoints, oxygen in the lung, delivery and result (D106)', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page, { at: { room: 'heart', x: 292, y: 254, facing: 'down' }, inspected: ['hx:hx-svc', 'hx:hx-pv', 'hx:hx-lvwall'] });
  await goTo(page, 'heart', 'guide');
  await press(page);
  await page.getByRole('button', { name: /^혈류 배달 런 시작/ }).click();
  await page.waitForTimeout(400);
  await expect(page.locator('.quest .run-tag')).toHaveText('배달 런');
  const wps = await page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.run!.waypoints.map(w => w.id));
  expect(wps).toEqual(['hx-svc', 'hx-pv', 'hx-lvwall']);
  await page.screenshot({ path: 'artifacts/d106-run-start.png' });
  const names: Record<string, string> = { 'hx-svc': '상대정맥 입구', 'hx-pv': '폐정맥 입구', 'hx-lvwall': '좌심실 벽 단면' };
  for (const [room, id] of [['heart', 'hx-svc'], ['lung', 'hx-exchange'], ['la', 'hx-pv'], ['lv', 'hx-lvwall']] as const) {
    await goTo(page, room, id);
    await press(page);
    if (names[id]) { await page.getByRole('button', { name: new RegExp('^' + names[id]) }).click(); await page.waitForTimeout(200); }
    await advance(page);
  }
  const r = await page.evaluate(() => { const x = (window as unknown as { __mq: Hook }).__mq.run!; x.start -= 60000; return { oxygen: x.oxygen, done: x.waypoints.filter(w => w.done).length }; });
  expect(r).toEqual({ oxygen: true, done: 3 });
  const gold0 = await page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.game.state.gold);
  await goTo(page, 'aorta', 'hx-ascending');
  await press(page);
  await expect(page.getByRole('dialog', { name: '혈류 배달 결과' })).toBeVisible();
  await expect(page.locator('.run-grade')).toHaveText(/[SABC]/);
  await page.screenshot({ path: 'artifacts/d106-run-result.png' });
  const after = await page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.game.state);
  expect(after.heartRun.runs).toBe(1);
  expect(after.gold).toBeGreaterThan(gold0);
  expect(after.mastery['hx-svc']!.stars).toBe(1); // the waypoint answer counts as the 'name' star
  await page.getByRole('button', { name: /^한 판 더/ }).click();
  await page.waitForTimeout(2500);
  expect(await page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.world.roomId)).toBe('heart');
  await expect(page.locator('.quest .run-tag')).toHaveText('배달 런');
  expect(errors).toEqual([]);
});

for (const [width, height] of [[360, 640], [844, 390], [390, 844]]) test(`run panel stays clear of the movement ball and confirm button on a phone ${width}x${height} (D106)`, async ({ page }) => {
  await page.setViewportSize({ width: width!, height: height! });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page, { at: { room: 'heart', x: 292, y: 254, facing: 'down' }, inspected: ['hx:hx-svc', 'hx:hx-pv', 'hx:hx-lvwall'] });
  await page.evaluate(() => window.dispatchEvent(new Event('touchstart')));
  await goTo(page, 'heart', 'guide');
  await press(page);
  await page.getByRole('button', { name: /^혈류 배달 런 시작/ }).click();
  await page.waitForTimeout(700);
  const r = await page.evaluate(() => ['.quest', '.joystick', '.mobile-confirm', '.topright'].map(s => { const e = document.querySelector(s); if (!e || (e as HTMLElement).offsetParent === null) return null; const b = e.getBoundingClientRect(); return { s, x: b.x, y: b.y, w: b.width, h: b.height }; }));
  const q = r[0]!;
  expect(q.y + q.h).toBeLessThanOrEqual(height!);
  for (const o of r.slice(1)) if (o) expect(q.x < o.x + o.w && o.x < q.x + q.w && q.y < o.y + o.h && o.y < q.y + q.h, o.s).toBe(false);
  await page.screenshot({ path: `artifacts/d106-run-panel-${width}.png` });
  expect(errors).toEqual([]);
});

test('a commission stop that is also a waypoint records the commission note and counts for the run once (D106)', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.getByRole('button', { name: '첫 출근하기' }).click(); await page.waitForTimeout(300);
  await Promise.all([page.waitForEvent('load'), page.evaluate(async () => {
    const f = '/tests/helpers/q006-fixture.ts', { q6Fixture } = await import(/* @vite-ignore */ f);
    const h = (window as unknown as { __mq: Hook }).__mq, s = q6Fixture();
    h.game.importState({ ...s, saveId: (h.game.state as unknown as { saveId: string }).saveId, q006: { ...s.q006, accepted: true }, at: { room: 'heart', x: 292, y: 254, facing: 'down' },
      inspected: [...s.inspected.filter((k: string) => !k.startsWith('hx:hx-') || ['hx:hx-svc', 'hx:hx-pv', 'hx:hx-lvwall'].includes(k)), ...['hx:hx-svc', 'hx:hx-pv', 'hx:hx-lvwall'].filter(k => !s.inspected.includes(k))] });
    location.reload();
  })]);
  await page.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world); await page.waitForTimeout(600);
  await goTo(page, 'heart', 'guide');
  await press(page);
  await page.getByRole('button', { name: /^혈류 배달 런 시작/ }).click();
  await page.waitForTimeout(300);
  const wps = await page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.run!.waypoints.map(w => w.id));
  expect(wps[2]).toBe('hx-lvwall'); // also the Q006 'left ventricle muscle' stop
  await goTo(page, 'lv', 'hx-lvwall');
  await press(page);
  await advance(page);
  const r = await page.evaluate(() => { const h = (window as unknown as { __mq: Hook }).__mq; return { notes: (h.game.state as unknown as { q006: { notes: string[] } }).q006.notes, wp: h.run!.waypoints[2] }; });
  expect(r.notes).toContain('lv-muscle');
  expect(r.wp).toMatchObject({ id: 'hx-lvwall', done: true, correct: true });
  await expect(page.locator('.dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});

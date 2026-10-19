import { expect, test, type Page } from '@playwright/test';

/** D108 Q007 ‘좁아진 모형 통로’: basic course, atherosclerosis basic layer, one condition at a time. */
type Hook = { world: { roomId: string; setRoom(r: string, x: number, y: number, f: string): void }; game: { state: Record<string, unknown> & { totalXp: number; q007: { accepted: boolean; mode: string; notes: string[]; pair: string | null; chain: string[]; publishedAt: string | null } }; importState(s: object): void; enter(r: string, x: number, y: number, f: string): void } };
const st = (p: Page) => p.evaluate(() => (window as unknown as { __mq: Hook }).__mq.game.state);

async function boot(p: Page) {
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.goto('/'); await p.getByRole('button', { name: '첫 출근하기' }).click(); await p.waitForTimeout(300);
  await Promise.all([p.waitForEvent('load'), p.evaluate(async () => {
    const f = '/tests/helpers/q007-fixture.ts', { q7Fixture } = await import(/* @vite-ignore */ f);
    const h = (window as unknown as { __mq: Hook }).__mq, s = q7Fixture();
    h.game.importState({ ...s, saveId: (h.game.state as unknown as { saveId: string }).saveId });
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
    h.game.enter(room, q.x, q.y, 'down');
    void moved;
  }, { room, id });
  await p.waitForTimeout(250);
}
const press = async (p: Page) => { await p.locator('#view').focus(); await p.keyboard.press('e'); await p.waitForTimeout(250); };
const advance = async (p: Page) => { for (let i = 0; i < 8 && await p.locator('.dialog').isVisible() && !await p.locator('.dialog .choices').count(); i++) { await p.keyboard.press('e'); await p.waitForTimeout(150); } };

test('Q007: offer, normal entrances, one-change comparison, materials, single-variable board and publication (D108)', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page);
  await goTo(page, 'newsroom', 'editor'); await press(page); await advance(page);
  await page.getByRole('button', { name: /통로 비교 취재 맡기/ }).click();
  await expect.poll(async () => (await st(page)).q007.accepted).toBe(true);
  // normal baseline first
  for (const [id, note] of [['hx-lca', 'lca-wall'], ['hx-rca', 'rca-wall']] as const) {
    await goTo(page, 'aorta', id); await press(page); await expect(page.locator('.dialog')).toContainText('정상 기준'); await advance(page);
    await expect.poll(async () => (await st(page)).q007.notes).toContain(note);
  }
  // the passage observer: one condition at a time
  await goTo(page, 'aorta', 'hx-sinus'); await press(page);
  const view = page.getByRole('dialog', { name: '통로 관찰기 · 통로 폭 하나만 바꾸기' });
  await expect(view).toBeVisible();
  await view.getByRole('button', { name: '많이 좁아짐', exact: true }).click();
  await view.getByRole('button', { name: '많이 좁아짐 기록하기' }).click();
  await expect(view.locator('[role=status]')).toContainText('조금 좁아짐부터');
  await view.getByRole('button', { name: '조금 좁아짐', exact: true }).click(); await view.getByRole('button', { name: '조금 좁아짐 기록하기' }).click();
  await view.getByRole('button', { name: '많이 좁아짐', exact: true }).click(); await view.getByRole('button', { name: '많이 좁아짐 기록하기' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'artifacts/d108-q007-observer.png' });
  await page.keyboard.press('Escape'); await expect(view).toHaveCount(0);
  const mid = await st(page); expect(mid.q007.notes).toEqual(['lca-wall', 'rca-wall', 'mild', 'narrow']); expect(mid.q007.mode).toBe('wide');
  // materials at the desk
  await goTo(page, 'newsroom', 'my-desk'); await press(page);
  const f = page.getByRole('dialog', { name: 'Q007 취재 · 좁아진 모형 통로' });
  await expect(f).toBeVisible();
  for (let i = 0; i < 3; i++) await f.getByRole('button', { name: '이 자료를 취재 메모로 남기기' }).click();
  // the board refuses a two-change pair and the cut-road decoy, without saving them
  await f.getByRole('button', { name: '좁아진 통로 · 더 일할 때' }).click(); await expect(f.locator('.article-status')).toContainText('두 가지가 함께');
  await f.getByRole('button', { name: '좁아진 통로 · 쉴 때' }).click();
  await f.getByRole('button', { name: '길이 끊어짐' }).click(); await expect(f.locator('.article-status')).toContainText('길은 그대로 이어져');
  await f.getByRole('button', { name: '지나가는 피가 줄어듦' }).click(); await expect(f.locator('.article-status')).toContainText('순서가 어긋났어요');
  for (const card of ['벽 안쪽에 덩어리가 쌓임', '통로가 좁아짐', '지나가는 피가 줄어듦']) await f.getByRole('button', { name: card }).click();
  await f.getByRole('button', { name: '길은 이어져 있다는 사실로 시작' }).click(); await f.getByRole('button', { name: '모형의 한계로 마무리' }).click();
  await f.getByRole('button', { name: '편집장에게 초안 보여주기' }).click();
  await page.screenshot({ path: 'artifacts/d108-q007-board.png' });
  await f.getByRole('button', { name: '게임 속 신문에 발행' }).click();
  const result = page.getByRole('dialog', { name: '발행 결과 · 독자 반응' }); await expect(result).toContainText('Q007');
  const after = await st(page);
  expect(after.q007.publishedAt).not.toBeNull(); expect(after.totalXp).toBe(1750);
  await result.getByRole('button', { name: '월드로 돌아가기' }).click(); await expect(page.locator('.chip .rank')).toContainText('Lv.8');
  // notebook: passage comparison under heart exploration
  await page.keyboard.press('j'); await page.getByRole('tab', { name: '인체 탐험' }).click(); await page.locator('summary').filter({ hasText: '통로 비교 (Q007' }).click();
  await expect(page.getByRole('tabpanel', { name: '인체 탐험' })).toContainText('하나만 바꿔야');
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

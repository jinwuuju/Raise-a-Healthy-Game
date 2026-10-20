import { expect, test, type Page } from '@playwright/test';

/** D108 Q008 ‘하나의 숫자로 충분할까’: basic course, hypertension basic layer without threshold numbers. */
type Hook = { world: { roomId: string; setRoom(r: string, x: number, y: number, f: string): void }; game: { state: Record<string, unknown> & { totalXp: number; q008: { accepted: boolean; mode: string; notes: string[]; picks: string[]; verdict: string | null; publishedAt: string | null } }; importState(s: object): void; enter(r: string, x: number, y: number, f: string): void } };
const st = (p: Page) => p.evaluate(() => (window as unknown as { __mq: Hook }).__mq.game.state);

async function boot(p: Page) {
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.goto('/'); await p.getByRole('button', { name: '첫 출근하기' }).click(); await p.waitForTimeout(300);
  await Promise.all([p.waitForEvent('load'), p.evaluate(async () => {
    const f = '/tests/helpers/q008-fixture.ts', { q8Fixture } = await import(/* @vite-ignore */ f);
    const h = (window as unknown as { __mq: Hook }).__mq, s = q8Fixture();
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

test('Q008: offer, normal push, one-change pressure comparison, materials, record board and publication (D108)', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page);
  await goTo(page, 'newsroom', 'editor'); await press(page); await advance(page);
  await page.getByRole('button', { name: /혈압 기록 취재 맡기/ }).click();
  await expect.poll(async () => (await st(page)).q008.accepted).toBe(true);
  // normal baseline first: squeeze in the left ventricle, recoil in the aorta
  for (const [room, id, note] of [['lv', 'hx-av-below', 'squeeze'], ['aorta', 'hx-stj', 'recoil']] as const) {
    await goTo(page, room, id); await press(page); await expect(page.locator('.dialog')).toContainText('정상 기준'); await advance(page);
    await expect.poll(async () => (await st(page)).q008.notes).toContain(note);
  }
  // the blood-pressure observer: one thing at a time
  await goTo(page, 'aorta', 'hx-ascending'); await press(page);
  const view = page.getByRole('dialog', { name: '혈압 관찰기 · 한 가지씩 바꾸기' });
  await expect(view).toBeVisible();
  await view.getByRole('button', { name: '쉬어도 계속 높음', exact: true }).click();
  await view.getByRole('button', { name: '쉬어도 계속 높음 기록하기' }).click();
  await expect(view.locator('[role=status]')).toContainText('막 움직인 뒤부터');
  await view.getByRole('button', { name: '막 움직인 뒤', exact: true }).click(); await view.getByRole('button', { name: '막 움직인 뒤 기록하기' }).click();
  await view.getByRole('button', { name: '쉬어도 계속 높음', exact: true }).click(); await view.getByRole('button', { name: '쉬어도 계속 높음 기록하기' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'artifacts/d108-q008-observer.png' });
  await page.keyboard.press('Escape'); await expect(view).toHaveCount(0);
  const mid = await st(page); expect(mid.q008.notes).toEqual(['squeeze', 'recoil', 'moved', 'high']); expect(mid.q008.mode).toBe('rest');
  // materials at the desk
  await goTo(page, 'newsroom', 'my-desk'); await press(page);
  const f = page.getByRole('dialog', { name: 'Q008 취재 · 하나의 숫자로 충분할까' });
  await expect(f).toBeVisible();
  for (let i = 0; i < 3; i++) await f.getByRole('button', { name: '이 자료를 취재 메모로 남기기' }).click();
  // the board refuses a different-condition record, an unlabelled record and a diagnosis, without saving them
  await f.getByRole('button', { name: /^병원 · 계단을 뛰어 올라온 직후/ }).click(); await expect(f.locator('.article-status')).toContainText('조건이 달라요');
  await f.getByRole('button', { name: /^언제·어디서 쟀는지/ }).click(); await expect(f.locator('.article-status')).toContainText('적혀 있지 않아');
  for (const day of ['첫째', '둘째', '셋째']) await f.getByRole('button', { name: new RegExp('^' + day + ' 날 아침') }).click();
  await f.getByRole('button', { name: '한 번 높게 나왔으니 고혈압이에요.' }).click(); await expect(f.locator('.article-status')).toContainText('관찰이에요');
  await f.getByRole('button', { name: /^한 번 높게 나온 숫자만으로는/ }).click();
  await f.getByRole('button', { name: '독자 질문에 바로 답하며 시작' }).click(); await f.getByRole('button', { name: '모형의 한계로 마무리' }).click();
  await f.getByRole('button', { name: '편집장에게 초안 보여주기' }).click();
  await page.screenshot({ path: 'artifacts/d108-q008-board.png' });
  await f.getByRole('button', { name: '게임 속 신문에 발행' }).click();
  const result = page.getByRole('dialog', { name: '발행 결과 · 독자 반응' }); await expect(result).toContainText('Q008');
  const after = await st(page);
  expect(after.q008.publishedAt).not.toBeNull(); expect(after.q008.picks).toEqual(['home-1', 'home-2', 'home-3']); expect(after.totalXp).toBe(2200);
  await result.getByRole('button', { name: '월드로 돌아가기' }).click(); await expect(page.locator('.chip .rank')).toContainText('Lv.9');
  // notebook: pressure comparison under heart exploration
  await page.keyboard.press('j'); await page.getByRole('tab', { name: '인체 탐험' }).click(); await page.locator('summary').filter({ hasText: '혈압 비교 (Q008' }).click();
  await expect(page.getByRole('tabpanel', { name: '인체 탐험' })).toContainText('한 가지만 달라요');
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

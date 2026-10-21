import { expect, test, type Page } from '@playwright/test';

/** D108 Q009 ‘독자에게 설명하는 순환’: basic course, a known principle on a new arrangement (design 03), no new disease. */

type Hook = { world: { roomId: string; setRoom(r: string, x: number, y: number, f: string): void }; game: { state: Record<string, unknown> & { totalXp: number; q009: { accepted: boolean; notes: string[]; slots: string[]; chain: string[]; publishedAt: string | null } }; importState(s: object): void; enter(r: string, x: number, y: number, f: string): void } };
const st = (p: Page) => p.evaluate(() => (window as unknown as { __mq: Hook }).__mq.game.state);

async function boot(p: Page) {
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.goto('/'); await p.getByRole('button', { name: '첫 출근하기' }).click(); await p.waitForTimeout(300);
  await Promise.all([p.waitForEvent('load'), p.evaluate(async () => {
    const f = '/tests/helpers/q009-fixture.ts', { q9Fixture } = await import(/* @vite-ignore */ f);
    const h = (window as unknown as { __mq: Hook }).__mq, s = q9Fixture();
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

test('Q009: offer, four pieces of evidence, picture drawn facing the person, one loop with evidence, analogy and publication (D108)', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page);
  await goTo(page, 'newsroom', 'editor'); await press(page); await advance(page);
  await page.getByRole('button', { name: /순환 설명 취재 맡기/ }).click();
  await expect.poll(async () => (await st(page)).q009.accepted).toBe(true);
  // evidence first, each at its own place in the heart
  for (const [room, id, note] of [['heart', 'hx-fossa', 'wall'], ['rv', 'heart-out', 'right-pump'], ['lung', 'hx-exchange', 'lung'], ['lv', 'hx-av-below', 'left-pump']] as const) {
    await goTo(page, room, id); await press(page); await expect(page.locator('.dialog')).toContainText('근거'); await advance(page);
    await expect.poll(async () => (await st(page)).q009.notes).toContain(note);
  }
  await goTo(page, 'newsroom', 'my-desk'); await press(page);
  const f = page.getByRole('dialog', { name: 'Q009 취재 · 독자에게 설명하는 순환' });
  await expect(f).toBeVisible();
  // the picture is drawn facing the person: their left heart sits on the picture's right
  await f.getByRole('button', { name: '좌심방', exact: true }).click(); await expect(f.locator('.article-status')).toContainText('마주 보고');
  await f.getByRole('button', { name: '우심실', exact: true }).click(); await expect(f.locator('.article-status')).toContainText('심방은 위');
  for (const room of ['우심방', '우심실', '좌심방', '좌심실']) await f.getByRole('button', { name: room, exact: true }).click();
  // one loop: decoys have no evidence, out-of-order cards show only the missing link
  await f.getByRole('button', { name: '좌심실에서 우심실로 바로 건너가요' }).click(); await expect(f.locator('.article-status')).toContainText('근거가 없는');
  await f.getByRole('button', { name: /^우심실 · 폐로/ }).click(); await expect(f.locator('.article-status')).toContainText('처음 들어오는 방부터');
  for (const card of [/^우심방 · /, /^우심실 · /, /^폐 · /, /^좌심방 · /, /^좌심실 · /, /^온몸 · /]) await f.getByRole('button', { name: card }).click();
  const mid = await st(page); expect(mid.q009.slots).toEqual(['ra', 'rv', 'la', 'lv']); expect(mid.q009.chain).toEqual(['ra', 'rv', 'lung', 'la', 'lv', 'body']);
  await f.getByRole('button', { name: '피를 거르는 정수기' }).click(); await expect(f.locator('.article-status')).toContainText('거르지 않고');
  await f.getByRole('button', { name: '그림의 좌우부터 풀며 시작' }).click(); await f.getByRole('button', { name: '나란히 붙은 펌프 두 대' }).click(); await f.getByRole('button', { name: '비유의 한계로 마무리' }).click();
  await f.getByRole('button', { name: '편집장에게 초안 보여주기' }).click();
  await page.screenshot({ path: 'artifacts/d108-q009-board.png' });
  await f.getByRole('button', { name: '게임 속 신문에 발행' }).click();
  const result = page.getByRole('dialog', { name: '발행 결과 · 독자 반응' }); await expect(result).toContainText('Q009');
  const after = await st(page);
  expect(after.q009.publishedAt).not.toBeNull(); expect(after.totalXp).toBe(2700);
  await result.getByRole('button', { name: '월드로 돌아가기' }).click(); await expect(page.locator('.chip .rank')).toContainText('Lv.10');
  // notebook: the reporting file keeps the evidence
  await page.keyboard.press('j'); await page.getByRole('tab', { name: '취재 파일' }).click(); await page.locator('summary').filter({ hasText: 'Q009 · 독자에게 설명하는 순환' }).click();
  await expect(page.getByRole('tabpanel', { name: '취재 파일' })).toContainText('근거 다시 보기 4/4');
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

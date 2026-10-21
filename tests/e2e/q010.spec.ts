import { expect, test, type Page } from '@playwright/test';

/** D108 Q010 ‘심장 졸업 특집호’: special delivery run, core-structure check on the spot, easy special article, graduation. */

type Hook = { world: { roomId: string; setRoom(r: string, x: number, y: number, f: string): void }; game: { state: Record<string, unknown> & { totalXp: number; gold: number; mastery: Record<string, { stars: number }>; q010: { accepted: boolean; runDone: boolean; claim: string | null; evidence: string[]; publishedAt: string | null } }; importState(s: object): void; enter(r: string, x: number, y: number, f: string): void }; run: { start: number; waypoints: { id: string; done: boolean }[]; oxygen: boolean } | null };
const st = (p: Page) => p.evaluate(() => (window as unknown as { __mq: Hook }).__mq.game.state);

async function boot(p: Page) {
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.goto('/'); await p.getByRole('button', { name: '첫 출근하기' }).click(); await p.waitForTimeout(300);
  await Promise.all([p.waitForEvent('load'), p.evaluate(async () => {
    const f = '/tests/helpers/q010-fixture.ts', { q10Fixture } = await import(/* @vite-ignore */ f);
    const { coreIds } = await import(/* @vite-ignore */ '/src/domain/q010.ts' as string);
    const h = (window as unknown as { __mq: Hook }).__mq, s = q10Fixture();
    // Every core structure but one is recorded with a star; the tricuspid valve has never been seen.
    const mastery: Record<string, unknown> = {}; for (const id of coreIds as string[]) if (id !== 'hx-tricuspid') mastery[id] = { stars: 1, kinds: ['name'] };
    const inspected = (s.inspected as string[]).filter((k: string) => k !== 'hx:hx-tricuspid').concat((coreIds as string[]).filter(id => id !== 'hx-tricuspid').map(id => 'hx:' + id).filter(k => !(s.inspected as string[]).includes(k)));
    h.game.importState({ ...s, inspected, mastery, saveId: (h.game.state as unknown as { saveId: string }).saveId });
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
const press = async (p: Page) => { await p.locator('#view').focus(); await p.keyboard.press('e'); await p.waitForTimeout(250); };
const advance = async (p: Page) => { for (let i = 0; i < 8 && await p.locator('.dialog').isVisible() && !await p.locator('.dialog .choices').count(); i++) { await p.keyboard.press('e'); await p.waitForTimeout(150); } };

test('Q010: offer, special delivery run, core check on the spot, claim and evidence with a missing-record hint, graduation (D108)', async ({ page }) => {
  test.setTimeout(150000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page);
  await goTo(page, 'newsroom', 'editor'); await press(page); await advance(page);
  await page.getByRole('button', { name: /심장 졸업 특집호 맡기/ }).click();
  await expect.poll(async () => (await st(page)).q010.accepted).toBe(true);
  // 1 · the special delivery run (any grade). The walked run itself is covered by heart-run.spec; here the settlement command
  // that the run calls at the ascending aorta is used directly, so the special issue reacts to the real Game method.
  await goTo(page, 'aorta', 'hx-ascending');
  await page.evaluate(() => (window as unknown as { __mq: { game: { finishRun(r: object): unknown } } }).__mq.game.finishRun({ runId: 'q010e2e', seconds: 80, oxygen: true, kind: 'blood', waypoints: [{ id: 'hx-svc', correct: false }, { id: 'hx-pv', correct: false }, { id: 'hx-lvwall', correct: false }] }));
  await expect.poll(async () => (await st(page)).q010.runDone).toBe(true);
  // 2 · the last core structure without a star: description, then one question on the spot
  await goTo(page, 'heart', 'hx-tricuspid'); await press(page); await advance(page);
  await page.getByRole('button', { name: '삼첨판', exact: true }).click(); await advance(page);
  await expect.poll(async () => (await st(page)).mastery['hx-tricuspid']?.stars ?? 0).toBe(1);
  // 3 · the special article at the desk
  await goTo(page, 'newsroom', 'my-desk'); await press(page);
  const f = page.getByRole('dialog', { name: 'Q010 취재 · 심장 졸업 특집호' });
  await expect(f).toBeVisible();
  await f.getByRole('button', { name: '심장은 피를 만들고 깨끗하게 걸러요.' }).click(); await expect(f.locator('.article-status')).toContainText('만들거나 거르는');
  await f.getByRole('button', { name: /^심장은 피를 한 방향으로/ }).click();
  await f.getByRole('button', { name: /^전기 신호가/ }).click(); await expect(f.locator('.article-status')).toContainText('필요한 기록');
  await f.getByRole('button', { name: /^판막은 한쪽으로만/ }).click(); await f.getByRole('button', { name: /^오른쪽은 폐로/ }).click();
  await f.getByRole('button', { name: '피를 모아 두는 물탱크' }).click(); await expect(f.locator('.article-status')).toContainText('모아 두지');
  await f.getByRole('button', { name: '한 문장 답으로 시작' }).click(); await f.getByRole('button', { name: '나란히 붙은 펌프 두 대' }).click(); await f.getByRole('button', { name: '비유의 한계로 마무리' }).click();
  await f.getByRole('button', { name: '편집장에게 초안 보여주기' }).click();
  await page.screenshot({ path: 'artifacts/d108-q010-board.png' });
  const before = await st(page), gold0 = before.gold;
  await f.getByRole('button', { name: '졸업 특집호 발행' }).click();
  const result = page.getByRole('dialog', { name: '발행 결과 · 독자 반응' }); await expect(result).toContainText('Q010');
  const after = await st(page);
  expect(after.q010.publishedAt).not.toBeNull(); expect(after.totalXp).toBe(before.totalXp); // Q010 pays 0XP (Lv.10 cap) expect(after.gold - gold0).toBeGreaterThanOrEqual(400);
  await result.getByRole('button', { name: '월드로 돌아가기' }).click();
  await page.keyboard.press('j');
  await expect(page.getByRole('tabpanel', { name: '지금 할 일' })).toContainText('직급 · 신입 기자 · 심장 졸업');
  await expect(page.getByRole('tabpanel', { name: '지금 할 일' })).toContainText('폐 초대장');
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

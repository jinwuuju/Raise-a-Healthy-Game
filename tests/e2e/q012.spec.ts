import { expect, test, type Page } from '@playwright/test';

/** D113 Q012 ‘갈라지는 길’: offer, four scenes in the pharynx and larynx, the fork observer, the swallow steps in order, publication. */

type Q12 = { accepted: boolean; notes: string[]; compared: string[]; order: string[]; publishedAt: string | null };
type Hook = {
  world: { roomId: string; setRoom(r: string, x: number, y: number, f: string): void };
  game: { state: Record<string, unknown> & { totalXp: number; gold: number; inspected: string[]; q012: Q12 }; importState(s: object): void; enter(r: string, x: number, y: number, f: string): void };
};
const st = (p: Page) => p.evaluate(() => (window as unknown as { __mq: Hook }).__mq.game.state);

async function boot(p: Page, fixture: 'q012' | 'q013') {
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.goto('/'); await p.getByRole('button', { name: '첫 출근하기' }).click(); await p.waitForTimeout(300);
  await Promise.all([p.waitForEvent('load'), p.evaluate(async fixture => {
    const f = '/tests/helpers/' + fixture + '-fixture.ts', mod = await import(/* @vite-ignore */ f);
    const h = (window as unknown as { __mq: Hook }).__mq, s = fixture === 'q012' ? mod.q12Fixture() : mod.q13Fixture();
    h.game.importState({ ...s, at: { room: 'newsroom', x: 464, y: 152, facing: 'up' }, saveId: (h.game.state as unknown as { saveId: string }).saveId });
    location.reload();
  }, fixture)]);
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
const advance = async (p: Page) => { for (let i = 0; i < 8 && await p.locator('.dialog').isVisible() && !await p.locator('.dialog .choices').count(); i++) { await p.keyboard.press('e'); await p.waitForTimeout(150); } };
const closeDialogs = async (p: Page) => { await advance(p); for (let i = 0; i < 4 && await p.locator('.dialog').isVisible(); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(200); } };
async function colours(p: Page, sel: string) {
  return p.evaluate(sel => {
    const c = document.querySelector(sel) as HTMLCanvasElement, d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data, set = new Set<number>();
    for (let i = 0; i < d.length; i += 4 * 29) set.add((d[i]! << 16) | (d[i + 1]! << 8) | d[i + 2]!);
    return set.size;
  }, sel);
}

test('Q012: offer, four throat scenes, fork observer, swallow steps in order with hints, publication at Lv.12 (D113)', async ({ page }) => {
  test.setTimeout(150000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page, 'q012');
  await goTo(page, 'newsroom', 'editor'); await press(page); await advance(page);
  await page.getByRole('button', { name: /갈라지는 길 취재 맡기/ }).click();
  await expect.poll(async () => (await st(page)).q012.accepted).toBe(true);

  // Four scenes: two in the pharynx (side section), two in the larynx (front section).
  for (const [room, target, n] of [['pharynx', 'rx-soft-palate', 1], ['pharynx', 'rx-fork', 2], ['larynx', 'rx-epiglottis', 3], ['larynx', 'rx-glottis', 4]] as const) {
    await goTo(page, room, target); await closeDialogs(page);
    await goTo(page, room, target); await press(page);
    await expect(page.locator('.dialog')).toContainText('장면');
    await advance(page);
    await expect.poll(async () => (await st(page)).q012.notes.length).toBe(n);
  }
  expect((await st(page)).inspected).toContain('rx:rx-epiglottis');

  // The fork observer in front of the oesophagus: only what passes the throat changes.
  await goTo(page, 'pharynx', 'rx-esophagus'); await closeDialogs(page);
  await goTo(page, 'pharynx', 'rx-esophagus'); await press(page);
  const obs = page.getByRole('dialog', { name: /갈림길 관찰기/ });
  await expect(obs).toBeVisible();
  await page.waitForTimeout(300); expect(await colours(page, '.fork-sheet canvas')).toBeGreaterThan(20);
  for (const label of ['숨 쉴 때의 공기', '물 한 모금 삼킬 때', '부스러기가 잘못 넘어갈 때']) {
    await obs.getByRole('button', { name: label, exact: true }).click();
    await obs.getByRole('button', { name: label + ' 기록하기' }).click();
  }
  await expect(obs).toContainText('기침');
  await obs.getByRole('button', { name: '물 한 모금 삼킬 때', exact: true }).click();
  await expect(obs.locator('.fork-gates')).toContainText('잠깐 멈춤');
  await page.screenshot({ path: 'artifacts/d113-fork-observer.png' });
  await expect.poll(async () => (await st(page)).q012.compared.length).toBe(3);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);

  // The desk: a later step and the decoy give hints and are not saved; then the four steps, lead, analogy, limit.
  await goTo(page, 'newsroom', 'my-desk'); await press(page);
  const f = page.getByRole('dialog', { name: 'Q012 취재 · 갈라지는 길' });
  await expect(f).toBeVisible();
  await f.getByRole('button', { name: '뒤쪽 식도 입구가 열려 물이 음식 길로 내려가요' }).click(); await expect(f.locator('.article-status')).toContainText('Q012');
  await f.getByRole('button', { name: '삼키는 동안 공기 길과 음식 길이 함께 활짝 열려요' }).click(); await expect(f.locator('.article-status')).toContainText('식도 입구');
  expect((await st(page)).q012.order).toEqual([]);
  await f.getByRole('button', { name: /^물이 입 쪽에서 목구멍으로 넘어와요/ }).click();
  await f.getByRole('button', { name: /^목젖이 코 쪽 길을/ }).click();
  await f.getByRole('button', { name: '뒤쪽 식도 입구가 열려 물이 음식 길로 내려가요' }).click();
  await f.getByRole('button', { name: '덮개가 다시 서고 성대 틈이 열려 숨이 이어져요' }).click();
  await expect.poll(async () => (await st(page)).q012.order).toEqual(['arrive', 'close', 'down', 'open']);
  await f.getByRole('button', { name: '절대 안 막히는 목으로 시작' }).click(); await expect(f.locator('.article-status')).toContainText('기침');
  await f.getByRole('button', { name: '독자 질문으로 시작' }).click();
  await f.getByRole('button', { name: '따로 꽂힌 빨대 두 개' }).click(); await expect(f.locator('.article-status')).toContainText('갈라져요');
  await f.getByRole('button', { name: '철길 갈림목의 전환기' }).click();
  await f.getByRole('button', { name: '비유의 한계로 마무리' }).click();
  await f.getByRole('button', { name: '편집장에게 초안 보여주기' }).click();
  await page.screenshot({ path: 'artifacts/d113-q012-board.png' });
  const before = await st(page);
  await f.getByRole('button', { name: '게임 속 신문에 발행' }).click();
  const result = page.getByRole('dialog', { name: '발행 결과 · 독자 반응' }); await expect(result).toContainText('Q012');
  const after = await st(page);
  expect(after.q012.publishedAt).not.toBeNull(); expect(after.totalXp - before.totalXp).toBe(600); expect(after.gold - before.gold).toBeGreaterThanOrEqual(400);
  await result.getByRole('button', { name: '월드로 돌아가기' }).click();
  await expect(page.locator('.chip .rank')).toContainText('Lv.12');
  await page.keyboard.press('j');
  await expect(page.getByRole('tabpanel', { name: '지금 할 일' })).toContainText('갈라지는 길 기사 발행 완료');
  await page.getByRole('tab', { name: '취재 파일' }).click();
  await expect(page.getByRole('tabpanel', { name: '취재 파일' })).toContainText('Q012 · 갈라지는 길 · 발행 완료');
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

test('Q012 after publication: fork observer replay in front of the oesophagus, phone width, no overflow (D113)', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page, 'q013');
  await goTo(page, 'pharynx', 'rx-esophagus'); await closeDialogs(page);
  await goTo(page, 'pharynx', 'rx-esophagus'); await press(page);
  await page.getByRole('button', { name: /^관찰기 다시 보기/ }).click();
  const obs = page.getByRole('dialog', { name: /갈림길 관찰기/ });
  await expect(obs).toBeVisible();
  await expect(obs.locator('button.fork-record')).toBeDisabled();
  await page.waitForTimeout(300); expect(await colours(page, '.fork-sheet canvas')).toBeGreaterThan(20);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: 'artifacts/d113-fork-observer-390.png' });
  const s = await st(page); expect(s.q012.compared).toEqual(['breath', 'swallow', 'slip']);
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

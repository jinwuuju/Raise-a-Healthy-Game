import { expect, test, type Page } from '@playwright/test';

/** D117 Q013 ‘두 개의 흐름’: offer, four scenes in the trachea and bronchi, the flow observer, sorting into two flows, publication. */
type Q13 = { accepted: boolean; notes: string[]; compared: string[]; sorted: string[]; publishedAt: string | null };
type Hook = {
  world: { roomId: string; setRoom(r: string, x: number, y: number, f: string): void };
  game: { state: Record<string, unknown> & { totalXp: number; gold: number; inspected: string[]; q013: Q13 }; importState(s: object): void; enter(r: string, x: number, y: number, f: string): void };
};
const st = (p: Page) => p.evaluate(() => (window as unknown as { __mq: Hook }).__mq.game.state);

async function boot(p: Page, fixture: 'q013' | 'q014') {
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.goto('/'); await p.getByRole('button', { name: '첫 출근하기' }).click(); await p.waitForTimeout(300);
  await Promise.all([p.waitForEvent('load'), p.evaluate(async fixture => {
    const f = '/tests/helpers/' + fixture + '-fixture.ts', mod = await import(/* @vite-ignore */ f);
    const h = (window as unknown as { __mq: Hook }).__mq, s = fixture === 'q013' ? mod.q13Fixture() : mod.q14Fixture();
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

test('Q013: offer, four windpipe scenes, flow observer, sorting into two flows with hints, publication at Lv.13 (D117)', async ({ page }) => {
  test.setTimeout(150000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page, 'q013');
  await goTo(page, 'newsroom', 'editor'); await press(page); await advance(page);
  await page.getByRole('button', { name: /두 개의 흐름 취재 맡기/ }).click();
  await expect.poll(async () => (await st(page)).q013.accepted).toBe(true);

  // Four scenes: three in the trachea, one in the bronchial tree.
  for (const [room, target, n] of [['trachea', 'rx-c-ring', 1], ['trachea', 'rx-escalator', 2], ['trachea', 'rx-carina', 3], ['bronchi', 'rx-lobar', 4]] as const) {
    await goTo(page, room, target); await closeDialogs(page);
    await goTo(page, room, target); await press(page);
    await expect(page.locator('.dialog')).toContainText('장면');
    await advance(page);
    await expect.poll(async () => (await st(page)).q013.notes.length).toBe(n);
  }
  expect((await st(page)).inspected).toContain('rx:rx-carina');

  // The flow observer in the middle of the trachea: only the breath changes.
  await goTo(page, 'trachea', 'rx-goblet'); await closeDialogs(page);
  await goTo(page, 'trachea', 'rx-goblet'); await press(page);
  const obs = page.getByRole('dialog', { name: /두 흐름 관찰기/ });
  await expect(obs).toBeVisible();
  await page.waitForTimeout(300); expect(await colours(page, '.flow-sheet canvas')).toBeGreaterThan(20);
  for (const label of ['숨을 들이쉴 때', '숨을 내쉴 때', '숨을 잠깐 참을 때']) {
    await obs.getByRole('button', { name: label, exact: true }).click();
    await obs.getByRole('button', { name: label + ' 기록하기' }).click();
  }
  await expect(obs.locator('.flow-list')).toContainText('멈춤');
  await obs.getByRole('button', { name: '숨을 들이쉴 때', exact: true }).click();
  await expect(obs.locator('.flow-list')).toContainText('아래로');
  // The two flows are drawn inside the windpipe picture: a blue air arrow and yellow mucus arrows (exact palette colours).
  const px = (rgb: number[]) => page.evaluate(rgb => {
    const c = document.querySelector('.flow-sheet canvas') as HTMLCanvasElement, d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data; let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] === rgb[0] && d[i + 1] === rgb[1] && d[i + 2] === rgb[2]) n++;
    return n;
  }, rgb);
  await page.waitForTimeout(250);
  expect(await px([143, 211, 255])).toBeGreaterThan(40);
  expect(await px([236, 216, 106])).toBeGreaterThan(40);
  await page.screenshot({ path: 'artifacts/d117-flow-observer.png' });
  await expect.poll(async () => (await st(page)).q013.compared.length).toBe(3);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);

  // The desk: a wrong flow and the decoy give hints and are not saved; then the four movements, lead, analogy, limit.
  await goTo(page, 'newsroom', 'my-desk'); await press(page);
  const f = page.getByRole('dialog', { name: 'Q013 취재 · 두 개의 흐름' });
  await expect(f).toBeVisible();
  await f.getByRole('button', { name: '숨을 쉬든 참든 늘 목 쪽 위로만 가요 → 공기 흐름' }).click(); await expect(f.locator('.article-status')).toContainText('Q013');
  await f.getByRole('button', { name: '숨을 들이쉬면 같이 폐 쪽으로 빨려 내려가요 → 점액 흐름' }).click(); await expect(f.locator('.article-status')).toContainText('섬모');
  expect((await st(page)).q013.sorted).toEqual([]);
  await f.getByRole('button', { name: '숨을 쉬든 참든 늘 목 쪽 위로만 가요 → 점액 흐름' }).click();
  await f.getByRole('button', { name: /^들이쉬면 폐 쪽으로 내려가고.* → 공기 흐름$/ }).click();
  await f.getByRole('button', { name: /^가는 가지에서 올라온 것이.* → 점액 흐름$/ }).click();
  await f.getByRole('button', { name: /^기관 맨 아래 능선에서.* → 공기 흐름$/ }).click();
  await expect.poll(async () => (await st(page)).q013.sorted.length).toBe(4);
  await f.getByRole('button', { name: '텅 빈 관으로 시작' }).click(); await expect(f.locator('.article-status')).toContainText('섬모');
  await f.getByRole('button', { name: '독자 질문으로 시작' }).click();
  await f.getByRole('button', { name: '빨대 하나' }).click(); await expect(f.locator('.article-status')).toContainText('점액');
  await f.getByRole('button', { name: '바람 부는 터널 속 에스컬레이터' }).click();
  await f.getByRole('button', { name: '비유의 한계로 마무리' }).click();
  await f.getByRole('button', { name: '편집장에게 초안 보여주기' }).click();
  await page.screenshot({ path: 'artifacts/d117-q013-board.png' });
  const before = await st(page);
  await f.getByRole('button', { name: '게임 속 신문에 발행' }).click();
  const result = page.getByRole('dialog', { name: '발행 결과 · 독자 반응' }); await expect(result).toContainText('Q013');
  const after = await st(page);
  expect(after.q013.publishedAt).not.toBeNull(); expect(after.totalXp - before.totalXp).toBe(680); expect(after.gold - before.gold).toBeGreaterThanOrEqual(420);
  await result.getByRole('button', { name: '월드로 돌아가기' }).click();
  await expect(page.locator('.chip .rank')).toContainText('Lv.13');
  await page.keyboard.press('j');
  await expect(page.getByRole('tabpanel', { name: '지금 할 일' })).toContainText('두 개의 흐름 기사 발행 완료');
  await page.getByRole('tab', { name: '취재 파일' }).click();
  await expect(page.getByRole('tabpanel', { name: '취재 파일' })).toContainText('Q013 · 두 개의 흐름 · 발행 완료');
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

test('Q013 after publication: flow observer replay in the trachea, phone width, no overflow (D117)', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page, 'q014');
  await goTo(page, 'trachea', 'rx-goblet'); await closeDialogs(page);
  await goTo(page, 'trachea', 'rx-goblet'); await press(page);
  await page.getByRole('button', { name: /^관찰기 다시 보기/ }).click();
  const obs = page.getByRole('dialog', { name: /두 흐름 관찰기/ });
  await expect(obs).toBeVisible();
  await expect(obs.locator('button.flow-record')).toBeDisabled();
  await page.waitForTimeout(300); expect(await colours(page, '.flow-sheet canvas')).toBeGreaterThan(20);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: 'artifacts/d117-flow-observer-390.png' });
  const s = await st(page); expect(s.q013.compared).toEqual(['in', 'out', 'hold']);
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

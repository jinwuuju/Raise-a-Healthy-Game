import { expect, test, type Page } from '@playwright/test';

/** D112 Q011 ‘공기 항구’: offer, nostril entry film, four scenes in the nose, the air-port observer, the desk and publication. */
type Q11 = { accepted: boolean; notes: string[]; compared: string[]; pairs: string[]; publishedAt: string | null };
type Hook = {
  world: { roomId: string; setRoom(r: string, x: number, y: number, f: string): void };
  game: { state: Record<string, unknown> & { totalXp: number; gold: number; inspected: string[]; q011: Q11 }; importState(s: object): void; enter(r: string, x: number, y: number, f: string): void };
};
const st = (p: Page) => p.evaluate(() => (window as unknown as { __mq: Hook }).__mq.game.state);

async function boot(p: Page, fixture: 'q011' | 'q012') {
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.goto('/'); await p.getByRole('button', { name: '첫 출근하기' }).click(); await p.waitForTimeout(300);
  await Promise.all([p.waitForEvent('load'), p.evaluate(async fixture => {
    const f = '/tests/helpers/' + fixture + '-fixture.ts', mod = await import(/* @vite-ignore */ f);
    const h = (window as unknown as { __mq: Hook }).__mq, s = fixture === 'q011' ? mod.q11Fixture() : mod.q12Fixture();
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
async function colours(p: Page, sel: string) {
  return p.evaluate(sel => {
    const c = document.querySelector(sel) as HTMLCanvasElement, d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data, set = new Set<number>();
    for (let i = 0; i < d.length; i += 4 * 29) set.add((d[i]! << 16) | (d[i + 1]! << 8) | d[i + 2]!);
    return set.size;
  }, sel);
}

test('Q011: offer, nostril film, four nose scenes, air-port observer, scene-backed jobs with hints, publication at Lv.11 (D112)', async ({ page }) => {
  test.setTimeout(150000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page, 'q011');
  await goTo(page, 'newsroom', 'editor'); await press(page); await advance(page);
  await page.getByRole('button', { name: /공기 항구 취재 맡기/ }).click();
  await expect.poll(async () => (await st(page)).q011.accepted).toBe(true);

  // Bodyscope -> airway: the nostril entry film (skippable), then the nasal cavity.
  await goTo(page, 'newsroom', 'device'); await press(page);
  await page.getByRole('button', { name: /^호흡기/ }).click();
  const film = page.locator('.airway-entry');
  await expect(film).toBeVisible(); await expect(film).toContainText('콧구멍');
  await page.waitForTimeout(400); expect(await colours(page, '.airway-entry canvas')).toBeGreaterThan(8);
  await page.screenshot({ path: 'artifacts/d112-nostril-film.png' });
  await film.getByRole('button', { name: '바로 들어가기' }).click();
  await page.waitForFunction(() => (window as unknown as { __mq: Hook }).__mq.world.roomId === 'nose', null, { timeout: 6000 });
  await page.waitForTimeout(900); await advance(page);
  for (let i = 0; i < 4 && await page.locator('.dialog').isVisible(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(200); }

  // Four scenes, each beside its structure (two of them are deeper structures that are not locked for the quest).
  for (const [target, n] of [['rx-vestibule', 1], ['rx-inferior-concha', 2], ['rx-mucosa', 3], ['rx-cilia-nose', 4]] as const) {
    await goTo(page, 'nose', target); await press(page);
    await expect(page.locator('.dialog')).toContainText('장면');
    await advance(page);
    await expect.poll(async () => (await st(page)).q011.notes.length).toBe(n);
  }
  expect((await st(page)).inspected).toContain('rx:rx-mucosa');

  // The observer at the back of the nose: only the incoming air changes.
  await goTo(page, 'nose', 'rx-choana'); await press(page);
  const obs = page.getByRole('dialog', { name: /공기 항구 관찰기/ });
  await expect(obs).toBeVisible();
  await page.waitForTimeout(300); expect(await colours(page, '.air-sheet canvas')).toBeGreaterThan(20);
  for (const label of ['차고 마른 겨울 공기', '먼지와 꽃가루가 많은 공기', '바이러스가 든 작은 알갱이가 섞인 공기']) {
    await obs.getByRole('button', { name: label, exact: true }).click();
    await obs.getByRole('button', { name: label + ' 기록하기' }).click();
  }
  await expect(obs).toContainText('모두 막지는 못');
  await page.screenshot({ path: 'artifacts/d112-air-port-observer.png' });
  await expect.poll(async () => (await st(page)).q011.compared.length).toBe(3);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);

  // The desk: wrong scene and the decoy give hints and are not saved; then three valid scenes, lead, analogy, limit.
  await goTo(page, 'newsroom', 'my-desk'); await press(page);
  const f = page.getByRole('dialog', { name: 'Q011 취재 · 공기 항구' });
  await expect(f).toBeVisible();
  await f.getByRole('button', { name: '입구의 굵은 털에 큰 먼지가 걸려요' }).click(); await expect(f.locator('.article-status')).toContainText('Q011');
  await f.getByRole('button', { name: '콧구멍에서 산소가 바로 피로 들어가요' }).click(); await expect(f.locator('.article-status')).toContainText('폐');
  expect((await st(page)).q011.pairs).toEqual([]);
  await f.getByRole('button', { name: '늘 젖은 벽 바로 아래 가는 핏줄이 촘촘해요' }).click();
  await f.getByRole('button', { name: '끈끈한 막에 알갱이가 붙어 목 쪽으로 흘러가요' }).click();
  await f.getByRole('button', { name: '입구의 굵은 털에 큰 먼지가 걸려요' }).click();
  await expect.poll(async () => (await st(page)).q011.pairs).toEqual(['wall', 'mucus', 'hairs']);
  await f.getByRole('button', { name: '완벽한 방패로 시작' }).click(); await expect(f.locator('.article-status')).toContainText('뒤콧구멍');
  await f.getByRole('button', { name: '독자 질문으로 시작' }).click();
  await f.getByRole('button', { name: '균을 모두 거르는 정수기 필터' }).click(); await expect(f.locator('.article-status')).toContainText('모두 막지는');
  await f.getByRole('button', { name: '데우고 적시고 검사하는 항구' }).click();
  await f.getByRole('button', { name: '비유의 한계로 마무리' }).click();
  await f.getByRole('button', { name: '편집장에게 초안 보여주기' }).click();
  await page.screenshot({ path: 'artifacts/d112-q011-board.png' });
  const before = await st(page);
  await f.getByRole('button', { name: '게임 속 신문에 발행' }).click();
  const result = page.getByRole('dialog', { name: '발행 결과 · 독자 반응' }); await expect(result).toContainText('Q011');
  const after = await st(page);
  expect(after.q011.publishedAt).not.toBeNull(); expect(after.totalXp - before.totalXp).toBe(550); expect(after.gold - before.gold).toBeGreaterThanOrEqual(380);
  await result.getByRole('button', { name: '월드로 돌아가기' }).click();
  await expect(page.locator('.chip .rank')).toContainText('Lv.11');
  await page.keyboard.press('j');
  await expect(page.getByRole('tabpanel', { name: '지금 할 일' })).toContainText('공기 항구 기사 발행 완료');
  await page.getByRole('tab', { name: '취재 파일' }).click();
  await expect(page.getByRole('tabpanel', { name: '취재 파일' })).toContainText('Q011 · 공기 항구 · 발행 완료');
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

test('Q011 after publication: observer replay at the back of the nose, phone width, no overflow (D112)', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page, 'q012');
  await goTo(page, 'nose', 'rx-choana'); await press(page); await advance(page);
  for (let i = 0; i < 4 && await page.locator('.dialog').isVisible(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(200); }
  await press(page);
  await page.getByRole('button', { name: /^관찰기 다시 보기/ }).click();
  const obs = page.getByRole('dialog', { name: /공기 항구 관찰기/ });
  await expect(obs).toBeVisible();
  await expect(obs.locator('button.air-record')).toBeDisabled();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: 'artifacts/d112-air-port-observer-390.png' });
  const s = await st(page); expect(s.q011.compared).toEqual(['cold', 'dust', 'virus']);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // The Bodyscope map opens inside the airway too: this room, the air path and the body with the airway open.
  await page.locator('#view').focus(); await page.keyboard.press('m');
  const map = page.getByRole('dialog', { name: '바디스코프 지도' });
  await expect(map).toBeVisible(); await expect(map).toContainText('이 방에서 찾은 구조');
  await map.getByRole('button', { name: '호흡기', exact: true }).click();
  await expect(map).toContainText('공기 길 · 콧구멍에서 폐포까지'); await page.waitForTimeout(300);
  expect(await colours(page, '.atlas-sheet canvas')).toBeGreaterThan(20);
  await page.screenshot({ path: 'artifacts/d112-airway-map-390.png' });
  await map.getByRole('button', { name: '인체', exact: true }).click();
  await expect(map).toContainText('호흡기(콧구멍부터 폐포까지)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

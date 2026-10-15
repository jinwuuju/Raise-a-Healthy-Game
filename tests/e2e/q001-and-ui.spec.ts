import { expect, test, type Page } from '@playwright/test';

type W = { roomId: string; tap(p: { x: number; y: number }): void; player: { x: number; y: number }; traffic: { t: number }; waitingAt: unknown };
type Hook = { world: W | null; game: { state: Record<string, unknown> & { cafe: Record<string, unknown> }; importState(s: unknown): void } };
const room = (page: Page) => page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.world?.roomId ?? null);
const tap = (page: Page, x: number, y: number) => page.evaluate(([px, py]) => (window as unknown as { __mq: Hook }).__mq.world!.tap({ x: px!, y: py! }), [x, y]);
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('medical-quest.v4.current')!));
async function finishDialog(page: Page) {
  for (let i = 0; i < 14 && await page.locator('.dialog').count(); i++) { await page.keyboard.press('e'); await page.waitForTimeout(120); }
}
async function untilChoices(page: Page) {
  for (let i = 0; i < 10 && !(await page.locator('.dialog .choices').count()); i++) { await page.keyboard.press('e'); await page.waitForTimeout(150); }
}
async function start(page: Page, patch: Record<string, unknown>) {
  await page.goto('/');
  await page.getByRole('button', { name: '첫 출근하기' }).click();
  // Import and reload in one task so the running frame loop cannot write the old position back.
  await Promise.all([
    page.waitForEvent('load'),
    page.evaluate(p => { const mq = (window as unknown as { __mq: Hook }).__mq; const s = mq.game.state; mq.game.importState({ ...s, ...p, cafe: { ...s.cafe, welcomeUsed: true } }); location.reload(); }, patch),
  ]);
  await page.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world);
  await page.waitForTimeout(300);
}

test('Q001 inside the heart: commission → Bodyscope → right atrium → wait for the tricuspid → right ventricle → back to the newsroom', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await start(page, { flags: ['met-editor', 'reported-back'] });
  await expect(page.locator('.quest p')).toContainText('첫 취재');
  await tap(page, 256, 80);
  await expect(page.locator('.dialog')).toBeVisible({ timeout: 8000 });
  await untilChoices(page);
  await page.locator('.choice', { hasText: '취재 맡기' }).click();
  await finishDialog(page);
  await expect(page.locator('.quest p')).toContainText('바디스코프');
  await tap(page, 464, 118);
  await expect(page.locator('.dialog')).toBeVisible({ timeout: 10000 });
  await untilChoices(page);
  await page.locator('.choice', { hasText: '심장 속으로 들어가기' }).click();
  await expect.poll(() => room(page), { timeout: 8000 }).toBe('heart');
  await expect(page.locator('.cycle')).toBeVisible();
  await expect(page.locator('.cycle b')).not.toHaveText('');
  await expect(page.locator('.quest p')).toContainText('돌아오는 문');
  // First visit: the guide robot explains valves and the cycle panel once.
  await expect(page.locator('.dialog')).toBeVisible({ timeout: 6000 });
  await expect(page.locator('.dialog')).toContainText('바디');
  await finishDialog(page);
  await page.waitForTimeout(300);
  // The returning door: the inferior vena cava opening across the atrium.
  await tap(page, 150, 256);
  await expect(page.locator('.dialog')).toBeVisible({ timeout: 12000 });
  for (let i = 0; i < 8 && await page.locator('.dialog').count(); i++) { await page.mouse.click(640, 120); await page.waitForTimeout(150); }
  await expect(page.locator('.dialog')).toHaveCount(0);
  await expect(page.locator('.quest p')).toContainText('1/2');
  // Walk down through the tricuspid valve: the reporter waits while it is shut and goes through when it opens.
  await tap(page, 300, 412);
  await expect.poll(() => room(page), { timeout: 20000 }).toBe('rv');
  await expect(page.locator('.quest p')).toContainText('폐동맥판');
  await page.waitForTimeout(500);
  await tap(page, 388, 94);
  await expect(page.locator('.dialog')).toBeVisible({ timeout: 20000 });
  await finishDialog(page);
  const s = await saved(page);
  expect([s.totalXp, s.flags.includes('q001-observed')]).toEqual([20, true]);
  await expect(page.locator('.chip .rank')).toContainText('20/100XP');
  await expect(page.locator('.quest p')).toContainText('탐험 기록');
  await tap(page, 250, 430);
  await expect(page.locator('.dialog')).toBeVisible({ timeout: 15000 });
  await untilChoices(page);
  await page.locator('.choice', { hasText: '돌아가기' }).click();
  await expect.poll(() => room(page), { timeout: 8000 }).toBe('newsroom');
  await expect(page.locator('.cycle')).toBeHidden();
  await page.waitForTimeout(400);
  await tap(page, 256, 80);
  await expect(page.locator('.dialog')).toBeVisible({ timeout: 10000 });
  await finishDialog(page);
  expect((await saved(page)).flags).toContain('q001-briefed');
  await expect(page.locator('.quest p')).toContainText('첫 기사');
  // The actual reporting route now continues from the newsroom desk to the first issue.
  await tap(page, 160, 176);
  const article = page.getByRole('dialog', { name: '첫 기사 · 사라진 혈액 배달표' });
  await expect(article).toBeVisible({ timeout: 10000 });
  await article.getByRole('button', { name: /독자의 질문으로 시작/ }).click();
  await article.getByLabel('2 · 돌아오는 피의 근거').selectOption('heart-in');
  await article.getByLabel('3 · 폐로 향하는 피의 근거').selectOption('heart-out');
  await article.getByRole('button', { name: '편집장에게 초안 보여주기' }).click();
  await article.getByRole('button', { name: '게임 속 신문에 발행' }).click();
  const result = page.getByRole('dialog', { name: '발행 결과 · 독자 반응' }); await expect(result).toBeVisible();
  await result.getByRole('button', { name: '결과 바로 보기' }).click();
  await expect(result.locator('.reader-voice')).toHaveCount(3);
  const published = await saved(page);
  expect([published.totalXp, published.gold]).toEqual([100, 100 + published.reactions.results[0].bonusGold]);
  await result.getByRole('button', { name: '월드로 돌아가기' }).click();
  await expect(page.locator('.chip .rank')).toContainText('Lv.2');
  expect(errors).toEqual([]);
});

test('valves: a closed valve holds the reporter, it never opens backwards, and blood leads from the right ventricle to the lungs', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await start(page, { flags: ['met-editor', 'reported-back', 'q001-accepted', 'q001-entered'], at: { room: 'rv', x: 380, y: 130, facing: 'up' } });
  expect(await room(page)).toBe('rv');
  // Freeze the beat in diastole: the pulmonary valve is shut, so the reporter stops below it.
  await page.evaluate(() => { const w = (window as unknown as { __mq: { world: { heartClock: number } } }).__mq.world; w.heartClock = 0.65 * 7; });
  await tap(page, 388, 12);
  await expect(page.locator('.toast')).toContainText('폐동맥판이 닫혀', { timeout: 4000 });
  const y = await page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.world!.player.y);
  expect(y).toBeGreaterThan(64);
  await expect.poll(() => room(page), { timeout: 15000 }).toBe('lung');
  // Cannot go back up through the tricuspid from the right ventricle side: it is solid there.
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => { const mq = (window as unknown as { __mq: Hook }).__mq; const s = mq.game.state; mq.game.importState({ ...s, at: { room: 'heart', x: 300, y: 392, facing: 'up' } }); location.reload(); })]);
  await page.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world);
  await page.waitForTimeout(300);
  expect(await room(page)).toBe('heart');
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(600); await page.keyboard.up('ArrowUp');
  await expect(page.locator('.toast')).toContainText('거꾸로');
  const after = await page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.world!.player.y);
  expect(after).toBeGreaterThan(372);
  expect(errors).toEqual([]);
});

test('red pedestrian light holds the reporter at the curb, green lets them cross', async ({ page }) => {
  await start(page, { flags: ['met-editor'], at: { room: 'street', x: 372, y: 432, facing: 'right' } });
  expect(await room(page)).toBe('street');
  await page.evaluate(() => { (window as unknown as { __mq: Hook }).__mq.world!.traffic.t = 0; });
  await tap(page, 500, 432);
  await page.waitForTimeout(1500);
  const held = await page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.world!.player.x);
  expect(held).toBeLessThan(384);
  await expect(page.locator('.toast')).toContainText('빨간불');
  await page.evaluate(() => { (window as unknown as { __mq: Hook }).__mq.world!.traffic.t = 10; });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.world!.player.x), { timeout: 6000 }).toBeGreaterThan(480);
});

test('no PC-style corner action button; the notebook stays open while reading and closes explicitly', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  await page.goto('/');
  await page.getByRole('button', { name: '첫 출근하기' }).click();
  await expect(page.locator('.action')).toHaveCount(0);
  await page.getByRole('button', { name: '취재 수첩' }).click();
  await expect(page.getByRole('dialog', { name: '취재 수첩' })).toBeVisible();
  await page.getByRole('dialog', { name: '취재 수첩' }).locator('h3').first().click();
  await expect(page.getByRole('dialog', { name: '취재 수첩' })).toBeVisible();
  await page.getByRole('dialog', { name: '취재 수첩' }).getByRole('button', { name: '닫기' }).click();
  await expect(page.getByRole('dialog', { name: '취재 수첩' })).toHaveCount(0);
  await page.close();
});

test('creator preview stands on the pedestal with crisp integer pixels', async ({ browser }) => {
  for (const [w, h, dpr] of [[390, 844, 2.625], [1280, 900, 1], [412, 915, 3]] as const) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    await page.goto('/');
    await page.waitForTimeout(250);
    const m = await page.evaluate(() => {
      const c = document.querySelector('.creator .preview') as HTMLCanvasElement;
      const p = document.querySelector('.creator .pedestal') as HTMLElement;
      const cb = c.getBoundingClientRect(), pb = p.getBoundingClientRect();
      return { feet: cb.top + (cb.height * 33) / 34, ped: pb.top + pb.height / 2, ratio: c.width / 20, css: cb.width, dpr: window.devicePixelRatio };
    });
    expect(Math.abs(m.feet - m.ped), `${w}x${h}@${dpr}`).toBeLessThan(3);
    expect(Number.isInteger(m.ratio)).toBe(true);
    expect(Math.abs(m.css * m.dpr - m.ratio * 20)).toBeLessThan(0.5);
    await page.close();
  }
});

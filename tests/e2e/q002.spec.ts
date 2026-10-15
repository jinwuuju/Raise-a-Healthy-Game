import { expect, test, type Page } from '@playwright/test';

type Hook = { world: { roomId: string; tap(p: { x: number; y: number }): void; player: { x: number; y: number } }; game: { state: Record<string, unknown>; importState(s: unknown): void } };
const room = (page: Page) => page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.world.roomId);
const state = (page: Page) => page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.game.state);
const tap = (page: Page, x: number, y: number) => page.evaluate(([x,y]) => (window as unknown as { __mq: Hook }).__mq.world.tap({ x: x!, y: y! }), [x,y]);
async function finish(page: Page) {
  for (let i = 0; i < 16 && await page.locator('.dialog').count(); i++) { await page.keyboard.press('e'); await page.waitForTimeout(120); }
}
async function seed(page: Page, prepared = false) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/'); await page.getByRole('button', { name: '첫 출근하기' }).click();
  await Promise.all([page.waitForEvent('load'), page.evaluate(prepared => {
    const mq = (window as unknown as { __mq: Hook }).__mq, s = mq.game.state;
    mq.game.importState({ ...s, totalXp: 100, gold: 100, ledger: ['quest.Q001.observe', 'quest.Q001.first'],
      flags: ['met-editor','reported-back','q001-accepted','q001-entered','q001-observed','q001-briefed','heart-guided'],
      inspected: ['q001:heart-in','q001:heart-out', ...(prepared ? ['q002:heart','q002:rv','q002:la','q002:lv'] : [])],
      article: { lead: 'question', returning: 'heart-in', outgoing: 'heart-out', extra: null, checked: true, publishedAt: '2026-10-11T00:00:00Z' },
      q002: { accepted: prepared, reported: prepared, lead: null, cards: { heart: null, rv: null, la: null, lv: null }, checked: false, publishedAt: null },
      cafe: { ...(s.cafe as object), welcomeUsed: true }, at: { room: 'newsroom', x: 120, y: 120, facing: 'up' } }); location.reload();
  }, prepared)]);
  await page.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world);
}
async function inspect(page: Page, x: number, y: number, id: string) {
  await tap(page,x,y); await expect(page.locator('.dialog')).toBeVisible({ timeout: 18000 }); await finish(page);
  await expect.poll(async () => ((await state(page)).inspected as string[]).includes('q002:' + id)).toBe(true);
}
async function article(page: Page) {
  await page.keyboard.press('j'); await page.getByRole('tab', { name: '지금 할 일' }).click();
  await page.getByRole('button', { name: '네 방의 도해 기사 쓰기 · 초안 이어서' }).click();
  return page.getByRole('dialog', { name: 'Q002 기사 · 네 방의 주소' });
}

test('Q002: editor commission → four chambers on the blood route → report → diagram article → Lv.3 result', async ({ page }) => {
  test.setTimeout(180000); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await seed(page); await expect(page.locator('.quest p')).toContainText('다음 취재');
  await tap(page, 256, 80); await expect(page.locator('.dialog')).toBeVisible();
  for (let i = 0; i < 12 && !await page.locator('.dialog .choices').count(); i++) { await page.keyboard.press('e'); await page.waitForTimeout(120); }
  await page.getByRole('button', { name: /네 방의 주소 취재 맡기/ }).click();
  await expect(page.locator('.quest p')).toContainText('0/4');
  await tap(page, 464, 118); await expect(page.locator('.dialog')).toBeVisible({ timeout: 10000 });
  for (let i = 0; i < 12 && !await page.locator('.dialog .choices').count(); i++) { await page.keyboard.press('e'); await page.waitForTimeout(120); }
  await page.getByRole('button', { name: /심장 속으로 들어가기/ }).click();
  await page.getByRole('button', { name: '바로 들어가기' }).click();
  await expect.poll(() => room(page)).toBe('heart'); await page.waitForTimeout(200);
  await inspect(page,248,350,'heart');
  await tap(page,300,412); await expect.poll(() => room(page), { timeout: 20000 }).toBe('rv'); await page.waitForTimeout(200);
  await inspect(page,388,100,'rv');
  await tap(page,388,12); await expect.poll(() => room(page), { timeout: 20000 }).toBe('lung'); await page.waitForTimeout(200);
  await tap(page,548,176); await expect.poll(() => room(page), { timeout: 25000 }).toBe('la'); await page.waitForTimeout(200);
  await inspect(page,226,300,'la');
  await tap(page,270,372); await expect.poll(() => room(page), { timeout: 20000 }).toBe('lv'); await page.waitForTimeout(200);
  await inspect(page,192,98,'lv');
  await expect(page.locator('.quest p')).toContainText('네 방 취재 완료');
  await tap(page,330,470); await expect(page.locator('.dialog')).toBeVisible({ timeout: 20000 });
  for (let i = 0; i < 12 && !await page.locator('.dialog .choices').count(); i++) { await page.keyboard.press('e'); await page.waitForTimeout(120); }
  await page.getByRole('button', { name: /돌아가기/ }).click(); await expect.poll(() => room(page)).toBe('newsroom'); await page.waitForTimeout(200);
  await tap(page, 256, 80); await expect(page.locator('.dialog')).toBeVisible({ timeout: 15000 }); await finish(page);
  const paper = await article(page);
  await paper.getByRole('button', { name: '네 방의 주소로 시작' }).click();
  for (const [label,id] of [['우심방','heart'],['우심실','rv'],['좌심방','la'],['좌심실','lv']]) await paper.getByLabel(label + '의 주소 카드').selectOption(id!);
  await paper.getByRole('button', { name: '편집장에게 초안 보여주기' }).click(); await paper.getByRole('button', { name: '게임 속 신문에 발행' }).click();
  const result = page.getByRole('dialog', { name: '발행 결과 · 독자 반응' }); await expect(result).toContainText('Q002');
  const s = await state(page); expect(s.totalXp).toBe(250); expect((s.q002 as { publishedAt: string }).publishedAt).toBeTruthy();
  await result.getByRole('button', { name: '월드로 돌아가기' }).click(); await expect(page.locator('.chip .rank')).toContainText('Lv.3');
  expect(errors).toEqual([]);
});

for (const [width,height] of [[390,844],[844,390]] as const) test(`Q002 article at ${width}×${height}: correction, save/resume, publication, replay and reprint`, async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width,height }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  await seed(page,true); let paper = await article(page);
  await paper.getByRole('button', { name: '피의 여행으로 시작' }).click();
  for (const label of ['우심방','우심실','좌심방','좌심실']) await paper.getByLabel(label + '의 주소 카드').selectOption('heart');
  await paper.getByRole('button', { name: '편집장에게 초안 보여주기' }).click(); await expect(paper.getByRole('button', { name: '게임 속 신문에 발행' })).toBeDisabled();
  await page.reload(); paper = await article(page); await expect(paper.getByLabel('우심방의 주소 카드')).toHaveValue('heart');
  for (const [label,id] of [['우심실','rv'],['좌심방','la'],['좌심실','lv']]) await paper.getByLabel(label + '의 주소 카드').selectOption(id!);
  await paper.getByRole('button', { name: '편집장에게 초안 보여주기' }).click(); const publish = paper.getByRole('button', { name: '게임 속 신문에 발행' });
  const b = (await publish.boundingBox())!; expect(b.height).toBeGreaterThanOrEqual(48); expect(b.x + b.width).toBeLessThanOrEqual(width);
  await publish.tap(); const result = page.getByRole('dialog', { name: '발행 결과 · 독자 반응' }); await expect(result).toBeVisible();
  const gold = (await state(page)).gold; await result.getByRole('button', { name: '기사 다시 읽기' }).tap(); paper = page.getByRole('dialog', { name: 'Q002 기사 · 네 방의 주소' });
  await expect(paper).toContainText('네 방의 도해 기사를 발행했어요'); expect((await state(page)).gold).toBe(gold);
  await paper.getByRole('button', { name: '다시 발행 · 새 독자 반응' }).tap(); await expect(result).toBeVisible(); expect((await state(page)).totalXp).toBe(250); expect((await state(page)).gold).toBeGreaterThan(gold as number);
  await page.reload(); await expect(result).toBeVisible(); await expect(result).toContainText('Q002');
  await result.getByRole('button', { name: '월드로 돌아가기' }).tap(); await page.close();
});

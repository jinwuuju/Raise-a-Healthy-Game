import { expect, test, type Page } from '@playwright/test';

type Hook = { game: { state: Record<string, unknown> & { cafe: Record<string, unknown> }; importState(s: unknown): void }; world: { player: { x: number; y: number } } | null };
const title = '첫 기사 · 사라진 혈액 배달표';
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('medical-quest.v4.current')!));
async function start(page: Page, room = 'newsroom') {
  await page.goto('/'); await page.getByRole('button', { name: '첫 출근하기' }).click();
  await Promise.all([page.waitForEvent('load'), page.evaluate(r => {
    const mq = (window as unknown as { __mq: Hook }).__mq, s = mq.game.state;
    // A previous-release save: no article field, but the actual observation checkpoint and report exist.
    mq.game.importState({ ...s, article: undefined, flags: ['met-editor', 'reported-back', 'q001-accepted', 'q001-entered', 'q001-observed', 'q001-briefed'],
      inspected: ['q001:heart-in', 'q001:heart-out'], ledger: ['quest.Q001.observe'], totalXp: 20, gold: 0,
      at: r === 'newsroom' ? s.at : { room: 'heart', x: 368, y: 80, facing: 'down' }, cafe: { ...s.cafe, welcomeUsed: true } }); location.reload();
  }, room)]);
  await page.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world);
}
async function open(page: Page) {
  await page.getByRole('button', { name: '취재 수첩' }).click();
  await page.getByRole('button', { name: '첫 기사 쓰기 · 초안 이어서' }).click();
  await expect(page.getByRole('dialog', { name: title })).toBeVisible();
}
async function fill(page: Page) {
  const article = page.getByRole('dialog', { name: title });
  await article.getByRole('button', { name: /독자의 질문으로 시작/ }).click();
  await article.getByLabel('2 · 돌아오는 피의 근거').selectOption('heart-in');
  await article.getByLabel('3 · 폐로 향하는 피의 근거').selectOption('heart-out');
}
async function finishResult(page: Page, read = false) {
  const result = page.getByRole('dialog', { name: '발행 결과 · 독자 반응' }); await expect(result).toBeVisible();
  const skip = result.getByRole('button', { name: '결과 바로 보기' }); if (await skip.count()) await skip.click();
  await expect(result.locator('.reader-voice')).toHaveCount(3);
  await result.getByRole('button', { name: read ? '기사 다시 읽기' : '월드로 돌아가기' }).click();
}

test('legacy save → draft → feedback → reload → publish → reread without repeated rewards; keyboard focus and world input stay contained', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await start(page); await open(page);
  const article = page.getByRole('dialog', { name: title });
  await expect(article).toContainText('검수 전 모형');
  await expect(article.getByRole('button', { name: '게임 속 신문에 발행' })).toBeDisabled();
  await article.getByRole('button', { name: '편집장에게 초안 보여주기' }).click();
  await expect(article.getByRole('status')).toContainText('첫 문장');
  await fill(page);
  await article.getByLabel('2 · 돌아오는 피의 근거').selectOption('heart-out');
  await article.getByRole('button', { name: '편집장에게 초안 보여주기' }).click();
  await expect(article.getByRole('status')).toContainText('하대정맥');
  await expect(article.getByRole('button', { name: '게임 속 신문에 발행' })).toBeDisabled();
  await article.getByLabel('2 · 돌아오는 피의 근거').selectOption('heart-in');
  await article.getByRole('button', { name: '편집장에게 초안 보여주기' }).click();
  await article.getByRole('button', { name: /몸속 풍경으로 시작/ }).click();
  await expect(article.getByRole('button', { name: '게임 속 신문에 발행' })).toBeDisabled();
  expect((await saved(page)).article.checked).toBe(false);
  await page.reload(); await open(page);
  await expect(article.getByRole('button', { name: /몸속 풍경으로 시작/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(article.getByLabel('2 · 돌아오는 피의 근거')).toHaveValue('heart-in');
  await expect(article.getByLabel('3 · 폐로 향하는 피의 근거')).toHaveValue('heart-out');
  const before = await page.evaluate(() => ({ ...(window as unknown as { __mq: Hook }).__mq.world!.player }));
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(250); await page.keyboard.up('ArrowRight');
  const after = await page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.world!.player);
  expect(after.x).toBe(before.x);
  await article.getByRole('button', { name: '편집장에게 초안 보여주기' }).click();
  await expect(article.getByRole('button', { name: '게임 속 신문에 발행' })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(article.getByRole('button', { name: '닫기' })).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Enter');
  await finishResult(page, true);
  await expect(article).toContainText('하윤 독자:');
  const first = await saved(page); expect([first.totalXp, first.gold]).toEqual([100, 100 + first.reactions.results[0].bonusGold]);
  await page.reload();
  await page.getByRole('button', { name: '취재 수첩' }).click();
  await page.getByRole('button', { name: '첫 기사와 독자 답장 읽기' }).click();
  await expect(article).toContainText('첫 기사를 발행했어요');
  await expect(article.getByRole('button', { name: '게임 속 신문에 발행' })).toHaveCount(0);
  expect((await saved(page)).ledger.filter((k: string) => k === 'quest.Q001.first')).toHaveLength(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '취재 수첩' })).toBeFocused();
  expect(errors).toEqual([]);
});

for (const [width, height] of [[390, 844], [844, 390]] as const) {
  test(`article works with touch at ${width}×${height}, with visible 48px actions and a scrolling preview`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await start(page); await open(page);
    const article = page.getByRole('dialog', { name: title });
    await article.getByRole('button', { name: /독자의 질문으로 시작/ }).tap();
    await article.getByLabel('2 · 돌아오는 피의 근거').selectOption('heart-in');
    await article.getByLabel('3 · 폐로 향하는 피의 근거').selectOption('heart-out');
    await article.getByRole('button', { name: '편집장에게 초안 보여주기' }).tap();
    const metrics = await article.evaluate(s => ({
      overflow: s.scrollWidth - s.clientWidth,
      actions: [...s.querySelectorAll('.article-actions button')].map(b => { const r = b.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom }; }),
      sheet: s.getBoundingClientRect().toJSON(),
    }));
    expect(metrics.overflow).toBeLessThanOrEqual(1);
    for (const b of metrics.actions) { expect(b.w).toBeGreaterThanOrEqual(48); expect(b.h).toBeGreaterThanOrEqual(48); expect(b.bottom).toBeLessThanOrEqual(height); }
    expect(metrics.sheet.y).toBeGreaterThanOrEqual(0);
    await article.locator('.content').evaluate(c => { c.scrollTop = 0; });
    await page.screenshot({ path: `artifacts/q001-article/${width}x${height}-draft.png`, animations: 'disabled' });
    await article.getByRole('button', { name: '게임 속 신문에 발행' }).tap();
    await finishResult(page);
    const s = await saved(page); expect([s.totalXp, s.gold]).toEqual([100, 100 + s.reactions.results[0].bonusGold]);
    await expect(article).toHaveCount(0); expect(errors).toEqual([]); await page.close();
  });
}

test('outside the newsroom the draft is readable and cannot be edited or published', async ({ page }) => {
  await start(page, 'heart'); await open(page);
  const article = page.getByRole('dialog', { name: title });
  await expect(article).toContainText('편집국의 내 자리');
  await expect(article.locator('select')).toHaveCount(0);
  await expect(article.getByRole('button', { name: '게임 속 신문에 발행' })).toHaveCount(0);
  await page.close();
});

test('200% text supports editing, reading sources and publishing without horizontal overflow', async ({ page }) => {
  await start(page); await open(page); await fill(page);
  await page.screenshot({ path: 'artifacts/q001-article/1280x900-draft.png', animations: 'disabled' });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  const article = page.getByRole('dialog', { name: title });
  await article.locator('summary').click();
  await expect(article.getByRole('link', { name: /NHLBI/ })).toBeVisible();
  await expect(article).toBeVisible();
  const overflow = await article.evaluate(s => s.scrollWidth - s.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'artifacts/q001-article/1280x900-text200.png', animations: 'disabled' });
  await article.getByRole('button', { name: '편집장에게 초안 보여주기' }).click();
  await article.getByRole('button', { name: '게임 속 신문에 발행' }).click();
  await finishResult(page, true);
  await expect(article).toContainText('하윤 독자:');
});

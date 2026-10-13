import { expect, test, type Page } from '@playwright/test';
import type { GameState } from '../../src/domain/state';

type Hook = { world: { roomId: string; player: { x: number; y: number }; heart: { rhythm: string } | null; tap(p: { x: number; y: number }): void }; game: { state: GameState; importState(s: unknown): void } };
const state = (p: Page) => p.evaluate(() => (window as unknown as { __mq: Hook }).__mq.game.state);
const room = (p: Page) => p.evaluate(() => (window as unknown as { __mq: Hook }).__mq.world.roomId);
const tap = (p: Page, x: number, y: number) => p.evaluate(([x, y]) => (window as unknown as { __mq: Hook }).__mq.world.tap({ x: x!, y: y! }), [x, y]);
const normal = ['sa', 'av', 'right-branch', 'atria', 'left-branch'];

async function seed(p: Page, q005: Partial<GameState['q005']> | null = null, at: GameState['at'] | null = null) {
  await p.emulateMedia({ reducedMotion: 'reduce' }); await p.goto('/'); await p.getByRole('button', { name: '첫 출근하기' }).click();
  await Promise.all([p.waitForEvent('load'), p.evaluate(([q005, at]) => {
    const mq = (window as unknown as { __mq: Hook }).__mq, s = mq.game.state;
    mq.game.importState({ ...s, totalXp: 700, gold: 540, ledger: ['quest.Q001.observe', 'quest.Q001.first', 'quest.Q002.first', 'quest.Q003.first', 'quest.Q004.first'],
      flags: ['met-editor', 'reported-back', 'q001-accepted', 'q001-entered', 'q001-observed', 'q001-briefed', 'heart-guided'],
      inspected: ['q001:heart-in', 'q001:heart-out', 'q002:heart', 'q002:rv', 'q002:la', 'q002:lv'], cafe: { ...s.cafe, welcomeUsed: true },
      article: { lead: 'question', returning: 'heart-in', outgoing: 'heart-out', extra: null, checked: true, publishedAt: '2026-10-11T00:00:00Z' },
      q002: { accepted: true, reported: true, lead: 'addresses', cards: { heart: 'heart', rv: 'rv', la: 'la', lv: 'lv' }, checked: true, publishedAt: '2026-10-11T00:01:00Z' },
      q003: { accepted: true, mode: 'normal', notes: ['tricuspid', 'pulmonary', 'stenosis', 'regurgitation', 'causes', 'tests', 'care'], lead: 'compare', limit: 'model', checked: true, publishedAt: '2026-10-12T00:00:00Z' },
      q004: { accepted: true, notes: ['pulmonary-out', 'gas', 'pulmonary-return', 'systemic-out', 'body-route', 'systemic-return'], crossedBody: true, routes: { pulmonary: true, systemic: true }, joined: true, lead: 'pulmonary', limit: 'model', checked: true, publishedAt: '2026-10-12T01:00:00Z' },
      ...(q005 ? { q005: { accepted: true, mode: 'normal', notes: [], order: [], lead: null, limit: null, checked: false, publishedAt: null, ...q005 } } : {}),
      ...(at ? { at } : {}) }); location.reload();
  }, [q005, at] as const)]);
  await p.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world); await p.waitForTimeout(250);
}
async function choices(p: Page) { for (let i = 0; i < 15 && !await p.locator('.dialog .choices').count(); i++) { await p.keyboard.press('e'); await p.waitForTimeout(120); } }
async function finish(p: Page) { for (let i = 0; i < 15 && await p.locator('.dialog').count(); i++) { await p.keyboard.press('e'); await p.waitForTimeout(120); } }
async function inspect(p: Page, x: number, y: number, id: string) {
  await tap(p, x, y); await expect(p.locator('.dialog')).toBeVisible({ timeout: 20000 }); await finish(p);
  await expect.poll(async () => ((await state(p)).q005.notes as string[]).includes(id)).toBe(true);
}
async function enter(p: Page) {
  await tap(p, 308, 118); await expect(p.locator('.dialog')).toBeVisible({ timeout: 12000 }); await choices(p);
  await p.getByRole('button', { name: /심장 속으로 들어가기/ }).click(); await p.getByRole('button', { name: '바로 들어가기' }).click();
  await expect.poll(() => room(p)).toBe('heart'); await p.waitForTimeout(200);
}
async function returnOffice(p: Page) {
  await tap(p, 280, 128); await expect(p.locator('.dialog')).toBeVisible({ timeout: 20000 }); await choices(p);
  await p.getByRole('button', { name: /돌아가기/ }).click(); await expect.poll(() => room(p)).toBe('newsroom'); await p.waitForTimeout(200);
}
const observer = (p: Page) => p.getByRole('dialog', { name: '신호 관찰기 · 고른 박자와 심방세동' });
const file = (p: Page) => p.getByRole('dialog', { name: 'Q005 취재 · 박자를 전하는 길' });
async function compose(p: Page, f = file(p)) {
  await expect(f.getByRole('button', { name: /방실결절에서 잠깐 늦춤/ })).toBeVisible();
  await f.getByRole('button', { name: /방실결절에서 잠깐 늦춤/ }).click(); await expect(f.locator('.article-status')).toContainText('순서가 어긋났어요');
  for (const card of ['동방결절에서 출발', '양쪽 심방으로 퍼짐', '방실결절에서 잠깐 늦춤', '왼쪽 다발갈래', '오른쪽 다발갈래']) await f.getByRole('button', { name: new RegExp(card) }).click();
  await expect(f.locator('.signal-stage.filled')).toHaveCount(4);
  await f.getByRole('button', { name: '신호가 먼저라는 사실로 시작' }).click(); await f.getByRole('button', { name: '모형의 한계로 마무리' }).click();
  await f.getByRole('button', { name: '편집장에게 초안 보여주기' }).click(); await expect(f.getByRole('button', { name: '게임 속 신문에 발행' })).toBeFocused();
}

test('Q005: commission, five physical signal observations, AF observer at the SA node, desk materials, order board and Lv.6', async ({ page }) => {
  test.setTimeout(240000); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); await seed(page);
  await tap(page, 88, 80); await expect(page.locator('.dialog')).toBeVisible({ timeout: 10000 }); await choices(page); await page.getByRole('button', { name: /박동 신호 취재 맡기/ }).click();
  expect((await state(page)).q005.accepted).toBe(true); expect((await state(page)).q005.notes).toEqual([]);
  await enter(page);
  await inspect(page, 150, 116, 'sa'); await inspect(page, 316, 250, 'av');
  await expect(page.locator('body')).toContainText('피를 따라 우심실로 · 오른쪽 갈래');
  await tap(page, 300, 412); await expect.poll(() => room(page), { timeout: 20000 }).toBe('rv'); await page.waitForTimeout(200); await inspect(page, 214, 352, 'right-branch');
  await tap(page, 388, 12); await expect.poll(() => room(page), { timeout: 20000 }).toBe('lung'); await page.waitForTimeout(200);
  await tap(page, 548, 176); await expect.poll(() => room(page), { timeout: 25000 }).toBe('la'); await page.waitForTimeout(200); await inspect(page, 160, 94, 'atria');
  await tap(page, 270, 372); await expect.poll(() => room(page), { timeout: 20000 }).toBe('lv'); await page.waitForTimeout(200); await inspect(page, 190, 300, 'left-branch');
  await tap(page, 192, 12); await expect.poll(() => room(page), { timeout: 20000 }).toBe('aorta'); await page.waitForTimeout(200);
  await tap(page, 208, 12); await expect.poll(() => room(page), { timeout: 15000 }).toBe('heart'); await page.waitForTimeout(300);
  await tap(page, 150, 116); const view = observer(page); await expect(view).toBeVisible({ timeout: 20000 });
  await view.getByRole('button', { name: '심방세동', exact: true }).click(); await expect.poll(() => page.evaluate(() => (window as unknown as { __mq: Hook }).__mq.world.heart?.rhythm)).toBe('af');
  await view.getByRole('button', { name: '심방세동 비교 기록하기' }).click(); await page.keyboard.press('Escape'); await expect(view).toHaveCount(0);
  expect((await state(page)).q005.mode).toBe('normal'); expect((await state(page)).q005.notes).toContain('af');
  await returnOffice(page); await tap(page, 184, 142); const f = file(page); await expect(f).toBeVisible({ timeout: 15000 });
  for (let i = 0; i < 3; i++) await f.getByRole('button', { name: '이 자료를 취재 메모로 남기기' }).click();
  await compose(page); await f.getByRole('button', { name: '게임 속 신문에 발행' }).click();
  const result = page.getByRole('dialog', { name: '발행 결과 · 독자 반응' }); await expect(result).toContainText('Q005');
  const s = await state(page); expect(s.totalXp).toBe(1000); expect(s.q005.order).toEqual(['sa', 'atria', 'av', 'left-branch', 'right-branch']); expect(s.q005.publishedAt).toBeTruthy();
  await result.getByRole('button', { name: '월드로 돌아가기' }).click(); await expect(page.locator('.chip .rank')).toContainText('Lv.6'); expect(errors).toEqual([]);
});

for (const [width, height] of [[390, 844], [844, 390]] as const) test(`Q005 ${width}×${height}: observer layers differ, static reduced-motion, notebook ownership, ECG strips, resume, reprint`, async ({ browser }) => {
  test.setTimeout(180000);
  const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await seed(page, { notes: normal as GameState['q005']['notes'] }, { room: 'heart', x: 180, y: 40, facing: 'down' });
  await tap(page, 150, 116); const view = observer(page); await expect(view).toBeVisible({ timeout: 20000 });
  const pose = await page.evaluate(() => ({ ...((window as unknown as { __mq: Hook }).__mq.world.player) }));
  await view.getByRole('button', { name: '심방세동', exact: true }).tap();
  await expect.poll(() => view.locator('canvas').evaluateAll(cs => (cs[0] as HTMLCanvasElement).toDataURL() === (cs[1] as HTMLCanvasElement).toDataURL())).toBe(false);
  const box = await view.evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth })); expect(box.scroll - box.client).toBeLessThan(2);
  await page.screenshot({ path: `artifacts/q005-observer-${width}.png` });
  await view.getByRole('button', { name: '심방세동 비교 기록하기' }).tap(); await page.keyboard.press('Escape');
  expect(await page.evaluate(() => ({ ...((window as unknown as { __mq: Hook }).__mq.world.player) }))).toEqual(pose);
  await page.reload(); await page.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world); expect((await state(page)).q005.notes).toContain('af'); expect((await state(page)).q005.mode).toBe('normal');
  await page.keyboard.press('j'); await page.getByRole('tab', { name: '인체 탐험' }).click(); await page.locator('summary').filter({ hasText: '박자 비교 (Q005' }).click();
  await expect(page.getByRole('tabpanel', { name: '인체 탐험' })).toContainText('합병증 연결 기관(뇌졸중·심부전) · 준비 중'); await page.keyboard.press('Escape');
  await returnOffice(page); await tap(page, 184, 142); const f = file(page); await expect(f).toBeVisible({ timeout: 15000 });
  await f.getByRole('button', { name: '이 자료를 취재 메모로 남기기' }).tap(); await expect(f.locator('canvas.ecg-strip')).toHaveCount(2); await expect(f).toContainText('가상 심전도 모형 B');
  await page.reload(); await page.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world); await tap(page, 184, 142); await expect(f).toBeVisible({ timeout: 15000 }); await expect(f).toContainText('4 · 검사');
  for (let i = 0; i < 2; i++) await f.getByRole('button', { name: '이 자료를 취재 메모로 남기기' }).tap();
  await f.getByRole('button', { name: /동방결절에서 출발/ }).tap(); await page.reload(); await page.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world);
  await tap(page, 184, 142); await expect(f).toBeVisible({ timeout: 15000 }); expect((await state(page)).q005.order).toEqual(['sa']);
  await f.getByRole('button', { name: '순서 다시 놓기' }).tap(); expect((await state(page)).q005.order).toEqual([]);
  await page.screenshot({ path: `artifacts/q005-board-${width}.png` });
  await compose(page); await f.getByRole('button', { name: '게임 속 신문에 발행' }).tap();
  const result = page.getByRole('dialog', { name: '발행 결과 · 독자 반응' }); await expect(result).toBeVisible(); const gold = (await state(page)).gold;
  await page.reload(); await expect(result).toContainText('Q005'); expect((await state(page)).gold).toBe(gold);
  await result.getByRole('button', { name: '기사 다시 읽기' }).tap(); await expect(f).toContainText('박동 신호 기사를 발행했어요');
  await f.getByRole('button', { name: '다시 발행 · 새 독자 반응' }).tap(); await expect(result).toContainText('Q005');
  expect((await state(page)).totalXp).toBe(1000); expect((await state(page)).gold).toBeGreaterThan(gold);
  expect(errors).toEqual([]); await page.close();
});

test('Q005 200% text keeps the board contained, keyboard publishing works, and outside the office it is read-only', async ({ page }) => {
  await seed(page, { notes: [...normal, 'af', 'causes', 'tests', 'care'] as GameState['q005']['notes'] }, { room: 'newsroom', x: 184, y: 160, facing: 'up' });
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  await page.keyboard.press('j'); await page.getByRole('tab', { name: '지금 할 일' }).click(); await page.getByRole('button', { name: '박동 신호 자료와 기사 이어서' }).click();
  const f = file(page); await expect(f).toBeVisible(); const bounds = await f.evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth })); expect(bounds.scroll - bounds.client).toBeLessThan(2);
  await compose(page); await page.keyboard.press('Escape');
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => { const mq = (window as unknown as { __mq: Hook }).__mq; mq.game.importState({ ...mq.game.state, at: { room: 'lung', x: 26, y: 176, facing: 'right' } }); location.reload(); })]);
  await page.waitForFunction(() => (window as unknown as { __mq: Hook }).__mq?.world?.roomId === 'lung');
  await page.keyboard.press('j'); await page.getByRole('tab', { name: '지금 할 일' }).click(); await page.getByRole('button', { name: '박동 신호 자료와 기사 이어서' }).click();
  await expect(f).toContainText('편집국에서'); await expect(f.getByRole('button', { name: '게임 속 신문에 발행' })).toHaveCount(0); await expect(f.locator('button.signal-pick')).toHaveCount(0);
});

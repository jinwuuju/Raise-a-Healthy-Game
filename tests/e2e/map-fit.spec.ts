import { expect, test, type Page } from '@playwright/test';
/**
 * D116: the Bodyscope map was clipped at the bottom (the stage was a clipping grid item that the sheet shrank, so the
 * heart below the aorta and the legs of the body disappeared). Every tab must now show its whole drawing on open,
 * keep its words inside the canvas without overlapping, and redraw when the screen turns. Other sheets must not clip.
 */
type Hook = { world: { roomId: string; setRoom(r: string, x: number, y: number, f: string): void }; game: { state: Record<string, unknown>; importState(s: object): void; enter(r: string, x: number, y: number, f: string): void } };
async function boot(p: Page) {
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.addInitScript(() => {
    const w = window as unknown as { __texts: number[][]; __words: string[] }; w.__texts = []; w.__words = [];
    const orig = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (t: string, x: number, y: number, m?: number) {
      if ((this.canvas as HTMLCanvasElement).classList.contains('scope-canvas')) {
        const mw = this.measureText(t).width, al = this.textAlign, l = al === 'center' ? x - mw / 2 : al === 'right' || al === 'end' ? x - mw : x;
        w.__texts.push([l, y, l + mw, parseFloat(this.font.split('px')[0]!.split(' ').pop()!)]); w.__words.push(t);
      }
      return m === undefined ? orig.call(this, t, x, y) : orig.call(this, t, x, y, m);
    };
  });
  await p.goto('/'); await p.getByRole('button', { name: '첫 출근하기' }).click(); await p.waitForTimeout(300);
  await Promise.all([p.waitForEvent('load'), p.evaluate(async () => {
    const mod = await import(/* @vite-ignore */ '/tests/helpers/q013-fixture.ts' as string);
    const h = (window as unknown as { __mq: Hook }).__mq, s = mod.q13Fixture();
    h.game.importState({ ...s, at: { room: 'newsroom', x: 464, y: 152, facing: 'up' }, saveId: (h.game.state as unknown as { saveId: string }).saveId });
    location.reload();
  })]);
  await p.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world); await p.waitForTimeout(500);
}
async function enterRoom(p: Page, room: string) {
  await p.evaluate(async room => {
    const { rooms } = await import(/* @vite-ignore */ '/src/world/rooms.ts' as string);
    const h = (window as unknown as { __mq: Hook }).__mq, sp = rooms[room].spawn;
    h.world.setRoom(room, sp.x, sp.y, 'down'); h.game.enter(room, sp.x, sp.y, 'down');
  }, room);
  await p.waitForTimeout(300);
}
const fit = (p: Page) => p.evaluate(() => {
  const sheet = document.querySelector('.atlas-sheet') as HTMLElement, content = sheet.querySelector('.content') as HTMLElement;
  const stage = sheet.querySelector('.stage') as HTMLElement, cv = sheet.querySelector('canvas') as HTMLCanvasElement;
  const c = content.getBoundingClientRect(), s = stage.getBoundingClientRect(), k = cv.getBoundingClientRect();
  const visibleBottom = Math.min(c.bottom - (parseFloat(getComputedStyle(content).paddingBottom) || 0), innerHeight);
  const w = window as unknown as { __texts: number[][]; __words: string[] }, out: string[] = [], over: string[] = [];
  w.__texts.forEach((q, i) => { if (q[0]! < 1 || q[2]! > k.width - 1 || q[1]! < 4 || q[1]! > k.height - 4) out.push(w.__words[i]!); });
  for (let i = 0; i < w.__texts.length; i++) for (let j = i + 1; j < w.__texts.length; j++) {
    const a = w.__texts[i]!, b = w.__texts[j]!;
    if (w.__words[i] === w.__words[j]) continue;
    const ox = Math.min(a[2]!, b[2]!) - Math.max(a[0]!, b[0]!), oy = Math.min(a[1]! + a[3]! / 2, b[1]! + b[3]! / 2) - Math.max(a[1]! - a[3]! / 2, b[1]! - b[3]! / 2);
    if (ox > 2 && oy > 2) over.push(w.__words[i] + ' / ' + w.__words[j]);
  }
  return { clipped: Math.round(k.height - s.height + 2), below: Math.round(k.bottom - visibleBottom), out, over, cvW: Math.round(k.width), stageW: stage.clientWidth, sheetBottom: Math.round(sheet.getBoundingClientRect().bottom), vh: innerHeight };
});
const views: [number, number][] = [[1440, 760], [1024, 600], [390, 844], [360, 640], [844, 390]];
test('Bodyscope map: whole drawing visible on open, words inside and apart, redraw on turning the phone (D116)', async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page);
  for (const room of ['heart', 'nose']) {
    await enterRoom(page, room);
    for (const [w, h] of views) {
      await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(200);
      await page.locator('#view').focus(); await page.keyboard.press('m');
      const map = page.getByRole('dialog', { name: '바디스코프 지도' }); await expect(map).toBeVisible();
      for (const tab of room === 'heart' ? ['이 방', '심장', '인체'] : ['이 방', '호흡기', '인체']) {
        await page.waitForTimeout(150); await page.evaluate(() => { const x = window as unknown as { __texts: unknown[]; __words: unknown[] }; x.__texts = []; x.__words = []; });
        await map.getByRole('button', { name: tab, exact: true }).click(); await page.waitForTimeout(250);
        const f = await fit(page), at = room + ' ' + tab + ' ' + w + 'x' + h;
        expect(f.clipped, at + ' stage clips the canvas').toBeLessThanOrEqual(1);
        expect(f.below, at + ' drawing runs below the visible sheet').toBeLessThanOrEqual(1);
        expect(f.sheetBottom, at + ' sheet leaves the screen').toBeLessThanOrEqual(f.vh);
        expect(f.out, at + ' words outside the canvas').toEqual([]);
        expect(f.over, at + ' overlapping words').toEqual([]);
      }
      if (room === 'heart' && w === 390) {
        await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(400);
        const f = await fit(page);
        expect(Math.abs(f.cvW - f.stageW), 'redrawn at the new width').toBeLessThanOrEqual(2);
        expect(f.below).toBeLessThanOrEqual(1); expect(f.clipped).toBeLessThanOrEqual(1);
        await page.screenshot({ path: 'artifacts/d116-map-turned-844.png' });
        await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(300);
      }
      if (w === 1440) await page.screenshot({ path: 'artifacts/d116-map-' + room + '-1440.png' });
      await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    }
  }
  expect(errors).toEqual([]);
});
const opens: [string, string][] = [
  ['/src/ui/valve-comparison.ts', 'openValveComparison'], ['/src/ui/rhythm-comparison.ts', 'openRhythmComparison'], ['/src/ui/supply-comparison.ts', 'openSupplyComparison'],
  ['/src/ui/passage-comparison.ts', 'openPassageComparison'], ['/src/ui/pressure-comparison.ts', 'openPressureComparison'], ['/src/ui/air-port-comparison.ts', 'openAirPortComparison'],
  ['/src/ui/fork-comparison.ts', 'openForkComparison'], ['/src/ui/q009.ts', 'openQ9'], ['/src/ui/q010.ts', 'openQ10'], ['/src/ui/q012.ts', 'openQ12'],
  ['/src/ui/flow-comparison.ts', 'openFlowComparison'], ['/src/ui/q013.ts', 'openQ13'],
];
test('Observers, desks and the notebook do not clip or leave the screen on phones (D116)', async ({ page }) => {
  test.setTimeout(180000);
  await boot(page);
  const audit = () => page.evaluate(() => {
    const out: string[] = [];
    for (const root of Array.from(document.querySelectorAll('.sheet, .dialog, [role=dialog]'))) {
      const rr = root.getBoundingClientRect(); if (!rr.width) continue;
      if (rr.bottom > innerHeight + 1 || rr.top < -1 || rr.right > innerWidth + 1 || rr.left < -1) out.push('offscreen ' + (root as HTMLElement).className);
      for (const e of Array.from(root.querySelectorAll('*')) as HTMLElement[]) {
        const cs = getComputedStyle(e); if (cs.display === 'none' || (!e.clientHeight && !e.clientWidth)) continue;
        const clamp = cs.getPropertyValue('-webkit-line-clamp');
        if ((cs.overflowY === 'hidden' || cs.overflowY === 'clip') && e.scrollHeight > e.clientHeight + 2 && (!clamp || clamp === 'none')) out.push('clipY ' + e.className + ' ' + e.scrollHeight + '>' + e.clientHeight);
        if ((cs.overflowX === 'hidden' || cs.overflowX === 'clip') && e.scrollWidth > e.clientWidth + 2 && cs.textOverflow !== 'ellipsis') out.push('clipX ' + e.className);
      }
    }
    if (document.documentElement.scrollWidth > innerWidth + 1) out.push('page overflow');
    return out;
  });
  for (const [w, h] of [[390, 844], [844, 390]] as [number, number][]) {
    await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(300);
    for (const [mod, fn] of opens) {
      await page.evaluate(async ([mod, fn]) => { const m = await import(/* @vite-ignore */ mod as string); m[fn as string]((window as unknown as { __mq: Hook }).__mq.game, () => {}); }, [mod, fn]);
      await page.waitForTimeout(400);
      expect(await audit(), fn + ' ' + w + 'x' + h).toEqual([]);
      for (let i = 0; i < 3 && await page.locator('.scrim, .dialog').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(150); }
    }
    await page.locator('#view').focus(); await page.keyboard.press('j'); await page.waitForTimeout(400);
    const tabs = page.locator('.notebook-sheet [role=tab]'), n = await tabs.count();
    expect(n).toBeGreaterThan(2);
    for (let i = 0; i < n; i++) {
      await tabs.nth(i).click(); await page.waitForTimeout(200);
      for (let k = 0; k < 30; k++) { const b = page.locator('.notebook-sheet [aria-expanded=false]').first(); if (!await b.count()) break; await b.click(); await page.waitForTimeout(50); }
      expect(await audit(), 'notebook tab ' + i + ' ' + w + 'x' + h).toEqual([]);
    }
    for (let i = 0; i < 3 && await page.locator('.scrim').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(150); }
  }
});

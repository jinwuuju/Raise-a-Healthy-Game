import { expect, test, type Page } from '@playwright/test';

type Hook = { world: { roomId: string; player: { x: number; y: number }; tap(p: { x: number; y: number }): void }; game: { state: object; importState(s: object): void } };
const room = (p: Page) => p.evaluate(() => (window as unknown as { __mq: Hook }).__mq.world.roomId);
async function seed(p: Page, at: { room: string; x: number; y: number }) {
  await Promise.all([p.waitForEvent('load'), p.evaluate(a => { const h = (window as unknown as { __mq: Hook }).__mq; h.game.importState({ ...h.game.state, at: { ...a, facing: 'down' } }); location.reload(); }, at)]);
  await p.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world); await p.waitForTimeout(900);
}
async function spots(p: Page) {
  return p.evaluate(async () => {
    const u = '/src/world/district.ts', r = '/src/world/rooms.ts', cu = '/src/world/collision.ts';
    const { anchors, crossroads, specialBuilding } = await import(/* @vite-ignore */ u), { rooms } = await import(/* @vite-ignore */ r), { canStand } = await import(/* @vite-ignore */ cu);
    const snap = (p: { x: number; y: number }) => { for (let rr = 0; rr < 80; rr += 2) for (let k = 0; k < 16; k++) { const q = { x: Math.round(p.x + Math.cos(k * Math.PI / 8) * rr), y: Math.round(p.y + Math.sin(k * Math.PI / 8) * rr) }; if (canStand('district', q)) return q; } return p; };
    const cafe = rooms.district.doors.find((d: { id: string }) => d.id === 'cafe-door').zone, jinu = specialBuilding('jinu');
    return { front: anchors.euroOut, cafe: snap({ x: cafe.x + cafe.w / 2, y: cafe.y + cafe.h + 10 }), cross: snap({ x: crossroads.x - 110, y: crossroads.y - 90 }), jinu: snap({ x: jinu.bbox.x + jinu.bbox.w / 2, y: jinu.bbox.y - 14 }) };
  });
}

for (const [width, height] of [[1280, 900], [390, 844], [844, 390]]) test(`real-scale district renders and walks ${width}x${height}`, async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: width!, height: height! });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.getByRole('button', { name: '첫 출근하기' }).click(); await page.waitForTimeout(300);
  const s = await spots(page);
  for (const [name, at] of Object.entries(s)) {
    await seed(page, { room: 'district', ...at });
    expect(await room(page)).toBe('district');
    await page.waitForTimeout(700); // chunks bake over a few frames
    await page.screenshot({ path: `artifacts/d096-${name}-${width}.png` });
  }
  // A short walk on the sidewalk in front of Euro Plaza, frame time stays reasonable while new chunks bake.
  await seed(page, { room: 'district', ...s.front });
  const t = await page.evaluate(async () => { const w = (window as unknown as { __mq: Hook }).__mq.world; const x0 = w.player.x; w.tap({ x: w.player.x - 120, y: w.player.y + 10 });
    const times: number[] = []; let last = performance.now(); for (let i = 0; i < 90; i++) { await new Promise(r => requestAnimationFrame(r)); const n = performance.now(); times.push(n - last); last = n; }
    times.sort((a, b) => a - b); return { moved: x0 - w.player.x, p95: times[Math.floor(times.length * 0.95)] }; });
  expect(t.moved).toBeGreaterThan(30);
  expect(t.p95).toBeLessThan(120);
  expect(errors).toEqual([]);
});

test('old compressed-street saves reopen at Euro Plaza in the district; the map sheet opens', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.getByRole('button', { name: '첫 출근하기' }).click(); await page.waitForTimeout(300);
  await page.evaluate(() => { const k = 'medical-quest.v4.current'; const s = JSON.parse(localStorage.getItem(k)!); s.at = { room: 'street', x: 292, y: 254, facing: 'down' }; localStorage.setItem(k, JSON.stringify(s)); });
  await page.reload(); await page.waitForFunction(() => !!(window as unknown as { __mq?: Hook }).__mq?.world); await page.waitForTimeout(600);
  expect(await room(page)).toBe('district');
  await page.keyboard.press('m');
  await expect(page.getByRole('dialog', { name: /동네 지도/ })).toBeVisible();
  await page.screenshot({ path: 'artifacts/d096-map-sheet.png' });
  expect(errors).toEqual([]);
});
